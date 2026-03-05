/**
 * SSEイベント型定義
 *
 * サーバー→クライアント間のSSEプロトコルで使用する型。
 * LLMStreamEvent（lib/llm/types.ts）はLLM層の型、こちらはトランスポート層の型。
 */

/** SSE metaイベントのサブタイプ（型安全enum） */
export const SSE_META = {
  /** DB保存成功 */
  SAVE_OK: "save_ok",
  /** DB保存失敗（クライアントでリトライUI表示） */
  SAVE_FAILED: "save_failed",
  /** LLMエラーによりフォールバックメッセージを使用 */
  FALLBACK: "fallback",
  /** 出力バリデーション失敗によりテンプレートに置換 */
  REPLACED_BY_TEMPLATE: "replaced_by_template",
  /** Reflectセッション終了可能 */
  SESSION_CAN_END: "SESSION_CAN_END",
} as const

export type SSEMetaType = (typeof SSE_META)[keyof typeof SSE_META]

/** クライアントが受信するSSEイベント */
export interface SSEEvent {
  type: "delta" | "done" | "meta" | "error"
  content: string
}

/** fetchSSEの戻り値 */
export interface SSEResult {
  content: string
  meta?: SSEMetaType
}
