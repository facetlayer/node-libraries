import { readFileSync, readdirSync } from 'fs';
import { join, basename } from 'path';

export interface Frontmatter {
  name?: string;
  description?: string;
  [key: string]: string | undefined;
}

export interface ParsedDocument {
  frontmatter: Frontmatter;
  content: string;
}

export interface SpecInfo {
  name: string;
  description: string;
  filename: string;
}

export interface SpecContent extends SpecInfo {
  content: string;
  rawContent: string;
}

export interface SpecFilesHelperOptions {
  specsDir: string;
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
 * Helper class for working with spec files in a directory.
 */
export class SpecFilesHelper {
  private specsDir: string;

  constructor(options: SpecFilesHelperOptions) {
    this.specsDir = options.specsDir;
  }

  formatGetSpecCommand(filename: string): string {
    return `${process.argv[0]} get-spec ${filename}`;
  }

  /**
   * List all spec files in the directory, returning their metadata from frontmatter.
   */
  listSpecs(): SpecInfo[] {
    const files = readdirSync(this.specsDir);
    const specs: SpecInfo[] = [];

    for (const file of files) {
      if (!file.endsWith('.md')) continue;

      const filePath = join(this.specsDir, file);
      const rawContent = readFileSync(filePath, 'utf-8');
      const { frontmatter } = parseFrontmatter(rawContent);

      specs.push({
        name: frontmatter.name || basename(file, '.md'),
        description: frontmatter.description || '',
        filename: file,
      });
    }

    return specs;
  }

  /**
   * Get the contents of a specific spec file by name.
   * If the exact filename doesn't exist, looks for a partial match.
   * Throws an error if the spec file is not found or if multiple matches are found.
   */
  getSpec(name: string): SpecContent {
    const baseName = name.endsWith('.md') ? name.slice(0, -3) : name;
    const specPath = join(this.specsDir, `${baseName}.md`);

    let rawContent: string;
    let filename = `${baseName}.md`;

    try {
      rawContent = readFileSync(specPath, 'utf-8');
    } catch {
      // Fall back to partial matching on filename or frontmatter name
      const specs = this.listSpecs();
      const matches = specs.filter(
        (spec) =>
          spec.filename.toLowerCase().includes(baseName.toLowerCase()) ||
          spec.name.toLowerCase().includes(baseName.toLowerCase())
      );

      if (matches.length === 0) {
        throw new Error(`Spec file not found: ${baseName}`);
      }

      if (matches.length > 1) {
        const matchNames = matches.map((m) => m.filename).join(', ');
        throw new Error(
          `Multiple specs match "${baseName}": ${matchNames}. Please be more specific.`
        );
      }

      filename = matches[0].filename;
      rawContent = readFileSync(join(this.specsDir, filename), 'utf-8');
    }

    const { frontmatter, content } = parseFrontmatter(rawContent);

    return {
      name: frontmatter.name || basename(filename, '.md'),
      description: frontmatter.description || '',
      filename,
      content,
      rawContent,
    };
  }

  /**
   * Print a formatted list of all spec files to stdout.
   * Used by the 'list-specs' command.
   */
  printSpecFileList(): void {
    const specs = this.listSpecs();
    console.log('Available specs:\n');
    for (const spec of specs) {
      console.log(`  ${this.formatGetSpecCommand(spec.filename)}:`);
      if (spec.description) {
        console.log(`    ${spec.description}\n`);
      }
    }
  }

  /**
   * Print the raw contents of a specific spec file to stdout.
   * 
   * Used by the 'get-spec' command.
   */
  printSpecFileContents(name: string): void {
    try {
      const spec = this.getSpec(name);
      console.log(spec.rawContent);
    } catch {
      console.error(`Spec file not found: ${name}`);
      console.error('Use "list-specs" to see available specs.');
      process.exit(1);
    }
  }
}
