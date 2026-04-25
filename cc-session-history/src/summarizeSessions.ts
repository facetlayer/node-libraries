import * as path from 'path';
import * as fs from 'fs/promises';
import type { ChatMessage } from './types.ts';
import { annotateMessages } from './annotateMessages.ts';
import { listChatSessions } from './listChatSessions.ts';
import { pathToProjectDir } from './printChatSessions.ts';
import { getClaudeProjectsDir } from './paths.ts';

export interface SummarizeOptions {
  project?: string;
  session?: string;
  claudeDir?: string;
  limit?: number;
  maxPromptChars?: number;
  maxAssistantChars?: number;
  includeAssistantText?: boolean;
  verbose?: boolean;
}

interface SessionSummary {
  project: string;
  sessionId: string;
  firstTimestamp?: string;
  lastTimestamp?: string;
  messageCount: number;
  userPrompts: string[];
  interruptCount: number;
  assistantSnippets: string[];
  toolCounts: Record<string, number>;
  toolErrors: number;
  permissionRejections: Array<{ tool?: string; reason?: string }>;
  bashCommands: string[];
  filesEdited: string[];
  filesRead: string[];
}

function oneLine(s: string, max: number): string {
  const collapsed = s.replace(/\s+/g, ' ').trim();
  if (collapsed.length <= max) return collapsed;
  return collapsed.slice(0, max - 1) + '…';
}

function isUserTypedPrompt(msg: ChatMessage): boolean {
  if (msg.type !== 'user') return false;
  if (msg.isMeta) return false;
  if (msg.internalMessageType) return false;
  const content = msg.message?.content;
  if (!content) return false;
  if (typeof content === 'string') {
    // Skip command/tool-result/caveat wrappers and system-injected notifications
    if (content.startsWith('<local-command') || content.includes('<command-name>')) return false;
    if (content.startsWith('Caveat:')) return false;
    if (content.includes('<task-notification>')) return false;
    if (content.includes('[Request interrupted by user')) return false;
    return content.trim().length > 0;
  }
  if (Array.isArray(content)) {
    const textBlocks = content.filter((b: any) => b.type === 'text' && b.text && b.text.trim().length > 0);
    if (textBlocks.length === 0) return false;
    const joined = textBlocks.map((b: any) => b.text).join('\n');
    if (joined.includes('[Request interrupted by user')) return false;
    if (joined.includes('<task-notification>')) return false;
    if (joined.startsWith('Caveat:')) return false;
    return true;
  }
  return false;
}

function extractUserText(msg: ChatMessage): string {
  const content = msg.message?.content;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .filter((b: any) => b.type === 'text' && b.text)
      .map((b: any) => b.text)
      .join('\n');
  }
  return '';
}

function extractAssistantText(msg: ChatMessage): string {
  const content = msg.message?.content;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .filter((b: any) => b.type === 'text' && b.text)
      .map((b: any) => b.text)
      .join('\n');
  }
  return '';
}

export function summarizeSession(
  project: string,
  messages: ChatMessage[],
  opts: SummarizeOptions = {}
): SessionSummary {
  const maxPrompt = opts.maxPromptChars ?? 200;
  const maxAssistant = opts.maxAssistantChars ?? 160;

  annotateMessages(messages);

  const summary: SessionSummary = {
    project,
    sessionId: messages.find(m => m.sessionId)?.sessionId ?? '',
    firstTimestamp: messages.find(m => m.timestamp && !isNaN(Date.parse(m.timestamp)))?.timestamp,
    lastTimestamp: [...messages].reverse().find(m => m.timestamp && !isNaN(Date.parse(m.timestamp)))?.timestamp,
    messageCount: messages.length,
    userPrompts: [],
    interruptCount: 0,
    assistantSnippets: [],
    toolCounts: {},
    toolErrors: 0,
    permissionRejections: [],
    bashCommands: [],
    filesEdited: [],
    filesRead: [],
  };

  for (const msg of messages) {
    if (msg.permissionResult === 'rejected') {
      const content = msg.message?.content;
      let tool: string | undefined;
      if (Array.isArray(content)) {
        for (const b of content as any[]) {
          if (b.type === 'tool_use') tool = b.name;
        }
      }
      summary.permissionRejections.push({ tool });
    }

    if (msg.type === 'user' && !msg.isMeta && !msg.internalMessageType) {
      const raw = extractUserText(msg);
      if (raw.includes('[Request interrupted by user')) {
        summary.interruptCount++;
      }
    }

    if (isUserTypedPrompt(msg)) {
      const text = extractUserText(msg);
      if (text.trim()) summary.userPrompts.push(oneLine(text, maxPrompt));
    }

    if (msg.type === 'assistant' && opts.includeAssistantText) {
      const text = extractAssistantText(msg);
      if (text.trim()) {
        summary.assistantSnippets.push(oneLine(text, maxAssistant));
      }
    }

    const content = msg.message?.content;
    if (Array.isArray(content)) {
      for (const block of content as any[]) {
        if (block.type === 'tool_use') {
          const name = block.name || 'unknown';
          summary.toolCounts[name] = (summary.toolCounts[name] ?? 0) + 1;
          if (name === 'Bash' && block.input?.command) {
            summary.bashCommands.push(oneLine(String(block.input.command), 120));
          } else if ((name === 'Edit' || name === 'Write') && block.input?.file_path) {
            summary.filesEdited.push(String(block.input.file_path));
          } else if (name === 'Read' && block.input?.file_path) {
            summary.filesRead.push(String(block.input.file_path));
          }
        } else if (block.type === 'tool_result' && block.is_error) {
          summary.toolErrors++;
        }
      }
    }
  }

  return summary;
}

export function formatSummary(s: SessionSummary, opts: SummarizeOptions = {}): string {
  const lines: string[] = [];
  lines.push(`## Session ${s.sessionId.slice(0, 8)} (${s.project})`);
  lines.push(`  messages=${s.messageCount}  first=${s.firstTimestamp ?? '?'}  last=${s.lastTimestamp ?? '?'}`);
  const toolPairs = Object.entries(s.toolCounts).sort((a, b) => b[1] - a[1]);
  if (toolPairs.length) {
    lines.push(`  tools: ${toolPairs.map(([k, v]) => `${k}=${v}`).join(' ')}`);
  }
  if (s.toolErrors) lines.push(`  toolErrors: ${s.toolErrors}`);
  if (s.interruptCount) lines.push(`  userInterrupts: ${s.interruptCount}`);
  if (s.permissionRejections.length) {
    const byTool: Record<string, number> = {};
    for (const r of s.permissionRejections) byTool[r.tool ?? 'unknown'] = (byTool[r.tool ?? 'unknown'] ?? 0) + 1;
    lines.push(`  permissionRejections: ${Object.entries(byTool).map(([k, v]) => `${k}=${v}`).join(' ')}`);
  }
  if (s.userPrompts.length) {
    lines.push(`  userPrompts (${s.userPrompts.length}):`);
    for (const p of s.userPrompts) lines.push(`    - ${p}`);
  }
  if (opts.includeAssistantText && s.assistantSnippets.length) {
    lines.push(`  assistantSnippets (${s.assistantSnippets.length}):`);
    for (const p of s.assistantSnippets.slice(0, 8)) lines.push(`    - ${p}`);
  }
  if (s.bashCommands.length && opts.verbose) {
    lines.push(`  bash (${s.bashCommands.length}):`);
    for (const c of s.bashCommands.slice(0, 15)) lines.push(`    $ ${c}`);
  }
  return lines.join('\n');
}

export async function runSummarize(opts: SummarizeOptions): Promise<void> {
  const projectsDir = getClaudeProjectsDir(opts.claudeDir);

  let project = opts.project;
  if (!project) project = pathToProjectDir(process.cwd());
  else if (project.startsWith('/')) project = pathToProjectDir(project);

  if (opts.session) {
    const filePath = path.join(projectsDir, project, `${opts.session}.jsonl`);
    const content = await fs.readFile(filePath, 'utf-8');
    const messages: ChatMessage[] = content.trim().split('\n').filter(Boolean).map(l => JSON.parse(l));
    const summary = summarizeSession(project, messages, opts);
    console.log(formatSummary(summary, opts));
    return;
  }

  const sessions = await listChatSessions({ project, claudeDir: opts.claudeDir });
  const limited = opts.limit ? sessions.slice(0, opts.limit) : sessions;

  for (const session of limited) {
    // listChatSessions already loads messages into session.messages
    const summary = summarizeSession(project, session.messages, opts);
    console.log(formatSummary(summary, opts));
    console.log('');
  }
}
