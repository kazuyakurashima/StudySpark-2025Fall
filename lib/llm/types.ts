/**
 * LLMプロバイダ共通型定義
 *
 * OpenAI / Gemini の差異を吸収するための共通インターフェース。
 * Phase 1.5a-1 で導入。各モジュールが段階的にこの型を使用する。
 */

/** サポートするプロバイダ */
export type LLMProvider = "gemini" | "openai"

/** プロバイダ切替対象のモジュール */
export type LLMModule = "reflect" | "goal" | "coach" | "batch"

/** モデル用途カテゴリ */
export type ModelTier = "realtime" | "structured" | "batch"

/** プロバイダ共通のメッセージ型 */
export interface LLMMessage {
  role: "system" | "user" | "assistant"
  content: string
}

/** LLM呼び出し共通オプション（Phase 1.5a-2以降で各モジュールが使用） */
export interface LLMGenerateOptions {
  model: string
  messages: LLMMessage[]
  maxOutputTokens?: number
  signal?: AbortSignal
  responseFormat?: "text" | "json"
}

/** ストリーミングイベント型（delta: 差分, done: 完了全文, meta: セッション制御, error: エラー） */
export interface LLMStreamEvent {
  type: "delta" | "done" | "meta" | "error"
  content: string
}
