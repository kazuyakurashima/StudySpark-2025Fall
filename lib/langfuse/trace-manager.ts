/**
 * トレース管理（v3.1: フェイルセキュア + 非正規化）
 */

import { getLangfuseClient } from "./client"
import { createServiceClient } from "@/lib/supabase/service-client"
import {
  validateTraceId,
  validateEntityId,
  validateUserId,
  isValidEntityType,
} from "./validators"
import type { SaveTraceRequest, TraceRecord } from "./types"
import { notifyError } from "@/lib/monitoring/notify"

/**
 * トレース保存（Langfuse + Supabase）
 *
 * アーキテクチャ: フェイルセキュア + 非正規化
 * 1. Langfuseにトレース送信
 * 2. langfuse_tracesテーブルに保存（成功した場合のみ）
 * 3. エンティティテーブルの非正規化カラム更新（ベストエフォート）
 *
 * @param request - トレース保存リクエスト
 * @returns トレースID、失敗時はnull
 */
export async function saveTrace(
  request: SaveTraceRequest
): Promise<string | null> {
  const { entityType, entityId, traceId, userId, input, output, metadata, tags } =
    request

  // バリデーション
  try {
    validateTraceId(traceId)
    validateEntityId(entityId)
    validateUserId(userId)

    if (!isValidEntityType(entityType)) {
      throw new Error(`Invalid entity type: ${entityType}`)
    }
  } catch (error) {
    console.error("[TraceManager] Validation error:", error)
    return null
  }

  // Step 1: Langfuseにトレース送信
  const langfuse = getLangfuseClient()
  if (!langfuse) {
    console.warn("[TraceManager] Langfuse is disabled, skipping trace creation")
    return null
  }

  try {
    const trace = langfuse.trace({
      id: traceId,
      name: entityType,
      userId,
      metadata: metadata || {},
      tags: tags || [],
    })

    trace.generation({
      name: `${entityType}_generation`,
      input,
      output,
      metadata: metadata || {},
    })

    // 非同期送信（バックグラウンド）
    langfuse.flushAsync().catch((error) => {
      console.error("[TraceManager] Failed to flush Langfuse events:", error)
    })
  } catch (error) {
    console.error("[TraceManager] Failed to send trace to Langfuse:", error)
    return null
  }

  // Step 2: langfuse_tracesテーブルに保存
  const supabase = createServiceClient()

  try {
    const { error } = await supabase.from("langfuse_traces").insert({
      trace_id: traceId,
      entity_type: entityType,
      entity_id: entityId,
      user_id: userId,
      input,
      output,
      metadata: metadata || null,
      tags: tags || null,
    })

    if (error) {
      console.error("[TraceManager] Failed to save trace to DB:", error)
      return null
    }
  } catch (error) {
    console.error("[TraceManager] Failed to save trace to DB:", error)
    return null
  }

  // Step 3: 非正規化カラム更新（ベストエフォート）
  try {
    await updateDenormalizedColumn(entityType, entityId, traceId)
  } catch (error) {
    // エラーが発生しても処理は成功とみなす（手動復旧可能）
    console.error(
      "[TraceManager] DENORMALIZATION FAILURE - trace saved but denormalized column update failed",
      {
        entityType,
        entityId,
        traceId,
        error,
      }
    )

    // 通知システムへ警告を送信
    await notifyError(
      "TraceManager",
      "Denormalized column update failed",
      {
        entityType,
        entityId,
        traceId,
        error: error instanceof Error ? error.message : String(error),
      }
    )
  }

  return traceId
}

/**
 * 非正規化カラムの更新（内部関数）
 *
 * エンティティテーブルのlangfuse_trace_idカラムを更新
 */
async function updateDenormalizedColumn(
  entityType: string,
  entityId: string,
  traceId: string
): Promise<void> {
  const supabase = createServiceClient()

  const tableMap: Record<string, string> = {
    ai_coach_message: "ai_coach_messages",
    encouragement_message: "encouragement_messages",
    daily_status: "daily_statuses",
    reflection: "reflections",
  }

  const tableName = tableMap[entityType]
  if (!tableName) {
    throw new Error(`Unknown entity type for denormalization: ${entityType}`)
  }

  const { error } = await supabase
    .from(tableName)
    .update({ langfuse_trace_id: traceId })
    .eq("id", entityId)

  if (error) {
    throw new Error(`Failed to update denormalized column: ${error.message}`)
  }
}

/**
 * トレース取得（エンティティIDから）
 *
 * @param entityType - エンティティタイプ
 * @param entityId - エンティティID
 * @returns トレースレコード、なければnull
 */
export async function getTraceByEntity(
  entityType: string,
  entityId: string
): Promise<TraceRecord | null> {
  if (!isValidEntityType(entityType)) {
    console.error("[TraceManager] Invalid entity type:", entityType)
    return null
  }

  validateEntityId(entityId)

  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from("langfuse_traces")
    .select("*")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .single()

  if (error) {
    console.error("[TraceManager] Failed to get trace:", error)
    return null
  }

  return data as TraceRecord
}

/**
 * トレース取得（トレースIDから）
 *
 * @param traceId - トレースID
 * @returns トレースレコード、なければnull
 */
export async function getTraceById(
  traceId: string
): Promise<TraceRecord | null> {
  validateTraceId(traceId)

  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from("langfuse_traces")
    .select("*")
    .eq("trace_id", traceId)
    .single()

  if (error) {
    console.error("[TraceManager] Failed to get trace by ID:", error)
    return null
  }

  return data as TraceRecord
}
