import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { spawn, execSync } from 'child_process';
import { setupNewWorktree } from '../worktree/setupNewWorktree.ts';
import { getConfig } from '../config/index.ts';

const INSTRUCTIONS_FILE = '.instructions';

function getCurrentBranch(): string {
  try {
    return execSync('git branch --show-current', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    })
      .toString()
      .trim();
  } catch {
    return 'unknown-branch';
  }
}

function setTerminalTitle(title: string): void {
  // Set terminal title using ANSI escape sequences
  process.stdout.write(`\x1b]0;${title}\x07`);
}

function loadTaskInstructions(): string {
  const instructionsPath = join(process.cwd(), INSTRUCTIONS_FILE);

  if (!existsSync(instructionsPath)) {
    throw new Error(`${INSTRUCTIONS_FILE} file not found in current directory`);
  }

  return readFileSync(instructionsPath, 'utf8');
}

function buildFullPrompt(taskInstructions: string): string {
  const config = getConfig();

  let fullPrompt = '';

  // Add prefix if configured
  if (config.promptPrefix) {
    fullPrompt += config.promptPrefix + '\n\n';
  }

  // Add the task instructions
  fullPrompt += 'Task instructions:\n\n' + taskInstructions;

  // Add suffix if configured
  if (config.promptSuffix) {
    fullPrompt += '\n\n' + config.promptSuffix;
  }

  return fullPrompt;
}

async function runClaude(prompt: string): Promise<void> {
  console.log('Starting Claude with task instructions...\n');

  // Escape the prompt for shell - escape single quotes by replacing ' with '\''
  const escapedPrompt = prompt.replace(/'/g, "'\\''");

  // Pass the prompt as a command line argument to claude
  const claudeProcess = spawn('sh', ['-c', `claude --permission-mode acceptEdits '${escapedPrompt}'`], {
    stdio: 'inherit',
    shell: false,
  });

  return new Promise((resolve, reject) => {
    claudeProcess.on('error', (error) => {
      reject(new Error(`Failed to start Claude: ${error.message}`));
    });

    claudeProcess.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Claude exited with code ${code}`));
      }
    });
  });
}

/**
 * Saves task instructions to the .instructions file.
 *
 * @param content - The task instructions content
 * @param worktreePath - Path to the worktree (defaults to cwd)
 */
export function saveInstructions(content: string, worktreePath: string = process.cwd()): void {
  const instructionsPath = join(worktreePath, INSTRUCTIONS_FILE);
  writeFileSync(instructionsPath, content, 'utf8');
  console.log(`Saved instructions to ${instructionsPath}`);
}

/**
 * Runs the full workflow in a worktree:
 * 1. Sets up the worktree (installs dependencies, etc.)
 * 2. Builds the prompt with configured prefix/suffix
 * 3. Starts Claude with the prompt
 */
export async function runTaskInWorktree(): Promise<void> {
  try {
    await setupNewWorktree();

    // Set terminal title to current branch
    const currentBranch = getCurrentBranch();
    setTerminalTitle(currentBranch);
    console.log(`Terminal title set to: ${currentBranch}`);

    // Build task instructions
    const taskInstructions = loadTaskInstructions();
    const fullPrompt = buildFullPrompt(taskInstructions);

    // Run Claude
    await runClaude(fullPrompt);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Error:', message);
    process.exit(1);
  }
}
