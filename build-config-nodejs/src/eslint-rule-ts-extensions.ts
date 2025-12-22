import { existsSync } from 'fs';
import { dirname, resolve } from 'path';

function isLocalPath(path: string): boolean {
  return typeof path === 'string' && (path.startsWith('./') || path.startsWith('../'));
}

/**
 * Strip common JS extensions from import path
 */
function stripJsExtension(importPath: string): string {
  if (importPath.endsWith('.js')) {
    return importPath.slice(0, -3);
  }
  if (importPath.endsWith('.mjs')) {
    return importPath.slice(0, -4);
  }
  if (importPath.endsWith('.cjs')) {
    return importPath.slice(0, -4);
  }
  return importPath;
}

/**
 * Check if the target TypeScript file exists
 */
function targetFileExists(currentFilePath: string, importPath: string): boolean {
  const basePath = stripJsExtension(importPath);
  const currentDir = dirname(currentFilePath);
  const resolvedPath = resolve(currentDir, basePath + '.ts');
  return existsSync(resolvedPath);
}

function checkImportPath(context: any, node: any, importPath: string) {
  if (isLocalPath(importPath) && !importPath.endsWith('.ts')) {
    const currentFilePath = context.filename || context.getFilename?.() || '';
    const basePath = stripJsExtension(importPath);
    const newImportPath = basePath + '.ts';

    // Check if the target file exists before reporting/fixing
    if (currentFilePath && !targetFileExists(currentFilePath, importPath)) {
      // Don't report if target file doesn't exist - this would create an invalid import
      return;
    }

    context.report({
      node: node,
      messageId: 'missingTsExtension',
      data: { importPath },
      fix(fixer: any) {
        const quote = node.raw[0];
        const newValue = `${quote}${newImportPath}${quote}`;
        return fixer.replaceText(node, newValue);
      },
    });
  }
}

// Export helper functions for testing
export { stripJsExtension, targetFileExists };

export const requireTsExtensions = {
  meta: {
    type: 'problem' as const,
    docs: {
      description: 'Require .ts extensions for local TypeScript imports',
    },
    fixable: 'code' as const,
    schema: [],
    messages: {
      missingTsExtension: 'Local import "{{importPath}}" must end with .ts extension',
    },
  },
  create(context: any) {
    return {
      ImportDeclaration(node: any) {
        checkImportPath(context, node.source, node.source.value);
      },
      ExportNamedDeclaration(node: any) {
        if (node.source) {
          checkImportPath(context, node.source, node.source.value);
        }
      },
      ExportAllDeclaration(node: any) {
        checkImportPath(context, node.source, node.source.value);
      },
    };
  },
};
