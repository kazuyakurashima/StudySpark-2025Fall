/**
 * 生徒メモリ取得レイヤー (Phase 3)
 *
 * SupabaseClient を引数で受け取るクライアント注入方式。
 *
 * ## クライアント使い分け規約
 *
 * - **Cron / バッチ処理**: `createServiceClient()` を渡す。
 *   RLSをバイパスし、全生徒のメモリにアクセス可能。
 *   例: `getCompactMemory(createServiceClient(), studentId)`
 *
 * - **ユーザーリクエスト処理 (Phase 4以降)**: `createClient()` を渡す。
 *   RLSが適用され、生徒は自分のメモリのみ、コーチは担当生徒のメモリのみ閲覧可能。
 *   例: `getCompactMemory(await createClient(), studentId)`
 *
 * サービスクライアントを直接インポートしないことで、
 * 呼び出し元が認可レベルを明示的に制御する。
 */

import type { SupabaseClient } from "@supabase/supabase-js"

// ============================================================================
// 型定義
// ============================================================================

/** student_memory_summaries の構造化表現 */
export interface StudentMemory {
  studentId: number
  compactSummary: string
  detailedSummary: string
  subjectTrends: Record<string, unknown>
  stumblingPatterns: Record<string, unknown>
  effectiveEncouragements: Record<string, unknown>
  recentSuccesses: Record<string, unknown>
  emotionalTendencies: Record<string, unknown>
  lastStudyLogId: number
  lastDeltaAt: string | null
  dataWindowStart: string | null
  dataWindowEnd: string | null
  weeksCovered: number
  lastGeneratedAt: string | null
  generationVersion: number
}

// ============================================================================
// 取得関数
// ============================================================================

/**
 * 日次コーチメッセージ用の簡潔な要約を取得
 *
 * @param client SupabaseClient（サービスクライアント or ユーザークライアント）
 * @param studentId 対象生徒ID
 * @returns compact_summary テキスト、またはデータなしで null
 */
export async function getCompactMemory(
  client: SupabaseClient,
  studentId: number,
): Promise<string | null> {
  const { data, error } = await client
    .from("student_memory_summaries")
    .select("compact_summary")
    .eq("student_id", studentId)
    .single()

  if (error || !data) return null
  return data.compact_summary || null
}

/**
 * 週次振り返り(Reflect)用の詳細な要約を取得
 *
 * @param client SupabaseClient（サービスクライアント or ユーザークライアント）
 * @param studentId 対象生徒ID
 * @returns detailed_summary テキスト、またはデータなしで null
 */
export async function getDetailedMemory(
  client: SupabaseClient,
  studentId: number,
): Promise<string | null> {
  const { data, error } = await client
    .from("student_memory_summaries")
    .select("detailed_summary")
    .eq("student_id", studentId)
    .single()

  if (error || !data) return null
  return data.detailed_summary || null
}

/**
 * 構造化メモリデータ全体を取得
 *
 * @param client SupabaseClient（サービスクライアント or ユーザークライアント）
 * @param studentId 対象生徒ID
 * @returns 構造化メモリ、またはデータなしで null
 */
export async function getStructuredMemory(
  client: SupabaseClient,
  studentId: number,
): Promise<StudentMemory | null> {
  const { data, error } = await client
    .from("student_memory_summaries")
    .select("*")
    .eq("student_id", studentId)
    .single()

  if (error || !data) return null

  return {
    studentId: data.student_id,
    compactSummary: data.compact_summary ?? "",
    detailedSummary: data.detailed_summary ?? "",
    subjectTrends: (data.subject_trends as Record<string, unknown>) ?? {},
    stumblingPatterns: (data.stumbling_patterns as Record<string, unknown>) ?? {},
    effectiveEncouragements: (data.effective_encouragements as Record<string, unknown>) ?? {},
    recentSuccesses: (data.recent_successes as Record<string, unknown>) ?? {},
    emotionalTendencies: (data.emotional_tendencies as Record<string, unknown>) ?? {},
    lastStudyLogId: data.last_study_log_id ?? 0,
    lastDeltaAt: data.last_delta_at,
    dataWindowStart: data.data_window_start,
    dataWindowEnd: data.data_window_end,
    weeksCovered: data.weeks_covered ?? 0,
    lastGeneratedAt: data.last_generated_at,
    generationVersion: data.generation_version ?? 0,
  }
}
