// Config
export { getConfig, findConfigFile, DEFAULT_CLAUDE_PERMISSIONS, DEFAULT_PROMPT_SUFFIX } from './config/index.ts';
export type { WorktreeConfig, WorktreeSetupStep } from './config/index.ts';

// Worktree operations
export {
  createWorktree,
  validateCurrentBranch,
  branchExists,
  setupNodeModules,
  setupNewWorktree,
  updateClaudeSettings,
} from './worktree/index.ts';

// Workflow operations
export { openItermWindow, promptUserToWriteFile, runTaskInWorktree, saveInstructions } from './workflow/index.ts';
export type { OpenItermRequest } from './workflow/index.ts';
