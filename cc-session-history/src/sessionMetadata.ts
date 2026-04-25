import * as path from 'path';
import type { ChatMessage } from './types.ts';

export type SkillInvocationSource = 'slash-command' | 'skill-tool' | 'scheduled-task';

export interface SkillInvocation {
  /** Skill identifier (basename of the skill directory / SKILL.md parent) */
  name: string;
  source: SkillInvocationSource;
  timestamp?: string;
}

export interface ScheduledTaskInfo {
  /** The `name` attribute on the <scheduled-task> tag */
  name: string;
  /** The `file` attribute on the <scheduled-task> tag (path to SKILL.md) */
  skillFile: string;
  /**
   * Skill identifier derived from the directory containing the SKILL.md file.
   * e.g. /…/scheduled-tasks/example-daily-monitor/SKILL.md -> "example-daily-monitor"
   */
  skillName: string;
}

export interface SessionMetadata {
  entrypoint?: string;
  scheduledTask?: ScheduledTaskInfo;
  /** Distinct skill names invoked anywhere in the session (any source). */
  skillsUsed: string[];
  /** Each individual invocation, in source order. */
  skillInvocations: SkillInvocation[];
}

const SCHEDULED_TASK_RE = /<scheduled-task\s+name="([^"\n]+)"\s+file="([^"\n]+SKILL\.md)"/i;
const SLASH_COMMAND_RE = /<command-name>\s*\/([A-Za-z0-9_:.\-]+)\s*<\/command-name>/g;

function getMessageTextContent(message: ChatMessage): string {
  const parts: string[] = [];
  if (typeof message.content === 'string') parts.push(message.content);

  const inner = message.message?.content;
  if (typeof inner === 'string') {
    parts.push(inner);
  } else if (Array.isArray(inner)) {
    for (const block of inner) {
      if (block.type === 'text' && block.text) parts.push(block.text);
    }
  }
  return parts.join('\n');
}

/**
 * Extract the skill basename from a SKILL.md file path.
 * e.g. /Users/example/.claude/scheduled-tasks/example-daily-monitor/SKILL.md -> "example-daily-monitor"
 * Returns null when the path does not look like a SKILL.md file.
 */
export function skillNameFromSkillFile(filePath: string): string | null {
  if (!filePath) return null;
  const base = path.basename(filePath);
  if (base.toUpperCase() !== 'SKILL.MD') return null;
  const dir = path.dirname(filePath);
  const name = path.basename(dir);
  return name || null;
}

function parseScheduledTask(text: string): ScheduledTaskInfo | null {
  const match = text.match(SCHEDULED_TASK_RE);
  if (!match) return null;
  const [, name, skillFile] = match;
  const skillName = skillNameFromSkillFile(skillFile) ?? name;
  return { name, skillFile, skillName };
}

/**
 * Extract metadata from a list of session messages.
 * Pure function — does not mutate `messages`.
 */
export function extractSessionMetadata(messages: ChatMessage[]): SessionMetadata {
  const result: SessionMetadata = {
    skillsUsed: [],
    skillInvocations: [],
  };

  // Find first message that has an entrypoint field.
  for (const msg of messages) {
    const ep = (msg as any).entrypoint;
    if (typeof ep === 'string' && ep.length > 0) {
      result.entrypoint = ep;
      break;
    }
  }

  // Genuine routine sessions always begin with a `<scheduled-task>` tag in the
  // first user message. Restrict detection to that position so we don't match
  // documentation or conversations that merely mention the tag.
  const firstUser = messages.find(m => m.type === 'user');
  if (firstUser) {
    const text = getMessageTextContent(firstUser);
    if (text.startsWith('<scheduled-task')) {
      const parsed = parseScheduledTask(text);
      if (parsed) {
        result.scheduledTask = parsed;
        result.skillInvocations.push({
          name: parsed.skillName,
          source: 'scheduled-task',
          timestamp: firstUser.timestamp,
        });
      }
    }
  }

  for (const msg of messages) {
    const text = getMessageTextContent(msg);

    if (text.includes('<command-name>')) {
      SLASH_COMMAND_RE.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = SLASH_COMMAND_RE.exec(text)) !== null) {
        const name = m[1];
        // Filter out built-in slash commands (e.g. /clear, /help) that aren't skills.
        if (BUILTIN_SLASH_COMMANDS.has(name)) continue;
        result.skillInvocations.push({
          name,
          source: 'slash-command',
          timestamp: msg.timestamp,
        });
      }
    }

    const inner = msg.message?.content;
    if (Array.isArray(inner)) {
      for (const block of inner) {
        if (block.type === 'tool_use' && block.name === 'Skill') {
          const skillArg =
            (block.input && typeof block.input === 'object' && (block.input as any).skill) || undefined;
          if (typeof skillArg === 'string' && skillArg.length > 0) {
            result.skillInvocations.push({
              name: skillArg,
              source: 'skill-tool',
              timestamp: msg.timestamp,
            });
          }
        }
      }
    }
  }

  // Distinct list, preserving first-seen order.
  const seen = new Set<string>();
  for (const inv of result.skillInvocations) {
    if (!seen.has(inv.name)) {
      seen.add(inv.name);
      result.skillsUsed.push(inv.name);
    }
  }

  return result;
}

/**
 * Built-in CLI slash commands that should not be treated as skill invocations.
 * The list is intentionally narrow; anything not in here is treated as a skill so
 * that user-defined commands still show up.
 */
const BUILTIN_SLASH_COMMANDS = new Set([
  'clear',
  'compact',
  'cost',
  'help',
  'exit',
  'quit',
  'resume',
  'config',
  'login',
  'logout',
  'model',
  'status',
  'doctor',
  'bug',
  'mcp',
  'ide',
  'agents',
  'add-dir',
  'vim',
  'terminal-setup',
  'editor',
  'export',
  'memory',
  'permissions',
  'pr-comments',
  'install-github-app',
  'release-notes',
  'hooks',
  'fast',
]);
