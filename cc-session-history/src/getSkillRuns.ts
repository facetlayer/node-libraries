import { TextGrid } from './TextGrid.ts';
import { listAllSessions } from './listAllSessions.ts';
import { listChatSessions } from './listChatSessions.ts';
import { extractSessionMetadata, type SkillInvocationSource } from './sessionMetadata.ts';
import { filterSessions, type SessionFilterOptions } from './sessionFilters.ts';
import { pathToProjectDir } from './printChatSessions.ts';
import type { ChatSession } from './types.ts';

export interface GetSkillRunsOptions extends SessionFilterOptions {
  /** Required — skill name to look up. Also added to filter.skill if not already there. */
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
  scheduledTaskName?: string;
  messageCount: number;
}

export async function getSkillRuns(options: GetSkillRunsOptions): Promise<SkillRunRow[]> {
  const sessions = await loadSessions(options);
  const skillFilter = options.skill ? [...options.skill, options.skillName] : [options.skillName];
  const filtered = filterSessions(sessions, { ...options, skill: skillFilter });

  const rows: SkillRunRow[] = [];
  for (const session of filtered) {
    const meta = extractSessionMetadata(session.messages);
    for (const inv of meta.skillInvocations) {
      if (inv.name !== options.skillName) continue;
      rows.push({
        sessionId: session.sessionId,
        projectPath: session.projectPath,
        timestamp: inv.timestamp ?? session.lastMessageTimestamp,
        source: inv.source,
        scheduledTaskName: session.scheduledTask?.name,
        messageCount: session.messageCount,
      });
    }
  }

  rows.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const offset = options.offset ?? 0;
  if (offset > 0 || options.limit !== undefined) {
    const end = options.limit !== undefined ? offset + options.limit : undefined;
    return rows.slice(offset, end);
  }
  return rows;
}

async function loadSessions(options: GetSkillRunsOptions): Promise<ChatSession[]> {
  if (options.allProjects) {
    return listAllSessions({ claudeDir: options.claudeDir, verbose: options.verbose });
  }
  const project = options.project
    ? (options.project.startsWith('/') ? pathToProjectDir(options.project) : options.project)
    : pathToProjectDir(process.cwd());
  return listChatSessions({ project, claudeDir: options.claudeDir, verbose: options.verbose });
}

export interface PrintSkillRunsOptions extends GetSkillRunsOptions {
  json?: boolean;
  count?: boolean;
}

export async function printSkillRuns(options: PrintSkillRunsOptions): Promise<void> {
  const rows = await getSkillRuns(options);

  if (options.count) {
    console.log(rows.length);
    return;
  }

  if (options.json) {
    console.log(JSON.stringify(rows, null, 2));
    return;
  }

  if (rows.length === 0) {
    console.log(`No runs found for skill: ${options.skillName}`);
    return;
  }

  const grid = new TextGrid([
    { header: 'When' },
    { header: 'Project' },
    { header: 'Session' },
    { header: 'Source' },
    { header: 'Routine' },
    { header: 'Messages', align: 'right' },
  ]);

  for (const row of rows) {
    grid.addRow([
      row.timestamp,
      row.projectPath,
      row.sessionId,
      row.source,
      row.scheduledTaskName ?? '',
      row.messageCount,
    ]);
  }

  grid.print();
  console.log(`\nTotal runs: ${rows.length}`);
}
