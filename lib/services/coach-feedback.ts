/**
 * コーチフィードバック サービス層
 *
 * Server Action と Route Handler の両方から利用される共有ドメインロジック。
 * DB依存のビジネスロジック（バッチ検証、キャッシュ確認、DB保存）と
 * プロンプト生成を集約する。
 *
 * docs/AI_COACHING_IMPROVEMENT_PLAN.md:1119 に準拠。
 */

import crypto from "crypto"
import { sanitizeForLog } from "@/lib/llm/logger"
import type {
  StudyDataForFeedback,
  SaveFeedbackParams,
  BatchVerificationResult,
  CacheCheckResult,
} from "@/lib/types/coach-feedback"
import type { SupabaseClient } from "@supabase/supabase-js"

// ============================================================================
// 定数
// ============================================================================

export const PROMPT_VERSION = "v1.0"
const BASE_TIMEOUT_MS = 5000
const TIMEOUT_PER_SUBJECT_MS = 500

// ============================================================================
// タイムアウト
// ============================================================================

/**
 * 科目数に応じた動的タイムアウト計算
 * 基本5秒 + 科目数×0.5秒（最大8秒）
 */
export function getTimeoutMs(subjectCount: number): number {
  const dynamicTimeout = BASE_TIMEOUT_MS + subjectCount * TIMEOUT_PER_SUBJECT_MS
  return Math.min(dynamicTimeout, 8000)
}

// ============================================================================
// プロンプト生成
// ============================================================================

/** プロンプトハッシュ生成（監査用） */
export function getPromptHash(systemPrompt: string, userPrompt: string): string {
  return crypto
    .createHash("sha256")
    .update(systemPrompt + userPrompt)
    .digest("hex")
    .substring(0, 16)
}

/** システムプロンプト */
export function getSystemPrompt(): string {
  return `あなたは中学受験を目指す小学生を応援するAIコーチです。

【役割】
学習記録を見て、頑張りを認め、励ます短いメッセージを生成します。

【セルフコンパッション原則】
- 結果ではなく、取り組んだ過程・努力を認める
- 完璧を求めず、挑戦したこと自体を称える
- 失敗を責めず、学びの機会として捉える

【コンテキスト活用】
- 連続学習日数があれば継続を称える
- 前回より正答率が上がっていれば成長を強調
- 複数科目に取り組んだ場合はその努力を認める
- 生徒の振り返りコメントがあれば、その気持ちに共感し言及する

【正答率別トーン】
- 80%以上: 達成を称える
- 50-79%: 挑戦を認める + 「次は〇〇してみよう」の一言
- 50%未満: 取り組みを肯定 + 「間違いは成長のチャンス」+ 具体的な次の一歩

【出力】
- 40〜100文字
- 具体的な数字に言及
- 温かく親しみやすい言葉
- 振り返りがある場合は、その内容に触れる`
}

/** ユーザープロンプト */
export function getUserPrompt(data: StudyDataForFeedback): string {
  const details = data.subjects
    .map((s) => `${s.name}: ${s.correct}/${s.total}問正解（${s.accuracy}%）`)
    .join("\n")

  let context = ""
  if (data.streak && data.streak >= 3) {
    context += `\n連続学習日数: ${data.streak}日`
  }
  if (data.previousAccuracy !== undefined && data.subjects.length > 0) {
    const currentAvg =
      data.subjects.reduce((sum, s) => sum + s.accuracy, 0) / data.subjects.length
    const diff = Math.round(currentAvg - data.previousAccuracy)
    if (diff > 0) {
      context += `\n前回比: +${diff}%アップ`
    }
  }

  let reflection = ""
  if (data.reflectionText && data.reflectionText.trim()) {
    reflection = `\n\n生徒の振り返りコメント:\n「${data.reflectionText.trim()}」`
  }

  return `今日の学習記録:
${details}${context}${reflection}

この記録に対して、生徒を励ます短いメッセージを生成してください。`
}

/** フォールバックメッセージ（AI生成失敗時） */
export function getFallbackFeedback(data: StudyDataForFeedback): string {
  const totalSubjects = data.subjects.length
  const avgAccuracy =
    data.subjects.reduce((sum, s) => sum + s.accuracy, 0) / (totalSubjects || 1)

  if (totalSubjects >= 3) {
    return `${totalSubjects}科目も頑張ったね！ナイスチャレンジ！`
  } else if (avgAccuracy >= 80) {
    return `よく頑張ったね！素晴らしい集中力だ！`
  } else if (avgAccuracy >= 50) {
    return `しっかり取り組めたね！その調子！`
  } else {
    return `今日も学習に挑戦したね！その努力が大事だよ！`
  }
}

// ============================================================================
// DB操作
// ============================================================================

/**
 * バッチ所有権検証
 *
 * batch_id に属する study_logs が全て同一 student_id / session_id であり、
 * クライアントが送信した studyLogIds がバッチ内に含まれることを検証する。
 */
export async function verifyBatchOwnership(
  supabase: SupabaseClient,
  verifiedStudentId: number,
  batchId: string,
  studyLogIds: number[],
  sessionId: number
): Promise<BatchVerificationResult> {
  const { data: batchLogs, error: batchError } = await supabase
    .from("study_logs")
    .select("id, student_id, session_id, batch_id")
    .eq("batch_id", batchId)

  if (batchError) {
    console.error("Batch logs lookup failed:", sanitizeForLog(batchError))
    return { ok: false, error: "学習記録の取得に失敗しました" }
  }

  if (!batchLogs || batchLogs.length === 0) {
    return { ok: false, error: "batch_not_found" }
  }

  // クライアントから渡されたstudyLogIdsとbatch内のIDが一致するか検証
  const batchLogIds = new Set(batchLogs.map((log: { id: number }) => log.id))
  const allClientIdsInBatch = studyLogIds.every((id) => batchLogIds.has(id))

  if (!allClientIdsInBatch) {
    console.error(
      "[Coach Feedback] Validation failed - studyLogIds mismatch:",
      sanitizeForLog({
        clientIds: studyLogIds,
        batchIds: Array.from(batchLogIds),
        batchId,
      })
    )
    return { ok: false, error: "学習記録の整合性エラー" }
  }

  // 全ログが同一student_id か検証
  if (!batchLogs.every((log: { student_id: number }) => log.student_id === verifiedStudentId)) {
    console.error(
      "[Coach Feedback] Validation failed - student ownership mismatch:",
      sanitizeForLog({
        verifiedStudentId,
        batchStudentIds: batchLogs.map((log: { student_id: number }) => log.student_id),
        batchId,
      })
    )
    return { ok: false, error: "権限エラー: この学習記録へのアクセス権がありません" }
  }

  // 全ログが同一session_id か検証
  if (!batchLogs.every((log: { session_id: number }) => log.session_id === sessionId)) {
    console.error(
      "[Coach Feedback] Validation failed - session inconsistency:",
      sanitizeForLog({
        sessionId,
        batchId,
        batchSessionIds: batchLogs.map((log: { session_id: number }) => log.session_id),
      })
    )
    return { ok: false, error: "セッション情報の整合性エラー" }
  }

  return {
    ok: true,
    verifiedSessionId: sessionId,
    representativeStudyLogId: studyLogIds[0],
  }
}

/**
 * 既存フィードバック確認（キャッシュ）
 *
 * 既存挙動の維持:
 * - 既存フィードバック + 振り返りあり → 既存削除して再生成
 *   (coach-feedback.ts:388-403 の意味論を維持)
 */
export async function checkExistingFeedback(
  adminClient: SupabaseClient,
  batchId: string,
  hasReflection: boolean
): Promise<CacheCheckResult> {
  const { data: existing } = await adminClient
    .from("coach_feedbacks")
    .select("id, feedback_text")
    .eq("batch_id", batchId)
    .single()

  if (!existing) {
    return { hit: false }
  }

  // 振り返りテキストがある場合、既存フィードバックを削除して再生成
  if (hasReflection) {
    await adminClient.from("coach_feedbacks").delete().eq("id", existing.id)
    return { hit: false, deleted: true }
  }

  return { hit: true, feedbackText: existing.feedback_text }
}

/**
 * フィードバックDB保存
 *
 * UNIQUE重複（23505）時は既存レコードを返す。
 * 保存成功/失敗の結果を返す（呼び出し元でmeta判定に使用）。
 */
export async function saveFeedbackToDb(
  adminClient: SupabaseClient,
  params: SaveFeedbackParams
): Promise<{ saved: true } | { saved: false; existingText?: string }> {
  const { error: insertError } = await adminClient.from("coach_feedbacks").insert({
    batch_id: params.batchId,
    study_log_id: params.studyLogId,
    student_id: params.studentId,
    session_id: params.sessionId,
    feedback_text: params.feedbackText,
    prompt_version: params.promptVersion,
    prompt_hash: params.promptHash,
    langfuse_trace_id: params.langfuseTraceId,
  })

  if (!insertError) {
    return { saved: true }
  }

  // UNIQUE違反 - 既存を返す
  if (insertError.code === "23505") {
    const { data: existingAfterConflict } = await adminClient
      .from("coach_feedbacks")
      .select("feedback_text")
      .eq("batch_id", params.batchId)
      .single()

    if (existingAfterConflict) {
      return { saved: false, existingText: existingAfterConflict.feedback_text }
    }
  }

  console.error(
    "Failed to save feedback to DB:",
    sanitizeForLog({
      code: insertError.code,
      message: insertError.message,
      details: insertError.details,
      hint: insertError.hint,
      insertData: {
        batch_id: params.batchId,
        study_log_id: params.studyLogId,
        student_id: params.studentId,
        session_id: params.sessionId,
      },
    })
  )

  return { saved: false }
}

/**
 * フォールバックメッセージをDBに保存
 *
 * LLMエラー時に使用。保存成功ならリトライ不要（canRetry=false相当）。
 * 既存挙動: coach-feedback.ts:524-566
 */
export async function saveFallbackToDb(
  adminClient: SupabaseClient,
  params: Omit<SaveFeedbackParams, "promptHash"> & { promptVersion: string }
): Promise<boolean> {
  try {
    const { error: fallbackInsertError } = await adminClient.from("coach_feedbacks").insert({
      batch_id: params.batchId,
      study_log_id: params.studyLogId,
      student_id: params.studentId,
      session_id: params.sessionId,
      feedback_text: params.feedbackText,
      prompt_version: `${params.promptVersion}-fallback`,
      prompt_hash: null,
      langfuse_trace_id: params.langfuseTraceId,
    })

    if (!fallbackInsertError) return true
    if (fallbackInsertError.code === "23505") return true // UNIQUE違反 = 既存あり

    console.error(
      "[Coach Feedback] Failed to save fallback:",
      sanitizeForLog({
        code: fallbackInsertError.code,
        message: fallbackInsertError.message,
        details: fallbackInsertError.details,
        hint: fallbackInsertError.hint,
      })
    )
    return false
  } catch (saveError) {
    console.error("[Coach Feedback] Exception saving fallback:", sanitizeForLog(saveError))
    return false
  }
}
