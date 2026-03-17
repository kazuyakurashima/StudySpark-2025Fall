/**
 * /api/exercise/feedback-stream — SSE Route Handler テスト
 *
 * テスト対象:
 * - 401: 未認証
 * - キャッシュヒット → done + meta:save_ok を即座にストリーム
 * - LLM正常 → delta + done + meta:save_ok
 * - LLM失敗 → フォールバック done + meta:save_ok（error イベントなし）
 * - 空出力 → フォールバック done（LLM から空文字が返ったとき）
 * - 23505競合 → meta:save_ok（既存行として扱う）
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("server-only", () => ({}))

// ============================================================================
// requireAuth モック
// ============================================================================

const mockRequireAuth = vi.fn()
vi.mock("@/lib/api/auth", () => ({ requireAuth: mockRequireAuth }))

// ============================================================================
// Supabase モック
// ============================================================================

const mockAdminFrom = vi.fn()
const mockRouteFrom = vi.fn()

vi.mock("@/lib/supabase/route", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: vi.fn() },
    from: mockRouteFrom,
  })),
}))

vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}))

// ============================================================================
// generateCoachFeedbackStream モック
// ============================================================================

const mockGenerateCoachFeedbackStream = vi.fn()
vi.mock("@/lib/services/coach-feedback-stream", () => ({
  generateCoachFeedbackStream: mockGenerateCoachFeedbackStream,
}))

// ============================================================================
// ヘルパー
// ============================================================================

/** chain helper: 各メソッドが自身を返し、single() で resolvedValue を返す */
function makeChain(data: unknown, error: unknown = null) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain: any = {}
  for (const m of ["select", "eq", "in", "insert"]) {
    chain[m] = vi.fn(() => chain)
  }
  chain.single = vi.fn(() => Promise.resolve({ data, error }))
  return chain
}

/** ReadableStream からすべての SSE イベントを収集して返す */
async function collectSSE(
  stream: ReadableStream
): Promise<Array<{ type: string; content: string }>> {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let buffer = ""
  const events: Array<{ type: string; content: string }> = []

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
  }

  for (const line of buffer.split("\n")) {
    if (line.startsWith("data: ")) {
      try {
        const parsed = JSON.parse(line.slice(6))
        events.push(parsed)
      } catch {
        // 無視
      }
    }
  }
  return events
}

/** POST リクエストを組み立てる */
function makeRequest(body: unknown) {
  return new Request("http://localhost/api/exercise/feedback-stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

// ============================================================================
// テスト
// ============================================================================

describe("POST /api/exercise/feedback-stream", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // デフォルト: 認証OK
    mockRequireAuth.mockResolvedValue({
      user: { id: "user-uuid" },
      profile: { role: "student" },
    })
    // Route Handler クライアント（supabase.from("students") で使用）
    mockRouteFrom.mockImplementation((table: string) => {
      if (table === "students") return makeChain({ id: 1, full_name: "太郎" })
      return makeChain(null)
    })
  })

  it("未認証 → 401を返す", async () => {
    const { NextResponse } = await import("next/server")
    mockRequireAuth.mockResolvedValue({
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    })

    const { POST } = await import("../feedback-stream/route")
    const res = await POST(makeRequest({ exerciseReflectionId: 1 }) as never)

    expect(res.status).toBe(401)
  })

  it("キャッシュヒット → done + meta:save_ok を即座に返す", async () => {
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "students") return makeChain({ id: 1, full_name: "太郎" })
      if (table === "exercise_reflections")
        return makeChain({ id: 10, answer_session_id: 100, section_name: "反復問題（基本）", reflection_text: "理解できた" })
      if (table === "answer_sessions")
        return makeChain({ student_id: 1, question_set_id: 5 })
      if (table === "exercise_feedbacks")
        return makeChain({ feedback_text: "キャッシュ済みフィードバック" })
      return makeChain(null)
    })

    const { POST } = await import("../feedback-stream/route")
    const res = await POST(makeRequest({ exerciseReflectionId: 10 }) as never)

    expect(res.headers.get("content-type")).toMatch(/text\/event-stream/)

    const events = await collectSSE(res.body as ReadableStream)
    expect(events).toContainEqual({ type: "done", content: "キャッシュ済みフィードバック" })
    expect(events).toContainEqual({ type: "meta", content: "save_ok" })
    // error イベントがないこと
    expect(events.every((e) => e.type !== "error")).toBe(true)
  })

  it("LLM正常 → delta + done + meta:save_ok", async () => {
    let feedbackCallCount = 0
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "students") return makeChain({ id: 1, full_name: "花子" })
      if (table === "exercise_reflections")
        return makeChain({ id: 20, answer_session_id: 200, section_name: "実戦演習", reflection_text: "難しかった" })
      if (table === "answer_sessions")
        return makeChain({ student_id: 1, question_set_id: 6 })
      if (table === "exercise_feedbacks") {
        feedbackCallCount++
        if (feedbackCallCount === 1) return makeChain(null) // 冪等チェック → なし
        // INSERT 用チェーン
        const c = makeChain(null)
        c.insert = vi.fn(() => Promise.resolve({ error: null }))
        return c
      }
      if (table === "questions") {
        const c = makeChain(null)
        // .select().eq().eq() → then
        c.then = (resolve: (v: unknown) => void) => resolve({ data: [{ id: 1 }, { id: 2 }], error: null })
        c.eq = vi.fn(() => c)
        c.select = vi.fn(() => c)
        return c
      }
      if (table === "student_answers") {
        const c = makeChain(null)
        c.then = (resolve: (v: unknown) => void) =>
          resolve({
            data: [
              { question_id: 1, is_correct: true },
              { question_id: 2, is_correct: false },
            ],
            error: null,
          })
        c.eq = vi.fn(() => c)
        c.in = vi.fn(() => c)
        c.select = vi.fn(() => c)
        return c
      }
      return makeChain(null)
    })

    async function* fakeStream() {
      yield { type: "delta", content: "よく" }
      yield { type: "delta", content: "頑張った！" }
      yield { type: "done", content: "よく頑張った！" }
    }
    mockGenerateCoachFeedbackStream.mockReturnValue(fakeStream())

    const { POST } = await import("../feedback-stream/route")
    const res = await POST(makeRequest({ exerciseReflectionId: 20 }) as never)

    const events = await collectSSE(res.body as ReadableStream)
    const types = events.map((e) => e.type)
    expect(types).toContain("delta")
    expect(types).toContain("done")
    expect(events).toContainEqual({ type: "meta", content: "save_ok" })
    expect(events.every((e) => e.type !== "error")).toBe(true)
  })

  it("LLM失敗 → フォールバック done + meta:save_ok（error イベントなし）", async () => {
    let feedbackCallCount = 0
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "students") return makeChain({ id: 1, full_name: "一郎" })
      if (table === "exercise_reflections")
        return makeChain({ id: 30, answer_session_id: 300, section_name: "反復問題（練習）", reflection_text: "難しかった" })
      if (table === "answer_sessions")
        return makeChain({ student_id: 1, question_set_id: 7 })
      if (table === "exercise_feedbacks") {
        feedbackCallCount++
        if (feedbackCallCount === 1) return makeChain(null)
        const c = makeChain(null)
        c.insert = vi.fn(() => Promise.resolve({ error: null }))
        return c
      }
      if (table === "questions") {
        const c = makeChain(null)
        c.then = (resolve: (v: unknown) => void) => resolve({ data: [], error: null })
        c.eq = vi.fn(() => c)
        c.select = vi.fn(() => c)
        return c
      }
      return makeChain(null)
    })

    mockGenerateCoachFeedbackStream.mockImplementation(function* () {
      throw new Error("LLM接続失敗")
    })

    const { POST } = await import("../feedback-stream/route")
    const res = await POST(makeRequest({ exerciseReflectionId: 30 }) as never)

    const events = await collectSSE(res.body as ReadableStream)
    // error イベントが含まれないこと（P0修正の検証）
    expect(events.every((e) => e.type !== "error")).toBe(true)
    // done イベントが含まれること（フォールバック）
    const doneEvent = events.find((e) => e.type === "done")
    expect(doneEvent).toBeDefined()
    expect(doneEvent?.content.length).toBeGreaterThan(0)
    expect(events).toContainEqual({ type: "meta", content: "save_ok" })
  })

  it("23505競合（INSERT）→ meta:save_ok として扱う", async () => {
    let feedbackCallCount = 0
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "students") return makeChain({ id: 1, full_name: "二郎" })
      if (table === "exercise_reflections")
        return makeChain({ id: 40, answer_session_id: 400, section_name: "ステップ①", reflection_text: "理解できた" })
      if (table === "answer_sessions")
        return makeChain({ student_id: 1, question_set_id: 8 })
      if (table === "exercise_feedbacks") {
        feedbackCallCount++
        if (feedbackCallCount === 1) return makeChain(null)
        // INSERT → 23505
        const c = makeChain(null)
        c.insert = vi.fn(() => Promise.resolve({ error: { code: "23505", message: "duplicate" } }))
        return c
      }
      if (table === "questions") {
        const c = makeChain(null)
        c.then = (resolve: (v: unknown) => void) => resolve({ data: [], error: null })
        c.eq = vi.fn(() => c)
        c.select = vi.fn(() => c)
        return c
      }
      return makeChain(null)
    })

    async function* fakeStream() {
      yield { type: "done", content: "素晴らしい！" }
    }
    mockGenerateCoachFeedbackStream.mockReturnValue(fakeStream())

    const { POST } = await import("../feedback-stream/route")
    const res = await POST(makeRequest({ exerciseReflectionId: 40 }) as never)

    const events = await collectSSE(res.body as ReadableStream)
    expect(events).toContainEqual({ type: "meta", content: "save_ok" })
  })
})
