import useSWR, { mutate } from "swr"
import type { LearningRecordWithEncouragements, InactiveStudentData } from "@/app/actions/coach"

/**
 * 指導者ダッシュボードのデータ型定義
 */
export interface CoachDashboardData {
  records: {
    records: LearningRecordWithEncouragements[]
    error?: string
  }
  inactiveStudents: {
    students: InactiveStudentData[]
    error?: string
  }
  fetchedAt: number
}

/**
 * API fetcher関数
 */
const fetcher = async (url: string): Promise<CoachDashboardData> => {
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
  // マウント時に再取得しない（fallbackDataがある場合）
  revalidateOnMount: false,
}

/**
 * 指導者ダッシュボード用SWRフック
 *
 * @param fallbackData - SSRで取得した初期データ
 */
export function useCoachDashboard(fallbackData?: Partial<CoachDashboardData>) {
  const { data, error, isLoading, isValidating, mutate: swrMutate } = useSWR<CoachDashboardData>(
    "/api/coach/dashboard",
    fetcher,
    {
      ...SWR_OPTIONS,
      // SSRの初期データをfallbackとして使用
      fallbackData: fallbackData
        ? {
            records: { records: [] },
            inactiveStudents: { students: [] },
            fetchedAt: Date.now(),
            ...fallbackData,
          }
        : undefined,
      // fallbackDataがある場合、マウント時の再取得を抑制
      revalidateOnMount: !fallbackData,
    }
  )

  return {
    data,
    error,
    isLoading,
    isValidating,
    mutate: swrMutate,
    // ユーティリティ: データが古いかどうか（5分以上経過）
    isStale: data ? Date.now() - data.fetchedAt > 5 * 60 * 1000 : true,
    // 便利なアクセサ
    records: data?.records?.records || [],
    inactiveStudents: data?.inactiveStudents?.students || [],
  }
}

/**
 * 指導者ダッシュボードデータをプリフェッチ
 * ページ遷移前にデータを事前取得してキャッシュに登録
 */
export function prefetchCoachDashboard() {
  const key = "/api/coach/dashboard"

  // fetch してから mutate でキャッシュに登録
  return fetch(key)
    .then((res) => res.json())
    .then((data: CoachDashboardData) => {
      // SWR キャッシュにデータを登録（revalidate: false で再取得しない）
      mutate(key, data, { revalidate: false })
      console.log("[Prefetch] Coach dashboard cache populated")
      return data
    })
    .catch((err) => {
      console.error("Prefetch failed:", err)
      return null
    })
}

/**
 * 指導者ダッシュボードデータを手動で再取得
 */
export function revalidateCoachDashboard() {
  return mutate("/api/coach/dashboard")
}
