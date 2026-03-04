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

/** ストリーミングイベント型 */
export interface LLMStreamEvent {
  type: "delta" | "done" | "meta" | "error"
  content: string
}
