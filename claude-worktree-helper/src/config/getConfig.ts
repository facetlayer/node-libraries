import { readFileSync } from 'fs';
import { homedir } from 'os';
import { findConfigFile } from './findConfigFile.ts';
import type { WorktreeConfig } from './types.ts';
import { DEFAULT_CLAUDE_PERMISSIONS, DEFAULT_PROMPT_SUFFIX } from './types.ts';

/**
 * Gets the worktree configuration from the config file.
 * If no config file is found, returns defaults.
 *
 * @param startDir - Directory to start searching for config file
 * @returns Merged configuration with defaults
 */
export function getConfig(startDir?: string): WorktreeConfig {
  try {
    const configPath = findConfigFile(startDir);

    if (!configPath) {
      return getDefaultConfig();
    }

    const configContent = readFileSync(configPath, 'utf8');
    const config: WorktreeConfig = JSON.parse(configContent);

    return applyDefaults(config);
  } catch {
    return getDefaultConfig();
  }
}

function getDefaultConfig(): WorktreeConfig {
  return {
    worktreeRootDir: `${homedir()}/work`,
    worktreeSetupSteps: [{ shell: 'pnpm install' }],
    claudePermissions: DEFAULT_CLAUDE_PERMISSIONS,
    promptSuffix: DEFAULT_PROMPT_SUFFIX,
  };
}

function applyDefaults(config: WorktreeConfig): WorktreeConfig {
  const worktreeRootDir = config.worktreeRootDir || '~/work';

  // Expand ~ for home directory
  const expandedWorktreeRootDir = worktreeRootDir.startsWith('~')
    ? worktreeRootDir.replace('~', homedir())
    : worktreeRootDir;

  return {
    ...config,
    worktreeRootDir: expandedWorktreeRootDir,
    claudePermissions: config.claudePermissions ?? DEFAULT_CLAUDE_PERMISSIONS,
    promptSuffix: config.promptSuffix ?? DEFAULT_PROMPT_SUFFIX,
  };
}
