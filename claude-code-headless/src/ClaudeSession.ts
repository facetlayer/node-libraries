import * as pty from 'node-pty'
import type {
  ClaudeSessionOptions,
  ClaudeCallbacks,
  SessionState,
  ToolApproval,
  ToolUseEvent,
  ToolResultEvent
} from './types'
import { OutputParser } from './OutputParser'

export class ClaudeSession {
  private ptyProcess: pty.IPty | null = null
  private parser: OutputParser
  private options: ClaudeSessionOptions
  private callbacks: ClaudeCallbacks
  private _state: SessionState = 'starting'

  constructor(options: ClaudeSessionOptions, callbacks: ClaudeCallbacks) {
    this.options = options
    this.callbacks = callbacks

    this.parser = new OutputParser((event) => {
      this.handleParsedEvent(event)
    })
  }

  private log(...args: unknown[]): void {
    if (this.options.verboseLogging) {
      console.log('[claude-headless]', ...args)
    }
  }

  get state(): SessionState {
    return this._state
  }

  async start(): Promise<void> {
    this.log('Starting session...')
    const args: string[] = []

    if (this.options.systemPrompt) {
      args.push('--system-prompt', this.options.systemPrompt)
    }

    if (this.options.model) {
      args.push('--model', this.options.model)
    }

    if (this.options.allowedTools && this.options.allowedTools.length > 0) {
      args.push('--allowedTools', this.options.allowedTools.join(','))
    }

    const env = {
      ...process.env,
      ...this.options.env,
      // Ensure color output for proper parsing
      FORCE_COLOR: '1',
      TERM: 'xterm-256color'
    }

    this.log('Spawning claude with args:', args)
    this.log('Working directory:', this.options.workingDirectory || process.cwd())

    this.ptyProcess = pty.spawn('claude', args, {
      name: 'xterm-256color',
      cols: 120,
      rows: 40,
      cwd: this.options.workingDirectory || process.cwd(),
      env: env as Record<string, string>
    })

    this.log('PTY process spawned, pid:', this.ptyProcess.pid)

    this.ptyProcess.onData((data) => {
      this.log('PTY data received:', data.length, 'bytes')
      if (this.callbacks.onRawOutput) {
        this.callbacks.onRawOutput(data)
      }
      this.parser.write(data)
    })

    this.ptyProcess.onExit(({ exitCode }) => {
      this.log('PTY process exited with code:', exitCode)
      this._state = 'closed'
      if (this.callbacks.onExit) {
        this.callbacks.onExit(exitCode)
      }
    })
  }

  private handleParsedEvent(event: { type: string; data: unknown }): void {
    this.log('Parsed event:', event.type, event.data ? JSON.stringify(event.data).slice(0, 100) : '')

    switch (event.type) {
      case 'ready':
        this.log('State change: ready')
        this._state = 'ready'
        if (this.callbacks.onReady) {
          this.callbacks.onReady()
        }
        break

      case 'prompt':
        this.log('State change: waiting_for_input')
        this._state = 'waiting_for_input'
        break

      case 'assistant_message': {
        const msgData = event.data as { message: string }
        this.log('Assistant message:', msgData.message.slice(0, 100))
        if (this.callbacks.onAssistantMessage) {
          this.callbacks.onAssistantMessage(msgData.message)
        }
        break
      }

      case 'assistant_thinking': {
        const thinkData = event.data as { thinking: string }
        this.log('Assistant thinking:', thinkData.thinking.slice(0, 100))
        if (this.callbacks.onAssistantThinking) {
          this.callbacks.onAssistantThinking(thinkData.thinking)
        }
        break
      }

      case 'tool_use': {
        this.log('State change: awaiting_tool_approval')
        this._state = 'awaiting_tool_approval'
        const toolData = event.data as ToolUseEvent
        this.log('Tool use:', toolData.toolName)
        if (this.callbacks.onToolUse) {
          this.callbacks.onToolUse(toolData).then((approval) => {
            this.handleToolApproval(approval)
          }).catch((err) => {
            if (this.callbacks.onError) {
              this.callbacks.onError(err)
            }
          })
        }
        break
      }

      case 'tool_result': {
        const resultData = event.data as ToolResultEvent
        this.log('Tool result:', resultData.toolId, resultData.isError ? '(error)' : '(success)')
        if (this.callbacks.onToolResult) {
          this.callbacks.onToolResult(resultData)
        }
        break
      }
    }
  }

  private handleToolApproval(approval: ToolApproval): void {
    if (!this.ptyProcess) return

    this.log('Handling tool approval:', approval)

    if (approval === 'approve') {
      this.log('Sending approval: y')
      this.ptyProcess.write('y')
      this._state = 'processing'
    } else if (approval === 'reject') {
      this.log('Sending rejection: n')
      this.ptyProcess.write('n')
      this._state = 'waiting_for_input'
    } else if (typeof approval === 'object' && approval.reject) {
      this.log('Sending rejection with reason:', approval.reject)
      this.ptyProcess.write('n')
      setTimeout(() => {
        if (this.ptyProcess) {
          this.ptyProcess.write(approval.reject + '\r')
        }
      }, 100)
      this._state = 'waiting_for_input'
    }
  }

  sendMessage(text: string): void {
    this.log('sendMessage called, text length:', text.length, 'current state:', this._state)

    if (!this.ptyProcess) {
      throw new Error('Session not started')
    }

    if (this._state !== 'waiting_for_input' && this._state !== 'ready') {
      throw new Error(`Cannot send message in state: ${this._state}`)
    }

    this._state = 'processing'
    this.log('Sending message to PTY')
    this.ptyProcess.write(text + '\r')
  }

  approveToolUse(): void {
    if (!this.ptyProcess) {
      throw new Error('Session not started')
    }

    if (this._state !== 'awaiting_tool_approval') {
      throw new Error(`Not awaiting tool approval, current state: ${this._state}`)
    }

    this.ptyProcess.write('y')
    this._state = 'processing'
  }

  rejectToolUse(reason?: string): void {
    if (!this.ptyProcess) {
      throw new Error('Session not started')
    }

    if (this._state !== 'awaiting_tool_approval') {
      throw new Error(`Not awaiting tool approval, current state: ${this._state}`)
    }

    this.ptyProcess.write('n')

    if (reason) {
      setTimeout(() => {
        if (this.ptyProcess) {
          this.ptyProcess.write(reason + '\r')
        }
      }, 100)
    }

    this._state = 'waiting_for_input'
  }

  interrupt(): void {
    if (!this.ptyProcess) {
      throw new Error('Session not started')
    }

    // Send Ctrl+C
    this.ptyProcess.write('\x03')
    this._state = 'waiting_for_input'
  }

  resize(cols: number, rows: number): void {
    if (this.ptyProcess) {
      this.ptyProcess.resize(cols, rows)
    }
  }

  close(): void {
    this.log('Closing session')
    if (this.ptyProcess) {
      this.parser.flush()
      this.ptyProcess.kill()
      this.ptyProcess = null
    }
    this._state = 'closed'
  }

  writeRaw(data: string): void {
    this.log('writeRaw called, data length:', data.length)
    if (!this.ptyProcess) {
      throw new Error('Session not started')
    }
    this.ptyProcess.write(data)
  }
}

export async function startClaudeSession(
  options: ClaudeSessionOptions,
  callbacks: ClaudeCallbacks
): Promise<ClaudeSession> {
  const session = new ClaudeSession(options, callbacks)
  await session.start()
  return session
}
