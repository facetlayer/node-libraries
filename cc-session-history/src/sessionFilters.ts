import type { ChatSession } from './types.ts';

export interface SessionFilterOptions {
  /** Only sessions that invoked a skill matching one of these names. */
  skill?: string[];
  /** Only sessions started by a scheduled task. */
  routine?: boolean;
  /** Only sessions whose <scheduled-task name="…"> matches one of these names. Implies routine=true. */
  routineName?: string[];
  /** Only sessions whose first entrypoint matches. */
  entrypoint?: string;
  /** ISO date string or relative duration ("7d", "24h", "30m"). Sessions older than this are excluded. */
  since?: string;
  /** Same format as `since`. Sessions newer than this are excluded. */
  until?: string;
}

/**
 * Parse a `--since` / `--until` style argument into a Date.
 * Accepts:
 *  - ISO 8601 (e.g. "2026-04-20" or "2026-04-20T12:00:00Z")
 *  - Relative durations: "<n>d", "<n>h", "<n>m", or "<n>w" — interpreted relative to now.
 *  - Pure numbers are treated as days for convenience.
 * Returns null on parse failure.
 */
export function parseTimeBound(input: string, now: Date = new Date()): Date | null {
  if (!input) return null;
  const trimmed = input.trim();

  // Relative duration like 7d / 24h / 30m / 2w
  const rel = trimmed.match(/^(\d+)\s*([dhmw])$/i);
  if (rel) {
    const n = parseInt(rel[1], 10);
    const unit = rel[2].toLowerCase();
    let ms = 0;
    if (unit === 'd') ms = n * 24 * 60 * 60 * 1000;
    else if (unit === 'h') ms = n * 60 * 60 * 1000;
    else if (unit === 'm') ms = n * 60 * 1000;
    else if (unit === 'w') ms = n * 7 * 24 * 60 * 60 * 1000;
    return new Date(now.getTime() - ms);
  }

  // Bare number → days
  if (/^\d+$/.test(trimmed)) {
    return new Date(now.getTime() - parseInt(trimmed, 10) * 24 * 60 * 60 * 1000);
  }

  const parsed = new Date(trimmed);
  if (isNaN(parsed.getTime())) return null;
  return parsed;
}

/**
 * Apply session filters. Sessions must already have metadata populated
 * (scheduledTask, skillsUsed, entrypoint).
 */
export function filterSessions(
  sessions: ChatSession[],
  filter: SessionFilterOptions,
  now: Date = new Date()
): ChatSession[] {
  const since = filter.since ? parseTimeBound(filter.since, now) : null;
  const until = filter.until ? parseTimeBound(filter.until, now) : null;

  if (filter.since && !since) {
    throw new Error(`Could not parse --since value: ${filter.since}`);
  }
  if (filter.until && !until) {
    throw new Error(`Could not parse --until value: ${filter.until}`);
  }

  const wantRoutine = filter.routine === true || (filter.routineName && filter.routineName.length > 0);
  const skillNames = filter.skill && filter.skill.length > 0 ? new Set(filter.skill) : null;
  const routineNames = filter.routineName && filter.routineName.length > 0 ? new Set(filter.routineName) : null;

  return sessions.filter(session => {
    if (wantRoutine && !session.scheduledTask) return false;

    if (routineNames && (!session.scheduledTask || !routineNames.has(session.scheduledTask.name))) {
      return false;
    }

    if (skillNames) {
      const used = session.skillsUsed ?? [];
      const anyMatch = used.some(name => skillNames.has(name));
      if (!anyMatch) return false;
    }

    if (filter.entrypoint && session.entrypoint !== filter.entrypoint) return false;

    if (since || until) {
      const ts = session.lastMessageTimestamp;
      if (!ts) return false;
      const dt = new Date(ts);
      if (since && dt < since) return false;
      if (until && dt > until) return false;
    }

    return true;
  });
}

/**
 * Normalize a yargs string|string[] (with comma-splitting) into a clean string[].
 */
export function normalizeListArg(value: string | string[] | undefined): string[] | undefined {
  if (value === undefined) return undefined;
  const arr = Array.isArray(value) ? value : [value];
  const flat = arr.flatMap(v => v.split(',')).map(v => v.trim()).filter(Boolean);
  return flat.length > 0 ? flat : undefined;
}
