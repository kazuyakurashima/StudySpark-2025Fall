/**
 * Phase 4: Reflect コーチングへのメモリ注入テスト
 *
 * - detailedMemory が Turn 1 プロンプトに含まれること
 * - detailedMemory が Turn 2+ でもプロンプトに含まれること（必須ケース）
 * - detailedMemory が null/undefined の場合は含まれないこと
 * - Turn 1 は 1500文字、Turn 2+ は 600文字で切り詰められること
 */

import { describe, it, expect, vi } from "vitest"

vi.mock("server-only", () => ({}))

// reflect-coaching.ts の getReflectUserPrompt は export されていないため、
// 内部関数を直接テストするにはモジュール内部にアクセスする必要がある。
// ここではストリーム/非ストリーム生成関数のコンテキスト経由で間接テストする。
// getReflectUserPrompt をテスト可能にするため、エクスポートを追加する代わりに
// generateReflectMessage をモックして userPrompt を検証する。

// LLMクライアントをモック
vi.mock("../../llm/client", () => ({
  getModelForModule: vi.fn().mockReturnValue({ provider: "openai", model: "gpt-4o-mini" }),
  getGeminiClient: vi.fn(),
}))

vi.mock("../client", () => ({
  getOpenAIClient: vi.fn().mockReturnValue({
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{ message: { content: "テスト応答" } }],
        }),
      },
    },
  }),
  getDefaultModel: vi.fn().mockReturnValue("gpt-4o-mini"),
}))

vi.mock("../../llm/logger", () => ({
  sanitizeForLog: vi.fn((x) => x),
}))

vi.mock("../../llm/gemini-utils", () => ({
  buildGeminiContents: vi.fn(),
}))

import { generateReflectMessage, type ReflectContext } from "../reflect-coaching"
import { getOpenAIClient } from "../client"

// ============================================================================
// ヘルパー
// ============================================================================

function baseContext(overrides: Partial<ReflectContext> = {}): ReflectContext {
  return {
    studentName: "太郎",
    weekType: "growth",
    thisWeekAccuracy: 75,
    lastWeekAccuracy: 65,
    accuracyDiff: 10,
    conversationHistory: [],
    turnNumber: 1,
    ...overrides,
  }
}

function getLastUserPrompt(): string {
  const mockCreate = (getOpenAIClient() as ReturnType<typeof getOpenAIClient>).chat.completions.create as ReturnType<typeof vi.fn>
  const lastCall = mockCreate.mock.calls[mockCreate.mock.calls.length - 1]
  const messages = lastCall[0].messages as { role: string; content: string }[]
  const userMessages = messages.filter((m) => m.role === "user")
  return userMessages[userMessages.length - 1].content
}

// ============================================================================
// Turn 1: detailedMemory がプロンプトに含まれる
// ============================================================================

describe("Reflect memory injection - Turn 1", () => {
  it("detailedMemory がプロンプトに含まれる", async () => {
    const context = baseContext({
      detailedMemory: "算数は8週間で上昇傾向。計算ミスが減少。国語の読解が苦手。",
    })

    await generateReflectMessage(context)
    const prompt = getLastUserPrompt()

    expect(prompt).toContain("【長期メモリ（生徒の傾向）】")
    expect(prompt).toContain("算数は8週間で上昇傾向")
    expect(prompt).toContain("国語の読解が苦手")
  })

  it("detailedMemory が undefined の場合はメモリセクションが含まれない", async () => {
    const context = baseContext({ detailedMemory: undefined })

    await generateReflectMessage(context)
    const prompt = getLastUserPrompt()

    expect(prompt).not.toContain("【長期メモリ")
  })

  it("Turn 1 は 1500文字で切り詰められる", async () => {
    const longMemory = "あ".repeat(2000)
    const context = baseContext({ detailedMemory: longMemory })

    await generateReflectMessage(context)
    const prompt = getLastUserPrompt()

    // 1500文字 + "…" がプロンプトに含まれる
    expect(prompt).toContain("あ".repeat(1500) + "…")
    expect(prompt).not.toContain("あ".repeat(1501))
  })
})

// ============================================================================
// Turn 2+: detailedMemory がプロンプトに含まれる（必須ケース）
// ============================================================================

describe("Reflect memory injection - Turn 2+", () => {
  it("Turn 2 でも detailedMemory がプロンプトに含まれる", async () => {
    const context = baseContext({
      turnNumber: 2,
      conversationHistory: [
        { role: "assistant", content: "今週の振り返りを始めよう！" },
        { role: "user", content: "算数の問題集を頑張った" },
      ],
      detailedMemory: "算数は上昇傾向。褒めると頑張るタイプ。",
    })

    await generateReflectMessage(context)
    const prompt = getLastUserPrompt()

    expect(prompt).toContain("【長期メモリ（生徒の傾向）】")
    expect(prompt).toContain("算数は上昇傾向")
  })

  it("Turn 3 でも detailedMemory がプロンプトに含まれる", async () => {
    const context = baseContext({
      turnNumber: 3,
      conversationHistory: [
        { role: "assistant", content: "導入メッセージ" },
        { role: "user", content: "算数を頑張った" },
        { role: "assistant", content: "すごいね！来週の目標は？" },
        { role: "user", content: "毎日30分勉強する" },
      ],
      detailedMemory: "計画を立てるのが得意。",
    })

    await generateReflectMessage(context)
    const prompt = getLastUserPrompt()

    expect(prompt).toContain("【長期メモリ（生徒の傾向）】")
    expect(prompt).toContain("計画を立てるのが得意")
  })

  it("Turn 2+ は 600文字で切り詰められる", async () => {
    const longMemory = "い".repeat(1000)
    const context = baseContext({
      turnNumber: 2,
      conversationHistory: [
        { role: "assistant", content: "導入" },
        { role: "user", content: "頑張った" },
      ],
      detailedMemory: longMemory,
    })

    await generateReflectMessage(context)
    const prompt = getLastUserPrompt()

    // 600文字 + "…" がプロンプトに含まれる
    expect(prompt).toContain("い".repeat(600) + "…")
    expect(prompt).not.toContain("い".repeat(601))
  })
})

// ============================================================================
// detailedMemory なしの場合（既存動作と同一）
// ============================================================================

describe("Reflect memory injection - no memory", () => {
  it("Turn 1 でメモリなしの場合、メモリセクションが含まれない", async () => {
    const context = baseContext()
    await generateReflectMessage(context)
    const prompt = getLastUserPrompt()

    expect(prompt).not.toContain("【長期メモリ")
    // 通常のTurn 1プロンプトは含まれる
    expect(prompt).toContain("今週の振り返りを始めよう")
  })

  it("Turn 2 でメモリなしの場合、メモリセクションが含まれない", async () => {
    const context = baseContext({
      turnNumber: 2,
      conversationHistory: [
        { role: "assistant", content: "導入" },
        { role: "user", content: "算数を頑張った" },
      ],
    })

    await generateReflectMessage(context)
    const prompt = getLastUserPrompt()

    expect(prompt).not.toContain("【長期メモリ")
  })
})
