import { listChatSessions } from './listChatSessions';
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

export async function printChatSessions(options: PrintSessionsOptions): Promise<void> {
  try {
    const claudeDir = options.claudeDir || path.join(os.homedir(), '.claude', 'projects');
    const verbose = options.verbose || false;

    // If project is specified, get sessions for that project only
    if (options.project) {
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

      console.log(`\nProject: ${options.project}`);
      console.log('─'.repeat(80));

      for (const session of sessions) {
        const firstDate = new Date(session.firstMessageTimestamp).toLocaleString();
        const lastDate = new Date(session.lastMessageTimestamp).toLocaleString();

        console.log(`\nSession ID: ${session.sessionId}`);
        console.log(`  Messages: ${session.messageCount}`);
        console.log(`  First message: ${firstDate}`);
        console.log(`  Last message: ${lastDate}`);
      }

      console.log(`\n${'─'.repeat(80)}`);
      console.log(`Total sessions: ${sessions.length}`);

      if (options.offset || options.limit) {
        console.log(`Showing: offset=${options.offset || 0}, limit=${options.limit || 'all'}`);
      }
    } else {
      // Get all projects and their sessions
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
      const allSessions: Array<{ projectPath: string; sessions: any[] }> = [];
      for (const projectDir of projectDirs) {
        const sessions = await listChatSessions({
          project: projectDir,
          claudeDir: options.claudeDir,
          verbose: options.verbose
        });

        if (sessions.length > 0) {
          allSessions.push({
            projectPath: projectDir,
            sessions
          });
        }
      }

      if (allSessions.length === 0) {
        console.log('No sessions found.');
        return;
      }

      // Flatten and sort all sessions by timestamp
      const flatSessions = allSessions.flatMap(p =>
        p.sessions.map(s => ({ ...s, projectPath: p.projectPath }))
      );
      flatSessions.sort((a, b) =>
        new Date(b.lastMessageTimestamp).getTime() - new Date(a.lastMessageTimestamp).getTime()
      );

      // Apply pagination
      const offset = options.offset || 0;
      const paginatedSessions = options.limit !== undefined
        ? flatSessions.slice(offset, offset + options.limit)
        : flatSessions.slice(offset);

      // Group by project for display
      const projectMap = new Map<string, any[]>();
      for (const session of paginatedSessions) {
        if (!projectMap.has(session.projectPath)) {
          projectMap.set(session.projectPath, []);
        }
        projectMap.get(session.projectPath)!.push(session);
      }

      let sessionCount = 0;
      for (const [projectPath, sessions] of projectMap) {
        console.log(`\nProject: ${projectPath}`);
        console.log('─'.repeat(80));

        for (const session of sessions) {
          sessionCount++;
          const firstDate = new Date(session.firstMessageTimestamp).toLocaleString();
          const lastDate = new Date(session.lastMessageTimestamp).toLocaleString();

          console.log(`\nSession ID: ${session.sessionId}`);
          console.log(`  Messages: ${session.messageCount}`);
          console.log(`  First message: ${firstDate}`);
          console.log(`  Last message: ${lastDate}`);
        }
      }

      console.log(`\n${'─'.repeat(80)}`);
      console.log(`Total sessions: ${sessionCount}`);

      if (options.offset || options.limit) {
        console.log(`Showing: offset=${options.offset || 0}, limit=${options.limit || 'all'}`);
      }
    }
  } catch (error) {
    console.error('Error listing sessions:', error);
    process.exit(1);
  }
}
