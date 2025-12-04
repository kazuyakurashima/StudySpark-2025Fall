import useSWR, { mutate } from "swr"

/**
 * 生徒ダッシュボードのデータ型定義
 */
export interface StudentDashboardData {
  profile: {
    nickname: string
    avatarId: string
    themeColor: string
    error?: string
  }
  aiCoachMessage: {
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
    /** 累積学習日数（Phase 1: モチベーション機能） */
    totalDays?: number
    error?: string
  }
  recentLogs: {
    logs: any[]
    batchFeedbacks?: Record<string, string>
    legacyFeedbacks?: Record<number, string>
    error?: string
  }
  recentMessages: {
    messages: any[]
    error?: string
  }
  lastLoginInfo: {
    lastLoginDays: number | null
    lastLoginHours: number
    isFirstTime: boolean
  } | null
  todayProgress: {
    todayProgress: any[]
    error?: string
  }
  yesterdayProgress: {
    yesterdayProgress: any[]
    error?: string
  }
  calendar: {
    calendarData: any
    error?: string
  }
  weeklyProgress: {
    progress: any[]
    sessionNumber: number | null
    error?: string
  }
  reflection: {
    completed: boolean
    error?: string
  }
  liveUpdates: {
    updates: any[]
    lastUpdateTime: string | null
    hasUpdates: boolean
    error?: string
  }
  fetchedAt: number
}

/**
 * API fetcher関数
 */
const fetcher = async (url: string): Promise<StudentDashboardData> => {
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
 * 生徒ダッシュボード用SWRフック
 *
 * @param fallbackData - SSRで取得した初期データ
 */
export function useStudentDashboard(fallbackData?: Partial<StudentDashboardData>) {
  const { data, error, isLoading, isValidating, mutate: swrMutate } = useSWR<StudentDashboardData>(
    "/api/student/dashboard",
    fetcher,
    {
      ...SWR_OPTIONS,
      // SSRの初期データをfallbackとして使用
      fallbackData: fallbackData
        ? {
            profile: { nickname: "学習者", avatarId: "student1", themeColor: "default" },
            aiCoachMessage: { message: "", createdAt: null },
            streak: { streak: 0, maxStreak: 0, lastStudyDate: null, todayStudied: false, state: "reset" as const, totalDays: 0 },
            recentLogs: { logs: [], batchFeedbacks: {}, legacyFeedbacks: {} },
            recentMessages: { messages: [] },
            lastLoginInfo: null,
            todayProgress: { todayProgress: [] },
            yesterdayProgress: { yesterdayProgress: [] },
            calendar: { calendarData: {} },
            weeklyProgress: { progress: [], sessionNumber: null },
            reflection: { completed: false },
            liveUpdates: { updates: [], lastUpdateTime: null, hasUpdates: false },
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
  }
}

/**
 * 生徒ダッシュボードデータをプリフェッチ
 * ページ遷移前にデータを事前取得してキャッシュに登録
 */
export function prefetchStudentDashboard() {
  const key = "/api/student/dashboard"

  // fetch してから mutate でキャッシュに登録
  return fetch(key)
    .then((res) => res.json())
    .then((data: StudentDashboardData) => {
      // SWR キャッシュにデータを登録（revalidate: false で再取得しない）
      mutate(key, data, { revalidate: false })
      console.log("🚀 [Prefetch] Student dashboard cache populated")
      return data
    })
    .catch((err) => {
      console.error("Prefetch failed:", err)
      return null
    })
}
