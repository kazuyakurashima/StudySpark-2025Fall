import { describe, it, expect, vi, beforeEach } from "vitest"

// モジュールモック
vi.mock("../client", () => ({
  getOpenAIClient: vi.fn(),
}))

vi.mock("../../llm/client", () => ({
  getGeminiClient: vi.fn(),
  getModelForModule: vi.fn(),
}))

import { generateGoalNavigationMessageStream } from "../goal-coaching"
import { getOpenAIClient } from "../client"
import { getModelForModule } from "../../llm/client"

describe("generateGoalNavigationMessageStream", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("OpenAI stream は getModelForModule の model を使用する", async () => {
    // getModelForModule が返す model を追跡
    const expectedModel = "gpt-4o-mini-test"
    vi.mocked(getModelForModule).mockReturnValue({
      provider: "openai",
      model: expectedModel,
    })

    // OpenAI client のモック: stream を返す
    const mockCreate = vi.fn().mockResolvedValue({
      [Symbol.asyncIterator]: async function* () {
        yield { choices: [{ delta: { content: "テスト" } }] }
      },
    })
    // モック部分型: テスト対象が使うプロパティのみ。SDKインターフェース変更時は
    // テスト実行時に実行時エラーで検出される（型レベルでは部分一致不可のため unknown 経由）
    vi.mocked(getOpenAIClient).mockReturnValue({
      chat: { completions: { create: mockCreate } },
    } as unknown as ReturnType<typeof getOpenAIClient>)

    // ストリーム実行
    const events = []
    for await (const event of generateGoalNavigationMessageStream(
      "system prompt",
      "user prompt"
    )) {
      events.push(event)
    }

    // getModelForModule が "goal", "realtime" で呼ばれること
    expect(getModelForModule).toHaveBeenCalledWith("goal", "realtime")

    // create に渡された model が getModelForModule の返却値であること
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ model: expectedModel }),
      expect.anything()
    )

    // delta + done が正しく生成されること
    expect(events).toEqual([
      { type: "delta", content: "テスト" },
      { type: "done", content: "テスト" },
    ])
  })

  it("Gemini stream は getModelForModule の model を使用する", async () => {
    const expectedModel = "gemini-2.0-flash-test"
    vi.mocked(getModelForModule).mockReturnValue({
      provider: "gemini",
      model: expectedModel,
    })

    const { getGeminiClient } = await import("../../llm/client")
    const mockGenerateContentStream = vi.fn().mockResolvedValue({
      [Symbol.asyncIterator]: async function* () {
        yield { text: "応答" }
      },
    })
    // モック部分型: 同上
    vi.mocked(getGeminiClient).mockReturnValue({
      models: { generateContentStream: mockGenerateContentStream },
    } as unknown as ReturnType<typeof getGeminiClient>)

    const events = []
    for await (const event of generateGoalNavigationMessageStream(
      "system prompt",
      "user prompt"
    )) {
      events.push(event)
    }

    expect(mockGenerateContentStream).toHaveBeenCalledWith(
      expect.objectContaining({ model: expectedModel })
    )

    expect(events).toEqual([
      { type: "delta", content: "応答" },
      { type: "done", content: "応答" },
    ])
  })
})
