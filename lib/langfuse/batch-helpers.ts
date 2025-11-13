/**
 * バッチ処理ヘルパー関数
 */

import { getLangfuseClient } from "./client"
import { createServiceClient } from "@/lib/supabase/service-client"
import { getPendingScores, updateScoreStatus } from "./score-helpers"
import { notifyError, notifyWarning } from "@/lib/monitoring/notify"
import type { BatchRunResult } from "./types"

/**
 * Pendingスコアの送信（バッチ処理）
 *
 * langfuse_scoresテーブルのstatus='pending'レコードを
 * Langfuseに送信し、ステータスを更新する
 *
 * @param batchName - バッチ名（ログ用）
 * @param limit - 1回の処理件数
 * @returns バッチ実行結果
 */
export async function sendPendingScores(
  batchName: string,
  limit: number = 100
): Promise<BatchRunResult> {
  const startedAt = new Date().toISOString()
  let scoresCreated = 0
  let scoresSent = 0
  const errors: any[] = []

  const langfuse = getLangfuseClient()
  if (!langfuse) {
    console.warn(
      `[BatchHelper:${batchName}] Langfuse is disabled, skipping batch send`
    )
    return createBatchRunResult(
      batchName,
      scoresCreated,
      scoresSent,
      errors,
      startedAt
    )
  }

  // Pendingスコアを取得
  const pendingScores = await getPendingScores(limit)
  scoresCreated = pendingScores.length

  if (scoresCreated === 0) {
    console.log(`[BatchHelper:${batchName}] No pending scores to send`)
    return createBatchRunResult(
      batchName,
      scoresCreated,
      scoresSent,
      errors,
      startedAt
    )
  }

  console.log(
    `[BatchHelper:${batchName}] Sending ${scoresCreated} pending scores...`
  )

  // スコアを送信
  for (const score of pendingScores) {
    try {
      langfuse.score({
        traceId: score.trace_id,
        name: score.score_name,
        value: score.value,
        comment: score.comment || undefined,
      })

      // ステータスを更新
      const updated = await updateScoreStatus(score.id, "sent")
      if (updated) {
        scoresSent++
      } else {
        errors.push({
          scoreId: score.id,
          error: "Failed to update score status",
        })
      }
    } catch (error) {
      console.error(
        `[BatchHelper:${batchName}] Failed to send score ${score.id}:`,
        error
      )
      errors.push({
        scoreId: score.id,
        error: error instanceof Error ? error.message : String(error),
      })

      // ステータスをfailedに更新
      await updateScoreStatus(score.id, "failed")
    }
  }

  // フラッシュ（即座に送信）
  try {
    await langfuse.flushAsync()
  } catch (error) {
    console.error(`[BatchHelper:${batchName}] Failed to flush Langfuse:`, error)
    errors.push({
      type: "flush_error",
      error: error instanceof Error ? error.message : String(error),
    })
  }

  const result = createBatchRunResult(
    batchName,
    scoresCreated,
    scoresSent,
    errors,
    startedAt
  )

  // エラーがあれば通知
  if (errors.length > 0) {
    await notifyWarning(
      "BatchHelper",
      `Batch ${batchName} completed with errors`,
      {
        scoresCreated,
        scoresSent,
        errorCount: errors.length,
        errors: errors.slice(0, 5), // 最初の5件のみ
      }
    )
  }

  return result
}

/**
 * バッチ実行結果を作成
 */
function createBatchRunResult(
  batchName: string,
  scoresCreated: number,
  scoresSent: number,
  errors: any[],
  startedAt: string
): BatchRunResult {
  return {
    id: crypto.randomUUID(),
    batch_name: batchName,
    scores_created: scoresCreated,
    scores_sent: scoresSent,
    errors,
    started_at: startedAt,
    completed_at: new Date().toISOString(),
  }
}

/**
 * バッチ実行結果を保存
 *
 * @param result - バッチ実行結果
 * @returns 成功したか
 */
export async function saveBatchRunResult(
  result: BatchRunResult
): Promise<boolean> {
  const supabase = createServiceClient()

  try {
    const { error } = await supabase.from("langfuse_batch_runs").insert({
      id: result.id,
      batch_name: result.batch_name,
      scores_created: result.scores_created,
      scores_sent: result.scores_sent,
      errors: result.errors,
      started_at: result.started_at,
      completed_at: result.completed_at,
    })

    if (error) {
      console.error("[BatchHelper] Failed to save batch run result:", error)
      return false
    }

    return true
  } catch (error) {
    console.error("[BatchHelper] Failed to save batch run result:", error)
    return false
  }
}

/**
 * Pending滞留の監視
 *
 * 1時間以上pendingのままのスコアをカウントし、
 * 多すぎる場合は警告を発する
 *
 * @param threshold - 警告閾値（件数）
 */
export async function monitorPendingScores(
  threshold: number = 100
): Promise<void> {
  const supabase = createServiceClient()

  const { data, error, count } = await supabase
    .from("langfuse_scores")
    .select("*", { count: "exact", head: false })
    .eq("status", "pending")
    .lt("created_at", new Date(Date.now() - 60 * 60 * 1000).toISOString()) // 1時間以上前

  if (error) {
    console.error("[BatchHelper] Failed to monitor pending scores:", error)
    await notifyError("BatchHelper", "Failed to monitor pending scores", {
      error: error.message,
    })
    return
  }

  const pendingCount = count || 0

  if (pendingCount > threshold) {
    // サンプルを取得（最大10件）
    const samples = data?.slice(0, 10).map((score) => ({
      id: score.id,
      score_name: score.score_name,
      created_at: score.created_at,
    }))

    await notifyWarning(
      "BatchHelper",
      "High number of pending scores detected",
      {
        pending_count: pendingCount,
        threshold,
        samples,
      }
    )
  } else {
    console.log(
      `[BatchHelper] Pending scores: ${pendingCount} (threshold: ${threshold})`
    )
  }
}
