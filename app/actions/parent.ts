"use server"

import { createClient } from "@/lib/supabase/server"

/**
 * 保護者認証と親子関係の検証を行うヘルパー関数
 */
async function verifyParentChildRelation(studentId: string) {
  const supabase = await createClient()

  // 現在のユーザー取得
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "ログインが必要です", supabase: null, parent: null, student: null }
  }

  // 保護者情報取得
  const { data: parent, error: parentError } = await supabase
    .from("parents")
    .select("id")
    .eq("user_id", user.id)
    .single()

  if (parentError || !parent) {
    return { error: "保護者情報が見つかりません", supabase: null, parent: null, student: null }
  }

  // parent_child_relations経由で親子関係を確認
  const { data: relation, error: relationError } = await supabase
    .from("parent_child_relations")
    .select("student_id")
    .eq("student_id", studentId)
    .eq("parent_id", parent.id)
    .single()

  if (relationError || !relation) {
    return { error: "子ども情報が見つかりません", supabase: null, parent: null, student: null }
  }

  // 生徒の基本情報を取得
  const { data: student, error: studentError } = await supabase
    .from("students")
    .select("id, full_name, nickname, grade")
    .eq("id", studentId)
    .single()

  if (studentError || !student) {
    return { error: "生徒情報の取得に失敗しました", supabase: null, parent: null, student: null }
  }

  return { error: null, supabase, parent, student }
}

/**
 * 保護者の子ども一覧を取得
 */
export async function getParentChildren() {
  const supabase = await createClient()

  // 現在のユーザー取得
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "ログインが必要です" }
  }

  // 保護者情報取得
  const { data: parent, error: parentError } = await supabase
    .from("parents")
    .select("id")
    .eq("user_id", user.id)
    .single()

  if (parentError || !parent) {
    return { error: "保護者情報が見つかりません" }
  }

  // parent_child_relations経由で子ども一覧取得
  const { data: relations, error: relationsError } = await supabase
    .from("parent_child_relations")
    .select(`
      student_id,
      students (
        id,
        full_name,
        nickname,
        avatar_url,
        grade
      )
    `)
    .eq("parent_id", parent.id)

  if (relationsError) {
    return { error: "子ども情報の取得に失敗しました" }
  }

  // studentsデータを展開
  const children = relations?.map((r: any) => r.students).filter(Boolean) || []

  return { children }
}

/**
 * 子どもの目標一覧を取得（保護者用・読み取り専用）
 */
export async function getChildTestGoals(studentId: string) {
  const { error, supabase, student } = await verifyParentChildRelation(studentId)

  if (error || !supabase || !student) {
    return { error: error || "認証エラー" }
  }

  // 目標一覧を取得
  const { data: goals, error: goalsError } = await supabase
    .from("test_goals")
    .select(`
      id,
      test_schedule_id,
      target_course,
      target_class,
      goal_thoughts,
      created_at,
      test_schedules!inner (
        id,
        test_date,
        test_types!inner (
          id,
          name,
          grade
        )
      )
    `)
    .eq("student_id", studentId)
    .eq("test_schedules.test_types.grade", student.grade)
    .order("test_schedules.test_date", { ascending: false })

  if (goalsError) {
    return { error: "目標の取得に失敗しました" }
  }

  return { goals: goals || [], student }
}

/**
 * 子どもの特定テスト目標を取得（保護者用・読み取り専用）
 */
export async function getChildTestGoal(studentId: string, testScheduleId: string) {
  const { error, supabase, student } = await verifyParentChildRelation(studentId)

  if (error || !supabase || !student) {
    return { error: error || "認証エラー" }
  }

  // 目標を取得
  const { data: goal, error: goalError } = await supabase
    .from("test_goals")
    .select(`
      id,
      test_schedule_id,
      target_course,
      target_class,
      goal_thoughts,
      created_at,
      test_schedules!inner (
        id,
        test_date,
        test_types!inner (
          id,
          name
        )
      )
    `)
    .eq("student_id", studentId)
    .eq("test_schedule_id", testScheduleId)
    .single()

  if (goalError) {
    return { error: "目標が見つかりません", goal: null }
  }

  return { goal }
}

/**
 * 子どもの振り返り一覧を取得（保護者用・読み取り専用）
 */
export async function getChildReflections(studentId: string) {
  const { error, supabase, student } = await verifyParentChildRelation(studentId)

  if (error || !supabase || !student) {
    return { error: error || "認証エラー" }
  }

  // 振り返り一覧を取得（コーチングセッション完了済みのみ）
  const { data: reflections, error: reflectionsError } = await supabase
    .from("coaching_sessions")
    .select(`
      id,
      session_number,
      week_type,
      this_week_accuracy,
      last_week_accuracy,
      summary,
      completed_at,
      created_at
    `)
    .eq("student_id", studentId)
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false })

  if (reflectionsError) {
    return { error: "振り返りの取得に失敗しました" }
  }

  return { reflections: reflections || [], student }
}

/**
 * 子どもの特定振り返りの詳細を取得（保護者用・読み取り専用）
 */
export async function getChildReflection(studentId: string, sessionId: string) {
  const { error, supabase, student } = await verifyParentChildRelation(studentId)

  if (error || !supabase || !student) {
    return { error: error || "認証エラー" }
  }

  // セッション情報を取得
  const { data: session, error: sessionError } = await supabase
    .from("coaching_sessions")
    .select(`
      id,
      session_number,
      week_type,
      this_week_accuracy,
      last_week_accuracy,
      summary,
      completed_at,
      created_at
    `)
    .eq("id", sessionId)
    .eq("student_id", studentId)
    .not("completed_at", "is", null)
    .single()

  if (sessionError || !session) {
    return { error: "振り返りが見つかりません" }
  }

  // 対話履歴を取得
  const { data: messages, error: messagesError } = await supabase
    .from("coaching_messages")
    .select("id, role, content, turn_number, created_at")
    .eq("session_id", sessionId)
    .order("turn_number", { ascending: true })

  if (messagesError) {
    return { error: "対話履歴の取得に失敗しました" }
  }

  return { session, messages: messages || [], student }
}

/**
 * 子どもの利用可能なテスト日程を取得（保護者用）
 */
export async function getChildAvailableTests(studentId: string) {
  const { error, supabase, student } = await verifyParentChildRelation(studentId)

  if (error || !supabase || !student) {
    return { error: error || "認証エラー" }
  }

  // 現在日時（Asia/Tokyo）
  const now = new Date()
  const tokyoNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }))

  // 目標設定期間内のテスト日程を取得
  const { data: tests, error: testsError } = await supabase
    .from("test_schedules")
    .select(`
      id,
      test_type_id,
      test_date,
      goal_setting_start_date,
      goal_setting_end_date,
      test_types!inner (
        id,
        name,
        grade
      )
    `)
    .eq("test_types.grade", student.grade)
    .gte("goal_setting_end_date", tokyoNow.toISOString().split("T")[0])
    .order("test_date", { ascending: true })

  if (testsError) {
    return { error: "テスト日程の取得に失敗しました" }
  }

  // 期間チェック
  const availableTests = (tests || []).filter((test) => {
    const startDate = new Date(test.goal_setting_start_date)
    const endDate = new Date(test.goal_setting_end_date)
    return tokyoNow >= startDate && tokyoNow <= endDate
  })

  return { tests: availableTests, student }
}

/**
 * 子どもの達成マップデータを取得（保護者用）
 */
export async function getChildAchievementMapData(studentId: string) {
  const { error, supabase } = await verifyParentChildRelation(studentId)

  if (error || !supabase) {
    return { error: error || "認証エラー" }
  }

  const { data: logs, error: logsError } = await supabase
    .from("study_logs")
    .select(`
      id,
      study_date,
      correct_count,
      total_problems,
      logged_at,
      subjects (name, color_code),
      study_content_types (content_name),
      study_sessions (session_number)
    `)
    .eq("student_id", studentId)
    .order("study_date", { ascending: true })

  if (logsError) {
    return { error: "学習ログの取得に失敗しました" }
  }

  return { logs: logs || [] }
}

/**
 * 子どもの学習履歴データを取得（保護者用）
 */
export async function getChildStudyHistory(
  studentId: string,
  params?: {
    subjectFilter?: string
    periodFilter?: string
    sortBy?: string
  }
) {
  const { error, supabase } = await verifyParentChildRelation(studentId)

  if (error || !supabase) {
    return { error: error || "認証エラー" }
  }

  let query = supabase
    .from("study_logs")
    .select(`
      id,
      study_date,
      correct_count,
      total_problems,
      reflection_text,
      logged_at,
      subjects (id, name, color_code),
      study_content_types (id, content_name),
      study_sessions (id, session_number, start_date, end_date)
    `)
    .eq("student_id", studentId)

  if (params?.periodFilter === "1week") {
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
    query = query.gte("study_date", oneWeekAgo.toISOString().split("T")[0])
  } else if (params?.periodFilter === "1month") {
    const oneMonthAgo = new Date()
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)
    query = query.gte("study_date", oneMonthAgo.toISOString().split("T")[0])
  }

  query = query.order("logged_at", { ascending: false })

  const { data: logs, error: queryError } = await query

  if (queryError) {
    return { error: queryError.message }
  }

  return { logs: logs || [] }
}

/**
 * 子どもの応援履歴データを取得（保護者用）
 */
export async function getChildEncouragementHistory(
  studentId: string,
  params?: {
    periodFilter?: string
  }
) {
  const { error, supabase } = await verifyParentChildRelation(studentId)

  if (error || !supabase) {
    return { error: error || "認証エラー" }
  }

  let query = supabase
    .from("encouragement_messages")
    .select(`
      id,
      message_text,
      sent_at,
      is_read,
      created_at,
      sender_id,
      sender_profile:user_profiles!encouragement_messages_sender_id_fkey (
        full_name,
        nickname,
        avatar,
        role
      ),
      study_logs (
        id,
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
    .eq("recipient_id", studentId)

  if (params?.periodFilter === "1week") {
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
    query = query.gte("sent_at", oneWeekAgo.toISOString())
  } else if (params?.periodFilter === "1month") {
    const oneMonthAgo = new Date()
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)
    query = query.gte("sent_at", oneMonthAgo.toISOString())
  }

  query = query.order("sent_at", { ascending: false })

  const { data: messages, error: queryError } = await query

  if (queryError) {
    return { error: queryError.message }
  }

  return { messages: messages || [] }
}

/**
 * 子どものコーチング履歴データを取得（保護者用）
 */
export async function getChildCoachingHistory(
  studentId: string,
  params?: {
    periodFilter?: string
  }
) {
  const { error, supabase } = await verifyParentChildRelation(studentId)

  if (error || !supabase) {
    return { error: error || "認証エラー" }
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
    .eq("student_id", studentId)
    .eq("status", "completed")

  if (params?.periodFilter === "1week") {
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
    query = query.gte("completed_at", oneWeekAgo.toISOString())
  } else if (params?.periodFilter === "1month") {
    const oneMonthAgo = new Date()
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)
    query = query.gte("completed_at", oneMonthAgo.toISOString())
  }

  query = query.order("completed_at", { ascending: false })

  const { data: sessions, error: queryError } = await query

  if (queryError) {
    return { error: queryError.message }
  }

  return { sessions: sessions || [] }
}
