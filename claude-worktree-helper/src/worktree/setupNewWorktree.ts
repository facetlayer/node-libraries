import { execSync, spawn } from 'child_process';
import { copyFileSync, existsSync } from 'fs';
import { join, resolve, relative } from 'path';
import { getConfig } from '../config/index.ts';
import { updateClaudeSettings } from './updateClaudeSettings.ts';

function runCommand(command: string, cwd?: string): string {
  try {
    return execSync(command, {
      cwd,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    })
      .toString()
      .trim();
  } catch (error) {
    console.error(`Failed to run command: ${command}`);
    throw error;
  }
}

function validatePath(path: string, description: string): string {
  if (!path || path.trim() === '') {
    throw new Error(`Invalid ${description}: path is empty`);
  }

  const resolvedPath = resolve(path);

  // Check for suspicious path patterns
  if (path.includes('..') && relative(process.cwd(), resolvedPath).startsWith('..')) {
    throw new Error(`Invalid ${description}: path contains suspicious traversal patterns`);
  }

  return resolvedPath;
}

function validateGitOutput(output: string): string {
  if (!output || output.trim() === '') {
    throw new Error('Git command returned empty output');
  }

  // Basic validation that the output looks like a valid path
  const trimmed = output.trim();
  if (trimmed.includes('\n') || trimmed.includes('\r')) {
    throw new Error('Git command returned unexpected multi-line output');
  }

  return trimmed;
}

function findOriginalRepoPath(): string {
  console.log('Finding original repo path...');
  const gitCommonDir = runCommand('git rev-parse --path-format=absolute --git-common-dir');

  const validatedGitOutput = validateGitOutput(gitCommonDir);
  const validatedGitCommonDir = validatePath(validatedGitOutput, 'git common directory');
  const originalRepoPath = validatePath(join(validatedGitCommonDir, '..'), 'original repository path');

  console.log(`Original repo path: ${originalRepoPath}`);
  return originalRepoPath;
}

async function runShellCommand(command: string, cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const childProcess = spawn('sh', ['-c', command], {
      cwd,
      stdio: 'inherit',
      shell: false,
    });

    childProcess.on('error', (error) => {
      reject(new Error(`Failed to run command: ${error.message}`));
    });

    childProcess.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command exited with code ${code}`));
      }
    });
  });
}

async function runSetupSteps(originalRepoPath: string): Promise<void> {
  const config = getConfig();

  if (!config.worktreeSetupSteps || config.worktreeSetupSteps.length === 0) {
    console.log('No worktree setup steps configured, running pnpm install');
    await runShellCommand('pnpm install', process.cwd());
    return;
  }

  for (const step of config.worktreeSetupSteps) {
    // Handle file copying
    if (step.copyFiles) {
      console.log(`Copying files: ${step.copyFiles.join(', ')}`);
      for (const filePath of step.copyFiles) {
        const sourceFilePath = join(originalRepoPath, filePath);
        const targetFilePath = join(process.cwd(), filePath);

        if (existsSync(sourceFilePath)) {
          copyFileSync(sourceFilePath, targetFilePath);
          console.log(`Copied ${filePath}`);
        } else {
          console.warn(`Source file not found: ${sourceFilePath}`);
        }
      }
    }

    // Handle shell command
    if (step.shell) {
      console.log(`Running setup step: ${step.shell}`);
      try {
        await runShellCommand(step.shell, process.cwd());
        console.log(`Setup step completed: ${step.shell}`);
      } catch (error) {
        console.error(`Setup step failed: ${step.shell}`, error);
        throw error;
      }
    }
  }
}

/**
 * Sets up a new worktree with dependencies and Claude settings.
 * This should be run from inside the worktree directory.
 */
export async function setupNewWorktree(): Promise<void> {
  console.log('Setting up new worktree...');

  // Check if we're on the main branch and exit if so
  const currentBranch = runCommand('git branch --show-current');
  if (currentBranch === 'main') {
    throw new Error('Cannot run worktree preparation on the main branch');
  }

  const originalRepoPath = findOriginalRepoPath();

  await runSetupSteps(originalRepoPath);

  // Setup Claude settings with configured permissions
  const config = getConfig();
  if (config.claudePermissions && config.claudePermissions.length > 0) {
    console.log('Setting up Claude settings...');
    updateClaudeSettings(config.claudePermissions);
    console.log('Claude settings configured');
  }

  console.log('Worktree preparation complete!');
}
