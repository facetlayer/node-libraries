export { analyzeSettingsWithLLM, loadSettings, loadSettingsFile, getAnthropicClient, applySuggestion } from './analyzer/index.ts';
export type {
  ClaudeSettings,
  ClaudeSettingsPermissions,
  SettingsFile,
  Suggestion,
  SuggestionSeverity,
  SuggestionAction,
  PermissionList,
  SettingsFileName,
  AnalysisResult,
} from './types.ts';
