import useSWR from "swr"

/**
 * 保護者ダッシュボードのデータ型定義
 */
export interface ParentDashboardData {
  childId: number
  todayStatus: {
    message: string
    createdAt: string | null
    error?: string
  }
  streak: {
    streak: number
    maxStreak: number
    lastStudyDate: string | null
    todayStudied: boolean
    state: "active" | "grace" | "warning" | "reset"
    error?: string
  }
  todayProgress: {
    todayProgress: Array<{
      subject: string
      accuracy: number
      correctCount: number
      totalProblems: number
      logs: any[]
    }>
    error?: string
  }
  weeklyProgress: {
    progress: any[]
    sessionNumber: number | null
    error?: string
  }
  calendar: {
    calendarData: any
    error?: string
  }
  recentLogs: {
    logs: any[]
    error?: string
  }
  recentMessages: {
    messages: any[]
    error?: string
  }
  reflection: {
    completed: boolean
    error?: string
  }
  fetchedAt: number
}

/**
 * API fetcher関数
 */
const fetcher = async (url: string): Promise<ParentDashboardData> => {
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
 * 保護者ダッシュボード用SWRフック
 *
 * @param childId - 子どものID（nullの場合はフェッチしない）
 * @param fallbackData - SSRで取得した初期データ
 */
export function useParentDashboard(
  childId: number | null,
  fallbackData?: Partial<ParentDashboardData>
) {
  const { data, error, isLoading, isValidating, mutate } = useSWR<ParentDashboardData>(
    // キーは子どもIDが存在する場合のみ設定（nullの場合はフェッチしない）
    childId ? `/api/parent/dashboard?childId=${childId}` : null,
    fetcher,
    {
      ...SWR_OPTIONS,
      // SSRの初期データをfallbackとして使用
      fallbackData: fallbackData ? {
        childId: childId!,
        todayStatus: { message: "", createdAt: null },
        streak: { streak: 0, maxStreak: 0, lastStudyDate: null, todayStudied: false, state: "reset" as const },
        todayProgress: { todayProgress: [] },
        weeklyProgress: { progress: [], sessionNumber: null },
        calendar: { calendarData: {} },
        recentLogs: { logs: [] },
        recentMessages: { messages: [] },
        reflection: { completed: false },
        fetchedAt: Date.now(),
        ...fallbackData,
      } : undefined,
      // fallbackDataがある場合、マウント時の再取得を抑制
      revalidateOnMount: !fallbackData,
    }
  )

  return {
    data,
    error,
    isLoading,
    isValidating,
    mutate,
    // ユーティリティ: データが古いかどうか（5分以上経過）
    isStale: data ? Date.now() - data.fetchedAt > 5 * 60 * 1000 : true,
  }
}

/**
 * 複数の子どものダッシュボードデータをプリフェッチ
 * 子ども切り替え時の待ち時間を削減
 */
export function prefetchChildDashboard(childId: number) {
  // SWRのキャッシュにデータを事前取得
  return fetch(`/api/parent/dashboard?childId=${childId}`)
    .then(res => res.json())
    .catch(err => console.error("Prefetch failed:", err))
}
