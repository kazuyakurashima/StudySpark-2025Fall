/**
 * Langfuseクライアント
 */

import { Langfuse } from "langfuse"
import { getServerEnv, isLangfuseEnabled } from "@/lib/env"

let langfuseClient: Langfuse | null = null

/**
 * Langfuseクライアントの取得（シングルトン）
 *
 * @returns Langfuseクライアント、無効の場合はnull
 */
export function getLangfuseClient(): Langfuse | null {
  if (!isLangfuseEnabled()) {
    return null
  }

  if (langfuseClient) {
    return langfuseClient
  }

  const publicKey = getServerEnv("LANGFUSE_PUBLIC_KEY")
  const secretKey = getServerEnv("LANGFUSE_SECRET_KEY")
  const host = getServerEnv("LANGFUSE_HOST", false) || "https://cloud.langfuse.com"

  if (!publicKey || !secretKey) {
    console.warn(
      "[Langfuse] LANGFUSE_PUBLIC_KEY or LANGFUSE_SECRET_KEY is not set. Langfuse disabled."
    )
    return null
  }

  langfuseClient = new Langfuse({
    publicKey,
    secretKey,
    baseUrl: host,
  })

  return langfuseClient
}

/**
 * Langfuseクライアントのフラッシュ（保留中のイベントを送信）
 */
export async function flushLangfuse(): Promise<void> {
  const client = getLangfuseClient()
  if (!client) return

  try {
    await client.flushAsync()
  } catch (error) {
    console.error("[Langfuse] Failed to flush events:", error)
  }
}

/**
 * Langfuseクライアントのシャットダウン
 */
export async function shutdownLangfuse(): Promise<void> {
  const client = getLangfuseClient()
  if (!client) return

  try {
    await client.shutdownAsync()
    langfuseClient = null
  } catch (error) {
    console.error("[Langfuse] Failed to shutdown client:", error)
  }
}
