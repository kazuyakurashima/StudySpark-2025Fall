import useSWR, { mutate } from "swr"

/**
 * フィルター型定義
 */
export interface StudyLogsFilters {
  grade: "5" | "6" | "all"
  subject: string
  encouragementType: "coach" | "parent" | "none" | "all"
  sortOrder: "asc" | "desc"
}

/**
 * 学習ログデータの型定義
 */
export interface StudyLogData {
  type: "logs"
  logs: any[]
  error?: string
  fetchedAt: number
}

/**
 * 未入力生徒データの型定義
 */
export interface InactiveStudentsData {
  type: "inactive"
  students: any[]
  error?: string
  fetchedAt: number
}

/**
 * API fetcher関数
 */
const fetcher = async <T>(url: string): Promise<T> => {
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
 * フィルターからURLクエリパラメータを生成
 */
function buildStudyLogsUrl(filters: StudyLogsFilters): string {
  const params = new URLSearchParams({
    type: "logs",
    grade: filters.grade,
    subject: filters.subject,
    encouragementType: filters.encouragementType,
    sortOrder: filters.sortOrder,
  })
  return `/api/coach/encouragement?${params.toString()}`
}

/**
 * 未入力生徒用URLを生成
 */
function buildInactiveUrl(threshold: number): string {
  const params = new URLSearchParams({
    type: "inactive",
    threshold: String(threshold),
  })
  return `/api/coach/encouragement?${params.toString()}`
}

/**
 * 指導者用学習ログSWRフック
 * フィルター条件ごとにキャッシュを分ける
 *
 * @param filters - 学習ログのフィルター条件
 */
export function useCoachStudyLogs(filters: StudyLogsFilters) {
  const url = buildStudyLogsUrl(filters)

  const { data, error, isLoading, isValidating, mutate: swrMutate } = useSWR<StudyLogData>(
    url,
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
    studyLogs: data?.logs || [],
    studyLogsError: data?.error || null,
    // ユーティリティ: データが古いかどうか（5分以上経過）
    isStale: data ? Date.now() - data.fetchedAt > 5 * 60 * 1000 : true,
  }
}

/**
 * 指導者用未入力生徒SWRフック
 * しきい値ごとにキャッシュを分ける
 *
 * @param threshold - 未入力日数のしきい値
 */
export function useCoachInactiveStudents(threshold: 3 | 5 | 7) {
  const url = buildInactiveUrl(threshold)

  const { data, error, isLoading, isValidating, mutate: swrMutate } = useSWR<InactiveStudentsData>(
    url,
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
    inactiveStudents: data?.students || [],
    inactiveError: data?.error || null,
    // ユーティリティ: データが古いかどうか（5分以上経過）
    isStale: data ? Date.now() - data.fetchedAt > 5 * 60 * 1000 : true,
  }
}

/**
 * 学習ログデータを手動で再取得（特定フィルター条件）
 */
export function revalidateCoachStudyLogs(filters: StudyLogsFilters) {
  return mutate(buildStudyLogsUrl(filters))
}

/**
 * 未入力生徒データを手動で再取得（特定しきい値）
 */
export function revalidateCoachInactiveStudents(threshold: 3 | 5 | 7) {
  return mutate(buildInactiveUrl(threshold))
}

/**
 * 応援関連の全キャッシュを再取得
 */
export function revalidateAllCoachEncouragement() {
  // 正規表現でマッチするキーを再取得
  return mutate(
    (key) => typeof key === "string" && key.startsWith("/api/coach/encouragement"),
    undefined,
    { revalidate: true }
  )
}
