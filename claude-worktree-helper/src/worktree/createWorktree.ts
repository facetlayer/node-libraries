import { execSync } from 'child_process';
import { join } from 'path';
import { getConfig } from '../config/index.ts';

/**
 * Validates that we're on the main branch.
 */
export function validateCurrentBranch(): void {
  const currentBranch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
  if (currentBranch !== 'main') {
    throw new Error(`Must be on 'main' branch. Currently on '${currentBranch}'`);
  }
}

/**
 * Checks if a branch already exists.
 */
export function branchExists(branchName: string): boolean {
  try {
    execSync(`git rev-parse --verify ${branchName}`, { encoding: 'utf8' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Creates a new git worktree with the specified branch name.
 *
 * @param branchName - Name of the branch to create
 * @param fromBranch - Branch to create from (defaults to origin/main)
 * @returns Path to the created worktree
 */
export function createWorktree(branchName: string, fromBranch?: string): string {
  if (branchExists(branchName)) {
    throw new Error(`Branch '${branchName}' already exists`);
  }

  const baseBranch = fromBranch || 'origin/main';
  console.log(`Creating branch '${branchName}' from ${baseBranch}...`);
  execSync(`git branch ${branchName} ${baseBranch}`, { stdio: 'inherit' });

  const config = getConfig();
  const worktreeRootDir = config.worktreeRootDir!;
  const worktreePath = join(worktreeRootDir, branchName);

  execSync(`git worktree add "${worktreePath}" ${branchName}`, { stdio: 'inherit' });

  console.log(`Setting up remote branch '${branchName}'...`);
  execSync(`git -C "${worktreePath}" push -u origin ${branchName}`, { stdio: 'inherit' });

  return worktreePath;
}

/**
 * Installs node modules in the worktree.
 */
export function setupNodeModules(worktreePath: string): void {
  console.log('Installing dependencies...');
  execSync(`pnpm install`, { stdio: 'inherit', cwd: worktreePath });
}
