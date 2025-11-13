/**
 * Langfuse型定義
 */

import type { EntityType, ScoreName, Tag } from "./constants"

/**
 * トレース保存リクエスト
 */
export interface SaveTraceRequest {
  entityType: EntityType
  entityId: string
  traceId: string
  userId: string
  input: string
  output: string
  metadata?: Record<string, any>
  tags?: Tag[]
}

/**
 * トレース取得レスポンス
 */
export interface TraceRecord {
  id: string
  trace_id: string
  entity_type: EntityType
  entity_id: string
  user_id: string
  input: string
  output: string
  metadata: Record<string, any> | null
  tags: Tag[] | null
  created_at: string
}

/**
 * スコア保存リクエスト
 */
export interface SaveScoreRequest {
  traceId: string
  scoreName: ScoreName
  value: number
  comment?: string
  metadata?: Record<string, any>
}

/**
 * スコアレコード
 */
export interface ScoreRecord {
  id: string
  trace_id: string
  score_name: ScoreName
  value: number
  comment: string | null
  metadata: Record<string, any> | null
  status: "pending" | "sent" | "failed"
  sent_at: string | null
  created_at: string
}

/**
 * バッチ実行結果
 */
export interface BatchRunResult {
  id: string
  batch_name: string
  scores_created: number
  scores_sent: number
  errors: any[]
  started_at: string
  completed_at: string | null
}
