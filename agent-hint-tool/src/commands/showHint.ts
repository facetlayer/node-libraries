import * as path from 'node:path';
import { getHintDirectories, findHintFiles } from '../discovery.ts';
import { parseAllHintFiles } from '../parser.ts';
import type { HintFile } from '../types.ts';

/**
 * Find hints matching a partial name.
 */
function findMatchingHints(hints: HintFile[], searchName: string): HintFile[] {
  const lowerSearch = searchName.toLowerCase();

  return hints.filter((hint) => {
    // Match against the name from front matter
    if (hint.name.toLowerCase().includes(lowerSearch)) {
      return true;
    }

    // Match against the filename (without extension)
    const filename = path.basename(hint.filePath, '.md').toLowerCase();
    if (filename.includes(lowerSearch)) {
      return true;
    }

    return false;
  });
}

/**
 * Execute the show-hint command.
 */
export function showHint(name: string): void {
  const directories = getHintDirectories();
  const filePaths = findHintFiles(directories);
  const hints = parseAllHintFiles(filePaths);

  if (hints.length === 0) {
    console.error('No hint files found in search directories.');
    console.error('Search directories:');
    for (const dir of directories) {
      console.error(`  - ${dir}`);
    }
    process.exit(1);
  }

  const matches = findMatchingHints(hints, name);

  if (matches.length === 0) {
    console.error(`No hints found matching "${name}".`);
    console.error('\nAvailable hints:');
    for (const hint of hints) {
      console.error(`  - ${hint.name}: ${hint.description}`);
    }
    process.exit(1);
  }

  if (matches.length > 1) {
    console.error(`Multiple hints found matching "${name}". Please be more specific.\n`);
    console.error('Matches:');
    for (const hint of matches) {
      console.error(`  - ${hint.name}: ${hint.description}`);
    }
    process.exit(1);
  }

  // Exactly one match - display the full content
  const hint = matches[0];
  console.log(`# ${hint.name}`);
  if (hint.description) {
    console.log(`\n> ${hint.description}`);
  }
  console.log(`\nFile: ${hint.filePath}`);
  console.log('\n---\n');
  console.log(hint.content.trim());
}
