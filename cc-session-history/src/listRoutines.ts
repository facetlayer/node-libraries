import { TextGrid } from './TextGrid.ts';
import { listAllSessions } from './listAllSessions.ts';
import { listChatSessions } from './listChatSessions.ts';
import { filterSessions, type SessionFilterOptions } from './sessionFilters.ts';
import { pathToProjectDir } from './printChatSessions.ts';
import type { ChatSession } from './types.ts';

export interface ListRoutinesOptions extends SessionFilterOptions {
  project?: string;
  allProjects?: boolean;
  claudeDir?: string;
  verbose?: boolean;
}

export interface RoutineUsageRow {
  routineName: string;
  skillName: string;
  skillFile: string;
  runCount: number;
  lastRun?: string;
  /** Project paths the routine has been seen in (deduped). */
  projects: string[];
}

export async function listRoutines(options: ListRoutinesOptions): Promise<RoutineUsageRow[]> {
  const sessions = await loadSessions(options);
  const filtered = filterSessions(sessions, { ...options, routine: true });

  const byRoutine = new Map<string, {
    routineName: string;
    skillName: string;
    skillFile: string;
    runCount: number;
    lastRun?: string;
    projects: Set<string>;
  }>();

  for (const session of filtered) {
    if (!session.scheduledTask) continue;
    const key = session.scheduledTask.name;
    let entry = byRoutine.get(key);
    if (!entry) {
      entry = {
        routineName: session.scheduledTask.name,
        skillName: session.scheduledTask.skillName,
        skillFile: session.scheduledTask.skillFile,
        runCount: 0,
        lastRun: undefined,
        projects: new Set(),
      };
      byRoutine.set(key, entry);
    }
    entry.runCount++;
    entry.projects.add(session.projectPath);
    const ts = session.lastMessageTimestamp;
    if (ts && (!entry.lastRun || ts > entry.lastRun)) {
      entry.lastRun = ts;
    }
  }

  const rows: RoutineUsageRow[] = [];
  for (const entry of byRoutine.values()) {
    rows.push({
      routineName: entry.routineName,
      skillName: entry.skillName,
      skillFile: entry.skillFile,
      runCount: entry.runCount,
      lastRun: entry.lastRun,
      projects: [...entry.projects],
    });
  }

  rows.sort((a, b) => b.runCount - a.runCount || a.routineName.localeCompare(b.routineName));
  return rows;
}

async function loadSessions(options: ListRoutinesOptions): Promise<ChatSession[]> {
  if (options.allProjects) {
    return listAllSessions({ claudeDir: options.claudeDir, verbose: options.verbose });
  }
  const project = options.project
    ? (options.project.startsWith('/') ? pathToProjectDir(options.project) : options.project)
    : pathToProjectDir(process.cwd());
  return listChatSessions({ project, claudeDir: options.claudeDir, verbose: options.verbose });
}

export interface PrintListRoutinesOptions extends ListRoutinesOptions {
  json?: boolean;
  count?: boolean;
}

export async function printListRoutines(options: PrintListRoutinesOptions): Promise<void> {
  const rows = await listRoutines(options);

  if (options.count) {
    console.log(rows.length);
    return;
  }

  if (options.json) {
    console.log(JSON.stringify(rows, null, 2));
    return;
  }

  if (rows.length === 0) {
    console.log('No routines found.');
    return;
  }

  const grid = new TextGrid([
    { header: 'Routine' },
    { header: 'Skill' },
    { header: 'Runs', align: 'right' },
    { header: 'Projects', align: 'right' },
    { header: 'Last Run' },
  ]);

  for (const row of rows) {
    grid.addRow([
      row.routineName,
      row.skillName,
      row.runCount,
      row.projects.length,
      row.lastRun ?? '',
    ]);
  }

  grid.print();
  console.log(`\nTotal routines: ${rows.length}`);
}
