---
name: scanning-permission-checks
description: How to find tool permission rejections in a project's session history
---

# Scanning for Permission Checks

This guide shows how to use `cc-session-history` to find instances where a user
rejected a tool permission prompt in Claude Code sessions.

## Background

When Claude Code requests to use a tool (e.g., Edit, Bash, Write), the user can
approve or reject the action. Rejected tool uses are recorded in the session
history as user messages containing a `tool_result` block with `is_error: true`
and a specific rejection message.

The library automatically detects these rejections and annotates messages with
`permissionResult: 'rejected'`.

## Using the CLI

### Search for rejections by text

The simplest approach is to search for the rejection message text:

```bash
# Search current project
cc-session-history search "rejected"

# Search all projects
cc-session-history search "rejected" --all-projects
```

### Inspect a specific session

Once you find a session with rejections, use `get-chat` to see the full
conversation context:

```bash
cc-session-history get-chat --session <session-id> --verbose
```

The `--verbose` flag shows tool use inputs and tool result details, which helps
you see exactly what action was rejected.

### JSON output for scripting

Use `--json` to get structured output you can pipe through `jq`:

```bash
# Get a session as JSON and filter for rejected permission messages
cc-session-history get-chat --session <session-id> --json \
  | jq '.messages[] | select(.permissionResult == "rejected")'
```

To find the tool that was rejected, look at the preceding assistant message's
`tool_use` block. The rejection's `tool_use_id` maps back to the assistant's
tool call:

```bash
# Show rejected tool names with context
cc-session-history get-chat --session <session-id> --json \
  | jq '[.messages[] | {type, timestamp, permissionResult, tools: ([.message.content[]? | select(.type == "tool_use") | .name] // empty)}] | map(select(.permissionResult or (.tools | length > 0)))'
```

## Using the Library API

For programmatic analysis, use the exported functions directly:

```typescript
import {
  listChatSessions,
  annotateMessages
} from '@facetlayer/cc-session-history';

const sessions = await listChatSessions({ project: '-Users-me-my-project' });

for (const session of sessions) {
  const rejected = session.messages.filter(m => m.permissionResult === 'rejected');

  if (rejected.length > 0) {
    console.log(`Session ${session.sessionId}: ${rejected.length} rejection(s)`);

    for (const msg of rejected) {
      // Find the tool_use_id from the rejection
      const content = msg.message?.content;
      if (Array.isArray(content)) {
        for (const block of content) {
          if (block.type === 'tool_result' && block.is_error) {
            console.log(`  Rejected tool_use_id: ${block.tool_use_id}`);
          }
        }
      }
    }
  }
}
```

Messages are annotated automatically when loaded via `listChatSessions` or
`getSessionDetails`. If you load messages manually, call `annotateMessages()`
to add the `permissionResult` field.

## What gets detected

The annotation logic looks for user messages where:

1. The message type is `user`
2. The content array contains a `tool_result` block
3. That block has `is_error: true`
4. The content includes the text: "The user doesn't want to proceed with this tool use. The tool use was rejected"

This covers all cases where a user clicks "Reject" or "Don't allow" on a tool
permission prompt in Claude Code.
