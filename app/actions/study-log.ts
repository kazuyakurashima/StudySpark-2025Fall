"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export type StudyLogInput = {
  session_id: number
  subject_id: number
  content_type_id: number
  correct_answers: number
  study_date?: string // YYYY-MM-DD format, defaults to today
  reflection_text?: string
}

/**
 * 学習ログを保存（新規作成または更新）
 */
export async function saveStudyLog(logs: StudyLogInput[]) {
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return { error: "認証エラー: ログインしてください" }
    }

    // Get student record
    const { data: student, error: studentError } = await supabase
      .from("students")
      .select("id")
      .eq("user_id", user.id)
      .single()

    if (studentError || !student) {
      return { error: "生徒情報が見つかりません" }
    }

    // Prepare study logs for insertion
    const studyDate = logs[0]?.study_date || new Date().toISOString().split("T")[0]

    // Check for existing logs for the same session/subject/content combinations
    const logsToUpdate: any[] = []
    const logsToInsert: any[] = []

    for (const log of logs) {
      const { data: existingLog } = await supabase
        .from("study_logs")
        .select("id, version")
        .eq("student_id", student.id)
        .eq("session_id", log.session_id)
        .eq("subject_id", log.subject_id)
        .eq("content_type_id", log.content_type_id)
        .eq("study_date", log.study_date || studyDate)
        .single()

      if (existingLog) {
        // Update existing log (楽観的ロック)
        logsToUpdate.push({
          id: existingLog.id,
          correct_answers: log.correct_answers,
          reflection_text: log.reflection_text,
          version: existingLog.version,
        })
      } else {
        // Insert new log
        logsToInsert.push({
          student_id: student.id,
          session_id: log.session_id,
          subject_id: log.subject_id,
          content_type_id: log.content_type_id,
          correct_answers: log.correct_answers,
          study_date: log.study_date || studyDate,
          reflection_text: log.reflection_text,
        })
      }
    }

    // Insert new logs
    if (logsToInsert.length > 0) {
      const { error: insertError } = await supabase.from("study_logs").insert(logsToInsert)

      if (insertError) {
        console.error("Insert error:", insertError)
        return { error: `学習記録の保存に失敗しました: ${insertError.message}` }
      }
    }

    // Update existing logs
    for (const log of logsToUpdate) {
      const { error: updateError } = await supabase
        .from("study_logs")
        .update({
          correct_answers: log.correct_answers,
          reflection_text: log.reflection_text,
          version: log.version + 1,
        })
        .eq("id", log.id)
        .eq("version", log.version) // 楽観的ロック

      if (updateError) {
        console.error("Update error:", updateError)
        return { error: `学習記録の更新に失敗しました: ${updateError.message}` }
      }
    }

    revalidatePath("/student")
    revalidatePath("/student/spark")

    return { success: true }
  } catch (error) {
    console.error("Save study log error:", error)
    return { error: "予期しないエラーが発生しました" }
  }
}

/**
 * 学習回・科目・学習内容の既存データを取得（再入力用）
 */
export async function getExistingStudyLog(sessionId: number, subjectId: number, studyDate?: string) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return { error: "認証エラー" }
    }

    const { data: student, error: studentError } = await supabase
      .from("students")
      .select("id")
      .eq("user_id", user.id)
      .single()

    if (studentError || !student) {
      return { error: "生徒情報が見つかりません" }
    }

    const queryStudyDate = studyDate || new Date().toISOString().split("T")[0]

    const { data: logs, error: logsError } = await supabase
      .from("study_logs")
      .select("content_type_id, correct_answers, reflection_text")
      .eq("student_id", student.id)
      .eq("session_id", sessionId)
      .eq("subject_id", subjectId)
      .eq("study_date", queryStudyDate)

    if (logsError) {
      return { error: "データの取得に失敗しました" }
    }

    return { logs: logs || [] }
  } catch (error) {
    console.error("Get existing study log error:", error)
    return { error: "予期しないエラーが発生しました" }
  }
}

/**
 * マスターデータ取得: 科目一覧
 */
export async function getSubjects() {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase.from("subjects").select("id, name, color_code").order("id")

    if (error) {
      return { error: "科目データの取得に失敗しました" }
    }

    return { subjects: data }
  } catch (error) {
    console.error("Get subjects error:", error)
    return { error: "予期しないエラーが発生しました" }
  }
}

/**
 * マスターデータ取得: 学習回一覧
 */
export async function getStudySessions(grade: number) {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("study_sessions")
      .select("id, session_number, grade, start_date, end_date")
      .eq("grade", grade)
      .order("session_number")

    if (error) {
      return { error: "学習回データの取得に失敗しました" }
    }

    return { sessions: data }
  } catch (error) {
    console.error("Get study sessions error:", error)
    return { error: "予期しないエラーが発生しました" }
  }
}

/**
 * マスターデータ取得: 学習内容タイプ一覧
 */
export async function getContentTypes(sessionId: number, subjectId: number) {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("study_content_types")
      .select("id, name, course_level, problem_count")
      .eq("session_id", sessionId)
      .eq("subject_id", subjectId)
      .order("id")

    if (error) {
      return { error: "学習内容データの取得に失敗しました" }
    }

    return { contentTypes: data }
  } catch (error) {
    console.error("Get content types error:", error)
    return { error: "予期しないエラーが発生しました" }
  }
}
