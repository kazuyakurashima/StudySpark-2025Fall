/**
 * Cron Route テスト: update-student-memory / update-student-memory-daily
 *
 * - CRON_SECRET認証（不正トークンで401）
 * - 正常系レスポンス構造
 * - 部分失敗時の継続動作
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

// ============================================================================
// モック設定
// ============================================================================

vi.mock("server-only", () => ({}))
vi.mock("@google/genai", () => ({
  GoogleGenAI: vi.fn().mockImplementation(() => ({})),
}))
vi.mock("@/lib/openai/client", () => ({
  getOpenAIClient: vi.fn(),
}))
vi.mock("@/lib/llm/logger", () => ({
  sanitizeForLog: (v: unknown) => v,
}))

// service-client モック
const mockServiceClient = {
  from: vi.fn(),
  rpc: vi.fn(),
}
vi.mock("@/lib/supabase/service-client", () => ({
  createServiceClient: () => mockServiceClient,
}))

// memory-generator モック
const mockGenerateStudentMemory = vi.fn()
const mockAppendDailyDelta = vi.fn()
vi.mock("@/lib/llm/memory-generator", () => ({
  generateStudentMemory: (...args: unknown[]) => mockGenerateStudentMemory(...args),
  appendDailyDelta: (...args: unknown[]) => mockAppendDailyDelta(...args),
}))

// ============================================================================
// 週次 Cron テスト
// ============================================================================

describe("update-student-memory (weekly)", () => {
  let GET: (request: Request) => Promise<Response>

  beforeEach(async () => {
    vi.clearAllMocks()
    process.env.CRON_SECRET = "test-secret-123"

    const mod = await import("../../cron/update-student-memory/route")
    GET = mod.GET
  })

  it("不正なCRON_SECRETで401を返す", async () => {
    const request = new Request("http://localhost/api/cron/update-student-memory", {
      headers: { authorization: "Bearer wrong-secret" },
    })

    const response = await GET(request)
    expect(response.status).toBe(401)
  })

  it("アクティブ生徒なしで空レスポンスを返す", async () => {
    mockServiceClient.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        gte: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }),
    })

    const request = new Request("http://localhost/api/cron/update-student-memory", {
      headers: { authorization: "Bearer test-secret-123" },
    })

    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.totalStudents).toBe(0)
  })

  it("部分失敗時も処理を継続する", async () => {
    mockServiceClient.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        gte: vi.fn().mockResolvedValue({
          data: [
            { id: 1, profiles: { last_login_at: "2026-03-12T00:00:00Z" } },
            { id: 2, profiles: { last_login_at: "2026-03-12T00:00:00Z" } },
            { id: 3, profiles: { last_login_at: "2026-03-12T00:00:00Z" } },
          ],
          error: null,
        }),
      }),
    })

    // 1人目: 成功、2人目: 失敗、3人目: 成功
    mockGenerateStudentMemory
      .mockResolvedValueOnce({
        compactSummary: "要約1",
        detailedSummary: "詳細1",
        subjectTrends: {},
        stumblingPatterns: {},
        effectiveEncouragements: {},
        recentSuccesses: {},
        emotionalTendencies: {},
        lastStudyLogId: 100,
        dataWindowStart: "2026-01-20",
        dataWindowEnd: "2026-03-13",
        weeksCovered: 8,
      })
      .mockRejectedValueOnce(new Error("LLM timeout"))
      .mockResolvedValueOnce({
        compactSummary: "要約3",
        detailedSummary: "詳細3",
        subjectTrends: {},
        stumblingPatterns: {},
        effectiveEncouragements: {},
        recentSuccesses: {},
        emotionalTendencies: {},
        lastStudyLogId: 300,
        dataWindowStart: "2026-01-20",
        dataWindowEnd: "2026-03-13",
        weeksCovered: 8,
      })

    mockServiceClient.rpc.mockResolvedValue({ error: null })

    const request = new Request("http://localhost/api/cron/update-student-memory", {
      headers: { authorization: "Bearer test-secret-123" },
    })

    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.totalStudents).toBe(3)
    expect(body.successCount).toBe(2)
    expect(body.failureCount).toBe(1)
    expect(body.errors).toHaveLength(1)
    expect(body.errors[0].studentId).toBe(2)
    expect(body.errors[0].error).toContain("LLM timeout")
  })
})

// ============================================================================
// 日次 Cron テスト
// ============================================================================

describe("update-student-memory-daily", () => {
  let GET: (request: Request) => Promise<Response>

  beforeEach(async () => {
    vi.clearAllMocks()
    process.env.CRON_SECRET = "test-secret-123"

    const mod = await import("../../cron/update-student-memory-daily/route")
    GET = mod.GET
  })

  it("不正なCRON_SECRETで401を返す", async () => {
    const request = new Request("http://localhost/api/cron/update-student-memory-daily", {
      headers: { authorization: "Bearer wrong-secret" },
    })

    const response = await GET(request)
    expect(response.status).toBe(401)
  })

  it("メモリ行なしで空レスポンスを返す", async () => {
    mockServiceClient.from.mockReturnValue({
      select: vi.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    })

    const request = new Request("http://localhost/api/cron/update-student-memory-daily", {
      headers: { authorization: "Bearer test-secret-123" },
    })

    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.totalStudents).toBe(0)
  })

  it("正常に差分更新する", async () => {
    mockServiceClient.from.mockReturnValue({
      select: vi.fn().mockResolvedValue({
        data: [{ student_id: 1 }, { student_id: 2 }],
        error: null,
      }),
    })

    // 1人目: 更新あり、2人目: 更新なし
    mockAppendDailyDelta
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false)

    const request = new Request("http://localhost/api/cron/update-student-memory-daily", {
      headers: { authorization: "Bearer test-secret-123" },
    })

    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.totalStudents).toBe(2)
    expect(body.updatedCount).toBe(1)
    expect(body.skippedCount).toBe(1)
  })
})
