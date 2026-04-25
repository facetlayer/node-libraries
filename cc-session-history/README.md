# @facetlayer/cc-session-history

A Node.js library for loading and parsing Claude Code session history files.

Also includes a CLI tool for browsing session history using the command line.

## Installation

```bash
npm install @facetlayer/cc-session-history
```

## API

### List Chat Sessions for a Project

Retrieve all Claude Code chat sessions for a specific project:

```typescript
import { listChatSessions } from '@facetlayer/cc-session-history';

const sessions = await listChatSessions({
  project: 'my-project-name'
});

// Sessions are sorted by most recent first
for (const session of sessions) {
  console.log(`Session ID: ${session.sessionId}`);
  console.log(`Messages: ${session.messageCount}`);
  console.log(`Last active: ${session.lastMessageTimestamp}`);
  console.log(`Project: ${session.projectPath}`);
}
```

### Get Session Details

Retrieve all messages for a specific session:

```typescript
import { getSessionDetails } from '@facetlayer/cc-session-history';

const messages = await getSessionDetails('session-id-here', 'project-name-here');

for (const message of messages) {
  console.log(`${message.type}: ${message.timestamp}`);

  // Check for internal message types
  if (message.internalMessageType === 'hook') {
    console.log('This is a hook message');
  } else if (message.internalMessageType === 'terminal_control') {
    console.log('This is a terminal control message');
  }

  // Access message content, tools used, etc.
  if (message.message?.content) {
    console.log('Content:', message.message.content);
  }
}
```

### Pagination

List sessions with pagination:

```typescript
import { listChatSessions } from '@facetlayer/cc-session-history';

// Get first 10 sessions
const firstPage = await listChatSessions({
  project: 'my-project',
  limit: 10,
  offset: 0
});

// Get next 10 sessions
const secondPage = await listChatSessions({
  project: 'my-project',
  limit: 10,
  offset: 10
});
```

### Custom Claude Directory

The library will look in `~/.claude` by default but you can pass an alternate value for `claudeDir`

```typescript
import { listChatSessions, getSessionDetails } from '@facetlayer/cc-session-history';

const sessions = await listChatSessions({
  project: 'my-project',
  claudeDir: '/custom/path/to/claude',  // Will look in /custom/path/to/claude/projects
  verbose: true // Enable logging
});
```

### `listChatSessions(options)` (async)

Retrieves all Claude Code chat sessions for a specific project.

**Parameters:**
- `options.project` (required): Project path to get sessions for
- `options.claudeDir` (optional): Custom path to Claude directory. Defaults to `~/.claude`
- `options.verbose` (optional): Enable verbose logging. Defaults to `false`
- `options.offset` (optional): Number of sessions to skip (for pagination). Defaults to `0`
- `options.limit` (optional): Maximum number of sessions to return (for pagination)

**Returns:** `Promise<ChatSession[]>`

Sessions are sorted by last message timestamp (most recent first).

**Example:**
```typescript
const sessions = await listChatSessions({
  project: 'my-project-name',
  limit: 10,
  offset: 0
});
```

### `getSessionDetails(sessionId, projectName, options?)` (async)

Retrieves the details (all messages) for a specific session.

**Parameters:**
- `sessionId` (required): The session ID to retrieve
- `projectName` (required): The project name (directory) where the session is stored
- `options.claudeDir` (optional): Custom path to Claude directory. Defaults to `~/.claude`
- `options.verbose` (optional): Enable verbose logging. Defaults to `false`

**Returns:** `Promise<ChatMessage[]>`

Messages include an `internalMessageType` field that can be:
- `'hook'` - PreToolUse hooks
- `'terminal_control'` - Terminal control messages like `/clear`
- `undefined` - Regular messages

**Example:**
```typescript
const messages = await getSessionDetails('abc-123', 'my-project', {
  verbose: true
});
```

## CLI tool usage

```bash
# List all projects
cc-session-history list-projects

# List sessions for a specific project
cc-session-history list-sessions --project <project-name>

# Get details for a single session
cc-session-history get-chat --session <session-id>

# Skills + Claude Routines
cc-session-history list-skills --all-projects
cc-session-history list-routines --all-projects
cc-session-history get-skill-runs <skill-name> --all-projects --since 14d
```

### Filtering sessions by skill or routine

`list-sessions`, `search`, `summarize`, and `list-permission-checks` all accept these
shared filter flags:

| Flag | Behavior |
|---|---|
| `--skill <name>` | Only sessions where the skill (basename of `SKILL.md`'s parent dir, slash command, or Skill tool argument) was invoked. Repeatable / comma-separated. |
| `--routine` | Only sessions started by a Claude Routine (i.e. with a `<scheduled-task>` tag). |
| `--routine-name <name>` | Only sessions whose `<scheduled-task name="…">` matches. Implies `--routine`. |
| `--entrypoint <cli\|claude-desktop>` | Filter by the session's entrypoint. |
| `--since <when>` / `--until <when>` | ISO date or relative duration (`7d`, `24h`, `30m`, `2w`). |

Most listing commands also support `--offset`, `--limit`, `--json`, and `--count`
(prints just the matching count, useful in scripts and skills).

