"use server"

import { createClient } from "@/lib/supabase/server"
import { generateEncouragementMessages, type EncouragementContext } from "@/lib/openai/encouragement"
import { QUICK_ENCOURAGEMENT_TEMPLATES, type QuickEncouragementType } from "@/lib/openai/prompts"

/**
 * 学習記録一覧を取得（応援機能用）
 */
export async function getStudyLogsForEncouragement(
  studentId: string,
  filters?: {
    hasEncouragement?: "all" | "sent" | "not_sent"
    subject?: string | "all"
    period?: "1week" | "1month" | "all"
    sortBy?: "date" | "session" | "accuracy"
    sortOrder?: "asc" | "desc"
  }
) {
  const supabase = await createClient()

  let query = supabase
    .from("study_logs")
    .select(`
      id,
      student_id,
      study_date,
      session_id,
      subject_id,
      study_content_type_id,
      total_problems,
      correct_count,
      reflection_text,
      created_at,
      study_sessions(session_number, grade),
      subjects(name),
      study_content_types(name),
      encouragement_messages(id, message, sender_role, created_at)
    `)
    .eq("student_id", studentId)

  // 期間フィルター
  if (filters?.period === "1week") {
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
    query = query.gte("study_date", oneWeekAgo.toISOString().split("T")[0])
  } else if (filters?.period === "1month") {
    const oneMonthAgo = new Date()
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)
    query = query.gte("study_date", oneMonthAgo.toISOString().split("T")[0])
  }

  // 科目フィルター
  if (filters?.subject && filters.subject !== "all") {
    const { data: subjectData } = await supabase
      .from("subjects")
      .select("id")
      .eq("name", filters.subject)
      .single()

    if (subjectData) {
      query = query.eq("subject_id", subjectData.id)
    }
  }

  // ソート
  const sortBy = filters?.sortBy || "date"
  const sortOrder = filters?.sortOrder || "desc"

  if (sortBy === "date") {
    query = query.order("study_date", { ascending: sortOrder === "asc" })
  } else if (sortBy === "session") {
    query = query.order("session_id", { ascending: sortOrder === "asc" })
  }

  const { data, error } = await query

  if (error) {
    console.error("Error fetching study logs:", error)
    return { success: false as const, error: error.message }
  }

  // 正答率でソート（クライアント側）
  let logs = data || []
  if (sortBy === "accuracy") {
    logs = logs.sort((a, b) => {
      const accA = a.total_problems > 0 ? (a.correct_count / a.total_problems) * 100 : 0
      const accB = b.total_problems > 0 ? (b.correct_count / b.total_problems) * 100 : 0
      return sortOrder === "asc" ? accA - accB : accB - accA
    })
  }

  // 応援有無フィルター
  if (filters?.hasEncouragement === "sent") {
    logs = logs.filter((log) => Array.isArray(log.encouragement_messages) && log.encouragement_messages.length > 0)
  } else if (filters?.hasEncouragement === "not_sent") {
    logs = logs.filter((log) => !Array.isArray(log.encouragement_messages) || log.encouragement_messages.length === 0)
  }

  return { success: true as const, logs }
}

/**
 * クイック応援メッセージを送信
 */
export async function sendQuickEncouragement(
  studentId: string,
  studyLogId: string,
  quickType: QuickEncouragementType
) {
  const supabase = await createClient()

  // 現在のユーザー（保護者）を取得
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false as const, error: "認証エラー: ログインしてください" }
  }

  const message = QUICK_ENCOURAGEMENT_TEMPLATES[quickType]

  const { error } = await supabase.from("encouragement_messages").insert({
    student_id: studentId,
    sender_id: user.id,
    sender_role: "parent",
    support_type: "quick",
    message,
    related_study_log_id: studyLogId,
  })

  if (error) {
    console.error("Error sending quick encouragement:", error)
    return { success: false as const, error: "応援メッセージの送信に失敗しました" }
  }

  return { success: true as const }
}

/**
 * AI応援メッセージを生成
 */
export async function generateAIEncouragement(studentId: string, studyLogId: string) {
  const supabase = await createClient()

  // 現在のユーザー（保護者）を取得
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false as const, error: "認証エラー: ログインしてください" }
  }

  // 保護者情報を取得
  const { data: parentData } = await supabase
    .from("parents")
    .select("nickname")
    .eq("user_id", user.id)
    .single()

  // 生徒情報を取得
  const { data: studentData } = await supabase
    .from("students")
    .select("nickname")
    .eq("id", studentId)
    .single()

  // 学習記録を取得
  const { data: studyLog } = await supabase
    .from("study_logs")
    .select(`
      study_date,
      total_problems,
      correct_count,
      study_sessions(session_number),
      subjects(name)
    `)
    .eq("id", studyLogId)
    .single()

  if (!studentData || !studyLog) {
    return { success: false as const, error: "データ取得に失敗しました" }
  }

  const accuracy =
    studyLog.total_problems > 0 ? Math.round((studyLog.correct_count / studyLog.total_problems) * 100) : 0

  const context: EncouragementContext = {
    studentName: studentData.nickname || "お子さん",
    senderRole: "parent",
    senderName: parentData?.nickname || "保護者",
    recentPerformance: {
      subject: Array.isArray(studyLog.subjects) ? studyLog.subjects[0]?.name : studyLog.subjects?.name || "不明",
      accuracy,
      problemCount: studyLog.total_problems,
      sessionNumber: Array.isArray(studyLog.study_sessions)
        ? studyLog.study_sessions[0]?.session_number
        : studyLog.study_sessions?.session_number || 0,
      date: studyLog.study_date || "",
    },
  }

  const result = await generateEncouragementMessages(context)

  if (!result.success) {
    return { success: false as const, error: result.error }
  }

  return { success: true as const, messages: result.messages }
}

/**
 * AI/カスタム応援メッセージを送信
 */
export async function sendCustomEncouragement(
  studentId: string,
  studyLogId: string | null,
  message: string,
  supportType: "ai" | "custom"
) {
  const supabase = await createClient()

  // 現在のユーザー（保護者）を取得
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false as const, error: "認証エラー: ログインしてください" }
  }

  // メッセージバリデーション
  if (!message || message.trim().length === 0) {
    return { success: false as const, error: "メッセージを入力してください" }
  }

  if (message.length > 200) {
    return { success: false as const, error: "メッセージは200文字以内で入力してください" }
  }

  const { error } = await supabase.from("encouragement_messages").insert({
    student_id: studentId,
    sender_id: user.id,
    sender_role: "parent",
    support_type: supportType,
    message: message.trim(),
    related_study_log_id: studyLogId,
  })

  if (error) {
    console.error("Error sending custom encouragement:", error)
    return { success: false as const, error: "応援メッセージの送信に失敗しました" }
  }

  return { success: true as const }
}

/**
 * 応援履歴を取得
 */
export async function getEncouragementHistory(studentId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("encouragement_messages")
    .select(`
      id,
      message,
      support_type,
      sender_role,
      created_at,
      related_study_log_id,
      study_logs(
        study_date,
        subjects(name),
        study_sessions(session_number)
      )
    `)
    .eq("student_id", studentId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching encouragement history:", error)
    return { success: false as const, error: error.message }
  }

  return { success: true as const, history: data || [] }
}

// ==================== 指導者向け機能 ====================

/**
 * 指導者の担当生徒一覧を取得
 */
export async function getCoachStudents() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false as const, error: "認証エラー: ログインしてください" }
  }

  // 指導者情報を取得
  const { data: coachData } = await supabase.from("coaches").select("id").eq("user_id", user.id).single()

  if (!coachData) {
    return { success: false as const, error: "指導者情報が見つかりません" }
  }

  // 担当生徒を取得
  const { data, error } = await supabase
    .from("coach_student_relations")
    .select(`
      student_id,
      students(id, nickname, avatar, grade)
    `)
    .eq("coach_id", coachData.id)

  if (error) {
    console.error("Error fetching coach students:", error)
    return { success: false as const, error: error.message }
  }

  const students = data?.map((rel) => (Array.isArray(rel.students) ? rel.students[0] : rel.students)) || []

  return { success: true as const, students }
}

/**
 * 全生徒の学習記録を取得（指導者用）
 */
export async function getAllStudyLogsForCoach(filters?: {
  grade?: "5" | "6" | "all"
  subject?: string | "all"
  encouragementType?: "coach" | "parent" | "none" | "all"
  sortOrder?: "asc" | "desc"
}) {
  const supabase = await createClient()

  // 担当生徒を取得
  const studentsResult = await getCoachStudents()
  if (!studentsResult.success) {
    return studentsResult
  }

  const studentIds = studentsResult.students.map((s: any) => s.id)

  if (studentIds.length === 0) {
    return { success: true as const, logs: [] }
  }

  let query = supabase
    .from("study_logs")
    .select(`
      id,
      student_id,
      study_date,
      session_id,
      subject_id,
      study_content_type_id,
      total_problems,
      correct_count,
      reflection_text,
      created_at,
      students(id, nickname, avatar, grade),
      study_sessions(session_number, grade),
      subjects(name),
      study_content_types(name),
      encouragement_messages(id, message, sender_role, created_at, sender_id)
    `)
    .in("student_id", studentIds)

  // 学年フィルター
  if (filters?.grade && filters.grade !== "all") {
    const gradeStudents = studentsResult.students.filter((s: any) => s.grade === parseInt(filters.grade!))
    const gradeStudentIds = gradeStudents.map((s: any) => s.id)
    query = query.in("student_id", gradeStudentIds)
  }

  // 科目フィルター
  if (filters?.subject && filters.subject !== "all") {
    const { data: subjectData } = await supabase.from("subjects").select("id").eq("name", filters.subject).single()

    if (subjectData) {
      query = query.eq("subject_id", subjectData.id)
    }
  }

  // ソート
  const sortOrder = filters?.sortOrder || "desc"
  query = query.order("study_date", { ascending: sortOrder === "asc" })

  const { data, error } = await query

  if (error) {
    console.error("Error fetching study logs for coach:", error)
    return { success: false as const, error: error.message }
  }

  let logs = data || []

  // 応援タイプフィルター（クライアント側）
  if (filters?.encouragementType && filters.encouragementType !== "all") {
    if (filters.encouragementType === "none") {
      logs = logs.filter((log) => !Array.isArray(log.encouragement_messages) || log.encouragement_messages.length === 0)
    } else {
      logs = logs.filter(
        (log) =>
          Array.isArray(log.encouragement_messages) &&
          log.encouragement_messages.some((msg: any) => msg.sender_role === filters.encouragementType)
      )
    }
  }

  return { success: true as const, logs }
}

/**
 * 未入力生徒一覧を取得
 */
export async function getInactiveStudents(daysThreshold: 3 | 5 | 7 = 7) {
  const supabase = await createClient()

  // 担当生徒を取得
  const studentsResult = await getCoachStudents()
  if (!studentsResult.success) {
    return studentsResult
  }

  const students = studentsResult.students

  // 各生徒の最終入力日を取得
  const now = new Date()
  const studentsWithLastLog = await Promise.all(
    students.map(async (student: any) => {
      const { data: lastLog } = await supabase
        .from("study_logs")
        .select("study_date, created_at")
        .eq("student_id", student.id)
        .order("study_date", { ascending: false })
        .limit(1)
        .single()

      let daysInactive = 0
      let lastInputDate = null

      if (lastLog) {
        lastInputDate = lastLog.study_date
        const lastDate = new Date(lastLog.study_date)
        const diffTime = now.getTime() - lastDate.getTime()
        daysInactive = Math.floor(diffTime / (1000 * 60 * 60 * 24))
      } else {
        // 一度も入力していない場合
        daysInactive = 999
      }

      return {
        ...student,
        lastInputDate,
        daysInactive,
      }
    })
  )

  // しきい値以上の未入力生徒をフィルター
  const inactiveStudents = studentsWithLastLog.filter((s) => s.daysInactive >= daysThreshold)

  return { success: true as const, students: inactiveStudents }
}

/**
 * 指導者からクイック応援を送信
 */
export async function sendCoachQuickEncouragement(studentId: string, studyLogId: string, quickType: QuickEncouragementType) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false as const, error: "認証エラー: ログインしてください" }
  }

  const message = QUICK_ENCOURAGEMENT_TEMPLATES[quickType]

  const { error } = await supabase.from("encouragement_messages").insert({
    student_id: studentId,
    sender_id: user.id,
    sender_role: "coach",
    support_type: "quick",
    message,
    related_study_log_id: studyLogId,
  })

  if (error) {
    console.error("Error sending coach quick encouragement:", error)
    return { success: false as const, error: "応援メッセージの送信に失敗しました" }
  }

  return { success: true as const }
}

/**
 * 指導者からAI応援メッセージを生成
 */
export async function generateCoachAIEncouragement(studentId: string, studyLogId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false as const, error: "認証エラー: ログインしてください" }
  }

  // 指導者情報を取得
  const { data: coachData } = await supabase.from("coaches").select("nickname").eq("user_id", user.id).single()

  // 生徒情報を取得
  const { data: studentData } = await supabase.from("students").select("nickname").eq("id", studentId).single()

  // 学習記録を取得
  const { data: studyLog } = await supabase
    .from("study_logs")
    .select(`
      study_date,
      total_problems,
      correct_count,
      study_sessions(session_number),
      subjects(name)
    `)
    .eq("id", studyLogId)
    .single()

  if (!studentData || !studyLog) {
    return { success: false as const, error: "データ取得に失敗しました" }
  }

  const accuracy =
    studyLog.total_problems > 0 ? Math.round((studyLog.correct_count / studyLog.total_problems) * 100) : 0

  const context: EncouragementContext = {
    studentName: studentData.nickname || "生徒",
    senderRole: "coach",
    senderName: coachData?.nickname || "指導者",
    recentPerformance: {
      subject: Array.isArray(studyLog.subjects) ? studyLog.subjects[0]?.name : studyLog.subjects?.name || "不明",
      accuracy,
      problemCount: studyLog.total_problems,
      sessionNumber: Array.isArray(studyLog.study_sessions)
        ? studyLog.study_sessions[0]?.session_number
        : studyLog.study_sessions?.session_number || 0,
      date: studyLog.study_date || "",
    },
  }

  const result = await generateEncouragementMessages(context)

  if (!result.success) {
    return { success: false as const, error: result.error }
  }

  return { success: true as const, messages: result.messages }
}

/**
 * 指導者からAI/カスタム応援メッセージを送信
 */
export async function sendCoachCustomEncouragement(
  studentId: string,
  studyLogId: string | null,
  message: string,
  supportType: "ai" | "custom"
) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false as const, error: "認証エラー: ログインしてください" }
  }

  // メッセージバリデーション
  if (!message || message.trim().length === 0) {
    return { success: false as const, error: "メッセージを入力してください" }
  }

  if (message.length > 200) {
    return { success: false as const, error: "メッセージは200文字以内で入力してください" }
  }

  const { error } = await supabase.from("encouragement_messages").insert({
    student_id: studentId,
    sender_id: user.id,
    sender_role: "coach",
    support_type: supportType,
    message: message.trim(),
    related_study_log_id: studyLogId,
  })

  if (error) {
    console.error("Error sending coach custom encouragement:", error)
    return { success: false as const, error: "応援メッセージの送信に失敗しました" }
  }

  return { success: true as const }
}
