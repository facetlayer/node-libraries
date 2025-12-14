/**
 * Configuration for setting up a worktree
 */
export interface WorktreeSetupStep {
  /** Shell command to run */
  shell?: string;
  /** Files to copy from the main repo */
  copyFiles?: string[];
}

/**
 * Main configuration for claude-worktree-helper
 */
export interface WorktreeConfig {
  /** Root directory where worktrees will be created (defaults to ~/work) */
  worktreeRootDir?: string;
  /** Steps to run when setting up a new worktree */
  worktreeSetupSteps?: WorktreeSetupStep[];
  /** Permissions to add to Claude settings */
  claudePermissions?: string[];
  /** Prompt template to prepend to task instructions */
  promptPrefix?: string;
  /** Prompt template to append to task instructions */
  promptSuffix?: string;
}

/**
 * Default Claude permissions for worktrees
 */
export const DEFAULT_CLAUDE_PERMISSIONS = [
  'Bash(git add:*)',
  'Bash(git commit:*)',
  'Bash(git push:*)',
  'Bash(gh pr create:*)',
  'Bash(gh pr:*)',
  'Bash(gh run view:*)',
  'Bash(gh run list:*)',
];

/**
 * Default prompt suffix with instructions for PR workflow
 */
export const DEFAULT_PROMPT_SUFFIX =
  `When the task is finished, submit the change as a pull request. ` +
  `This project uses Github Actions. All pull requests must pass all build checks in order to be merged. ` +
  `Check the build results after creating the PR.`;
