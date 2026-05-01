import { TextGrid } from './TextGrid.ts';
import { extractSessionMetadata, type SkillInvocationSource } from './sessionMetadata.ts';
import { filterSessions, type SessionFilterOptions } from './sessionFilters.ts';
import { loadSessionsForCommand } from './loadSessions.ts';

export interface ListSkillsOptions extends SessionFilterOptions {
  project?: string;
  allProjects?: boolean;
  claudeDir?: string;
  verbose?: boolean;
}

export interface SkillUsageRow {
  name: string;
  /** Number of invocations across the matched sessions. (Renamed from `invocationCount` in 0.3.) */
  runCount: number;
  sessionCount: number;
  /** Timestamp of the most recent invocation. (Renamed from `lastSeen` in 0.3.) */
  lastRun?: string;
  sources: SkillInvocationSource[];
}

export async function listSkills(options: ListSkillsOptions): Promise<SkillUsageRow[]> {
  const sessions = await loadSessionsForCommand(options);
  const filtered = filterSessions(sessions, options);

  const byName = new Map<string, {
    runCount: number;
    sessionIds: Set<string>;
    lastRun?: string;
    sources: Set<SkillInvocationSource>;
  }>();

  for (const session of filtered) {
    const meta = extractSessionMetadata(session.messages);
    for (const inv of meta.skillInvocations) {
      let entry = byName.get(inv.name);
      if (!entry) {
        entry = {
          runCount: 0,
          sessionIds: new Set(),
          lastRun: undefined,
          sources: new Set(),
        };
        byName.set(inv.name, entry);
      }
      entry.runCount++;
      entry.sessionIds.add(session.sessionId);
      entry.sources.add(inv.source);
      if (inv.timestamp && (!entry.lastRun || inv.timestamp > entry.lastRun)) {
        entry.lastRun = inv.timestamp;
      }
    }
  }

  const rows: SkillUsageRow[] = [];
  for (const [name, entry] of byName) {
    rows.push({
      name,
      runCount: entry.runCount,
      sessionCount: entry.sessionIds.size,
      lastRun: entry.lastRun,
      sources: [...entry.sources],
    });
  }

  rows.sort((a, b) => b.runCount - a.runCount || a.name.localeCompare(b.name));
  return rows;
}

export interface PrintListSkillsOptions extends ListSkillsOptions {
  json?: boolean;
  jsonl?: boolean;
  count?: boolean;
}

export async function printListSkills(options: PrintListSkillsOptions): Promise<void> {
  const rows = await listSkills(options);

  if (options.count) {
    console.log(rows.length);
    return;
  }

  if (options.jsonl) {
    for (const r of rows) console.log(JSON.stringify(r));
    return;
  }

  if (options.json) {
    console.log(JSON.stringify({ total: rows.length, items: rows }, null, 2));
    return;
  }

  if (rows.length === 0) {
    console.log('No skill invocations found.');
    return;
  }

  const grid = new TextGrid([
    { header: 'Skill' },
    { header: 'Runs', align: 'right' },
    { header: 'Sessions', align: 'right' },
    { header: 'Sources' },
    { header: 'Last Run' },
  ]);

  for (const row of rows) {
    grid.addRow([
      row.name,
      row.runCount,
      row.sessionCount,
      row.sources.join(','),
      row.lastRun ?? '',
    ]);
  }

  grid.print();
  console.log(`\nTotal skills: ${rows.length}`);
}
