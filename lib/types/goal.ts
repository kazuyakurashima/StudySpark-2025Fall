/**
 * テスト目標・結果の型定義
 */

export interface TestGoal {
  id: number
  student_id: number
  test_schedule_id: number
  target_deviation: number
  thoughts: string | null
  created_at: string
  updated_at: string
  test_schedules?: {
    id: number
    test_name: string
    test_date: string
    grade: string
  }
}

export interface TestResult {
  id: number
  student_id: number
  test_schedule_id: number
  four_subject_deviation: number | null
  math_deviation: number | null
  japanese_deviation: number | null
  science_deviation: number | null
  social_deviation: number | null
  created_at: string
  test_schedules?: {
    id: number
    test_name: string
    test_date: string
    grade: string
  }
}

export interface MergedTestRecord {
  scheduleId: string
  testName: string
  testDate: string
  goalDeviation: number | null
  goalThoughts: string | null
  goalCreatedAt: string | null
  resultDeviation: number | null
  resultRegisteredAt: string | null
  subjectDeviations: {
    算数: number | null
    国語: number | null
    理科: number | null
    社会: number | null
  } | null
}
