"use server"

import { createClient, createAdminClient } from "@/lib/supabase/server"
import { generateEncouragementMessages } from "@/lib/openai/encouragement"
import { QUICK_ENCOURAGEMENT_TEMPLATES, type QuickEncouragementType, type EncouragementContext } from "@/lib/openai/prompts"
import { getBatchContext } from "@/lib/utils/batch-context"
import { recordEncouragementSent } from "@/lib/utils/event-tracking"

/**
 * 学習記録一覧を取得（応援機能用）- RPC版
 */
export async function getStudyLogsForEncouragement(
  studentId: string,
  filters?: {
    hasEncouragement?: "all" | "sent" | "not_sent"
    subject?: string | "all"
    sortBy?: "date" | "session"
    sortOrder?: "asc" | "desc"
    limit?: number
    offset?: number
  }
) {
  const supabase = await createClient()

  // 科目名からIDを取得
  let subjectId: number | null = null
  if (filters?.subject && filters.subject !== "all") {
    const { data: subjectData } = await supabase
      .from("subjects")
      .select("id")
      .eq("name", filters.subject)
      .single()

    if (subjectData) {
      subjectId = subjectData.id
    }
  }

  // RPC関数を呼び出し
  const { data: rpcData, error: rpcError } = await supabase.rpc("get_study_logs_for_encouragement", {
    p_student_id: parseInt(studentId),
    p_has_encouragement: filters?.hasEncouragement || "all",
    p_subject_id: subjectId ?? undefined,
    p_sort_by: filters?.sortBy || "date",
    p_sort_order: filters?.sortOrder || "desc",
    p_limit: filters?.limit || 10,
    p_offset: filters?.offset || 0,
  })

  if (rpcError) {
    console.error("Error fetching study logs via RPC:", rpcError)
    return { success: false as const, error: rpcError.message }
  }

  const logs = rpcData || []

  // 総件数とhasMoreを計算
  const totalCount = logs.length > 0 ? logs[0].total_count : 0
  const hasMore = logs.length === (filters?.limit || 10)

  // 各学習記録の応援メッセージを取得
  const logsWithMessages = await Promise.all(
    logs.map(async (log: any) => {
      // この学習記録に紐づく応援メッセージを取得
      const { data: messages, error: messagesError } = await supabase
        .from("encouragement_messages")
        .select("id, message, sender_role, sent_at, sender_id")
        .eq("related_study_log_id", log.id)
        .order("sent_at", { ascending: false })

      if (messagesError) {
        console.error("Error fetching messages for log:", log.id, messagesError)
        return {
          ...log,
          encouragement_messages: [],
        }
      }

      // 送信者プロフィールを取得
      const senderIds = (messages || []).map((msg: any) => msg.sender_id).filter(Boolean)
      let messagesWithProfiles = messages || []

      if (senderIds.length > 0) {
        const uniqueSenderIds = Array.from(new Set(senderIds))
        const { data: senderProfiles, error: senderError } = await supabase.rpc("get_sender_profiles", {
          sender_ids: uniqueSenderIds,
        })

        if (!senderError && senderProfiles) {
          messagesWithProfiles = messages.map((msg: any) => {
            const senderProfile = senderProfiles.find((profile: any) => profile.id === msg.sender_id)
            const profileWithFallback = senderProfile
              ? {
                  ...senderProfile,
                  nickname: senderProfile.nickname ?? senderProfile.display_name ?? "応援者",
                  display_name: senderProfile.display_name ?? senderProfile.nickname ?? "応援者",
                }
              : { display_name: "応援者", avatar_id: null, nickname: "応援者", custom_avatar_url: null }

            return {
              ...msg,
              sender_profile: profileWithFallback,
            }
          })
        }
      }

      return {
        ...log,
        // RPC結果のキー名をアプリ側の期待形式に変換
        study_sessions: {
          session_number: log.session_number,
          grade: log.session_grade,
        },
        subjects: {
          name: log.subject_name,
        },
        study_content_types: {
          content_name: log.content_name,
        },
        encouragement_messages: messagesWithProfiles,
      }
    })
  )

  return {
    success: true as const,
    logs: logsWithMessages,
    totalCount,
    hasMore,
  }
}

/**
 * クイック応援メッセージを送信
 * イベント計測対応: バッチ情報を含めて記録
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
    student_id: Number(studentId),
    sender_id: user.id,
    sender_role: "parent",
    support_type: "quick",
    message,
    related_study_log_id: Number(studyLogId),
  })

  if (error) {
    console.error("Error sending quick encouragement:", error)
    return { success: false as const, error: "応援メッセージの送信に失敗しました" }
  }

  // イベント計測（バッチ情報を含む）
  const batchContext = await getBatchContext(studyLogId)
  await recordEncouragementSent(
    user.id,
    "parent",
    Number(studentId),
    message.length,
    batchContext ? {
      isBatch: batchContext.isBatch,
      subjects: batchContext.subjects,
      subjectCount: batchContext.subjectCount,
      supportType: "quick",
    } : {
      isBatch: false,
      subjects: [],
      subjectCount: 1,
      supportType: "quick",
    }
  )

  return { success: true as const }
}

/**
 * AI応援メッセージを生成
 * バッチ応援対応: 複数科目まとめ記録の場合、全科目の情報を使用
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
    .eq("id", Number(studentId))
    .single()

  if (!studentData) {
    return { success: false as const, error: "生徒情報が見つかりません" }
  }

  // バッチコンテキストを取得（複数科目まとめ記録対応）
  const batchContext = await getBatchContext(studyLogId)

  if (!batchContext) {
    return { success: false as const, error: "学習記録の取得に失敗しました" }
  }

  // コンテキストを構築
  const context: EncouragementContext = {
    studentName: studentData.full_name || "お子さん",
    senderRole: "parent",
    senderName: parentProfile?.display_name || "保護者",
  }

  // バッチの場合はbatchPerformanceを使用、単一の場合はrecentPerformanceを使用
  if (batchContext.isBatch) {
    context.batchPerformance = {
      isBatch: true,
      subjects: batchContext.subjects,
      subjectCount: batchContext.subjectCount,
      totalProblems: batchContext.totalProblems,
      totalCorrect: batchContext.totalCorrect,
      averageAccuracy: batchContext.averageAccuracy,
      bestSubject: batchContext.bestSubject,
      challengeSubject: batchContext.challengeSubject,
      studyDate: batchContext.studyDate,
      sessionNumber: batchContext.sessionNumber,
    }
  } else {
    context.recentPerformance = {
      subject: batchContext.subjects[0] || "不明",
      accuracy: batchContext.averageAccuracy,
      problemCount: batchContext.totalProblems,
      sessionNumber: batchContext.sessionNumber,
      date: batchContext.studyDate,
    }
  }

  const result = await generateEncouragementMessages(context)

  if (!result.success) {
    return { success: false as const, error: result.error }
  }

  return {
    success: true as const,
    messages: result.messages,
    // イベント計測用のメタデータ
    meta: {
      isBatch: batchContext.isBatch,
      subjects: batchContext.subjects,
      subjectCount: batchContext.subjectCount,
    },
  }
}

/**
 * AI/カスタム応援メッセージを送信
 * イベント計測対応: バッチ情報を含めて記録
 */
export async function sendCustomEncouragement(
  studentId: string,
  studyLogId: string | null,
  message: string,
  supportType: "ai" | "custom",
  meta?: {
    isBatch: boolean
    subjects: string[]
    subjectCount: number
  }
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
    student_id: Number(studentId),
    sender_id: user.id,
    sender_role: "parent",
    support_type: supportType,
    message: message.trim(),
    related_study_log_id: studyLogId ? Number(studyLogId) : null,
  })

  if (error) {
    console.error("Error sending custom encouragement:", error)
    return { success: false as const, error: "応援メッセージの送信に失敗しました" }
  }

  // イベント計測（バッチ情報を含む）
  // metaがない場合でもstudyLogIdがあればバッチ情報を取得
  let batchInfo = meta
  if (!batchInfo && studyLogId) {
    const batchContext = await getBatchContext(studyLogId)
    if (batchContext) {
      batchInfo = {
        isBatch: batchContext.isBatch,
        subjects: batchContext.subjects,
        subjectCount: batchContext.subjectCount,
      }
    }
  }

  await recordEncouragementSent(
    user.id,
    "parent",
    Number(studentId),
    message.trim().length,
    {
      isBatch: batchInfo?.isBatch ?? false,
      subjects: batchInfo?.subjects ?? [],
      subjectCount: batchInfo?.subjectCount ?? 1,
      supportType,
    }
  )

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
      study_logs:related_study_log_id(
        study_date,
        subjects(name),
        study_sessions(session_number)
      )
    `)
    .eq("student_id", Number(studentId))
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
      students(id, full_name, grade, profiles!students_user_id_fkey(avatar_id, nickname, custom_avatar_url))
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
      logged_at,
      batch_id,
      students(id, full_name, grade, profiles!students_user_id_fkey(avatar_id, nickname, custom_avatar_url)),
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

  // ソート（logged_atでソート - バッチグループ化と整合）
  const sortOrder = filters?.sortOrder || "desc"
  query = query.order("logged_at", { ascending: sortOrder === "asc" })

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

  // 各生徒の最終入力日を取得（JST基準）
  const { getTodayJST, getDaysDifference } = await import("@/lib/utils/date-jst")
  const todayStr = getTodayJST()

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
        // JST日付間の日数差を計算
        daysInactive = getDaysDifference(lastLog.study_date, todayStr)
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
 * イベント計測対応: バッチ情報を含めて記録
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
    student_id: Number(studentId),
    sender_id: user.id,
    sender_role: "coach",
    support_type: "quick",
    message,
    related_study_log_id: Number(studyLogId),
  })

  if (error) {
    console.error("Error sending coach quick encouragement:", error)
    return { success: false as const, error: "応援メッセージの送信に失敗しました" }
  }

  // イベント計測（バッチ情報を含む）
  const batchContext = await getBatchContext(studyLogId)
  await recordEncouragementSent(
    user.id,
    "coach",
    Number(studentId),
    message.length,
    batchContext ? {
      isBatch: batchContext.isBatch,
      subjects: batchContext.subjects,
      subjectCount: batchContext.subjectCount,
      supportType: "quick",
    } : {
      isBatch: false,
      subjects: [],
      subjectCount: 1,
      supportType: "quick",
    }
  )

  return { success: true as const }
}

/**
 * 指導者向けAI応援メッセージを生成
 * バッチ応援対応: 複数科目まとめ記録の場合、全科目の情報を使用
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
  const { data: studentData } = await supabase.from("students").select("id, full_name").eq("id", Number(studentId)).single()

  if (!studentData) {
    return { success: false as const, error: "生徒情報が見つかりません" }
  }

  // バッチコンテキストを取得（複数科目まとめ記録対応）
  const batchContext = await getBatchContext(studyLogId)

  if (!batchContext) {
    return { success: false as const, error: "学習記録の取得に失敗しました" }
  }

  // コンテキストを構築
  const context: EncouragementContext = {
    studentName: studentData.full_name || "生徒",
    senderRole: "coach",
    senderName: (coachData?.profiles as any)?.display_name || "指導者",
  }

  // バッチの場合はbatchPerformanceを使用、単一の場合はrecentPerformanceを使用
  if (batchContext.isBatch) {
    context.batchPerformance = {
      isBatch: true,
      subjects: batchContext.subjects,
      subjectCount: batchContext.subjectCount,
      totalProblems: batchContext.totalProblems,
      totalCorrect: batchContext.totalCorrect,
      averageAccuracy: batchContext.averageAccuracy,
      bestSubject: batchContext.bestSubject,
      challengeSubject: batchContext.challengeSubject,
      studyDate: batchContext.studyDate,
      sessionNumber: batchContext.sessionNumber,
    }
  } else {
    context.recentPerformance = {
      subject: batchContext.subjects[0] || "不明",
      accuracy: batchContext.averageAccuracy,
      problemCount: batchContext.totalProblems,
      sessionNumber: batchContext.sessionNumber,
      date: batchContext.studyDate,
    }
  }

  const result = await generateEncouragementMessages(context)

  if (!result.success) {
    return { success: false as const, error: result.error }
  }

  return {
    success: true as const,
    messages: result.messages,
    // イベント計測用のメタデータ
    meta: {
      isBatch: batchContext.isBatch,
      subjects: batchContext.subjects,
      subjectCount: batchContext.subjectCount,
    },
  }
}

/**
 * 指導者からAI/カスタム応援メッセージを送信
 * イベント計測対応: バッチ情報を含めて記録
 */
export async function sendCoachCustomEncouragement(
  studentId: string,
  studyLogId: string | null,
  message: string,
  supportType: "ai" | "custom",
  meta?: {
    isBatch: boolean
    subjects: string[]
    subjectCount: number
  }
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
    student_id: Number(studentId),
    sender_id: user.id,
    sender_role: "coach",
    support_type: supportType,
    message: message.trim(),
    related_study_log_id: studyLogId ? Number(studyLogId) : null,
  })

  if (error) {
    console.error("Error sending coach custom encouragement:", error)
    return { success: false as const, error: "応援メッセージの送信に失敗しました" }
  }

  // イベント計測（バッチ情報を含む）
  // metaがない場合でもstudyLogIdがあればバッチ情報を取得
  let batchInfo = meta
  if (!batchInfo && studyLogId) {
    const batchContext = await getBatchContext(studyLogId)
    if (batchContext) {
      batchInfo = {
        isBatch: batchContext.isBatch,
        subjects: batchContext.subjects,
        subjectCount: batchContext.subjectCount,
      }
    }
  }

  await recordEncouragementSent(
    user.id,
    "coach",
    Number(studentId),
    message.trim().length,
    {
      isBatch: batchInfo?.isBatch ?? false,
      subjects: batchInfo?.subjects ?? [],
      subjectCount: batchInfo?.subjectCount ?? 1,
      supportType,
    }
  )

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
  const { getYesterdayJST, getTodayJST, getJSTDayStartISO, getJSTDayEndISO } = await import(
    "@/lib/utils/date-jst"
  )
  const yesterdayStr = getYesterdayJST()
  const todayStr = getTodayJST()
  const yesterdayStart = getJSTDayStartISO(yesterdayStr)
  const todayEnd = getJSTDayEndISO(todayStr)

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
    .gte("sent_at", yesterdayStart)
    .lte("sent_at", todayEnd)
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
        sender_profile: { display_name: "応援者", avatar_id: null, nickname: "応援者", custom_avatar_url: null },
      })),
    }
  }

  // デバッグログ（開発環境のみ）
  if (process.env.NODE_ENV === "development") {
  }

  // 送信者情報をマージ（段階的フォールバック: nickname → display_name → "応援者"）
  const messagesWithSender = messages.map((msg) => {
    const senderProfile = senderProfiles?.find((profile: any) => profile.id === msg.sender_id)

    // 段階的フォールバック: nickname が存在すればそれを使用、なければ display_name、それもなければ "応援者"
    const profileWithFallback = senderProfile
      ? {
          ...senderProfile,
          nickname: senderProfile.nickname ?? senderProfile.display_name ?? "応援者",
          display_name: senderProfile.display_name ?? senderProfile.nickname ?? "応援者",
        }
      : { display_name: "応援者", avatar_id: null, nickname: "応援者", custom_avatar_url: null }

    return {
      ...msg,
      sender_profile: profileWithFallback,
    }
  })

  return { success: true as const, messages: messagesWithSender }
}

/**
 * 生徒の全応援メッセージを取得（応援詳細画面用）
 * @deprecated このAPIは廃止されました。代わりに getEncouragementHistory を使用してください。
 * /student/encouragement ページは /student/reflect?tab=encouragement に統合されました。
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
      const { getDaysAgoJST, getJSTDayStartISO } = await import("@/lib/utils/date-jst")

      let startDateStr: string
      if (filters.period === "1week") {
        startDateStr = getDaysAgoJST(7)
      } else if (filters.period === "1month") {
        startDateStr = getDaysAgoJST(30)
      } else {
        startDateStr = getDaysAgoJST(7)
      }

      query = query.gte("sent_at", getJSTDayStartISO(startDateStr))
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
        sender_profile: { display_name: "応援者", avatar_id: null, nickname: "応援者", custom_avatar_url: null },
      })),
    }
  }

  // 送信者情報をマージ（段階的フォールバック: nickname → display_name → "応援者"）
  const messagesWithSender = filteredMessages.map((msg) => {
    const senderProfile = senderProfiles?.find((profile: any) => profile.id === msg.sender_id)

    // 段階的フォールバック: nickname が存在すればそれを使用、なければ display_name、それもなければ "応援者"
    const profileWithFallback = senderProfile
      ? {
          ...senderProfile,
          nickname: senderProfile.nickname ?? senderProfile.display_name ?? "応援者",
          display_name: senderProfile.display_name ?? senderProfile.nickname ?? "応援者",
        }
      : { display_name: "応援者", avatar_id: null, nickname: "応援者", custom_avatar_url: null }

    return {
      ...msg,
      sender_profile: profileWithFallback,
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

  const { getNowJSTISO } = await import("@/lib/utils/date-jst")

  const { error } = await supabase
    .from("encouragement_messages")
    .update({ read_at: getNowJSTISO() })
    .eq("id", Number(messageId))

  if (error) {
    console.error("Error marking encouragement as read:", error)
    return { success: false as const, error: "既読処理に失敗しました" }
  }

  return { success: true as const }
}
