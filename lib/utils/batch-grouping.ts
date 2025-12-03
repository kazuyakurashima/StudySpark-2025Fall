/**
 * batch_id グループ化ユーティリティ
 *
 * @description
 * 学習記録（study_logs）をbatch_idでグループ化するためのユーティリティ関数。
 * 生徒ダッシュボード、リフレクト画面、指導者画面など複数箇所で共通利用。
 *
 * @example
 * ```typescript
 * import { groupLogsByBatch } from "@/lib/utils/batch-grouping"
 *
 * const entries = groupLogsByBatch(logs, { batchFeedbacks, legacyFeedbacks })
 * entries.forEach(entry => {
 *   if (entry.type === "batch") {
 *     console.log(`Batch: ${entry.subjects.join(", ")}`)
 *   } else {
 *     console.log(`Single: ${entry.log.subject}`)
 *   }
 * })
 * ```
 *
 * @see docs/BATCH_GROUPING_UI_IMPLEMENTATION_PLAN.md
 */

import type {
  StudyLogWithBatch,
  GroupedLogEntry,
  BatchLogEntry,
  SingleLogEntry,
  FeedbackMaps,
} from "@/lib/types/batch-grouping"

/**
 * 日時文字列をタイムスタンプに変換（比較用）
 *
 * @param dateStr - ISO 8601形式の日時文字列
 * @returns タイムスタンプ（ミリ秒）。パース失敗時はNumber.NEGATIVE_INFINITY
 */
function toTimestamp(dateStr: string): number {
  const timestamp = new Date(dateStr).getTime()
  return Number.isNaN(timestamp) ? Number.NEGATIVE_INFINITY : timestamp
}

/**
 * 科目名一覧を重複排除して取得
 *
 * @param logs - 学習ログ配列
 * @returns 重複排除された科目名配列（順序維持）
 */
function getUniqueSubjects<TLog extends StudyLogWithBatch>(logs: TLog[]): string[] {
  return Array.from(new Set(logs.map((log) => log.subject)))
}

/**
 * バッチ内で最も新しいログを取得
 *
 * @param logs - バッチ内の学習ログ配列
 * @returns max(logged_at) を持つログ
 */
function getLatestLog<TLog extends StudyLogWithBatch>(logs: TLog[]): TLog {
  return logs.reduce((latest, log) =>
    toTimestamp(log.logged_at) > toTimestamp(latest.logged_at) ? log : latest
  )
}

/**
 * 学習ログをbatch_idでグループ化
 *
 * @description
 * 同一batch_idを持つログをグループ化し、batch_idがnullのログは単独エントリとして扱う。
 * 結果はlogged_at降順でソートされる。
 *
 * グループ化ルール:
 * - batch_idがある場合: 同一batch_idのログをまとめてバッチエントリに
 * - batch_idがnull/undefinedの場合: 単独エントリに
 *
 * 代表日付・代表ログ:
 * - バッチ内で max(logged_at) を持つログを代表とする
 * - studyDate は代表ログの study_date を使用
 *
 * @param logs - 学習ログ配列
 * @param feedbackMaps - フィードバックマップ（batch_id用とlegacy用）
 * @returns グループ化されたエントリ配列（logged_at降順）
 *
 * @example
 * ```typescript
 * const entries = groupLogsByBatch(logs, { batchFeedbacks, legacyFeedbacks })
 *
 * entries.forEach(entry => {
 *   if (entry.type === "batch") {
 *     // バッチエントリ: 複数科目
 *     console.log(`Subjects: ${entry.subjects.join(", ")}`)
 *     console.log(`Logs: ${entry.logs.length}`)
 *     console.log(`Feedback: ${entry.coachFeedback}`)
 *   } else {
 *     // 単独エントリ: 1科目
 *     console.log(`Subject: ${entry.log.subject}`)
 *     console.log(`Feedback: ${entry.coachFeedback}`)
 *   }
 * })
 * ```
 */
export function groupLogsByBatch<TLog extends StudyLogWithBatch>(
  logs: TLog[],
  feedbackMaps: FeedbackMaps
): GroupedLogEntry<TLog>[] {
  const { batchFeedbacks, legacyFeedbacks } = feedbackMaps

  // 入力が空または無効な場合は空配列を返す
  if (!Array.isArray(logs) || logs.length === 0) {
    return []
  }

  const batchGroups = new Map<string, TLog[]>()
  const standaloneLogs: TLog[] = []

  // グループ分け
  logs.forEach((log) => {
    if (log.batch_id) {
      const group = batchGroups.get(log.batch_id) || []
      group.push(log)
      batchGroups.set(log.batch_id, group)
    } else {
      standaloneLogs.push(log)
    }
  })

  const entries: GroupedLogEntry<TLog>[] = []

  // バッチグループをエントリに変換
  batchGroups.forEach((groupLogs, batchId) => {
    const latestLog = getLatestLog(groupLogs)
    const batchEntry: BatchLogEntry<TLog> = {
      type: "batch",
      batchId,
      logs: groupLogs,
      subjects: getUniqueSubjects(groupLogs),
      coachFeedback: batchFeedbacks[batchId] ?? null,
      latestLoggedAt: latestLog.logged_at,
      studyDate: latestLog.study_date,
    }
    entries.push(batchEntry)
  })

  // 単独ログをエントリに変換
  standaloneLogs.forEach((log) => {
    const singleEntry: SingleLogEntry<TLog> = {
      type: "single",
      log,
      coachFeedback: legacyFeedbacks[log.id] ?? null,
    }
    entries.push(singleEntry)
  })

  // logged_at降順でソート（Date比較）
  return entries.sort((a, b) => {
    const aTime =
      a.type === "batch" ? toTimestamp(a.latestLoggedAt) : toTimestamp(a.log.logged_at)
    const bTime =
      b.type === "batch" ? toTimestamp(b.latestLoggedAt) : toTimestamp(b.log.logged_at)
    return bTime - aTime // 降順
  })
}

/**
 * グループ化されたエントリからソートキーを取得
 *
 * @param entry - グループ化されたエントリ
 * @returns logged_at（ISO 8601形式）
 */
export function getEntryLoggedAt<TLog extends StudyLogWithBatch>(
  entry: GroupedLogEntry<TLog>
): string {
  return entry.type === "batch" ? entry.latestLoggedAt : entry.log.logged_at
}

/**
 * グループ化されたエントリから代表日付を取得
 *
 * @param entry - グループ化されたエントリ
 * @returns study_date（YYYY-MM-DD形式）
 */
export function getEntryStudyDate<TLog extends StudyLogWithBatch>(
  entry: GroupedLogEntry<TLog>
): string {
  return entry.type === "batch" ? entry.studyDate : entry.log.study_date
}

/**
 * バッチ内で応援紐付け用の代表ログを取得
 *
 * @description
 * 応援送信時、バッチ全体を選択した場合に紐付けるログを取得する。
 * ルール: max(logged_at) を持つログ（最新）を代表とする。
 *
 * @param entry - グループ化されたエントリ
 * @returns 代表ログ
 */
export function getRepresentativeLog<TLog extends StudyLogWithBatch>(
  entry: GroupedLogEntry<TLog>
): TLog {
  if (entry.type === "single") {
    return entry.log
  }
  return getLatestLog(entry.logs)
}

/**
 * 集計情報を計算
 *
 * @param entry - グループ化されたエントリ
 * @returns 総問題数と総正答数
 */
export function calculateSummary<TLog extends StudyLogWithBatch>(
  entry: GroupedLogEntry<TLog>
): { totalQuestions: number; totalCorrect: number } {
  if (entry.type === "single") {
    return {
      totalQuestions: entry.log.total_problems,
      totalCorrect: entry.log.correct_count,
    }
  }

  return entry.logs.reduce(
    (acc, log) => ({
      totalQuestions: acc.totalQuestions + log.total_problems,
      totalCorrect: acc.totalCorrect + log.correct_count,
    }),
    { totalQuestions: 0, totalCorrect: 0 }
  )
}

/**
 * 正答率を計算
 *
 * @param totalQuestions - 総問題数
 * @param totalCorrect - 総正答数
 * @returns 正答率（0-100のパーセンテージ）、問題数が0の場合は0
 */
export function calculateAccuracy(totalQuestions: number, totalCorrect: number): number {
  if (totalQuestions === 0) return 0
  return Math.round((totalCorrect / totalQuestions) * 100)
}
