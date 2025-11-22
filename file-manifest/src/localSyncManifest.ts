import { Limiter } from '@facetlayer/concurrency-limit'
import { ParsedRules, resolveFileList } from "./resolveFileList";
import Fs from 'fs/promises';
import Path from 'path';
import { setupEmptyDirectories } from "./setupEmptyDirectories";

const DEFAULT_CONCURRENCY_LIMIT = 109;

export interface LocalSyncManifestOptions {
    sourceDir: string
    targetDir: string
    rulesConfig: string | ParsedRules
    concurrencyLimit?: number
}

export async function localSyncManifest(options: LocalSyncManifestOptions) {
    const manifest = await resolveFileList(options.sourceDir, options.rulesConfig);
    const maxConcurrency = options.concurrencyLimit ?? DEFAULT_CONCURRENCY_LIMIT;
    const concurrencyLimiter = new Limiter({
        maxConcurrent: maxConcurrency,
    });

    await setupEmptyDirectories(options.targetDir, manifest.each());

    for (const file of manifest.each()) {
        const targetPath = Path.join(options.targetDir, file.relPath);
        await concurrencyLimiter.start(async () => {
            try {
                await Fs.copyFile(file.sourcePath, targetPath);
                console.log('copied', file.sourcePath, 'to', targetPath);
            } catch (e) {
                console.log('failed to copy', file.sourcePath, 'to', targetPath);
            }
        });
    }

    await concurrencyLimiter.allSettled();

    console.log('done');
}
