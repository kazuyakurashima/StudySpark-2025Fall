// 過去問の年度リスト（2025年〜2016年）
export const EXAM_YEARS = [2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016] as const

// 科目タイプ
export const EXAM_TYPES = {
  tekisei_1: "適性検査I",
  tekisei_2: "適性検査II",
} as const

export type ExamType = keyof typeof EXAM_TYPES
export type ExamYear = (typeof EXAM_YEARS)[number]

export interface PastExamResult {
  id: string
  student_id: string
  exam_year: number
  exam_type: ExamType
  attempt_number: number
  score: number
  reflection: string | null
  taken_at: string
  created_at: string
  updated_at: string
}
