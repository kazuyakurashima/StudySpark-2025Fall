"use server"

import { createClient } from "@/lib/supabase/server"

export interface CoachStudent {
  id: string
  full_name: string
  nickname: string | null
  avatar_url: string | null
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
        nickname,
        avatar_url,
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

  // データを整形
  const students: CoachStudent[] =
    relations
      ?.map((rel: any) => rel.students)
      .filter(Boolean)
      .map((student: any) => ({
        id: student.id,
        full_name: student.full_name,
        nickname: student.nickname,
        avatar_url: student.avatar_url,
        grade: student.grade === 5 ? "小学5年" : "小学6年",
        course: student.course,
      })) || []

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
    .select("id, user_id, full_name, nickname, avatar_url, grade, course, target_school, target_class")
    .eq("id", studentId)
    .single()

  if (studentError || !student) {
    return { error: "生徒情報の取得に失敗しました" }
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
      ...student,
      grade: student.grade === 5 ? "小学5年" : "小学6年",
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

  // 学習履歴を取得
  const { data: studyLogs, error: logsError } = await supabase
    .from("study_logs")
    .select("*")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (logsError) {
    console.error("Failed to fetch study logs:", logsError)
    return { error: "学習履歴の取得に失敗しました" }
  }

  // 指導者からの応援メッセージを取得
  const studyLogIds = studyLogs.map((log) => log.id)
  const { data: encouragements } = await supabase
    .from("encouragements")
    .select("*")
    .eq("sender_role", "coach")
    .in("study_log_id", studyLogIds)

  // 学習履歴に応援メッセージを紐付け
  const logsWithEncouragement = studyLogs.map((log) => {
    const encouragement = encouragements?.find((e) => e.study_log_id === log.id)
    return {
      ...log,
      hasCoachResponse: !!encouragement,
      coachMessage: encouragement?.message || "",
      encouragementId: encouragement?.id || null,
    }
  })

  return { studyLogs: logsWithEncouragement }
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

  // 応援メッセージを保存
  const { data: encouragement, error: saveError } = await supabase
    .from("encouragements")
    .insert({
      student_id: studentId,
      sender_id: coach.id,
      sender_role: "coach",
      message,
      study_log_id: studyLogId,
    })
    .select()
    .single()

  if (saveError) {
    console.error("Failed to save encouragement:", saveError)
    return { error: "応援メッセージの送信に失敗しました" }
  }

  return { success: true, encouragement }
}
