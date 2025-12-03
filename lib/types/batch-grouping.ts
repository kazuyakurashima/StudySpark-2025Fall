/**
 * batch_id グループ化のための型定義
 *
 * @description
 * 学習記録（study_logs）をbatch_idでグループ化して表示するための型定義。
 * 生徒ダッシュボード、リフレクト画面、指導者画面など複数箇所で共通利用。
 *
 * @see docs/BATCH_GROUPING_UI_IMPLEMENTATION_PLAN.md
 */

/** グループキー（batch_id or study_log_id as fallback） */
export type BatchGroupKey = string

/**
 * 個別の学習ログ（batch_id付き）- 基本型
 *
 * 必須フィールドのみ定義。用途別に拡張して使用する。
 * ジェネリクスで拡張可能（追加フィールドがある場合はextendsで継承）
 */
export interface StudyLogWithBatch {
  /** 学習ログID */
  id: number
  /** バッチID（同時保存されたログのグループ識別子、nullの場合は単独ログ） */
  batch_id: string | null
  /** 生徒ID */
  student_id: number
  /** セッションID */
  session_id: number
  /** 科目名 */
  subject: string
  /** 学習日（YYYY-MM-DD形式） */
  study_date: string
  /** ログ記録日時（ISO 8601形式） */
  logged_at: string
  /** 正答数 */
  correct_count: number
  /** 総問題数 */
  total_problems: number
  /** 振り返りテキスト（任意、応援履歴では不要な場合あり） */
  reflection_text?: string | null
}

/**
 * 応援履歴用の学習ログ型
 *
 * 応援メッセージ経由で取得する際、一部フィールドが欠落する可能性があるため別定義。
 */
export interface EncouragementStudyLog
  extends Omit<StudyLogWithBatch, "reflection_text" | "session_id"> {
  /** セッションID（任意） */
  session_id?: number
}

/**
 * バッチグループ
 *
 * 同一batch_idを持つ学習ログのグループ。
 */
export interface BatchGroup<TLog extends StudyLogWithBatch> {
  /** グループキー（batch_id or study_log_id） */
  groupKey: BatchGroupKey
  /** バッチID（nullの場合は単独ログ） */
  batchId: string | null
  /** グループ内の学習ログ */
  logs: TLog[]
  /** 科目名一覧（重複排除済み） */
  subjects: string[]
  /** グループ内で最も新しいlogged_at */
  latestLoggedAt: string
  /** 代表日付（max(logged_at)のログから取得） */
  studyDate: string
  /** 集計情報（任意） */
  summary?: {
    /** 総問題数 */
    totalQuestions?: number
    /** 総正答数 */
    totalCorrect?: number
  }
}

/**
 * グループ化されたエントリ（Discriminated Union型）
 *
 * バッチエントリ（複数ログ）または単独エントリ（1ログ）のいずれか。
 * type フィールドで判別可能。
 */
export type GroupedLogEntry<TLog extends StudyLogWithBatch> =
  | BatchLogEntry<TLog>
  | SingleLogEntry<TLog>

/**
 * バッチログエントリ
 *
 * 同一batch_idを持つ複数の学習ログをまとめたエントリ。
 */
export interface BatchLogEntry<TLog extends StudyLogWithBatch> {
  /** エントリタイプ: バッチ */
  type: "batch"
  /** バッチID */
  batchId: string
  /** グループ内の学習ログ */
  logs: TLog[]
  /** 科目名一覧（重複排除済み） */
  subjects: string[]
  /** コーチフィードバック（バッチ全体で1件） */
  coachFeedback: string | null
  /** グループ内で最も新しいlogged_at */
  latestLoggedAt: string
  /** 代表日付（max(logged_at)のログから取得） */
  studyDate: string
}

/**
 * 単独ログエントリ
 *
 * batch_idがnullの単独学習ログ。
 */
export interface SingleLogEntry<TLog extends StudyLogWithBatch> {
  /** エントリタイプ: 単独 */
  type: "single"
  /** 学習ログ */
  log: TLog
  /** コーチフィードバック */
  coachFeedback: string | null
}

/**
 * フィードバックマップ型
 *
 * batch_id または study_log_id をキーとしてフィードバックテキストを格納。
 */
export interface FeedbackMaps {
  /** batch_id -> feedback_text マップ */
  batchFeedbacks: Record<string, string>
  /** study_log_id -> feedback_text マップ（レガシー対応） */
  legacyFeedbacks: Record<number, string>
}
