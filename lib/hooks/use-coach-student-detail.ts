import useSWR, { mutate } from "swr"

/**
 * 生徒詳細データの型定義
 */
export interface Student {
  id: string
  full_name: string
  nickname: string | null
  avatar_id: string | null
  custom_avatar_url: string | null
  grade: string
  course: string | null
  streak: number
  weekRing: number
  recentScore: number
}

export interface StudyLog {
  id: string
  created_at: string
  subject: string
  understanding_level: number
  reflection: string | null
  total_questions: number
  correct_count: number
  hasCoachResponse: boolean
  coachMessage: string
  encouragementId: string | null
}

export interface CoachStudentDetailData {
  student: Student | { error: string } | null
  studyLogs: {
    studyLogs: StudyLog[]
    error?: string
  }
  fetchedAt: number
}

/**
 * API fetcher関数
 */
const fetcher = async (url: string): Promise<CoachStudentDetailData> => {
  const res = await fetch(url)
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || "データの取得に失敗しました")
  }
  return res.json()
}

/**
 * SWR設定オプション
 */
const SWR_OPTIONS = {
  // 5秒間は重複リクエストを排除
  dedupingInterval: 5000,
  // タブ復帰時に再取得
  revalidateOnFocus: true,
  // 30秒間はフォーカス復帰時の再取得を抑制
  focusThrottleInterval: 30000,
  // ネットワーク復帰時に再取得
  revalidateOnReconnect: true,
  // エラー時の自動リトライ（3回まで）
  errorRetryCount: 3,
  // 初回レンダリング時にデータがない場合のみ再取得
  revalidateIfStale: true,
}

/**
 * 指導者用生徒詳細SWRフック
 *
 * @param studentId - 生徒ID
 */
export function useCoachStudentDetail(studentId: string | null) {
  const { data, error, isLoading, isValidating, mutate: swrMutate } = useSWR<CoachStudentDetailData>(
    studentId ? `/api/coach/student/${studentId}` : null,
    fetcher,
    SWR_OPTIONS
  )

  // 型安全なアクセサ
  const student = data?.student && !("error" in data.student) ? data.student : null
  const studentError = data?.student && "error" in data.student ? data.student.error : null
  const studyLogs = data?.studyLogs?.studyLogs || []

  return {
    data,
    error,
    isLoading,
    isValidating,
    mutate: swrMutate,
    // 便利なアクセサ
    student,
    studentError,
    studyLogs,
    // ユーティリティ: データが古いかどうか（5分以上経過）
    isStale: data ? Date.now() - data.fetchedAt > 5 * 60 * 1000 : true,
  }
}

/**
 * 生徒詳細データを手動で再取得
 */
export function revalidateCoachStudentDetail(studentId: string) {
  return mutate(`/api/coach/student/${studentId}`)
}
