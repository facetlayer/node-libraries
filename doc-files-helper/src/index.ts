import { readFileSync, readdirSync } from 'fs';
import { join, basename, relative } from 'path';

export interface Frontmatter {
  name?: string;
  description?: string;
  [key: string]: string | undefined;
}

export interface ParsedDocument {
  frontmatter: Frontmatter;
  content: string;
}

export interface DocInfo {
  name: string;
  description: string;
  filename: string;
}

export interface DocContent extends DocInfo {
  content: string;
  rawContent: string;
  fullPath: string;
}

export interface DocFilesHelperOptions {
  // List of directories to search for *.md files
  dirs?: string[];

  // List of specific files to include
  files?: string[];

  // If provided, this will override the subcommand to get a single doc file.
  // Default: 'get-doc'
  overrideGetSubcommand?: string
}

/**
 * Parse YAML frontmatter from a markdown document.
 * Frontmatter is delimited by --- at the start of the file.
 */
export function parseFrontmatter(text: string): ParsedDocument {
  const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;
  const match = text.match(frontmatterRegex);

  if (!match) {
    return {
      frontmatter: {},
      content: text,
    };
  }

  const [, frontmatterBlock, content] = match;
  const frontmatter: Frontmatter = {};

  for (const line of frontmatterBlock.split('\n')) {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;

    const key = line.slice(0, colonIndex).trim();
    const value = line.slice(colonIndex + 1).trim();
    frontmatter[key] = value;
  }

  return {
    frontmatter,
    content: content.trim(),
  };
}

/**
 * Helper class for working with doc files.
 */
export class DocFilesHelper {
  options: DocFilesHelperOptions

  // Map of base filename (without directory) -> full file path
  private fileMap: Map<string, string>;

  constructor(options: DocFilesHelperOptions) {
    this.options = options;
    this.fileMap = new Map();

    // Add files from directories
    if (options.dirs) {
      for (const dir of options.dirs) {
        const files = readdirSync(dir);
        for (const file of files) {
          if (!file.endsWith('.md')) continue;
          this.fileMap.set(file, join(dir, file));
        }
      }
    }

    // Add specific files
    if (options.files) {
      for (const filePath of options.files) {
        const baseFilename = basename(filePath);
        this.fileMap.set(baseFilename, filePath);
      }
    }
  }

  formatGetDocCommand(filename: string): string {
    const script = relative(process.cwd(), process.argv[1]);
    const binName = basename(script);
    // Handle cases like 'node .' or 'node dist/cli.js'
    if (binName === '.' || binName.endsWith('.js') || binName.endsWith('.mjs')) {
      const getDocSubcommand = this.options.overrideGetSubcommand || 'get-doc';
      return `node ${script} ${getDocSubcommand} ${filename}`;
    }
    return `${binName} get-doc ${filename}`;
  }

  /**
   * List all doc files, returning their metadata from frontmatter.
   * Files that don't exist are silently skipped.
   */
  listDocs(): DocInfo[] {
    const docs: DocInfo[] = [];

    for (const [baseFilename, fullPath] of this.fileMap) {
      let rawContent: string;
      try {
        rawContent = readFileSync(fullPath, 'utf-8');
      } catch (err: any) {
        if (err.code === 'ENOENT') {
          // File doesn't exist, skip it silently
          continue;
        }
        throw err;
      }
      const { frontmatter } = parseFrontmatter(rawContent);

      docs.push({
        name: frontmatter.name || basename(baseFilename, '.md'),
        description: frontmatter.description || '',
        filename: baseFilename,
      });
    }

    return docs;
  }

  /**
   * Get the contents of a specific doc file by name.
   * If the exact filename doesn't exist, looks for a partial match.
   * Throws an error if the doc file is not found or if multiple matches are found.
   */
  getDoc(name: string): DocContent {
    const baseName = name.endsWith('.md') ? name.slice(0, -3) : name;
    const filename = `${baseName}.md`;

    // Try exact match first
    const fullPath = this.fileMap.get(filename);
    if (fullPath) {
      const rawContent = readFileSync(fullPath, 'utf-8');
      const { frontmatter, content } = parseFrontmatter(rawContent);

      return {
        name: frontmatter.name || baseName,
        description: frontmatter.description || '',
        filename,
        content,
        rawContent,
        fullPath,
      };
    }

    // Fall back to partial matching on filename or frontmatter name
    const docs = this.listDocs();
    const matches = docs.filter(
      (doc) =>
        doc.filename.toLowerCase().includes(baseName.toLowerCase()) ||
        doc.name.toLowerCase().includes(baseName.toLowerCase())
    );

    if (matches.length === 0) {
      throw new Error(`Doc file not found: ${baseName}`);
    }

    if (matches.length > 1) {
      const matchNames = matches.map((m) => m.filename).join(', ');
      throw new Error(
        `Multiple docs match "${baseName}": ${matchNames}. Please be more specific.`
      );
    }

    const matchedFilename = matches[0].filename;
    const matchedPath = this.fileMap.get(matchedFilename)!;
    const rawContent = readFileSync(matchedPath, 'utf-8');
    const { frontmatter, content } = parseFrontmatter(rawContent);

    return {
      name: frontmatter.name || basename(matchedFilename, '.md'),
      description: frontmatter.description || '',
      filename: matchedFilename,
      content,
      rawContent,
      fullPath: matchedPath,
    };
  }

  /**
   * Print a formatted list of all doc files to stdout.
   * Used by the 'list-docs' command.
   */
  printDocFileList(): void {
    const docs = this.listDocs();
    console.log('Available doc files:\n');
    for (const doc of docs) {
      console.log(`  ${doc.name} (${this.formatGetDocCommand(doc.filename)}):`);
      if (doc.description) {
        console.log(`    ${doc.description}\n`);
      }
    }
  }

  /**
   * Print the raw contents of a specific doc file to stdout.
   *
   * Used by the 'get-doc' command.
   */
  printDocFileContents(name: string): void {
    try {
      const doc = this.getDoc(name);
      console.log(doc.rawContent);
      console.log(`\n(File source: ${doc.fullPath})`);
    } catch {
      console.error(`Doc file not found: ${name}`);
      console.error('Use "list-docs" to see available docs.');
      process.exit(1);
    }
  }

  yargsSetup(yargs: any) {
    yargs
      .command(
      'list-docs',
      'List available documentation files',
      {},
      async () => this.printDocFileList(),
    )
    .command(
      'get-doc <name>',
      'Display the contents of a documentation file',
      (yargs: any) => {
        return yargs.positional('name', {
          type: 'string',
          describe: 'Name of the doc file',
          demandOption: true,
        });
      },
      async (argv: any) => this.printDocFileContents(argv.name as string),
    )

  }
}
