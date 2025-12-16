import { startClaudeSession } from '@facetlayer/claude-code-headless';
import { readFileSync, unlinkSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import type { AnalysisResult, Suggestion, SettingsFile } from '../types.ts';
import { loadSettings } from './loadSettings.ts';
import { formatSettingsForPrompt, parseLLMResponse, type LLMSuggestion } from './llmAnalyze.ts';

const HEADLESS_PROMPT_TEMPLATE = `You are an expert at analyzing Claude Code settings files. These files control what permissions Claude Code has when running in a project directory.

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

Analyze the following Claude Code settings files:

## settings.json (shared, committed to repo):
\`\`\`json
{{SETTINGS_JSON}}
\`\`\`

## settings.local.json (local only, gitignored):
\`\`\`json
{{LOCAL_SETTINGS_JSON}}
\`\`\`

Analyze these settings and identify issues in these categories:

1. Commands that should probably be allowed (build, test, lint commands)
2. Overlapping rules that should be consolidated (keep only the most generic one)
3. Dangerous rules that should be removed (rm -rf, sudo, etc.)
4. Rules to promote from local to shared

Create a JSON array of suggestions. Each suggestion should have:
- "severity": "info" | "warning" | "error"
- "title": A short title
- "description": A detailed explanation
- "affectedItems": Array of affected permission strings
- "action": { "type": "remove"|"add"|"replace"|"move", "file": "settings.json"|"settings.local.json", "list": "allow"|"deny"|"ask", "rules": [...], "newRule"?: string, "destFile"?: string }

If no issues found, use an empty array [].

IMPORTANT: Write the JSON array to this file: {{OUTPUT_FILE}}

Do not include any other text in the file, just the JSON array.`;

export async function analyzeSettingsWithHeadless(projectPath: string): Promise<AnalysisResult> {
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

  // Create temp file for output
  const outputFile = join(tmpdir(), `claude-settings-suggestions-${Date.now()}.json`);

  // Build the prompt
  const prompt = HEADLESS_PROMPT_TEMPLATE
    .replace('{{SETTINGS_JSON}}', formatSettingsForPrompt(settingsFile))
    .replace('{{LOCAL_SETTINGS_JSON}}', formatSettingsForPrompt(localSettingsFile))
    .replace('{{OUTPUT_FILE}}', outputFile);

  // Run Claude in headless mode
  const result = await runClaudeHeadless(prompt, projectPath);

  // Read and parse the output file
  let llmSuggestions: LLMSuggestion[] = [];
  if (existsSync(outputFile)) {
    try {
      const content = readFileSync(outputFile, 'utf-8');
      llmSuggestions = parseLLMResponse(content);
    } catch (err) {
      console.error('Failed to read suggestions file:', err);
    } finally {
      // Clean up temp file
      try {
        unlinkSync(outputFile);
      } catch {
        // Ignore cleanup errors
      }
    }
  } else {
    console.error('Claude did not create the output file. Raw output:', result.rawOutput);
  }

  // Convert to our Suggestion format
  for (const llmSuggestion of llmSuggestions) {
    const suggestion: Suggestion = {
      id: `llm-${suggestions.length}`,
      severity: llmSuggestion.severity,
      title: llmSuggestion.title,
      description: llmSuggestion.description,
      affectedItems: llmSuggestion.affectedItems,
    };

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

interface HeadlessResult {
  exitCode: number;
  rawOutput: string;
}

async function runClaudeHeadless(prompt: string, workingDirectory: string): Promise<HeadlessResult> {
  let rawOutput = '';
  let resolvePromise: (result: HeadlessResult) => void;

  const resultPromise = new Promise<HeadlessResult>((resolve) => {
    resolvePromise = resolve;
  });

  const session = await startClaudeSession(
    {
      workingDirectory,
      verboseLogging: true,
    },
    {
      onRawOutput: (data) => {
        rawOutput += data;
      },
      onToolUse: async (tool) => {
        // Auto-approve write tool for the output file
        if (tool.toolName === 'Write') {
          return 'approve';
        }
        // Reject other tools
        return 'reject';
      },
      onExit: (code) => {
        resolvePromise({ exitCode: code, rawOutput });
      },
      onError: (err) => {
        console.error('Claude session error:', err);
      },
    }
  );

  // Wait for the session to be fully ready, then send our message
  // Use writeRaw to bypass state checks since the parser might not detect ready correctly
  setTimeout(() => {
    // Send the prompt
    session.writeRaw(prompt);
    // Wait for paste to be processed, then send Enter to submit
    setTimeout(() => {
      session.writeRaw('\r');
    }, 500);
  }, 2000);

  // Set a timeout to close the session if it takes too long
  setTimeout(() => {
    console.error('Session timeout, closing...');
    session.close();
  }, 120000); // 2 minute timeout

  return resultPromise;
}
