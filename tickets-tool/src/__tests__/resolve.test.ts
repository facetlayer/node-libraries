import { describe, it, expect, afterAll } from 'vitest';
import {
  createFeedback,
  getFeedbackByTicketId,
  updateFeedbackStatus,
  addComment,
  getComments,
  getDb,
} from '../db.ts';

// Each test suite gets a unique library name to avoid cross-test pollution
const TEST_LIBRARY = `test-resolve-${Date.now()}`;

// Clean up all test data after the suite
afterAll(() => {
  const db = getDb();
  const items = db.list(
    `SELECT ticket_id FROM feedback WHERE library = ?`,
    [TEST_LIBRARY]
  ) as { ticket_id: string }[];
  for (const row of items) {
    db.run(`DELETE FROM feedback_comments WHERE ticket_id = ?`, [row.ticket_id]);
  }
  db.run(`DELETE FROM feedback WHERE library = ?`, [TEST_LIBRARY]);
});

describe('resolve workflow', () => {
  it('sets status to completed and records a completion comment', () => {
    const item = createFeedback({
      library: TEST_LIBRARY,
      description: 'Test ticket for resolve',
      severity: 'medium',
    });

    expect(item.status).toBe('pending');

    updateFeedbackStatus(item.id, 'completed');
    addComment(item.ticket_id, 'Fixed in v1.2', 'completion', 'andy');

    const updated = getFeedbackByTicketId(item.ticket_id)!;
    expect(updated.status).toBe('completed');

    const comments = getComments(item.ticket_id);
    expect(comments).toHaveLength(1);
    expect(comments[0].type).toBe('completion');
    expect(comments[0].comment).toBe('Fixed in v1.2');
    expect(comments[0].user).toBe('andy');
  });

  it('can resolve a ticket from accepted state', () => {
    const item = createFeedback({
      library: TEST_LIBRARY,
      description: 'Ticket that gets accepted then resolved',
      severity: 'high',
    });

    updateFeedbackStatus(item.id, 'accepted');
    const accepted = getFeedbackByTicketId(item.ticket_id)!;
    expect(accepted.status).toBe('accepted');

    updateFeedbackStatus(item.id, 'completed');
    addComment(item.ticket_id, 'Resolved after review', 'completion');

    const resolved = getFeedbackByTicketId(item.ticket_id)!;
    expect(resolved.status).toBe('completed');

    const comments = getComments(item.ticket_id);
    expect(comments).toHaveLength(1);
    expect(comments[0].type).toBe('completion');
  });

  it('resolve message is distinct from regular comments', () => {
    const item = createFeedback({
      library: TEST_LIBRARY,
      description: 'Ticket with mixed comment history',
      severity: 'low',
    });

    addComment(item.ticket_id, 'Investigating now', 'comment', 'alice');
    addComment(item.ticket_id, 'Confirmed reproducible', 'comment', 'bob');
    updateFeedbackStatus(item.id, 'completed');
    addComment(item.ticket_id, 'Deployed fix in v2.0', 'completion', 'alice');

    const comments = getComments(item.ticket_id);
    expect(comments).toHaveLength(3);
    expect(comments[0].type).toBe('comment');
    expect(comments[1].type).toBe('comment');
    expect(comments[2].type).toBe('completion');
    expect(comments[2].comment).toBe('Deployed fix in v2.0');

    const resolved = getFeedbackByTicketId(item.ticket_id)!;
    expect(resolved.status).toBe('completed');
  });

  it('resolve without a user still records the comment', () => {
    const item = createFeedback({
      library: TEST_LIBRARY,
      description: 'Anonymous resolution test',
      severity: 'low',
    });

    updateFeedbackStatus(item.id, 'completed');
    addComment(item.ticket_id, 'Auto-resolved', 'completion');

    const comments = getComments(item.ticket_id);
    expect(comments).toHaveLength(1);
    expect(comments[0].user).toBeNull();
    expect(comments[0].comment).toBe('Auto-resolved');
  });
});
