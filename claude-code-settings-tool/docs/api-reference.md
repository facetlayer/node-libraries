---
name: api-reference
description: API reference for the settings helper functions
---

# API Reference

## Types

### `ClaudeSettings`

```typescript
interface ClaudeSettings {
  permissions?: ClaudeSettingsPermissions;
}
```

### `ClaudeSettingsPermissions`

```typescript
interface ClaudeSettingsPermissions {
  allow?: string[];
  deny?: string[];
  ask?: string[];
}
```

### `SettingsFile`

```typescript
interface SettingsFile {
  path: string;
  exists: boolean;
  content: ClaudeSettings | null;
  parseError?: string;
}
```

### `AllowRule`

```typescript
interface AllowRule {
  rule: string;
  source: 'settings.json' | 'settings.local.json';
}
```

## Functions

### `loadSettingsFile(projectPath, filename)`

Load a single settings file.

- `projectPath: string` - Path to the project root
- `filename: SettingsFileName` - Either `'settings.json'` or `'settings.local.json'`
- Returns: `SettingsFile`

### `loadSettings(projectPath)`

Load both settings files.

- `projectPath: string` - Path to the project root
- Returns: `{ settingsFile: SettingsFile, localSettingsFile: SettingsFile }`

### `listAllowRules(projectPath)`

Get all allow rules from both settings files with source information.

- `projectPath: string` - Path to the project root
- Returns: `AllowRule[]`

### `hasAllowRule(projectPath, rule)`

Check if a specific allow rule exists in any settings file.

- `projectPath: string` - Path to the project root
- `rule: string` - The rule string to check
- Returns: `boolean`

### `addAllowRule(projectPath, rule, targetFile?)`

Add an allow rule if it doesn't already exist.

- `projectPath: string` - Path to the project root
- `rule: string` - The rule string to add
- `targetFile: SettingsFileName` - Target file (default: `'settings.json'`)
- Returns: `boolean` - `true` if added, `false` if already existed
