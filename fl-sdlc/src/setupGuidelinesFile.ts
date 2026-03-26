import { readFileSync, appendFileSync, existsSync } from 'fs';
import { join } from 'path';
import { runShellCommand } from '@facetlayer/subprocess';

const GUIDELINES_FILENAME = '.PROJECT_GUIDELINES.md';

export async function setupGuidelinesFile(cwd?: string): Promise<void> {
  const dir = cwd ?? process.cwd();

  // Find the git dir
  const result = await runShellCommand('git', ['rev-parse', '--git-dir'], { cwd: dir });
  if (result.failed()) {
    console.error('Not a git repository.');
    process.exit(1);
  }

  const gitDir = result.stdoutAsString().trim();
  const excludePath = join(gitDir, 'info', 'exclude');

  // Check if already excluded
  if (existsSync(excludePath)) {
    const content = readFileSync(excludePath, 'utf-8');
    if (content.split('\n').includes(GUIDELINES_FILENAME)) {
      console.log(`${GUIDELINES_FILENAME} is already in .git/info/exclude`);
      return;
    }
  }

  // Append to exclude file
  const suffix = existsSync(excludePath) && !readFileSync(excludePath, 'utf-8').endsWith('\n')
    ? `\n${GUIDELINES_FILENAME}\n`
    : `${GUIDELINES_FILENAME}\n`;
  appendFileSync(excludePath, suffix);
  console.log(`Added ${GUIDELINES_FILENAME} to .git/info/exclude`);
}
