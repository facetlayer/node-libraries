import * as path from 'path';
import * as os from 'os';

/**
 * Resolve the Claude root directory (the parent of `projects/`).
 * Falls back to `~/.claude` when no override is given.
 */
export function resolveClaudeDir(override?: string): string {
  return override || path.join(os.homedir(), '.claude');
}

/**
 * Resolve the directory that contains per-project session folders,
 * i.e. `<claudeDir>/projects`.
 */
export function getClaudeProjectsDir(claudeDir?: string): string {
  return path.join(resolveClaudeDir(claudeDir), 'projects');
}
