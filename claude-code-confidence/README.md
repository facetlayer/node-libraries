# claude-code-confidence

Analyze Claude Code sessions for success metrics, confidence levels, and KPIs.

## Features

- **Session Metrics**: Count messages, tool calls, and unique tools used
- **Permission Tracking**: Detect permission checks and rejections
- **Confidence Analysis**: Heuristic-based confidence scoring from Claude's language
- **Token Usage**: Track input/output tokens and cache usage
- **Session Duration**: Calculate session timing

## Installation

```bash
npm install @facetlayer/claude-code-confidence
```

## CLI Usage

### Analyze a session

```bash
# Analyze by session ID (searches all projects)
claude-code-confidence analyze --session <session-id>

# Analyze with specific project
claude-code-confidence analyze --session <session-id> --project <project-name>

# Output as JSON
claude-code-confidence analyze --session <session-id> --json
```

### List sessions

```bash
claude-code-confidence list --project <project-name>
```

## Programmatic Usage

```typescript
import { analyzeSession, formatMetricsSummary } from '@facetlayer/claude-code-confidence';

// Analyze a session
const metrics = await analyzeSession('session-id-here');

if (metrics) {
  // Print formatted summary
  console.log(formatMetricsSummary(metrics));

  // Or access individual metrics
  console.log(`Confidence: ${metrics.overallConfidence}`);
  console.log(`Tool calls: ${metrics.toolCallCount}`);
  console.log(`Permissions rejected: ${metrics.permissionRejectCount}`);
}
```

## Confidence Heuristics

The tool analyzes Claude's responses for language patterns that indicate confidence:

**High Confidence** (positive indicators):
- "perfect", "excellent", "successfully"
- "working as expected", "all tests pass"
- "no errors", "implementation is complete"

**Medium Confidence** (neutral indicators):
- "should work", "I think", "probably"
- "let me try", "seems to", "appears to"

**Low Confidence** (negative indicators):
- "wait", "actually", "I was wrong"
- "let me reconsider", "that didn't work"
- "I'm not sure", "let me try again"

The overall confidence score is a weighted combination of all detected signals.

## API Reference

### `analyzeSession(sessionId, options?)`

Analyze a session by ID, searching all projects.

```typescript
const metrics = await analyzeSession('abc-123', {
  claudeDir: '~/.claude',  // Optional custom Claude directory
  verbose: false,          // Optional verbose logging
});
```

### `analyzeSessionInProject(sessionId, projectName, options?)`

Analyze a session within a specific project.

### `calculateMetrics(session)`

Calculate metrics from a `ChatSession` object directly.

### `formatMetricsSummary(metrics)`

Format metrics as a human-readable summary string.

### `analyzeTextForConfidence(text)`

Get confidence signals from raw text.

### `getAllPatternRules()`

Get all confidence pattern rules (for debugging/customization).

## Session Metrics

The `SessionMetrics` type includes:

```typescript
interface SessionMetrics {
  sessionId: string;
  projectPath: string;

  // Message counts
  totalMessages: number;
  userMessages: number;
  assistantMessages: number;
  systemMessages: number;

  // Tool usage
  toolCalls: ToolCall[];
  toolCallCount: number;
  uniqueToolsUsed: string[];

  // Permission tracking
  permissionChecks: PermissionCheck[];
  permissionCheckCount: number;
  permissionRejectCount: number;

  // Confidence
  overallConfidence: 'high' | 'medium' | 'low' | 'unknown';
  confidenceScore: number;  // -1 to 1
  confidenceSignals: ConfidenceSignal[];

  // Timing
  startTime?: string;
  endTime?: string;
  durationMinutes?: number;

  // Token usage
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCacheReadTokens: number;
  totalCacheCreationTokens: number;
}
```
