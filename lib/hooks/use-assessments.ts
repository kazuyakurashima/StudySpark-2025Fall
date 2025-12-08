import useSWR, { mutate } from "swr"
import type {
  AssessmentType,
  AssessmentGrade,
  AssessmentMaster,
  AssessmentDisplayData,
  ClassAssessment,
} from "@/lib/types/class-assessment"

// =============================================================================
// 型定義
// =============================================================================

interface StudentAssessmentsResponse {
  assessments: AssessmentDisplayData[]
  fetchedAt: number
}

interface MastersResponse {
  masters: AssessmentMaster[]
  fetchedAt: number
}

interface CoachAssessmentsResponse {
  students: Array<{
    student_id: number
    student_name: string
    nickname: string | null
    avatar_id: string | null
    assessments: ClassAssessment[]
  }>
  fetchedAt: number
}

// =============================================================================
// Fetcher
// =============================================================================

const fetcher = async <T>(url: string): Promise<T> => {
  const res = await fetch(url)

  const contentType = res.headers.get("content-type")
  if (!contentType || !contentType.includes("application/json")) {
    console.error("[useAssessments] Non-JSON response:", {
      url,
      status: res.status,
      contentType,
    })
    throw new Error(`APIエラー: ${res.status} ${res.statusText}`)
  }

  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || "データの取得に失敗しました")
  }
  return res.json()
}

// =============================================================================
// 生徒のテスト結果フック
// =============================================================================

interface UseStudentAssessmentsOptions {
  type?: AssessmentType
  limit?: number
  includeResubmissions?: boolean
}

/**
 * 生徒のテスト結果を取得するSWRフック
 */
export function useStudentAssessments(
  studentId: number | null,
  options?: UseStudentAssessmentsOptions
) {
  const params = new URLSearchParams()
  if (options?.type) params.set("type", options.type)
  if (options?.limit) params.set("limit", String(options.limit))
  if (options?.includeResubmissions)
    params.set("includeResubmissions", "true")

  const queryString = params.toString()
  const url = studentId
    ? `/api/assessments/student/${studentId}${queryString ? `?${queryString}` : ""}`
    : null

  const { data, error, isLoading, isValidating } =
    useSWR<StudentAssessmentsResponse>(url, fetcher, {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    })

  return {
    assessments: data?.assessments ?? [],
    isLoading,
    isValidating,
    error: error?.message,
    fetchedAt: data?.fetchedAt,
  }
}

/**
 * 生徒のテスト結果を再取得
 */
export function revalidateStudentAssessments(studentId: number) {
  return mutate((key) => typeof key === "string" && key.startsWith(`/api/assessments/student/${studentId}`))
}

// =============================================================================
// マスタデータフック
// =============================================================================

interface UseMastersOptions {
  grade?: AssessmentGrade
  type?: AssessmentType
}

/**
 * テストマスタ一覧を取得するSWRフック
 */
export function useAssessmentMasters(options?: UseMastersOptions) {
  const params = new URLSearchParams()
  if (options?.grade) params.set("grade", options.grade)
  if (options?.type) params.set("type", options.type)

  const queryString = params.toString()
  const url = `/api/assessments/masters${queryString ? `?${queryString}` : ""}`

  const { data, error, isLoading, isValidating } = useSWR<MastersResponse>(
    url,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // マスタデータは1分間キャッシュ
    }
  )

  return {
    masters: data?.masters ?? [],
    isLoading,
    isValidating,
    error: error?.message,
    fetchedAt: data?.fetchedAt,
  }
}

/**
 * マスタデータを再取得
 */
export function revalidateAssessmentMasters() {
  return mutate((key) => typeof key === "string" && key.startsWith("/api/assessments/masters"))
}

// =============================================================================
// 指導者用フック
// =============================================================================

interface UseCoachAssessmentsOptions {
  grade?: AssessmentGrade
  type?: AssessmentType
  masterId?: string
}

/**
 * 指導者の担当生徒のテスト結果を取得するSWRフック
 */
export function useCoachAssessments(options?: UseCoachAssessmentsOptions) {
  const params = new URLSearchParams()
  if (options?.grade) params.set("grade", options.grade)
  if (options?.type) params.set("type", options.type)
  if (options?.masterId) params.set("masterId", options.masterId)

  const queryString = params.toString()
  const url = `/api/assessments/coach${queryString ? `?${queryString}` : ""}`

  const { data, error, isLoading, isValidating } =
    useSWR<CoachAssessmentsResponse>(url, fetcher, {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    })

  return {
    students: data?.students ?? [],
    isLoading,
    isValidating,
    error: error?.message,
    fetchedAt: data?.fetchedAt,
  }
}

/**
 * 指導者のテスト結果を再取得
 */
export function revalidateCoachAssessments() {
  return mutate((key) => typeof key === "string" && key.startsWith("/api/assessments/coach"))
}

// =============================================================================
// ユーティリティ
// =============================================================================

/**
 * すべてのテスト結果キャッシュを無効化
 */
export function invalidateAllAssessments() {
  return mutate((key) => typeof key === "string" && key.startsWith("/api/assessments"))
}
