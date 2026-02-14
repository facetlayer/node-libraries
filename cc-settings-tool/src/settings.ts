import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import type { ClaudeSettings, SettingsFile, SettingsFileName, AllowRule } from './types.ts';

/**
 * Load a single Claude Code settings file.
 */
export function loadSettingsFile(projectPath: string, filename: SettingsFileName): SettingsFile {
  const path = join(projectPath, '.claude', filename);

  if (!existsSync(path)) {
    return {
      path,
      exists: false,
      content: null,
    };
  }

  try {
    const rawContent = readFileSync(path, 'utf-8');
    const content = JSON.parse(rawContent) as ClaudeSettings;
    return {
      path,
      exists: true,
      content,
    };
  } catch (error) {
    let parseError = 'Unknown error parsing JSON';
    if (error instanceof SyntaxError) {
      parseError = `Invalid JSON: ${error.message}`;
    } else if (error instanceof Error) {
      parseError = error.message;
    }
    return {
      path,
      exists: true,
      content: null,
      parseError,
    };
  }
}

export interface LoadSettingsResult {
  settingsFile: SettingsFile;
  localSettingsFile: SettingsFile;
}

/**
 * Load both settings.json and settings.local.json from a project path.
 */
export function loadSettings(projectPath: string): LoadSettingsResult {
  return {
    settingsFile: loadSettingsFile(projectPath, 'settings.json'),
    localSettingsFile: loadSettingsFile(projectPath, 'settings.local.json'),
  };
}

/**
 * List all allow rules from both settings files, with the source file indicated.
 */
export function listAllowRules(projectPath: string): AllowRule[] {
  const { settingsFile, localSettingsFile } = loadSettings(projectPath);
  const rules: AllowRule[] = [];

  if (settingsFile.content?.permissions?.allow) {
    for (const rule of settingsFile.content.permissions.allow) {
      rules.push({ rule, source: 'settings.json' });
    }
  }

  if (localSettingsFile.content?.permissions?.allow) {
    for (const rule of localSettingsFile.content.permissions.allow) {
      rules.push({ rule, source: 'settings.local.json' });
    }
  }

  return rules;
}

/**
 * Check if an allow rule already exists in any settings file.
 */
export function hasAllowRule(projectPath: string, rule: string): boolean {
  const rules = listAllowRules(projectPath);
  return rules.some((r) => r.rule === rule);
}

/**
 * Add an allow rule to a settings file if it doesn't already exist in any file.
 * Returns true if the rule was added, false if it already existed.
 */
export function addAllowRule(
  projectPath: string,
  rule: string,
  targetFile: SettingsFileName = 'settings.json',
): boolean {
  if (hasAllowRule(projectPath, rule)) {
    return false;
  }

  const settingsPath = join(projectPath, '.claude', targetFile);
  let settings: ClaudeSettings = {};

  if (existsSync(settingsPath)) {
    try {
      settings = JSON.parse(readFileSync(settingsPath, 'utf-8')) as ClaudeSettings;
    } catch {
      // If the file is corrupted, start fresh
      settings = {};
    }
  } else {
    // Ensure .claude directory exists
    const claudeDir = dirname(settingsPath);
    if (!existsSync(claudeDir)) {
      mkdirSync(claudeDir, { recursive: true });
    }
  }

  if (!settings.permissions) {
    settings.permissions = {};
  }
  if (!settings.permissions.allow) {
    settings.permissions.allow = [];
  }

  settings.permissions.allow.push(rule);
  writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n', 'utf-8');

  return true;
}
