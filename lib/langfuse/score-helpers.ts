/**
 * スコア作成ヘルパー関数
 */

import { createServiceClient } from "@/lib/supabase/service-client"
import { validateTraceId, isValidScoreName } from "./validators"
import { SCORE_NAMES, SCORE_VALUES } from "./constants"
import type { SaveScoreRequest, ScoreRecord } from "./types"

/**
 * スコア保存（Supabaseのみ、送信はバッチ処理で行う）
 *
 * @param request - スコア保存リクエスト
 * @returns スコアID、失敗時はnull
 */
export async function saveScore(
  request: SaveScoreRequest
): Promise<string | null> {
  const { traceId, scoreName, value, comment, metadata } = request

  // バリデーション
  try {
    validateTraceId(traceId)

    if (!isValidScoreName(scoreName)) {
      throw new Error(`Invalid score name: ${scoreName}`)
    }

    if (value !== 0 && value !== 1) {
      throw new Error(`Score value must be 0 or 1, got: ${value}`)
    }
  } catch (error) {
    console.error("[ScoreHelper] Validation error:", error)
    return null
  }

  const supabase = createServiceClient()

  try {
    const { data, error } = await supabase
      .from("langfuse_scores")
      .insert({
        trace_id: traceId,
        score_name: scoreName,
        value,
        comment: comment || null,
        metadata: metadata || null,
        status: "pending", // バッチ処理で送信
      })
      .select("id")
      .single()

    if (error) {
      console.error("[ScoreHelper] Failed to save score:", error)
      return null
    }

    return data.id
  } catch (error) {
    console.error("[ScoreHelper] Failed to save score:", error)
    return null
  }
}

/**
 * ユーザーフィードバックスコア作成
 *
 * @param traceId - トレースID
 * @param isPositive - ポジティブフィードバックか
 * @returns スコアID
 */
export async function createUserFeedbackScore(
  traceId: string,
  isPositive: boolean
): Promise<string | null> {
  return await saveScore({
    traceId,
    scoreName: SCORE_NAMES.USER_FEEDBACK,
    value: isPositive ? SCORE_VALUES.POSITIVE : SCORE_VALUES.NEGATIVE,
    comment: isPositive ? "👍 Positive feedback" : "👎 Negative feedback",
  })
}

/**
 * ミッション完了スコア作成
 *
 * @param traceId - トレースID
 * @param completed - 完了したか
 * @param metadata - 追加メタデータ
 * @returns スコアID
 */
export async function createMissionCompletedScore(
  traceId: string,
  completed: boolean,
  metadata?: Record<string, any>
): Promise<string | null> {
  return await saveScore({
    traceId,
    scoreName: SCORE_NAMES.MISSION_COMPLETED,
    value: completed ? SCORE_VALUES.YES : SCORE_VALUES.NO,
    comment: completed ? "Mission completed" : "Mission not completed",
    metadata,
  })
}

/**
 * 翌日学習スコア作成
 *
 * @param traceId - トレースID
 * @param hasActivity - 翌日に学習したか
 * @param metadata - 追加メタデータ
 * @returns スコアID
 */
export async function createNextDayActivityScore(
  traceId: string,
  hasActivity: boolean,
  metadata?: Record<string, any>
): Promise<string | null> {
  return await saveScore({
    traceId,
    scoreName: SCORE_NAMES.NEXT_DAY_ACTIVITY,
    value: hasActivity ? SCORE_VALUES.YES : SCORE_VALUES.NO,
    comment: hasActivity ? "Next day activity found" : "No next day activity",
    metadata,
  })
}

/**
 * 週次実行率スコア作成
 *
 * @param traceId - トレースID
 * @param completionRate - 実行率（0.0 - 1.0）
 * @param metadata - 追加メタデータ
 * @returns スコアID
 */
export async function createWeeklyCompletionScore(
  traceId: string,
  completionRate: number,
  metadata?: Record<string, any>
): Promise<string | null> {
  // 実行率を0-1のスコアに変換（80%以上なら1、未満なら0）
  const value = completionRate >= 0.8 ? SCORE_VALUES.YES : SCORE_VALUES.NO

  return await saveScore({
    traceId,
    scoreName: SCORE_NAMES.WEEKLY_COMPLETION_RATE,
    value,
    comment: `Weekly completion rate: ${(completionRate * 100).toFixed(1)}%`,
    metadata: {
      ...metadata,
      completion_rate: completionRate,
    },
  })
}

/**
 * Pendingスコアの取得
 *
 * @param limit - 取得件数
 * @returns Pendingスコアのリスト
 */
export async function getPendingScores(
  limit: number = 100
): Promise<ScoreRecord[]> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from("langfuse_scores")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(limit)

  if (error) {
    console.error("[ScoreHelper] Failed to get pending scores:", error)
    return []
  }

  return data as ScoreRecord[]
}

/**
 * スコアステータスの更新
 *
 * @param scoreId - スコアID
 * @param status - 新しいステータス
 * @returns 成功したか
 */
export async function updateScoreStatus(
  scoreId: string,
  status: "sent" | "failed"
): Promise<boolean> {
  const supabase = createServiceClient()

  const { error } = await supabase
    .from("langfuse_scores")
    .update({
      status,
      sent_at: status === "sent" ? new Date().toISOString() : null,
    })
    .eq("id", scoreId)

  if (error) {
    console.error("[ScoreHelper] Failed to update score status:", error)
    return false
  }

  return true
}
