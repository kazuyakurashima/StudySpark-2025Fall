/**
 * E2E Test for Chat API
 * Tests the /api/chat endpoint with OpenAI integration
 */

import { describe, test, expect, beforeAll } from '@jest/globals'

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
const openaiApiKey = process.env.OPENAI_API_KEY

describe('Chat API E2E', () => {
  beforeAll(() => {
    // Skip all tests if OpenAI API key is not configured
    if (!openaiApiKey) {
      console.log('OPENAI_API_KEY not configured, skipping Chat API E2E tests')
    }
  })

  test('should respond with 200 when OpenAI API key is configured', async () => {
    // Skip test if OpenAI API key is not set
    if (!openaiApiKey) {
      console.log('Skipping test: OPENAI_API_KEY not configured')
      return
    }

    const response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: 'Hello, this is a test message'
          }
        ]
      })
    })

    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data).toHaveProperty('message')
    expect(data.message).toHaveProperty('role')
    expect(data.message).toHaveProperty('content')
    expect(data.message.role).toBe('assistant')
    expect(typeof data.message.content).toBe('string')
    expect(data.message.content.length).toBeGreaterThan(0)

    // Check optional properties
    expect(data).toHaveProperty('model')
    expect(data).toHaveProperty('created')
    expect(data).toHaveProperty('usage')
  }, 30000) // 30 second timeout for API call

  test('should return 400 for invalid request body', async () => {
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // Missing messages field
      })
    })

    expect(response.status).toBe(400)
    
    const data = await response.json()
    expect(data).toHaveProperty('type')
    expect(data).toHaveProperty('title')
    expect(data).toHaveProperty('detail')
    expect(data).toHaveProperty('status')
    expect(data.type).toBe('https://tools.ietf.org/html/rfc7807')
    expect(data.status).toBe(400)
  })

  test('should return 400 for empty messages array', async () => {
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: []
      })
    })

    expect(response.status).toBe(400)
    
    const data = await response.json()
    expect(data.type).toBe('https://tools.ietf.org/html/rfc7807')
    expect(data.detail).toContain('empty')
  })

  test('should return 400 for invalid message role', async () => {
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'invalid_role',
            content: 'Test message'
          }
        ]
      })
    })

    expect(response.status).toBe(400)
    
    const data = await response.json()
    expect(data.type).toBe('https://tools.ietf.org/html/rfc7807')
    expect(data.detail).toContain('valid role')
  })

  test('should return 400 for message content too long', async () => {
    const longContent = 'a'.repeat(4001) // Exceeds 4000 character limit

    const response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: longContent
          }
        ]
      })
    })

    expect(response.status).toBe(400)
    
    const data = await response.json()
    expect(data.type).toBe('https://tools.ietf.org/html/rfc7807')
    expect(data.detail).toContain('4000 characters')
  })

  test('should return 400 for too many messages', async () => {
    const messages = Array.from({ length: 21 }, (_, i) => ({
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: `Message ${i + 1}`
    }))

    const response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages })
    })

    expect(response.status).toBe(400)
    
    const data = await response.json()
    expect(data.type).toBe('https://tools.ietf.org/html/rfc7807')
    expect(data.detail).toContain('maximum 20')
  })

  test('should return 400 for malformed JSON', async () => {
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: '{ invalid json }'
    })

    expect(response.status).toBe(400)
    
    const data = await response.json()
    expect(data.type).toBe('https://tools.ietf.org/html/rfc7807')
    expect(data.detail).toContain('valid JSON')
  })
})