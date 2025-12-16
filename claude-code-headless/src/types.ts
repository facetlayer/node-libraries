export interface ClaudeSessionOptions {
  workingDirectory?: string
  model?: string
  systemPrompt?: string
  allowedTools?: string[]
  env?: Record<string, string>
  verboseLogging?: boolean
}

export interface ClaudeCallbacks {
  onReady?: () => void
  onAssistantMessage?: (message: string) => void
  onAssistantThinking?: (thinking: string) => void
  onToolUse?: (tool: ToolUseEvent) => Promise<ToolApproval>
  onToolResult?: (result: ToolResultEvent) => void
  onError?: (error: Error) => void
  onExit?: (code: number) => void
  onRawOutput?: (data: string) => void
}

export interface ToolUseEvent {
  toolName: string
  toolId: string
  input: Record<string, unknown>
}

export interface ToolResultEvent {
  toolId: string
  output: string
  isError: boolean
}

export type ToolApproval = 'approve' | 'reject' | { reject: string }

export type SessionState =
  | 'starting'
  | 'ready'
  | 'waiting_for_input'
  | 'processing'
  | 'awaiting_tool_approval'
  | 'closed'

export interface ParsedEvent {
  type: 'assistant_message' | 'assistant_thinking' | 'tool_use' | 'tool_result' | 'ready' | 'prompt'
  data: unknown
}

export interface AssistantMessageEvent extends ParsedEvent {
  type: 'assistant_message'
  data: { message: string }
}

export interface AssistantThinkingEvent extends ParsedEvent {
  type: 'assistant_thinking'
  data: { thinking: string }
}

export interface ToolUseEventParsed extends ParsedEvent {
  type: 'tool_use'
  data: ToolUseEvent
}

export interface ToolResultEventParsed extends ParsedEvent {
  type: 'tool_result'
  data: ToolResultEvent
}

export interface ReadyEvent extends ParsedEvent {
  type: 'ready'
  data: null
}

export interface PromptEvent extends ParsedEvent {
  type: 'prompt'
  data: null
}
