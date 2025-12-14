# @facetlayer/claude-worktree-helper

CLI tool for running Claude tasks in git worktrees. Automates the workflow of creating a worktree, getting task instructions, and starting Claude.

## Installation

```bash
pnpm add @facetlayer/claude-worktree-helper
```

## CLI Usage

### Start a new Claude task

```bash
claude-worktree start <branch-name>
```

This command:
1. Opens your editor (vim by default) to write task instructions
2. Creates a new git worktree with the specified branch
3. Saves the instructions as `.instructions` in the worktree
4. Opens an iTerm window to complete setup and start Claude

### Run Claude in current worktree

```bash
claude-worktree run
```

Called automatically from the iTerm window. Sets up the worktree and starts Claude with the task instructions.

### Set up worktree only

```bash
claude-worktree setup
```

Sets up the current worktree without starting Claude. Useful for manual workflows.

### Create worktree only

```bash
claude-worktree create <branch-name> [--from <branch>]
```

Creates a new worktree without opening the editor or starting Claude.

### Show configuration

```bash
claude-worktree config
```

## Configuration

Create a `.claude-worktree.json` file in your project root:

```json
{
  "worktreeRootDir": "~/work",
  "worktreeSetupSteps": [
    { "copyFiles": [".env", "api/.env"] },
    { "shell": "pnpm install" }
  ],
  "claudePermissions": [
    "Bash(git add:*)",
    "Bash(git commit:*)",
    "Bash(git push:*)",
    "Bash(gh pr create:*)"
  ],
  "promptPrefix": "You are working on a feature for our application.",
  "promptSuffix": "When finished, submit a pull request and verify CI passes."
}
```

### Configuration Options

| Option | Type | Description |
|--------|------|-------------|
| `worktreeRootDir` | string | Root directory for worktrees (default: `~/work`) |
| `worktreeSetupSteps` | array | Steps to run when setting up a worktree |
| `claudePermissions` | array | Permissions to add to `.claude/settings.local.json` |
| `promptPrefix` | string | Text to prepend to task instructions |
| `promptSuffix` | string | Text to append to task instructions |

### Setup Steps

Each setup step can have:
- `shell`: A shell command to run
- `copyFiles`: Array of files to copy from the main repo

## Programmatic Usage

```typescript
import {
  createWorktree,
  setupNewWorktree,
  openItermWindow,
  promptUserToWriteFile,
  runTaskInWorktree,
  getConfig,
} from '@facetlayer/claude-worktree-helper';

// Create a worktree
const worktreePath = createWorktree('my-feature-branch');

// Set up the worktree (install deps, configure Claude)
await setupNewWorktree();

// Open iTerm window with a command
openItermWindow({
  initialCommand: 'cd /path/to/worktree && claude-worktree run',
  windowName: 'my-feature-branch',
});

// Get task content from user
const taskContent = promptUserToWriteFile('my-feature-branch');

// Run the full workflow
await runTaskInWorktree();
```

## Requirements

- macOS with iTerm2 (for the `start` command)
- Git with worktree support
- Claude CLI installed and configured
- pnpm (or configure different package manager in setup steps)

## License

MIT
