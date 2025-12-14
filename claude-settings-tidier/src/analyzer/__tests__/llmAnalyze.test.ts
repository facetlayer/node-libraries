import { describe, it, expect } from 'vitest';
import { formatSettingsForPrompt, parseLLMResponse } from '../llmAnalyze.ts';
import type { SettingsFile } from '../../types.ts';

describe('formatSettingsForPrompt', () => {
  it('returns message when file does not exist', () => {
    const file: SettingsFile = {
      path: '/test/.claude/settings.json',
      exists: false,
      content: null,
    };

    expect(formatSettingsForPrompt(file)).toBe('(file does not exist)');
  });

  it('returns parse error message when file has parse error', () => {
    const file: SettingsFile = {
      path: '/test/.claude/settings.json',
      exists: true,
      content: null,
      parseError: 'Unexpected token at position 10',
    };

    expect(formatSettingsForPrompt(file)).toBe(
      '(parse error: Unexpected token at position 10)'
    );
  });

  it('returns empty object for null content', () => {
    const file: SettingsFile = {
      path: '/test/.claude/settings.json',
      exists: true,
      content: null,
    };

    expect(formatSettingsForPrompt(file)).toBe('{}');
  });

  it('returns formatted JSON for valid content', () => {
    const file: SettingsFile = {
      path: '/test/.claude/settings.json',
      exists: true,
      content: {
        permissions: {
          allow: ['Bash(npm run build)'],
        },
      },
    };

    const result = formatSettingsForPrompt(file);
    expect(result).toContain('"permissions"');
    expect(result).toContain('"allow"');
    expect(result).toContain('Bash(npm run build)');
  });
});

describe('parseLLMResponse', () => {
  it('parses plain JSON array', () => {
    const response = `[
      {
        "severity": "warning",
        "title": "Test suggestion",
        "description": "Test description"
      }
    ]`;

    const result = parseLLMResponse(response);

    expect(result).toHaveLength(1);
    expect(result[0].severity).toBe('warning');
    expect(result[0].title).toBe('Test suggestion');
  });

  it('parses JSON wrapped in markdown code block', () => {
    const response = `Here are my suggestions:

\`\`\`json
[
  {
    "severity": "info",
    "title": "Consolidate commands",
    "description": "Multiple npm commands could be consolidated",
    "affectedItems": ["Bash(npm run build)", "Bash(npm run test)"]
  }
]
\`\`\``;

    const result = parseLLMResponse(response);

    expect(result).toHaveLength(1);
    expect(result[0].severity).toBe('info');
    expect(result[0].affectedItems).toEqual([
      'Bash(npm run build)',
      'Bash(npm run test)',
    ]);
  });

  it('parses JSON wrapped in plain code block', () => {
    const response = `\`\`\`
[{"severity": "error", "title": "Dangerous", "description": "Bad rule"}]
\`\`\``;

    const result = parseLLMResponse(response);

    expect(result).toHaveLength(1);
    expect(result[0].severity).toBe('error');
  });

  it('returns empty array for empty JSON array', () => {
    const response = '[]';

    const result = parseLLMResponse(response);

    expect(result).toEqual([]);
  });

  it('returns empty array for invalid JSON', () => {
    const response = 'This is not valid JSON';

    const result = parseLLMResponse(response);

    expect(result).toEqual([]);
  });

  it('returns empty array for non-array JSON', () => {
    const response = '{"severity": "info"}';

    const result = parseLLMResponse(response);

    expect(result).toEqual([]);
  });

  it('handles suggestion with action', () => {
    const response = `[
      {
        "severity": "info",
        "title": "Test",
        "description": "Test desc",
        "action": {
          "type": "remove",
          "file": "settings.json",
          "list": "allow",
          "rules": ["Bash(rm:*)"]
        }
      }
    ]`;

    const result = parseLLMResponse(response);

    expect(result[0].action).toBeDefined();
    expect(result[0].action?.type).toBe('remove');
    expect(result[0].action?.rules).toEqual(['Bash(rm:*)']);
  });

  it('handles whitespace around response', () => {
    const response = `

    [{"severity": "info", "title": "Test", "description": "Desc"}]

    `;

    const result = parseLLMResponse(response);

    expect(result).toHaveLength(1);
  });
});
