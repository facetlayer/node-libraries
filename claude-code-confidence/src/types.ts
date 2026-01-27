export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'unknown';

export interface ConfidenceSignal {
  pattern: string;
  level: ConfidenceLevel;
  weight: number;
  matchedText?: string;
  lineNumber?: number;
}

export interface MessageConfidence {
  level: ConfidenceLevel;
  score: number;
  signals: ConfidenceSignal[];
}

export interface ToolCall {
  name: string;
  id: string;
  input?: any;
  timestamp?: string;
}

export interface PermissionCheck {
  toolName: string;
  toolId: string;
  wasRejected: boolean;
  timestamp?: string;
}

export interface SessionMetrics {
  sessionId: string;
  projectPath: string;

  // Basic counts
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

  // Confidence analysis
  overallConfidence: ConfidenceLevel;
  confidenceScore: number;
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

export interface AnalyzeSessionOptions {
  claudeDir?: string;
  verbose?: boolean;
}
