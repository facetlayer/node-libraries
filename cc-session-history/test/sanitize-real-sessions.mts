#!/usr/bin/env node
/**
 * One-off script that takes real Claude Code session files and produces
 * anonymized fixtures suitable for committing to the repo.
 *
 * Strategy:
 *   - Replace every `cwd` with a generic test path derived from the chosen
 *     fixture project name.
 *   - Replace `gitBranch` with `main`.
 *   - Replace any user-typed message text with a placeholder.
 *   - Replace any assistant text and thinking with a placeholder.
 *   - Replace `signature` (LLM thinking signature blobs) with a placeholder.
 *   - Replace any tool_result string content with `[tool result]`.
 *   - Walk every string field and strip references to the user's home dir.
 *   - Drop message types not modelled by the project's Zod schema, so
 *     `check-schema` reports zero errors against the fixtures.
 *
 * UUIDs, sessionIds, requestIds, model names, usage stats, tool names,
 * timestamps, and version strings are preserved as-is — they are not PII
 * and the fixtures need them to test schema/parsing.
 *
 * Usage:
 *   node test/sanitize-real-sessions.mts <input.jsonl>:<fixture-project> [...]
 *
 * Each positional argument is a `<source-path>:<fixture-project-dir>` pair.
 * The source path can be absolute or relative to the current working
 * directory. The fixture project dir must use Claude's hyphen-separated
 * format (e.g. `-Users-test-project-app`) and is mapped to a synthetic
 * `cwd` like `/Users/test/project/app`.
 *
 * Example:
 *   node test/sanitize-real-sessions.mts \
 *     ~/.claude/projects/-Users-foo-bar/abc.jsonl:-Users-test-project-tools \
 *     ~/.claude/projects/-Users-foo-baz/def.jsonl:-Users-test-project-app
 *
 * Outputs go to test/fixtures/cli-claude/projects/<fixture-project>/<basename>.
 * Existing files at the output path are overwritten; other files in the
 * fixture directory are left untouched.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

interface SessionTask {
  sourcePath: string;
  fixtureProjectDir: string;
}

const homeDir = os.homedir();
const fixtureDir = path.join(import.meta.dirname, 'fixtures', 'cli-claude');

function parseArgs(argv: string[]): SessionTask[] {
  if (argv.length === 0) {
    printUsageAndExit();
  }

  const tasks: SessionTask[] = [];
  for (const arg of argv) {
    const splitIdx = arg.lastIndexOf(':');
    if (splitIdx === -1) {
      console.error(`Invalid argument (missing ':<fixture-project>'): ${arg}`);
      printUsageAndExit();
    }
    const sourcePath = arg.slice(0, splitIdx);
    const fixtureProjectDir = arg.slice(splitIdx + 1);
    if (!sourcePath || !fixtureProjectDir) {
      console.error(`Invalid argument (empty source or project): ${arg}`);
      printUsageAndExit();
    }
    if (!fixtureProjectDir.startsWith('-')) {
      console.error(
        `Fixture project dir should start with '-' (Claude Code naming convention): ${fixtureProjectDir}`
      );
      process.exit(1);
    }
    tasks.push({ sourcePath: path.resolve(sourcePath), fixtureProjectDir });
  }
  return tasks;
}

function printUsageAndExit(): never {
  console.error(
    'Usage: sanitize-real-sessions.mts <session.jsonl>:<fixture-project> [...]\n' +
      "Example: sanitize-real-sessions.mts /path/to/abc.jsonl:-Users-test-project-app"
  );
  process.exit(1);
}

function projectDirToCwd(fixtureProjectDir: string): string {
  // -Users-test-project-app -> /Users/test/project/app
  return '/' + fixtureProjectDir.slice(1).replace(/-/g, '/');
}

function sanitizeString(s: string): string {
  // Strip home dir references.
  return s.split(homeDir).join('/Users/test');
}

function sanitizeValue(value: any, fixtureCwd: string): any {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return sanitizeString(value);
  if (typeof value !== 'object') return value;

  if (Array.isArray(value)) {
    return value.map(v => sanitizeValue(v, fixtureCwd));
  }

  const out: Record<string, any> = {};
  for (const [key, raw] of Object.entries(value)) {
    if (key === 'cwd') {
      out[key] = fixtureCwd;
      continue;
    }
    if (key === 'gitBranch') {
      out[key] = 'main';
      continue;
    }
    if (key === 'signature') {
      out[key] = '[redacted-signature]';
      continue;
    }
    if (key === 'thinking' && typeof raw === 'string') {
      out[key] = raw === '' ? '' : '[redacted thinking]';
      continue;
    }
    // Top-level user message content
    if (key === 'message' && raw && typeof raw === 'object' && 'role' in (raw as any)) {
      out[key] = sanitizeMessage(raw as any, fixtureCwd);
      continue;
    }
    // Hook attachment command
    if (key === 'command' && typeof raw === 'string') {
      out[key] = '[redacted-command]';
      continue;
    }
    if (key === 'lastPrompt' && typeof raw === 'string') {
      out[key] = '[user message]';
      continue;
    }
    if (key === 'stdout' && typeof raw === 'string') {
      out[key] = raw === '' ? '' : '[redacted stdout]';
      continue;
    }
    if (key === 'stderr' && typeof raw === 'string') {
      out[key] = raw === '' ? '' : '[redacted stderr]';
      continue;
    }
    out[key] = sanitizeValue(raw, fixtureCwd);
  }
  return out;
}

function sanitizeMessage(message: any, fixtureCwd: string): any {
  const out: Record<string, any> = { ...message };
  const role = message.role;
  const content = message.content;

  if (typeof content === 'string') {
    // Preserve special command-shaped content so the parser still classifies them
    if (
      content.includes('<command-name>') ||
      content.includes('<local-command-') ||
      content.startsWith('PreToolUse:') ||
      content.startsWith('PostToolUse:')
    ) {
      out.content = content;
    } else {
      out.content = role === 'assistant' ? '[assistant text]' : '[user message]';
    }
  } else if (Array.isArray(content)) {
    out.content = content.map(block => sanitizeContentBlock(block, fixtureCwd));
  }

  // Preserve other top-level message fields (id, model, type, role, usage, stop_reason, etc.)
  for (const key of Object.keys(out)) {
    if (key !== 'content' && key !== 'role' && key !== 'id' && key !== 'model' && key !== 'type' && key !== 'usage' && key !== 'stop_reason' && key !== 'stop_sequence' && key !== 'stop_details') {
      out[key] = sanitizeValue(out[key], fixtureCwd);
    }
  }
  return out;
}

function sanitizeContentBlock(block: any, fixtureCwd: string): any {
  if (!block || typeof block !== 'object') return block;
  if (block.type === 'text') {
    return { ...block, text: '[assistant text]' };
  }
  if (block.type === 'thinking') {
    return { ...block, thinking: block.thinking === '' ? '' : '[redacted thinking]', signature: '[redacted-signature]' };
  }
  if (block.type === 'tool_use') {
    return {
      ...block,
      input: sanitizeToolInput(block.input, fixtureCwd),
    };
  }
  if (block.type === 'tool_result') {
    const sanitized = { ...block };
    if (typeof sanitized.content === 'string') {
      sanitized.content = '[tool result]';
    } else if (Array.isArray(sanitized.content)) {
      sanitized.content = sanitized.content.map((b: any) => {
        if (b && typeof b === 'object' && b.type === 'text') {
          return { ...b, text: '[tool result]' };
        }
        return sanitizeValue(b, fixtureCwd);
      });
    }
    return sanitized;
  }
  return sanitizeValue(block, fixtureCwd);
}

function sanitizeToolInput(input: any, fixtureCwd: string): any {
  if (!input || typeof input !== 'object') return input;
  const out: Record<string, any> = {};
  for (const [key, value] of Object.entries(input)) {
    if (typeof value === 'string') {
      // Common tool input fields that could contain PII.
      if (key === 'command' || key === 'description' || key === 'prompt' || key === 'pattern') {
        out[key] = `[redacted ${key}]`;
      } else if (key === 'file_path' || key === 'path') {
        out[key] = `${fixtureCwd}/redacted.txt`;
      } else if (key === 'old_string' || key === 'new_string' || key === 'content') {
        out[key] = `[redacted ${key}]`;
      } else {
        out[key] = sanitizeString(value);
      }
    } else {
      out[key] = sanitizeValue(value, fixtureCwd);
    }
  }
  return out;
}

// Drop message types that the project's Zod schema does not currently model.
// Keeping them would make `check-schema` always fail on the fixtures.
const supportedTypes = new Set([
  'user',
  'assistant',
  'system',
  'file-history-snapshot',
  'summary',
  'queue-operation',
  'progress',
]);

async function processSession(task: SessionTask): Promise<void> {
  const content = await fs.readFile(task.sourcePath, 'utf-8');
  const lines = content.split('\n').filter(l => l.trim() !== '');

  const fixtureCwd = projectDirToCwd(task.fixtureProjectDir);

  const sanitizedLines: string[] = [];
  for (const line of lines) {
    const obj = JSON.parse(line);
    if (typeof obj.type === 'string' && !supportedTypes.has(obj.type)) {
      continue;
    }
    sanitizedLines.push(JSON.stringify(sanitizeValue(obj, fixtureCwd)));
  }

  const outDir = path.join(fixtureDir, 'projects', task.fixtureProjectDir);
  await fs.mkdir(outDir, { recursive: true });

  const outPath = path.join(outDir, path.basename(task.sourcePath));
  await fs.writeFile(outPath, sanitizedLines.join('\n') + '\n');

  console.log(`Wrote ${sanitizedLines.length} lines to ${path.relative(process.cwd(), outPath)}`);
}

async function main(): Promise<void> {
  const tasks = parseArgs(process.argv.slice(2));
  for (const task of tasks) {
    await processSession(task);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
