/**
 * Phase 4: コーチメッセージへのメモリ注入テスト
 *
 * - trimByCodePoints のユニットテスト
 * - compactMemory がプロンプトに含まれること（LLM呼び出し引数で検証）
 * - compactMemory が null/undefined の場合は含まれないこと
 * - 750文字超過時のコードポイント基準切り詰め
 */

import { describe, it, expect, vi } from "vitest"

vi.mock("server-only", () => ({}))

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
          choices: [{ message: { content: "テストメッセージ" } }],
        }),
      },
    },
  }),
  getDefaultModel: vi.fn().mockReturnValue("gpt-4o-mini"),
}))

vi.mock("../../llm/logger", () => ({
  sanitizeForLog: vi.fn((x) => x),
}))

import { trimByCodePoints } from "../../utils/text"
import { generateCoachMessage, type CoachMessageContext } from "../coach-message"
import { getOpenAIClient } from "../client"

// ============================================================================
// ヘルパー
// ============================================================================

function baseContext(overrides: Partial<CoachMessageContext> = {}): CoachMessageContext {
  return {
    studentId: 1,
    studentName: "太郎",
    grade: 5,
    course: "A",
    recentLogs: { today: [], yesterday: [], dayBeforeYesterday: [] },
    studyStreak: 3,
    ...overrides,
  }
}

function getLastUserPrompt(): string {
  const mockCreate = (getOpenAIClient() as ReturnType<typeof getOpenAIClient>).chat.completions.create as ReturnType<typeof vi.fn>
  const lastCall = mockCreate.mock.calls[mockCreate.mock.calls.length - 1]
  const messages = lastCall[0].messages as { role: string; content: string }[]
  const userMessages = messages.filter((m: { role: string }) => m.role === "user")
  return userMessages[userMessages.length - 1].content
}

function getLastSystemPrompt(): string {
  const mockCreate = (getOpenAIClient() as ReturnType<typeof getOpenAIClient>).chat.completions.create as ReturnType<typeof vi.fn>
  const lastCall = mockCreate.mock.calls[mockCreate.mock.calls.length - 1]
  const messages = lastCall[0].messages as { role: string; content: string }[]
  return messages.find((m: { role: string }) => m.role === "system")!.content
}

// ============================================================================
// trimByCodePoints
// ============================================================================

describe("trimByCodePoints", () => {
  it("上限以内のテキストはそのまま返す", () => {
    const text = "算数は上昇傾向。国語は安定。"
    expect(trimByCodePoints(text, 750)).toBe(text)
  })

  it("上限超過時はコードポイント基準で切り詰めて「…」を付与", () => {
    const text = "あ".repeat(800)
    const result = trimByCodePoints(text, 750)
    expect(Array.from(result).length).toBe(751) // 750 + "…"
    expect(result.endsWith("…")).toBe(true)
  })

  it("絵文字を含むテキストを正しく切り詰める", () => {
    const emoji = "😊"
    const text = emoji.repeat(10)
    const result = trimByCodePoints(text, 5)
    expect(Array.from(result).length).toBe(6) // 5 + "…"
    expect(result).toBe("😊😊😊😊😊…")
  })

  it("空文字列を渡した場合", () => {
    expect(trimByCodePoints("", 750)).toBe("")
  })

  it("上限ちょうどの場合は切り詰めない", () => {
    const text = "あ".repeat(750)
    expect(trimByCodePoints(text, 750)).toBe(text)
  })
})

// ============================================================================
// プロンプトへのメモリ注入（LLM呼び出し引数で検証）
// ============================================================================

describe("coach-message prompt memory injection", () => {
  it("compactMemory がユーザープロンプトに含まれる", async () => {
    const context = baseContext({
      compactMemory: "算数は上昇傾向。計算ミスが減少中。",
    })

    await generateCoachMessage(context)
    const prompt = getLastUserPrompt()

    expect(prompt).toContain("【長期メモリ（生徒の傾向）】")
    expect(prompt).toContain("算数は上昇傾向。計算ミスが減少中。")
  })

  it("compactMemory が undefined の場合はメモリセクションが含まれない", async () => {
    const context = baseContext({ compactMemory: undefined })

    await generateCoachMessage(context)
    const prompt = getLastUserPrompt()

    expect(prompt).not.toContain("【長期メモリ")
  })

  it("compactMemory が 750文字超過時に切り詰められる", async () => {
    const longMemory = "あ".repeat(800)
    const context = baseContext({ compactMemory: longMemory })

    await generateCoachMessage(context)
    const prompt = getLastUserPrompt()

    // 750文字 + "…" がプロンプトに含まれる
    expect(prompt).toContain("あ".repeat(750) + "…")
    // 751文字目以降は含まれない
    expect(prompt).not.toContain("あ".repeat(751))
  })

  it("システムプロンプトに長期メモリの使い方指示が含まれる", async () => {
    const context = baseContext()

    await generateCoachMessage(context)
    const system = getLastSystemPrompt()

    expect(system).toContain("長期メモリ")
  })
})
