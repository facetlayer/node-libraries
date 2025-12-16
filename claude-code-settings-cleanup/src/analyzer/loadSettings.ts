import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import type { ClaudeSettings, SettingsFile } from '../types.ts';

export interface LoadSettingsResult {
  settingsFile: SettingsFile;
  localSettingsFile: SettingsFile;
}

export function loadSettingsFile(projectPath: string, filename: string): SettingsFile {
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

export function loadSettings(projectPath: string): LoadSettingsResult {
  return {
    settingsFile: loadSettingsFile(projectPath, 'settings.json'),
    localSettingsFile: loadSettingsFile(projectPath, 'settings.local.json'),
  };
}
