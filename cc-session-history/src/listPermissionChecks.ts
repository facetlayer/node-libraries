import { listChatSessions } from './listChatSessions.ts';
import { TextGrid } from './TextGrid.ts';
import type { ChatMessage, ChatSession } from './types.ts';
import { toolNeedsPermission } from './annotateMessages.ts';
import { pathToProjectDir } from './printChatSessions.ts';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';

export interface PermissionCheck {
  sessionId: string;
  projectPath: string;
  timestamp: string;
  toolName: string;
  /** Short summary of what the tool was trying to do */
  toolSummary: string;
  toolUseId: string;
  /** Whether the permission check was approved or rejected by the user */
  outcome: 'approved' | 'rejected';
}

export interface ListPermissionChecksOptions {
  project?: string;
  allProjects?: boolean;
  claudeDir?: string;
  verbose?: boolean;
  limit?: number;
}

/**
 * Extract a short summary of what a tool_use was trying to do.
 */
function summarizeToolInput(toolName: string, input: any): string {
  if (!input) return '';

  switch (toolName) {
    case 'Bash':
      return input.command ? truncate(input.command, 80) : '';
    case 'Edit':
      return input.file_path ? shortPath(input.file_path) : '';
    case 'Write':
      return input.file_path ? shortPath(input.file_path) : '';
    case 'Read':
      return input.file_path ? shortPath(input.file_path) : '';
    case 'Glob':
      return input.pattern || '';
    case 'Grep':
      return input.pattern ? `/${input.pattern}/` : '';
    case 'WebFetch':
      return input.url ? truncate(input.url, 80) : '';
    case 'WebSearch':
      return input.query ? truncate(input.query, 80) : '';
    case 'Agent':
      return input.description || '';
    case 'Skill':
      return input.skill || '';
    default:
      return '';
  }
}

function truncate(text: string, maxLen: number): string {
  const oneLine = text.replace(/\n/g, ' ');
  if (oneLine.length <= maxLen) return oneLine;
  return oneLine.slice(0, maxLen - 3) + '...';
}

function shortPath(filePath: string): string {
  const parts = filePath.split('/');
  if (parts.length <= 3) return filePath;
  return '.../' + parts.slice(-2).join('/');
}

/**
 * Find the tool_use block that matches a given tool_use_id by searching
 * backwards through messages from the rejection.
 */
function findToolUse(messages: ChatMessage[], fromIndex: number, toolUseId: string): { name: string; input: any } | null {
  for (let i = fromIndex - 1; i >= 0; i--) {
    const content = messages[i].message?.content;
    if (!Array.isArray(content)) continue;

    for (const block of content) {
      if (block.type === 'tool_use' && block.id === toolUseId) {
        return { name: block.name || 'unknown', input: block.input };
      }
    }
  }
  return null;
}

/**
 * Extract all permission checks from a session's messages.
 *
 * Detects both approved and rejected permission checks based on the
 * permissionResult annotation set by annotateMessages.
 */
function extractPermissionChecks(session: ChatSession): PermissionCheck[] {
  const checks: PermissionCheck[] = [];
  const messages = session.messages;

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (!msg.permissionResult) continue;

    const content = msg.message?.content;
    if (!Array.isArray(content)) continue;

    for (const block of content) {
      if (block.type !== 'tool_result' || !block.tool_use_id) continue;

      const toolUse = findToolUse(messages, i, block.tool_use_id);
      const toolName = toolUse?.name || 'unknown';

      // For rejected checks, every tool_result with the rejection message is a check
      if (msg.permissionResult === 'rejected') {
        const REJECTION_MSG = "The user doesn't want to proceed with this tool use. The tool use was rejected";
        if (
          block.is_error === true &&
          typeof block.content === 'string' &&
          block.content.includes(REJECTION_MSG)
        ) {
          checks.push({
            sessionId: session.sessionId,
            projectPath: session.projectPath,
            timestamp: msg.timestamp,
            toolName,
            toolSummary: summarizeToolInput(toolName, toolUse?.input),
            toolUseId: block.tool_use_id,
            outcome: 'rejected',
          });
        }
      }

      // For approved checks, the annotation already verified the tool needs permission
      if (msg.permissionResult === 'approved' && toolUse) {
        const permMode = msg.permissionMode || 'default';
        if (toolNeedsPermission(toolName, permMode)) {
          checks.push({
            sessionId: session.sessionId,
            projectPath: session.projectPath,
            timestamp: msg.timestamp,
            toolName,
            toolSummary: summarizeToolInput(toolName, toolUse?.input),
            toolUseId: block.tool_use_id,
            outcome: 'approved',
          });
        }
      }
    }
  }

  return checks;
}

/**
 * Collect all permission checks across sessions for the given options.
 */
export async function listPermissionChecks(options: ListPermissionChecksOptions): Promise<PermissionCheck[]> {
  const claudeDir = options.claudeDir || path.join(os.homedir(), '.claude', 'projects');
  const allChecks: PermissionCheck[] = [];

  let projectDirs: string[];

  if (options.allProjects) {
    try {
      const projectDirents = await fs.readdir(claudeDir, { withFileTypes: true });
      projectDirs = projectDirents
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);
    } catch {
      return [];
    }
  } else {
    const project = options.project || pathToProjectDir(process.cwd());
    projectDirs = [project];
  }

  for (const projectDir of projectDirs) {
    const sessions = await listChatSessions({
      project: projectDir,
      claudeDir: options.claudeDir,
      verbose: options.verbose,
    });

    for (const session of sessions) {
      const checks = extractPermissionChecks(session);
      allChecks.push(...checks);

      if (options.limit && allChecks.length >= options.limit) {
        return allChecks.slice(0, options.limit);
      }
    }
  }

  // Sort by timestamp, most recent first
  allChecks.sort((a, b) =>
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return options.limit ? allChecks.slice(0, options.limit) : allChecks;
}

function formatRelativeDate(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}

/**
 * Print permission checks in a readable format.
 */
export async function printPermissionChecks(options: ListPermissionChecksOptions): Promise<void> {
  const checks = await listPermissionChecks(options);

  if (checks.length === 0) {
    console.log('No permission checks found.');
    return;
  }

  // Print summary header
  const sessionCount = new Set(checks.map(c => c.sessionId)).size;
  const approvedCount = checks.filter(c => c.outcome === 'approved').length;
  const rejectedCount = checks.filter(c => c.outcome === 'rejected').length;
  console.log(`Found ${checks.length} permission check(s) across ${sessionCount} session(s) (${approvedCount} approved, ${rejectedCount} rejected)\n`);

  // Print tool breakdown
  const toolCounts = new Map<string, number>();
  for (const check of checks) {
    toolCounts.set(check.toolName, (toolCounts.get(check.toolName) || 0) + 1);
  }

  const sortedTools = [...toolCounts.entries()].sort((a, b) => b[1] - a[1]);
  console.log('By tool:');
  for (const [tool, count] of sortedTools) {
    const bar = '#'.repeat(Math.min(count, 40));
    console.log(`  ${tool.padEnd(14)} ${String(count).padStart(3)}  ${bar}`);
  }
  console.log();

  // Print detailed list
  const showProject = options.allProjects || false;

  const columns = showProject
    ? [
        { header: 'When' },
        { header: 'Project' },
        { header: 'Session' },
        { header: 'Tool' },
        { header: 'Outcome' },
        { header: 'Detail' },
      ]
    : [
        { header: 'When' },
        { header: 'Session' },
        { header: 'Tool' },
        { header: 'Outcome' },
        { header: 'Detail' },
      ];

  const grid = new TextGrid(columns);

  for (const check of checks) {
    const when = formatRelativeDate(new Date(check.timestamp));
    const shortSession = check.sessionId.slice(0, 8);
    const outcome = check.outcome === 'rejected' ? 'REJECTED' : 'approved';

    if (showProject) {
      grid.addRow([when, check.projectPath, shortSession, check.toolName, outcome, check.toolSummary]);
    } else {
      grid.addRow([when, shortSession, check.toolName, outcome, check.toolSummary]);
    }
  }

  grid.print();
}
