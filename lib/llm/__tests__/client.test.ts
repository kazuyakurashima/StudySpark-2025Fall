/**
 * lib/llm/client.ts のユニットテスト
 *
 * server-only / @google/genai をモックして純粋なロジックのみテスト。
 */

import { describe, it, expect, vi, beforeEach, afterAll } from "vitest"

vi.mock("server-only", () => ({}))
vi.mock("@google/genai", () => ({
  GoogleGenAI: vi.fn().mockImplementation(() => ({})),
}))

import { getProvider, getModel, getModelForModule } from "../client"

// --- getProvider ---

describe("getProvider", () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
    // 既存の AI_PROVIDER* を除去
    delete process.env.AI_PROVIDER
    delete process.env.AI_PROVIDER_REFLECT
    delete process.env.AI_PROVIDER_GOAL
    delete process.env.AI_PROVIDER_COACH
    delete process.env.AI_PROVIDER_BATCH
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it("未設定時は openai をデフォルト返却", () => {
    expect(getProvider()).toBe("openai")
  })

  it("AI_PROVIDER=gemini でグローバル gemini", () => {
    process.env.AI_PROVIDER = "gemini"
    expect(getProvider()).toBe("gemini")
  })

  it("大文字 AI_PROVIDER=GEMINI も正常に認識", () => {
    process.env.AI_PROVIDER = "GEMINI"
    expect(getProvider()).toBe("gemini")
  })

  it("モジュール単位オーバーライドが優先", () => {
    process.env.AI_PROVIDER = "openai"
    process.env.AI_PROVIDER_REFLECT = "gemini"
    expect(getProvider("reflect")).toBe("gemini")
  })

  it("モジュールオーバーライド未設定時はグローバルにフォールバック", () => {
    process.env.AI_PROVIDER = "gemini"
    expect(getProvider("reflect")).toBe("gemini")
  })

  it("不正な AI_PROVIDER 値で throw", () => {
    process.env.AI_PROVIDER = "claude"
    expect(() => getProvider()).toThrow('AI_PROVIDER="claude" is invalid')
  })

  it("不正なモジュールオーバーライド値で throw", () => {
    process.env.AI_PROVIDER_GOAL = "anthropic"
    expect(() => getProvider("goal")).toThrow('AI_PROVIDER_GOAL="anthropic" is invalid')
  })

  it("モジュールなし + AI_PROVIDER=openai", () => {
    process.env.AI_PROVIDER = "openai"
    expect(getProvider()).toBe("openai")
  })

  it("空文字列 AI_PROVIDER='' は不正値として throw", () => {
    process.env.AI_PROVIDER = ""
    expect(() => getProvider()).toThrow('AI_PROVIDER="" is invalid')
  })

  it("空文字列 AI_PROVIDER_REFLECT='' は不正値として throw", () => {
    process.env.AI_PROVIDER_REFLECT = ""
    expect(() => getProvider("reflect")).toThrow('AI_PROVIDER_REFLECT="" is invalid')
  })

  it("前後空白 AI_PROVIDER=' gemini ' はトリムして認識", () => {
    process.env.AI_PROVIDER = " gemini "
    expect(getProvider()).toBe("gemini")
  })
})

// --- getModel ---

describe("getModel", () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
    delete process.env.OPENAI_MODEL
    delete process.env.AI_MODEL_REALTIME
    delete process.env.AI_MODEL_STRUCTURED
    delete process.env.AI_MODEL_BATCH
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it("openai プロバイダは OPENAI_MODEL を返す", () => {
    process.env.OPENAI_MODEL = "gpt-4o-mini"
    expect(getModel("openai", "realtime")).toBe("gpt-4o-mini")
    expect(getModel("openai", "structured")).toBe("gpt-4o-mini")
    expect(getModel("openai", "batch")).toBe("gpt-4o-mini")
  })

  it("openai で OPENAI_MODEL 未定義なら throw", () => {
    expect(() => getModel("openai", "realtime")).toThrow("OPENAI_MODEL is not defined")
  })

  it("gemini プロバイダはティア別の環境変数を返す", () => {
    process.env.AI_MODEL_REALTIME = "gemini-2.5-flash-lite"
    process.env.AI_MODEL_STRUCTURED = "gemini-2.5-flash"
    process.env.AI_MODEL_BATCH = "gemini-2.5-pro"

    expect(getModel("gemini", "realtime")).toBe("gemini-2.5-flash-lite")
    expect(getModel("gemini", "structured")).toBe("gemini-2.5-flash")
    expect(getModel("gemini", "batch")).toBe("gemini-2.5-pro")
  })

  it("gemini で AI_MODEL_REALTIME 未定義なら throw", () => {
    expect(() => getModel("gemini", "realtime")).toThrow("AI_MODEL_REALTIME is not defined")
  })

  it("gemini で AI_MODEL_BATCH 未定義なら throw", () => {
    expect(() => getModel("gemini", "batch")).toThrow("AI_MODEL_BATCH is not defined")
  })
})

// --- getModelForModule ---

describe("getModelForModule", () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
    delete process.env.AI_PROVIDER
    delete process.env.AI_PROVIDER_REFLECT
    delete process.env.OPENAI_MODEL
    delete process.env.AI_MODEL_REALTIME
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it("openai モジュールで provider + model を一括取得", () => {
    process.env.OPENAI_MODEL = "gpt-4o-mini"
    const result = getModelForModule("reflect", "realtime")
    expect(result.provider).toBe("openai")
    expect(result.model).toBe("gpt-4o-mini")
  })

  it("gemini モジュールオーバーライドで正しく解決", () => {
    process.env.AI_PROVIDER_REFLECT = "gemini"
    process.env.AI_MODEL_REALTIME = "gemini-2.5-flash-lite"
    const result = getModelForModule("reflect", "realtime")
    expect(result.provider).toBe("gemini")
    expect(result.model).toBe("gemini-2.5-flash-lite")
  })
})
