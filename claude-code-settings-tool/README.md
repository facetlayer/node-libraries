---
name: README
description: Overview of claude-code-settings-tool
---

# @facetlayer/claude-code-settings-tool

Helper functions and CLI for working with Claude Code settings files (`.claude/settings.json` and `.claude/settings.local.json`).

## Installation

```bash
npm install -g @facetlayer/claude-code-settings-tool
```

## CLI Usage

### List allow rules

List all allow rules from both settings files:

```bash
claude-code-settings list-rules
claude-code-settings list-rules /path/to/project
```

### Add allow rules

Add one or more allow rules:

```bash
claude-code-settings allow-rules "Bash(npm test)" "Bash(npm run build)"
```

Add rules to `settings.local.json` instead:

```bash
claude-code-settings allow-rules "Bash(npm test)" --file settings.local.json
```

## Library Usage

```typescript
import {
  loadSettings,
  listAllowRules,
  hasAllowRule,
  addAllowRule,
} from '@facetlayer/claude-code-settings-tool';

// Load both settings files
const { settingsFile, localSettingsFile } = loadSettings('.');

// List all allow rules with their source file
const rules = listAllowRules('.');
for (const { rule, source } of rules) {
  console.log(`${rule} (from ${source})`);
}

// Check if a rule exists
if (!hasAllowRule('.', 'Bash(npm test)')) {
  // Add a rule (returns false if it already exists)
  addAllowRule('.', 'Bash(npm test)');
}
```

## API

### `loadSettings(projectPath: string): LoadSettingsResult`

Loads both `settings.json` and `settings.local.json` from the project's `.claude` directory.

### `listAllowRules(projectPath: string): AllowRule[]`

Returns all allow rules from both settings files. Each rule includes a `source` field indicating which file it came from (`'settings.json'` or `'settings.local.json'`).

### `hasAllowRule(projectPath: string, rule: string): boolean`

Checks if an allow rule exists in any settings file.

### `addAllowRule(projectPath: string, rule: string, targetFile?: SettingsFileName): boolean`

Adds an allow rule to the specified settings file (defaults to `settings.json`). Returns `true` if the rule was added, `false` if it already existed.
