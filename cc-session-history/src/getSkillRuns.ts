import { TextGrid } from './TextGrid.ts';
import { extractSessionMetadata, type SkillInvocationSource } from './sessionMetadata.ts';
import { filterSessions, type SessionFilterOptions } from './sessionFilters.ts';
import { computeSessionMetrics, type SessionMetrics } from './sessionMetrics.ts';
import { loadSessionsForCommand } from './loadSessions.ts';
import type { ChatSession } from './types.ts';

export interface GetSkillRunsOptions extends SessionFilterOptions {
  /**
   * Skill name (basename of the SKILL.md parent dir) OR routine name to look up.
   *
   * If no skill invocation matches, the lookup falls back to matching
   * `session.scheduledTask?.name`, so passing a routine name (whose `<scheduled-task name="…">`
   * differs from its skill basename) works without the caller having to know which is which.
   */
  skillName: string;
  project?: string;
  allProjects?: boolean;
  claudeDir?: string;
  verbose?: boolean;
  offset?: number;
  limit?: number;
}

export interface SkillRunRow {
  sessionId: string;
  projectPath: string;
  timestamp: string;
  source: SkillInvocationSource;
  /** Routine name when the session was started by a scheduled task. (Renamed from `scheduledTaskName` in 0.3.) */
  routineName?: string;
  messageCount: number;
  // ----- per-session audit metrics (added in 0.3) -----
  toolErrors: number;
  interruptCount: number;
  durationMs?: number;
  permissionRejections: number;
  firstUserPrompt?: string;
  skillsInvoked: string[];
  toolCounts: Record<string, number>;
}

export interface GetSkillRunsResult {
  total: number;
  offset: number;
  limit?: number;
  /** Whether the lookup matched routine sessions instead of (or in addition to) skill invocations. */
  matchedRoutine: boolean;
  items: SkillRunRow[];
}

export async function getSkillRuns(options: GetSkillRunsOptions): Promise<GetSkillRunsResult> {
  const sessions = await loadSessionsForCommand(options);

  const wantedName = options.skillName;
  const skillFilter = options.skill ? [...options.skill, wantedName] : [wantedName];
  const filteredBySkill = filterSessions(sessions, { ...options, skill: skillFilter });

  // Build skill-invocation rows.
  const rows: SkillRunRow[] = [];
  for (const session of filteredBySkill) {
    const meta = extractSessionMetadata(session.messages);
    for (const inv of meta.skillInvocations) {
      if (inv.name !== wantedName) continue;
      rows.push(buildRow(session, inv.source, inv.timestamp ?? session.lastMessageTimestamp));
    }
  }

  // Fallback: if nothing matched as a skill, try matching as a routine name.
  // This makes `get-skill-runs <routine-name>` work even when the routine wraps
  // a skill with a different basename.
  let matchedRoutine = false;
  if (rows.length === 0) {
    const filteredByRoutine = filterSessions(sessions, {
      ...options,
      skill: undefined,
      routineName: [wantedName],
    });
    for (const session of filteredByRoutine) {
      if (!session.scheduledTask || session.scheduledTask.name !== wantedName) continue;
      matchedRoutine = true;
      rows.push(buildRow(session, 'scheduled-task', session.firstMessageTimestamp ?? session.lastMessageTimestamp));
    }
  }

  rows.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const total = rows.length;
  const offset = options.offset ?? 0;
  const limit = options.limit;
  const sliced = limit !== undefined
    ? rows.slice(offset, offset + limit)
    : (offset > 0 ? rows.slice(offset) : rows);

  return { total, offset, limit, matchedRoutine, items: sliced };
}

function buildRow(session: ChatSession, source: SkillInvocationSource, timestamp: string): SkillRunRow {
  const metrics: SessionMetrics = computeSessionMetrics(session.messages);
  return {
    sessionId: session.sessionId,
    projectPath: session.projectPath,
    timestamp,
    source,
    routineName: session.scheduledTask?.name,
    messageCount: session.messageCount,
    toolErrors: metrics.toolErrors,
    interruptCount: metrics.interruptCount,
    durationMs: metrics.durationMs,
    permissionRejections: metrics.permissionRejections,
    firstUserPrompt: metrics.firstUserPrompt,
    skillsInvoked: metrics.skillsInvoked,
    toolCounts: metrics.toolCounts,
  };
}

export interface PrintSkillRunsOptions extends GetSkillRunsOptions {
  json?: boolean;
  jsonl?: boolean;
  count?: boolean;
}

export async function printSkillRuns(options: PrintSkillRunsOptions): Promise<void> {
  const result = await getSkillRuns(options);

  if (options.count) {
    console.log(result.total);
    return;
  }

  if (options.jsonl) {
    for (const r of result.items) console.log(JSON.stringify(r));
    return;
  }

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (result.items.length === 0) {
    console.log(`No runs found for skill: ${options.skillName}`);
    return;
  }

  if (result.matchedRoutine) {
    console.log(`(matched as routine name; no skill invocations named "${options.skillName}" were found)\n`);
  }

  const grid = new TextGrid([
    { header: 'When' },
    { header: 'Project' },
    { header: 'Session' },
    { header: 'Source' },
    { header: 'Routine' },
    { header: 'Msgs', align: 'right' },
    { header: 'ToolErr', align: 'right' },
    { header: 'Interrupts', align: 'right' },
    { header: 'PermRej', align: 'right' },
  ]);

  for (const row of result.items) {
    grid.addRow([
      row.timestamp,
      row.projectPath,
      row.sessionId,
      row.source,
      row.routineName ?? '',
      row.messageCount,
      row.toolErrors,
      row.interruptCount,
      row.permissionRejections,
    ]);
  }

  grid.print();
  console.log(`\nTotal runs: ${result.total}`);
}
