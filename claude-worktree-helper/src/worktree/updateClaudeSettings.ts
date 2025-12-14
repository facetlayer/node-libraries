import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

interface ClaudePermissions {
  allow?: string[];
  deny?: string[];
  ask?: string[];
}

interface ClaudeSettings {
  permissions?: ClaudePermissions;
}

/**
 * Updates the .claude/settings.local.json file with new permissions.
 * Creates the file and directory if they don't exist.
 *
 * @param allowEntries - Array of permission strings to add to the allow list
 * @param workingDir - The directory containing the .claude folder (defaults to current directory)
 */
export function updateClaudeSettings(allowEntries: string[], workingDir: string = process.cwd()): void {
  const claudeDir = join(workingDir, '.claude');
  const settingsPath = join(claudeDir, 'settings.local.json');

  // Create .claude directory if it doesn't exist
  if (!existsSync(claudeDir)) {
    mkdirSync(claudeDir, { recursive: true });
  }

  // Read existing settings or create new object
  let settings: ClaudeSettings = {
    permissions: {
      allow: [],
      deny: [],
      ask: [],
    },
  };

  if (existsSync(settingsPath)) {
    try {
      const fileContent = readFileSync(settingsPath, 'utf8');
      settings = JSON.parse(fileContent);

      // Ensure permissions structure exists
      if (!settings.permissions) {
        settings.permissions = { allow: [], deny: [], ask: [] };
      }
      if (!settings.permissions.allow) {
        settings.permissions.allow = [];
      }
      if (!settings.permissions.deny) {
        settings.permissions.deny = [];
      }
      if (!settings.permissions.ask) {
        settings.permissions.ask = [];
      }
    } catch {
      console.warn('Failed to parse existing settings.local.json, creating new file');
    }
  }

  // Add new entries to allow list (avoid duplicates)
  const existingAllowSet = new Set(settings.permissions!.allow);
  for (const entry of allowEntries) {
    if (!existingAllowSet.has(entry)) {
      settings.permissions!.allow!.push(entry);
    }
  }

  // Write back to file with formatting
  writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n', 'utf8');
  console.log(`Updated Claude settings at ${settingsPath}`);
}
