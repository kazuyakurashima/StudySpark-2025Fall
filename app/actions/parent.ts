"use server"

import { createClient, createAdminClient } from "@/lib/supabase/server"
import { formatDateToJST, getNowJST } from "@/lib/utils/date-jst"

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
    .select("id, full_name, grade, user_id")
    .eq("id", studentId)
    .single()

  if (studentError || !student) {
    return { error: "生徒情報の取得に失敗しました", supabase: null, parent: null, student: null }
  }

  // Admin clientを使ってprofilesデータを取得（RLSバイパス）
  const adminClient = createAdminClient()
  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("display_name, avatar_id")
    .eq("id", student.user_id)
    .single()

  // profilesデータをマージ
  const studentWithProfile = {
    id: student.id,
    full_name: student.full_name,
    grade: student.grade,
    user_id: student.user_id,
    display_name: profile?.display_name || student.full_name,
    avatar_id: profile?.avatar_id || null
  }

  return { error: null, supabase, parent, student: studentWithProfile }
}

/**
 * 保護者の子ども一覧を取得
 */
export async function getParentChildren() {
  const supabase = await createClient()

  console.log("🔍 [SERVER] getParentChildren called")

  // 現在のユーザー取得
  const {
    data: { user },
  } = await supabase.auth.getUser()

  console.log("🔍 [SERVER] User:", user?.id, user?.email)

  if (!user) {
    return { error: "ログインが必要です" }
  }

  // 保護者情報取得
  const { data: parent, error: parentError } = await supabase
    .from("parents")
    .select("id")
    .eq("user_id", user.id)
    .single()

  console.log("🔍 [SERVER] Parent:", parent?.id, "Error:", parentError?.message)

  if (parentError || !parent) {
    return { error: "保護者情報が見つかりません" }
  }

  // Admin clientを使ってRLSをバイパス
  // 理由: profiles テーブルは "Users can view own profile" ポリシーにより、
  //       保護者が子どもの profiles を直接読み取れないため、
  //       親子関係を確認後、adminClient で profiles データを取得する
  const adminClient = createAdminClient()

  // parent_child_relations経由でstudent_id一覧を取得
  const { data: relations, error: relationsError } = await adminClient
    .from("parent_child_relations")
    .select("student_id")
    .eq("parent_id", parent.id)

  console.log("🔍 [SERVER] Relations count:", relations?.length, "Error:", relationsError?.message)

  if (relationsError) {
    return { error: "子ども情報の取得に失敗しました" }
  }

  if (!relations || relations.length === 0) {
    console.log("🔍 [SERVER] No relations found")
    return { children: [] }
  }

  // student_id一覧からstudentsデータを取得
  const studentIds = relations.map((r) => r.student_id)
  console.log("🔍 [SERVER] Student IDs:", studentIds)

  const { data: students, error: studentsError } = await adminClient
    .from("students")
    .select("id, full_name, grade, user_id")
    .in("id", studentIds)

  console.log("🔍 [SERVER] Students count:", students?.length, "Error:", studentsError?.message)

  if (studentsError || !students) {
    return { error: "生徒情報の取得に失敗しました" }
  }

  // 各生徒のprofileデータを取得
  const userIds = students.map((s) => s.user_id)
  const { data: profiles, error: profilesError } = await adminClient
    .from("profiles")
    .select("id, display_name, avatar_id")
    .in("id", userIds)

  console.log("🔍 [SERVER] Profiles count:", profiles?.length, "Error:", profilesError?.message)

  // studentsデータとprofilesデータをマージ
  const profileMap = new Map(profiles?.map(p => [p.id, p]) || [])
  const children = students.map((student) => {
    const profile = profileMap.get(student.user_id)
    return {
      id: student.id,
      full_name: student.full_name,
      display_name: profile?.display_name || student.full_name,
      grade: student.grade,
      user_id: student.user_id,
      avatar_id: profile?.avatar_id || null
    }
  })

  console.log("🔍 [SERVER] Final children:", JSON.stringify(children, null, 2))

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
  const tokyoNow = getNowJST()

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
    .gte("goal_setting_end_date", formatDateToJST(tokyoNow))
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
      batch_id,
      study_date,
      correct_count,
      total_problems,
      reflection_text,
      logged_at,
      session_id,
      subjects (id, name, color_code),
      study_content_types (id, content_name),
      study_sessions (id, session_number, start_date, end_date)
    `)
    .eq("student_id", studentId)

  // 科目フィルタ
  if (params?.subjectFilter && params.subjectFilter !== "all") {
    const subjectMap: Record<string, string> = {
      math: "算数",
      japanese: "国語",
      science: "理科",
      social: "社会",
    }
    const subjectName = subjectMap[params.subjectFilter]
    if (subjectName) {
      const { data: subjectData } = await supabase
        .from("subjects")
        .select("id")
        .eq("name", subjectName)
        .single()

      if (subjectData) {
        query = query.eq("subject_id", subjectData.id)
      }
    }
  }

  // 期間フィルタ
  if (params?.periodFilter === "1week") {
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
    query = query.gte("study_date", formatDateToJST(oneWeekAgo))
  } else if (params?.periodFilter === "1month") {
    const oneMonthAgo = new Date()
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)
    query = query.gte("study_date", formatDateToJST(oneMonthAgo))
  }

  // ソート順
  if (params?.sortBy === "session") {
    query = query.order("session_id", { ascending: false })
  } else if (params?.sortBy === "accuracy") {
    // 正答率は取得後にソート
    query = query.order("logged_at", { ascending: false })
  } else {
    query = query.order("logged_at", { ascending: false })
  }

  const { data: logs, error: queryError } = await query

  if (queryError) {
    return { error: queryError.message }
  }

  let processedLogs = logs || []

  // 正答率でソートする場合
  if (params?.sortBy === "accuracy" && processedLogs.length > 0) {
    processedLogs = [...processedLogs].sort((a, b) => {
      const accA = a.total_problems > 0 ? (a.correct_count / a.total_problems) * 100 : 0
      const accB = b.total_problems > 0 ? (b.correct_count / b.total_problems) * 100 : 0
      return accB - accA
    })
  }

  return { logs: processedLogs }
}

/**
 * 子どもの応援履歴データを取得（保護者用）
 */
export async function getChildEncouragementHistory(
  studentId: string,
  params?: {
    subjectFilter?: string
    periodFilter?: string
    sortBy?: string
    displayMode?: string
  }
) {
  console.log("[DEBUG getChildEncouragementHistory] Called with:", { studentId, params })

  const { error, supabase } = await verifyParentChildRelation(studentId)

  if (error || !supabase) {
    console.log("[DEBUG getChildEncouragementHistory] Verification error:", error)
    return { error: error || "認証エラー" }
  }

  console.log("[DEBUG getChildEncouragementHistory] Verification successful")

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
    .eq("student_id", parseInt(studentId))

  // 期間フィルタ
  if (params?.periodFilter === "1week") {
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
    query = query.gte("sent_at", oneWeekAgo.toISOString())
  } else if (params?.periodFilter === "1month") {
    const oneMonthAgo = new Date()
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)
    query = query.gte("sent_at", oneMonthAgo.toISOString())
  }

  // ソート順
  query = query.order("sent_at", { ascending: false })

  const { data: messages, error: queryError } = await query

  console.log("[DEBUG getChildEncouragementHistory] Query result:", { messagesCount: messages?.length, error: queryError })

  if (queryError) {
    console.log("[DEBUG getChildEncouragementHistory] Query error:", queryError.message)
    return { error: queryError.message }
  }

  let processedMessages = messages || []
  console.log("[DEBUG getChildEncouragementHistory] Processing messages:", processedMessages.length)

  // 送信者のプロフィール情報を取得（RPC経由で安全に取得）
  if (processedMessages.length > 0) {
    const senderIds = [...new Set(processedMessages.map(m => m.sender_id).filter(Boolean))]

    if (senderIds.length > 0) {
      const { data: senderProfiles, error: senderError } = await supabase.rpc("get_sender_profiles", {
        sender_ids: senderIds,
      })

      console.log("[DEBUG getChildEncouragementHistory] Sender profiles:", { profilesCount: senderProfiles?.length, error: senderError })

      if (!senderError && senderProfiles) {
        // メッセージに送信者プロフィールを追加
        processedMessages = processedMessages.map(msg => {
          const senderProfile = senderProfiles.find((profile: any) => profile.id === msg.sender_id)
          const profileWithFallback = senderProfile
            ? {
                ...senderProfile,
                nickname: senderProfile.nickname ?? senderProfile.display_name ?? "応援者",
                display_name: senderProfile.display_name ?? senderProfile.nickname ?? "応援者",
                avatar_id: senderProfile.avatar_id ?? senderProfile.avatar,
              }
            : { display_name: "応援者", avatar_id: null, nickname: "応援者" }

          return {
            ...msg,
            sender_profile: profileWithFallback,
          }
        })
      } else {
        // フォールバック: 送信者情報なしで返す
        processedMessages = processedMessages.map(msg => ({
          ...msg,
          sender_profile: { display_name: "応援者", avatar_id: null, nickname: "応援者" },
        }))
      }
    }
  }

  // 科目フィルタ（取得後に適用）
  if (params?.subjectFilter && params.subjectFilter !== "all") {
    const subjectMap: Record<string, string> = {
      math: "算数",
      japanese: "国語",
      science: "理科",
      social: "社会",
    }
    const subjectName = subjectMap[params.subjectFilter]
    if (subjectName) {
      processedMessages = processedMessages.filter((msg: any) => {
        const studyLog = Array.isArray(msg.study_logs) ? msg.study_logs[0] : msg.study_logs
        return studyLog?.subjects?.name === subjectName
      })
    }
  }

  // ソート処理（学習回順または正答率順）
  if (params?.sortBy === "session") {
    processedMessages = [...processedMessages].sort((a: any, b: any) => {
      const sessionA = (Array.isArray(a.study_logs) ? a.study_logs[0] : a.study_logs)?.study_sessions?.session_number || 0
      const sessionB = (Array.isArray(b.study_logs) ? b.study_logs[0] : b.study_logs)?.study_sessions?.session_number || 0
      return sessionB - sessionA
    })
  } else if (params?.sortBy === "accuracy") {
    processedMessages = [...processedMessages].sort((a: any, b: any) => {
      const logA = Array.isArray(a.study_logs) ? a.study_logs[0] : a.study_logs
      const logB = Array.isArray(b.study_logs) ? b.study_logs[0] : b.study_logs
      const accA = logA?.total_problems > 0 ? (logA.correct_count / logA.total_problems) * 100 : 0
      const accB = logB?.total_problems > 0 ? (logB.correct_count / logB.total_problems) * 100 : 0
      return accB - accA
    })
  }

  console.log("[DEBUG getChildEncouragementHistory] Returning messages:", processedMessages.length)
  return { messages: processedMessages }
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
