import * as fs from 'node:fs';
import * as path from 'node:path';
import matter from 'gray-matter';
import type { HintFile, HintFrontMatter } from './types.ts';

/**
 * Parse a hint file and extract its front matter and content.
 */
export function parseHintFile(filePath: string): HintFile | null {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const rawContent = fs.readFileSync(filePath, 'utf-8');
  const parsed = matter(rawContent);

  const data = parsed.data as Partial<HintFrontMatter>;

  // Use filename (without extension) as fallback for name
  const filename = path.basename(filePath, '.md');

  return {
    filePath,
    name: data.name ?? filename,
    description: data.description ?? '',
    content: parsed.content,
    rawContent,
  };
}

/**
 * Parse all hint files from a list of file paths.
 */
export function parseAllHintFiles(filePaths: string[]): HintFile[] {
  const hints: HintFile[] = [];

  for (const filePath of filePaths) {
    const hint = parseHintFile(filePath);
    if (hint) {
      hints.push(hint);
    }
  }

  return hints;
}
