/**
 * LLMプロバイダ切替クライアント
 *
 * Gemini / OpenAI をモジュール単位で切り替え可能にする。
 * モデルIDは環境変数のみを設定源とし、未定義時は throw する。
 *
 * Phase 1.5a-1 で導入。
 */

import "server-only"
import { GoogleGenAI } from "@google/genai"
import type { LLMProvider, LLMModule, ModelTier } from "./types"

// --- Gemini クライアント (シングルトン) ---

let geminiClient: GoogleGenAI | null = null

export function getGeminiClient(): GoogleGenAI {
  if (!geminiClient) {
    const apiKey = process.env.GOOGLE_AI_API_KEY
    if (!apiKey) throw new Error("GOOGLE_AI_API_KEY is not defined")
    geminiClient = new GoogleGenAI({ apiKey })
  }
  return geminiClient
}

// --- プロバイダ判定 ---

/**
 * モジュール単位オーバーライド対応のプロバイダ判定。
 *
 * 優先順位:
 * 1. AI_PROVIDER_<MODULE> (モジュール単位オーバーライド)
 * 2. AI_PROVIDER (グローバルデフォルト)
 * 3. "openai" (フォールバック)
 */
export function getProvider(module?: LLMModule): LLMProvider {
  if (module) {
    const override = process.env[`AI_PROVIDER_${module.toUpperCase()}`]?.toLowerCase()
    if (override === "gemini" || override === "openai") return override
  }
  const global = process.env.AI_PROVIDER?.toLowerCase()
  if (global === "gemini" || global === "openai") return global
  return "openai"
}

// --- モデル取得（プロバイダ連動） ---

/**
 * プロバイダとモデル用途からモデルIDを取得する。
 *
 * - Geminiの場合: AI_MODEL_REALTIME / AI_MODEL_STRUCTURED / AI_MODEL_BATCH を返す
 * - OpenAIの場合: OPENAI_MODEL を返す（全用途で同一モデル）
 *
 * モジュール単位でプロバイダが異なる場合でも、各プロバイダに適合するモデルIDを返す。
 */
export function getModel(provider: LLMProvider, tier: ModelTier): string {
  if (provider === "openai") {
    // OpenAI は全用途で OPENAI_MODEL を使用
    const model = process.env.OPENAI_MODEL
    if (!model) throw new Error("OPENAI_MODEL is not defined")
    return model
  }

  // Gemini: 用途別の環境変数から取得
  const envMap: Record<ModelTier, string> = {
    realtime: "AI_MODEL_REALTIME",
    structured: "AI_MODEL_STRUCTURED",
    batch: "AI_MODEL_BATCH",
  }
  const envKey = envMap[tier]
  const model = process.env[envKey]
  if (!model) throw new Error(`${envKey} is not defined`)
  return model
}

// --- 便利ヘルパー（Gemini専用、直接呼び出し用） ---

export function getRealtimeModel(): string {
  return getModel("gemini", "realtime")
}

export function getBatchModel(): string {
  return getModel("gemini", "batch")
}

export function getStructuredModel(): string {
  return getModel("gemini", "structured")
}
