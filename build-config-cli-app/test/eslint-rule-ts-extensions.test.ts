import { describe, it, expect } from 'vitest';
import { requireTsExtensions } from '../src/eslint-rule-ts-extensions.js';

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
});
