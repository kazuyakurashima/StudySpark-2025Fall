import useSWR, { mutate } from "swr"
import type { CoachAnalysisResult } from "@/app/actions/coach"

/**
 * API fetcher関数
 */
const fetcher = async (url: string): Promise<CoachAnalysisResult> => {
  const res = await fetch(url)
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || "データの取得に失敗しました")
  }
  return res.json()
}

/**
 * SWR設定オプション（5分キャッシュ）
 */
const SWR_OPTIONS = {
  // 5秒間は重複リクエストを排除
  dedupingInterval: 5000,
  // タブ復帰時に再取得
  revalidateOnFocus: true,
  // 5分間はフォーカス復帰時の再取得を抑制
  focusThrottleInterval: 300000,
  // ネットワーク復帰時に再取得
  revalidateOnReconnect: true,
  // エラー時の自動リトライ（3回まで）
  errorRetryCount: 3,
  // 初回レンダリング時にデータがない場合のみ再取得
  revalidateIfStale: true,
  // マウント時に再取得しない（fallbackDataがある場合）
  revalidateOnMount: false,
}

export type GradeFilter = "5" | "6" | "all"

/**
 * 分析ページ用SWRフック
 *
 * @param grade - 学年フィルタ（"5" | "6" | "all"）
 * @param fallbackData - SSRで取得した初期データ
 */
export function useCoachAnalysis(grade: GradeFilter = "all", fallbackData?: CoachAnalysisResult) {
  // キャッシュキーを学年ごとに分離
  const key = `/api/coach/analysis?grade=${grade}`

  const { data, error, isLoading, isValidating, mutate: swrMutate } = useSWR<CoachAnalysisResult>(
    key,
    fetcher,
    {
      ...SWR_OPTIONS,
      // SSRの初期データをfallbackとして使用
      fallbackData,
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
    isStale: data?.meta ? Date.now() - data.meta.fetchedAt > 5 * 60 * 1000 : true,
    // 便利なアクセサ
    subjectAverages: data?.subjectAverages || [],
    distribution: data?.distribution || [],
    studentTrends: data?.studentTrends || [],
    meta: data?.meta,
  }
}

/**
 * 分析データをプリフェッチ
 * ページ遷移前にデータを事前取得してキャッシュに登録
 */
export function prefetchCoachAnalysis(grade: GradeFilter = "all") {
  const key = `/api/coach/analysis?grade=${grade}`

  return fetch(key)
    .then((res) => res.json())
    .then((data: CoachAnalysisResult) => {
      mutate(key, data, { revalidate: false })
      return data
    })
    .catch((err) => {
      console.error("Prefetch analysis failed:", err)
      return null
    })
}

/**
 * 分析データを手動で再取得
 */
export function revalidateCoachAnalysis(grade: GradeFilter = "all") {
  return mutate(`/api/coach/analysis?grade=${grade}`)
}
