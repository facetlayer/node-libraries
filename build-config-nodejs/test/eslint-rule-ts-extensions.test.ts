import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { requireTsExtensions, stripJsExtension, targetFileExists } from '../src/eslint-rule-ts-extensions.js';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';

describe('requireTsExtensions ESLint rule', () => {
  describe('meta', () => {
    it('should have correct meta information', () => {
      expect(requireTsExtensions.meta.type).toBe('problem');
      expect(requireTsExtensions.meta.docs.description).toBe('Require .ts extensions for local TypeScript imports');
      expect(requireTsExtensions.meta.fixable).toBe('code');
      expect(requireTsExtensions.meta.messages.missingTsExtension).toBe('Local import "{{importPath}}" must end with .ts extension');
    });
  });

  describe('ImportDeclaration handler', () => {
    it('should report error for local import without .ts extension', () => {
      const reports: any[] = [];
      const mockContext = {
        report: (report: any) => reports.push(report),
      };

      const visitor = requireTsExtensions.create(mockContext);

      const mockNode = {
        source: {
          value: './helper',
          raw: "'./helper'",
        },
      };

      visitor.ImportDeclaration(mockNode);

      expect(reports.length).toBe(1);
      expect(reports[0].node).toBe(mockNode.source);
      expect(reports[0].messageId).toBe('missingTsExtension');
      expect(reports[0].data.importPath).toBe('./helper');
    });

    it('should not report error for local import with .ts extension', () => {
      const reports: any[] = [];
      const mockContext = {
        report: (report: any) => reports.push(report),
      };

      const visitor = requireTsExtensions.create(mockContext);

      const mockNode = {
        source: {
          value: './helper.ts',
          raw: "'./helper.ts'",
        },
      };

      visitor.ImportDeclaration(mockNode);

      expect(reports.length).toBe(0);
    });

    it('should not report error for external package import', () => {
      const reports: any[] = [];
      const mockContext = {
        report: (report: any) => reports.push(report),
      };

      const visitor = requireTsExtensions.create(mockContext);

      const mockNode = {
        source: {
          value: 'fs',
          raw: "'fs'",
        },
      };

      visitor.ImportDeclaration(mockNode);

      expect(reports.length).toBe(0);
    });

    it('should handle relative parent directory imports', () => {
      const reports: any[] = [];
      const mockContext = {
        report: (report: any) => reports.push(report),
      };

      const visitor = requireTsExtensions.create(mockContext);

      const mockNode = {
        source: {
          value: '../utils/helper',
          raw: "'../utils/helper'",
        },
      };

      visitor.ImportDeclaration(mockNode);

      expect(reports.length).toBe(1);
      expect(reports[0].data.importPath).toBe('../utils/helper');
    });

    it('should provide fix function that adds .ts extension', () => {
      const reports: any[] = [];
      const mockContext = {
        report: (report: any) => reports.push(report),
      };

      const visitor = requireTsExtensions.create(mockContext);

      const mockNode = {
        source: {
          value: './helper',
          raw: "'./helper'",
        },
      };

      visitor.ImportDeclaration(mockNode);

      expect(reports.length).toBe(1);
      expect(typeof reports[0].fix).toBe('function');

      // Test the fix function
      const mockFixer = {
        replaceText: (node: any, newValue: string) => ({ node, newValue }),
      };

      const fix = reports[0].fix(mockFixer);
      expect(fix.newValue).toBe("'./helper.ts'");
    });

    it('should preserve double quotes in fix', () => {
      const reports: any[] = [];
      const mockContext = {
        report: (report: any) => reports.push(report),
      };

      const visitor = requireTsExtensions.create(mockContext);

      const mockNode = {
        source: {
          value: './helper',
          raw: '"./helper"',
        },
      };

      visitor.ImportDeclaration(mockNode);

      const mockFixer = {
        replaceText: (node: any, newValue: string) => ({ node, newValue }),
      };

      const fix = reports[0].fix(mockFixer);
      expect(fix.newValue).toBe('"./helper.ts"');
    });
  });

  describe('ExportNamedDeclaration handler', () => {
    it('should report error for export with local import without .ts extension', () => {
      const reports: any[] = [];
      const mockContext = {
        report: (report: any) => reports.push(report),
      };

      const visitor = requireTsExtensions.create(mockContext);

      const mockNode = {
        source: {
          value: './helper',
          raw: "'./helper'",
        },
      };

      visitor.ExportNamedDeclaration(mockNode);

      expect(reports.length).toBe(1);
      expect(reports[0].data.importPath).toBe('./helper');
    });

    it('should not report error when export has no source', () => {
      const reports: any[] = [];
      const mockContext = {
        report: (report: any) => reports.push(report),
      };

      const visitor = requireTsExtensions.create(mockContext);

      const mockNode = {
        source: null,
      };

      visitor.ExportNamedDeclaration(mockNode);

      expect(reports.length).toBe(0);
    });
  });

  describe('ExportAllDeclaration handler', () => {
    it('should report error for export all without .ts extension', () => {
      const reports: any[] = [];
      const mockContext = {
        report: (report: any) => reports.push(report),
      };

      const visitor = requireTsExtensions.create(mockContext);

      const mockNode = {
        source: {
          value: './helper',
          raw: "'./helper'",
        },
      };

      visitor.ExportAllDeclaration(mockNode);

      expect(reports.length).toBe(1);
      expect(reports[0].data.importPath).toBe('./helper');
    });

    it('should not report error for export all with .ts extension', () => {
      const reports: any[] = [];
      const mockContext = {
        report: (report: any) => reports.push(report),
      };

      const visitor = requireTsExtensions.create(mockContext);

      const mockNode = {
        source: {
          value: './helper.ts',
          raw: "'./helper.ts'",
        },
      };

      visitor.ExportAllDeclaration(mockNode);

      expect(reports.length).toBe(0);
    });
  });

  describe('stripJsExtension helper', () => {
    it('should strip .js extension', () => {
      expect(stripJsExtension('./helper.js')).toBe('./helper');
      expect(stripJsExtension('../utils/index.js')).toBe('../utils/index');
    });

    it('should strip .mjs extension', () => {
      expect(stripJsExtension('./helper.mjs')).toBe('./helper');
      expect(stripJsExtension('../utils/index.mjs')).toBe('../utils/index');
    });

    it('should strip .cjs extension', () => {
      expect(stripJsExtension('./helper.cjs')).toBe('./helper');
      expect(stripJsExtension('../utils/index.cjs')).toBe('../utils/index');
    });

    it('should not modify paths without JS extensions', () => {
      expect(stripJsExtension('./helper')).toBe('./helper');
      expect(stripJsExtension('../utils/index')).toBe('../utils/index');
      expect(stripJsExtension('./file.json')).toBe('./file.json');
    });

    it('should not modify paths with .ts extension', () => {
      expect(stripJsExtension('./helper.ts')).toBe('./helper.ts');
    });
  });

  describe('targetFileExists helper', () => {
    const testDir = join(process.cwd(), 'test/temp/eslint-rule-test');

    beforeAll(() => {
      mkdirSync(testDir, { recursive: true });
      writeFileSync(join(testDir, 'existing.ts'), '// test file');
      mkdirSync(join(testDir, 'subdir'), { recursive: true });
      writeFileSync(join(testDir, 'subdir/nested.ts'), '// nested test file');
    });

    afterAll(() => {
      rmSync(testDir, { recursive: true, force: true });
    });

    it('should return true for existing .ts file', () => {
      const currentFile = join(testDir, 'current.ts');
      expect(targetFileExists(currentFile, './existing')).toBe(true);
    });

    it('should return true when import has .js extension and .ts file exists', () => {
      const currentFile = join(testDir, 'current.ts');
      expect(targetFileExists(currentFile, './existing.js')).toBe(true);
    });

    it('should return false for non-existing file', () => {
      const currentFile = join(testDir, 'current.ts');
      expect(targetFileExists(currentFile, './nonexistent')).toBe(false);
    });

    it('should handle nested paths', () => {
      const currentFile = join(testDir, 'current.ts');
      expect(targetFileExists(currentFile, './subdir/nested')).toBe(true);
      expect(targetFileExists(currentFile, './subdir/nested.js')).toBe(true);
    });

    it('should handle parent directory imports', () => {
      const currentFile = join(testDir, 'subdir/current.ts');
      expect(targetFileExists(currentFile, '../existing')).toBe(true);
      expect(targetFileExists(currentFile, '../existing.js')).toBe(true);
    });
  });

  describe('fix function with .js extension replacement', () => {
    it('should replace .js extension with .ts', () => {
      const reports: any[] = [];
      const mockContext = {
        report: (report: any) => reports.push(report),
        filename: '', // Empty to skip file existence check
      };

      const visitor = requireTsExtensions.create(mockContext);

      const mockNode = {
        source: {
          value: './helper.js',
          raw: "'./helper.js'",
        },
      };

      visitor.ImportDeclaration(mockNode);

      expect(reports.length).toBe(1);
      expect(reports[0].data.importPath).toBe('./helper.js');

      // Test the fix function
      const mockFixer = {
        replaceText: (node: any, newValue: string) => ({ node, newValue }),
      };

      const fix = reports[0].fix(mockFixer);
      expect(fix.newValue).toBe("'./helper.ts'");
    });

    it('should replace .mjs extension with .ts', () => {
      const reports: any[] = [];
      const mockContext = {
        report: (report: any) => reports.push(report),
        filename: '',
      };

      const visitor = requireTsExtensions.create(mockContext);

      const mockNode = {
        source: {
          value: '../utils/index.mjs',
          raw: '"../utils/index.mjs"',
        },
      };

      visitor.ImportDeclaration(mockNode);

      expect(reports.length).toBe(1);

      const mockFixer = {
        replaceText: (node: any, newValue: string) => ({ node, newValue }),
      };

      const fix = reports[0].fix(mockFixer);
      expect(fix.newValue).toBe('"../utils/index.ts"');
    });

    it('should replace .cjs extension with .ts', () => {
      const reports: any[] = [];
      const mockContext = {
        report: (report: any) => reports.push(report),
        filename: '',
      };

      const visitor = requireTsExtensions.create(mockContext);

      const mockNode = {
        source: {
          value: './config.cjs',
          raw: "'./config.cjs'",
        },
      };

      visitor.ImportDeclaration(mockNode);

      expect(reports.length).toBe(1);

      const mockFixer = {
        replaceText: (node: any, newValue: string) => ({ node, newValue }),
      };

      const fix = reports[0].fix(mockFixer);
      expect(fix.newValue).toBe("'./config.ts'");
    });
  });

  describe('file existence check behavior', () => {
    const testDir = join(process.cwd(), 'test/temp/eslint-rule-existence-test');

    beforeAll(() => {
      mkdirSync(testDir, { recursive: true });
      writeFileSync(join(testDir, 'exists.ts'), '// test file');
    });

    afterAll(() => {
      rmSync(testDir, { recursive: true, force: true });
    });

    it('should not report when target file does not exist', () => {
      const reports: any[] = [];
      const mockContext = {
        report: (report: any) => reports.push(report),
        filename: join(testDir, 'current.ts'),
      };

      const visitor = requireTsExtensions.create(mockContext);

      const mockNode = {
        source: {
          value: './nonexistent',
          raw: "'./nonexistent'",
        },
      };

      visitor.ImportDeclaration(mockNode);

      expect(reports.length).toBe(0);
    });

    it('should report when target file exists', () => {
      const reports: any[] = [];
      const mockContext = {
        report: (report: any) => reports.push(report),
        filename: join(testDir, 'current.ts'),
      };

      const visitor = requireTsExtensions.create(mockContext);

      const mockNode = {
        source: {
          value: './exists',
          raw: "'./exists'",
        },
      };

      visitor.ImportDeclaration(mockNode);

      expect(reports.length).toBe(1);
    });

    it('should report and fix when import has .js but .ts file exists', () => {
      const reports: any[] = [];
      const mockContext = {
        report: (report: any) => reports.push(report),
        filename: join(testDir, 'current.ts'),
      };

      const visitor = requireTsExtensions.create(mockContext);

      const mockNode = {
        source: {
          value: './exists.js',
          raw: "'./exists.js'",
        },
      };

      visitor.ImportDeclaration(mockNode);

      expect(reports.length).toBe(1);

      const mockFixer = {
        replaceText: (node: any, newValue: string) => ({ node, newValue }),
      };

      const fix = reports[0].fix(mockFixer);
      expect(fix.newValue).toBe("'./exists.ts'");
    });
  });
});
