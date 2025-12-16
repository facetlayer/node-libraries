import { describe, it, expect, vi, beforeEach } from 'vitest'
import { OutputParser, stripAnsi } from '../OutputParser'
import type { ParsedEvent } from '../types'

describe('stripAnsi', () => {
  it('should remove ANSI escape codes', () => {
    const input = '\x1b[32mGreen text\x1b[0m'
    expect(stripAnsi(input)).toBe('Green text')
  })

  it('should handle multiple escape codes', () => {
    const input = '\x1b[1m\x1b[34mBold blue\x1b[0m normal'
    expect(stripAnsi(input)).toBe('Bold blue normal')
  })

  it('should handle cursor movement codes', () => {
    const input = '\x1b[2J\x1b[H Hello'
    expect(stripAnsi(input)).toBe(' Hello')
  })

  it('should return plain text unchanged', () => {
    const input = 'Hello, World!'
    expect(stripAnsi(input)).toBe('Hello, World!')
  })
})

describe('OutputParser', () => {
  let parser: OutputParser
  let events: ParsedEvent[]

  beforeEach(() => {
    events = []
    parser = new OutputParser((event) => {
      events.push(event)
    })
  })

  describe('ready detection', () => {
    it('should emit ready event when prompt is detected', () => {
      parser.write('Welcome to Claude Code\n> ')

      const readyEvents = events.filter(e => e.type === 'ready')
      expect(readyEvents.length).toBe(1)
    })

    it('should only emit ready once', () => {
      parser.write('> ')
      parser.write('> ')
      parser.write('> ')

      const readyEvents = events.filter(e => e.type === 'ready')
      expect(readyEvents.length).toBe(1)
    })
  })

  describe('prompt detection', () => {
    it('should emit prompt event when waiting for input', () => {
      // First trigger ready
      parser.write('Welcome\n> ')

      const promptEvents = events.filter(e => e.type === 'prompt')
      expect(promptEvents.length).toBeGreaterThan(0)
    })
  })

  describe('tool use detection', () => {
    it('should detect tool use from "Using tool:" pattern', () => {
      parser.write('Using tool: Bash\n')

      const toolEvents = events.filter(e => e.type === 'tool_use')
      expect(toolEvents.length).toBe(1)
      expect((toolEvents[0].data as any).toolName).toBe('Bash')
    })

    it('should detect tool use from "Running" pattern', () => {
      parser.write('Running Read\n')

      const toolEvents = events.filter(e => e.type === 'tool_use')
      expect(toolEvents.length).toBe(1)
      expect((toolEvents[0].data as any).toolName).toBe('Read')
    })
  })

  describe('assistant message extraction', () => {
    it('should extract clean message text', () => {
      parser.write('Hello, how can I help you today?')
      parser.flush()

      const msgEvents = events.filter(e => e.type === 'assistant_message')
      expect(msgEvents.length).toBeGreaterThan(0)
    })

    it('should strip box drawing characters', () => {
      parser.write('╭───────────╮\n│ Hello │\n╰───────────╯')
      parser.flush()

      const msgEvents = events.filter(e => e.type === 'assistant_message')
      if (msgEvents.length > 0) {
        const message = (msgEvents[0].data as any).message
        expect(message).not.toContain('╭')
        expect(message).not.toContain('│')
      }
    })
  })

  describe('reset', () => {
    it('should clear buffer and state', () => {
      parser.write('Some data')
      parser.reset()

      // After reset, buffer should be clear
      events = []
      parser.write('> ')

      // Should emit ready again after reset
      const readyEvents = events.filter(e => e.type === 'ready')
      expect(readyEvents.length).toBe(1)
    })
  })
})
