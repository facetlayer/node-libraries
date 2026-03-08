import { getStateDatabase } from '@facetlayer/user-state-db';
import type { SqliteDatabase } from '@facetlayer/sqlite-wrapper';
import { randomBytes } from 'crypto';

const schema = {
  name: 'tickets-db',
  statements: [
    `CREATE TABLE feedback (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id TEXT DEFAULT '',
      library TEXT NOT NULL,
      description TEXT NOT NULL,
      severity TEXT NOT NULL,
      context TEXT,
      user TEXT,
      created_at INTEGER NOT NULL,
      status TEXT DEFAULT 'pending'
    )`,
    `CREATE INDEX idx_feedback_library ON feedback(library)`,
    `CREATE INDEX idx_feedback_severity ON feedback(severity)`,
    `CREATE INDEX idx_feedback_created_at ON feedback(created_at)`,
    `CREATE INDEX idx_feedback_status ON feedback(status)`,
    `CREATE INDEX idx_feedback_ticket_id ON feedback(ticket_id)`,
    `CREATE TABLE feedback_comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id TEXT NOT NULL,
      comment TEXT NOT NULL,
      user TEXT,
      type TEXT DEFAULT 'comment',
      created_at INTEGER NOT NULL
    )`,
    `CREATE INDEX idx_comments_ticket_id ON feedback_comments(ticket_id)`,
  ],
};

let db: SqliteDatabase | null = null;

function generateTicketId(): string {
  return 'tk-' + randomBytes(4).toString('hex');
}

function backfillTicketIds(db: SqliteDatabase): void {
  const rows = db.list(
    `SELECT id FROM feedback WHERE ticket_id = '' OR ticket_id IS NULL`
  ) as { id: number }[];
  for (const row of rows) {
    db.update('feedback', { id: row.id }, { ticket_id: generateTicketId() });
  }
}

export function getDb(): SqliteDatabase {
  if (!db) {
    db = getStateDatabase({
      appName: 'tickets-tool',
      schema,
      migrationBehavior: 'safe-upgrades',
    });
    backfillTicketIds(db);
  }
  return db;
}

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'positive';
export type FeedbackStatus = 'pending' | 'accepted' | 'rejected' | 'completed';

export interface FeedbackItem {
  id: number;
  ticket_id: string;
  library: string;
  description: string;
  severity: Severity;
  status: FeedbackStatus;
  context: string | null;
  user: string | null;
  created_at: number;
}

export interface Comment {
  id: number;
  ticket_id: string;
  comment: string;
  user: string | null;
  type: 'comment' | 'status_change' | 'completion';
  created_at: number;
}

export interface CreateFeedbackInput {
  library: string;
  description: string;
  severity: Severity;
  context?: string;
  user?: string;
}

export interface ListFeedbackOptions {
  library?: string;
  severity?: Severity;
  status?: FeedbackStatus;
  user?: string;
  limit?: number;
  offset?: number;
}

export interface ListFeedbackResult {
  items: FeedbackItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface LibrarySummary {
  library: string;
  count: number;
}

export interface ProjectSummary {
  library: string;
  total: number;
  active: number;
  completed: number;
}

export interface ActiveSummary {
  library: string;
  accepted: FeedbackItem[];
  pending: FeedbackItem[];
  total: number;
}

export function createFeedback(input: CreateFeedbackInput): FeedbackItem {
  const db = getDb();
  const now = Date.now();
  const ticket_id = generateTicketId();

  db.insert('feedback', {
    ticket_id,
    library: input.library,
    description: input.description,
    severity: input.severity,
    context: input.context ?? null,
    user: input.user ?? null,
    status: 'pending',
    created_at: now,
  });

  const item = db.get(
    `SELECT * FROM feedback WHERE ticket_id = ?`,
    [ticket_id]
  ) as FeedbackItem;

  return item;
}

export function listFeedback(options: ListFeedbackOptions = {}): ListFeedbackResult {
  const db = getDb();
  const limit = options.limit ?? 20;
  const offset = options.offset ?? 0;

  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (options.library) {
    conditions.push('library = ?');
    params.push(options.library);
  }

  if (options.severity) {
    conditions.push('severity = ?');
    params.push(options.severity);
  }

  if (options.status) {
    conditions.push('status = ?');
    params.push(options.status);
  }

  if (options.user) {
    conditions.push('user = ?');
    params.push(options.user);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = db.get(
    `SELECT COUNT(*) as count FROM feedback ${whereClause}`,
    params
  ) as { count: number };
  const total = countResult.count;

  const items = db.list(
    `SELECT * FROM feedback ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  ) as FeedbackItem[];

  return {
    items,
    total,
    limit,
    offset,
  };
}

export function getFeedback(id: number): FeedbackItem | null {
  const db = getDb();
  return db.get(`SELECT * FROM feedback WHERE id = ?`, [id]) as FeedbackItem | null;
}

export function getFeedbackByTicketId(ticketId: string): FeedbackItem | null {
  const db = getDb();
  return db.get(`SELECT * FROM feedback WHERE ticket_id = ?`, [ticketId]) as FeedbackItem | null;
}

export function updateFeedbackStatus(id: number, status: FeedbackStatus): FeedbackItem | null {
  const db = getDb();
  db.update('feedback', { id }, { status });
  return getFeedback(id);
}

export function addComment(
  ticketId: string,
  comment: string,
  type: Comment['type'] = 'comment',
  user?: string
): Comment {
  const db = getDb();
  const now = Date.now();

  db.insert('feedback_comments', {
    ticket_id: ticketId,
    comment,
    user: user ?? null,
    type,
    created_at: now,
  });

  return db.get(
    `SELECT * FROM feedback_comments WHERE ticket_id = ? ORDER BY id DESC LIMIT 1`,
    [ticketId]
  ) as Comment;
}

export function getComments(ticketId: string): Comment[] {
  const db = getDb();
  return db.list(
    `SELECT * FROM feedback_comments WHERE ticket_id = ? ORDER BY created_at ASC`,
    [ticketId]
  ) as Comment[];
}

export function setComplete(ticketId: string, message: string, user?: string): FeedbackItem | null {
  const item = getFeedbackByTicketId(ticketId);
  if (!item) return null;

  const db = getDb();
  db.update('feedback', { id: item.id }, { status: 'completed' });
  addComment(ticketId, message, 'completion', user);

  return getFeedbackByTicketId(ticketId);
}

export function listLibraries(): LibrarySummary[] {
  const db = getDb();
  return db.list(
    `SELECT library, COUNT(*) as count FROM feedback GROUP BY library ORDER BY library ASC`
  ) as LibrarySummary[];
}

export function listProjects(): ProjectSummary[] {
  const db = getDb();
  return db.list(
    `SELECT
      library,
      COUNT(*) as total,
      SUM(CASE WHEN status IN ('pending', 'accepted') THEN 1 ELSE 0 END) as active,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
    FROM feedback
    GROUP BY library
    ORDER BY library ASC`
  ) as ProjectSummary[];
}

const SEVERITY_ORDER = `CASE severity
  WHEN 'critical' THEN 1
  WHEN 'high' THEN 2
  WHEN 'medium' THEN 3
  WHEN 'low' THEN 4
  WHEN 'positive' THEN 5
END`;

export function getActiveSummary(library: string): ActiveSummary {
  const db = getDb();
  const accepted = db.list(
    `SELECT * FROM feedback WHERE library = ? AND status = 'accepted' ORDER BY ${SEVERITY_ORDER} ASC, created_at DESC`,
    [library]
  ) as FeedbackItem[];
  const pending = db.list(
    `SELECT * FROM feedback WHERE library = ? AND status = 'pending' ORDER BY ${SEVERITY_ORDER} ASC, created_at DESC`,
    [library]
  ) as FeedbackItem[];
  return {
    library,
    accepted,
    pending,
    total: accepted.length + pending.length,
  };
}
