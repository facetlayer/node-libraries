import {
  listChatSessions,
  getSessionDetails,
  type ChatSession,
  type ChatMessage,
} from '@facetlayer/claude-code-session-history';
import type { SessionMetrics, AnalyzeSessionOptions } from './types.ts';
import { calculateMetrics } from './calculateMetrics.ts';

/**
 * Find a session by ID across all projects or within a specific project
 */
async function findSessionById(
  sessionId: string,
  options: AnalyzeSessionOptions = {}
): Promise<{ projectName: string; session: ChatSession } | null> {
  const { claudeDir, verbose } = options;

  // List all projects
  const projectsDir = claudeDir
    ? `${claudeDir}/projects`
    : `${process.env.HOME}/.claude/projects`;

  const fs = await import('fs/promises');
  const path = await import('path');

  let projectNames: string[];
  try {
    const entries = await fs.readdir(projectsDir, { withFileTypes: true });
    projectNames = entries
      .filter(e => e.isDirectory())
      .map(e => e.name);
  } catch {
    if (verbose) console.error(`Could not read projects directory: ${projectsDir}`);
    return null;
  }

  // Search each project for the session
  for (const projectName of projectNames) {
    try {
      const sessions = await listChatSessions({
        project: projectName,
        claudeDir,
        verbose,
      });

      const session = sessions.find(s => s.sessionId === sessionId);
      if (session) {
        return { projectName, session };
      }
    } catch {
      // Continue searching other projects
    }
  }

  return null;
}

/**
 * Analyze a session by its ID
 *
 * This function:
 * 1. Finds the session across all projects
 * 2. Loads the full session details
 * 3. Calculates metrics and confidence scores
 */
export async function analyzeSession(
  sessionId: string,
  options: AnalyzeSessionOptions = {}
): Promise<SessionMetrics | null> {
  const { claudeDir, verbose } = options;

  // Find the session
  const result = await findSessionById(sessionId, options);

  if (!result) {
    if (verbose) console.error(`Session not found: ${sessionId}`);
    return null;
  }

  const { projectName, session } = result;

  if (verbose) {
    console.log(`Found session in project: ${projectName}`);
  }

  // Get full session details (messages)
  const messages = await getSessionDetails(sessionId, projectName, {
    claudeDir,
    verbose,
  });

  // Create a full session object with messages
  const fullSession: ChatSession = {
    ...session,
    messages,
    messageCount: messages.length,
  };

  // Calculate metrics
  return calculateMetrics(fullSession);
}

/**
 * Analyze a session within a specific project
 */
export async function analyzeSessionInProject(
  sessionId: string,
  projectName: string,
  options: AnalyzeSessionOptions = {}
): Promise<SessionMetrics | null> {
  const { claudeDir, verbose } = options;

  try {
    // Get session details
    const messages = await getSessionDetails(sessionId, projectName, {
      claudeDir,
      verbose,
    });

    if (messages.length === 0) {
      if (verbose) console.error(`No messages found for session: ${sessionId}`);
      return null;
    }

    // Get session metadata from list
    const sessions = await listChatSessions({
      project: projectName,
      claudeDir,
      verbose,
    });

    const sessionMeta = sessions.find(s => s.sessionId === sessionId);

    // Build full session object
    const fullSession: ChatSession = {
      sessionId,
      messages,
      projectPath: sessionMeta?.projectPath || projectName,
      messageCount: messages.length,
      firstMessageTimestamp: sessionMeta?.firstMessageTimestamp,
      lastMessageTimestamp: sessionMeta?.lastMessageTimestamp || messages[messages.length - 1]?.timestamp,
    };

    return calculateMetrics(fullSession);
  } catch (error) {
    if (verbose) console.error(`Error analyzing session: ${error}`);
    return null;
  }
}
