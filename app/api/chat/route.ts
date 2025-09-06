import 'server-only'
import { NextRequest, NextResponse } from 'next/server'

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface ChatCompletionRequest {
  messages: ChatMessage[]
}

// POST /api/chat
export async function POST(request: NextRequest) {
  try {
    // Check if OpenAI API key is configured
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({
        type: 'https://tools.ietf.org/html/rfc7807',
        title: 'Configuration Error',
        detail: 'OpenAI API key is not configured',
        status: 503
      }, { status: 503 })
    }

    const model = process.env.OPENAI_MODEL || 'gpt-5-mini'

    // Parse and validate request body
    let body: ChatCompletionRequest
    try {
      body = await request.json()
    } catch (error) {
      return NextResponse.json({
        type: 'https://tools.ietf.org/html/rfc7807',
        title: 'Invalid Request Body',
        detail: 'Request body must be valid JSON',
        status: 400
      }, { status: 400 })
    }

    // Validate messages array
    if (!body.messages || !Array.isArray(body.messages)) {
      return NextResponse.json({
        type: 'https://tools.ietf.org/html/rfc7807',
        title: 'Validation Error',
        detail: 'messages must be an array',
        status: 400
      }, { status: 400 })
    }

    if (body.messages.length === 0) {
      return NextResponse.json({
        type: 'https://tools.ietf.org/html/rfc7807',
        title: 'Validation Error',
        detail: 'messages array cannot be empty',
        status: 400
      }, { status: 400 })
    }

    // Validate each message
    for (let i = 0; i < body.messages.length; i++) {
      const message = body.messages[i]
      
      if (!message || typeof message !== 'object') {
        return NextResponse.json({
          type: 'https://tools.ietf.org/html/rfc7807',
          title: 'Validation Error',
          detail: `Message at index ${i} must be an object`,
          status: 400
        }, { status: 400 })
      }

      if (!message.role || !['system', 'user', 'assistant'].includes(message.role)) {
        return NextResponse.json({
          type: 'https://tools.ietf.org/html/rfc7807',
          title: 'Validation Error',
          detail: `Message at index ${i} must have a valid role (system, user, or assistant)`,
          status: 400
        }, { status: 400 })
      }

      if (!message.content || typeof message.content !== 'string') {
        return NextResponse.json({
          type: 'https://tools.ietf.org/html/rfc7807',
          title: 'Validation Error',
          detail: `Message at index ${i} must have content as a string`,
          status: 400
        }, { status: 400 })
      }

      if (message.content.length > 4000) {
        return NextResponse.json({
          type: 'https://tools.ietf.org/html/rfc7807',
          title: 'Validation Error',
          detail: `Message at index ${i} content exceeds 4000 characters`,
          status: 400
        }, { status: 400 })
      }
    }

    // Limit total messages
    if (body.messages.length > 20) {
      return NextResponse.json({
        type: 'https://tools.ietf.org/html/rfc7807',
        title: 'Validation Error',
        detail: 'Too many messages (maximum 20)',
        status: 400
      }, { status: 400 })
    }

    // Call OpenAI Chat Completions API
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: body.messages,
        max_tokens: 1000,
        temperature: 0.7,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0
      })
    })

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text()
      console.error('OpenAI API error:', {
        status: openaiResponse.status,
        statusText: openaiResponse.statusText,
        body: errorText
      })

      // Handle different OpenAI API error types
      if (openaiResponse.status === 401) {
        return NextResponse.json({
          type: 'https://tools.ietf.org/html/rfc7807',
          title: 'Authentication Error',
          detail: 'Invalid OpenAI API key',
          status: 500
        }, { status: 500 })
      }

      if (openaiResponse.status === 429) {
        return NextResponse.json({
          type: 'https://tools.ietf.org/html/rfc7807',
          title: 'Rate Limit Error',
          detail: 'OpenAI API rate limit exceeded',
          status: 429
        }, { status: 429 })
      }

      if (openaiResponse.status >= 500) {
        return NextResponse.json({
          type: 'https://tools.ietf.org/html/rfc7807',
          title: 'OpenAI Service Error',
          detail: 'OpenAI service is temporarily unavailable',
          status: 502
        }, { status: 502 })
      }

      return NextResponse.json({
        type: 'https://tools.ietf.org/html/rfc7807',
        title: 'OpenAI API Error',
        detail: 'Failed to get response from OpenAI',
        status: 500
      }, { status: 500 })
    }

    const completionData = await openaiResponse.json()

    // Validate OpenAI response structure
    if (!completionData.choices || !Array.isArray(completionData.choices) || completionData.choices.length === 0) {
      return NextResponse.json({
        type: 'https://tools.ietf.org/html/rfc7807',
        title: 'OpenAI Response Error',
        detail: 'Invalid response format from OpenAI',
        status: 500
      }, { status: 500 })
    }

    const choice = completionData.choices[0]
    if (!choice.message || !choice.message.content) {
      return NextResponse.json({
        type: 'https://tools.ietf.org/html/rfc7807',
        title: 'OpenAI Response Error',
        detail: 'No message content in OpenAI response',
        status: 500
      }, { status: 500 })
    }

    // Return successful response
    return NextResponse.json({
      message: {
        role: choice.message.role,
        content: choice.message.content
      },
      usage: completionData.usage || {},
      model: completionData.model || model,
      created: new Date().toISOString()
    })

  } catch (error) {
    console.error('Chat API error:', error)
    
    // Handle network errors, JSON parsing errors, etc.
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return NextResponse.json({
        type: 'https://tools.ietf.org/html/rfc7807',
        title: 'Network Error',
        detail: 'Unable to connect to OpenAI service',
        status: 502
      }, { status: 502 })
    }

    return NextResponse.json({
      type: 'https://tools.ietf.org/html/rfc7807',
      title: 'Internal Server Error',
      detail: 'An unexpected error occurred',
      status: 500
    }, { status: 500 })
  }
}