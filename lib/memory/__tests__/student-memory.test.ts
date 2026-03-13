/**
 * lib/memory/student-memory.ts のユニットテスト
 *
 * - 各取得関数の正常系
 * - データなし時の null 返却
 */

import { describe, it, expect, vi } from "vitest"
import { getCompactMemory, getDetailedMemory, getStructuredMemory } from "../student-memory"

// ============================================================================
// モックヘルパー
// ============================================================================

function createMockClient(data: Record<string, unknown> | null, error: unknown = null) {
  return {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data, error }),
        }),
      }),
    }),
  }
}

// ============================================================================
// getCompactMemory
// ============================================================================

describe("getCompactMemory", () => {
  it("正常系: compact_summary を返す", async () => {
    const client = createMockClient({ compact_summary: "算数は上昇傾向。国語は安定。" })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await getCompactMemory(client as any, 1)
    expect(result).toBe("算数は上昇傾向。国語は安定。")
  })

  it("データなし: null を返す", async () => {
    const client = createMockClient(null, { code: "PGRST116" })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await getCompactMemory(client as any, 1)
    expect(result).toBeNull()
  })

  it("compact_summary が空文字: null を返す", async () => {
    const client = createMockClient({ compact_summary: "" })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await getCompactMemory(client as any, 1)
    expect(result).toBeNull()
  })
})

// ============================================================================
// getDetailedMemory
// ============================================================================

describe("getDetailedMemory", () => {
  it("正常系: detailed_summary を返す", async () => {
    const client = createMockClient({ detailed_summary: "8週間の詳細分析..." })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await getDetailedMemory(client as any, 1)
    expect(result).toBe("8週間の詳細分析...")
  })

  it("データなし: null を返す", async () => {
    const client = createMockClient(null, { code: "PGRST116" })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await getDetailedMemory(client as any, 1)
    expect(result).toBeNull()
  })
})

// ============================================================================
// getStructuredMemory
// ============================================================================

describe("getStructuredMemory", () => {
  it("正常系: 構造化メモリを返す", async () => {
    const client = createMockClient({
      student_id: 42,
      compact_summary: "要約",
      detailed_summary: "詳細",
      subject_trends: { 算数: "上昇" },
      stumbling_patterns: { 計算: "ミスが多い" },
      effective_encouragements: {},
      recent_successes: { 最近: "90%達成" },
      emotional_tendencies: { 全体: "前向き" },
      last_study_log_id: 500,
      last_delta_at: "2026-03-13T00:00:00Z",
      data_window_start: "2026-01-20",
      data_window_end: "2026-03-13",
      weeks_covered: 8,
      last_generated_at: "2026-03-10T17:00:00Z",
      generation_version: 3,
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await getStructuredMemory(client as any, 42)

    expect(result).not.toBeNull()
    expect(result!.studentId).toBe(42)
    expect(result!.compactSummary).toBe("要約")
    expect(result!.detailedSummary).toBe("詳細")
    expect(result!.subjectTrends).toEqual({ 算数: "上昇" })
    expect(result!.lastStudyLogId).toBe(500)
    expect(result!.generationVersion).toBe(3)
    expect(result!.weeksCovered).toBe(8)
  })

  it("データなし: null を返す", async () => {
    const client = createMockClient(null, { code: "PGRST116" })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await getStructuredMemory(client as any, 1)
    expect(result).toBeNull()
  })
})
