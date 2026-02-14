export interface ClaudeSettingsPermissions {
  allow?: string[];
  deny?: string[];
  ask?: string[];
}

export interface ClaudeSettings {
  permissions?: ClaudeSettingsPermissions;
}

export interface SettingsFile {
  path: string;
  exists: boolean;
  content: ClaudeSettings | null;
  parseError?: string;
}

export type PermissionList = 'allow' | 'deny' | 'ask';
export type SettingsFileName = 'settings.json' | 'settings.local.json';

export interface AllowRule {
  rule: string;
  source: SettingsFileName;
}
