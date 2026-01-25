import { listChatSessions } from './listChatSessions.ts';
import { TextGrid } from './TextGrid.ts';
import type { ChatSession } from './types.ts';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';

export interface PrintSessionsOptions {
  verbose?: boolean;
  claudeDir?: string;
  limit?: number;
  offset?: number;
  project?: string;
}

/**
 * Convert a filesystem path to the Claude project directory format.
 * e.g., /Users/andy/candle -> -Users-andy-candle
 */
export function pathToProjectDir(fsPath: string): string {
  return fsPath.replace(/\//g, '-');
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
      ]
    : [
        { header: 'Session ID' },
        { header: 'Last Active' },
        { header: 'Messages', align: 'right' as const },
      ];

  const grid = new TextGrid(columns);

  for (const session of sessions) {
    const lastActive = formatRelativeDate(new Date(session.lastMessageTimestamp));

    if (showProject) {
      grid.addRow([session.projectPath, session.sessionId, lastActive, session.messageCount]);
    } else {
      grid.addRow([session.sessionId, lastActive, session.messageCount]);
    }
  }

  grid.print();
}

export async function printChatSessions(options: PrintSessionsOptions): Promise<void> {
  try {
    const verbose = options.verbose || false;

    if (!options.project) {
      console.log('No project specified. Use --project or provide a project path.');
      process.exit(1);
    }

    const sessions = await listChatSessions({
      project: options.project,
      claudeDir: options.claudeDir,
      verbose: options.verbose,
      offset: options.offset,
      limit: options.limit
    });

    if (sessions.length === 0) {
      console.log(`No sessions found for project: ${options.project}`);
      return;
    }

    printSessionsGrid(sessions, false);

    console.log(`\nTotal sessions: ${sessions.length}`);

    if (options.offset || options.limit) {
      console.log(`Showing: offset=${options.offset || 0}, limit=${options.limit || 'all'}`);
    }
  } catch (error) {
    console.error('Error listing sessions:', error);
    process.exit(1);
  }
}

export interface PrintAllSessionsOptions {
  verbose?: boolean;
  claudeDir?: string;
  limit?: number;
  offset?: number;
}

export async function printAllSessions(options: PrintAllSessionsOptions): Promise<void> {
  try {
    const claudeDir = options.claudeDir || path.join(os.homedir(), '.claude', 'projects');
    const verbose = options.verbose || false;

    // Get all projects
    let projectDirs: string[];
    try {
      const projectDirents = await fs.readdir(claudeDir, { withFileTypes: true });
      projectDirs = projectDirents
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);
    } catch (error) {
      if (verbose) {
        console.log('Claude directory does not exist');
      }
      console.log('No sessions found.');
      return;
    }

    // Collect all sessions from all projects
    const allSessions: ChatSession[] = [];
    for (const projectDir of projectDirs) {
      const sessions = await listChatSessions({
        project: projectDir,
        claudeDir: options.claudeDir,
        verbose: options.verbose
      });

      allSessions.push(...sessions);
    }

    if (allSessions.length === 0) {
      console.log('No sessions found.');
      return;
    }

    // Sort all sessions by timestamp
    allSessions.sort((a, b) =>
      new Date(b.lastMessageTimestamp).getTime() - new Date(a.lastMessageTimestamp).getTime()
    );

    // Apply pagination
    const offset = options.offset || 0;
    const paginatedSessions = options.limit !== undefined
      ? allSessions.slice(offset, offset + options.limit)
      : allSessions.slice(offset);

    printSessionsGrid(paginatedSessions, true);

    console.log(`\nTotal sessions: ${paginatedSessions.length}${allSessions.length > paginatedSessions.length ? ` (of ${allSessions.length})` : ''}`);

    if (options.offset || options.limit) {
      console.log(`Showing: offset=${options.offset || 0}, limit=${options.limit || 'all'}`);
    }
  } catch (error) {
    console.error('Error listing sessions:', error);
    process.exit(1);
  }
}
