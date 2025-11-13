/**
 * トレース作成ヘルパー関数
 */

import { v4 as uuidv4 } from "uuid"
import { saveTrace } from "./trace-manager"
import { ENTITY_TYPES, TAGS } from "./constants"
import type { EntityType, Tag } from "./constants"

/**
 * AIコーチメッセージのトレース作成
 *
 * @param messageId - メッセージID
 * @param userId - ユーザーID
 * @param input - プロンプト
 * @param output - AI応答
 * @param cacheHit - キャッシュヒットしたか
 * @returns トレースID
 */
export async function createCoachMessageTrace(
  messageId: string,
  userId: string,
  input: string,
  output: string,
  cacheHit: boolean = false
): Promise<string | null> {
  const traceId = uuidv4()

  return await saveTrace({
    entityType: ENTITY_TYPES.AI_COACH_MESSAGE,
    entityId: messageId,
    traceId,
    userId,
    input,
    output,
    metadata: {
      cache_hit: cacheHit,
    },
    tags: [cacheHit ? TAGS.CACHE_HIT : TAGS.CACHE_MISS],
  })
}

/**
 * 応援メッセージのトレース作成
 *
 * @param messageId - メッセージID
 * @param userId - ユーザーID（保護者または指導者）
 * @param studentId - 生徒ID
 * @param input - プロンプト
 * @param output - AI応答
 * @returns トレースID
 */
export async function createEncouragementTrace(
  messageId: string,
  userId: string,
  studentId: string,
  input: string,
  output: string
): Promise<string | null> {
  const traceId = uuidv4()

  return await saveTrace({
    entityType: ENTITY_TYPES.ENCOURAGEMENT_MESSAGE,
    entityId: messageId,
    traceId,
    userId,
    input,
    output,
    metadata: {
      student_id: studentId,
    },
  })
}

/**
 * 今日の様子のトレース作成
 *
 * @param statusId - ステータスID
 * @param userId - ユーザーID（保護者）
 * @param studentId - 生徒ID
 * @param input - プロンプト
 * @param output - AI応答
 * @returns トレースID
 */
export async function createDailyStatusTrace(
  statusId: string,
  userId: string,
  studentId: string,
  input: string,
  output: string
): Promise<string | null> {
  const traceId = uuidv4()

  return await saveTrace({
    entityType: ENTITY_TYPES.DAILY_STATUS,
    entityId: statusId,
    traceId,
    userId,
    input,
    output,
    metadata: {
      student_id: studentId,
    },
  })
}

/**
 * 振り返りのトレース作成
 *
 * @param reflectionId - 振り返りID
 * @param userId - ユーザーID（生徒）
 * @param input - プロンプト
 * @param output - AI応答
 * @param weekType - 週のタイプ
 * @param turnNumber - ターン数
 * @returns トレースID
 */
export async function createReflectionTrace(
  reflectionId: string,
  userId: string,
  input: string,
  output: string,
  weekType?: "growth" | "stable" | "challenge" | "special",
  turnNumber?: number
): Promise<string | null> {
  const traceId = uuidv4()

  const tags: Tag[] = []
  if (weekType) {
    const weekTypeTagMap: Record<string, Tag> = {
      growth: TAGS.GROWTH_WEEK,
      stable: TAGS.STABLE_WEEK,
      challenge: TAGS.CHALLENGE_WEEK,
      special: TAGS.SPECIAL_WEEK,
    }
    tags.push(weekTypeTagMap[weekType])
  }

  return await saveTrace({
    entityType: ENTITY_TYPES.REFLECTION,
    entityId: reflectionId,
    traceId,
    userId,
    input,
    output,
    metadata: {
      week_type: weekType || null,
      turn_number: turnNumber || null,
    },
    tags: tags.length > 0 ? tags : undefined,
  })
}

/**
 * 汎用トレース作成
 *
 * @param entityType - エンティティタイプ
 * @param entityId - エンティティID
 * @param userId - ユーザーID
 * @param input - プロンプト
 * @param output - AI応答
 * @param metadata - メタデータ
 * @param tags - タグ
 * @returns トレースID
 */
export async function createTrace(
  entityType: EntityType,
  entityId: string,
  userId: string,
  input: string,
  output: string,
  metadata?: Record<string, any>,
  tags?: Tag[]
): Promise<string | null> {
  const traceId = uuidv4()

  return await saveTrace({
    entityType,
    entityId,
    traceId,
    userId,
    input,
    output,
    metadata,
    tags,
  })
}
