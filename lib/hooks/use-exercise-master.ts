import useSWR from "swr"
import type {
  ExerciseMasterSummary,
  ExerciseMasterDetail,
} from "@/app/actions/exercise-master"

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

export function useExerciseMasterSummary(grade: 5 | 6) {
  const key = `/api/coach/exercise-master/summary?grade=${grade}`

  const { data, error, isLoading, isValidating, mutate } = useSWR<ExerciseMasterSummary>(
    key,
    fetcher<ExerciseMasterSummary>,
    SWR_OPTIONS
  )

  return {
    data,
    error,
    isLoading,
    isValidating,
    mutate,
    sessions: data?.sessions || [],
    totalStudents: data?.total_students || 0,
  }
}

// ============================================================
// 詳細フック
// ============================================================

export function useExerciseMasterDetail(questionSetId: number | null) {
  const key = questionSetId
    ? `/api/coach/exercise-master/detail?question_set_id=${questionSetId}`
    : null

  const { data, error, isLoading, isValidating, mutate } = useSWR<ExerciseMasterDetail>(
    key,
    fetcher<ExerciseMasterDetail>,
    SWR_OPTIONS
  )

  return {
    data,
    error,
    isLoading,
    isValidating,
    mutate,
    questions: data?.questions || [],
    students: data?.students || [],
    questionStats: data?.question_stats || [],
    sectionStats: data?.section_stats || [],
    questionSet: data?.question_set || null,
  }
}
