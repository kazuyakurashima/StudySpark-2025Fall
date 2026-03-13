/**
 * Spark feedback-stream Route Handler テスト
 *
 * POST() を実行し、SSEストリームを読み取って以下を検証:
 * 1. done → meta(save_ok|save_failed) の順序保証
 * 2. UNIQUE競合時に save_ok が返ること
 * 3. 空文字完了時にfallbackが送られ meta が必ずあること
 * 4. abort 時に meta が送出されないこと
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

// ============================================================================
// モック設定
// ============================================================================

// server-only
vi.mock("server-only", () => ({}))

// crypto
vi.mock("crypto", () => ({
  default: {
    createHash: () => ({
      update: () => ({
        digest: () => "abcdef1234567890abcdef1234567890",
      }),
    }),
  },
}))

// requireAuth
const mockRequireAuth = vi.fn()
vi.mock("@/lib/api/auth", () => ({
  requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
}))

// supabase/route
const mockRouteSupabase = {
  from: vi.fn(),
}
vi.mock("@/lib/supabase/route", () => ({
  createClient: () => Promise.resolve(mockRouteSupabase),
}))

// supabase/server (createAdminClient)
const mockAdminClient = {
  from: vi.fn(),
}
vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: () => mockAdminClient,
}))

// Langfuse
vi.mock("@/lib/langfuse/client", () => ({
  getLangfuseClient: () => null,
}))

// sanitizeForLog
vi.mock("@/lib/llm/logger", () => ({
  sanitizeForLog: (v: unknown) => v,
}))

// PerfTimer
vi.mock("@/lib/utils/perf-timer", () => ({
  PerfTimer: class {
    mark() {}
    measure() {}
    toMetadata() { return {} }
  },
}))

// generateCoachFeedbackStream — テストごとに差し替え
const mockStream = vi.fn()
vi.mock("@/lib/services/coach-feedback-stream", () => ({
  generateCoachFeedbackStream: (...args: unknown[]) => mockStream(...args),
}))

// coach-feedback サービス層 — 部分モック
vi.mock("@/lib/services/coach-feedback", async () => {
  const actual = await vi.importActual("@/lib/services/coach-feedback") as Record<string, unknown>
  return {
    ...actual,
    verifyBatchOwnership: vi.fn(),
    checkExistingFeedback: vi.fn(),
    saveFeedbackToDb: vi.fn(),
    saveFallbackToDb: vi.fn(),
  }
})

import { POST } from "../feedback-stream/route"
import { NextRequest } from "next/server"
import {
  verifyBatchOwnership,
  checkExistingFeedback,
  saveFeedbackToDb,
  saveFallbackToDb,
} from "@/lib/services/coach-feedback"

// ============================================================================
// ヘルパー
// ============================================================================

function createRequest(body: object, signal?: AbortSignal): NextRequest {
  return new NextRequest("http://localhost/api/spark/feedback-stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  })
}

const validBody = {
  studentId: 1,
  sessionId: 1,
  batchId: "batch-123",
  studyLogIds: [10],
  data: {
    subjects: [{ name: "算数", correct: 8, total: 10, accuracy: 80 }],
  },
}

async function readSSEEvents(response: Response): Promise<Array<{ type: string; content: string }>> {
  const text = await response.text()
  const events: Array<{ type: string; content: string }> = []
  for (const part of text.split("\n\n")) {
    if (!part.startsWith("data: ")) continue
    try {
      events.push(JSON.parse(part.slice(6)))
    } catch {
      // heartbeat or invalid
    }
  }
  return events
}

// 正常ストリーム用の AsyncGenerator
async function* fakeStream() {
  yield { type: "delta" as const, content: "よく" }
  yield { type: "delta" as const, content: "頑張った" }
  yield { type: "done" as const, content: "よく頑張った" }
}

// 空文字ストリーム用
async function* emptyStream() {
  yield { type: "done" as const, content: "" }
}

// ============================================================================
// 共通セットアップ
// ============================================================================

function setupMocks() {
  // requireAuth → student認証成功
  mockRequireAuth.mockResolvedValue({
    user: { id: "user-abc" },
    profile: { role: "student" },
  })

  // students テーブル → student_id = 1
  mockRouteSupabase.from.mockReturnValue({
    select: () => ({
      eq: () => ({
        single: () => Promise.resolve({ data: { id: 1 }, error: null }),
      }),
    }),
  })

  // バッチ検証成功
  vi.mocked(verifyBatchOwnership).mockResolvedValue({
    ok: true,
    verifiedSessionId: 1,
    representativeStudyLogId: 10,
  })

  // キャッシュミス
  vi.mocked(checkExistingFeedback).mockResolvedValue({ hit: false })

  // DB保存成功
  vi.mocked(saveFeedbackToDb).mockResolvedValue({ saved: true })
  vi.mocked(saveFallbackToDb).mockResolvedValue(true)
}

// ============================================================================
// テスト
// ============================================================================

beforeEach(() => {
  vi.clearAllMocks()
  setupMocks()
})

describe("POST /api/spark/feedback-stream", () => {
  it("ストリーミング成功: delta* → done → meta(save_ok) の順序", async () => {
    mockStream.mockReturnValue(fakeStream())

    const response = await POST(createRequest(validBody))
    expect(response.status).toBe(200)

    const events = await readSSEEvents(response)

    // delta が done より前
    const doneIdx = events.findIndex((e) => e.type === "done")
    const deltas = events.filter((e) => e.type === "delta")
    expect(deltas.length).toBeGreaterThan(0)
    for (const d of deltas) {
      expect(events.indexOf(d)).toBeLessThan(doneIdx)
    }

    // meta は done より後で最終イベント
    const metaIdx = events.findIndex((e) => e.type === "meta")
    expect(metaIdx).toBeGreaterThan(doneIdx)
    expect(metaIdx).toBe(events.length - 1)
    expect(events[metaIdx].content).toBe("save_ok")
  })

  it("UNIQUE競合で existingText がある場合は save_ok", async () => {
    mockStream.mockReturnValue(fakeStream())
    vi.mocked(saveFeedbackToDb).mockResolvedValue({
      saved: false,
      existingText: "既存のフィードバック",
    })

    const response = await POST(createRequest(validBody))
    const events = await readSSEEvents(response)

    const metaEvent = events.find((e) => e.type === "meta")
    expect(metaEvent).toBeDefined()
    expect(metaEvent!.content).toBe("save_ok")
  })

  it("DB保存失敗（existingTextなし）で save_failed", async () => {
    mockStream.mockReturnValue(fakeStream())
    vi.mocked(saveFeedbackToDb).mockResolvedValue({ saved: false })

    const response = await POST(createRequest(validBody))
    const events = await readSSEEvents(response)

    const metaEvent = events.find((e) => e.type === "meta")
    expect(metaEvent).toBeDefined()
    expect(metaEvent!.content).toBe("save_failed")
  })

  it("空文字完了時にfallbackのみ送られ done は1回、meta が必ずある", async () => {
    mockStream.mockReturnValue(emptyStream())

    const response = await POST(createRequest(validBody))
    const events = await readSSEEvents(response)

    // done は fallback の1回のみ（空文字 done はクライアントに流さない）
    const doneEvents = events.filter((e) => e.type === "done")
    expect(doneEvents.length).toBe(1)
    expect(doneEvents[0].content.length).toBeGreaterThan(0) // fallback は空でない

    // meta は必ず存在し、done の後
    const metaEvent = events.find((e) => e.type === "meta")
    expect(metaEvent).toBeDefined()
    expect(["save_ok", "save_failed"]).toContain(metaEvent!.content)
    expect(events.indexOf(metaEvent!)).toBeGreaterThan(events.indexOf(doneEvents[0]))
  })

  it("キャッシュヒット時は done → meta(save_ok) のみ", async () => {
    vi.mocked(checkExistingFeedback).mockResolvedValue({
      hit: true,
      feedbackText: "キャッシュされたメッセージ",
    })

    const response = await POST(createRequest(validBody))
    const events = await readSSEEvents(response)

    expect(events.length).toBe(2)
    expect(events[0].type).toBe("done")
    expect(events[0].content).toBe("キャッシュされたメッセージ")
    expect(events[1].type).toBe("meta")
    expect(events[1].content).toBe("save_ok")

    // delta がないことを確認
    expect(events.filter((e) => e.type === "delta").length).toBe(0)
  })

  it("abort 時に meta が送出されない", async () => {
    const abortController = new AbortController()

    // ストリーム中に abort を発火するジェネレータ
    async function* abortingStream() {
      yield { type: "delta" as const, content: "よ" }
      // abort を発火
      abortController.abort()
      yield { type: "delta" as const, content: "く" }
      yield { type: "done" as const, content: "よく" }
    }

    mockStream.mockReturnValue(abortingStream())

    const response = await POST(createRequest(validBody, abortController.signal))
    const events = await readSSEEvents(response)

    // meta がないことを確認
    const metaEvent = events.find((e) => e.type === "meta")
    expect(metaEvent).toBeUndefined()

    // saveFeedbackToDb が呼ばれていないことを確認
    expect(saveFeedbackToDb).not.toHaveBeenCalled()
  })
})
