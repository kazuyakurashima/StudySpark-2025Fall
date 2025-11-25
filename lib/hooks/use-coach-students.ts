import useSWR, { mutate } from "swr"
import type { CoachStudent } from "@/app/actions/coach"

/**
 * 生徒一覧データの型定義
 */
export interface CoachStudentsData {
  students: {
    students: CoachStudent[]
    error?: string
  }
  fetchedAt: number
}

/**
 * API fetcher関数
 */
const fetcher = async (url: string): Promise<CoachStudentsData> => {
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
 * 指導者用生徒一覧SWRフック
 */
export function useCoachStudents() {
  const { data, error, isLoading, isValidating, mutate: swrMutate } = useSWR<CoachStudentsData>(
    "/api/coach/students",
    fetcher,
    SWR_OPTIONS
  )

  return {
    data,
    error,
    isLoading,
    isValidating,
    mutate: swrMutate,
    // 便利なアクセサ
    students: data?.students?.students || [],
    studentsError: data?.students?.error || null,
    // ユーティリティ: データが古いかどうか（5分以上経過）
    isStale: data ? Date.now() - data.fetchedAt > 5 * 60 * 1000 : true,
  }
}

/**
 * 生徒一覧データを手動で再取得
 */
export function revalidateCoachStudents() {
  return mutate("/api/coach/students")
}
