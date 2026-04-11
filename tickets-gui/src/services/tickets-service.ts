import { createEndpoint } from '@facetlayer/prism-framework';
import type { ServiceDefinition } from '@facetlayer/prism-framework';
import { z } from 'zod';
import {
  listFeedback,
  getFeedback,
  updateFeedbackStatus,
  getComments,
  getDb,
} from '@facetlayer/tickets-tool';
import type { FeedbackItem, FeedbackStatus, Severity } from '@facetlayer/tickets-tool';

const getLibraries = createEndpoint({
  method: 'GET',
  path: '/feedback/libraries',
  description: 'List all libraries with active feedback counts',
  handler: async () => {
    const db = getDb();
    const libraries = db.list(
      `SELECT library, COUNT(*) as count FROM feedback WHERE status IN ('pending', 'accepted') GROUP BY library ORDER BY library ASC`
    ) as { library: string; count: number }[];
    return { libraries };
  },
});

const listFeedbackItems = createEndpoint({
  method: 'GET',
  path: '/feedback',
  description: 'List feedback items with optional filters',
  requestSchema: z.object({
    library: z.string().optional(),
    severity: z.string().optional(),
    status: z.string().optional(),
    limit: z.coerce.number().optional(),
    page: z.coerce.number().optional(),
  }),
  handler: async (input) => {
    const page = input.page ?? 1;
    const limit = input.limit ?? 50;
    const offset = (page - 1) * limit;

    // "active" maps to pending + accepted, "closed" maps to completed + rejected
    if (input.status === 'active') {
      const db = getDb();
      const conditions: string[] = ["status IN ('pending', 'accepted')"];
      const params: (string | number)[] = [];

      if (input.library) {
        conditions.push('library = ?');
        params.push(input.library);
      }
      if (input.severity) {
        conditions.push('severity = ?');
        params.push(input.severity);
      }

      const whereClause = `WHERE ${conditions.join(' AND ')}`;
      const countResult = db.get(
        `SELECT COUNT(*) as count FROM feedback ${whereClause}`,
        params
      ) as { count: number };
      const total = countResult.count;
      const items = db.list(
        `SELECT * FROM feedback ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      ) as FeedbackItem[];

      return { items, total, limit, offset, page, totalPages: Math.ceil(total / limit) };
    }

    if (input.status === 'closed') {
      const db = getDb();
      const conditions: string[] = ["status IN ('completed', 'rejected')"];
      const params: (string | number)[] = [];

      if (input.library) {
        conditions.push('library = ?');
        params.push(input.library);
      }
      if (input.severity) {
        conditions.push('severity = ?');
        params.push(input.severity);
      }

      const whereClause = `WHERE ${conditions.join(' AND ')}`;
      const countResult = db.get(
        `SELECT COUNT(*) as count FROM feedback ${whereClause}`,
        params
      ) as { count: number };
      const total = countResult.count;
      const items = db.list(
        `SELECT * FROM feedback ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      ) as FeedbackItem[];

      return { items, total, limit, offset, page, totalPages: Math.ceil(total / limit) };
    }

    const result = listFeedback({
      library: input.library,
      severity: input.severity as Severity | undefined,
      status: input.status as FeedbackStatus | undefined,
      limit,
      offset,
    });
    return {
      ...result,
      page,
      totalPages: Math.ceil(result.total / limit),
    };
  },
});

const getFeedbackItem = createEndpoint({
  method: 'GET',
  path: '/feedback/:id',
  description: 'Get a single feedback item',
  requestSchema: z.object({
    id: z.coerce.number(),
  }),
  handler: async (input) => {
    const item = getFeedback(input.id);
    if (!item) {
      throw new Error(`Feedback item #${input.id} not found`);
    }
    return { item };
  },
});

const deleteLibrary = createEndpoint({
  method: 'DELETE',
  path: '/feedback/libraries/:name',
  description: 'Delete all feedback for a library',
  requestSchema: z.object({
    name: z.string(),
  }),
  handler: async (input) => {
    const db = getDb();
    db.run(`DELETE FROM feedback WHERE library = ?`, [input.name]);
    return { deleted: true, library: input.name };
  },
});

const updateStatus = createEndpoint({
  method: 'PATCH',
  path: '/feedback/:id/status',
  description: 'Update the status of a feedback item (accept or reject)',
  requestSchema: z.object({
    id: z.coerce.number(),
    status: z.enum(['pending', 'accepted', 'rejected', 'completed']),
  }),
  handler: async (input) => {
    const item = updateFeedbackStatus(input.id, input.status as FeedbackStatus);
    if (!item) {
      throw new Error(`Feedback item #${input.id} not found`);
    }
    return { item };
  },
});

const getTicketDetail = createEndpoint({
  method: 'GET',
  path: '/feedback/:id/comments',
  description: 'Get a feedback item with its full comment history',
  requestSchema: z.object({
    id: z.coerce.number(),
  }),
  handler: async (input) => {
    const item = getFeedback(input.id);
    if (!item) throw new Error(`Feedback item #${input.id} not found`);
    const comments = getComments(item.ticket_id);
    return { item, comments };
  },
});

const deleteTicket = createEndpoint({
  method: 'DELETE',
  path: '/feedback/:id',
  description: 'Delete a single feedback item and its comments',
  requestSchema: z.object({
    id: z.coerce.number(),
  }),
  handler: async (input) => {
    const item = getFeedback(input.id);
    if (!item) throw new Error(`Feedback item #${input.id} not found`);
    const db = getDb();
    db.run(`DELETE FROM feedback_comments WHERE ticket_id = ?`, [item.ticket_id]);
    db.run(`DELETE FROM feedback WHERE id = ?`, [input.id]);
    return { deleted: true, id: input.id };
  },
});

export const ticketsService: ServiceDefinition = {
  name: 'tickets',
  endpoints: [getLibraries, listFeedbackItems, getFeedbackItem, getTicketDetail, updateStatus, deleteLibrary, deleteTicket],
};
