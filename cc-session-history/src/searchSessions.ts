import { listChatSessions } from './listChatSessions.ts';
import type { ChatMessage } from './types.ts';
import * as fs from 'fs/promises';
import { pathToProjectDir } from './printChatSessions.ts';
import { getClaudeProjectsDir } from './paths.ts';
import { filterSessions, type SessionFilterOptions } from './sessionFilters.ts';

export interface SearchOptions extends SessionFilterOptions {
  query: string;
  allProjects?: boolean;
  project?: string;
  claudeDir?: string;
  verbose?: boolean;
  limit?: number;
  offset?: number;
  json?: boolean;
  count?: boolean;
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
  const results: SearchResult[] = [];
  const queryLower = options.query.toLowerCase();

  let projectDirs: string[];

  if (options.allProjects) {
    // Search all projects
    try {
      const projectDirents = await fs.readdir(getClaudeProjectsDir(options.claudeDir), { withFileTypes: true });
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
    const rawSessions = await listChatSessions({
      project: projectDir,
      claudeDir: options.claudeDir,
      verbose: options.verbose
    });

    const sessions = filterSessions(rawSessions, options);

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

        }
      }
    }
  }

  // Sort by timestamp (most recent first)
  results.sort((a, b) =>
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const offset = options.offset ?? 0;
  if (offset > 0 || options.limit !== undefined) {
    const end = options.limit !== undefined ? offset + options.limit : undefined;
    return results.slice(offset, end);
  }
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

  if (options.count) {
    console.log(results.length);
    return;
  }

  if (options.json) {
    const items = results.map(r => ({
      sessionId: r.sessionId,
      projectPath: r.projectPath,
      timestamp: r.timestamp,
      type: r.message.type,
      matchingText: r.matchingText,
    }));
    console.log(JSON.stringify(items, null, 2));
    return;
  }

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
