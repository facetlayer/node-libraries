import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import type { SuggestionAction, ClaudeSettings, PermissionList } from '../types.ts';

/**
 * Applies a suggestion action to the settings files.
 * Returns a description of what was changed.
 */
export function applySuggestion(
  projectPath: string,
  action: SuggestionAction
): string {
  const filePath = join(projectPath, '.claude', action.file);

  switch (action.type) {
    case 'remove':
      return applyRemove(filePath, action.list, action.rules);
    case 'add':
      return applyAdd(filePath, action.list, action.rules);
    case 'replace':
      if (!action.newRule) {
        throw new Error('Replace action requires newRule');
      }
      return applyReplace(filePath, action.list, action.rules, action.newRule);
    case 'move':
      if (!action.destFile) {
        throw new Error('Move action requires destFile');
      }
      const destPath = join(projectPath, '.claude', action.destFile);
      return applyMove(filePath, destPath, action.list, action.rules);
    default:
      throw new Error(`Unknown action type: ${action.type}`);
  }
}

function loadSettingsFile(filePath: string): ClaudeSettings {
  if (!existsSync(filePath)) {
    return {};
  }
  const content = readFileSync(filePath, 'utf-8');
  return JSON.parse(content) as ClaudeSettings;
}

function saveSettingsFile(filePath: string, settings: ClaudeSettings): void {
  // Ensure directory exists
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(filePath, JSON.stringify(settings, null, 2) + '\n');
}

function getPermissionList(settings: ClaudeSettings, list: PermissionList): string[] {
  if (!settings.permissions) {
    settings.permissions = {};
  }
  if (!settings.permissions[list]) {
    settings.permissions[list] = [];
  }
  return settings.permissions[list]!;
}

function applyRemove(filePath: string, list: PermissionList, rules: string[]): string {
  const settings = loadSettingsFile(filePath);
  const permissions = getPermissionList(settings, list);

  const rulesToRemove = new Set(rules);
  const originalLength = permissions.length;

  settings.permissions![list] = permissions.filter(rule => !rulesToRemove.has(rule));

  const removedCount = originalLength - settings.permissions![list]!.length;

  saveSettingsFile(filePath, settings);

  return `Removed ${removedCount} rule(s) from ${list} list`;
}

function applyAdd(filePath: string, list: PermissionList, rules: string[]): string {
  const settings = loadSettingsFile(filePath);
  const permissions = getPermissionList(settings, list);

  const existingRules = new Set(permissions);
  let addedCount = 0;

  for (const rule of rules) {
    if (!existingRules.has(rule)) {
      permissions.push(rule);
      addedCount++;
    }
  }

  saveSettingsFile(filePath, settings);

  return `Added ${addedCount} rule(s) to ${list} list`;
}

function applyReplace(
  filePath: string,
  list: PermissionList,
  rules: string[],
  newRule: string
): string {
  const settings = loadSettingsFile(filePath);
  const permissions = getPermissionList(settings, list);

  const rulesToRemove = new Set(rules);
  const originalLength = permissions.length;

  // Remove old rules
  settings.permissions![list] = permissions.filter(rule => !rulesToRemove.has(rule));

  // Add new rule if not already present
  if (!settings.permissions![list]!.includes(newRule)) {
    settings.permissions![list]!.push(newRule);
  }

  const removedCount = originalLength - settings.permissions![list]!.length + 1;

  saveSettingsFile(filePath, settings);

  return `Replaced ${removedCount} rule(s) with "${newRule}"`;
}

function applyMove(
  srcFilePath: string,
  destFilePath: string,
  list: PermissionList,
  rules: string[]
): string {
  const srcSettings = loadSettingsFile(srcFilePath);
  const destSettings = loadSettingsFile(destFilePath);

  const srcPermissions = getPermissionList(srcSettings, list);
  const destPermissions = getPermissionList(destSettings, list);

  const rulesToMove = new Set(rules);
  const existingInDest = new Set(destPermissions);
  let movedCount = 0;

  // Remove from source and add to destination
  srcSettings.permissions![list] = srcPermissions.filter(rule => {
    if (rulesToMove.has(rule)) {
      if (!existingInDest.has(rule)) {
        destPermissions.push(rule);
      }
      movedCount++;
      return false;
    }
    return true;
  });

  saveSettingsFile(srcFilePath, srcSettings);
  saveSettingsFile(destFilePath, destSettings);

  const srcFileName = srcFilePath.split('/').pop();
  const destFileName = destFilePath.split('/').pop();

  return `Moved ${movedCount} rule(s) from ${srcFileName} to ${destFileName}`;
}
