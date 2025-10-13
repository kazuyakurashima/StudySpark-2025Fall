"use server"

import { createClient, createAdminClient } from "@/lib/supabase/server"
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
      study_content_types(content_name),
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
    .select("id")
    .eq("user_id", user.id)
    .single()

  if (!parentData) {
    return { success: false as const, error: "保護者情報が見つかりません" }
  }

  // Admin clientでprofile情報を取得（RLSバイパス）
  const adminClient = createAdminClient()

  const { data: parentProfile } = await adminClient
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .single()

  // 生徒情報を取得（Admin client使用）
  const { data: studentData } = await adminClient
    .from("students")
    .select("id, full_name")
    .eq("id", studentId)
    .single()

  // 学習記録を取得（Admin client使用）
  const { data: studyLog } = await adminClient
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
    studentName: studentData.full_name || "お子さん",
    senderRole: "parent",
    senderName: parentProfile?.display_name || "保護者",
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
      students(id, full_name, grade, profiles!students_user_id_fkey(avatar_url))
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
      students(id, full_name, grade, profiles!students_user_id_fkey(avatar_url)),
      study_sessions(session_number, grade),
      subjects(name),
      study_content_types(content_name),
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
  const { data: coachData } = await supabase.from("coaches").select("id, profiles!coaches_user_id_fkey(display_name)").eq("user_id", user.id).single()

  // 生徒情報を取得
  const { data: studentData } = await supabase.from("students").select("id, full_name").eq("id", studentId).single()

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
    studentName: studentData.full_name || "生徒",
    senderRole: "coach",
    senderName: (coachData?.profiles as any)?.display_name || "指導者",
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

// ========================================
// 生徒向け応援受信機能
// ========================================

/**
 * 生徒の直近の応援メッセージを取得（昨日0:00〜今日23:59）
 */
export async function getRecentEncouragementMessages() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false as const, error: "認証エラー: ログインしてください" }
  }

  // 生徒IDを取得
  const { data: studentData, error: studentError } = await supabase
    .from("students")
    .select("id")
    .eq("user_id", user.id)
    .single()

  if (studentError || !studentData) {
    return { success: false as const, error: "生徒情報の取得に失敗しました" }
  }

  // Asia/Tokyoタイムゾーンで昨日0:00と今日23:59を計算
  const now = new Date()
  const jstOffset = 9 * 60 // UTC+9
  const nowUTC = new Date(now.getTime() + jstOffset * 60 * 1000)

  const yesterday = new Date(nowUTC)
  yesterday.setDate(yesterday.getDate() - 1)
  yesterday.setHours(0, 0, 0, 0)

  const todayEnd = new Date(nowUTC)
  todayEnd.setHours(23, 59, 59, 999)

  const yesterdayUTC = new Date(yesterday.getTime() - jstOffset * 60 * 1000).toISOString()
  const todayEndUTC = new Date(todayEnd.getTime() - jstOffset * 60 * 1000).toISOString()

  // 応援メッセージを取得（送信者情報なし）
  const { data: messages, error } = await supabase
    .from("encouragement_messages")
    .select(
      `
      *,
      study_logs:related_study_log_id(
        study_date,
        total_problems,
        correct_count,
        reflection_text,
        subjects(name),
        study_sessions(session_number),
        study_content_types(content_name)
      )
    `
    )
    .eq("student_id", studentData.id)
    .gte("sent_at", yesterdayUTC)
    .lte("sent_at", todayEndUTC)
    .order("sent_at", { ascending: false })

  if (error) {
    console.error("Error fetching recent encouragement messages:", error)
    return { success: false as const, error: "応援メッセージの取得に失敗しました" }
  }

  // 送信者情報を取得（RPC経由で安全に取得）
  if (!messages || messages.length === 0) {
    return { success: true as const, messages: [] }
  }

  const senderIds = messages.map((msg) => msg.sender_id)
  const { data: senderProfiles, error: senderError } = await supabase.rpc("get_sender_profiles", {
    sender_ids: senderIds,
  })

  if (senderError) {
    console.error("Error fetching sender profiles:", senderError)
    // フォールバック: 送信者情報なしで返す
    return {
      success: true as const,
      messages: messages.map((msg) => ({
        ...msg,
        sender_profile: { display_name: "不明", avatar_url: null },
      })),
    }
  }

  // 送信者情報をマージ
  const messagesWithSender = messages.map((msg) => {
    const senderProfile = senderProfiles?.find((profile: any) => profile.id === msg.sender_id)
    return {
      ...msg,
      sender_profile: senderProfile || { display_name: "不明", avatar_url: null },
    }
  })

  return { success: true as const, messages: messagesWithSender }
}

/**
 * 生徒の全応援メッセージを取得（応援詳細画面用）
 */
export async function getAllEncouragementMessages(filters?: {
  senderRole?: "parent" | "coach" | "all"
  subject?: string | "all"
  period?: "1week" | "1month" | "all"
  sortOrder?: "asc" | "desc"
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false as const, error: "認証エラー: ログインしてください" }
  }

  // 生徒IDを取得
  const { data: studentData, error: studentError } = await supabase
    .from("students")
    .select("id")
    .eq("user_id", user.id)
    .single()

  if (studentError || !studentData) {
    return { success: false as const, error: "生徒情報の取得に失敗しました" }
  }

  // 基本クエリ（送信者情報なし）
  let query = supabase
    .from("encouragement_messages")
    .select(
      `
      *,
      study_logs:related_study_log_id(
        study_date,
        total_problems,
        correct_count,
        reflection_text,
        subjects(name),
        study_sessions(session_number),
        study_content_types(content_name)
      )
    `
    )
    .eq("student_id", studentData.id)

  // フィルター適用
  if (filters) {
    // 送信者ロールフィルター
    if (filters.senderRole && filters.senderRole !== "all") {
      query = query.eq("sender_role", filters.senderRole)
    }

    // 期間フィルター
    if (filters.period && filters.period !== "all") {
      const now = new Date()
      const startDate = new Date()

      if (filters.period === "1week") {
        startDate.setDate(now.getDate() - 7)
      } else if (filters.period === "1month") {
        startDate.setDate(now.getDate() - 30)
      }

      query = query.gte("sent_at", startDate.toISOString())
    }

    // ソート順
    const sortOrder = filters.sortOrder || "desc"
    query = query.order("sent_at", { ascending: sortOrder === "asc" })
  } else {
    query = query.order("sent_at", { ascending: false })
  }

  const { data: messages, error } = await query

  if (error) {
    console.error("Error fetching all encouragement messages:", error)
    return { success: false as const, error: "応援メッセージの取得に失敗しました" }
  }

  let filteredMessages = messages || []

  // 科目フィルター（クライアント側で実行、related_study_log_idがnullの場合も考慮）
  if (filters?.subject && filters.subject !== "all") {
    filteredMessages = filteredMessages.filter((msg: any) => {
      if (!msg.study_logs) return false
      const subject = Array.isArray(msg.study_logs.subjects)
        ? msg.study_logs.subjects[0]?.name
        : msg.study_logs.subjects?.name
      return subject === filters.subject
    })
  }

  // 送信者情報を取得（RPC経由で安全に取得）
  if (!filteredMessages || filteredMessages.length === 0) {
    return { success: true as const, messages: [] }
  }

  const senderIds = filteredMessages.map((msg) => msg.sender_id)
  const { data: senderProfiles, error: senderError } = await supabase.rpc("get_sender_profiles", {
    sender_ids: senderIds,
  })

  if (senderError) {
    console.error("Error fetching sender profiles:", senderError)
    // フォールバック: 送信者情報なしで返す
    return {
      success: true as const,
      messages: filteredMessages.map((msg) => ({
        ...msg,
        sender_profile: { display_name: "不明", avatar_url: null },
      })),
    }
  }

  // 送信者情報をマージ
  const messagesWithSender = filteredMessages.map((msg) => {
    const senderProfile = senderProfiles?.find((profile: any) => profile.id === msg.sender_id)
    return {
      ...msg,
      sender_profile: senderProfile || { display_name: "不明", avatar_url: null },
    }
  })

  return { success: true as const, messages: messagesWithSender }
}

/**
 * 応援メッセージを既読にする
 */
export async function markEncouragementAsRead(messageId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false as const, error: "認証エラー: ログインしてください" }
  }

  const { error } = await supabase
    .from("encouragement_messages")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("id", messageId)

  if (error) {
    console.error("Error marking encouragement as read:", error)
    return { success: false as const, error: "既読処理に失敗しました" }
  }

  return { success: true as const }
}
