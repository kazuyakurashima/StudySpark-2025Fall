/**
 * 目標と結果を統合するユーティリティ
 */

import type { TestGoal, TestResult, MergedTestRecord } from "@/lib/types/goal"

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
    const scheduleId = goal.test_schedule_id.toString()
    scheduleMap.set(scheduleId, {
      scheduleId,
      testName: goal.test_schedules?.test_name || "不明なテスト",
      testDate: goal.test_schedules?.test_date || "",
      goalDeviation: goal.target_deviation,
      goalThoughts: goal.thoughts,
      goalCreatedAt: goal.created_at,
      resultDeviation: null,
      resultRegisteredAt: null,
      subjectDeviations: null,
    })
  })

  // 結果を追加（既存のエントリにマージ or 新規作成）
  results.forEach((result) => {
    const scheduleId = result.test_schedule_id.toString()
    const existing = scheduleMap.get(scheduleId)

    if (existing) {
      // 既存のエントリに結果をマージ
      existing.resultDeviation = result.four_subject_deviation
      existing.resultRegisteredAt = result.created_at
      existing.subjectDeviations = {
        算数: result.math_deviation,
        国語: result.japanese_deviation,
        理科: result.science_deviation,
        社会: result.social_deviation,
      }
    } else {
      // 結果のみのエントリを作成
      scheduleMap.set(scheduleId, {
        scheduleId,
        testName: result.test_schedules?.test_name || "不明なテスト",
        testDate: result.test_schedules?.test_date || "",
        goalDeviation: null,
        goalThoughts: null,
        goalCreatedAt: null,
        resultDeviation: result.four_subject_deviation,
        resultRegisteredAt: result.created_at,
        subjectDeviations: {
          算数: result.math_deviation,
          国語: result.japanese_deviation,
          理科: result.science_deviation,
          社会: result.social_deviation,
        },
      })
    }
  })

  // テスト日降順でソート
  return Array.from(scheduleMap.values()).sort(
    (a, b) => new Date(b.testDate).getTime() - new Date(a.testDate).getTime()
  )
}
