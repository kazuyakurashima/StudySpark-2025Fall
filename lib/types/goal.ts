/**
 * テスト目標・結果の型定義
 * app/actions/goal.ts のAPI戻り値に対応
 */

/**
 * Supabase JOINで返される test_types の型
 */
interface TestType {
  id: number
  name: string
  grade: string
}

/**
 * Supabase JOINで返される test_schedules の型
 */
interface TestSchedule {
  id: number
  test_date: string
  test_types: TestType | TestType[]
}

/**
 * getAllTestGoalsForStudent の戻り値型
 * Supabase の !inner join は配列またはオブジェクトを返す場合がある
 */
export interface TestGoal {
  id: number
  test_schedule_id: number
  target_course: string // S, A, B, C
  target_class: number  // 組番号
  goal_thoughts: string | null
  created_at: string
  test_schedules: TestSchedule | TestSchedule[]
}

/**
 * getAllTestResultsForStudent の戻り値型
 * Supabase の !inner join は配列またはオブジェクトを返す場合がある
 */
export interface TestResult {
  id: number
  student_id: number
  test_schedule_id: number
  result_course: string | null  // S, A, B, C
  result_class: number | null   // 組番号
  result_entered_at: string | null  // ISO 8601 タイムスタンプ
  created_at: string
  // スコア系（詳細入力時のみ）
  math_score?: number | null
  japanese_score?: number | null
  science_score?: number | null
  social_score?: number | null
  total_score?: number | null
  // 偏差値系（詳細入力時のみ）
  math_deviation?: number | null
  japanese_deviation?: number | null
  science_deviation?: number | null
  social_deviation?: number | null
  total_deviation?: number | null
  test_schedules: TestSchedule | TestSchedule[]
  goal: {
    id: number
    target_course: string
    target_class: number
    goal_thoughts: string | null
  } | null
}

/**
 * 目標と結果をマージした表示用レコード
 */
export interface MergedTestRecord {
  scheduleId: string
  testName: string
  testDate: string        // YYYY-MM-DD形式
  testDateFormatted: string // 表示用（例: 12月15日）
  // 目標情報
  goalCourse: string | null
  goalClass: number | null
  goalThoughts: string | null
  goalCreatedAt: string | null
  // 結果情報
  resultCourse: string | null
  resultClass: number | null
  resultRegisteredAt: string | null
  // 達成判定（結果コースが目標コース以上なら達成）
  isAchieved: boolean | null
}
