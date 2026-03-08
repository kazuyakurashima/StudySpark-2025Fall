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
 */
export const simpleNavigationSchema = z.object({
  testScheduleId: z.number().int().positive(),
  targetCourse: z.enum(VALID_COURSES),
  targetClass: z.number().int().min(1).max(40),
  step: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  conversationHistory: conversationHistorySchema,
  previousAnswer: z.string().optional(),
})

/**
 * navigation ルートのリクエストスキーマ
 *
 * Full flow 用。
 */
export const navigationSchema = z.object({
  testScheduleId: z.number().int().positive(),
  targetCourse: z.enum(VALID_COURSES),
  targetClass: z.number().int().min(1).max(40),
  currentStep: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  conversationHistory: conversationHistorySchema,
})

/**
 * simple-thoughts ルートのリクエストスキーマ
 *
 * Simple flow Step 4（「今回の思い」生成）。
 */
export const simpleThoughtsSchema = z.object({
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
    .max(20),
})

/**
 * thoughts ルートのリクエストスキーマ
 *
 * Full flow Step 3（「今回の思い」生成）。
 */
export const thoughtsSchema = z.object({
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
    .max(20),
  currentStep: z.literal(3).optional(),
  requestId: z.string().max(64).optional(),
})

/**
 * stream ルートのリクエストスキーマ
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
