/**
 * Build a macOS `.app` bundle for a Prism desktop app so it shows the
 * correct product name in the menu bar and dock.
 *
 * Why this exists: in dev mode, running `electron dist/desktop.js` launches
 * the stock `Electron.app` from node_modules, and macOS reads the app name
 * (menu bar, dock, App Switcher) from that bundle's Info.plist. Runtime
 * APIs like `app.setName()` cannot override it — Electron's docs even say
 * so. The only fix is a real `.app` bundle whose Info.plist declares the
 * right `CFBundleName`.
 *
 * How it works: we copy Electron.app out of node_modules, patch the
 * plist, rename the executable, and drop a tiny loader shim into
 * `Contents/Resources/app/` that dynamically imports the real entry file
 * from its dev location. The shim approach sidesteps the usual pnpm +
 * electron-builder pain — we never have to bundle or re-link workspace
 * dependencies, because the app's code runs from the actual project
 * directory where the pnpm symlink forest already works.
 *
 * Trade-off: the resulting `.app` is not relocatable. It only runs on
 * the machine where it was built, and only as long as the project
 * directory exists. That's exactly what you want for local dev runs;
 * for real distribution you'd want electron-builder / electron-packager
 * with fully copied dependencies.
 */

import { cp, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

export interface PackageDesktopAppOptions {
    /**
     * Absolute path to the project root (the directory that contains
     * the project's package.json and the compiled main entry).
     */
    projectDir: string;

    /**
     * Reverse-DNS app identifier, e.g. `com.facetlayer.cc-skills-gui`.
     * Written to `CFBundleIdentifier`.
     */
    appId: string;

    /**
     * Human-readable product name. This is what shows in the macOS menu
     * bar, dock, and App Switcher. Written to `CFBundleName` and
     * `CFBundleDisplayName`.
     */
    productName: string;

    /**
     * Path to the compiled main entry, relative to `projectDir`.
     * Example: `dist/desktop.js`. The generated bundle will load this
     * file via dynamic import at launch.
     */
    main: string;

    /**
     * Output directory for the generated `.app`, relative to
     * `projectDir`. Defaults to `release`.
     */
    outputDir?: string;
}

export interface PackageDesktopAppResult {
    /**
     * Absolute path to the generated `.app` bundle.
     */
    appPath: string;
}

export async function packageDesktopApp(
    options: PackageDesktopAppOptions
): Promise<PackageDesktopAppResult> {
    if (process.platform !== 'darwin') {
        throw new Error(
            '[prism-framework-desktop] packageDesktopApp currently only supports macOS. ' +
                'For other platforms, run `electron dist/desktop.js` directly.'
        );
    }

    const { projectDir, appId, productName, main, outputDir = 'release' } = options;

    const electronAppSrc = findElectronAppBundle(projectDir);
    const absProjectDir = resolve(projectDir);
    const absOutputDir = resolve(absProjectDir, outputDir);
    await mkdir(absOutputDir, { recursive: true });

    const destAppPath = join(absOutputDir, `${productName}.app`);
    await rm(destAppPath, { recursive: true, force: true });

    await cp(electronAppSrc, destAppPath, {
        recursive: true,
        verbatimSymlinks: true,
    });

    const plistPath = join(destAppPath, 'Contents', 'Info.plist');
    let plist = await readFile(plistPath, 'utf8');
    plist = setPlistString(plist, 'CFBundleDisplayName', productName);
    plist = setPlistString(plist, 'CFBundleName', productName);
    plist = setPlistString(plist, 'CFBundleIdentifier', appId);
    plist = setPlistString(plist, 'CFBundleExecutable', productName);
    await writeFile(plistPath, plist);

    const oldExec = join(destAppPath, 'Contents', 'MacOS', 'Electron');
    const newExec = join(destAppPath, 'Contents', 'MacOS', productName);
    if (existsSync(oldExec)) {
        await rename(oldExec, newExec);
    }

    const appResourcePath = join(destAppPath, 'Contents', 'Resources', 'app');
    await rm(appResourcePath, { recursive: true, force: true });
    await mkdir(appResourcePath, { recursive: true });

    const realMainPath = resolve(absProjectDir, main);
    if (!existsSync(realMainPath)) {
        throw new Error(
            `[prism-framework-desktop] packageDesktopApp: main entry not found at ${realMainPath}. ` +
                `Did you run the build step first?`
        );
    }

    const shim =
        `import(${JSON.stringify(realMainPath)}).catch((err) => {\n` +
        `    console.error('[prism-framework-desktop] Failed to load main entry:', err);\n` +
        `    process.exit(1);\n` +
        `});\n`;
    await writeFile(join(appResourcePath, 'main.mjs'), shim);

    const shimPkg = {
        name: sanitizePackageName(appId),
        productName,
        version: '0.0.0',
        main: 'main.mjs',
        type: 'module',
    };
    await writeFile(
        join(appResourcePath, 'package.json'),
        JSON.stringify(shimPkg, null, 2) + '\n'
    );

    // Re-sign ad-hoc. Modifying a signed bundle invalidates the original
    // signature, and Gatekeeper will refuse to launch it on recent macOS
    // unless we either strip the signature or re-sign.
    try {
        execFileSync('codesign', ['--force', '--deep', '--sign', '-', destAppPath], {
            stdio: 'ignore',
        });
    } catch (err) {
        console.warn(
            '[prism-framework-desktop] codesign failed; the app may not launch without ' +
                'manually clearing quarantine. Error:',
            err
        );
    }

    return { appPath: destAppPath };
}

function findElectronAppBundle(projectDir: string): string {
    const require_ = createRequire(join(resolve(projectDir), 'package.json'));
    const electronBinary = require_('electron') as string;
    if (typeof electronBinary !== 'string') {
        throw new Error(
            `[prism-framework-desktop] Unexpected electron export: ${typeof electronBinary}`
        );
    }
    const marker = '.app/Contents/';
    const idx = electronBinary.indexOf(marker);
    if (idx === -1) {
        throw new Error(
            `[prism-framework-desktop] Could not locate Electron.app from electron binary path: ${electronBinary}`
        );
    }
    return electronBinary.slice(0, idx + '.app'.length);
}

function setPlistString(plist: string, key: string, value: string): string {
    const escaped = escapeXml(value);
    const pattern = new RegExp(
        `(<key>${escapeRegex(key)}</key>\\s*<string>)[^<]*(</string>)`
    );
    if (pattern.test(plist)) {
        return plist.replace(pattern, `$1${escaped}$2`);
    }
    return plist.replace(
        /<\/dict>\s*<\/plist>\s*$/,
        `\t<key>${key}</key>\n\t<string>${escaped}</string>\n</dict>\n</plist>\n`
    );
}

function escapeRegex(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function escapeXml(s: string): string {
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function sanitizePackageName(appId: string): string {
    return appId.toLowerCase().replace(/[^a-z0-9-]/g, '-');
}
