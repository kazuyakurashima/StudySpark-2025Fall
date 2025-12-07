/**
 * 目標と結果を統合するユーティリティ
 */

import type { TestGoal, TestResult, MergedTestRecord } from "@/lib/types/goal"

/**
 * コースの順位（S > C > B > A）
 * 高い方が良い
 */
const COURSE_ORDER: Record<string, number> = {
  S: 4,
  C: 3,
  B: 2,
  A: 1,
}

/**
 * Supabase JOINの結果から最初の要素を取得するヘルパー
 * 配列の場合は最初の要素、オブジェクトの場合はそのまま返す
 */
function unwrapFirst<T>(value: T | T[] | null | undefined): T | null {
  if (value === null || value === undefined) return null
  if (Array.isArray(value)) return value[0] || null
  return value
}

/**
 * 日付をJST形式でフォーマット（YYYY-MM-DD → M月D日）
 */
function formatDateJST(dateString: string): string {
  // YYYY-MM-DD形式の日付をJSTとして解釈
  const date = new Date(dateString + "T00:00:00+09:00")
  return date.toLocaleDateString("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "numeric",
    day: "numeric",
  })
}

/**
 * 日付文字列をJST基準でDateオブジェクトに変換
 */
function parseAsJST(dateString: string): Date {
  // YYYY-MM-DD形式の日付をJSTとして解釈
  return new Date(dateString + "T00:00:00+09:00")
}

/**
 * 結果コースが目標コース以上かどうかを判定
 */
function checkAchievement(goalCourse: string | null, resultCourse: string | null): boolean | null {
  if (!goalCourse || !resultCourse) return null
  const goalRank = COURSE_ORDER[goalCourse] ?? 0
  const resultRank = COURSE_ORDER[resultCourse] ?? 0
  return resultRank >= goalRank
}

/**
 * テスト目標とテスト結果を test_schedule_id でマージする
 *
 * @param goals - getAllTestGoalsForStudent の結果
 * @param results - getAllTestResultsForStudent の結果
 * @returns マージされたレコード（テスト日降順）
 */
export function mergeGoalsAndResults(
  goals: TestGoal[],
  results: TestResult[]
): MergedTestRecord[] {
  const scheduleMap = new Map<string, MergedTestRecord>()

  // 目標を先に登録
  goals.forEach((goal) => {
    const scheduleId = String(goal.test_schedule_id)
    const schedule = unwrapFirst(goal.test_schedules)
    const testTypes = schedule ? unwrapFirst(schedule.test_types) : null
    const testDate = schedule?.test_date || ""

    scheduleMap.set(scheduleId, {
      scheduleId,
      testName: testTypes?.name || "不明なテスト",
      testDate,
      testDateFormatted: testDate ? formatDateJST(testDate) : "",
      goalCourse: goal.target_course,
      goalClass: goal.target_class,
      goalThoughts: goal.goal_thoughts,
      goalCreatedAt: goal.created_at,
      resultCourse: null,
      resultClass: null,
      resultRegisteredAt: null,
      isAchieved: null,
    })
  })

  // 結果を追加（既存のエントリにマージ or 新規作成）
  results.forEach((result) => {
    const scheduleId = String(result.test_schedule_id)
    const existing = scheduleMap.get(scheduleId)

    if (existing) {
      // 既存のエントリに結果をマージ
      existing.resultCourse = result.result_course
      existing.resultClass = result.result_class
      existing.resultRegisteredAt = result.result_entered_at
      existing.isAchieved = checkAchievement(existing.goalCourse, result.result_course)
    } else {
      // 結果のみのエントリを作成（目標がない場合）
      const schedule = unwrapFirst(result.test_schedules)
      const testTypes = schedule ? unwrapFirst(schedule.test_types) : null
      const testDate = schedule?.test_date || ""
      // 結果に付随する目標情報があればそれを使う
      const goalFromResult = result.goal

      scheduleMap.set(scheduleId, {
        scheduleId,
        testName: testTypes?.name || "不明なテスト",
        testDate,
        testDateFormatted: testDate ? formatDateJST(testDate) : "",
        goalCourse: goalFromResult?.target_course || null,
        goalClass: goalFromResult?.target_class || null,
        goalThoughts: goalFromResult?.goal_thoughts || null,
        goalCreatedAt: null,
        resultCourse: result.result_course,
        resultClass: result.result_class,
        resultRegisteredAt: result.result_entered_at,
        isAchieved: checkAchievement(goalFromResult?.target_course || null, result.result_course),
      })
    }
  })

  // テスト日降順でソート（JST基準）
  return Array.from(scheduleMap.values()).sort((a, b) => {
    const dateA = a.testDate ? parseAsJST(a.testDate).getTime() : 0
    const dateB = b.testDate ? parseAsJST(b.testDate).getTime() : 0
    return dateB - dateA
  })
}
