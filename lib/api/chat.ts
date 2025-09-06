interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface ChatResponse {
  message: {
    role: string
    content: string
  }
  usage: {
    prompt_tokens?: number
    completion_tokens?: number
    total_tokens?: number
  }
  model: string
  created: string
}

export async function chat(messages: ChatMessage[]): Promise<ChatResponse> {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({ messages })
  })

  if (!response.ok) {
    throw new Error('chat api failed')
  }

  return response.json()
}