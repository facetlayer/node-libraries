import * as path from 'path';
import * as fs from 'fs/promises';
import type { ChatMessage } from './types.ts';
import { annotateMessages } from './annotateMessages.ts';
import { listChatSessions } from './listChatSessions.ts';
import { pathToProjectDir } from './printChatSessions.ts';
import { getClaudeProjectsDir } from './paths.ts';
import { filterSessions, type SessionFilterOptions } from './sessionFilters.ts';
import { listAllSessions } from './listAllSessions.ts';
import { computeSessionMetrics, oneLine, isUserTypedPrompt, extractUserText } from './sessionMetrics.ts';

export interface SummarizeOptions extends SessionFilterOptions {
  project?: string;
  allProjects?: boolean;
  session?: string;
  claudeDir?: string;
  limit?: number;
  offset?: number;
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
  /** Skills invoked via the `Skill` tool, by name. (e.g. `{"daily-monitor": 1}`) */
  skillToolInvocations: Record<string, number>;
  toolErrors: number;
  permissionRejections: Array<{ tool?: string; reason?: string }>;
  bashCommands: string[];
  filesEdited: string[];
  filesRead: string[];
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

  // Shared per-session metrics (toolCounts, toolErrors, interruptCount, etc.)
  // are computed centrally in `computeSessionMetrics`. This function only
  // adds the prose-y, summarize-specific fields on top: full prompt list,
  // assistant snippets, bash commands, file lists, per-rejection tool name.
  const metrics = computeSessionMetrics(messages);

  const summary: SessionSummary = {
    project,
    sessionId: messages.find(m => m.sessionId)?.sessionId ?? '',
    firstTimestamp: messages.find(m => m.timestamp && !isNaN(Date.parse(m.timestamp)))?.timestamp,
    lastTimestamp: [...messages].reverse().find(m => m.timestamp && !isNaN(Date.parse(m.timestamp)))?.timestamp,
    messageCount: messages.length,
    userPrompts: [],
    interruptCount: metrics.interruptCount,
    assistantSnippets: [],
    toolCounts: metrics.toolCounts,
    skillToolInvocations: {},
    toolErrors: metrics.toolErrors,
    permissionRejections: [],
    bashCommands: [],
    filesEdited: [],
    filesRead: [],
  };

  for (const msg of messages) {
    if (msg.permissionResult === 'rejected') {
      // Summarize keeps the per-rejection tool name (the metrics module just
      // tracks the count, since that's all consumers needed there).
      const content = msg.message?.content;
      let tool: string | undefined;
      if (Array.isArray(content)) {
        for (const b of content as any[]) {
          if (b.type === 'tool_use') tool = b.name;
        }
      }
      summary.permissionRejections.push({ tool });
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
        if (block.type !== 'tool_use') continue;
        const name = block.name || 'unknown';
        if (name === 'Skill' && block.input && typeof block.input.skill === 'string') {
          const sk = block.input.skill;
          summary.skillToolInvocations[sk] = (summary.skillToolInvocations[sk] ?? 0) + 1;
        } else if (name === 'Bash' && block.input?.command) {
          summary.bashCommands.push(oneLine(String(block.input.command), 120));
        } else if ((name === 'Edit' || name === 'Write') && block.input?.file_path) {
          summary.filesEdited.push(String(block.input.file_path));
        } else if (name === 'Read' && block.input?.file_path) {
          summary.filesRead.push(String(block.input.file_path));
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
    // For the Skill tool, attribute counts to the specific skill name when known
    // (rendered as `Skill[name]=N`), so consumers don't have to drop into get-chat
    // to know which skill was invoked.
    const parts = toolPairs.map(([k, v]) => {
      if (k === 'Skill' && Object.keys(s.skillToolInvocations).length > 0) {
        const skillParts = Object.entries(s.skillToolInvocations)
          .sort((a, b) => b[1] - a[1])
          .map(([sk, sv]) => `Skill[${sk}]=${sv}`);
        return skillParts.join(' ');
      }
      return `${k}=${v}`;
    });
    lines.push(`  tools: ${parts.join(' ')}`);
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

  const rawSessions = opts.allProjects
    ? await listAllSessions({ claudeDir: opts.claudeDir })
    : await listChatSessions({ project, claudeDir: opts.claudeDir });
  const filtered = filterSessions(rawSessions, opts);
  const offset = opts.offset ?? 0;
  const limited = opts.limit !== undefined
    ? filtered.slice(offset, offset + opts.limit)
    : filtered.slice(offset);

  for (const session of limited) {
    // listChatSessions already loads messages into session.messages
    const summary = summarizeSession(session.projectPath, session.messages, opts);
    console.log(formatSummary(summary, opts));
    console.log('');
  }
}
