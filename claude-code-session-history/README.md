# @facetlayer/claude-code-session-history

A Node.js library for loading and parsing Claude Code session history files.

## Installation

```bash
npm install @facetlayer/claude-code-session-history
```

## Usage

### Get All Chat Sessions

Retrieve all Claude Code chat sessions from the default history location (`~/.claude/projects`):

```typescript
import { getChatSessions } from '@facetlayer/claude-code-session-history';

const projects = await getChatSessions();

// Projects are sorted by most recent session
for (const project of projects) {
  console.log(`Project: ${project.path}`);

  // Sessions within each project are also sorted by most recent
  for (const session of project.sessions) {
    console.log(`  Session ID: ${session.sessionId}`);
    console.log(`  Messages: ${session.messageCount}`);
    console.log(`  Last active: ${session.lastMessageTimestamp}`);
  }
}
```

### Get Session Details

Retrieve all messages for a specific session:

```typescript
import { getSessionDetails } from '@facetlayer/claude-code-session-history';

const messages = await getSessionDetails('session-id-here', 'project-name-here');

for (const message of messages) {
  console.log(`${message.type}: ${message.timestamp}`);
  // Access message content, tools used, etc.
}
```

### Custom Claude Directory

If your Claude history is stored in a non-standard location:

```typescript
import { getChatSessions, getSessionDetails } from '@facetlayer/claude-code-session-history';

const projects = await getChatSessions({
  claudeDir: '/custom/path/to/claude/projects',
  verbose: true // Enable logging
});

const messages = await getSessionDetails('session-id', 'project-name', {
  claudeDir: '/custom/path/to/claude/projects',
  verbose: true
});
```

## API

### `getChatSessions(options?)` (async)

Retrieves all Claude Code chat sessions from the history files.

**Parameters:**
- `options.claudeDir` (optional): Custom path to Claude directory. Defaults to `~/.claude/projects`
- `options.verbose` (optional): Enable verbose logging. Defaults to `false`

**Returns:** `Promise<ProjectDirectory[]>`

### `getSessionDetails(sessionId, projectName, options?)` (async)

Retrieves the details (all messages) for a specific session.

**Parameters:**
- `sessionId`: The session ID to retrieve
- `projectName`: The project name (directory) where the session is stored
- `options.claudeDir` (optional): Custom path to Claude directory. Defaults to `~/.claude/projects`
- `options.verbose` (optional): Enable verbose logging. Defaults to `false`

**Returns:** `Promise<ChatMessage[]>`

### `annotateInternalMessages(messages)`

Utility function that annotates messages with internal message types (hooks, terminal control).

**Parameters:**
- `messages`: Array of `ChatMessage` objects to annotate (modifies in place)

## Types

### `ProjectDirectory`

```typescript
interface ProjectDirectory {
  path: string;
  sessions: ChatSession[];
}
```

### `ChatSession`

```typescript
interface ChatSession {
  sessionId: string;
  messages: ChatMessage[];
  firstMessageTimestamp: string;
  lastMessageTimestamp: string;
  projectPath: string;
  messageCount: number;
}
```

### `ChatMessage`

See the full type definition in the source code. Includes message content, metadata, tool usage, token counts, and more.

## License

MIT
