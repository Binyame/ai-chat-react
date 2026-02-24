import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  generateMessageId,
  createMessage,
  formatMessageTime,
  formatConversationForHuggingFace,
  canMakeRequest,
  getTimeRemaining,
} from '../../utils/helpers'
import { Message } from '../../types'

describe('helpers', () => {
  describe('generateMessageId', () => {
    it('should generate a unique ID with msg_ prefix', () => {
      const id = generateMessageId()
      expect(id).toMatch(/^msg_\d+_[a-z0-9]+$/)
    })

    it('should generate different IDs on each call', () => {
      const id1 = generateMessageId()
      const id2 = generateMessageId()
      expect(id1).not.toBe(id2)
    })
  })

  describe('createMessage', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-01-15T10:00:00Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should create a user message with all required fields', () => {
      const message = createMessage('user', 'Hello world')

      expect(message).toHaveProperty('id')
      expect(message.role).toBe('user')
      expect(message.content).toBe('Hello world')
      expect(message.timestamp).toBe('2024-01-15T10:00:00.000Z')
      expect(message).toHaveProperty('provider')
    })

    it('should create an assistant message', () => {
      const message = createMessage('assistant', 'Hello, how can I help?')

      expect(message.role).toBe('assistant')
      expect(message.content).toBe('Hello, how can I help?')
    })

    it('should include provider when specified', () => {
      const message = createMessage('assistant', 'Response', 'openai')

      expect(message.provider).toBe('openai')
    })
  })

  describe('formatMessageTime', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-01-15T12:00:00Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should return empty string for undefined timestamp', () => {
      expect(formatMessageTime()).toBe('')
    })

    it('should return "now" for timestamps less than 1 minute ago', () => {
      const timestamp = new Date('2024-01-15T11:59:30Z').toISOString()
      expect(formatMessageTime(timestamp)).toBe('now')
    })

    it('should return minutes for timestamps less than 1 hour ago', () => {
      const timestamp = new Date('2024-01-15T11:45:00Z').toISOString()
      expect(formatMessageTime(timestamp)).toBe('15m ago')
    })

    it('should return hours for timestamps less than 24 hours ago', () => {
      const timestamp = new Date('2024-01-15T10:00:00Z').toISOString()
      expect(formatMessageTime(timestamp)).toBe('2h ago')
    })

    it('should return days for timestamps less than 7 days ago', () => {
      const timestamp = new Date('2024-01-13T12:00:00Z').toISOString()
      expect(formatMessageTime(timestamp)).toBe('2d ago')
    })

    it('should return formatted date for timestamps older than 7 days', () => {
      const timestamp = new Date('2024-01-01T12:00:00Z').toISOString()
      const result = formatMessageTime(timestamp)
      expect(result).toMatch(/1\/1\/2024/)
    })
  })

  describe('formatConversationForHuggingFace', () => {
    it('should format empty conversation', () => {
      expect(formatConversationForHuggingFace([])).toBe('')
    })

    it('should format single user message', () => {
      const messages: Message[] = [{
        id: '1',
        role: 'user',
        content: 'Hello',
        timestamp: new Date().toISOString()
      }]

      expect(formatConversationForHuggingFace(messages)).toBe('Human: Hello')
    })

    it('should format multiple messages with correct roles', () => {
      const messages: Message[] = [
        {
          id: '1',
          role: 'user',
          content: 'What is AI?',
          timestamp: new Date().toISOString()
        },
        {
          id: '2',
          role: 'assistant',
          content: 'AI is artificial intelligence',
          timestamp: new Date().toISOString()
        },
        {
          id: '3',
          role: 'user',
          content: 'Tell me more',
          timestamp: new Date().toISOString()
        }
      ]

      const result = formatConversationForHuggingFace(messages)
      expect(result).toBe('Human: What is AI?\nAssistant: AI is artificial intelligence\nHuman: Tell me more')
    })
  })

  describe('canMakeRequest', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should return true when enough time has passed', () => {
      const lastRequestTime = Date.now() - 5000 // 5 seconds ago
      const minInterval = 3000 // 3 seconds

      expect(canMakeRequest(lastRequestTime, minInterval)).toBe(true)
    })

    it('should return false when not enough time has passed', () => {
      const lastRequestTime = Date.now() - 1000 // 1 second ago
      const minInterval = 3000 // 3 seconds

      expect(canMakeRequest(lastRequestTime, minInterval)).toBe(false)
    })

    it('should return true when exactly at the interval', () => {
      const lastRequestTime = Date.now() - 3000
      const minInterval = 3000

      expect(canMakeRequest(lastRequestTime, minInterval)).toBe(true)
    })
  })

  describe('getTimeRemaining', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should return remaining time when interval has not passed', () => {
      const lastRequestTime = Date.now() - 2000 // 2 seconds ago
      const minInterval = 5000 // 5 seconds

      expect(getTimeRemaining(lastRequestTime, minInterval)).toBe(3000)
    })

    it('should return 0 when interval has passed', () => {
      const lastRequestTime = Date.now() - 6000 // 6 seconds ago
      const minInterval = 5000 // 5 seconds

      expect(getTimeRemaining(lastRequestTime, minInterval)).toBe(0)
    })

    it('should return 0 when exactly at the interval', () => {
      const lastRequestTime = Date.now() - 5000
      const minInterval = 5000

      expect(getTimeRemaining(lastRequestTime, minInterval)).toBe(0)
    })
  })
})
