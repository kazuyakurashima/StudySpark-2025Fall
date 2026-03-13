/**
 * コーチフィードバック共有型定義
 *
 * Server Action / Route Handler / クライアントの全レイヤーから安全にimport可能な
 * サーバー依存のないピュア型ファイル。
 */

/** フィードバック生成用の学習データ */
export type StudyDataForFeedback = {
  subjects: {
    name: string
    correct: number
    total: number
    accuracy: number
  }[]
  studentName?: string
  streak?: number
  previousAccuracy?: number
  reflectionText?: string
}

/** フィードバック生成成功 */
export type GenerateFeedbackSuccess = {
  success: true
  feedback: string
  fromCache?: boolean
  savedToDb: boolean
}

/** フィードバック生成失敗 */
export type GenerateFeedbackError = {
  success: false
  error: string
  fallbackFeedback: string
  canRetry: boolean
}

/** フィードバック生成結果（union型） */
export type GenerateFeedbackResult = GenerateFeedbackSuccess | GenerateFeedbackError

/** DB保存パラメータ */
export type SaveFeedbackParams = {
  batchId: string
  studyLogId: number
  studentId: number
  sessionId: number
  feedbackText: string
  promptVersion: string
  promptHash: string | null
  langfuseTraceId: string | null
}

/** バッチ所有権検証結果 */
export type BatchVerificationResult =
  | { ok: true; verifiedSessionId: number; representativeStudyLogId: number }
  | { ok: false; error: string }

/** キャッシュ確認結果 */
export type CacheCheckResult =
  | { hit: true; feedbackText: string }
  | { hit: false; deleted?: boolean }
