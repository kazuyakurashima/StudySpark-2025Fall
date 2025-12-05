/**
 * バッチコンテキスト取得ユーティリティ
 *
 * 応援AI生成時にバッチ全体の情報を取得し、
 * 複数科目まとめ記録でも適切な応援文を生成できるようにする。
 */

import { createClient } from "@/lib/supabase/server"

/**
 * バッチ内の科目別統計情報
 */
export interface SubjectStats {
  name: string
  totalProblems: number
  correctCount: number
  accuracy: number
}

/**
 * バッチコンテキスト
 */
export interface BatchContext {
  /** バッチかどうか（2件以上の場合true） */
  isBatch: boolean
  /** 科目名一覧 */
  subjects: string[]
  /** 科目数 */
  subjectCount: number
  /** 総問題数 */
  totalProblems: number
  /** 総正答数 */
  totalCorrect: number
  /** 平均正答率 */
  averageAccuracy: number
  /** 最高正答率の科目（努力を褒める用） */
  bestSubject?: SubjectStats
  /** 最低正答率の科目（挑戦を褒める用） */
  challengeSubject?: SubjectStats
  /** 学習日 */
  studyDate: string
  /** 学習回番号 */
  sessionNumber: number
  /** バッチID（存在する場合） */
  batchId?: string
}

/**
 * 単一ログの基本情報
 */
interface StudyLogBase {
  id: number
  study_date: string
  total_problems: number
  correct_count: number
  batch_id: string | null
  study_sessions: { session_number: number } | { session_number: number }[]
  subjects: { name: string } | { name: string }[]
}

/**
 * 学習記録からバッチコンテキストを取得
 *
 * @param studyLogId - 代表ログID
 * @returns バッチコンテキスト（エラー時は単一ログとしてフォールバック）
 *
 * @note パフォーマンス考慮
 * - 最大10件までに制限（通常は4科目程度）
 * - 失敗時はフォールバックで単一ログ情報を返す
 */
export async function getBatchContext(studyLogId: number | string): Promise<BatchContext | null> {
  try {
    const supabase = await createClient()
    const logId = typeof studyLogId === "string" ? parseInt(studyLogId, 10) : studyLogId

    // まず代表ログを取得
    const { data: representativeLog, error: logError } = await supabase
      .from("study_logs")
      .select(`
        id,
        study_date,
        total_problems,
        correct_count,
        batch_id,
        study_sessions(session_number),
        subjects(name)
      `)
      .eq("id", logId)
      .single()

    if (logError || !representativeLog) {
      console.error("[getBatchContext] Failed to fetch representative log:", logError)
      return null
    }

    const typedLog = representativeLog as unknown as StudyLogBase

    // batch_idがない場合は単一ログとして返す
    if (!typedLog.batch_id) {
      return buildSingleLogContext(typedLog)
    }

    // バッチ内の全ログを取得（最大10件に制限）
    const { data: batchLogs, error: batchError } = await supabase
      .from("study_logs")
      .select(`
        id,
        study_date,
        total_problems,
        correct_count,
        batch_id,
        study_sessions(session_number),
        subjects(name)
      `)
      .eq("batch_id", typedLog.batch_id)
      .order("id", { ascending: true })
      .limit(10)

    if (batchError || !batchLogs || batchLogs.length === 0) {
      // フォールバック: 代表ログのみで構築
      console.warn("[getBatchContext] Failed to fetch batch logs, falling back to single log")
      return buildSingleLogContext(typedLog)
    }

    // バッチコンテキストを構築
    return buildBatchContext(batchLogs as unknown as StudyLogBase[], typedLog)
  } catch (error) {
    console.error("[getBatchContext] Unexpected error:", error)
    return null
  }
}

/**
 * 単一ログからコンテキストを構築
 */
function buildSingleLogContext(log: StudyLogBase): BatchContext {
  const subjectName = getSubjectName(log.subjects)
  const sessionNumber = getSessionNumber(log.study_sessions)
  const accuracy = log.total_problems > 0
    ? Math.round((log.correct_count / log.total_problems) * 100)
    : 0

  return {
    isBatch: false,
    subjects: [subjectName],
    subjectCount: 1,
    totalProblems: log.total_problems,
    totalCorrect: log.correct_count,
    averageAccuracy: accuracy,
    studyDate: log.study_date,
    sessionNumber,
    batchId: log.batch_id || undefined,
  }
}

/**
 * バッチログからコンテキストを構築
 */
function buildBatchContext(logs: StudyLogBase[], representativeLog: StudyLogBase): BatchContext {
  const sessionNumber = getSessionNumber(representativeLog.study_sessions)

  // 科目別統計を計算
  const subjectStatsMap = new Map<string, SubjectStats>()

  for (const log of logs) {
    const subjectName = getSubjectName(log.subjects)

    if (!subjectStatsMap.has(subjectName)) {
      subjectStatsMap.set(subjectName, {
        name: subjectName,
        totalProblems: 0,
        correctCount: 0,
        accuracy: 0,
      })
    }

    const stats = subjectStatsMap.get(subjectName)!
    stats.totalProblems += log.total_problems
    stats.correctCount += log.correct_count
  }

  // 正答率を計算
  for (const stats of subjectStatsMap.values()) {
    stats.accuracy = stats.totalProblems > 0
      ? Math.round((stats.correctCount / stats.totalProblems) * 100)
      : 0
  }

  const subjectStats = Array.from(subjectStatsMap.values())

  // 全体集計
  const totalProblems = subjectStats.reduce((sum, s) => sum + s.totalProblems, 0)
  const totalCorrect = subjectStats.reduce((sum, s) => sum + s.correctCount, 0)
  const averageAccuracy = totalProblems > 0
    ? Math.round((totalCorrect / totalProblems) * 100)
    : 0

  // 最高/最低正答率の科目を特定（問題数1以上のみ対象）
  const validStats = subjectStats.filter(s => s.totalProblems > 0)
  const sortedByAccuracy = [...validStats].sort((a, b) => b.accuracy - a.accuracy)

  const bestSubject = sortedByAccuracy[0]
  const challengeSubject = sortedByAccuracy.length > 1
    ? sortedByAccuracy[sortedByAccuracy.length - 1]
    : undefined

  return {
    isBatch: logs.length > 1,
    subjects: subjectStats.map(s => s.name),
    subjectCount: subjectStats.length,
    totalProblems,
    totalCorrect,
    averageAccuracy,
    bestSubject,
    challengeSubject: challengeSubject?.accuracy !== bestSubject?.accuracy ? challengeSubject : undefined,
    studyDate: representativeLog.study_date,
    sessionNumber,
    batchId: representativeLog.batch_id || undefined,
  }
}

/**
 * subjects からnameを取得（配列/オブジェクト対応）
 */
function getSubjectName(subjects: { name: string } | { name: string }[] | null): string {
  if (!subjects) return "不明"
  if (Array.isArray(subjects)) {
    return subjects[0]?.name || "不明"
  }
  return subjects.name || "不明"
}

/**
 * study_sessions からsession_numberを取得（配列/オブジェクト対応）
 */
function getSessionNumber(sessions: { session_number: number } | { session_number: number }[] | null): number {
  if (!sessions) return 0
  if (Array.isArray(sessions)) {
    return sessions[0]?.session_number || 0
  }
  return sessions.session_number || 0
}
