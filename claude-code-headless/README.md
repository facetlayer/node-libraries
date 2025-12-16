# @facetlayer/claude-code-headless

Run Claude Code CLI in headless mode with structured event callbacks. This library spawns the `claude` CLI in a PTY (pseudo-terminal), parses its TUI output into structured events, and allows programmatic interaction.

## Installation

```bash
npm install @facetlayer/claude-code-headless
```

**Prerequisites**: The `claude` CLI must be installed and available in your PATH.

## Quick Start

```typescript
import { startClaudeSession } from '@facetlayer/claude-code-headless'

const session = await startClaudeSession({
  workingDirectory: '/path/to/project'
}, {
  onReady: () => {
    console.log('Claude is ready!')
    session.sendMessage('Hello, Claude!')
  },
  onAssistantMessage: (message) => {
    console.log('Claude:', message)
  },
  onToolUse: async (tool) => {
    console.log(`Claude wants to use: ${tool.toolName}`)
    return 'approve' // or 'reject'
  },
  onExit: (code) => {
    console.log('Session ended with code:', code)
  }
})
```

## API

### `startClaudeSession(options, callbacks)`

Creates and starts a new Claude session.

**Parameters:**

- `options`: `ClaudeSessionOptions` - Configuration options
- `callbacks`: `ClaudeCallbacks` - Event callback functions

**Returns:** `Promise<ClaudeSession>`

### ClaudeSessionOptions

```typescript
interface ClaudeSessionOptions {
  workingDirectory?: string    // Directory to run Claude in
  model?: string              // Model to use (e.g., 'opus', 'sonnet')
  systemPrompt?: string       // Custom system prompt
  allowedTools?: string[]     // List of allowed tools
  env?: Record<string, string> // Additional environment variables
}
```

### ClaudeCallbacks

```typescript
interface ClaudeCallbacks {
  onReady?: () => void
  onAssistantMessage?: (message: string) => void
  onAssistantThinking?: (thinking: string) => void
  onToolUse?: (tool: ToolUseEvent) => Promise<ToolApproval>
  onToolResult?: (result: ToolResultEvent) => void
  onError?: (error: Error) => void
  onExit?: (code: number) => void
  onRawOutput?: (data: string) => void
}
```

### ToolUseEvent

```typescript
interface ToolUseEvent {
  toolName: string
  toolId: string
  input: Record<string, unknown>
}
```

### ToolApproval

```typescript
type ToolApproval = 'approve' | 'reject' | { reject: string }
```

### ClaudeSession

The session object provides these methods:

#### `sendMessage(text: string)`

Send a user message to Claude.

```typescript
session.sendMessage('Please read the README file')
```

#### `approveToolUse()`

Manually approve a pending tool use request.

```typescript
session.approveToolUse()
```

#### `rejectToolUse(reason?: string)`

Manually reject a pending tool use request.

```typescript
session.rejectToolUse('Not allowed to modify that file')
```

#### `interrupt()`

Send Ctrl+C to interrupt the current operation.

```typescript
session.interrupt()
```

#### `close()`

Terminate the session.

```typescript
session.close()
```

#### `writeRaw(data: string)`

Write raw data directly to the PTY (for advanced use cases).

```typescript
session.writeRaw('\x03') // Send Ctrl+C
```

#### `state: SessionState`

Get the current session state.

```typescript
type SessionState =
  | 'starting'
  | 'ready'
  | 'waiting_for_input'
  | 'processing'
  | 'awaiting_tool_approval'
  | 'closed'
```

## Examples

### Auto-approve all tools

```typescript
const session = await startClaudeSession({
  workingDirectory: process.cwd()
}, {
  onReady: () => {
    session.sendMessage('List all TypeScript files')
  },
  onToolUse: async (tool) => {
    console.log(`Auto-approving: ${tool.toolName}`)
    return 'approve'
  },
  onAssistantMessage: console.log
})
```

### Selective tool approval

```typescript
const session = await startClaudeSession({}, {
  onToolUse: async (tool) => {
    // Only allow read operations
    if (tool.toolName === 'Read' || tool.toolName === 'Glob') {
      return 'approve'
    }
    return { reject: 'Only read operations are allowed' }
  }
})
```

### Debug raw output

```typescript
const session = await startClaudeSession({}, {
  onRawOutput: (data) => {
    process.stdout.write(data) // See exactly what Claude outputs
  }
})
```

## Development

```bash
# Install dependencies
pnpm install

# Build
pnpm build

# Run tests
pnpm test
```

## License

MIT
