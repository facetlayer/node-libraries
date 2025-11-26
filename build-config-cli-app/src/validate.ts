import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { glob } from 'glob';
import { ESLint } from 'eslint';
import { requireTsExtensions } from './eslint-rule-ts-extensions.js';

interface ValidateOptions {
  fix?: boolean;
  tsconfigPath?: string;
  srcDir?: string;
}

interface ValidationResult {
  success: boolean;
  errors: string[];
  fixed: string[];
}

/**
 * Validate tsconfig.json settings
 */
function validateTsConfig(tsconfigPath: string): { errors: string[], fixed: string[], modified: boolean } {
  const errors: string[] = [];
  const fixed: string[] = [];
  let modified = false;

  if (!existsSync(tsconfigPath)) {
    errors.push(`tsconfig.json not found at: ${tsconfigPath}`);
    return { errors, fixed, modified };
  }

  const content = readFileSync(tsconfigPath, 'utf-8');
  let tsconfig: any;

  try {
    tsconfig = JSON.parse(content);
  } catch (e) {
    errors.push(`Failed to parse tsconfig.json: ${e}`);
    return { errors, fixed, modified };
  }

  if (!tsconfig.compilerOptions) {
    tsconfig.compilerOptions = {};
    modified = true;
  }

  // Check noEmit
  if (tsconfig.compilerOptions.noEmit !== true) {
    errors.push('tsconfig.json: compilerOptions.noEmit must be set to true');
  }

  // Check allowImportingTsExtensions
  if (tsconfig.compilerOptions.allowImportingTsExtensions !== true) {
    errors.push('tsconfig.json: compilerOptions.allowImportingTsExtensions must be set to true');
  }

  return { errors, fixed, modified };
}

/**
 * Fix tsconfig.json settings
 */
function fixTsConfig(tsconfigPath: string): string[] {
  const fixed: string[] = [];

  if (!existsSync(tsconfigPath)) {
    return fixed;
  }

  const content = readFileSync(tsconfigPath, 'utf-8');
  let tsconfig: any;

  try {
    tsconfig = JSON.parse(content);
  } catch (e) {
    return fixed;
  }

  if (!tsconfig.compilerOptions) {
    tsconfig.compilerOptions = {};
  }

  // Fix noEmit
  if (tsconfig.compilerOptions.noEmit !== true) {
    tsconfig.compilerOptions.noEmit = true;
    fixed.push('Set compilerOptions.noEmit to true');
  }

  // Fix allowImportingTsExtensions
  if (tsconfig.compilerOptions.allowImportingTsExtensions !== true) {
    tsconfig.compilerOptions.allowImportingTsExtensions = true;
    fixed.push('Set compilerOptions.allowImportingTsExtensions to true');
  }

  if (fixed.length > 0) {
    writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2) + '\n', 'utf-8');
  }

  return fixed;
}

/**
 * Validate TypeScript imports using ESLint
 */
async function validateImports(srcDir: string, fix: boolean): Promise<{ errors: string[], fixed: string[] }> {
  const errors: string[] = [];
  const fixed: string[] = [];

  // Find all TypeScript files
  const files = await glob(`${srcDir}/**/*.ts`, {
    ignore: ['**/node_modules/**', '**/dist/**'],
  });

  if (files.length === 0) {
    errors.push(`No TypeScript files found in ${srcDir}`);
    return { errors, fixed };
  }

  // Create ESLint instance with our custom rule
  const eslint = new ESLint({
    overrideConfigFile: true,
    overrideConfig: {
      files: ['**/*.ts'],
      languageOptions: {
        parser: await import('@typescript-eslint/parser'),
        parserOptions: {
          ecmaVersion: 'latest',
          sourceType: 'module',
        },
      },
      plugins: {
        'local': {
          rules: {
            'require-ts-extensions': requireTsExtensions,
          },
        },
      },
      rules: {
        'local/require-ts-extensions': 'error',
      },
    },
    fix,
  });

  // Lint all files
  const results = await eslint.lintFiles(files);

  // Apply fixes if requested
  if (fix) {
    await ESLint.outputFixes(results);
  }

  // Process results
  for (const result of results) {
    if (result.messages.length > 0) {
      for (const message of result.messages) {
        if (fix && message.fix) {
          fixed.push(`${result.filePath}:${message.line}:${message.column} - Fixed: ${message.message}`);
        } else {
          errors.push(`${result.filePath}:${message.line}:${message.column} - ${message.message}`);
        }
      }
    }
  }

  return { errors, fixed };
}

/**
 * Run validation on the project
 */
export async function runValidate(options: ValidateOptions = {}): Promise<ValidationResult> {
  const cwd = process.cwd();
  const tsconfigPath = resolve(cwd, options.tsconfigPath || './tsconfig.json');
  const srcDir = resolve(cwd, options.srcDir || './src');
  const fix = options.fix || false;

  const allErrors: string[] = [];
  const allFixed: string[] = [];

  console.log('Validating project configuration...\n');

  // Validate/fix tsconfig.json
  if (fix) {
    console.log('Checking tsconfig.json...');
    const tsconfigFixed = fixTsConfig(tsconfigPath);
    if (tsconfigFixed.length > 0) {
      console.log('Fixed tsconfig.json:');
      tsconfigFixed.forEach(f => console.log(`  ✓ ${f}`));
      allFixed.push(...tsconfigFixed);
    } else {
      console.log('  ✓ tsconfig.json is valid');
    }
  } else {
    console.log('Checking tsconfig.json...');
    const tsconfigResult = validateTsConfig(tsconfigPath);
    if (tsconfigResult.errors.length > 0) {
      tsconfigResult.errors.forEach(e => console.log(`  ✗ ${e}`));
      allErrors.push(...tsconfigResult.errors);
    } else {
      console.log('  ✓ tsconfig.json is valid');
    }
  }

  console.log();

  // Validate/fix imports
  console.log('Checking TypeScript imports...');
  const importResult = await validateImports(srcDir, fix);

  if (fix) {
    if (importResult.fixed.length > 0) {
      console.log('Fixed imports:');
      importResult.fixed.forEach(f => console.log(`  ✓ ${f}`));
      allFixed.push(...importResult.fixed);
    } else if (importResult.errors.length > 0) {
      console.log('Could not fix:');
      importResult.errors.forEach(e => console.log(`  ✗ ${e}`));
      allErrors.push(...importResult.errors);
    } else {
      console.log('  ✓ All imports are valid');
    }
  } else {
    if (importResult.errors.length > 0) {
      console.log('Import errors:');
      importResult.errors.forEach(e => console.log(`  ✗ ${e}`));
      allErrors.push(...importResult.errors);
    } else {
      console.log('  ✓ All imports are valid');
    }
  }

  console.log();

  // Summary
  if (fix) {
    if (allFixed.length > 0) {
      console.log(`✓ Fixed ${allFixed.length} issue(s)`);
    }
    if (allErrors.length > 0) {
      console.log(`✗ ${allErrors.length} issue(s) could not be fixed automatically`);
    }
    if (allFixed.length === 0 && allErrors.length === 0) {
      console.log('✓ Project configuration is valid');
    }
  } else {
    if (allErrors.length > 0) {
      console.log(`✗ Found ${allErrors.length} issue(s). Run with --fix to automatically fix them.`);
    } else {
      console.log('✓ Project configuration is valid');
    }
  }

  return {
    success: allErrors.length === 0,
    errors: allErrors,
    fixed: allFixed,
  };
}
