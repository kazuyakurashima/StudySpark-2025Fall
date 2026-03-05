/**
 * SSEクライアントユーティリティ
 *
 * サーバーからのSSEストリームを消費し、deltaイベントを50msバッチでコールバック。
 * reflect-chat.tsxのfetchStreamingMessageパターンを共有化。
 */

import type { SSEEvent, SSEMetaType, SSEResult } from "./types"

/**
 * SSEストリームをフェッチし、deltaイベントを50msバッチで通知
 *
 * @param url SSEエンドポイントURL
 * @param body POSTリクエストボディ
 * @param onChunk 蓄積テキストのコールバック（50ms間隔でバッチ呼び出し）
 * @param signal AbortSignal（クライアント離脱時のキャンセル用）
 * @returns 完了時の全文テキストとmetaイベント
 */
export async function fetchSSE(
  url: string,
  body: object,
  onChunk: (accumulated: string) => void,
  signal: AbortSignal
): Promise<SSEResult> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  })

  if (!res.ok) {
    throw new Error(`SSE request failed: ${res.status}`)
  }
  if (!res.body) {
    throw new Error("No response body")
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let sseBuffer = ""
  let fullContent = ""
  let meta: SSEMetaType | undefined
  let pendingFlush = false

  // 50msバッチ更新（再レンダリング過多防止）
  const flushInterval = setInterval(() => {
    if (pendingFlush) {
      onChunk(fullContent)
      pendingFlush = false
    }
  }, 50)

  try {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      sseBuffer += decoder.decode(value, { stream: true })
      const parts = sseBuffer.split("\n\n")
      sseBuffer = parts.pop() || ""

      for (const part of parts) {
        // Heartbeat（SSEコメント）は無視
        if (part === ":" || part.trim() === "") continue
        if (!part.startsWith("data: ")) continue

        let event: SSEEvent
        try {
          event = JSON.parse(part.slice(6))
        } catch {
          // 不正JSONは無視（ログのみ）
          console.warn("[fetchSSE] Invalid JSON in SSE event:", part.slice(6, 100))
          continue
        }

        switch (event.type) {
          case "delta":
            fullContent += event.content
            pendingFlush = true
            break
          case "done":
            fullContent = event.content
            pendingFlush = true
            break
          case "meta":
            meta = event.content as SSEMetaType
            break
          case "error":
            throw new Error(event.content)
        }
      }
    }
  } finally {
    clearInterval(flushInterval)
  }

  // 最終flush（バッチタイマーで未送出のテキストを確実に通知）
  onChunk(fullContent)

  return { content: fullContent, meta }
}
