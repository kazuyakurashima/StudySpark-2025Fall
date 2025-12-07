"use server"

import { createClient } from "@/lib/supabase/server"

export interface CoachStudent {
  id: string
  full_name: string
  nickname: string | null
  avatar_id: string | null
  custom_avatar_url: string | null
  grade: string
  course: string | null
}

/**
 * 指導者が担当する生徒一覧を取得
 */
export async function getCoachStudents() {
  const supabase = await createClient()

  // 現在の指導者を取得
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "認証が必要です" }
  }

  // 指導者IDを取得
  const { data: coach, error: coachError } = await supabase
    .from("coaches")
    .select("id")
    .eq("user_id", user.id)
    .single()

  if (coachError || !coach) {
    return { error: "指導者情報が見つかりません" }
  }

  // 担当生徒の関係を取得
  const { data: relations, error: relationsError } = await supabase
    .from("coach_student_relations")
    .select(
      `
      student_id,
      students (
        id,
        user_id,
        full_name,
        grade,
        course
      )
    `
    )
    .eq("coach_id", coach.id)

  if (relationsError) {
    console.error("Failed to fetch coach-student relations:", relationsError)
    return { error: "生徒一覧の取得に失敗しました" }
  }

  // 生徒のuser_idを取得してprofilesからnickname/avatar_idを取得
  const studentUserIds = relations
    ?.map((rel: any) => rel.students?.user_id)
    .filter(Boolean) || []

  let profilesMap: Record<string, { nickname: string | null; avatar_id: string | null; custom_avatar_url: string | null }> = {}

  if (studentUserIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, nickname, avatar_id, custom_avatar_url")
      .in("id", studentUserIds)

    if (profiles) {
      profilesMap = profiles.reduce((acc, profile) => {
        acc[profile.id] = {
          nickname: profile.nickname,
          avatar_id: profile.avatar_id,
          custom_avatar_url: profile.custom_avatar_url
        }
        return acc
      }, {} as Record<string, { nickname: string | null; avatar_id: string | null; custom_avatar_url: string | null }>)
    }
  }

  // データを整形
  const students: CoachStudent[] =
    relations
      ?.map((rel: any) => rel.students)
      .filter(Boolean)
      .map((student: any) => {
        const profile = profilesMap[student.user_id] || { nickname: null, avatar_id: null, custom_avatar_url: null }
        return {
          id: String(student.id),
          full_name: student.full_name,
          nickname: profile.nickname,
          avatar_id: profile.avatar_id,
          custom_avatar_url: profile.custom_avatar_url,
          grade: student.grade === 5 ? "小学5年" : "小学6年",
          course: student.course,
        }
      }) || []

  return { students }
}

/**
 * 特定の生徒の詳細情報を取得
 */
export async function getStudentDetail(studentId: string) {
  const supabase = await createClient()

  // 現在の指導者を取得
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "認証が必要です" }
  }

  // 指導者IDを取得
  const { data: coach, error: coachError } = await supabase
    .from("coaches")
    .select("id")
    .eq("user_id", user.id)
    .single()

  if (coachError || !coach) {
    return { error: "指導者情報が見つかりません" }
  }

  // 担当生徒かチェック
  const { data: relation } = await supabase
    .from("coach_student_relations")
    .select("id")
    .eq("coach_id", coach.id)
    .eq("student_id", studentId)
    .single()

  if (!relation) {
    return { error: "この生徒にアクセスする権限がありません" }
  }

  // 生徒の詳細情報を取得
  const { data: student, error: studentError } = await supabase
    .from("students")
    .select("id, user_id, full_name, grade, course, target_school, target_class")
    .eq("id", studentId)
    .single()

  if (studentError || !student) {
    return { error: "生徒情報の取得に失敗しました" }
  }

  // profilesからnickname/avatar_id/custom_avatar_urlを取得
  const { data: profile } = await supabase
    .from("profiles")
    .select("nickname, avatar_id, custom_avatar_url")
    .eq("id", student.user_id)
    .single()

  const studentWithProfile = {
    ...student,
    nickname: profile?.nickname || null,
    avatar_id: profile?.avatar_id || null,
    custom_avatar_url: profile?.custom_avatar_url || null,
  }

  // 学習履歴を取得（最新50件）
  const { data: studyLogs, error: logsError } = await supabase
    .from("study_logs")
    .select("*")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false })
    .limit(50)

  if (logsError) {
    console.error("Failed to fetch study logs:", logsError)
  }

  // 連続日数を計算
  const { data: streakData } = await supabase.rpc("calculate_streak", {
    p_student_id: studentId,
  })

  // 今週の学習記録数（週リング相当）
  const startOfWeek = new Date()
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1) // 月曜日
  startOfWeek.setHours(0, 0, 0, 0)

  const weekLogs = studyLogs?.filter((log) => new Date(log.created_at) >= startOfWeek) || []

  // 最新の正答率を計算
  const recentLogs = studyLogs?.slice(0, 10) || []
  const recentScore =
    recentLogs.length > 0
      ? Math.round(
          (recentLogs.reduce((sum, log) => sum + (log.correct_count / log.total_questions) * 100, 0) /
            recentLogs.length) *
            10
        ) / 10
      : 0

  return {
    student: {
      ...studentWithProfile,
      grade: studentWithProfile.grade === 5 ? "小学5年" : "小学6年",
      streak: streakData || 0,
      weekRing: weekLogs.length,
      recentScore,
    },
    studyLogs: studyLogs || [],
  }
}

/**
 * 生徒の学習履歴を取得（応援機能用）
 */
export async function getStudentLearningHistory(studentId: string, limit = 20) {
  const supabase = await createClient()

  // 現在の指導者を取得
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "認証が必要です" }
  }

  // 指導者IDを取得
  const { data: coach, error: coachError } = await supabase
    .from("coaches")
    .select("id")
    .eq("user_id", user.id)
    .single()

  if (coachError || !coach) {
    return { error: "指導者情報が見つかりません" }
  }

  // 担当生徒かチェック
  const { data: relation } = await supabase
    .from("coach_student_relations")
    .select("id")
    .eq("coach_id", coach.id)
    .eq("student_id", studentId)
    .single()

  if (!relation) {
    return { error: "この生徒にアクセスする権限がありません" }
  }

  // 学習履歴を取得（batch_idとリレーション情報を含む）
  const { data: studyLogs, error: logsError } = await supabase
    .from("study_logs")
    .select(`
      id,
      student_id,
      session_id,
      logged_at,
      study_date,
      correct_count,
      total_problems,
      reflection_text,
      understanding_level,
      batch_id,
      created_at,
      subjects (name, color_code),
      study_content_types (content_name),
      study_sessions (session_number, start_date, end_date)
    `)
    .eq("student_id", studentId)
    .order("study_date", { ascending: false })
    .order("logged_at", { ascending: false })
    .limit(limit * 4) // バッチグループ化のため多めに取得

  if (logsError) {
    console.error("Failed to fetch study logs:", logsError)
    return { error: "学習履歴の取得に失敗しました" }
  }

  if (!studyLogs || studyLogs.length === 0) {
    return { studyLogs: [], batchFeedbacks: {}, legacyFeedbacks: {} }
  }

  // batch_idを収集（NULL以外）
  const batchIds = [...new Set(studyLogs.map(log => log.batch_id).filter((id): id is string => id !== null))]

  // batch_idがあるものはbatch単位でフィードバック取得
  let batchFeedbacks: Record<string, string> = {}
  if (batchIds.length > 0) {
    const { data: feedbacks, error: feedbackError } = await supabase
      .from("coach_feedbacks")
      .select("batch_id, feedback_text")
      .in("batch_id", batchIds)

    if (!feedbackError && feedbacks) {
      feedbacks.forEach(f => {
        if (f.batch_id) {
          batchFeedbacks[f.batch_id] = f.feedback_text
        }
      })
    }
  }

  // batch_idがNULLのログ用にstudy_log_idベースでフィードバック取得（レガシー対応）
  const legacyLogIds = studyLogs.filter(log => log.batch_id === null).map(log => log.id)
  let legacyFeedbacks: Record<number, string> = {}
  if (legacyLogIds.length > 0) {
    const { data: legacyFb, error: legacyError } = await supabase
      .from("coach_feedbacks")
      .select("study_log_id, feedback_text")
      .in("study_log_id", legacyLogIds)
      .is("batch_id", null)

    if (!legacyError && legacyFb) {
      legacyFb.forEach(f => {
        legacyFeedbacks[f.study_log_id] = f.feedback_text
      })
    }
  }

  // 指導者からの応援メッセージを取得
  const studyLogIds = studyLogs.map((log) => log.id)
  const { data: encouragements } = await supabase
    .from("encouragement_messages")
    .select("*")
    .eq("sender_role", "coach")
    .in("related_study_log_id", studyLogIds)

  // 学習履歴に応援メッセージを紐付け（フロント互換のためsubject/reflection/total_questionsを追加）
  const logsWithEncouragement = studyLogs.map((log) => {
    const encouragement = encouragements?.find((e) => e.related_study_log_id === log.id)
    return {
      ...log,
      // フロント互換フィールド
      subject: (log.subjects as any)?.name || "",
      reflection: log.reflection_text,
      total_questions: log.total_problems,
      // 応援メッセージ情報
      hasCoachResponse: !!encouragement,
      coachMessage: encouragement?.message || "",
      encouragementId: encouragement?.id || null,
    }
  })

  return { studyLogs: logsWithEncouragement, batchFeedbacks, legacyFeedbacks }
}

/**
 * 生徒に応援メッセージを送信
 */
export async function sendEncouragementToStudent(studentId: string, studyLogId: string, message: string) {
  const supabase = await createClient()

  // 現在の指導者を取得
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "認証が必要です" }
  }

  // 指導者IDを取得
  const { data: coach, error: coachError } = await supabase
    .from("coaches")
    .select("id")
    .eq("user_id", user.id)
    .single()

  if (coachError || !coach) {
    return { error: "指導者情報が見つかりません" }
  }

  // 担当生徒かチェック
  const { data: relation } = await supabase
    .from("coach_student_relations")
    .select("id")
    .eq("coach_id", coach.id)
    .eq("student_id", studentId)
    .single()

  if (!relation) {
    return { error: "この生徒にアクセスする権限がありません" }
  }

  // support_typeを判定（スタンプ=quick、それ以外=custom）
  const isStamp = message.length <= 2 && /[\u{1F300}-\u{1F9FF}]/u.test(message)
  const supportType = isStamp ? "quick" : "custom"

  // 応援メッセージを保存
  const { data: encouragement, error: saveError } = await supabase
    .from("encouragement_messages")
    .insert({
      student_id: studentId,
      sender_id: user.id,  // auth.users.idを使用
      sender_role: "coach",
      message,
      related_study_log_id: studyLogId,
      support_type: supportType,
    })
    .select()
    .single()

  if (saveError) {
    console.error("Failed to save encouragement:", saveError)
    return { error: "応援メッセージの送信に失敗しました" }
  }

  return { success: true, encouragement }
}

export interface LearningRecordWithEncouragements {
  id: string
  studentId: string
  studentName: string
  studentNickname: string | null
  studentAvatar: string | null
  studentCustomAvatarUrl: string | null
  grade: string
  subject: string
  content: string
  totalQuestions: number
  correctCount: number
  /** 記録時刻（logged_at）- バッチグループ化の基準 */
  timestamp: string
  /** バッチID（同時保存されたログのグループ識別子、nullの場合は単独ログ） */
  batchId: string | null
  /** 学習日（YYYY-MM-DD形式） */
  studyDate: string
  parentEncouragements: {
    id: string
    message: string
    senderName: string
    timestamp: string
  }[]
  coachEncouragements: {
    id: string
    message: string
    senderName: string
    timestamp: string
  }[]
}

/**
 * 担当生徒の学習記録を取得（応援機能用）
 */
export async function getCoachStudentLearningRecords(limit = 50) {
  const supabase = await createClient()

  // 現在の指導者を取得
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "認証が必要です" }
  }

  // 指導者IDを取得
  const { data: coach, error: coachError } = await supabase
    .from("coaches")
    .select("id")
    .eq("user_id", user.id)
    .single()

  if (coachError || !coach) {
    return { error: "指導者情報が見つかりません" }
  }

  console.log("[getCoachStudentLearningRecords] Coach ID:", coach.id)

  // 担当生徒のIDを取得
  const { data: relations, error: relationsError } = await supabase
    .from("coach_student_relations")
    .select("student_id")
    .eq("coach_id", coach.id)

  if (relationsError) {
    console.error("Failed to fetch coach-student relations:", relationsError)
    return { error: "担当生徒の取得に失敗しました" }
  }

  console.log("[getCoachStudentLearningRecords] Relations:", relations)

  const studentIds = relations?.map((rel) => rel.student_id) || []

  if (studentIds.length === 0) {
    console.log("[getCoachStudentLearningRecords] No students found, returning empty records")
    return { records: [] }
  }

  console.log("[getCoachStudentLearningRecords] Fetching logs for student IDs:", studentIds)

  // 担当生徒の学習記録を取得（logged_at基準でソート）
  const { data: studyLogs, error: logsError } = await supabase
    .from("study_logs")
    .select(`
      id,
      student_id,
      subject_id,
      reflection_text,
      total_problems,
      correct_count,
      logged_at,
      batch_id,
      study_date,
      students (
        id,
        user_id,
        full_name,
        grade
      ),
      subjects (
        id,
        name
      )
    `)
    .in("student_id", studentIds)
    .order("logged_at", { ascending: false })
    .limit(limit)

  console.log("[getCoachStudentLearningRecords] Query error:", logsError)

  if (logsError) {
    console.error("Failed to fetch study logs:", logsError)
    return { error: "学習記録の取得に失敗しました" }
  }

  // デバッグ: 取得したデータを確認
  console.log("[getCoachStudentLearningRecords] Study logs count:", studyLogs?.length || 0)
  if (studyLogs && studyLogs.length > 0) {
    console.log("[getCoachStudentLearningRecords] First log sample:", JSON.stringify({
      id: studyLogs[0].id,
      student_id: studyLogs[0].student_id,
      students: studyLogs[0].students,
      subjects: studyLogs[0].subjects
    }, null, 2))
  }

  // 生徒のuser_idを取得してprofilesからnickname/avatar_idを取得
  const studentUserIds = studyLogs
    ?.map((log: any) => log.students?.user_id)
    .filter(Boolean) || []

  console.log("[getCoachStudentLearningRecords] Student user IDs:", studentUserIds)

  let profilesMap: Record<string, { nickname: string | null; avatar_id: string | null; custom_avatar_url: string | null }> = {}

  if (studentUserIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, nickname, avatar_id, custom_avatar_url")
      .in("id", studentUserIds)

    if (profiles) {
      profilesMap = profiles.reduce((acc, profile) => {
        acc[profile.id] = {
          nickname: profile.nickname,
          avatar_id: profile.avatar_id,
          custom_avatar_url: profile.custom_avatar_url
        }
        return acc
      }, {} as Record<string, { nickname: string | null; avatar_id: string | null; custom_avatar_url: string | null }>)
    }
  }

  // 学習記録IDを取得
  const studyLogIds = studyLogs?.map((log) => log.id) || []

  // 応援メッセージを取得
  let encouragements: any[] = []
  if (studyLogIds.length > 0) {
    const { data: encData } = await supabase
      .from("encouragement_messages")
      .select(`
        id,
        message,
        sender_role,
        related_study_log_id,
        created_at,
        sender_id
      `)
      .in("related_study_log_id", studyLogIds)

    encouragements = encData || []
  }

  // データを整形
  const records: LearningRecordWithEncouragements[] = studyLogs?.map((log: any) => {
    const profile = profilesMap[log.students?.user_id] || { nickname: null, avatar_id: null, custom_avatar_url: null }
    const logEncouragements = encouragements.filter((e) => e.related_study_log_id === log.id)

    return {
      id: log.id,
      studentId: log.student_id,
      studentName: log.students?.full_name || "不明",
      studentNickname: profile.nickname,
      studentAvatar: profile.avatar_id,
      studentCustomAvatarUrl: profile.custom_avatar_url,
      grade: log.students?.grade === 5 ? "小学5年" : "小学6年",
      subject: log.subjects?.name || "不明",
      content: log.reflection_text || "",
      totalQuestions: log.total_problems || 0,
      correctCount: log.correct_count || 0,
      timestamp: log.logged_at,
      batchId: log.batch_id || null,
      studyDate: log.study_date || log.logged_at?.split("T")[0] || "",
      parentEncouragements: logEncouragements
        .filter((e) => e.sender_role === "parent")
        .map((e) => ({
          id: e.id,
          message: e.message,
          senderName: "保護者",
          timestamp: e.created_at,
        })),
      coachEncouragements: logEncouragements
        .filter((e) => e.sender_role === "coach")
        .map((e) => ({
          id: e.id,
          message: e.message,
          senderName: "指導者",
          timestamp: e.created_at,
        })),
    }
  }) || []

  console.log("[getCoachStudentLearningRecords] Final records count:", records.length)
  if (records.length > 0) {
    console.log("[getCoachStudentLearningRecords] First record sample:", JSON.stringify({
      id: records[0].id,
      studentId: records[0].studentId,
      studentName: records[0].studentName,
      studentNickname: records[0].studentNickname,
      studentAvatar: records[0].studentAvatar,
      grade: records[0].grade,
      subject: records[0].subject
    }, null, 2))
  }

  return { records }
}

export interface InactiveStudentData {
  id: string
  name: string
  nickname: string | null
  avatar: string | null
  customAvatarUrl: string | null
  grade: string
  lastInputDate: string | null
  daysInactive: number
}

/**
 * 未入力生徒一覧を取得
 */
export async function getInactiveStudents(thresholdDays = 7) {
  const supabase = await createClient()

  // 現在の指導者を取得
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "認証が必要です" }
  }

  // 指導者IDを取得
  const { data: coach, error: coachError } = await supabase
    .from("coaches")
    .select("id")
    .eq("user_id", user.id)
    .single()

  if (coachError || !coach) {
    return { error: "指導者情報が見つかりません" }
  }

  // 担当生徒を取得
  const { data: relations, error: relationsError } = await supabase
    .from("coach_student_relations")
    .select(`
      student_id,
      students (
        id,
        user_id,
        full_name,
        grade
      )
    `)
    .eq("coach_id", coach.id)

  if (relationsError) {
    console.error("Failed to fetch coach-student relations:", relationsError)
    return { error: "担当生徒の取得に失敗しました" }
  }

  // 生徒のuser_idを取得してprofilesからnickname/avatar_idを取得
  const studentUserIds = relations
    ?.map((rel: any) => rel.students?.user_id)
    .filter(Boolean) || []

  let profilesMap: Record<string, { nickname: string | null; avatar_id: string | null; custom_avatar_url: string | null }> = {}

  if (studentUserIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, nickname, avatar_id, custom_avatar_url")
      .in("id", studentUserIds)

    if (profiles) {
      profilesMap = profiles.reduce((acc, profile) => {
        acc[profile.id] = {
          nickname: profile.nickname,
          avatar_id: profile.avatar_id,
          custom_avatar_url: profile.custom_avatar_url
        }
        return acc
      }, {} as Record<string, { nickname: string | null; avatar_id: string | null; custom_avatar_url: string | null }>)
    }
  }

  // 各生徒の最新学習記録を取得
  const students = relations?.map((rel: any) => rel.students).filter(Boolean) || []
  const studentIds = students.map((s: any) => s.id)

  let lastStudyDates: Record<string, string> = {}
  if (studentIds.length > 0) {
    // 各生徒の最新学習日を取得
    for (const studentId of studentIds) {
      const { data: lastLog } = await supabase
        .from("study_logs")
        .select("created_at")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single()

      if (lastLog) {
        lastStudyDates[studentId] = lastLog.created_at
      }
    }
  }

  // 未入力日数を計算
  const now = new Date()
  const inactiveStudents: InactiveStudentData[] = students
    .map((student: any) => {
      const profile = profilesMap[student.user_id] || { nickname: null, avatar_id: null, custom_avatar_url: null }
      const lastDate = lastStudyDates[student.id]
      let daysInactive = Infinity

      if (lastDate) {
        const lastDateTime = new Date(lastDate)
        daysInactive = Math.floor((now.getTime() - lastDateTime.getTime()) / (1000 * 60 * 60 * 24))
      }

      return {
        id: student.id,
        name: student.full_name,
        nickname: profile.nickname,
        avatar: profile.avatar_id,
        customAvatarUrl: profile.custom_avatar_url,
        grade: student.grade === 5 ? "小学5年" : "小学6年",
        lastInputDate: lastDate || null,
        daysInactive: lastDate ? daysInactive : Infinity,
      }
    })
    .filter((student: InactiveStudentData) => student.daysInactive >= thresholdDays)
    .sort((a: InactiveStudentData, b: InactiveStudentData) => b.daysInactive - a.daysInactive)

  return { students: inactiveStudents }
}
