import { listChatSessions } from './listChatSessions';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';

export interface PrintProjectsOptions {
  verbose?: boolean;
  claudeDir?: string;
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
    const projectsWithSessions = [];
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

    for (const project of projectsWithSessions) {
      const totalMessages = project.sessions.reduce((sum, s) => sum + s.messageCount, 0);
      const lastSession = project.sessions[0];
      const lastActive = new Date(lastSession.lastMessageTimestamp).toLocaleString();

      console.log(`\n${project.path}`);
      console.log(`  Sessions: ${project.sessions.length}`);
      console.log(`  Total messages: ${totalMessages}`);
      console.log(`  Last active: ${lastActive}`);
    }

    console.log(`\n${'─'.repeat(80)}`);
    console.log(`Total projects: ${projectsWithSessions.length}`);
  } catch (error) {
    console.error('Error listing projects:', error);
    process.exit(1);
  }
}
