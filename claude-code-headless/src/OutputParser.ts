import type { ParsedEvent, ToolUseEvent, ToolResultEvent } from './types'

// ANSI escape code regex
const ANSI_REGEX = /\x1b\[[0-9;]*[a-zA-Z]|\x1b\][^\x07]*\x07|\x1b[PX^_][^\x1b]*\x1b\\|\x1b.|\x9b[0-9;]*[a-zA-Z]/g

export function stripAnsi(str: string): string {
  return str.replace(ANSI_REGEX, '')
}

export type EventCallback = (event: ParsedEvent) => void

type ParserState = 'idle' | 'in_message' | 'in_tool_use' | 'in_tool_result'

export class OutputParser {
  private buffer: string = ''
  private callback: EventCallback
  private state: ParserState = 'idle'
  private currentMessage: string = ''
  private currentToolUse: Partial<ToolUseEvent> | null = null
  private currentToolResult: Partial<ToolResultEvent> | null = null
  private hasEmittedReady: boolean = false

  constructor(callback: EventCallback) {
    this.callback = callback
  }

  write(data: string): void {
    this.buffer += data
    this.processBuffer()
  }

  private processBuffer(): void {
    const clean = stripAnsi(this.buffer)

    // Detect ready state - when we see the initial prompt
    if (!this.hasEmittedReady && this.detectReady(clean)) {
      this.hasEmittedReady = true
      this.callback({ type: 'ready', data: null })
    }

    // Detect user prompt (waiting for input)
    if (this.detectPrompt(clean)) {
      this.flushCurrentMessage()
      this.callback({ type: 'prompt', data: null })
    }

    // Detect tool use patterns
    const toolUse = this.detectToolUse(clean)
    if (toolUse) {
      this.flushCurrentMessage()
      this.callback({ type: 'tool_use', data: toolUse })
    }

    // Detect tool result patterns
    const toolResult = this.detectToolResult(clean)
    if (toolResult) {
      this.callback({ type: 'tool_result', data: toolResult })
    }

    // Accumulate assistant message content
    const message = this.extractAssistantMessage(clean)
    if (message) {
      this.currentMessage += message
    }

    // Clear processed buffer (keep last chunk for boundary detection)
    if (this.buffer.length > 10000) {
      this.buffer = this.buffer.slice(-2000)
    }
  }

  private flushCurrentMessage(): void {
    if (this.currentMessage.trim()) {
      this.callback({
        type: 'assistant_message',
        data: { message: this.currentMessage.trim() }
      })
      this.currentMessage = ''
    }
  }

  private detectReady(clean: string): boolean {
    // Claude Code shows a prompt when ready
    // Common patterns: "> ", "claude> ", or similar
    return clean.includes('> ') || clean.includes('claude>') || clean.includes('What would you like to do?')
  }

  private detectPrompt(clean: string): boolean {
    // Detect when Claude is waiting for user input
    const promptPatterns = [
      />\s*$/m,
      /What would you like/i,
      /Enter your message/i,
      /Type.*to continue/i
    ]
    return promptPatterns.some(p => p.test(clean))
  }

  private detectToolUse(clean: string): ToolUseEvent | null {
    // Claude Code shows tool use in a specific format
    // Look for patterns like "Using tool: Bash" or tool invocation boxes
    const toolUsePatterns = [
      /(?:Using|Calling|Running)\s+(?:tool[:\s]+)?(\w+)/i,
      /Tool:\s*(\w+)/i,
      /\[(\w+)\]\s*$/m
    ]

    for (const pattern of toolUsePatterns) {
      const match = clean.match(pattern)
      if (match) {
        return {
          toolName: match[1],
          toolId: `tool_${Date.now()}`,
          input: {}
        }
      }
    }

    return null
  }

  private detectToolResult(clean: string): ToolResultEvent | null {
    // Detect tool results/output
    const resultPatterns = [
      /Tool result:/i,
      /Output:/i,
      /Result:/i
    ]

    for (const pattern of resultPatterns) {
      if (pattern.test(clean)) {
        return {
          toolId: `tool_${Date.now()}`,
          output: clean,
          isError: clean.toLowerCase().includes('error')
        }
      }
    }

    return null
  }

  private extractAssistantMessage(clean: string): string {
    // Extract the actual assistant message content
    // Filter out UI elements, boxes, spinners, etc.

    // Remove common TUI elements
    let message = clean
      .replace(/[─│┌┐└┘├┤┬┴┼╭╮╯╰]/g, '') // Box drawing chars
      .replace(/[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏]/g, '')       // Spinner chars
      .replace(/\s*>\s*$/gm, '')            // Prompts
      .replace(/^\s*\n/gm, '')              // Empty lines
      .trim()

    return message
  }

  reset(): void {
    this.buffer = ''
    this.state = 'idle'
    this.currentMessage = ''
    this.currentToolUse = null
    this.currentToolResult = null
  }

  flush(): void {
    this.flushCurrentMessage()
  }
}
