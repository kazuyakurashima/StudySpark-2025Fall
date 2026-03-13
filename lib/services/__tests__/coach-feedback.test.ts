import { describe, it, expect, vi } from "vitest"

// crypto モジュールのモック（getPromptHash用）
vi.mock("crypto", () => ({
  default: {
    createHash: () => ({
      update: () => ({
        digest: () => "abcdef1234567890abcdef1234567890",
      }),
    }),
  },
}))

// server-only のモック（lib/llm/client.ts が import するため）
vi.mock("server-only", () => ({}))

// sanitizeForLog のモック
vi.mock("@/lib/llm/logger", () => ({
  sanitizeForLog: (v: unknown) => v,
}))

import {
  getUserPrompt,
  getFallbackFeedback,
  getPromptHash,
  getTimeoutMs,
  getSystemPrompt,
  verifyBatchOwnership,
  checkExistingFeedback,
  saveFeedbackToDb,
} from "../coach-feedback"
import type { StudyDataForFeedback } from "@/lib/types/coach-feedback"

// ============================================================================
// getUserPrompt
// ============================================================================

describe("getUserPrompt", () => {
  const baseData: StudyDataForFeedback = {
    subjects: [
      { name: "算数", correct: 8, total: 10, accuracy: 80 },
    ],
  }

  it("基本的な学習記録でプロンプトを生成する", () => {
    const prompt = getUserPrompt(baseData)
    expect(prompt).toContain("算数: 8/10問正解（80%）")
    expect(prompt).toContain("生徒を励ます短いメッセージを生成してください")
  })

  it("連続学習日数3日以上で連続日数を含める", () => {
    const data: StudyDataForFeedback = { ...baseData, streak: 5 }
    const prompt = getUserPrompt(data)
    expect(prompt).toContain("連続学習日数: 5日")
  })

  it("連続学習日数2日以下では連続日数を含めない", () => {
    const data: StudyDataForFeedback = { ...baseData, streak: 2 }
    const prompt = getUserPrompt(data)
    expect(prompt).not.toContain("連続学習日数")
  })

  it("前回比がプラスのとき差分を含める", () => {
    const data: StudyDataForFeedback = { ...baseData, previousAccuracy: 60 }
    const prompt = getUserPrompt(data)
    expect(prompt).toContain("前回比: +20%アップ")
  })

  it("振り返りテキストがあれば反映する", () => {
    const data: StudyDataForFeedback = {
      ...baseData,
      reflectionText: "今日は集中できた",
    }
    const prompt = getUserPrompt(data)
    expect(prompt).toContain("今日は集中できた")
    expect(prompt).toContain("生徒の振り返りコメント")
  })
})

// ============================================================================
// getFallbackFeedback
// ============================================================================

describe("getFallbackFeedback", () => {
  it("3科目以上で科目数メッセージを返す", () => {
    const data: StudyDataForFeedback = {
      subjects: [
        { name: "算数", correct: 5, total: 10, accuracy: 50 },
        { name: "国語", correct: 5, total: 10, accuracy: 50 },
        { name: "理科", correct: 5, total: 10, accuracy: 50 },
      ],
    }
    expect(getFallbackFeedback(data)).toContain("3科目")
  })

  it("平均正答率80%以上で達成メッセージを返す", () => {
    const data: StudyDataForFeedback = {
      subjects: [
        { name: "算数", correct: 9, total: 10, accuracy: 90 },
      ],
    }
    expect(getFallbackFeedback(data)).toContain("素晴らしい集中力")
  })

  it("平均正答率50-79%で取り組みメッセージを返す", () => {
    const data: StudyDataForFeedback = {
      subjects: [
        { name: "算数", correct: 6, total: 10, accuracy: 60 },
      ],
    }
    expect(getFallbackFeedback(data)).toContain("しっかり取り組めた")
  })

  it("平均正答率50%未満で努力メッセージを返す", () => {
    const data: StudyDataForFeedback = {
      subjects: [
        { name: "算数", correct: 3, total: 10, accuracy: 30 },
      ],
    }
    expect(getFallbackFeedback(data)).toContain("その努力が大事")
  })
})

// ============================================================================
// verifyBatchOwnership
// ============================================================================

describe("verifyBatchOwnership", () => {
  it("所有権不一致でエラーを返す", async () => {
    const mockSupabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            data: [
              { id: 1, student_id: 999, session_id: 1, batch_id: "batch-1" },
            ],
            error: null,
          }),
        }),
      }),
    }

    const result = await verifyBatchOwnership(
      mockSupabase as any,
      1, // verifiedStudentId
      "batch-1",
      [1],
      1
    )

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toContain("アクセス権")
    }
  })

  it("batch_idで取得できない場合はbatch_not_foundを返す", async () => {
    const mockSupabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            data: [],
            error: null,
          }),
        }),
      }),
    }

    const result = await verifyBatchOwnership(
      mockSupabase as any,
      1,
      "batch-missing",
      [1],
      1
    )

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBe("batch_not_found")
    }
  })
})

// ============================================================================
// checkExistingFeedback
// ============================================================================

describe("checkExistingFeedback", () => {
  it("既存フィードバックなしでcache missを返す", async () => {
    const mockAdmin = {
      from: () => ({
        select: () => ({
          eq: () => ({
            single: () => ({ data: null, error: null }),
          }),
        }),
      }),
    }

    const result = await checkExistingFeedback(mockAdmin as any, "batch-1", false)
    expect(result.hit).toBe(false)
  })

  it("既存あり+振り返りなしでcache hitを返す", async () => {
    const mockAdmin = {
      from: () => ({
        select: () => ({
          eq: () => ({
            single: () => ({
              data: { id: 1, feedback_text: "よく頑張ったね！" },
              error: null,
            }),
          }),
        }),
      }),
    }

    const result = await checkExistingFeedback(mockAdmin as any, "batch-1", false)
    expect(result.hit).toBe(true)
    if (result.hit) {
      expect(result.feedbackText).toBe("よく頑張ったね！")
    }
  })

  it("既存あり+振り返りありで削除してcache missを返す", async () => {
    const deleteMock = vi.fn().mockReturnValue({
      eq: () => ({ error: null }),
    })

    const mockAdmin = {
      from: (table: string) => {
        if (table === "coach_feedbacks") {
          return {
            select: () => ({
              eq: () => ({
                single: () => ({
                  data: { id: 1, feedback_text: "古いフィードバック" },
                  error: null,
                }),
              }),
            }),
            delete: deleteMock,
          }
        }
        return {}
      },
    }

    const result = await checkExistingFeedback(mockAdmin as any, "batch-1", true)
    expect(result.hit).toBe(false)
    if (!result.hit) {
      expect(result.deleted).toBe(true)
    }
    expect(deleteMock).toHaveBeenCalled()
  })
})

// ============================================================================
// saveFeedbackToDb
// ============================================================================

describe("saveFeedbackToDb", () => {
  it("UNIQUE重複時にキャッシュを返却する", async () => {
    const mockAdmin = {
      from: () => ({
        insert: () => ({
          error: { code: "23505", message: "unique_violation", details: null, hint: null },
        }),
        select: () => ({
          eq: () => ({
            single: () => ({
              data: { feedback_text: "既存のフィードバック" },
              error: null,
            }),
          }),
        }),
      }),
    }

    const result = await saveFeedbackToDb(mockAdmin as any, {
      batchId: "batch-1",
      studyLogId: 1,
      studentId: 1,
      sessionId: 1,
      feedbackText: "新しいフィードバック",
      promptVersion: "v1.0",
      promptHash: "abc",
      langfuseTraceId: null,
    })

    expect(result.saved).toBe(false)
    if (!result.saved) {
      expect(result.existingText).toBe("既存のフィードバック")
    }
  })
})

// ============================================================================
// getTimeoutMs / getPromptHash / getSystemPrompt (簡易テスト)
// ============================================================================

describe("getTimeoutMs", () => {
  it("科目数に応じた動的タイムアウトを返す", () => {
    expect(getTimeoutMs(1)).toBe(5500) // 5000 + 500
    expect(getTimeoutMs(4)).toBe(7000) // 5000 + 2000
    expect(getTimeoutMs(10)).toBe(8000) // max 8000
  })
})

describe("getPromptHash", () => {
  it("ハッシュ文字列を返す", () => {
    const hash = getPromptHash("system", "user")
    expect(typeof hash).toBe("string")
    expect(hash.length).toBe(16)
  })
})

describe("getSystemPrompt", () => {
  it("セルフコンパッション原則を含む", () => {
    const prompt = getSystemPrompt()
    expect(prompt).toContain("セルフコンパッション")
    expect(prompt).toContain("40〜100文字")
  })
})
