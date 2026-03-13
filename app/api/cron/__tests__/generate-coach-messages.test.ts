/**
 * Phase 4: generate-coach-messages Cron ルートテスト
 *
 * - CRON_SECRET 認証
 * - generateCoachMessage 呼び出しと compactMemory 渡しの検証
 * - getCompactMemory 失敗時に生成が継続すること
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("server-only", () => ({}))

// ============================================================================
// モック設定
// ============================================================================

/**
 * Supabase チェーンモック — .from().select().eq().gte().order().limit().single()
 * どの順序で呼んでも最終的に resolvedValue を返す。
 */
function createChain(resolvedValue: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {}
  const methods = ["select", "eq", "gte", "order", "limit", "single", "insert"]
  for (const m of methods) {
    chain[m] = vi.fn().mockImplementation(() => {
      // single() と then は Promise 解決を提供
      return Object.assign(Promise.resolve(resolvedValue), chain)
    })
  }
  return chain
}

const studentsChain = createChain({
  data: [
    {
      id: 1,
      user_id: "user-1",
      grade: 5,
      course: "A",
      profiles: { display_name: "太郎", last_login_at: "2026-03-13T00:00:00Z" },
    },
  ],
  error: null,
})

const emptyChain = createChain({ data: null, error: null })
const mockInsert = vi.fn().mockResolvedValue({ error: null })

vi.mock("@/lib/supabase/service-client", () => ({
  createServiceClient: vi.fn().mockReturnValue({
    from: vi.fn().mockImplementation((tableName: string) => {
      if (tableName === "students") return studentsChain
      if (tableName === "ai_cache") return { ...createChain({ data: null, error: null }), insert: mockInsert }
      return emptyChain
    }),
  }),
}))

// メモリ取得モック
const mockGetCompactMemory = vi.fn()
vi.mock("@/lib/memory/student-memory", () => ({
  getCompactMemory: (...args: unknown[]) => mockGetCompactMemory(...args),
}))

// AI生成モック
const mockGenerateCoachMessage = vi.fn()
vi.mock("@/lib/openai/coach-message", async () => {
  const actual = await vi.importActual("@/lib/openai/coach-message")
  return {
    ...actual,
    generateCoachMessage: (...args: unknown[]) => mockGenerateCoachMessage(...args),
  }
})

// date-jst モック
vi.mock("@/lib/utils/date-jst", () => ({
  getTodayJST: vi.fn().mockReturnValue("2026-03-14"),
  getDateJST: vi.fn().mockReturnValue("2026-03-15"),
  getDaysAgoJST: vi.fn().mockReturnValue("2026-03-07"),
  getNowJSTISO: vi.fn().mockReturnValue("2026-03-14T03:00:00+09:00"),
  getDaysDifference: vi.fn().mockReturnValue(7),
}))

// Langfuse モック
vi.mock("@/lib/langfuse/trace-helpers", () => ({
  createDailyCoachMessageTrace: vi.fn().mockResolvedValue("trace-123"),
}))

// ============================================================================
// テスト
// ============================================================================

describe("generate-coach-messages Cron", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.CRON_SECRET = "test-secret"
    mockGetCompactMemory.mockResolvedValue(null)
    mockGenerateCoachMessage.mockResolvedValue({
      success: true,
      message: "今日も頑張ろう！",
    })
  })

  it("CRON_SECRET 不一致で 401 を返す", async () => {
    const { GET } = await import("../../cron/generate-coach-messages/route")

    const request = new Request("http://localhost/api/cron/generate-coach-messages", {
      headers: { authorization: "Bearer wrong-secret" },
    })

    const response = await GET(request)
    expect(response.status).toBe(401)
  })

  it("正常系: generateCoachMessage が呼ばれ successCount === 1", async () => {
    mockGetCompactMemory.mockResolvedValue("算数は上昇傾向。")

    const { GET } = await import("../../cron/generate-coach-messages/route")

    const request = new Request("http://localhost/api/cron/generate-coach-messages", {
      headers: { authorization: "Bearer test-secret" },
    })

    const response = await GET(request)
    const data = await response.json()

    expect(data.success).toBe(true)
    expect(mockGenerateCoachMessage).toHaveBeenCalledTimes(1)
    expect(data.successCount).toBe(1)
    expect(data.failureCount).toBe(0)

    // compactMemory が context に含まれること
    const context = mockGenerateCoachMessage.mock.calls[0][0]
    expect(context.compactMemory).toBe("算数は上昇傾向。")
    expect(context.studentName).toBe("太郎")
  })

  it("getCompactMemory 失敗時でも generateCoachMessage は呼ばれる", async () => {
    mockGetCompactMemory.mockRejectedValue(new Error("DB connection failed"))

    const { GET } = await import("../../cron/generate-coach-messages/route")

    const request = new Request("http://localhost/api/cron/generate-coach-messages", {
      headers: { authorization: "Bearer test-secret" },
    })

    const response = await GET(request)
    const data = await response.json()

    expect(data.success).toBe(true)
    expect(mockGenerateCoachMessage).toHaveBeenCalledTimes(1)
    expect(data.successCount).toBe(1)

    // compactMemory は undefined（null→undefined 変換）
    const context = mockGenerateCoachMessage.mock.calls[0][0]
    expect(context.compactMemory).toBeUndefined()
  })

  it("getCompactMemory が null の場合 compactMemory は undefined", async () => {
    const { GET } = await import("../../cron/generate-coach-messages/route")

    const request = new Request("http://localhost/api/cron/generate-coach-messages", {
      headers: { authorization: "Bearer test-secret" },
    })

    await GET(request)

    expect(mockGenerateCoachMessage).toHaveBeenCalledTimes(1)
    const context = mockGenerateCoachMessage.mock.calls[0][0]
    expect(context.compactMemory).toBeUndefined()
  })
})
