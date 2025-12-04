import { build, BuildOptions } from 'esbuild';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { runValidate } from './validate.js';

// Re-export validate for programmatic use
export { runValidate } from './validate.js';

export interface BuildConfig {
  /**
   * Entry points for esbuild
   * Default: ['src/cli.ts']
   */
  entryPoints?: string[];

  /**
   * Output directory
   * Default: 'dist'
   */
  outDir?: string;

  /**
   * Platform target
   * Default: 'node'
   */
  platform?: 'node' | 'browser' | 'neutral';

  /**
   * Target environment
   * Default: 'node16'
   */
  target?: string;

  /**
   * Output format
   * Default: 'esm'
   */
  format?: 'esm' | 'cjs' | 'iife';

  /**
   * Path to package.json (relative to cwd or absolute)
   * Default: './package.json'
   */
  packageJsonPath?: string;

  /**
   * Path to tsconfig.json (relative to cwd or absolute)
   * Default: './tsconfig.json'
   */
  tsconfigPath?: string;

  /**
   * Additional external dependencies (beyond those in package.json)
   */
  additionalExternals?: string[];

  /**
   * Override any esbuild configuration
   */
  esbuildOverrides?: Partial<BuildOptions>;

  /**
   * TypeScript compiler options override for type generation
   */
  typeGenConfig?: {
    outDir?: string;
    rootDir?: string;
    include?: string[];
    exclude?: string[];
  };
}

/**
 * Load package.json and extract all dependencies as external packages
 */
function getExternalDependencies(packageJsonPath: string): string[] {
  if (!existsSync(packageJsonPath)) {
    throw new Error(`package.json not found at: ${packageJsonPath}`);
  }

  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
  const dependencies = Object.keys(packageJson.dependencies || {});

  return dependencies;
}

/**
 * Run esbuild with the provided configuration
 */
async function runEsbuild(config: BuildConfig, cwd: string): Promise<void> {
  const packageJsonPath = resolve(cwd, config.packageJsonPath || './package.json');
  const dependencies = getExternalDependencies(packageJsonPath);

  const commonConfig: BuildOptions = {
    bundle: true,
    platform: config.platform || 'node',
    target: config.target || 'node16',
    format: config.format || 'esm',
    outdir: config.outDir || 'dist',
    external: [
      ...dependencies,
      ...(config.additionalExternals || []),
    ]
  };

  const entryPoints = config.entryPoints || ['src/cli.ts'];

  const finalConfig: BuildOptions = {
    ...commonConfig,
    ...config.esbuildOverrides,
    entryPoints,
  };

  console.log('Running esbuild...');
  await build(finalConfig);
  console.log('esbuild completed successfully');
}

/**
 * Generate TypeScript declaration files
 */
function generateTypes(config: BuildConfig, cwd: string): void {
  const tsconfigPath = resolve(cwd, config.tsconfigPath || './tsconfig.json');

  if (!existsSync(tsconfigPath)) {
    console.warn(`Warning: tsconfig.json not found at ${tsconfigPath}, skipping type generation`);
    return;
  }

  console.log('Generating TypeScript declaration files...');

  const typeConfig = config.typeGenConfig || {};
  const outDir = typeConfig.outDir || config.outDir || 'dist';

  const tscArgs = [
    '--project', tsconfigPath,
    '--noEmit', 'false',
    '--emitDeclarationOnly', 'true',
    '--declaration', 'true',
    '--declarationMap', 'true',
    '--outDir', outDir,
  ];

  try {
    execSync(`tsc ${tscArgs.join(' ')}`, {
      cwd,
      stdio: 'inherit'
    });
    console.log('TypeScript declarations generated successfully');
  } catch (error) {
    console.error('Type generation failed:', error);
    process.exit(1);
  }
}

/**
 * Run the build process with both esbuild and type generation
 */
async function runBuild(config: BuildConfig): Promise<void> {
  const cwd = process.cwd();

  try {
    await runEsbuild(config, cwd);
    generateTypes(config, cwd);
    console.log('Build completed successfully');
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

/**
 * Main entry point for the build tool
 * This sets up yargs command parsing and handles the build command
 */
export async function runBuildTool(config: BuildConfig = {}): Promise<void> {
  await yargs(hideBin(process.argv))
    .command(
      'build',
      'Build the project using esbuild and generate TypeScript declarations',
      () => {},
      async () => {
        await runBuild(config);
      }
    )
    .command(
      'validate',
      'Validate project configuration and TypeScript imports',
      (yargs) => {
        return yargs
          .option('fix', {
            type: 'boolean',
            description: 'Automatically fix issues',
            default: false,
          })
          .option('tsconfig', {
            type: 'string',
            description: 'Path to tsconfig.json',
            default: './tsconfig.json',
          })
          .option('src', {
            type: 'string',
            description: 'Source directory',
            default: './src',
          });
      },
      async (argv) => {
        const result = await runValidate({
          fix: argv.fix as boolean,
          tsconfigPath: argv.tsconfig as string,
          srcDir: argv.src as string,
        });

        if (!result.success) {
          process.exit(1);
        }
      }
    )
    .demandCommand(1, 'You must specify a command')
    .help()
    .parse();
}
