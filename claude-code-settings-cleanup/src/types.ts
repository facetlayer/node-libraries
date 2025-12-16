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

export type SuggestionSeverity = 'info' | 'warning' | 'error';

export type PermissionList = 'allow' | 'deny' | 'ask';
export type SettingsFileName = 'settings.json' | 'settings.local.json';

export interface SuggestionAction {
  type: 'remove' | 'add' | 'replace' | 'move';
  file: SettingsFileName;
  list: PermissionList;
  rules: string[];
  /** For 'replace' action: the new rule to use */
  newRule?: string;
  /** For 'move' action: the destination file */
  destFile?: SettingsFileName;
}

export interface Suggestion {
  id: string;
  severity: SuggestionSeverity;
  title: string;
  description: string;
  affectedItems?: string[];
  action?: SuggestionAction;
}

export interface AnalysisResult {
  settingsFile: SettingsFile;
  localSettingsFile: SettingsFile;
  suggestions: Suggestion[];
}
