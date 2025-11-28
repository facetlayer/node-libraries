import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'fs';
import { resolve } from 'path';
import { runValidate } from '../src/validate.js';

const TEST_DIR = resolve(process.cwd(), 'test/temp');

describe('runValidate', () => {
  beforeEach(() => {
    // Clean up test directory
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    // Clean up after tests
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  describe('tsconfig.json validation', () => {
    it('should report error when noEmit is not set to true', async () => {
      const tsconfigPath = resolve(TEST_DIR, 'tsconfig.json');
      const packageJsonPath = resolve(TEST_DIR, 'package.json');
      const srcDir = resolve(TEST_DIR, 'src');

      mkdirSync(srcDir);

      writeFileSync(
        tsconfigPath,
        JSON.stringify({
          compilerOptions: {
            noEmit: false,
            allowImportingTsExtensions: true,
          },
        }, null, 2)
      );

      writeFileSync(
        packageJsonPath,
        JSON.stringify({
          type: 'module',
          dependencies: {},
        }, null, 2)
      );

      // Create at least one TS file to avoid "no files found" error
      writeFileSync(resolve(srcDir, 'index.ts'), 'export const foo = 42;');

      // Change to test directory
      const originalCwd = process.cwd();
      process.chdir(TEST_DIR);

      try {
        const result = await runValidate({
          tsconfigPath: './tsconfig.json',
          srcDir: './src',
        });

        expect(result.success).toBe(false);
        expect(result.errors).toContain('tsconfig.json: compilerOptions.noEmit must be set to true');
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('should report error when allowImportingTsExtensions is not set to true', async () => {
      const tsconfigPath = resolve(TEST_DIR, 'tsconfig.json');
      const packageJsonPath = resolve(TEST_DIR, 'package.json');
      const srcDir = resolve(TEST_DIR, 'src');

      mkdirSync(srcDir);

      writeFileSync(
        tsconfigPath,
        JSON.stringify({
          compilerOptions: {
            noEmit: true,
            allowImportingTsExtensions: false,
          },
        }, null, 2)
      );

      writeFileSync(
        packageJsonPath,
        JSON.stringify({
          type: 'module',
          dependencies: {},
        }, null, 2)
      );

      writeFileSync(resolve(srcDir, 'index.ts'), 'export const foo = 42;');

      const originalCwd = process.cwd();
      process.chdir(TEST_DIR);

      try {
        const result = await runValidate({
          tsconfigPath: './tsconfig.json',
          srcDir: './src',
        });

        expect(result.success).toBe(false);
        expect(result.errors).toContain('tsconfig.json: compilerOptions.allowImportingTsExtensions must be set to true');
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('should fix tsconfig.json when --fix is used', async () => {
      const tsconfigPath = resolve(TEST_DIR, 'tsconfig.json');
      const packageJsonPath = resolve(TEST_DIR, 'package.json');
      const srcDir = resolve(TEST_DIR, 'src');

      mkdirSync(srcDir);

      writeFileSync(
        tsconfigPath,
        JSON.stringify({
          compilerOptions: {
            noEmit: false,
            allowImportingTsExtensions: false,
          },
        }, null, 2)
      );

      writeFileSync(
        packageJsonPath,
        JSON.stringify({
          type: 'module',
          dependencies: {},
        }, null, 2)
      );

      writeFileSync(resolve(srcDir, 'index.ts'), 'export const foo = 42;');

      const originalCwd = process.cwd();
      process.chdir(TEST_DIR);

      try {
        const result = await runValidate({
          fix: true,
          tsconfigPath: './tsconfig.json',
          srcDir: './src',
        });

        expect(result.success).toBe(true);
        expect(result.fixed).toContain('Set compilerOptions.noEmit to true');
        expect(result.fixed).toContain('Set compilerOptions.allowImportingTsExtensions to true');

        // Verify the file was actually fixed
        const fixedContent = JSON.parse(require('fs').readFileSync(tsconfigPath, 'utf-8'));
        expect(fixedContent.compilerOptions.noEmit).toBe(true);
        expect(fixedContent.compilerOptions.allowImportingTsExtensions).toBe(true);
      } finally {
        process.chdir(originalCwd);
      }
    });
  });

  describe('package.json validation', () => {
    it('should report error when type is not set to module', async () => {
      const tsconfigPath = resolve(TEST_DIR, 'tsconfig.json');
      const packageJsonPath = resolve(TEST_DIR, 'package.json');
      const srcDir = resolve(TEST_DIR, 'src');

      mkdirSync(srcDir);

      writeFileSync(
        tsconfigPath,
        JSON.stringify({
          compilerOptions: {
            noEmit: true,
            allowImportingTsExtensions: true,
          },
        }, null, 2)
      );

      writeFileSync(
        packageJsonPath,
        JSON.stringify({
          type: 'commonjs',
          dependencies: {},
        }, null, 2)
      );

      writeFileSync(resolve(srcDir, 'index.ts'), 'export const foo = 42;');

      const originalCwd = process.cwd();
      process.chdir(TEST_DIR);

      try {
        const result = await runValidate({
          tsconfigPath: './tsconfig.json',
          srcDir: './src',
        });

        expect(result.success).toBe(false);
        expect(result.errors).toContain('package.json: "type" must be set to "module"');
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('should report error when source-map-support is in dependencies', async () => {
      const tsconfigPath = resolve(TEST_DIR, 'tsconfig.json');
      const packageJsonPath = resolve(TEST_DIR, 'package.json');
      const srcDir = resolve(TEST_DIR, 'src');

      mkdirSync(srcDir);

      writeFileSync(
        tsconfigPath,
        JSON.stringify({
          compilerOptions: {
            noEmit: true,
            allowImportingTsExtensions: true,
          },
        }, null, 2)
      );

      writeFileSync(
        packageJsonPath,
        JSON.stringify({
          type: 'module',
          dependencies: {
            'source-map-support': '^0.5.0',
          },
        }, null, 2)
      );

      writeFileSync(resolve(srcDir, 'index.ts'), 'export const foo = 42;');

      const originalCwd = process.cwd();
      process.chdir(TEST_DIR);

      try {
        const result = await runValidate({
          tsconfigPath: './tsconfig.json',
          srcDir: './src',
        });

        expect(result.success).toBe(false);
        expect(result.errors).toContain('package.json: "source-map-support" must not be included as a dependency (not compatible with this build config)');
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('should fix package.json when --fix is used', async () => {
      const tsconfigPath = resolve(TEST_DIR, 'tsconfig.json');
      const packageJsonPath = resolve(TEST_DIR, 'package.json');
      const srcDir = resolve(TEST_DIR, 'src');

      mkdirSync(srcDir);

      writeFileSync(
        tsconfigPath,
        JSON.stringify({
          compilerOptions: {
            noEmit: true,
            allowImportingTsExtensions: true,
          },
        }, null, 2)
      );

      writeFileSync(
        packageJsonPath,
        JSON.stringify({
          type: 'commonjs',
          dependencies: {
            'source-map-support': '^0.5.0',
          },
          devDependencies: {
            'source-map-support': '^0.5.0',
          },
        }, null, 2)
      );

      writeFileSync(resolve(srcDir, 'index.ts'), 'export const foo = 42;');

      const originalCwd = process.cwd();
      process.chdir(TEST_DIR);

      try {
        const result = await runValidate({
          fix: true,
          tsconfigPath: './tsconfig.json',
          srcDir: './src',
        });

        expect(result.success).toBe(true);
        expect(result.fixed).toContain('Set "type" to "module"');
        expect(result.fixed).toContain('Removed "source-map-support" from dependencies');
        expect(result.fixed).toContain('Removed "source-map-support" from devDependencies');

        // Verify the file was actually fixed
        const fixedContent = JSON.parse(require('fs').readFileSync(packageJsonPath, 'utf-8'));
        expect(fixedContent.type).toBe('module');
        expect(fixedContent.dependencies).not.toHaveProperty('source-map-support');
        expect(fixedContent.devDependencies).not.toHaveProperty('source-map-support');
      } finally {
        process.chdir(originalCwd);
      }
    });
  });

  describe('import validation', () => {
    it('should report error when local imports are missing .ts extension', async () => {
      const tsconfigPath = resolve(TEST_DIR, 'tsconfig.json');
      const packageJsonPath = resolve(TEST_DIR, 'package.json');
      const srcDir = resolve(TEST_DIR, 'src');

      mkdirSync(srcDir);

      writeFileSync(
        tsconfigPath,
        JSON.stringify({
          compilerOptions: {
            noEmit: true,
            allowImportingTsExtensions: true,
          },
        }, null, 2)
      );

      writeFileSync(
        packageJsonPath,
        JSON.stringify({
          type: 'module',
          dependencies: {},
        }, null, 2)
      );

      // Create a file with missing .ts extension
      writeFileSync(
        resolve(srcDir, 'index.ts'),
        `import { foo } from './helper';\nexport { foo };`
      );

      writeFileSync(
        resolve(srcDir, 'helper.ts'),
        'export const foo = 42;'
      );

      const originalCwd = process.cwd();
      process.chdir(TEST_DIR);

      try {
        const result = await runValidate({
          tsconfigPath: './tsconfig.json',
          srcDir: './src',
        });

        expect(result.success).toBe(false);
        expect(result.errors.some(e => e.includes('must end with .ts extension'))).toBe(true);
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('should fix imports when --fix is used', async () => {
      const tsconfigPath = resolve(TEST_DIR, 'tsconfig.json');
      const packageJsonPath = resolve(TEST_DIR, 'package.json');
      const srcDir = resolve(TEST_DIR, 'src');

      mkdirSync(srcDir);

      writeFileSync(
        tsconfigPath,
        JSON.stringify({
          compilerOptions: {
            noEmit: true,
            allowImportingTsExtensions: true,
          },
        }, null, 2)
      );

      writeFileSync(
        packageJsonPath,
        JSON.stringify({
          type: 'module',
          dependencies: {},
        }, null, 2)
      );

      const indexPath = resolve(srcDir, 'index.ts');
      writeFileSync(
        indexPath,
        `import { foo } from './helper';\nexport { foo };`
      );

      writeFileSync(
        resolve(srcDir, 'helper.ts'),
        'export const foo = 42;'
      );

      const originalCwd = process.cwd();
      process.chdir(TEST_DIR);

      try {
        const result = await runValidate({
          fix: true,
          tsconfigPath: './tsconfig.json',
          srcDir: './src',
        });

        // When ESLint fixes are applied, the validation should succeed
        expect(result.success).toBe(true);

        // Verify the file was actually fixed
        const fixedContent = require('fs').readFileSync(indexPath, 'utf-8');
        expect(fixedContent).toContain(`from './helper.ts'`);
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('should not modify external package imports', async () => {
      const tsconfigPath = resolve(TEST_DIR, 'tsconfig.json');
      const packageJsonPath = resolve(TEST_DIR, 'package.json');
      const srcDir = resolve(TEST_DIR, 'src');

      mkdirSync(srcDir);

      writeFileSync(
        tsconfigPath,
        JSON.stringify({
          compilerOptions: {
            noEmit: true,
            allowImportingTsExtensions: true,
          },
        }, null, 2)
      );

      writeFileSync(
        packageJsonPath,
        JSON.stringify({
          type: 'module',
          dependencies: {},
        }, null, 2)
      );

      const indexPath = resolve(srcDir, 'index.ts');
      const originalContent = `import { readFileSync } from 'fs';\nimport { resolve } from 'path';\nexport const foo = 42;`;
      writeFileSync(indexPath, originalContent);

      const originalCwd = process.cwd();
      process.chdir(TEST_DIR);

      try {
        const result = await runValidate({
          tsconfigPath: './tsconfig.json',
          srcDir: './src',
        });

        expect(result.success).toBe(true);

        // Verify external imports were not modified
        const content = require('fs').readFileSync(indexPath, 'utf-8');
        expect(content).toBe(originalContent);
      } finally {
        process.chdir(originalCwd);
      }
    });
  });

  describe('complete validation', () => {
    it('should report success when all validations pass', async () => {
      const tsconfigPath = resolve(TEST_DIR, 'tsconfig.json');
      const packageJsonPath = resolve(TEST_DIR, 'package.json');
      const srcDir = resolve(TEST_DIR, 'src');

      mkdirSync(srcDir);

      writeFileSync(
        tsconfigPath,
        JSON.stringify({
          compilerOptions: {
            noEmit: true,
            allowImportingTsExtensions: true,
          },
        }, null, 2)
      );

      writeFileSync(
        packageJsonPath,
        JSON.stringify({
          type: 'module',
          dependencies: {},
        }, null, 2)
      );

      writeFileSync(
        resolve(srcDir, 'index.ts'),
        `import { foo } from './helper.ts';\nexport { foo };`
      );

      writeFileSync(
        resolve(srcDir, 'helper.ts'),
        'export const foo = 42;'
      );

      const originalCwd = process.cwd();
      process.chdir(TEST_DIR);

      try {
        const result = await runValidate({
          tsconfigPath: './tsconfig.json',
          srcDir: './src',
        });

        expect(result.success).toBe(true);
        expect(result.errors.length).toBe(0);
        expect(result.fixed.length).toBe(0);
      } finally {
        process.chdir(originalCwd);
      }
    });
  });
});
