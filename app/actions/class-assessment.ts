"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import type {
  AssessmentType,
  AssessmentStatus,
  AssessmentGrade,
  ClassAssessment,
  AssessmentMaster,
  AssessmentDisplayData,
  BatchAssessmentInput,
  BatchAssessmentResult,
} from "@/lib/types/class-assessment"

// =============================================================================
// 型定義（Server Actions用）
// =============================================================================

export type CreateAssessmentInput = {
  student_id: number
  master_id: string
  status: AssessmentStatus
  score: number | null
  assessment_date: string // YYYY-MM-DD
  is_resubmission?: boolean
}

export type UpdateAssessmentInput = {
  id: string
  status?: AssessmentStatus
  score?: number | null
  assessment_date?: string
}

export type AssessmentResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }

// =============================================================================
// マスタデータ取得
// =============================================================================

/**
 * マスタデータ一覧を取得
 */
export async function getAssessmentMasters(
  grade?: AssessmentGrade,
  type?: AssessmentType
): Promise<AssessmentResult<AssessmentMaster[]>> {
  try {
    const supabase = await createClient()

    let query = supabase
      .from("assessment_masters")
      .select("*")
      .order("session_number", { ascending: true })
      .order("attempt_number", { ascending: true })

    if (grade) {
      query = query.eq("grade", grade)
    }
    if (type) {
      query = query.eq("assessment_type", type)
    }

    const { data, error } = await query

    if (error) {
      console.error("[getAssessmentMasters] Error:", error)
      return { success: false, error: "マスタデータの取得に失敗しました" }
    }

    return { success: true, data: data || [] }
  } catch (error) {
    console.error("[getAssessmentMasters] Unexpected error:", error)
    return { success: false, error: "予期しないエラーが発生しました" }
  }
}

/**
 * 特定のマスタデータを取得
 */
export async function getAssessmentMaster(
  masterId: string
): Promise<AssessmentResult<AssessmentMaster>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("assessment_masters")
      .select("*")
      .eq("id", masterId)
      .single()

    if (error || !data) {
      return { success: false, error: "マスタデータが見つかりません" }
    }

    return { success: true, data }
  } catch (error) {
    console.error("[getAssessmentMaster] Unexpected error:", error)
    return { success: false, error: "予期しないエラーが発生しました" }
  }
}

// =============================================================================
// テスト結果 CRUD
// =============================================================================

/**
 * テスト結果を作成（指導者用）
 */
export async function createAssessment(
  input: CreateAssessmentInput
): Promise<AssessmentResult<ClassAssessment>> {
  try {
    const supabase = await createClient()

    // 認証チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: "認証エラー: ログインしてください" }
    }

    // ロールチェック（指導者または管理者）
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (!profile || !["coach", "admin"].includes(profile.role)) {
      return { success: false, error: "権限がありません" }
    }

    // 担当生徒チェック（指導者の場合）
    if (profile.role === "coach") {
      const { data: coach } = await supabase
        .from("coaches")
        .select("id")
        .eq("user_id", user.id)
        .single()

      if (!coach) {
        return { success: false, error: "指導者情報が見つかりません" }
      }

      const { data: relation } = await supabase
        .from("coach_student_relations")
        .select("id")
        .eq("coach_id", coach.id)
        .eq("student_id", input.student_id)
        .single()

      if (!relation) {
        return { success: false, error: "担当外の生徒です" }
      }
    }

    // 重複チェック
    const { data: existing } = await supabase
      .from("class_assessments")
      .select("id")
      .eq("student_id", input.student_id)
      .eq("master_id", input.master_id)
      .eq("is_resubmission", input.is_resubmission ?? false)
      .single()

    if (existing) {
      return {
        success: false,
        error: input.is_resubmission
          ? "この生徒の再提出は既に登録されています"
          : "この生徒のテスト結果は既に登録されています",
      }
    }

    // 作成（max_score_at_submission, grade_at_submission はトリガーで自動設定）
    const { data, error } = await supabase
      .from("class_assessments")
      .insert({
        student_id: input.student_id,
        master_id: input.master_id,
        status: input.status,
        score: input.score,
        assessment_date: input.assessment_date,
        is_resubmission: input.is_resubmission ?? false,
        grader_id: user.id,
        // max_score_at_submission, grade_at_submission はトリガーで自動設定
        max_score_at_submission: 0, // ダミー値（トリガーで上書きされる）
        grade_at_submission: "5年", // ダミー値（トリガーで上書きされる）
      })
      .select()
      .single()

    if (error) {
      console.error("[createAssessment] Insert error:", error)
      if (error.message.includes("Score")) {
        return { success: false, error: "得点が満点を超えています" }
      }
      if (error.message.includes("Master not found")) {
        return { success: false, error: "テストマスタが見つかりません" }
      }
      return { success: false, error: "テスト結果の登録に失敗しました" }
    }

    revalidatePath("/coach")
    revalidatePath("/student")
    revalidatePath("/parent")

    return { success: true, data }
  } catch (error) {
    console.error("[createAssessment] Unexpected error:", error)
    return { success: false, error: "予期しないエラーが発生しました" }
  }
}

/**
 * テスト結果を更新（指導者用）
 */
export async function updateAssessment(
  input: UpdateAssessmentInput
): Promise<AssessmentResult<ClassAssessment>> {
  try {
    const supabase = await createClient()

    // 認証チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: "認証エラー: ログインしてください" }
    }

    // 既存レコード取得
    const { data: existing, error: fetchError } = await supabase
      .from("class_assessments")
      .select("*")
      .eq("id", input.id)
      .single()

    if (fetchError || !existing) {
      return { success: false, error: "テスト結果が見つかりません" }
    }

    // 更新データ構築
    const updateData: Partial<ClassAssessment> = {}
    if (input.status !== undefined) updateData.status = input.status
    if (input.score !== undefined) updateData.score = input.score
    if (input.assessment_date !== undefined)
      updateData.assessment_date = input.assessment_date

    const { data, error } = await supabase
      .from("class_assessments")
      .update(updateData)
      .eq("id", input.id)
      .select()
      .single()

    if (error) {
      console.error("[updateAssessment] Update error:", error)
      if (error.message.includes("Score")) {
        return { success: false, error: "得点が満点を超えています" }
      }
      return { success: false, error: "テスト結果の更新に失敗しました" }
    }

    revalidatePath("/coach")
    revalidatePath("/student")
    revalidatePath("/parent")

    return { success: true, data }
  } catch (error) {
    console.error("[updateAssessment] Unexpected error:", error)
    return { success: false, error: "予期しないエラーが発生しました" }
  }
}

/**
 * バッチ入力（複数生徒のテスト結果を一括登録）
 */
export async function batchCreateAssessments(
  inputs: BatchAssessmentInput[]
): Promise<BatchAssessmentResult> {
  const result: BatchAssessmentResult = {
    success: true,
    inserted: 0,
    updated: 0,
    errors: [],
  }

  try {
    const supabase = await createClient()

    // 認証チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return {
        success: false,
        inserted: 0,
        updated: 0,
        errors: [{ student_id: 0, master_id: "", error: "認証エラー" }],
      }
    }

    // ロールチェック
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (!profile || !["coach", "admin"].includes(profile.role)) {
      return {
        success: false,
        inserted: 0,
        updated: 0,
        errors: [{ student_id: 0, master_id: "", error: "権限がありません" }],
      }
    }

    // 各入力を処理
    for (const input of inputs) {
      try {
        // 既存レコードチェック
        const { data: existing } = await supabase
          .from("class_assessments")
          .select("id")
          .eq("student_id", input.student_id)
          .eq("master_id", input.master_id)
          .eq("is_resubmission", input.is_resubmission)
          .single()

        if (existing) {
          // 更新
          const { error: updateError } = await supabase
            .from("class_assessments")
            .update({
              status: input.status,
              score: input.score,
              assessment_date: input.assessment_date,
            })
            .eq("id", existing.id)

          if (updateError) {
            result.errors.push({
              student_id: input.student_id,
              master_id: input.master_id,
              error: updateError.message,
            })
          } else {
            result.updated++
          }
        } else {
          // 新規作成
          const { error: insertError } = await supabase
            .from("class_assessments")
            .insert({
              student_id: input.student_id,
              master_id: input.master_id,
              status: input.status,
              score: input.score,
              assessment_date: input.assessment_date,
              is_resubmission: input.is_resubmission,
              grader_id: user.id,
              max_score_at_submission: 0, // トリガーで上書き
              grade_at_submission: "5年", // トリガーで上書き
            })

          if (insertError) {
            result.errors.push({
              student_id: input.student_id,
              master_id: input.master_id,
              error: insertError.message,
            })
          } else {
            result.inserted++
          }
        }
      } catch (err) {
        result.errors.push({
          student_id: input.student_id,
          master_id: input.master_id,
          error: String(err),
        })
      }
    }

    result.success = result.errors.length === 0

    revalidatePath("/coach")
    revalidatePath("/student")
    revalidatePath("/parent")

    return result
  } catch (error) {
    console.error("[batchCreateAssessments] Unexpected error:", error)
    return {
      success: false,
      inserted: 0,
      updated: 0,
      errors: [{ student_id: 0, master_id: "", error: "予期しないエラー" }],
    }
  }
}

// =============================================================================
// テスト結果取得
// =============================================================================

/**
 * 生徒のテスト結果一覧を取得（生徒・保護者・指導者用）
 */
export async function getStudentAssessments(
  studentId: number,
  options?: {
    type?: AssessmentType
    limit?: number
    includeResubmissions?: boolean
  }
): Promise<AssessmentResult<AssessmentDisplayData[]>> {
  try {
    const supabase = await createClient()

    // 認証チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: "認証エラー" }
    }

    let query = supabase
      .from("class_assessments")
      .select(
        `
        *,
        master:assessment_masters (*)
      `
      )
      .eq("student_id", studentId)
      .order("assessment_date", { ascending: false })

    if (options?.type) {
      query = query.eq("master.assessment_type", options.type)
    }
    if (!options?.includeResubmissions) {
      query = query.eq("is_resubmission", false)
    }
    if (options?.limit) {
      query = query.limit(options.limit)
    }

    const { data, error } = await query

    if (error) {
      console.error("[getStudentAssessments] Error:", error)
      return { success: false, error: "テスト結果の取得に失敗しました" }
    }

    // DisplayData形式に変換
    const displayData: AssessmentDisplayData[] = await Promise.all(
      (data || []).map(async (item) => {
        const master = item.master as AssessmentMaster
        const percentage =
          item.status === "completed" && item.score !== null
            ? Math.round((item.score / item.max_score_at_submission) * 100)
            : null

        // 前回比を計算
        const previous = await getPreviousComparison(
          studentId,
          master.assessment_type,
          master.attempt_number,
          item.assessment_date
        )

        // クラス平均を計算
        const classAvg = await getClassAverage(item.master_id)

        return {
          id: item.id,
          student_id: item.student_id,
          status: item.status,
          assessment_type: master.assessment_type,
          session_number: master.session_number,
          attempt_number: master.attempt_number,
          assessment_date: item.assessment_date,
          is_resubmission: item.is_resubmission,
          score: item.score,
          max_score: item.max_score_at_submission,
          percentage,
          previous_score: previous?.score,
          previous_percentage: previous?.percentage,
          change: previous && item.score !== null ? item.score - previous.score : undefined,
          change_label: previous
            ? `前回比(${master.assessment_type === "math_print" ? "算数プリント" : "漢字テスト"}${master.attempt_number}回目)`
            : undefined,
          class_average: classAvg?.average,
          class_average_percentage: classAvg?.percentage,
          class_average_count: classAvg?.count,
        }
      })
    )

    return { success: true, data: displayData }
  } catch (error) {
    console.error("[getStudentAssessments] Unexpected error:", error)
    return { success: false, error: "予期しないエラーが発生しました" }
  }
}

/**
 * 特定のテスト結果を取得
 */
export async function getAssessment(
  assessmentId: string
): Promise<AssessmentResult<ClassAssessment & { master: AssessmentMaster }>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("class_assessments")
      .select(
        `
        *,
        master:assessment_masters (*)
      `
      )
      .eq("id", assessmentId)
      .single()

    if (error || !data) {
      return { success: false, error: "テスト結果が見つかりません" }
    }

    return { success: true, data: data as ClassAssessment & { master: AssessmentMaster } }
  } catch (error) {
    console.error("[getAssessment] Unexpected error:", error)
    return { success: false, error: "予期しないエラーが発生しました" }
  }
}

// =============================================================================
// 計算ヘルパー
// =============================================================================

/**
 * 前回比を計算（同テスト種別 × 同attempt_number の直近と比較）
 */
async function getPreviousComparison(
  studentId: number,
  assessmentType: AssessmentType,
  attemptNumber: number,
  currentDate: string
): Promise<{ score: number; percentage: number } | null> {
  try {
    const supabase = await createClient()

    const { data } = await supabase
      .from("class_assessments")
      .select(
        `
        score,
        max_score_at_submission,
        master:assessment_masters!inner (
          assessment_type,
          attempt_number
        )
      `
      )
      .eq("student_id", studentId)
      .eq("status", "completed")
      .eq("is_resubmission", false)
      .lt("assessment_date", currentDate)
      .order("assessment_date", { ascending: false })
      .limit(10)

    if (!data || data.length === 0) return null

    // 同じテスト種別・回数のものを探す
    const previous = data.find((item) => {
      // Supabaseの!innerジョインでは配列ではなくオブジェクトが返る
      const master = item.master as unknown as { assessment_type: string; attempt_number: number }
      return (
        master.assessment_type === assessmentType &&
        master.attempt_number === attemptNumber
      )
    })

    if (!previous || previous.score === null) return null

    return {
      score: previous.score,
      percentage: Math.round(
        (previous.score / previous.max_score_at_submission) * 100
      ),
    }
  } catch (error) {
    console.error("[getPreviousComparison] Error:", error)
    return null
  }
}

/**
 * クラス平均を計算（同マスタ × 通常提出 × status='completed'）
 */
async function getClassAverage(
  masterId: string
): Promise<{ average: number; percentage: number; count: number } | null> {
  try {
    const supabase = await createClient()

    const { data } = await supabase
      .from("class_assessments")
      .select("score, max_score_at_submission")
      .eq("master_id", masterId)
      .eq("status", "completed")
      .eq("is_resubmission", false)

    if (!data || data.length === 0) return null

    const totalScore = data.reduce((sum, a) => sum + (a.score ?? 0), 0)
    const totalMaxScore = data.reduce(
      (sum, a) => sum + a.max_score_at_submission,
      0
    )

    return {
      average: Math.round(totalScore / data.length),
      percentage: Math.round((totalScore / totalMaxScore) * 100),
      count: data.length,
    }
  } catch (error) {
    console.error("[getClassAverage] Error:", error)
    return null
  }
}

// =============================================================================
// 指導者用: 担当生徒のテスト結果一覧
// =============================================================================

/**
 * 指導者の担当生徒全員のテスト結果を取得
 */
export async function getCoachAssessments(options?: {
  masterId?: string
  grade?: AssessmentGrade
  type?: AssessmentType
}): Promise<
  AssessmentResult<
    Array<{
      student_id: number
      student_name: string
      nickname: string | null
      avatar_id: string | null
      assessments: ClassAssessment[]
    }>
  >
> {
  try {
    const supabase = await createClient()

    // 認証チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: "認証エラー" }
    }

    // 指導者情報取得
    const { data: coach } = await supabase
      .from("coaches")
      .select("id")
      .eq("user_id", user.id)
      .single()

    if (!coach) {
      return { success: false, error: "指導者情報が見つかりません" }
    }

    // 担当生徒一覧取得
    const { data: relations } = await supabase
      .from("coach_student_relations")
      .select(
        `
        student:students (
          id,
          full_name,
          grade,
          profiles (
            nickname,
            avatar_id
          )
        )
      `
      )
      .eq("coach_id", coach.id)

    if (!relations || relations.length === 0) {
      return { success: true, data: [] }
    }

    // 生徒ごとのテスト結果を取得
    const results = await Promise.all(
      relations.map(async (rel) => {
        // Supabaseのネストされた選択では配列ではなくオブジェクトが返る
        const student = rel.student as unknown as {
          id: number
          full_name: string
          grade: number
          profiles: { nickname: string | null; avatar_id: string | null }
        }

        // 学年フィルター
        if (options?.grade) {
          const gradeStr = student.grade === 5 ? "5年" : "6年"
          if (gradeStr !== options.grade) return null
        }

        let query = supabase
          .from("class_assessments")
          .select(
            `
            *,
            master:assessment_masters (*)
          `
          )
          .eq("student_id", student.id)
          .eq("is_resubmission", false)
          .order("assessment_date", { ascending: false })

        if (options?.masterId) {
          query = query.eq("master_id", options.masterId)
        }
        if (options?.type) {
          // TypeScriptの型エラーを回避するため、結果をフィルタリング
        }

        const { data: assessments } = await query

        // テスト種別でフィルタリング
        let filteredAssessments = assessments || []
        if (options?.type) {
          filteredAssessments = filteredAssessments.filter((a) => {
            const master = a.master as AssessmentMaster
            return master.assessment_type === options.type
          })
        }

        return {
          student_id: student.id,
          student_name: student.full_name,
          nickname: student.profiles?.nickname || null,
          avatar_id: student.profiles?.avatar_id || null,
          assessments: filteredAssessments as ClassAssessment[],
        }
      })
    )

    // nullを除外
    const validResults = results.filter((r) => r !== null)

    return { success: true, data: validResults }
  } catch (error) {
    console.error("[getCoachAssessments] Unexpected error:", error)
    return { success: false, error: "予期しないエラーが発生しました" }
  }
}
