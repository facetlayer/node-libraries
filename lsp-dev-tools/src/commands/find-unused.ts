import ts from 'typescript';
import { resolve, relative, dirname, basename } from 'path';
import { existsSync } from 'fs';
import type { Argv } from 'yargs';

export type UnusedReason = 'no-references' | 'internal-only';

export interface UnusedSymbol {
  name: string;
  filePath: string;
  line: number;
  column: number;
  kind: string;
  reason: UnusedReason;
}

export interface FindUnusedOptions {
  projectPath: string;
  includePrivate?: boolean;
}

interface ExportedSymbolInfo {
  name: string;
  node: ts.Node;
}

function getSymbolKind(node: ts.Node): string {
  if (ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node)) {
    return 'function';
  }
  if (ts.isClassDeclaration(node) || ts.isClassExpression(node)) {
    return 'class';
  }
  if (ts.isInterfaceDeclaration(node)) {
    return 'interface';
  }
  if (ts.isTypeAliasDeclaration(node)) {
    return 'type';
  }
  if (ts.isEnumDeclaration(node)) {
    return 'enum';
  }
  if (ts.isVariableDeclaration(node)) {
    return 'variable';
  }
  if (ts.isMethodDeclaration(node)) {
    return 'method';
  }
  if (ts.isPropertyDeclaration(node)) {
    return 'property';
  }
  return 'symbol';
}

function isExported(node: ts.Node): boolean {
  const modifiers = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;
  if (modifiers) {
    return modifiers.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
  }
  return false;
}

function getExportedSymbols(sourceFile: ts.SourceFile): ExportedSymbolInfo[] {
  const symbols: ExportedSymbolInfo[] = [];

  function visit(node: ts.Node): void {
    // Handle export declarations: export { foo, bar }
    if (ts.isExportDeclaration(node)) {
      const exportClause = node.exportClause;
      if (exportClause && ts.isNamedExports(exportClause)) {
        for (const element of exportClause.elements) {
          symbols.push({
            name: element.name.text,
            node: element,
          });
        }
      }
      return;
    }

    // Handle direct exports: export function foo() {}
    if (isExported(node)) {
      let name: string | undefined;

      if (ts.isFunctionDeclaration(node) && node.name) {
        name = node.name.text;
      } else if (ts.isClassDeclaration(node) && node.name) {
        name = node.name.text;
      } else if (ts.isInterfaceDeclaration(node)) {
        name = node.name.text;
      } else if (ts.isTypeAliasDeclaration(node)) {
        name = node.name.text;
      } else if (ts.isEnumDeclaration(node)) {
        name = node.name.text;
      } else if (ts.isVariableStatement(node)) {
        for (const decl of node.declarationList.declarations) {
          if (ts.isIdentifier(decl.name)) {
            symbols.push({ name: decl.name.text, node: decl });
          }
        }
        return;
      }

      if (name) {
        symbols.push({ name, node });
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return symbols;
}

function findReferences(
  languageService: ts.LanguageService,
  sourceFile: ts.SourceFile,
  node: ts.Node
): ts.ReferencedSymbol[] | undefined {
  const position = node.getStart(sourceFile);
  return languageService.findReferences(sourceFile.fileName, position);
}

function createUnusedSymbol(
  name: string,
  node: ts.Node,
  sourceFile: ts.SourceFile,
  projectPath: string,
  reason: UnusedReason
): UnusedSymbol {
  const { line, character } = sourceFile.getLineAndCharacterOfPosition(
    node.getStart(sourceFile)
  );
  return {
    name,
    filePath: relative(projectPath, sourceFile.fileName),
    line: line + 1,
    column: character + 1,
    kind: getSymbolKind(node),
    reason,
  };
}

function isIndexFile(filePath: string, projectPath: string): boolean {
  const rel = relative(projectPath, filePath);
  const base = basename(rel);
  // Match src/index.ts, src/index.tsx, src/index.js, etc.
  return rel.startsWith('src/') && /^index\.[jt]sx?$/.test(base);
}

function collectReExportedFiles(
  program: ts.Program,
  projectPath: string
): Set<string> {
  const reExportedFiles = new Set<string>();

  for (const sourceFile of program.getSourceFiles()) {
    if (sourceFile.isDeclarationFile) continue;
    if (sourceFile.fileName.includes('node_modules')) continue;

    // Only look for export * in index files
    if (!isIndexFile(sourceFile.fileName, projectPath)) continue;

    ts.forEachChild(sourceFile, (node) => {
      // Look for: export * from './module'
      if (ts.isExportDeclaration(node) && !node.exportClause && node.moduleSpecifier) {
        if (ts.isStringLiteral(node.moduleSpecifier)) {
          const moduleSpecifier = node.moduleSpecifier.text;
          // Resolve the module path relative to the source file
          const sourceDir = dirname(sourceFile.fileName);
          const resolvedPath = resolve(sourceDir, moduleSpecifier);

          // Try common extensions
          const extensions = ['.ts', '.tsx', '.js', '.jsx'];
          for (const ext of extensions) {
            const fullPath = resolvedPath + ext;
            if (existsSync(fullPath)) {
              reExportedFiles.add(fullPath);
              break;
            }
          }
          // Also check if it's already a full path
          if (existsSync(resolvedPath)) {
            reExportedFiles.add(resolvedPath);
          }
        }
      }
    });
  }

  return reExportedFiles;
}

export function findUnusedSymbols(options: FindUnusedOptions): UnusedSymbol[] {
  const { projectPath, includePrivate = false } = options;

  const tsconfigPath = resolve(projectPath, 'tsconfig.json');
  if (!existsSync(tsconfigPath)) {
    throw new Error(`tsconfig.json not found at ${tsconfigPath}`);
  }

  const configFile = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
  if (configFile.error) {
    throw new Error(
      `Error reading tsconfig.json: ${ts.flattenDiagnosticMessageText(configFile.error.messageText, '\n')}`
    );
  }

  const parsedConfig = ts.parseJsonConfigFileContent(
    configFile.config,
    ts.sys,
    dirname(tsconfigPath)
  );

  if (parsedConfig.errors.length > 0) {
    const errors = parsedConfig.errors
      .map((e) => ts.flattenDiagnosticMessageText(e.messageText, '\n'))
      .join('\n');
    throw new Error(`Error parsing tsconfig.json: ${errors}`);
  }

  const program = ts.createProgram({
    rootNames: parsedConfig.fileNames,
    options: parsedConfig.options,
  });

  // Create a language service for finding references
  const servicesHost: ts.LanguageServiceHost = {
    getScriptFileNames: () => parsedConfig.fileNames,
    getScriptVersion: () => '1',
    getScriptSnapshot: (fileName) => {
      if (!existsSync(fileName)) {
        return undefined;
      }
      return ts.ScriptSnapshot.fromString(ts.sys.readFile(fileName) || '');
    },
    getCurrentDirectory: () => dirname(tsconfigPath),
    getCompilationSettings: () => parsedConfig.options,
    getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
    fileExists: ts.sys.fileExists,
    readFile: ts.sys.readFile,
    readDirectory: ts.sys.readDirectory,
    directoryExists: ts.sys.directoryExists,
    getDirectories: ts.sys.getDirectories,
  };

  const languageService = ts.createLanguageService(
    servicesHost,
    ts.createDocumentRegistry()
  );

  // Collect files that are re-exported via "export * from" in index files
  const reExportedFiles = collectReExportedFiles(program, projectPath);

  const unusedSymbols: UnusedSymbol[] = [];

  for (const sourceFile of program.getSourceFiles()) {
    // Skip declaration files and node_modules
    if (sourceFile.isDeclarationFile) continue;
    if (sourceFile.fileName.includes('node_modules')) continue;

    // Skip index files - exports from these are considered public API
    if (isIndexFile(sourceFile.fileName, projectPath)) continue;

    // Skip files that are re-exported via "export * from" in an index file
    if (reExportedFiles.has(sourceFile.fileName)) continue;

    const exportedSymbols = getExportedSymbols(sourceFile);

    for (const { name, node } of exportedSymbols) {
      const refs = findReferences(languageService, sourceFile, node);

      if (!refs || refs.length === 0) {
        unusedSymbols.push(
          createUnusedSymbol(name, node, sourceFile, projectPath, 'no-references')
        );
        continue;
      }

      // Check for internal and external references
      let hasInternalReference = false;
      let hasExternalReference = false;

      for (const refSymbol of refs) {
        for (const ref of refSymbol.references) {
          // Skip the definition itself
          if (ref.isDefinition) continue;

          if (ref.fileName === sourceFile.fileName) {
            hasInternalReference = true;
          } else {
            hasExternalReference = true;
          }
        }
        if (hasExternalReference) break;
      }

      if (!hasExternalReference) {
        const reason = hasInternalReference ? 'internal-only' : 'no-references';
        unusedSymbols.push(
          createUnusedSymbol(name, node, sourceFile, projectPath, reason)
        );
      }
    }
  }

  return unusedSymbols;
}

export function registerFindUnusedCommand(cli: Argv): void {
  cli.command(
    'find-unused [path]',
    'Find exported symbols that are not used anywhere',
    (yargs) =>
      yargs
        .positional('path', {
          describe: 'Path to the project directory (must contain tsconfig.json)',
          type: 'string',
          default: '.',
        })
        .option('json', {
          alias: 'j',
          describe: 'Output results as JSON',
          type: 'boolean',
          default: false,
        })
        .option('include-private', {
          describe: 'Also check non-exported symbols',
          type: 'boolean',
          default: false,
        }),
    (argv) => {
      const projectPath = resolve(argv.path as string);

      try {
        const unused = findUnusedSymbols({
          projectPath,
          includePrivate: argv.includePrivate,
        });

        if (argv.json) {
          console.log(JSON.stringify(unused, null, 2));
          return;
        }

        if (unused.length === 0) {
          console.log('No unused exported symbols found.');
          return;
        }

        console.log(`Found ${unused.length} unused exported symbol(s):\n`);

        for (const symbol of unused) {
          const reasonText =
            symbol.reason === 'internal-only'
              ? ' (only used internally - unnecessary export)'
              : '';
          console.log(
            `  ${symbol.filePath}:${symbol.line}:${symbol.column} - ${symbol.kind} '${symbol.name}'${reasonText}`
          );
        }
      } catch (error) {
        console.error(
          'Error:',
          error instanceof Error ? error.message : String(error)
        );
        process.exit(1);
      }
    }
  );
}
