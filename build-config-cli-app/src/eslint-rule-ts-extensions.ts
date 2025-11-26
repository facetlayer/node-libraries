function isLocalPath(path: string): boolean {
  return typeof path === 'string' && (path.startsWith('./') || path.startsWith('../'));
}

function checkImportPath(context: any, node: any, importPath: string) {
  if (isLocalPath(importPath) && !importPath.endsWith('.ts')) {
    context.report({
      node: node,
      messageId: 'missingTsExtension',
      data: { importPath },
      fix(fixer: any) {
        const quote = node.raw[0];
        const newValue = `${quote}${importPath}.ts${quote}`;
        return fixer.replaceText(node, newValue);
      },
    });
  }
}

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
