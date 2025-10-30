"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export type StudyLogInput = {
  session_id: number
  subject_id: number
  study_content_type_id: number
  correct_count: number
  total_problems: number
  study_date?: string // YYYY-MM-DD format, defaults to today
  reflection_text?: string
}

/**
 * 現在の学習回をデータベースから取得（JST基準）
 * @param grade 学年 (5 or 6)
 * @returns 現在の学習回の情報 (id, session_number, start_date, end_date)
 */
export async function getCurrentSession(grade: number) {
  try {
    const supabase = await createClient()

    // JSTで今日の日付を取得
    const now = new Date()
    const jstDate = new Date(
      now.toLocaleString("en-US", { timeZone: "Asia/Tokyo" })
    )
    const today = jstDate.toISOString().split("T")[0] // YYYY-MM-DD

    // データベースから現在の学習回を取得
    const { data: session, error } = await supabase
      .from("study_sessions")
      .select("id, session_number, start_date, end_date")
      .eq("grade", grade)
      .lte("start_date", today)
      .gte("end_date", today)
      .single()

    if (error) {
      console.error("Failed to get current session:", error)
      // エラー時は最新のセッションを返す
      const { data: fallbackSession } = await supabase
        .from("study_sessions")
        .select("id, session_number, start_date, end_date")
        .eq("grade", grade)
        .order("session_number", { ascending: false })
        .limit(1)
        .single()

      return fallbackSession
    }

    return session
  } catch (error) {
    console.error("Error in getCurrentSession:", error)
    return null
  }
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
      .select("id, grade")
      .eq("user_id", user.id)
      .single()

    if (studentError || !student) {
      return { error: "生徒情報が見つかりません" }
    }

    // 【セーフガード】各ログのsession_idが有効かチェック
    for (const log of logs) {
      const { data: session, error: sessionError } = await supabase
        .from("study_sessions")
        .select("id, session_number, start_date, end_date")
        .eq("id", log.session_id)
        .eq("grade", student.grade)
        .single()

      if (sessionError || !session) {
        console.error(`Invalid session_id: ${log.session_id} for grade ${student.grade}`)
        return {
          error: `学習回の選択が正しくありません（ID: ${log.session_id}）。ページを再読み込みして、もう一度お試しください。`
        }
      }

      // 警告ログ: study_dateがsession期間外の場合
      const studyDate = log.study_date || new Date().toISOString().split("T")[0]
      if (studyDate < session.start_date || studyDate > session.end_date) {
        console.warn(
          `Session date mismatch: study_date=${studyDate} is outside session ${session.session_number} period (${session.start_date} ~ ${session.end_date})`
        )
        // 警告のみで、保存は続行（過去データの修正などを許容）
      }
    }

    // Prepare study logs for insertion
    const studyDate = logs[0]?.study_date || new Date().toISOString().split("T")[0]
    const reflectionText = logs[0]?.reflection_text || null

    // Check for existing logs for the same session/subject/content combinations
    const logsToUpdate: any[] = []
    const logsToInsert: any[] = []

    for (const log of logs) {
      const logStudyDate = log.study_date || studyDate
      const logReflectionText = log.reflection_text || reflectionText

      // maybeSingle()を使用してエラーハンドリングを改善
      const { data: existingLog, error: checkError } = await supabase
        .from("study_logs")
        .select("id, version")
        .eq("student_id", student.id)
        .eq("session_id", log.session_id)
        .eq("subject_id", log.subject_id)
        .eq("study_content_type_id", log.study_content_type_id)
        .eq("study_date", logStudyDate)
        .maybeSingle()

      // checkErrorがある場合はデータベースエラー（ネットワークエラーなど）
      if (checkError) {
        console.error("Check existing log error:", checkError)
        return { error: `既存記録の確認に失敗しました: ${checkError.message}` }
      }

      if (existingLog) {
        // Update existing log (楽観的ロック)
        logsToUpdate.push({
          id: existingLog.id,
          correct_count: log.correct_count,
          total_problems: log.total_problems,
          study_date: logStudyDate,
          reflection_text: logReflectionText,
          version: existingLog.version,
        })
      } else {
        // Insert new log
        logsToInsert.push({
          student_id: student.id,
          session_id: log.session_id,
          subject_id: log.subject_id,
          study_content_type_id: log.study_content_type_id,
          correct_count: log.correct_count,
          total_problems: log.total_problems,
          study_date: logStudyDate,
          reflection_text: logReflectionText,
        })
      }
    }

    // デバッグログ
    console.log(`saveStudyLog: ${logsToInsert.length} records to insert, ${logsToUpdate.length} records to update`)

    // Insert new logs
    if (logsToInsert.length > 0) {
      const { error: insertError } = await supabase.from("study_logs").insert(logsToInsert)

      if (insertError) {
        console.error("Insert error:", insertError)
        return { error: `学習記録の保存に失敗しました: ${insertError.message}` }
      }
      console.log(`Successfully inserted ${logsToInsert.length} study logs`)
    }

    // Update existing logs
    if (logsToUpdate.length > 0) {
      for (const log of logsToUpdate) {
        const { error: updateError, data: updateData } = await supabase
          .from("study_logs")
          .update({
            correct_count: log.correct_count,
            total_problems: log.total_problems,
            study_date: log.study_date,
            reflection_text: log.reflection_text,
            version: log.version + 1,
            logged_at: new Date().toISOString(), // 更新日時を記録
          })
          .eq("id", log.id)
          .eq("version", log.version) // 楽観的ロック
          .select()

        if (updateError) {
          console.error("Update error:", updateError)
          return { error: `学習記録の更新に失敗しました: ${updateError.message}` }
        }

        // 楽観的ロックの競合チェック
        if (!updateData || updateData.length === 0) {
          console.error("Optimistic lock conflict: record was modified by another process")
          return { error: "記録が他の処理で更新されました。再度お試しください。" }
        }

        console.log(`Successfully updated study log id: ${log.id}`)
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

    // studyDateが指定されている場合はその日付のログを取得
    // 指定されていない場合は日付に関係なく最新のログを取得
    let query = supabase
      .from("study_logs")
      .select("study_content_type_id, correct_count, total_problems, reflection_text, study_date")
      .eq("student_id", student.id)
      .eq("session_id", sessionId)
      .eq("subject_id", subjectId)

    if (studyDate) {
      query = query.eq("study_date", studyDate)
    } else {
      // 日付指定がない場合は最新のログを取得
      query = query.order("study_date", { ascending: false }).order("logged_at", { ascending: false })
    }

    const { data: logs, error: logsError } = await query

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
 * マスターデータ取得: 学習内容タイプ一覧（問題数なし）
 * @param grade - 学年 (5 or 6)
 * @param subjectId - 科目ID
 * @param course - コースレベル ('A' | 'B' | 'C' | 'S')
 *
 * NOTE: sessionId は使用しません（problem_counts テーブルが未実装のため）
 * 将来的に問題数が学習回ごとに異なる場合は、problem_counts との JOIN が必要
 */
export async function getContentTypes(
  grade: number,
  subjectId: number,
  course: "A" | "B" | "C" | "S",
) {
  try {
    const supabase = await createClient()

    // study_content_types のみから取得（問題数は含まない）
    const { data, error } = await supabase
      .from("study_content_types")
      .select("id, content_name, course, display_order")
      .eq("grade", grade)
      .eq("subject_id", subjectId)
      .eq("course", course)
      .order("display_order")

    if (error) {
      console.error("Get content types error:", error)
      return { error: "学習内容データの取得に失敗しました" }
    }

    return { contentTypes: data || [] }
  } catch (error) {
    console.error("Get content types error:", error)
    return { error: "予期しないエラーが発生しました" }
  }
}

/**
 * 学習内容タイプIDを取得
 * @param grade - 学年 (5 or 6)
 * @param subjectId - 科目ID
 * @param course - コースレベル ('A' | 'B' | 'C' | 'S')
 * @param contentName - 学習内容名 (例: "類題", "基本問題")
 * @returns study_content_type_id
 */
export async function getContentTypeId(
  grade: number,
  subjectId: number,
  course: "A" | "B" | "C" | "S",
  contentName: string,
) {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("study_content_types")
      .select("id")
      .eq("grade", grade)
      .eq("subject_id", subjectId)
      .eq("course", course)
      .eq("content_name", contentName)
      .single()

    if (error) {
      console.error("Get content type ID error:", error)
      return { error: "学習内容タイプIDの取得に失敗しました" }
    }

    return { id: data.id }
  } catch (error) {
    console.error("Get content type ID error:", error)
    return { error: "予期しないエラーが発生しました" }
  }
}
