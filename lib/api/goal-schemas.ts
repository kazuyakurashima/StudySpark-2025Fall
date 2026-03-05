/**
 * ゴールナビ API 共通 zod スキーマ
 *
 * 各ルート (simple-navigation, navigation, stream) が使用するスキーマを
 * 一元管理し、契約テストとのドリフトを防ぐ。
 */
import { z } from "zod"

/** 有効なコース値 */
export const VALID_COURSES = ["S", "A", "B", "C"] as const

/** 対話履歴エントリのスキーマ */
const conversationHistorySchema = z
  .array(
    z.object({
      role: z.enum(["assistant", "user"]),
      content: z.string().max(5000),
    })
  )
  .max(20)
  .default([])

/**
 * simple-navigation ルートのリクエストスキーマ
 *
 * testScheduleId は新クライアント用（optional）。
 * 旧クライアントは studentName/testName/testDate を送信する。
 */
export const simpleNavigationSchema = z.object({
  testScheduleId: z.number().int().positive().optional(),
  targetCourse: z.enum(VALID_COURSES),
  targetClass: z.number().int().min(1).max(40),
  step: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  conversationHistory: conversationHistorySchema,
  // 後方互換: 旧クライアントが送るフィールド（testScheduleId未送信時に使用）
  studentName: z.string().max(100).optional(),
  testName: z.string().max(200).optional(),
  testDate: z.string().max(20).optional(),
  previousAnswer: z.string().optional(),
})

/**
 * navigation ルートのリクエストスキーマ
 *
 * Full flow 用。testScheduleId は新クライアント用（optional）。
 */
export const navigationSchema = z.object({
  testScheduleId: z.number().int().positive().optional(),
  targetCourse: z.enum(VALID_COURSES),
  targetClass: z.number().int().min(1).max(40),
  currentStep: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  conversationHistory: conversationHistorySchema,
  // 後方互換: 旧クライアントが送るフィールド（testScheduleId未送信時に使用）
  studentName: z.string().max(100).optional(),
  testName: z.string().max(200).optional(),
  testDate: z.string().max(20).optional(),
})

/**
 * stream ルートのリクエストスキーマ
 *
 * 新規ルートのため testScheduleId は必須（互換レイヤーなし）。
 */
export const streamSchema = z.object({
  flowType: z.enum(["simple", "full"]),
  step: z.number().int().min(1).max(3),
  testScheduleId: z.number().int().positive(),
  targetCourse: z.enum(VALID_COURSES),
  targetClass: z.number().int().min(1).max(40),
  conversationHistory: conversationHistorySchema,
  requestId: z.string().max(64).optional(),
})
