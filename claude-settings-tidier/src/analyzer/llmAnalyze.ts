import Anthropic from '@anthropic-ai/sdk';
import type { AnalysisResult, Suggestion, SettingsFile } from '../types.ts';
import { loadSettings } from './loadSettings.ts';
import { getAnthropicClient } from './claudeAuth.ts';

const SYSTEM_PROMPT = `You are an expert at analyzing Claude Code settings files. These files control what permissions Claude Code has when running in a project directory.

The settings files are:
- .claude/settings.json - Shared settings that can be committed to version control
- .claude/settings.local.json - Local settings that are gitignored and override the shared settings

Each file can have a "permissions" object with these arrays:
- "allow": Permissions that are automatically granted
- "deny": Permissions that are automatically denied
- "ask": Permissions that will prompt the user each time

Permission patterns look like:
- "Bash(npm run build)" - specific command
- "Bash(npm:*)" - any npm subcommand
- "Bash(*)" - any bash command (very broad!)
- "mcp__servername__toolname" - MCP tool access
- "Read", "Write", "Edit" - file operations

Your job is to analyze these settings and provide suggestions for improvement.`;

const USER_PROMPT_TEMPLATE = `Analyze the following Claude Code settings files and provide suggestions.

## settings.json (shared, committed to repo):
\`\`\`json
{{SETTINGS_JSON}}
\`\`\`

## settings.local.json (local only, gitignored):
\`\`\`json
{{LOCAL_SETTINGS_JSON}}
\`\`\`

Please analyze these settings and identify issues in these categories:

## 1. Commands that should probably be allowed

Build, test, and lint commands are generally safe and useful to allow. Skills and MCP tools that are not destructive are also good candidates.

Examples of safe commands to allow:
- "Bash(npm run build:*)" - build commands
- "Bash(npm run test:*)" - test commands
- "Bash(pnpm test:*)" - test commands
- "Bash(git status)" - read-only git commands
- "mcp__candle__StartService" - non-destructive MCP tools
- "mcp__candle__GetLogs" - read-only MCP tools
- "Skill(vibe-code-cleanup)" - skills

If useful commands like these are missing or are in the "ask" list when they could be in "allow", suggest adding/promoting them.

## 2. Overlapping rules that should be consolidated

When multiple rules overlap, suggest keeping only the most generic one.

Example of overlapping rules:
- "Bash(sips -g pixelWidth -g pixelHeight:*)" and "Bash(sips:*)" - the second one covers the first
- "Bash(npm run build)" and "Bash(npm run:*)" - the wildcard covers the specific one
- "Bash(git status)" and "Bash(git:*)" - the wildcard covers the specific one

Suggest removing the more specific rules and keeping the generic wildcard version.

## 3. Dangerous rules that should be removed

Some commands are dangerous and should probably be removed or at least moved to "ask":

Examples of dangerous commands:
- "Bash(rm -rf:*)" - destructive file deletion
- "Bash(rm:*)" - file deletion
- "Bash(*)" - allows any command (way too broad)
- "Bash(sudo:*)" - elevated privileges
- "Bash(chmod:*)" - permission changes
- Any command that could delete data, modify system settings, or access sensitive information

## 4. Rules to promote from local to shared

Rules in settings.local.json that would benefit the whole team should be moved to settings.json so they can be committed to version control.

Good candidates for promotion:
- Build and test commands specific to the project
- Project-specific MCP tools
- Common development tools (npm, pnpm, yarn, git read operations)

Respond with a JSON array of suggestions. Each suggestion MUST have:
- "severity": "info" | "warning" | "error"
- "title": A short title for the suggestion
- "description": A detailed explanation
- "affectedItems": Array of the specific permission strings affected
- "action": An object describing how to fix this issue (required for actionable suggestions)

The "action" object should have:
- "type": "remove" | "add" | "replace" | "move"
- "file": "settings.json" | "settings.local.json" - which file to modify
- "list": "allow" | "deny" | "ask" - which permission list
- "rules": Array of rule strings to act on
- "newRule": (for "replace" only) The new rule to replace with
- "destFile": (for "move" only) The destination file

Example response format:
\`\`\`json
[
  {
    "severity": "info",
    "title": "Consolidate npm run commands",
    "description": "You have 5 separate 'npm run' commands that could be consolidated into a single wildcard pattern.",
    "affectedItems": ["Bash(npm run build)", "Bash(npm run test)", "Bash(npm run lint)"],
    "action": {
      "type": "replace",
      "file": "settings.json",
      "list": "allow",
      "rules": ["Bash(npm run build)", "Bash(npm run test)", "Bash(npm run lint)"],
      "newRule": "Bash(npm run:*)"
    }
  },
  {
    "severity": "warning",
    "title": "Overlapping rules - remove redundant specific rule",
    "description": "The rule 'Bash(sips:*)' already covers 'Bash(sips -g pixelWidth -g pixelHeight:*)'.",
    "affectedItems": ["Bash(sips -g pixelWidth -g pixelHeight:*)"],
    "action": {
      "type": "remove",
      "file": "settings.json",
      "list": "allow",
      "rules": ["Bash(sips -g pixelWidth -g pixelHeight:*)"]
    }
  },
  {
    "severity": "error",
    "title": "Dangerous command allowed",
    "description": "The rule 'Bash(rm -rf:*)' allows recursive forced deletion which could accidentally delete important files.",
    "affectedItems": ["Bash(rm -rf:*)"],
    "action": {
      "type": "remove",
      "file": "settings.json",
      "list": "allow",
      "rules": ["Bash(rm -rf:*)"]
    }
  },
  {
    "severity": "info",
    "title": "Promote build command to shared settings",
    "description": "This build command would benefit the whole team.",
    "affectedItems": ["Bash(pnpm run build)"],
    "action": {
      "type": "move",
      "file": "settings.local.json",
      "list": "allow",
      "rules": ["Bash(pnpm run build)"],
      "destFile": "settings.json"
    }
  }
]
\`\`\`

Only include suggestions if there are actual issues. If the settings look good, return an empty array [].
Respond ONLY with the JSON array, no other text.`;

export interface LLMSuggestionAction {
  type: 'remove' | 'add' | 'replace' | 'move';
  file: 'settings.json' | 'settings.local.json';
  list: 'allow' | 'deny' | 'ask';
  rules: string[];
  newRule?: string;
  destFile?: 'settings.json' | 'settings.local.json';
}

export interface LLMSuggestion {
  severity: 'info' | 'warning' | 'error';
  title: string;
  description: string;
  affectedItems?: string[];
  action?: LLMSuggestionAction;
}

export function formatSettingsForPrompt(file: SettingsFile): string {
  if (!file.exists) {
    return '(file does not exist)';
  }
  if (file.parseError) {
    return `(parse error: ${file.parseError})`;
  }
  if (!file.content) {
    return '{}';
  }
  return JSON.stringify(file.content, null, 2);
}

export function parseLLMResponse(responseText: string): LLMSuggestion[] {
  // Try to extract JSON from the response
  let jsonText = responseText.trim();

  // If wrapped in markdown code blocks, extract the JSON
  const codeBlockMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    jsonText = codeBlockMatch[1].trim();
  }

  try {
    const parsed = JSON.parse(jsonText);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed as LLMSuggestion[];
  } catch {
    console.error('Failed to parse LLM response as JSON:', responseText);
    return [];
  }
}

export async function analyzeSettingsWithLLM(projectPath: string): Promise<AnalysisResult> {
  const { settingsFile, localSettingsFile } = loadSettings(projectPath);

  // If neither file exists, return early
  if (!settingsFile.exists && !localSettingsFile.exists) {
    return {
      settingsFile,
      localSettingsFile,
      suggestions: [
        {
          id: 'no-settings-found',
          severity: 'info',
          title: 'No Claude settings files found',
          description: `No .claude/settings.json or .claude/settings.local.json files found in this project.`,
        },
      ],
    };
  }

  // Check for parse errors
  const suggestions: Suggestion[] = [];
  if (settingsFile.parseError) {
    suggestions.push({
      id: 'settings-parse-error',
      severity: 'error',
      title: 'Failed to parse settings.json',
      description: settingsFile.parseError,
    });
  }
  if (localSettingsFile.parseError) {
    suggestions.push({
      id: 'local-settings-parse-error',
      severity: 'error',
      title: 'Failed to parse settings.local.json',
      description: localSettingsFile.parseError,
    });
  }

  // If both files have parse errors, return early
  if (settingsFile.parseError && localSettingsFile.parseError) {
    return { settingsFile, localSettingsFile, suggestions };
  }

  // Build the prompt
  const userPrompt = USER_PROMPT_TEMPLATE
    .replace('{{SETTINGS_JSON}}', formatSettingsForPrompt(settingsFile))
    .replace('{{LOCAL_SETTINGS_JSON}}', formatSettingsForPrompt(localSettingsFile));

  // Call the LLM
  const client = getAnthropicClient();

  const message = await client.messages.create({
    model: 'claude-3-5-haiku-20241022',
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  });

  // Extract text from response
  const responseText = message.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('');

  // Parse the response
  const llmSuggestions = parseLLMResponse(responseText);

  // Convert to our Suggestion format
  for (const llmSuggestion of llmSuggestions) {
    const suggestion: Suggestion = {
      id: `llm-${suggestions.length}`,
      severity: llmSuggestion.severity,
      title: llmSuggestion.title,
      description: llmSuggestion.description,
      affectedItems: llmSuggestion.affectedItems,
    };

    // Add action if present and valid
    if (llmSuggestion.action) {
      suggestion.action = {
        type: llmSuggestion.action.type,
        file: llmSuggestion.action.file,
        list: llmSuggestion.action.list,
        rules: llmSuggestion.action.rules,
        newRule: llmSuggestion.action.newRule,
        destFile: llmSuggestion.action.destFile,
      };
    }

    suggestions.push(suggestion);
  }

  return {
    settingsFile,
    localSettingsFile,
    suggestions,
  };
}
