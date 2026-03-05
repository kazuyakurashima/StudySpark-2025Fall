/**
 * ゴールナビ API 互換性契約テスト
 *
 * 旧クライアント（testScheduleId なし）と新クライアント（testScheduleId あり）の
 * 両方のペイロードが各ルートの zod スキーマを通過することを検証する。
 *
 * ※ルートハンドラ全体のテスト（DB/Auth）は結合テストで行う。
 *   ここではスキーマ互換性のみを保証する。
 */
import { describe, it, expect } from "vitest"
import { z } from "zod"

// --- simple-navigation スキーマ（route.ts と同一定義を再現） ---
const VALID_COURSES = ["S", "A", "B", "C"] as const

const simpleNavigationSchema = z.object({
  testScheduleId: z.number().int().positive().optional(),
  targetCourse: z.enum(VALID_COURSES),
  targetClass: z.number().int().min(1).max(40),
  step: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  conversationHistory: z
    .array(
      z.object({
        role: z.enum(["assistant", "user"]),
        content: z.string().max(5000),
      })
    )
    .max(20)
    .default([]),
  studentName: z.string().max(100).optional(),
  testName: z.string().max(200).optional(),
  testDate: z.string().max(20).optional(),
  previousAnswer: z.string().optional(),
})

// --- navigation スキーマ（route.ts と同一定義を再現） ---
const navigationSchema = z.object({
  testScheduleId: z.number().int().positive().optional(),
  targetCourse: z.enum(VALID_COURSES),
  targetClass: z.number().int().min(1).max(40),
  currentStep: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  conversationHistory: z
    .array(
      z.object({
        role: z.enum(["assistant", "user"]),
        content: z.string().max(5000),
      })
    )
    .max(20)
    .default([]),
  studentName: z.string().max(100).optional(),
  testName: z.string().max(200).optional(),
  testDate: z.string().max(20).optional(),
})

// --- stream スキーマ（route.ts と同一定義を再現） ---
const streamSchema = z.object({
  flowType: z.enum(["simple", "full"]),
  step: z.number().int().min(1).max(3),
  testScheduleId: z.number().int().positive(),
  targetCourse: z.enum(VALID_COURSES),
  targetClass: z.number().int().min(1).max(40),
  conversationHistory: z
    .array(
      z.object({
        role: z.enum(["assistant", "user"]),
        content: z.string().max(5000),
      })
    )
    .max(20)
    .default([]),
  requestId: z.string().max(64).optional(),
})

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
