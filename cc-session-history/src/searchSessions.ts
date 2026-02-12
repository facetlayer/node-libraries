import { listChatSessions } from './listChatSessions.ts';
import type { ChatMessage } from './types.ts';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';
import { pathToProjectDir } from './printChatSessions.ts';

export interface SearchOptions {
  query: string;
  allProjects?: boolean;
  project?: string;
  claudeDir?: string;
  verbose?: boolean;
  limit?: number;
}

export interface SearchResult {
  sessionId: string;
  projectPath: string;
  message: ChatMessage;
  matchingText: string;
  timestamp: string;
}

function extractTextContent(message: ChatMessage): string {
  const parts: string[] = [];

  // Check message.content (user messages often have this)
  if (message.content) {
    parts.push(message.content);
  }

  // Check message.message.content
  if (message.message?.content) {
    const content = message.message.content;
    if (typeof content === 'string') {
      parts.push(content);
    } else if (Array.isArray(content)) {
      for (const block of content) {
        if (block.type === 'text' && block.text) {
          parts.push(block.text);
        }
      }
    }
  }

  return parts.join('\n');
}

export async function searchSessions(options: SearchOptions): Promise<SearchResult[]> {
  const claudeDir = options.claudeDir || path.join(os.homedir(), '.claude', 'projects');
  const results: SearchResult[] = [];
  const queryLower = options.query.toLowerCase();

  let projectDirs: string[];

  if (options.allProjects) {
    // Search all projects
    try {
      const projectDirents = await fs.readdir(claudeDir, { withFileTypes: true });
      projectDirs = projectDirents
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);
    } catch (error) {
      if (options.verbose) {
        console.log('Claude directory does not exist');
      }
      return [];
    }
  } else {
    // Search single project
    const project = options.project || pathToProjectDir(process.cwd());
    projectDirs = [project];
  }

  for (const projectDir of projectDirs) {
    const sessions = await listChatSessions({
      project: projectDir,
      claudeDir: options.claudeDir,
      verbose: options.verbose
    });

    for (const session of sessions) {
      for (const message of session.messages) {
        const textContent = extractTextContent(message);
        const textLower = textContent.toLowerCase();

        if (textLower.includes(queryLower)) {
          results.push({
            sessionId: session.sessionId,
            projectPath: session.projectPath,
            message,
            matchingText: textContent,
            timestamp: message.timestamp
          });

          // If we've hit the limit, stop searching
          if (options.limit && results.length >= options.limit) {
            return results;
          }
        }
      }
    }
  }

  // Sort by timestamp (most recent first)
  results.sort((a, b) =>
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return results;
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

function highlightMatch(text: string, query: string): string {
  // Find the position of the match (case insensitive)
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const matchIndex = lowerText.indexOf(lowerQuery);

  if (matchIndex === -1) return truncateText(text, 200);

  // Show context around the match
  const contextBefore = 50;
  const contextAfter = 100;
  const start = Math.max(0, matchIndex - contextBefore);
  const end = Math.min(text.length, matchIndex + query.length + contextAfter);

  let snippet = text.slice(start, end);

  // Add ellipses if we truncated
  if (start > 0) snippet = '...' + snippet;
  if (end < text.length) snippet = snippet + '...';

  return snippet.replace(/\n/g, ' ');
}

export async function printSearchResults(options: SearchOptions): Promise<void> {
  const results = await searchSessions(options);

  if (results.length === 0) {
    console.log(`No results found for: "${options.query}"`);
    return;
  }

  // Group results by session
  const groupedResults = new Map<string, SearchResult[]>();
  for (const result of results) {
    const key = result.sessionId;
    if (!groupedResults.has(key)) {
      groupedResults.set(key, []);
    }
    groupedResults.get(key)!.push(result);
  }

  const sessionCount = groupedResults.size;
  console.log(`Found ${results.length} match(es) in ${sessionCount} session(s) for: "${options.query}"\n`);

  for (const [sessionId, sessionResults] of groupedResults) {
    const firstResult = sessionResults[0];

    console.log(`═════════════════════════════════════════════════════════════`);
    console.log(`Session: ${sessionId}`);
    if (options.allProjects) {
      console.log(`Project: ${firstResult.projectPath}`);
    }
    console.log(`Matches: ${sessionResults.length}`);

    for (const result of sessionResults) {
      const timestamp = new Date(result.timestamp).toLocaleString();
      const type = result.message.type.toUpperCase();

      console.log(`  ─────────────────────────────────────────────────────────`);
      console.log(`  ${type} | ${timestamp}`);
      console.log(`  ${highlightMatch(result.matchingText, options.query)}`);
    }
    console.log();
  }
}
