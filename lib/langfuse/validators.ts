/**
 * Langfuseバリデーター
 */

import { ENTITY_TYPES, SCORE_NAMES } from "./constants"
import type { EntityType, ScoreName } from "./constants"

/**
 * エンティティタイプのバリデーション
 */
export function isValidEntityType(value: string): value is EntityType {
  return Object.values(ENTITY_TYPES).includes(value as EntityType)
}

/**
 * スコア名のバリデーション
 */
export function isValidScoreName(value: string): value is ScoreName {
  return Object.values(SCORE_NAMES).includes(value as ScoreName)
}

/**
 * スコア値のバリデーション（0または1）
 */
export function isValidScoreValue(value: number): boolean {
  return value === 0 || value === 1
}

/**
 * UUIDフォーマットのバリデーション
 */
export function isValidUUID(value: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(value)
}

/**
 * トレースIDのバリデーション（UUID形式）
 */
export function validateTraceId(traceId: string): void {
  if (!isValidUUID(traceId)) {
    throw new Error(`Invalid trace ID format: ${traceId}`)
  }
}

/**
 * エンティティIDのバリデーション（UUID形式）
 */
export function validateEntityId(entityId: string): void {
  if (!isValidUUID(entityId)) {
    throw new Error(`Invalid entity ID format: ${entityId}`)
  }
}

/**
 * ユーザーIDのバリデーション（UUID形式）
 */
export function validateUserId(userId: string): void {
  if (!isValidUUID(userId)) {
    throw new Error(`Invalid user ID format: ${userId}`)
  }
}
