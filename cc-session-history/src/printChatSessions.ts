import { listChatSessions } from './listChatSessions.ts';
import { TextGrid } from './TextGrid.ts';
import type { ChatSession } from './types.ts';
import * as fs from 'fs/promises';
import { getClaudeProjectsDir } from './paths.ts';
import { filterSessions, type SessionFilterOptions } from './sessionFilters.ts';
import { computeSessionMetrics } from './sessionMetrics.ts';

export interface PrintSessionsOptions extends SessionFilterOptions {
  verbose?: boolean;
  claudeDir?: string;
  limit?: number;
  offset?: number;
  project?: string;
  json?: boolean;
  jsonl?: boolean;
  count?: boolean;
}

function sessionToRow(s: ChatSession) {
  const m = computeSessionMetrics(s.messages);
  return {
    sessionId: s.sessionId,
    projectPath: s.projectPath,
    firstMessageTimestamp: s.firstMessageTimestamp,
    lastMessageTimestamp: s.lastMessageTimestamp,
    messageCount: s.messageCount,
    entrypoint: s.entrypoint,
    scheduledTask: s.scheduledTask,
    skillsUsed: s.skillsUsed,
    // ----- per-session audit metrics (added in 0.3) -----
    toolErrors: m.toolErrors,
    interruptCount: m.interruptCount,
    durationMs: m.durationMs,
    permissionRejections: m.permissionRejections,
    firstUserPrompt: m.firstUserPrompt,
    skillsInvoked: m.skillsInvoked,
    toolCounts: m.toolCounts,
  };
}

/**
 * Convert a filesystem path to the Claude project directory format.
 * e.g., /Users/andy/candle -> -Users-andy-candle
 * e.g., /Users/andy.fischer/foo -> -Users-andy-fischer-foo
 */
export function pathToProjectDir(fsPath: string): string {
  return fsPath.replace(/[\/\.]/g, '-');
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

function printSessionsGrid(sessions: ChatSession[], showProject: boolean = false): void {
  const columns = showProject
    ? [
        { header: 'Project' },
        { header: 'Session ID' },
        { header: 'Last Active' },
        { header: 'Messages', align: 'right' as const },
        { header: 'Routine' },
      ]
    : [
        { header: 'Session ID' },
        { header: 'Last Active' },
        { header: 'Messages', align: 'right' as const },
        { header: 'Routine' },
      ];

  const grid = new TextGrid(columns);

  for (const session of sessions) {
    const lastActive = formatRelativeDate(new Date(session.lastMessageTimestamp));
    const routine = session.scheduledTask?.name ?? '';

    if (showProject) {
      grid.addRow([session.projectPath, session.sessionId, lastActive, session.messageCount, routine]);
    } else {
      grid.addRow([session.sessionId, lastActive, session.messageCount, routine]);
    }
  }

  grid.print();
}

function emitSessions(sessions: ChatSession[], options: PrintSessionsOptions, totalBeforePagination: number, showProject: boolean): void {
  if (options.count) {
    console.log(totalBeforePagination);
    return;
  }

  if (options.jsonl) {
    for (const s of sessions) console.log(JSON.stringify(sessionToRow(s)));
    return;
  }

  if (options.json) {
    const items = sessions.map(sessionToRow);
    console.log(JSON.stringify({
      total: totalBeforePagination,
      offset: options.offset ?? 0,
      limit: options.limit,
      // `sessions` retained for backwards compat; `items` is the new canonical key.
      items,
      sessions: items,
    }, null, 2));
    return;
  }

  if (sessions.length === 0) {
    console.log('No sessions found.');
    return;
  }

  printSessionsGrid(sessions, showProject);

  console.log(`\nTotal sessions: ${sessions.length}`);
  if (sessions.length !== totalBeforePagination) {
    console.log(`(of ${totalBeforePagination} matching, offset=${options.offset || 0}, limit=${options.limit ?? 'all'})`);
  }
}

export async function printChatSessions(options: PrintSessionsOptions): Promise<void> {
  try {
    if (!options.project) {
      console.log('No project specified. Use --project or provide a project path.');
      process.exit(1);
    }

    // Load WITHOUT pagination first so filters apply to the full set, then paginate.
    const allSessions = await listChatSessions({
      project: options.project,
      claudeDir: options.claudeDir,
      verbose: options.verbose,
    });

    const filtered = filterSessions(allSessions, options);
    const total = filtered.length;

    const offset = options.offset || 0;
    const paginated = options.limit !== undefined
      ? filtered.slice(offset, offset + options.limit)
      : filtered.slice(offset);

    emitSessions(paginated, options, total, false);
  } catch (error) {
    console.error('Error listing sessions:', error);
    process.exit(1);
  }
}

export interface PrintAllSessionsOptions extends SessionFilterOptions {
  verbose?: boolean;
  claudeDir?: string;
  limit?: number;
  offset?: number;
  json?: boolean;
  jsonl?: boolean;
  count?: boolean;
}

export async function printAllSessions(options: PrintAllSessionsOptions): Promise<void> {
  try {
    let projectDirs: string[];
    try {
      const projectDirents = await fs.readdir(getClaudeProjectsDir(options.claudeDir), { withFileTypes: true });
      projectDirs = projectDirents
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);
    } catch {
      if (options.count) {
        console.log(0);
        return;
      }
      console.log('No sessions found.');
      return;
    }

    const allSessions: ChatSession[] = [];
    for (const projectDir of projectDirs) {
      const sessions = await listChatSessions({
        project: projectDir,
        claudeDir: options.claudeDir,
        verbose: options.verbose,
      });
      allSessions.push(...sessions);
    }

    allSessions.sort((a, b) =>
      new Date(b.lastMessageTimestamp).getTime() - new Date(a.lastMessageTimestamp).getTime()
    );

    const filtered = filterSessions(allSessions, options);
    const total = filtered.length;

    const offset = options.offset || 0;
    const paginated = options.limit !== undefined
      ? filtered.slice(offset, offset + options.limit)
      : filtered.slice(offset);

    emitSessions(paginated, options, total, true);
  } catch (error) {
    console.error('Error listing sessions:', error);
    process.exit(1);
  }
}
