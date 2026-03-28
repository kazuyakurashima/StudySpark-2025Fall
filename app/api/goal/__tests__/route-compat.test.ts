/**
 * ゴールナビ API スキーマ契約テスト
 *
 * 各ルートの zod スキーマが正しいペイロードを受け付け、
 * 不正なペイロードを拒否することを検証する。
 *
 * スキーマは lib/api/goal-schemas.ts から直接 import することで、
 * ルート側の定義と常に同期し、ドリフトを防ぐ。
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

describe("Goal API スキーマ契約テスト", () => {
  describe("simple-navigation", () => {
    it("testScheduleId ありのペイロードがスキーマを通過する", () => {
      const payload = {
        testScheduleId: 42,
        targetCourse: "B",
        targetClass: 5,
        step: 1,
      }

      const result = simpleNavigationSchema.safeParse(payload)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.testScheduleId).toBe(42)
        expect(result.data.conversationHistory).toEqual([])
      }
    })

    it("testScheduleId なしでスキーマが拒否する", () => {
      const payload = {
        targetCourse: "B",
        targetClass: 5,
        step: 1,
      }

      const result = simpleNavigationSchema.safeParse(payload)
      expect(result.success).toBe(false)
    })
  })

  describe("navigation", () => {
    it("testScheduleId ありのペイロードがスキーマを通過する", () => {
      const payload = {
        testScheduleId: 10,
        targetCourse: "A",
        targetClass: 3,
        currentStep: 2,
        conversationHistory: [
          { role: "assistant", content: "目標を確認したよ！" },
          { role: "user", content: "うれしい" },
        ],
      }

      const result = navigationSchema.safeParse(payload)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.testScheduleId).toBe(10)
        expect(result.data.conversationHistory).toHaveLength(2)
      }
    })

    it("testScheduleId なしでスキーマが拒否する", () => {
      const payload = {
        targetCourse: "A",
        targetClass: 3,
        currentStep: 2,
      }

      const result = navigationSchema.safeParse(payload)
      expect(result.success).toBe(false)
    })
  })

  describe("stream", () => {
    it("正常なペイロードがスキーマを通過する", () => {
      const payload = {
        flowType: "simple",
        step: 1,
        testScheduleId: 42,
        targetCourse: "S",
        targetClass: 10,
        conversationHistory: [],
        requestId: "req-abc-123",
      }

      const result = streamSchema.safeParse(payload)
      expect(result.success).toBe(true)
    })

    it("testScheduleId なしでスキーマが拒否する", () => {
      const payload = {
        flowType: "simple",
        step: 1,
        targetCourse: "B",
        targetClass: 5,
      }

      const result = streamSchema.safeParse(payload)
      expect(result.success).toBe(false)
    })
  })

  describe("simple-thoughts", () => {
    it("testScheduleId ありのペイロードがスキーマを通過する", () => {
      const payload = {
        testScheduleId: 42,
        targetCourse: "B" as const,
        targetClass: 5,
        conversationHistory: [
          { role: "assistant" as const, content: "目標を確認したよ！" },
          { role: "user" as const, content: "がんばる！" },
        ],
      }

      const result = simpleThoughtsSchema.safeParse(payload)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.testScheduleId).toBe(42)
        expect(result.data.conversationHistory).toHaveLength(2)
      }
    })

    it("testScheduleId なしでスキーマが拒否する", () => {
      const payload = {
        targetCourse: "B" as const,
        targetClass: 5,
        conversationHistory: [],
      }

      const result = simpleThoughtsSchema.safeParse(payload)
      expect(result.success).toBe(false)
    })
  })

  describe("thoughts", () => {
    it("testScheduleId ありのペイロードがスキーマを通過する", () => {
      const payload = {
        testScheduleId: 42,
        targetCourse: "S" as const,
        targetClass: 10,
        conversationHistory: [
          { role: "assistant" as const, content: "いい感じだね！" },
          { role: "user" as const, content: "ありがとう" },
        ],
        currentStep: 3 as const,
      }

      const result = thoughtsSchema.safeParse(payload)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.testScheduleId).toBe(42)
      }
    })

    it("testScheduleId なしでスキーマが拒否する", () => {
      const payload = {
        targetCourse: "S" as const,
        targetClass: 10,
        conversationHistory: [],
        currentStep: 3 as const,
      }

      const result = thoughtsSchema.safeParse(payload)
      expect(result.success).toBe(false)
    })

    it("currentStep なしでスキーマが拒否する", () => {
      const payload = {
        testScheduleId: 42,
        targetCourse: "S" as const,
        targetClass: 10,
        conversationHistory: [],
      }

      const result = thoughtsSchema.safeParse(payload)
      expect(result.success).toBe(false)
    })
  })

  describe("targetClass 境界値", () => {
    it("targetClass=40 がすべてのスキーマで通過する", () => {
      expect(
        simpleNavigationSchema.safeParse({
          testScheduleId: 1,
          targetCourse: "A",
          targetClass: 40,
          step: 1,
        }).success
      ).toBe(true)

      expect(
        navigationSchema.safeParse({
          testScheduleId: 1,
          targetCourse: "A",
          targetClass: 40,
          currentStep: 1,
        }).success
      ).toBe(true)

      expect(
        streamSchema.safeParse({
          flowType: "simple",
          step: 1,
          testScheduleId: 1,
          targetCourse: "A",
          targetClass: 40,
        }).success
      ).toBe(true)

      expect(
        simpleThoughtsSchema.safeParse({
          testScheduleId: 1,
          targetCourse: "A",
          targetClass: 40,
          conversationHistory: [],
        }).success
      ).toBe(true)

      expect(
        thoughtsSchema.safeParse({
          testScheduleId: 1,
          targetCourse: "A",
          targetClass: 40,
          conversationHistory: [],
          currentStep: 3 as const,
        }).success
      ).toBe(true)
    })

    it("targetClass=41 がすべてのスキーマで拒否される", () => {
      expect(
        simpleNavigationSchema.safeParse({
          testScheduleId: 1,
          targetCourse: "A",
          targetClass: 41,
          step: 1,
        }).success
      ).toBe(false)

      expect(
        navigationSchema.safeParse({
          testScheduleId: 1,
          targetCourse: "A",
          targetClass: 41,
          currentStep: 1,
        }).success
      ).toBe(false)

      expect(
        streamSchema.safeParse({
          flowType: "simple",
          step: 1,
          testScheduleId: 1,
          targetCourse: "A",
          targetClass: 41,
        }).success
      ).toBe(false)

      expect(
        simpleThoughtsSchema.safeParse({
          testScheduleId: 1,
          targetCourse: "A",
          targetClass: 41,
          conversationHistory: [],
        }).success
      ).toBe(false)

      expect(
        thoughtsSchema.safeParse({
          testScheduleId: 1,
          targetCourse: "A",
          targetClass: 41,
          conversationHistory: [],
          currentStep: 3 as const,
        }).success
      ).toBe(false)
    })
  })
})
