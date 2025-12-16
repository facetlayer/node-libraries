import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

/**
 * Get the list of directories to search for hint files.
 */
export function getHintDirectories(): string[] {
  const dirs: string[] = [];

  // User's global hints directory
  const globalHintsDir = path.join(os.homedir(), '.claude', 'hints');
  dirs.push(globalHintsDir);

  // Local project hints directory
  const localHintsDir = path.join(process.cwd(), 'specs', 'hints');
  dirs.push(localHintsDir);

  return dirs;
}

/**
 * Find all .md files in the given directories.
 */
export function findHintFiles(directories: string[]): string[] {
  const files: string[] = [];

  for (const dir of directories) {
    if (!fs.existsSync(dir)) {
      continue;
    }

    const stat = fs.statSync(dir);
    if (!stat.isDirectory()) {
      continue;
    }

    const entries = fs.readdirSync(dir);
    for (const entry of entries) {
      if (entry.endsWith('.md')) {
        files.push(path.join(dir, entry));
      }
    }
  }

  return files;
}
