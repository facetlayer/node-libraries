import { listChatSessions } from './listChatSessions.ts';
import { TextGrid } from './TextGrid.ts';
import type { ChatSession } from './types.ts';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';

export interface PrintProjectsOptions {
  verbose?: boolean;
  claudeDir?: string;
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

  // For older dates, show the date
  return date.toLocaleDateString();
}

export async function printProjects(options: PrintProjectsOptions): Promise<void> {
  try {
    const claudeDir = options.claudeDir || path.join(os.homedir(), '.claude', 'projects');
    const verbose = options.verbose || false;

    // Get list of all project directories
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
      console.log('No projects found.');
      return;
    }

    if (projectDirs.length === 0) {
      console.log('No projects found.');
      return;
    }

    // Get sessions for each project
    const projectsWithSessions: Array<{ path: string; sessions: ChatSession[] }> = [];
    for (const projectDir of projectDirs) {
      const sessions = await listChatSessions({
        project: projectDir,
        claudeDir: options.claudeDir,
        verbose: options.verbose
      });

      if (sessions.length > 0) {
        projectsWithSessions.push({
          path: projectDir,
          sessions
        });
      }
    }

    if (projectsWithSessions.length === 0) {
      console.log('No projects found.');
      return;
    }

    // Sort projects by most recent session
    projectsWithSessions.sort((a, b) => {
      const aLatest = new Date(a.sessions[0]?.lastMessageTimestamp || 0).getTime();
      const bLatest = new Date(b.sessions[0]?.lastMessageTimestamp || 0).getTime();
      return bLatest - aLatest;
    });

    const grid = new TextGrid([
      { header: 'Project' },
      { header: 'Last Active' },
      { header: 'Sessions', align: 'right' },
      { header: 'Messages', align: 'right' }
    ]);

    for (const project of projectsWithSessions) {
      const totalMessages = project.sessions.reduce((sum: number, s) => sum + s.messageCount, 0);
      const lastSession = project.sessions[0];
      const lastActive = formatRelativeDate(new Date(lastSession.lastMessageTimestamp));

      grid.addRow([project.path, lastActive, project.sessions.length, totalMessages]);
    }

    grid.print();

    console.log(`\nTotal projects: ${projectsWithSessions.length}`);
  } catch (error) {
    console.error('Error listing projects:', error);
    process.exit(1);
  }
}
