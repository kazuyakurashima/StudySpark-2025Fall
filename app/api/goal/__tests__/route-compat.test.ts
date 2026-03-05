/**
 * ゴールナビ API 互換性契約テスト
 *
 * 旧クライアント（testScheduleId なし）と新クライアント（testScheduleId あり）の
 * 両方のペイロードが各ルートの zod スキーマを通過することを検証する。
 *
 * スキーマは lib/api/goal-schemas.ts から直接 import することで、
 * ルート側の定義と常に同期し、ドリフトを防ぐ。
 *
 * ※ルートハンドラ全体のテスト（DB/Auth）は結合テストで行う。
 *   ここではスキーマ互換性のみを保証する。
 */
import { describe, it, expect } from "vitest"
import {
  simpleNavigationSchema,
  navigationSchema,
  streamSchema,
  simpleThoughtsSchema,
  thoughtsSchema,
} from "@/lib/api/goal-schemas"

// ─── テストケース ───────────────────────────────────────────

describe("Goal API 互換性契約テスト", () => {
  describe("simple-navigation: 旧フォーマット（testScheduleId なし）", () => {
    it("旧クライアントのペイロードがスキーマを通過する", () => {
      const legacyPayload = {
        studentName: "太郎",
        testName: "合不合判定テスト 第3回",
        testDate: "2026-07-12",
        targetCourse: "B",
        targetClass: 5,
        step: 1,
      }

      const result = simpleNavigationSchema.safeParse(legacyPayload)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.testScheduleId).toBeUndefined()
        expect(result.data.studentName).toBe("太郎")
        expect(result.data.testName).toBe("合不合判定テスト 第3回")
        expect(result.data.conversationHistory).toEqual([])
      }
    })
  })

  describe("navigation: 旧フォーマット（testScheduleId なし）", () => {
    it("旧クライアントのペイロードがスキーマを通過する", () => {
      const legacyPayload = {
        studentName: "花子",
        testName: "組分けテスト",
        testDate: "2026-05-10",
        targetCourse: "A",
        targetClass: 3,
        currentStep: 2,
        conversationHistory: [
          { role: "assistant", content: "目標を確認したよ！" },
          { role: "user", content: "うれしい" },
        ],
      }

      const result = navigationSchema.safeParse(legacyPayload)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.testScheduleId).toBeUndefined()
        expect(result.data.studentName).toBe("花子")
        expect(result.data.conversationHistory).toHaveLength(2)
      }
    })
  })

  describe("stream: 新フォーマットのみ（testScheduleId 必須）", () => {
    it("新クライアントのペイロードがスキーマを通過する", () => {
      const newPayload = {
        flowType: "simple",
        step: 1,
        testScheduleId: 42,
        targetCourse: "S",
        targetClass: 10,
        conversationHistory: [],
        requestId: "req-abc-123",
      }

      const result = streamSchema.safeParse(newPayload)
      expect(result.success).toBe(true)
    })

    it("testScheduleId なしでスキーマが拒否する", () => {
      const invalidPayload = {
        flowType: "simple",
        step: 1,
        targetCourse: "B",
        targetClass: 5,
      }

      const result = streamSchema.safeParse(invalidPayload)
      expect(result.success).toBe(false)
    })
  })

  describe("simple-thoughts: 旧フォーマット互換（testScheduleId なし）", () => {
    it("旧クライアントのペイロードがスキーマを通過する", () => {
      const legacyPayload = {
        targetCourse: "B" as const,
        targetClass: 5,
        conversationHistory: [
          { role: "assistant" as const, content: "目標を確認したよ！" },
          { role: "user" as const, content: "がんばる！" },
        ],
        studentName: "太郎",
        testName: "合不合判定テスト 第3回",
        testDate: "2026-07-12",
      }

      const result = simpleThoughtsSchema.safeParse(legacyPayload)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.testScheduleId).toBeUndefined()
        expect(result.data.studentName).toBe("太郎")
        expect(result.data.conversationHistory).toHaveLength(2)
      }
    })
  })

  describe("thoughts: testScheduleId 送信時のDB再構築経路", () => {
    it("testScheduleId ありのペイロードがスキーマを通過する", () => {
      const newPayload = {
        testScheduleId: 42,
        targetCourse: "S" as const,
        targetClass: 10,
        conversationHistory: [
          { role: "assistant" as const, content: "いい感じだね！" },
          { role: "user" as const, content: "ありがとう" },
        ],
        currentStep: 3 as const,
      }

      const result = thoughtsSchema.safeParse(newPayload)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.testScheduleId).toBe(42)
        // studentName/testName/testDate は DB 再構築するため不要
        expect(result.data.studentName).toBeUndefined()
      }
    })
  })

  describe("thoughts系 targetClass 境界値", () => {
    it("targetClass=40 が thoughts 系スキーマで通過する", () => {
      const base = {
        targetCourse: "A" as const,
        targetClass: 40,
        conversationHistory: [],
      }

      expect(simpleThoughtsSchema.safeParse(base).success).toBe(true)
      expect(thoughtsSchema.safeParse(base).success).toBe(true)
    })

    it("targetClass=41 が thoughts 系スキーマで拒否される", () => {
      const base = {
        targetCourse: "A" as const,
        targetClass: 41,
        conversationHistory: [],
      }

      expect(simpleThoughtsSchema.safeParse(base).success).toBe(false)
      expect(thoughtsSchema.safeParse(base).success).toBe(false)
    })
  })

  describe("targetClass 境界値", () => {
    it("targetClass=40 がすべてのスキーマで通過する", () => {
      const simpleResult = simpleNavigationSchema.safeParse({
        targetCourse: "A",
        targetClass: 40,
        step: 1,
      })
      expect(simpleResult.success).toBe(true)

      const navResult = navigationSchema.safeParse({
        targetCourse: "A",
        targetClass: 40,
        currentStep: 1,
      })
      expect(navResult.success).toBe(true)

      const streamResult = streamSchema.safeParse({
        flowType: "simple",
        step: 1,
        testScheduleId: 1,
        targetCourse: "A",
        targetClass: 40,
      })
      expect(streamResult.success).toBe(true)
    })

    it("targetClass=41 がすべてのスキーマで拒否される", () => {
      const simpleResult = simpleNavigationSchema.safeParse({
        targetCourse: "A",
        targetClass: 41,
        step: 1,
      })
      expect(simpleResult.success).toBe(false)

      const navResult = navigationSchema.safeParse({
        targetCourse: "A",
        targetClass: 41,
        currentStep: 1,
      })
      expect(navResult.success).toBe(false)

      const streamResult = streamSchema.safeParse({
        flowType: "simple",
        step: 1,
        testScheduleId: 1,
        targetCourse: "A",
        targetClass: 41,
      })
      expect(streamResult.success).toBe(false)
    })
  })
})
