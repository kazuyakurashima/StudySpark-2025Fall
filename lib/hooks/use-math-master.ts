import useSWR, { mutate } from "swr"

// ============================================================
// 型定義
// ============================================================

export interface MathMasterSessionSummary {
  session_number: number
  attempt_number: number
  title: string
  question_set_id: number | null
  has_question_set: boolean
  total_questions: number
  submitted_count: number
  total_students: number
  avg_score: number
  max_score: number
  avg_rate: number
}

export interface MathMasterSummaryData {
  grade: number
  total_students: number
  sessions: MathMasterSessionSummary[]
}

export interface MathMasterQuestion {
  id: number
  question_number: string
  section_name: string
  points: number
  display_order: number
}

export interface MathMasterStudentResult {
  student_id: number
  full_name: string
  login_id: string
  total_score: number | null
  max_score: number | null
  results: Record<string, boolean | null>
}

export interface MathMasterQuestionStat {
  question_id: number
  correct_count: number
  answered_count: number
  rate: number
}

export interface MathMasterQuestionSetInfo {
  id: number
  title: string
  grade: number
  display_order: number
  session_number: number | null
  master_max_score: number | null
}

export interface MathMasterDetailData {
  question_set: MathMasterQuestionSetInfo
  questions: MathMasterQuestion[]
  students: MathMasterStudentResult[]
  question_stats: MathMasterQuestionStat[]
}

// ============================================================
// Fetcher
// ============================================================

const fetcher = async <T>(url: string): Promise<T> => {
  const res = await fetch(url)
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "データの取得に失敗しました" }))
    throw new Error(error.error || "データの取得に失敗しました")
  }
  return res.json()
}

const SWR_OPTIONS = {
  dedupingInterval: 5000,
  revalidateOnFocus: true,
  focusThrottleInterval: 300000,
  revalidateOnReconnect: true,
  errorRetryCount: 3,
  revalidateIfStale: true,
}

// ============================================================
// サマリーフック
// ============================================================

export function useMathMasterSummary(grade: 5 | 6) {
  const key = `/api/coach/math-master/summary?grade=${grade}`

  const { data, error, isLoading, isValidating, mutate: swrMutate } = useSWR<MathMasterSummaryData>(
    key,
    fetcher<MathMasterSummaryData>,
    SWR_OPTIONS
  )

  return {
    data,
    error,
    isLoading,
    isValidating,
    mutate: swrMutate,
    sessions: data?.sessions || [],
    totalStudents: data?.total_students || 0,
  }
}

export function revalidateMathMasterSummary(grade: 5 | 6) {
  return mutate(`/api/coach/math-master/summary?grade=${grade}`)
}

// ============================================================
// 詳細フック
// ============================================================

export function useMathMasterDetail(questionSetId: number | null) {
  const key = questionSetId
    ? `/api/coach/math-master/detail?question_set_id=${questionSetId}`
    : null

  const { data, error, isLoading, isValidating, mutate: swrMutate } = useSWR<MathMasterDetailData>(
    key,
    fetcher<MathMasterDetailData>,
    SWR_OPTIONS
  )

  return {
    data,
    error,
    isLoading,
    isValidating,
    mutate: swrMutate,
    questions: data?.questions || [],
    students: data?.students || [],
    questionStats: data?.question_stats || [],
    questionSet: data?.question_set || null,
  }
}
