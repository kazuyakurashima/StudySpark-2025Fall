"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import crypto from "crypto"
import { checkAndRecordStreakResume, determineStreakState, type StreakState } from "@/lib/utils/streak-helpers"

export type StudyLogInput = {
  session_id: number
  subject_id: number
  study_content_type_id: number
  correct_count: number
  total_problems: number
  study_date?: string // YYYY-MM-DD format, defaults to today
  reflection_text?: string
}

export type SaveStudyLogResult =
  | {
      success: true
      studentId: number
      sessionId: number
      studyLogIds: number[]
      batchId: string
    }
  | {
      error: string
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
    const { getTodayJST } = await import("@/lib/utils/date-jst")
    const today = getTodayJST()

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
 * @returns 成功時は studentId, sessionId, studyLogIds を返す
 */
export async function saveStudyLog(logs: StudyLogInput[]): Promise<SaveStudyLogResult> {
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

    // Import date utility
    const { getTodayJST } = await import("@/lib/utils/date-jst")
    const todayJST = getTodayJST()

    // ========================================
    // streak_resume判定: 保存前にストリーク状態を取得
    // ========================================
    let previousStreakState: StreakState = "reset"
    try {
      // 最終学習日を取得
      const { data: lastLog } = await supabase
        .from("study_logs")
        .select("study_date")
        .eq("student_id", student.id)
        .order("study_date", { ascending: false })
        .limit(1)
        .single()

      previousStreakState = determineStreakState(lastLog?.study_date || null, todayJST)
    } catch (error) {
      // エラー時はresetとみなす（streak_resume記録はスキップされる可能性あり）
      console.warn("[saveStudyLog] Failed to get previous streak state:", error)
    }

    // 【セーフガード】session_id混在チェック（全ログが同一session_idであること）
    const sessionIds = new Set(logs.map(log => log.session_id))
    if (sessionIds.size > 1) {
      console.error("Multiple session_ids in single save:", Array.from(sessionIds))
      return {
        error: "異なる学習回のデータを同時に保存することはできません。ページを再読み込みして、もう一度お試しください。"
      }
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
      const studyDate = log.study_date || getTodayJST()
      if (studyDate < session.start_date || studyDate > session.end_date) {
        console.warn(
          `Session date mismatch: study_date=${studyDate} is outside session ${session.session_number} period (${session.start_date} ~ ${session.end_date})`
        )
        // 警告のみで、保存は続行（過去データの修正などを許容）
      }
    }

    // Prepare study logs for insertion
    const studyDate = logs[0]?.study_date || getTodayJST()
    const reflectionText = logs[0]?.reflection_text || null

    // Check for existing logs for the same session/subject/content combinations
    const logsToUpdate: any[] = []
    const logsToInsert: any[] = []
    const existingBatchIds: Set<string> = new Set()

    for (const log of logs) {
      const logStudyDate = log.study_date || studyDate
      const logReflectionText = log.reflection_text || reflectionText

      // maybeSingle()を使用してエラーハンドリングを改善
      // batch_id も取得
      const { data: existingLog, error: checkError } = await supabase
        .from("study_logs")
        .select("id, version, batch_id")
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
        // 既存レコードの batch_id を収集
        if (existingLog.batch_id) {
          existingBatchIds.add(existingLog.batch_id)
        }
        // Update existing log (楽観的ロック)
        logsToUpdate.push({
          id: existingLog.id,
          correct_count: log.correct_count,
          total_problems: log.total_problems,
          study_date: logStudyDate,
          reflection_text: logReflectionText,
          version: existingLog.version,
          batch_id: existingLog.batch_id, // 既存のbatch_idを保持
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

    // 【重要】既存ログが複数の異なるbatch_idを持つ場合はエラー（データ整合性）
    if (existingBatchIds.size > 1) {
      console.error("Multiple batch_ids found in existing logs:", Array.from(existingBatchIds))
      return {
        error: "学習記録のデータ整合性エラーが発生しました。サポートにお問い合わせください。"
      }
    }

    // batch_id 決定: 既存があれば引き継ぎ、なければ新規生成
    const existingBatchId = existingBatchIds.size === 1
      ? Array.from(existingBatchIds)[0]
      : null
    const batchId = existingBatchId || crypto.randomUUID()

    // デバッグログ
    console.log(`saveStudyLog: ${logsToInsert.length} records to insert, ${logsToUpdate.length} records to update`)

    // Track saved study log IDs for return value
    const savedStudyLogIds: number[] = []

    // Insert new logs (batch_id を付与)
    if (logsToInsert.length > 0) {
      const insertData = logsToInsert.map(log => ({
        ...log,
        batch_id: batchId,
      }))

      const { data: insertedLogs, error: insertError } = await supabase
        .from("study_logs")
        .insert(insertData)
        .select("id")

      if (insertError) {
        console.error("Insert error:", insertError)
        return { error: `学習記録の保存に失敗しました: ${insertError.message}` }
      }

      if (insertedLogs) {
        savedStudyLogIds.push(...insertedLogs.map(log => log.id))
      }
      console.log(`Successfully inserted ${logsToInsert.length} study logs with batch_id: ${batchId}`)
    }

    // Update existing logs (batch_id がなければ付与)
    if (logsToUpdate.length > 0) {
      for (const log of logsToUpdate) {
        const updateData: any = {
          correct_count: log.correct_count,
          total_problems: log.total_problems,
          study_date: log.study_date,
          reflection_text: log.reflection_text,
          version: log.version + 1,
          logged_at: new Date().toISOString(), // 更新日時を記録
        }
        // 既存に batch_id がなければ付与（レガシー対応）
        if (!log.batch_id) {
          updateData.batch_id = batchId
        }

        const { error: updateError, data: updateResult } = await supabase
          .from("study_logs")
          .update(updateData)
          .eq("id", log.id)
          .eq("version", log.version) // 楽観的ロック
          .select()

        if (updateError) {
          console.error("Update error:", updateError)
          return { error: `学習記録の更新に失敗しました: ${updateError.message}` }
        }

        // 楽観的ロックの競合チェック
        if (!updateResult || updateResult.length === 0) {
          console.error("Optimistic lock conflict: record was modified by another process")
          return { error: "記録が他の処理で更新されました。再度お試しください。" }
        }

        savedStudyLogIds.push(log.id)
        console.log(`Successfully updated study log id: ${log.id}`)
      }
    }

    revalidatePath("/student")
    revalidatePath("/student/spark")

    // ========================================
    // streak_resume判定: reset状態から記録した場合にイベント記録
    // ========================================
    // 非同期で実行（メイン処理をブロックしない）
    checkAndRecordStreakResume(user.id, student.id, previousStreakState, todayJST)
      .catch((error) => {
        // サイレントエラー（streak_resumeの記録失敗はユーザー体験に影響しない）
        console.error("[saveStudyLog] Failed to record streak_resume:", error)
      })

    // コーチフィードバック生成に必要な情報を返す
    return {
      success: true,
      studentId: student.id,
      sessionId: logs[0]?.session_id,
      studyLogIds: savedStudyLogIds,
      batchId: batchId,
    }
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
