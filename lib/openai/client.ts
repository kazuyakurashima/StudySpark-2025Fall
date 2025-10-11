import OpenAI from "openai"

// OpenAI クライアントのシングルトンインスタンス
let openaiClient: OpenAI | null = null

/**
 * OpenAI クライアントを取得（シングルトンパターン）
 */
export function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY

    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not defined in environment variables")
    }

    openaiClient = new OpenAI({
      apiKey,
      timeout: parseInt(process.env.OPENAI_TIMEOUT || "30000"),
      maxRetries: parseInt(process.env.OPENAI_MAX_RETRIES || "2"),
    })
  }

  return openaiClient
}

/**
 * OpenAI API エラーハンドリング
 */
export function handleOpenAIError(error: unknown): string {
  if (error instanceof OpenAI.APIError) {
    console.error("OpenAI API Error:", {
      status: error.status,
      message: error.message,
      code: error.code,
      type: error.type,
    })

    // ユーザー向けエラーメッセージ
    if (error.status === 429) {
      return "AI応援メッセージの生成が一時的に制限されています。しばらく待ってから再度お試しください。"
    } else if (error.status === 401) {
      return "AI機能の認証エラーが発生しました。管理者にお問い合わせください。"
    } else if (error.status === 500 || error.status === 503) {
      return "AI機能が一時的に利用できません。しばらく待ってから再度お試しください。"
    } else {
      return "AI応援メッセージの生成中にエラーが発生しました。もう一度お試しください。"
    }
  }

  console.error("Unexpected error:", error)
  return "予期しないエラーが発生しました。もう一度お試しください。"
}

/**
 * デフォルトモデル名を取得
 */
export function getDefaultModel(): string {
  return process.env.OPENAI_MODEL || "gpt-4o-mini"
}
