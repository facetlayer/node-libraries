# API Updates for GUI Team

This document describes the database and API changes made to `feedback-tool` that the GUI should be updated to support.

## Summary of Changes

1. **Globally unique ticket IDs** - Every feedback item now has a `ticket_id` field
2. **Comment history** - New `feedback_comments` table tracks comments, status changes, and completion messages
3. **Completed status** - Feedback items can now be marked as `completed`
4. **New queries** - Project listing with active/completed counts, active summary per project

---

## Database Schema Changes

### feedback table - new column: `ticket_id`

```sql
ticket_id TEXT DEFAULT ''
```

- Format: `fb-` followed by 8 hex characters (e.g., `fb-a1b2c3d4`)
- Generated automatically when a feedback item is created
- Globally unique across all projects
- Existing rows have been backfilled with generated IDs
- Indexed: `CREATE INDEX idx_feedback_ticket_id ON feedback(ticket_id)`

### feedback table - status field updated

The `status` column now supports a fourth value:

```
'pending' | 'accepted' | 'rejected' | 'completed'
```

- `completed` indicates the feedback has been addressed
- When set via `setComplete()`, a completion comment is automatically added to the comment history

### New table: `feedback_comments`

```sql
CREATE TABLE feedback_comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id TEXT NOT NULL,
  comment TEXT NOT NULL,
  user TEXT,
  type TEXT DEFAULT 'comment',
  created_at INTEGER NOT NULL
)
```

**Fields:**
- `ticket_id` - References the feedback item's `ticket_id` (not the integer `id`)
- `comment` - The comment text
- `user` - Who posted the comment (nullable)
- `type` - One of: `'comment'`, `'status_change'`, `'completion'`
- `created_at` - Unix timestamp in milliseconds

**Index:** `CREATE INDEX idx_comments_ticket_id ON feedback_comments(ticket_id)`

---

## New TypeScript Types

### `Comment`

```typescript
interface Comment {
  id: number;
  ticket_id: string;
  comment: string;
  user: string | null;
  type: 'comment' | 'status_change' | 'completion';
  created_at: number;
}
```

### `ProjectSummary`

```typescript
interface ProjectSummary {
  library: string;
  total: number;      // Total feedback items
  active: number;     // Items with status 'pending' or 'accepted'
  completed: number;  // Items with status 'completed'
}
```

### `ActiveSummary`

```typescript
interface ActiveSummary {
  library: string;
  accepted: FeedbackItem[];  // Sorted by severity priority
  pending: FeedbackItem[];   // Sorted by severity priority
  total: number;
}
```

### Updated: `FeedbackItem`

```typescript
interface FeedbackItem {
  id: number;
  ticket_id: string;    // NEW - globally unique ID
  library: string;
  description: string;
  severity: Severity;
  status: FeedbackStatus; // Updated to include 'completed'
  context: string | null;
  user: string | null;
  created_at: number;
}
```

### Updated: `FeedbackStatus`

```typescript
type FeedbackStatus = 'pending' | 'accepted' | 'rejected' | 'completed';
```

---

## New API Functions

### `getFeedbackByTicketId(ticketId: string): FeedbackItem | null`

Look up a feedback item by its globally unique ticket ID.

### `addComment(ticketId, comment, type?, user?): Comment`

```typescript
function addComment(
  ticketId: string,
  comment: string,
  type?: 'comment' | 'status_change' | 'completion',  // default: 'comment'
  user?: string
): Comment
```

Add a comment to a feedback item's history.

### `getComments(ticketId: string): Comment[]`

Get all comments for a feedback item, ordered chronologically (oldest first).

### `setComplete(ticketId, message, user?): FeedbackItem | null`

```typescript
function setComplete(
  ticketId: string,
  message: string,
  user?: string
): FeedbackItem | null
```

Mark a feedback item as completed. This:
1. Sets the item's status to `'completed'`
2. Adds a comment of type `'completion'` with the provided message

Returns the updated item, or `null` if the ticket ID was not found.

### `listProjects(): ProjectSummary[]`

List all projects (libraries) that have feedback, with counts of active and completed items.

### `getActiveSummary(library: string): ActiveSummary`

Get all non-completed feedback for a project, grouped into accepted and pending arrays, sorted by severity priority (critical > high > medium > low > positive).

---

## GUI Recommendations

### Displaying completion messages

When a ticket has status `completed`, the GUI should:
1. Show the completion status prominently
2. Display the completion comment from the comment history (where `type === 'completion'`)
3. The completion message describes what was done to address the feedback

### Displaying comment history

Each ticket can have multiple comments. Display them chronologically with:
- The comment type as a label: `[Comment]`, `[Status Change]`, `[Completed]`
- The timestamp
- The user (if present)
- The comment text

### Using ticket IDs

- Always display `ticket_id` (e.g., `fb-a1b2c3d4`) as the primary identifier
- The integer `id` field still exists but `ticket_id` is the user-facing reference
- Use `ticket_id` for all lookups and references

### Project overview

Use `listProjects()` to build a project dashboard showing:
- Project name
- Active item count (pending + accepted)
- Completed item count
- Total count
