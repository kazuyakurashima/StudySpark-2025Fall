/**
 * lib/llm/memory-generator.ts のユニットテスト
 *
 * - parseMemoryResponse: マーカー正常 / マーカー欠落時のフォールバック
 * - generateStudentMemory: SQL集計 → プロンプト構築（Supabaseモック）
 * - appendDailyDelta: 追記 / トリム / 新規ログなしスキップ / UPDATE検出
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

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

// parseMemoryResponse は export されているので直接テスト可能
import { parseMemoryResponse } from "../memory-generator"

// ============================================================================
// parseMemoryResponse
// ============================================================================

describe("parseMemoryResponse", () => {
  it("正常なマーカー付きレスポンスをパースできる", () => {
    const content = `---compact_summary---
算数は上昇傾向。国語は安定。理科が課題。

---detailed_summary---
8週間を通じて算数の正答率が60%→80%に上昇。
特に図形分野の伸びが顕著。国語は70%前後で安定。
理科は実験系の問題でつまずく傾向。

---subject_trends---
{"算数": "上昇傾向", "国語": "安定", "理科": "課題あり"}

---stumbling_patterns---
{"計算": "焦ると計算ミスが増える"}

---effective_encouragements---
{"タイプ": "具体的な努力を認める"}

---recent_successes---
{"最近": "算数3週連続80%超え"}

---emotional_tendencies---
{"全体": "前向き", "注意": "テスト前に不安"}`

    const result = parseMemoryResponse(content)

    expect(result.compactSummary).toContain("算数は上昇傾向")
    expect(result.detailedSummary).toContain("8週間を通じて")
    expect(result.subjectTrends).toEqual({ 算数: "上昇傾向", 国語: "安定", 理科: "課題あり" })
    expect(result.stumblingPatterns).toEqual({ 計算: "焦ると計算ミスが増える" })
    expect(result.effectiveEncouragements).toEqual({ タイプ: "具体的な努力を認める" })
    expect(result.recentSuccesses).toEqual({ 最近: "算数3週連続80%超え" })
    expect(result.emotionalTendencies).toEqual({ 全体: "前向き", 注意: "テスト前に不安" })
  })

  it("マーカー欠落時はフォールバック（全文をcompact_summaryに格納）", () => {
    const content = "これはマーカーなしのテキストです。AIが指定フォーマットに従わなかった場合のフォールバック。"

    const result = parseMemoryResponse(content)

    expect(result.compactSummary).toBe(content)
    expect(result.detailedSummary).toBe(content)
    expect(result.subjectTrends).toEqual({})
    expect(result.stumblingPatterns).toEqual({})
  })

  it("JSON部分が不正な場合は空オブジェクトを返す", () => {
    const content = `---compact_summary---
テスト要約

---detailed_summary---
詳細テスト

---subject_trends---
これはJSONではありません

---stumbling_patterns---
{"有効": "JSON"}

---effective_encouragements---
{}

---recent_successes---
{}

---emotional_tendencies---
{}`

    const result = parseMemoryResponse(content)

    expect(result.compactSummary).toBe("テスト要約")
    expect(result.subjectTrends).toEqual({}) // 不正JSONは空
    expect(result.stumblingPatterns).toEqual({ 有効: "JSON" }) // 正常JSONはパース
  })

  it("空レスポンスでフォールバック", () => {
    const result = parseMemoryResponse("")

    expect(result.compactSummary).toBe("")
    expect(result.detailedSummary).toBe("")
    expect(result.subjectTrends).toEqual({})
  })
})

// ============================================================================
// appendDailyDelta のモック用ヘルパー
// ============================================================================

function createMockSupabaseClient(options: {
  memoryRow?: {
    id: number
    last_study_log_id: number
    last_delta_at: string
    compact_summary: string
  } | null
  studyLogs?: Array<{
    id: number
    subject_id: number
    correct_count: number
    total_problems: number
    study_date: string
    subjects: { name: string }
  }>
  updateError?: Error | null
}) {
  const { memoryRow = null, studyLogs = [], updateError = null } = options

  return {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === "student_memory_summaries") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: memoryRow,
                error: memoryRow === null ? { code: "PGRST116" } : null,
              }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              error: updateError,
            }),
          }),
        }
      }
      if (table === "study_logs") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              or: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: studyLogs,
                  error: null,
                }),
              }),
            }),
          }),
        }
      }
      return {}
    }),
  }
}

// ============================================================================
// appendDailyDelta
// ============================================================================

describe("appendDailyDelta", () => {
  // Re-import with mocks applied
  let appendDailyDelta: typeof import("../memory-generator").appendDailyDelta

  beforeEach(async () => {
    vi.resetModules()
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
    const mod = await import("../memory-generator")
    appendDailyDelta = mod.appendDailyDelta
  })

  it("メモリ行が存在しない場合はスキップ（false返却）", async () => {
    const client = createMockSupabaseClient({ memoryRow: null })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await appendDailyDelta(client as any, 1)
    expect(result).toBe(false)
  })

  it("新規ログがない場合はスキップ（false返却）", async () => {
    const client = createMockSupabaseClient({
      memoryRow: {
        id: 1,
        last_study_log_id: 100,
        last_delta_at: "2026-03-12T00:00:00Z",
        compact_summary: "既存の要約",
      },
      studyLogs: [],
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await appendDailyDelta(client as any, 1)
    expect(result).toBe(false)
  })

  it("新規ログがある場合は追記してtrue返却", async () => {
    const updateFn = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    })

    const client = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "student_memory_summaries") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 1,
                    last_study_log_id: 100,
                    last_delta_at: "2026-03-12T00:00:00Z",
                    compact_summary: "既存の要約",
                  },
                  error: null,
                }),
              }),
            }),
            update: updateFn,
          }
        }
        if (table === "study_logs") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                or: vi.fn().mockReturnValue({
                  order: vi.fn().mockResolvedValue({
                    data: [
                      {
                        id: 101,
                        subject_id: 1,
                        correct_count: 8,
                        total_problems: 10,
                        study_date: "2026-03-13",
                        subjects: { name: "算数" },
                      },
                      {
                        id: 102,
                        subject_id: 2,
                        correct_count: 6,
                        total_problems: 8,
                        study_date: "2026-03-13",
                        subjects: { name: "国語" },
                      },
                    ],
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }
        return {}
      }),
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await appendDailyDelta(client as any, 1)
    expect(result).toBe(true)

    // update が呼ばれたことを確認
    expect(updateFn).toHaveBeenCalledWith(
      expect.objectContaining({
        compact_summary: expect.stringContaining("算数80%"),
        last_study_log_id: 102,
      }),
    )
  })

  it("compact_summaryが750文字超過時に古い行を削除", async () => {
    // 既に長い要約を持つケース
    const longSummary = Array(20)
      .fill("[03/01] 算数85% 国語70% 理科60% 社会75%")
      .join("\n")

    const updateFn = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    })

    const client = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "student_memory_summaries") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 1,
                    last_study_log_id: 100,
                    last_delta_at: "2026-03-01T00:00:00Z",
                    compact_summary: longSummary,
                  },
                  error: null,
                }),
              }),
            }),
            update: updateFn,
          }
        }
        if (table === "study_logs") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                or: vi.fn().mockReturnValue({
                  order: vi.fn().mockResolvedValue({
                    data: [
                      {
                        id: 101,
                        subject_id: 1,
                        correct_count: 9,
                        total_problems: 10,
                        study_date: "2026-03-13",
                        subjects: { name: "算数" },
                      },
                    ],
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }
        return {}
      }),
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await appendDailyDelta(client as any, 1)

    const updateArg = updateFn.mock.calls[0][0]
    expect(updateArg.compact_summary.length).toBeLessThanOrEqual(750)
  })
})

// ============================================================================
// generateStudentMemory (空データケース)
// ============================================================================

describe("generateStudentMemory", () => {
  let generateStudentMemory: typeof import("../memory-generator").generateStudentMemory

  beforeEach(async () => {
    vi.resetModules()
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
    const mod = await import("../memory-generator")
    generateStudentMemory = mod.generateStudentMemory
  })

  it("空データ（新規生徒）でも graceful に空メモリを返す", async () => {
    // チェーン可能なモック: 全メソッドが自分自身を返し、最終的に空データを解決
    const emptyResult = { data: [], error: null }
    const singleResult = {
      data: { full_name: "テスト太郎", grade: 5, course: "A" },
      error: null,
    }

    function createChainMock(isSingle = false) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const chain: any = {}
      const methods = ["select", "eq", "gte", "lte", "order", "limit", "or"]
      for (const method of methods) {
        chain[method] = vi.fn().mockReturnValue(chain)
      }
      chain.single = vi.fn().mockResolvedValue(isSingle ? singleResult : emptyResult)
      // Promise.all で await されるケースに対応
      chain.then = (resolve: (v: unknown) => void) => Promise.resolve(emptyResult).then(resolve)
      return chain
    }

    const client = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "students") {
          return createChainMock(true)
        }
        return createChainMock(false)
      }),
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await generateStudentMemory(client as any, 1)

    expect(result.compactSummary).toBe("")
    expect(result.detailedSummary).toBe("")
    expect(result.subjectTrends).toEqual({})
    expect(result.weeksCovered).toBe(0)
  })

  it("studentsクエリエラー時は例外を投げる", async () => {
    function createErrorChainMock() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const chain: any = {}
      const methods = ["select", "eq", "gte", "lte", "order", "limit", "or"]
      for (const method of methods) {
        chain[method] = vi.fn().mockReturnValue(chain)
      }
      chain.single = vi.fn().mockResolvedValue({
        data: null,
        error: { message: "connection refused" },
      })
      chain.then = (resolve: (v: unknown) => void) =>
        Promise.resolve({ data: [], error: null }).then(resolve)
      return chain
    }

    const client = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "students") {
          return createErrorChainMock()
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const chain: any = {}
        const methods = ["select", "eq", "gte", "lte", "order", "limit", "or"]
        for (const method of methods) {
          chain[method] = vi.fn().mockReturnValue(chain)
        }
        chain.then = (resolve: (v: unknown) => void) =>
          Promise.resolve({ data: [], error: null }).then(resolve)
        return chain
      }),
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(generateStudentMemory(client as any, 1)).rejects.toThrow("students query failed")
  })

  it("study_logsクエリエラー時は例外を投げる", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function createChainMock(resolveValue: any) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const chain: any = {}
      const methods = ["select", "eq", "gte", "lte", "order", "limit", "or"]
      for (const method of methods) {
        chain[method] = vi.fn().mockReturnValue(chain)
      }
      chain.single = vi.fn().mockResolvedValue(resolveValue)
      chain.then = (resolve: (v: unknown) => void) =>
        Promise.resolve(resolveValue).then(resolve)
      return chain
    }

    const client = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "students") {
          return createChainMock({
            data: { full_name: "テスト", grade: 5, course: "A" },
            error: null,
          })
        }
        if (table === "study_logs") {
          return createChainMock({
            data: null,
            error: { message: "timeout" },
          })
        }
        return createChainMock({ data: [], error: null })
      }),
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(generateStudentMemory(client as any, 1)).rejects.toThrow("study_logs query failed")
  })
})

// ============================================================================
// appendDailyDelta: 同日更新時の重複防止
// ============================================================================

describe("appendDailyDelta dedup", () => {
  let appendDailyDelta: typeof import("../memory-generator").appendDailyDelta

  beforeEach(async () => {
    vi.resetModules()
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
    const mod = await import("../memory-generator")
    appendDailyDelta = mod.appendDailyDelta
  })

  it("同日の更新ログがある場合、既存行を上書きして重複しない", async () => {
    const updateFn = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    })

    const client = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "student_memory_summaries") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 1,
                    last_study_log_id: 100,
                    last_delta_at: "2026-03-12T00:00:00Z",
                    compact_summary: "[03/13] 算数70% 国語60%\n[03/12] 理科80%",
                  },
                  error: null,
                }),
              }),
            }),
            update: updateFn,
          }
        }
        if (table === "study_logs") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                or: vi.fn().mockReturnValue({
                  order: vi.fn().mockResolvedValue({
                    data: [
                      {
                        id: 101,
                        subject_id: 1,
                        correct_count: 9,
                        total_problems: 10,
                        study_date: "2026-03-13",
                        subjects: { name: "算数" },
                      },
                    ],
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }
        return {}
      }),
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await appendDailyDelta(client as any, 1)
    expect(result).toBe(true)

    const updateArg = updateFn.mock.calls[0][0]
    const lines = updateArg.compact_summary.split("\n").filter((l: string) => l.trim())
    // [03/13] は上書きされて1行のみ（重複なし）
    const march13Lines = lines.filter((l: string) => l.startsWith("[03/13]"))
    expect(march13Lines).toHaveLength(1)
    expect(march13Lines[0]).toContain("算数90%") // 更新後の値
    // [03/12] は残る
    const march12Lines = lines.filter((l: string) => l.startsWith("[03/12]"))
    expect(march12Lines).toHaveLength(1)
  })
})
