"use server"

import { createClient } from "@/lib/supabase/server"
import { formatDateToJST, getNowJST, getWeeksAgoJST, getMonthsAgoJST } from "@/lib/utils/date-jst"

/**
 * 週次振り返りが利用可能かチェック
 * 土曜12:00 〜 水曜23:59のみ利用可能
 */
export async function checkReflectAvailability() {
  const tokyoNow = getNowJST()

  const dayOfWeek = tokyoNow.getDay() // 0=日, 1=月, 2=火, 3=水, 4=木, 5=金, 6=土
  const hours = tokyoNow.getHours()

  // 土曜12:00以降
  const isSaturdayAfterNoon = dayOfWeek === 6 && hours >= 12
  // 日曜終日
  const isSunday = dayOfWeek === 0
  // 月曜〜水曜終日
  const isMondayToWednesday = dayOfWeek >= 1 && dayOfWeek <= 3

  const isAvailable = isSaturdayAfterNoon || isSunday || isMondayToWednesday

  return {
    isAvailable,
    currentDay: ['日', '月', '火', '水', '木', '金', '土'][dayOfWeek],
    currentTime: `${hours}:${String(tokyoNow.getMinutes()).padStart(2, '0')}`,
  }
}

/**
 * 週タイプを判定
 * 成長週: 正答率+10%以上
 * 安定週: 正答率±10%以内
 * 挑戦週: 正答率-10%以上
 * 特別週: 大きなテスト直前
 */
export async function determineWeekType() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: "ログインが必要です" }
  }

  const { data: student } = await supabase
    .from("students")
    .select("id")
    .eq("user_id", user.id)
    .single()

  if (!student) {
    return { error: "生徒情報が見つかりません" }
  }

  // 今週と先週の学習ログを取得
  const tokyoNow = getNowJST()

  // 今週の月曜日
  const thisMonday = new Date(tokyoNow)
  thisMonday.setDate(tokyoNow.getDate() - ((tokyoNow.getDay() + 6) % 7))
  thisMonday.setHours(0, 0, 0, 0)

  // 先週の月曜日
  const lastMonday = new Date(thisMonday)
  lastMonday.setDate(lastMonday.getDate() - 7)

  // 先週の日曜日
  const lastSunday = new Date(thisMonday)
  lastSunday.setDate(lastSunday.getDate() - 1)
  lastSunday.setHours(23, 59, 59, 999)

  // 過去2週間のデータを取得（study_sessionsと結合して学習回の日付範囲で判定）
  const twoWeeksAgo = new Date(lastMonday)
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 7)

  const { data: allRecentLogs } = await supabase
    .from("study_logs")
    .select(`
      total_problems,
      correct_count,
      study_date,
      logged_at,
      study_sessions!inner(start_date, end_date)
    `)
    .eq("student_id", student.id)
    .gte("study_sessions.start_date", formatDateToJST(twoWeeksAgo))

  // JavaScript側でフィルタリング（学習回の期間で判定）
  const thisMondayStr = formatDateToJST(thisMonday)
  const lastMondayStr = formatDateToJST(lastMonday)
  const lastSundayStr = formatDateToJST(lastSunday)

  const thisWeekLogs = (allRecentLogs || []).filter(log => {
    const sessionStartDate = log.study_sessions?.start_date
    if (!sessionStartDate) return false
    return sessionStartDate >= thisMondayStr
  })

  const lastWeekLogs = (allRecentLogs || []).filter(log => {
    const sessionStartDate = log.study_sessions?.start_date
    if (!sessionStartDate) return false
    return sessionStartDate >= lastMondayStr && sessionStartDate <= lastSundayStr
  })

  // 正答率を計算
  const calculateAccuracy = (logs: any[] | null) => {
    if (!logs || logs.length === 0) return 0
    const total = logs.reduce((sum, log) => sum + (log.total_problems || 0), 0)
    const correct = logs.reduce((sum, log) => sum + (log.correct_count || 0), 0)
    return total > 0 ? (correct / total) * 100 : 0
  }

  const thisWeekAccuracy = calculateAccuracy(thisWeekLogs)
  const lastWeekAccuracy = calculateAccuracy(lastWeekLogs)
  const accuracyDiff = thisWeekAccuracy - lastWeekAccuracy

  // テスト日程をチェック（特別週判定）
  // 来週の日曜日にテストがある場合のみ特別週
  // 今週の日曜日を基準に計算
  const thisSunday = new Date(thisMonday)
  thisSunday.setDate(thisMonday.getDate() + 6) // 今週月曜 + 6日 = 今週日曜

  const nextWeekSunday = new Date(thisSunday)
  nextWeekSunday.setDate(thisSunday.getDate() + 7) // 来週の日曜日
  nextWeekSunday.setHours(0, 0, 0, 0)

  const nextWeekSundayEnd = new Date(nextWeekSunday)
  nextWeekSundayEnd.setHours(23, 59, 59, 999)

  console.log("=== 特別週判定 ===")
  console.log("今週月曜日:", formatDateToJST(thisMonday))
  console.log("来週日曜日:", formatDateToJST(nextWeekSunday))

  const { data: upcomingTests } = await supabase
    .from("test_schedules")
    .select("test_date, test_types(name, grade)")
    .eq("test_date", formatDateToJST(nextWeekSunday))

  console.log("来週日曜日のテスト:", upcomingTests)

  const hasUpcomingTest = upcomingTests && upcomingTests.length > 0

  let weekType: "growth" | "stable" | "challenge" | "special"

  if (hasUpcomingTest) {
    weekType = "special"
  } else if (accuracyDiff >= 10) {
    weekType = "growth"
  } else if (accuracyDiff <= -10) {
    weekType = "challenge"
  } else {
    weekType = "stable"
  }

  return {
    weekType,
    thisWeekAccuracy: Math.round(thisWeekAccuracy),
    lastWeekAccuracy: Math.round(lastWeekAccuracy),
    accuracyDiff: Math.round(accuracyDiff),
    upcomingTest: hasUpcomingTest ? upcomingTests[0] : null,
  }
}

/**
 * コーチングセッションを開始
 */
export async function startCoachingSession(weekType: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: "ログインが必要です" }
  }

  const { data: student } = await supabase
    .from("students")
    .select("id")
    .eq("user_id", user.id)
    .single()

  if (!student) {
    return { error: "生徒情報が見つかりません" }
  }

  // 今週の開始・終了日を算出
  const tokyoNow = getNowJST()

  // 今週の月曜日（週開始日）
  const weekStartDate = new Date(tokyoNow)
  weekStartDate.setDate(tokyoNow.getDate() - ((tokyoNow.getDay() + 6) % 7))
  weekStartDate.setHours(0, 0, 0, 0)

  // 今週の日曜日（週終了日）
  const weekEndDate = new Date(weekStartDate)
  weekEndDate.setDate(weekStartDate.getDate() + 6)
  weekEndDate.setHours(23, 59, 59, 999)

  // 今週のセッションが既に存在するかチェック
  const { data: existingSession } = await supabase
    .from("coaching_sessions")
    .select("id, status, completed_at")
    .eq("student_id", student.id)
    .eq("week_start_date", formatDateToJST(weekStartDate))
    .maybeSingle()

  if (existingSession) {
    // 完了済みセッションの場合はエラーを返す
    if (existingSession.status === "completed" || existingSession.completed_at) {
      return { error: "今週の振り返りは既に完了しています", alreadyCompleted: true }
    }
    // 進行中のセッションは継続可能
    return { sessionId: existingSession.id, isNew: false }
  }

  // 新規セッション作成
  const { data: newSession, error } = await supabase
    .from("coaching_sessions")
    .insert({
      student_id: student.id,
      week_start_date: formatDateToJST(weekStartDate),
      week_end_date: formatDateToJST(weekEndDate),
      week_type: weekType,
      status: "in_progress",
      started_at: tokyoNow.toISOString(),
    })
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  return { sessionId: newSession.id, isNew: true }
}

/**
 * コーチングメッセージを保存
 */
export async function saveCoachingMessage(
  sessionId: string,
  role: "assistant" | "user",
  content: string,
  turnNumber: number
) {
  const supabase = await createClient()

  const { error } = await supabase
    .from("coaching_messages")
    .insert({
      session_id: sessionId,
      role: role,
      content: content,
      turn_number: turnNumber,
      sent_at: new Date().toISOString(),
    })

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

/**
 * コーチングセッションを完了
 */
export async function completeCoachingSession(sessionId: string, summary: string, totalTurns: number) {
  const supabase = await createClient()

  const { error } = await supabase
    .from("coaching_sessions")
    .update({
      status: "completed",
      summary_text: summary,
      total_turns: totalTurns,
      completed_at: new Date().toISOString(),
    })
    .eq("id", sessionId)

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

/**
 * 過去のコーチングセッション一覧を取得
 */
export async function getCoachingSessions() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: "ログインが必要です" }
  }

  const { data: student } = await supabase
    .from("students")
    .select("id")
    .eq("user_id", user.id)
    .single()

  if (!student) {
    return { error: "生徒情報が見つかりません" }
  }

  const { data: sessions, error } = await supabase
    .from("coaching_sessions")
    .select(`
      id,
      week_start_date,
      week_end_date,
      week_type,
      status,
      summary_text,
      total_turns,
      started_at,
      completed_at,
      coaching_messages (
        role,
        content,
        turn_number,
        sent_at
      )
    `)
    .eq("student_id", student.id)
    .order("week_start_date", { ascending: false })

  if (error) {
    return { error: error.message }
  }

  return { sessions }
}

/**
 * 達成マップデータを取得（科目別正答率マップ）
 */
export async function getAchievementMapData(subjectId?: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: "ログインが必要です" }
  }

  const { data: student } = await supabase
    .from("students")
    .select("id, grade, course")
    .eq("user_id", user.id)
    .single()

  if (!student) {
    return { error: "生徒情報が見つかりません" }
  }

  // 学習記録を取得（科目フィルター対応）
  let query = supabase
    .from("study_logs")
    .select(`
      id,
      study_date,
      correct_count,
      total_problems,
      session_id,
      study_sessions (session_number, start_date, end_date),
      subjects (id, name, color_code),
      study_content_types (id, content_name)
    `)
    .eq("student_id", student.id)
    .order("study_date", { ascending: true })

  if (subjectId) {
    query = query.eq("subject_id", subjectId)
  }

  const { data: logs, error } = await query

  if (error) {
    return { error: error.message }
  }

  return {
    logs: logs || [],
    studentGrade: student.grade,
    studentCourse: student.course
  }
}

/**
 * 学習履歴データを取得（フィルター・ソート対応）
 */
export async function getStudyHistory(params?: {
  subjectFilter?: string // 'all' | 'math' | 'japanese' | 'science' | 'social'
  periodFilter?: string // '1week' | '1month' | 'all'
  sortBy?: string // 'date' | 'session' | 'accuracy'
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: "ログインが必要です" }
  }

  const { data: student } = await supabase
    .from("students")
    .select("id")
    .eq("user_id", user.id)
    .single()

  if (!student) {
    return { error: "生徒情報が見つかりません" }
  }

  // 期間フィルター
  let query = supabase
    .from("study_logs")
    .select(`
      id,
      batch_id,
      logged_at,
      study_date,
      correct_count,
      total_problems,
      reflection_text,
      session_id,
      subjects (id, name, color_code),
      study_content_types (content_name),
      study_sessions (session_number, start_date, end_date)
    `)
    .eq("student_id", student.id)

  // 科目フィルター
  if (params?.subjectFilter && params.subjectFilter !== 'all') {
    const subjectMap: Record<string, string> = {
      'math': '算数',
      'japanese': '国語',
      'science': '理科',
      'social': '社会'
    }
    const subjectName = subjectMap[params.subjectFilter]
    if (subjectName) {
      const { data: subject } = await supabase
        .from("subjects")
        .select("id")
        .eq("name", subjectName)
        .single()

      if (subject) {
        query = query.eq("subject_id", subject.id)
      }
    }
  }

  // 期間フィルター
  if (params?.periodFilter === '1week') {
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
    query = query.gte("logged_at", oneWeekAgo.toISOString())
  } else if (params?.periodFilter === '1month') {
    const oneMonthAgo = new Date()
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)
    query = query.gte("logged_at", oneMonthAgo.toISOString())
  }

  // ソート
  const sortBy = params?.sortBy || 'date'
  if (sortBy === 'date') {
    query = query.order("logged_at", { ascending: false })
  } else if (sortBy === 'session') {
    query = query.order("session_id", { ascending: false })
  }
  // 正答率ソートはクライアント側で処理

  const { data: logs, error } = await query

  if (error) {
    return { error: error.message }
  }

  return { logs: logs || [] }
}

/**
 * 応援履歴データを取得（フィルター・ソート対応）
 */
export async function getEncouragementHistory(params?: {
  subjectFilter?: string
  periodFilter?: string
  sortBy?: string
  displayMode?: 'full' | 'partial'
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: "ログインが必要です" }
  }

  const { data: student } = await supabase
    .from("students")
    .select("id")
    .eq("user_id", user.id)
    .single()

  if (!student) {
    return { error: "生徒情報が見つかりません" }
  }

  let query = supabase
    .from("encouragement_messages")
    .select(`
      id,
      message,
      sent_at,
      read_at,
      created_at,
      sender_id,
      sender_role,
      related_study_log_id,
      study_logs:related_study_log_id (
        id,
        batch_id,
        logged_at,
        study_date,
        correct_count,
        total_problems,
        reflection_text,
        session_id,
        subjects (name, color_code),
        study_content_types (content_name),
        study_sessions (session_number, start_date, end_date)
      )
    `)
    .eq("student_id", student.id)

  // 科目フィルター（study_logs経由）
  // 期間フィルター
  if (params?.periodFilter === '1week') {
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
    query = query.gte("sent_at", oneWeekAgo.toISOString())
  } else if (params?.periodFilter === '1month') {
    const oneMonthAgo = new Date()
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)
    query = query.gte("sent_at", oneMonthAgo.toISOString())
  }

  // ソート
  query = query.order("sent_at", { ascending: false })

  const { data: messages, error } = await query

  if (error) {
    return { error: error.message }
  }

  // 送信者のプロフィール情報を取得（RPC経由で安全に取得）
  if (messages && messages.length > 0) {
    const senderIds = [...new Set(messages.map(m => m.sender_id))]

    const { data: senderProfiles, error: senderError } = await supabase.rpc("get_sender_profiles", {
      sender_ids: senderIds,
    })

    if (senderError) {
      console.error("Error fetching sender profiles:", senderError)
      // フォールバック: 送信者情報なしで返す
      return {
        messages: messages.map((msg) => ({
          ...msg,
          sender_profile: { display_name: "応援者", avatar_id: null, nickname: "応援者" },
        })),
      }
    }

    // メッセージに送信者プロフィールを追加（段階的フォールバック）
    const messagesWithProfiles = messages.map(msg => {
      const senderProfile = senderProfiles?.find((profile: any) => profile.id === msg.sender_id)
      const profileWithFallback = senderProfile
        ? {
            ...senderProfile,
            nickname: senderProfile.nickname ?? senderProfile.display_name ?? "応援者",
            display_name: senderProfile.display_name ?? senderProfile.nickname ?? "応援者",
          }
        : { display_name: "応援者", avatar_id: null, nickname: "応援者" }

      return {
        ...msg,
        sender_profile: profileWithFallback,
      }
    })

    return { messages: messagesWithProfiles }
  }

  return { messages: messages || [] }
}

/**
 * コーチング履歴データを取得（詳細版）
 */
export async function getCoachingHistory(params?: {
  periodFilter?: string
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: "ログインが必要です" }
  }

  const { data: student } = await supabase
    .from("students")
    .select("id")
    .eq("user_id", user.id)
    .single()

  if (!student) {
    return { error: "生徒情報が見つかりません" }
  }

  let query = supabase
    .from("coaching_sessions")
    .select(`
      id,
      week_start_date,
      week_end_date,
      week_type,
      status,
      summary_text,
      total_turns,
      started_at,
      completed_at,
      coaching_messages (
        role,
        content,
        turn_number,
        sent_at
      )
    `)
    .eq("student_id", student.id)
    .eq("status", "completed")

  // 期間フィルター
  if (params?.periodFilter === '1week') {
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
    query = query.gte("completed_at", oneWeekAgo.toISOString())
  } else if (params?.periodFilter === '1month') {
    const oneMonthAgo = new Date()
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)
    query = query.gte("completed_at", oneMonthAgo.toISOString())
  }

  query = query.order("week_start_date", { ascending: false })

  const { data: sessions, error } = await query

  if (error) {
    return { error: error.message }
  }

  // 応援メッセージも取得（コーチングセッションの期間に送信されたもの）
  const sessionsWithEncouragement = await Promise.all(
    (sessions || []).map(async (session) => {
      const { data: encouragements } = await supabase
        .from("encouragement_messages")
        .select(`
          id,
          message,
          sent_at,
          sender_profile:user_profiles!encouragement_messages_sender_id_fkey (
            full_name,
            nickname,
            avatar,
            role
          )
        `)
        .eq("student_id", student.id)
        .gte("sent_at", session.week_start_date)
        .lte("sent_at", session.week_end_date)
        .order("sent_at", { ascending: true })

      return {
        ...session,
        encouragements: encouragements || []
      }
    })
  )

  return { sessions: sessionsWithEncouragement }
}

/**
 * テスト結果履歴を取得
 *
 * @param filters - フィルター条件（テスト種類、期間、学習回、ソート順）
 * @returns テスト結果の配列と集計情報
 */
export async function getAssessmentHistory(filters?: {
  testType?: 'math_print' | 'kanji_test' | 'all'
  period?: '1week' | '1month' | '3months' | 'all'
  sessionNumber?: number
  sortBy?: 'date_desc' | 'date_asc' | 'score_desc' | 'score_asc'
}) {
  const supabase = await createClient()

  // 認証チェック
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: "認証が必要です", assessments: [] }
  }

  // 生徒情報を取得
  const { data: student } = await supabase
    .from("students")
    .select("id")
    .eq("user_id", user.id)
    .single()

  if (!student) {
    return { error: "生徒情報が見つかりません", assessments: [] }
  }

  // 期間フィルターの計算（DATE型カラムと比較するため YYYY-MM-DD 形式、JST基準）
  let dateFilter: string | null = null

  if (filters?.period === '1week') {
    dateFilter = getWeeksAgoJST(1)
  } else if (filters?.period === '1month') {
    dateFilter = getMonthsAgoJST(1)
  } else if (filters?.period === '3months') {
    dateFilter = getMonthsAgoJST(3)
  }

  // テスト結果を取得（assessment_masters を join、完了済みのみ）
  let query = supabase
    .from("class_assessments")
    .select(`
      id,
      score,
      max_score_at_submission,
      assessment_date,
      status,
      master:assessment_masters!class_assessments_master_id_fkey (
        id,
        title,
        assessment_type,
        max_score,
        session_number
      )
    `)
    .eq("student_id", student.id)
    .eq("status", "completed")
    .not("assessment_date", "is", null)
    .order("assessment_date", { ascending: false })

  // 日付フィルター（期間指定がある場合）
  if (dateFilter) {
    query = query.gte("assessment_date", dateFilter)
  }

  const { data: allAssessments, error } = await query

  if (error) {
    console.error("Error fetching assessment history:", error)
    return { error: error.message, assessments: [] }
  }

  if (!allAssessments || allAssessments.length === 0) {
    return { assessments: [], summary: null }
  }

  // ⚠️ クライアントサイドフィルタリング（Supabaseのネストフィルター制限対応）
  let filteredAssessments = allAssessments

  // テスト種類フィルター（クライアントサイド）
  if (filters?.testType && filters.testType !== 'all') {
    filteredAssessments = filteredAssessments.filter(
      (a: any) => a.master?.assessment_type === filters.testType
    )
  }

  // 学習回フィルター（クライアントサイド）
  if (filters?.sessionNumber) {
    filteredAssessments = filteredAssessments.filter(
      (a: any) => a.master?.session_number === filters.sessionNumber
    )
  }

  // ソート処理
  if (filters?.sortBy) {
    filteredAssessments.sort((a: any, b: any) => {
      if (filters.sortBy === 'date_desc') {
        return new Date(b.assessment_date).getTime() - new Date(a.assessment_date).getTime()
      } else if (filters.sortBy === 'date_asc') {
        return new Date(a.assessment_date).getTime() - new Date(b.assessment_date).getTime()
      } else if (filters.sortBy === 'score_desc') {
        const scoreA = a.max_score_at_submission > 0 ? (a.score / a.max_score_at_submission) * 100 : 0
        const scoreB = b.max_score_at_submission > 0 ? (b.score / b.max_score_at_submission) * 100 : 0
        return scoreB - scoreA
      } else if (filters.sortBy === 'score_asc') {
        const scoreA = a.max_score_at_submission > 0 ? (a.score / a.max_score_at_submission) * 100 : 0
        const scoreB = b.max_score_at_submission > 0 ? (b.score / b.max_score_at_submission) * 100 : 0
        return scoreA - scoreB
      }
      return 0
    })
  }

  return { assessments: filteredAssessments }
}

/**
 * テスト結果のサマリー統計を取得
 *
 * @returns 最新テスト、平均点、受験回数の統計
 */
export async function getAssessmentSummary() {
  const supabase = await createClient()

  // 認証チェック
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return {
      error: "認証が必要です",
      latest: null,
      averages: null,
      counts: { math: 0, kanji: 0, total: 0 }
    }
  }

  // 生徒情報を取得
  const { data: student } = await supabase
    .from("students")
    .select("id")
    .eq("user_id", user.id)
    .single()

  if (!student) {
    return {
      error: "生徒情報が見つかりません",
      latest: null,
      averages: null,
      counts: { math: 0, kanji: 0, total: 0 }
    }
  }

  // 全テスト結果を取得（完了済みのみ）
  const { data: allAssessments, error } = await supabase
    .from("class_assessments")
    .select(`
      id,
      score,
      max_score_at_submission,
      assessment_date,
      status,
      master:assessment_masters!class_assessments_master_id_fkey (
        id,
        title,
        assessment_type,
        max_score,
        session_number
      )
    `)
    .eq("student_id", student.id)
    .eq("status", "completed")
    .not("assessment_date", "is", null)
    .order("assessment_date", { ascending: false })

  if (error) {
    console.error("Error fetching assessment summary:", error)
    return {
      error: error.message,
      latest: null,
      averages: null,
      counts: { math: 0, kanji: 0, total: 0 }
    }
  }

  if (!allAssessments || allAssessments.length === 0) {
    return {
      latest: null,
      averages: null,
      counts: { math: 0, kanji: 0, total: 0 }
    }
  }

  // 算数プリントと漢字テストに分類
  const mathAssessments = allAssessments.filter(
    (a: any) => a.master?.assessment_type === 'math_print'
  )
  const kanjiAssessments = allAssessments.filter(
    (a: any) => a.master?.assessment_type === 'kanji_test'
  )

  // 最新テスト
  const latestMath = mathAssessments[0] || null
  const latestKanji = kanjiAssessments[0] || null

  // 平均点計算（直近3回）
  const calculateAverage = (assessments: any[]) => {
    const recent = assessments.slice(0, 3)
    if (recent.length === 0) return null

    const total = recent.reduce((sum, a) => {
      const percentage = a.max_score_at_submission > 0
        ? (a.score / a.max_score_at_submission) * 100
        : 0
      return sum + percentage
    }, 0)

    return Math.round(total / recent.length)
  }

  const mathAverage = calculateAverage(mathAssessments)
  const kanjiAverage = calculateAverage(kanjiAssessments)

  return {
    latest: {
      math: latestMath ? {
        id: latestMath.id,
        name: (latestMath as any).master?.title || null,
        score: latestMath.score,
        maxScore: latestMath.max_score_at_submission,
        percentage: latestMath.max_score_at_submission > 0
          ? Math.round((latestMath.score / latestMath.max_score_at_submission) * 100)
          : 0,
        submittedAt: latestMath.assessment_date
      } : null,
      kanji: latestKanji ? {
        id: latestKanji.id,
        name: (latestKanji as any).master?.title || null,
        score: latestKanji.score,
        maxScore: latestKanji.max_score_at_submission,
        percentage: latestKanji.max_score_at_submission > 0
          ? Math.round((latestKanji.score / latestKanji.max_score_at_submission) * 100)
          : 0,
        submittedAt: latestKanji.assessment_date
      } : null
    },
    averages: {
      math: mathAverage,
      kanji: kanjiAverage
    },
    counts: {
      math: mathAssessments.length,
      kanji: kanjiAssessments.length,
      total: allAssessments.length
    }
  }
}
