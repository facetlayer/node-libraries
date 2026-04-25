import { TextGrid } from './TextGrid.ts';
import { listAllSessions } from './listAllSessions.ts';
import { listChatSessions } from './listChatSessions.ts';
import { extractSessionMetadata, type SkillInvocationSource } from './sessionMetadata.ts';
import { filterSessions, type SessionFilterOptions } from './sessionFilters.ts';
import type { ChatSession } from './types.ts';
import { pathToProjectDir } from './printChatSessions.ts';

export interface ListSkillsOptions extends SessionFilterOptions {
  project?: string;
  allProjects?: boolean;
  claudeDir?: string;
  verbose?: boolean;
}

export interface SkillUsageRow {
  name: string;
  invocationCount: number;
  sessionCount: number;
  lastSeen?: string;
  sources: SkillInvocationSource[];
}

export async function listSkills(options: ListSkillsOptions): Promise<SkillUsageRow[]> {
  const sessions = await loadSessions(options);
  const filtered = filterSessions(sessions, options);

  const byName = new Map<string, {
    invocationCount: number;
    sessionIds: Set<string>;
    lastSeen?: string;
    sources: Set<SkillInvocationSource>;
  }>();

  for (const session of filtered) {
    const meta = extractSessionMetadata(session.messages);
    for (const inv of meta.skillInvocations) {
      let entry = byName.get(inv.name);
      if (!entry) {
        entry = {
          invocationCount: 0,
          sessionIds: new Set(),
          lastSeen: undefined,
          sources: new Set(),
        };
        byName.set(inv.name, entry);
      }
      entry.invocationCount++;
      entry.sessionIds.add(session.sessionId);
      entry.sources.add(inv.source);
      if (inv.timestamp && (!entry.lastSeen || inv.timestamp > entry.lastSeen)) {
        entry.lastSeen = inv.timestamp;
      }
    }
  }

  const rows: SkillUsageRow[] = [];
  for (const [name, entry] of byName) {
    rows.push({
      name,
      invocationCount: entry.invocationCount,
      sessionCount: entry.sessionIds.size,
      lastSeen: entry.lastSeen,
      sources: [...entry.sources],
    });
  }

  rows.sort((a, b) => b.invocationCount - a.invocationCount || a.name.localeCompare(b.name));
  return rows;
}

async function loadSessions(options: ListSkillsOptions): Promise<ChatSession[]> {
  if (options.allProjects) {
    return listAllSessions({ claudeDir: options.claudeDir, verbose: options.verbose });
  }
  const project = options.project
    ? (options.project.startsWith('/') ? pathToProjectDir(options.project) : options.project)
    : pathToProjectDir(process.cwd());
  return listChatSessions({ project, claudeDir: options.claudeDir, verbose: options.verbose });
}

export interface PrintListSkillsOptions extends ListSkillsOptions {
  json?: boolean;
  count?: boolean;
}

export async function printListSkills(options: PrintListSkillsOptions): Promise<void> {
  const rows = await listSkills(options);

  if (options.count) {
    console.log(rows.length);
    return;
  }

  if (options.json) {
    console.log(JSON.stringify(rows, null, 2));
    return;
  }

  if (rows.length === 0) {
    console.log('No skill invocations found.');
    return;
  }

  const grid = new TextGrid([
    { header: 'Skill' },
    { header: 'Invocations', align: 'right' },
    { header: 'Sessions', align: 'right' },
    { header: 'Sources' },
    { header: 'Last Seen' },
  ]);

  for (const row of rows) {
    grid.addRow([
      row.name,
      row.invocationCount,
      row.sessionCount,
      row.sources.join(','),
      row.lastSeen ?? '',
    ]);
  }

  grid.print();
  console.log(`\nTotal skills: ${rows.length}`);
}
