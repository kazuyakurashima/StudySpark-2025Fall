/**
 * トレース作成ヘルパー関数
 */

import { v4 as uuidv4 } from "uuid"
import { saveTrace } from "./trace-manager"
import { ENTITY_TYPES, TAGS } from "./constants"
import type { EntityType, Tag } from "./constants"

/**
 * コーチングメッセージのトレース作成（週次振り返り）
 *
 * @param messageId - メッセージID
 * @param userId - ユーザーID
 * @param input - プロンプト
 * @param output - AI応答
 * @param cacheHit - キャッシュヒットしたか
 * @returns トレースID
 */
export async function createCoachingMessageTrace(
  messageId: string,
  userId: string,
  input: string,
  output: string,
  cacheHit: boolean = false
): Promise<string | null> {
  const traceId = uuidv4()

  return await saveTrace({
    entityType: ENTITY_TYPES.COACHING_MESSAGE,
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
 * 週次分析のトレース作成（指導者向け）
 *
 * @param analysisId - 分析ID
 * @param userId - ユーザーID（指導者）
 * @param studentId - 生徒ID
 * @param input - プロンプト
 * @param output - AI応答
 * @param weekType - 週のタイプ
 * @returns トレースID
 */
export async function createWeeklyAnalysisTrace(
  analysisId: string,
  userId: string,
  studentId: string,
  input: string,
  output: string,
  weekType?: "growth" | "stable" | "challenge" | "special"
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
    entityType: ENTITY_TYPES.WEEKLY_ANALYSIS,
    entityId: analysisId,
    traceId,
    userId,
    input,
    output,
    metadata: {
      student_id: studentId,
      week_type: weekType || null,
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
