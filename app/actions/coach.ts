"use server"

import { createClient } from "@/lib/supabase/server"
import { gradeToString, getAssessmentTitle } from "@/lib/utils/grade-converter"
import { getTodayJST } from "@/lib/utils/date-jst"

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

  // 担当生徒の関係を取得（卒業生を除外）
  const { data: relations, error: relationsError } = await supabase
    .from("coach_student_relations")
    .select(
      `
      student_id,
      students!inner (
        id,
        user_id,
        full_name,
        grade,
        course
      )
    `
    )
    .eq("coach_id", coach.id)
    .is("students.graduated_at", null)

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

  // 担当生徒かチェック（卒業生を除外）
  const { data: relation } = await supabase
    .from("coach_student_relations")
    .select("id, students!inner(id)")
    .eq("coach_id", coach.id)
    .eq("student_id", Number(studentId))
    .is("students.graduated_at", null)
    .single()

  if (!relation) {
    return { error: "この生徒にアクセスする権限がありません" }
  }

  // 生徒の詳細情報を取得
  const { data: student, error: studentError } = await supabase
    .from("students")
    .select("id, user_id, full_name, grade, course")
    .eq("id", Number(studentId))
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
    nickname: profile?.nickname ?? null,
    avatar_id: profile?.avatar_id ?? null,
    custom_avatar_url: profile?.custom_avatar_url ?? null,
  }

  // 学習履歴を取得（最新50件）
  const { data: studyLogs, error: logsError } = await supabase
    .from("study_logs")
    .select("*")
    .eq("student_id", Number(studentId))
    .order("created_at", { ascending: false })
    .limit(50)

  if (logsError) {
    console.error("Failed to fetch study logs:", logsError)
  }

  // 連続日数を計算
  const { data: streakData } = await supabase.rpc("calculate_streak" as any, {
    p_student_id: Number(studentId),
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
          (recentLogs.reduce((sum, log) => sum + (log.correct_count / log.total_problems) * 100, 0) /
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

  // 担当生徒かチェック（卒業生を除外）
  const { data: relation } = await supabase
    .from("coach_student_relations")
    .select("id, students!inner(id)")
    .eq("coach_id", coach.id)
    .eq("student_id", Number(studentId))
    .is("students.graduated_at", null)
    .single()

  if (!relation) {
    return { error: "この生徒にアクセスする権限がありません" }
  }

  // 学習履歴を取得（batch_idとリレーション情報を含む）
  // studentIdを数値に変換（DBのstudent_idがinteger型の場合）
  const studentIdNum = Number(studentId)

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
      batch_id,
      created_at,
      subjects (name, color_code),
      study_content_types (content_name),
      study_sessions (session_number, start_date, end_date)
    `)
    .eq("student_id", studentIdNum)
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
  const batchFeedbacks: Record<string, string> = {}
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
  const legacyFeedbacks: Record<number, string> = {}
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

  // 担当生徒かチェック（卒業生を除外）
  const { data: relation } = await supabase
    .from("coach_student_relations")
    .select("id, students!inner(id)")
    .eq("coach_id", coach.id)
    .eq("student_id", Number(studentId))
    .is("students.graduated_at", null)
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
      student_id: Number(studentId),
      sender_id: user.id,  // auth.users.idを使用
      sender_role: "coach" as const,
      message,
      related_study_log_id: Number(studyLogId),
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

  // 担当生徒のIDを取得（卒業生を除外）
  const { data: relations, error: relationsError } = await supabase
    .from("coach_student_relations")
    .select("student_id, students!inner(id)")
    .eq("coach_id", coach.id)
    .is("students.graduated_at", null)

  if (relationsError) {
    console.error("Failed to fetch coach-student relations:", relationsError)
    return { error: "担当生徒の取得に失敗しました" }
  }

  const studentIds = relations?.map((rel) => rel.student_id) || []

  if (studentIds.length === 0) {
    return { records: [] }
  }

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

  if (logsError) {
    console.error("Failed to fetch study logs:", logsError)
    return { error: "学習記録の取得に失敗しました" }
  }

  // 生徒のuser_idを取得してprofilesからnickname/avatar_idを取得
  const studentUserIds = studyLogs
    ?.map((log: any) => log.students?.user_id)
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
// ==================== 分析ページ用API ====================

export type TrendType = "up" | "stable" | "down" | "insufficient"
export type BinType = "excellent" | "good" | "improving" | "needs_support"

export interface SubjectAverage {
  subject: "算数" | "国語" | "理科" | "社会"
  average: number
  sampleSize: number
  trend: TrendType
  currentAvg: number | null
  previousAvg: number | null
}

export interface DistributionBin {
  bin: BinType
  label: string
  count: number
  studentIds: string[]
  color: string
}

export interface SubjectTrend {
  subject: string
  trend: TrendType
  currentAvg: number | null
  previousAvg: number | null
  sampleSize: number
}

export interface StudentTrend {
  studentId: string
  studentName: string
  nickname: string | null
  avatarId: string | null
  customAvatarUrl: string | null
  grade: number
  overallAccuracy: number | null
  subjectTrends: SubjectTrend[]
}

export interface CoachAnalysisMeta {
  totalStudents: number
  periodStart: string
  periodEnd: string
  fetchedAt: number
}

export interface CoachAnalysisResult {
  subjectAverages: SubjectAverage[]
  distribution: DistributionBin[]
  studentTrends: StudentTrend[]
  meta: CoachAnalysisMeta
  error?: string
}

/**
 * 正答率からビンを判定（整数%で丸めてから判定）
 */
function getAccuracyBin(accuracy: number): BinType {
  const rounded = Math.round(accuracy)
  if (rounded >= 90) return "excellent"
  if (rounded >= 70) return "good"
  if (rounded >= 50) return "improving"
  return "needs_support"
}

/**
 * トレンドを計算（小数点1桁で比較、±5%閾値）
 */
function calculateTrend(currentAvg: number | null, previousAvg: number | null, currentCount: number, previousCount: number): TrendType {
  // 各期間で3件以上必要
  if (currentCount < 3 || previousCount < 3 || currentAvg === null || previousAvg === null) {
    return "insufficient"
  }

  // 小数点1桁で差分を計算
  const diff = Math.round((currentAvg - previousAvg) * 10) / 10

  if (diff >= 5) return "up"
  if (diff <= -5) return "down"
  return "stable"
}

/**
 * JST（Asia/Tokyo）で日付の開始時刻を取得
 */
function getJSTStartOfDay(date: Date): Date {
  // JSTはUTC+9
  const jstOffset = 9 * 60 * 60 * 1000
  const utcTime = date.getTime()
  const jstTime = new Date(utcTime + jstOffset)
  jstTime.setUTCHours(0, 0, 0, 0)
  return new Date(jstTime.getTime() - jstOffset)
}

/**
 * 分析ページ用データ取得
 * @param grade - 学年フィルタ（"5" | "6" | "all"）
 * @returns 分析データ
 */
export async function getCoachAnalysisData(
  grade: "5" | "6" | "all" = "all"
): Promise<CoachAnalysisResult> {
  const supabase = await createClient()
  const now = new Date()
  const fetchedAt = now.getTime()

  // 期間設定（JSTで計算）
  const periodEnd = getJSTStartOfDay(now)
  periodEnd.setDate(periodEnd.getDate() + 1) // 今日の終わりまで

  const periodStart = new Date(periodEnd)
  periodStart.setDate(periodStart.getDate() - 14) // 14日前から

  const midPoint = new Date(periodEnd)
  midPoint.setDate(midPoint.getDate() - 7) // 7日前（前半/後半の境界）

  // 空の結果
  const emptyResult: CoachAnalysisResult = {
    subjectAverages: [],
    distribution: [
      { bin: "excellent", label: "🌟 習熟", count: 0, studentIds: [], color: "emerald-500" },
      { bin: "good", label: "✓ 順調", count: 0, studentIds: [], color: "blue-500" },
      { bin: "improving", label: "📈 成長中", count: 0, studentIds: [], color: "amber-500" },
      { bin: "needs_support", label: "💪 サポート", count: 0, studentIds: [], color: "red-500" },
    ],
    studentTrends: [],
    meta: {
      totalStudents: 0,
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      fetchedAt,
    },
  }

  // 現在の指導者を取得
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { ...emptyResult, error: "認証が必要です" }
  }

  // 指導者IDを取得
  const { data: coach, error: coachError } = await supabase
    .from("coaches")
    .select("id")
    .eq("user_id", user.id)
    .single()

  if (coachError || !coach) {
    return { ...emptyResult, error: "指導者情報が見つかりません" }
  }

  // 担当生徒を取得（卒業生を除外）
  const { data: relations, error: relationsError } = await supabase
    .from("coach_student_relations")
    .select(`
      student_id,
      students!inner (
        id,
        user_id,
        full_name,
        grade
      )
    `)
    .eq("coach_id", coach.id)
    .is("students.graduated_at", null)

  if (relationsError) {
    console.error("Failed to fetch coach-student relations:", relationsError)
    return { ...emptyResult, error: "担当生徒の取得に失敗しました" }
  }

  // 学年フィルタ適用
  let students = relations
    ?.map((rel: any) => rel.students)
    .filter(Boolean) || []

  if (grade !== "all") {
    const gradeNum = parseInt(grade, 10)
    students = students.filter((s: any) => s.grade === gradeNum)
  }

  if (students.length === 0) {
    return {
      ...emptyResult,
      meta: { ...emptyResult.meta, totalStudents: 0 },
    }
  }

  const studentIds = students.map((s: any) => s.id)

  // 生徒のプロフィール情報を取得
  const studentUserIds = students.map((s: any) => s.user_id).filter(Boolean)
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
          custom_avatar_url: profile.custom_avatar_url,
        }
        return acc
      }, {} as typeof profilesMap)
    }
  }

  // 14日間の学習記録を取得
  const { data: studyLogs, error: logsError } = await supabase
    .from("study_logs")
    .select(`
      id,
      student_id,
      correct_count,
      total_problems,
      logged_at,
      subjects (name)
    `)
    .in("student_id", studentIds)
    .gte("logged_at", periodStart.toISOString())
    .lt("logged_at", periodEnd.toISOString())
    .order("logged_at", { ascending: false })

  if (logsError) {
    console.error("Failed to fetch study logs:", logsError)
    return { ...emptyResult, error: "学習記録の取得に失敗しました" }
  }

  const logs = studyLogs || []

  // 科目リスト
  const subjects = ["算数", "国語", "理科", "社会"] as const

  // ========== 1. 科目別平均とトレンド ==========
  const subjectAverages: SubjectAverage[] = subjects.map((subject) => {
    const subjectLogs = logs.filter((log: any) => log.subjects?.name === subject)

    // 直近7日と前7日に分割
    const currentLogs = subjectLogs.filter((log: any) => new Date(log.logged_at) >= midPoint)
    const previousLogs = subjectLogs.filter((log: any) => new Date(log.logged_at) < midPoint)

    // 平均計算
    const calcAvg = (logList: any[]) => {
      if (logList.length === 0) return null
      const total = logList.reduce((sum, log) => {
        const rate = log.total_problems > 0 ? (log.correct_count / log.total_problems) * 100 : 0
        return sum + rate
      }, 0)
      return Math.round((total / logList.length) * 10) / 10
    }

    const currentAvg = calcAvg(currentLogs)
    const previousAvg = calcAvg(previousLogs)
    const overallAvg = calcAvg(subjectLogs)

    return {
      subject,
      average: overallAvg !== null ? Math.round(overallAvg) : 0,
      sampleSize: subjectLogs.length,
      trend: calculateTrend(currentAvg, previousAvg, currentLogs.length, previousLogs.length),
      currentAvg,
      previousAvg,
    }
  })

  // ========== 2. 生徒分布 ==========
  const distribution: DistributionBin[] = [
    { bin: "excellent", label: "🌟 習熟", count: 0, studentIds: [], color: "emerald-500" },
    { bin: "good", label: "✓ 順調", count: 0, studentIds: [], color: "blue-500" },
    { bin: "improving", label: "📈 成長中", count: 0, studentIds: [], color: "amber-500" },
    { bin: "needs_support", label: "💪 サポート", count: 0, studentIds: [], color: "red-500" },
  ]

  // 各生徒の総合正答率を計算してビンに分類
  const studentAccuracies: Record<string, { total: number; correct: number }> = {}

  for (const log of logs) {
    const studentId = String(log.student_id)
    if (!studentAccuracies[studentId]) {
      studentAccuracies[studentId] = { total: 0, correct: 0 }
    }
    studentAccuracies[studentId].total += log.total_problems || 0
    studentAccuracies[studentId].correct += log.correct_count || 0
  }

  for (const studentId of studentIds) {
    const sid = String(studentId)
    const acc = studentAccuracies[sid]
    if (!acc || acc.total === 0) continue // データなしは除外

    const accuracy = (acc.correct / acc.total) * 100
    const bin = getAccuracyBin(accuracy)
    const binItem = distribution.find((d) => d.bin === bin)
    if (binItem) {
      binItem.count++
      binItem.studentIds.push(sid)
    }
  }

  // ========== 3. 生徒別トレンド ==========
  const studentTrends: StudentTrend[] = students.map((student: any) => {
    const profile = profilesMap[student.user_id] || { nickname: null, avatar_id: null, custom_avatar_url: null }
    const studentLogs = logs.filter((log: any) => log.student_id === student.id)

    // 総合正答率
    const totalAcc = studentAccuracies[String(student.id)]
    const overallAccuracy = totalAcc && totalAcc.total > 0
      ? Math.round((totalAcc.correct / totalAcc.total) * 100)
      : null

    // 科目別トレンド
    const subjectTrends: SubjectTrend[] = subjects.map((subject) => {
      const subjectLogs = studentLogs.filter((log: any) => log.subjects?.name === subject)
      const currentLogs = subjectLogs.filter((log: any) => new Date(log.logged_at) >= midPoint)
      const previousLogs = subjectLogs.filter((log: any) => new Date(log.logged_at) < midPoint)

      const calcAvg = (logList: any[]) => {
        if (logList.length === 0) return null
        const total = logList.reduce((sum, log) => {
          const rate = log.total_problems > 0 ? (log.correct_count / log.total_problems) * 100 : 0
          return sum + rate
        }, 0)
        return Math.round((total / logList.length) * 10) / 10
      }

      const currentAvg = calcAvg(currentLogs)
      const previousAvg = calcAvg(previousLogs)

      return {
        subject,
        trend: calculateTrend(currentAvg, previousAvg, currentLogs.length, previousLogs.length),
        currentAvg,
        previousAvg,
        sampleSize: subjectLogs.length,
      }
    })

    return {
      studentId: String(student.id),
      studentName: student.full_name,
      nickname: profile.nickname,
      avatarId: profile.avatar_id,
      customAvatarUrl: profile.custom_avatar_url,
      grade: student.grade,
      overallAccuracy,
      subjectTrends,
    }
  })

  // トレンドでソート（データありを優先、正答率降順）
  studentTrends.sort((a, b) => {
    // データなしは後ろ
    if (a.overallAccuracy === null && b.overallAccuracy !== null) return 1
    if (a.overallAccuracy !== null && b.overallAccuracy === null) return -1
    // 正答率降順
    return (b.overallAccuracy || 0) - (a.overallAccuracy || 0)
  })

  return {
    subjectAverages,
    distribution,
    studentTrends,
    meta: {
      totalStudents: students.length,
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      fetchedAt,
    },
  }
}

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

  // 担当生徒を取得（卒業生を除外）
  const { data: relations, error: relationsError } = await supabase
    .from("coach_student_relations")
    .select(`
      student_id,
      students!inner (
        id,
        user_id,
        full_name,
        grade
      )
    `)
    .eq("coach_id", coach.id)
    .is("students.graduated_at", null)

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

  const lastStudyDates: Record<string, string> = {}
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

// ==================== 得点入力専用ページ用API ====================

export interface AssessmentMaster {
  id: string
  assessmentType: 'math_print' | 'kanji_test'
  grade: '5年' | '6年'
  sessionNumber: number
  attemptNumber: number
  maxScore: number
  title: string  // 表示用タイトル（例: '算数プリント 1回目', '漢字テスト'）
}

export interface AssessmentInputStudent {
  id: string
  fullName: string
  nickname: string | null
  avatarId: string | null
  customAvatarUrl: string | null
  grade: '5年' | '6年'
  // 算数プリント
  mathScore1: number | null
  mathScore2: number | null
  mathStatus1: 'completed' | 'absent' | 'not_submitted'
  mathStatus2: 'completed' | 'absent' | 'not_submitted'
  mathDate1: string | null
  mathDate2: string | null
  // 漢字テスト
  kanjiScore: number | null
  kanjiStatus: 'completed' | 'absent' | 'not_submitted'
  kanjiDate: string | null
}

export interface AssessmentInputData {
  sessionNumber: number
  students: AssessmentInputStudent[]
  mathMasters: AssessmentMaster[]
  kanjiMasters: AssessmentMaster[]
  skippedStudentsCount: number
}

/**
 * 未確定の回次一覧を取得（最新の未確定回次を自動選択するため）
 */
export async function getUnconfirmedSessions() {
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

  // 担当生徒を取得（卒業生を除外）
  const { data: relations, error: relationsError } = await supabase
    .from("coach_student_relations")
    .select("student_id, students!inner(grade)")
    .eq("coach_id", coach.id)
    .is("students.graduated_at", null)

  if (relationsError) {
    return { error: "担当生徒の取得に失敗しました" }
  }

  // 学年変換＆無効データフィルタリング
  const validRelations = relations
    ?.map((rel: any) => {
      const numericGrade = rel.students?.grade
      const gradeStr = gradeToString(numericGrade)
      if (!gradeStr) {
        console.warn(`[getUnconfirmedSessions] Skipping student ${rel.student_id} with invalid grade: ${numericGrade}`)
        return null
      }
      return { student_id: rel.student_id, grade: gradeStr }
    })
    .filter((r): r is { student_id: number; grade: '5年' | '6年' } => r !== null) || []

  if (validRelations.length === 0) {
    return { sessions: [] }
  }

  // 各学年の回次範囲をDBから取得
  const grades = [...new Set(validRelations.map((rel) => rel.grade))]
  const numericGrades = grades.map(g => g === '5年' ? 5 : 6)

  const { data: allStudySessions, error: sessionsError } = await supabase
    .from("study_sessions")
    .select("grade, session_number")
    .in("grade", numericGrades)
    .order("session_number")

  if (sessionsError || !allStudySessions || allStudySessions.length === 0) {
    console.error("[getUnconfirmedSessions] study_sessions 取得失敗:", sessionsError)
    return { error: "学習回データの取得に失敗しました" }
  }

  const sessionRanges: Record<string, number[]> = {}
  for (const grade of grades) {
    const numericGrade = grade === '5年' ? 5 : 6
    sessionRanges[grade] = allStudySessions
      .filter(s => s.grade === numericGrade)
      .map(s => s.session_number)
  }

  // 全回次を集約（昇順）
  const allSessions = [...new Set(Object.values(sessionRanges).flat())].sort((a, b) => a - b)

  // 全マスタと全アセスメントを一括取得（N+1クエリ最適化）
  const { data: allMasters } = await supabase
    .from("assessment_masters")
    .select("id, assessment_type, grade, session_number, attempt_number")
    .in("session_number", allSessions)

  const studentIds = validRelations.map((r) => r.student_id)
  const { data: allAssessments } = await supabase
    .from("class_assessments")
    .select("student_id, master_id, status")
    .in("student_id", studentIds)
    .in("master_id", allMasters?.map((m) => m.id) || [])
    .eq("is_resubmission", false)

  // Map化: O(1)ルックアップ用
  const assessmentMap = new Map<string, string>()
  allAssessments?.forEach((a) => {
    assessmentMap.set(`${a.master_id}:${a.student_id}`, a.status)
  })

  const gradeMap = new Map<number, '5年' | '6年'>()
  validRelations.forEach((rel) => {
    gradeMap.set(rel.student_id, rel.grade)
  })

  // 各回次の未入力件数を計算（学年別、O(n)）
  const sessionStats = allSessions.map((sessionNumber) => {
    const masters = allMasters?.filter((m) => m.session_number === sessionNumber) || []
    let unconfirmedCount5 = 0
    let unconfirmedCount6 = 0

    for (const master of masters) {
      // この学年の生徒のみを対象
      const targetStudentIds = studentIds.filter((sid) => gradeMap.get(sid) === master.grade)

      for (const studentId of targetStudentIds) {
        const status = assessmentMap.get(`${master.id}:${studentId}`)
        if (!status || status === 'not_submitted') {
          if (master.grade === '5年') {
            unconfirmedCount5++
          } else {
            unconfirmedCount6++
          }
        }
      }
    }

    return { sessionNumber, unconfirmedCount5, unconfirmedCount6 }
  })

  // 未確定件数が1件以上ある回次のみを返す（どちらかの学年で未入力があれば表示）
  const unconfirmedSessions = sessionStats
    .filter((stat) => stat.unconfirmedCount5 > 0 || stat.unconfirmedCount6 > 0)
    .map((stat) => ({
      sessionNumber: stat.sessionNumber,
      unconfirmedCount5: stat.unconfirmedCount5,
      unconfirmedCount6: stat.unconfirmedCount6,
    }))

  return { sessions: unconfirmedSessions }
}

/**
 * 指定された回次の得点入力データを取得
 */
export async function getAssessmentInputData(
  sessionNumber: number
): Promise<{ data?: AssessmentInputData; error?: string }> {
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

  // 担当生徒を取得（卒業生を除外）
  const { data: relations, error: relationsError } = await supabase
    .from("coach_student_relations")
    .select(`
      student_id,
      students!inner (
        id,
        user_id,
        full_name,
        grade
      )
    `)
    .eq("coach_id", coach.id)
    .is("students.graduated_at", null)

  if (relationsError) {
    return { error: "担当生徒の取得に失敗しました" }
  }

  const students = relations?.map((rel: any) => rel.students).filter(Boolean) || []

  if (students.length === 0) {
    return { error: "担当生徒が見つかりません" }
  }

  // 生徒のプロフィール情報を取得
  const studentUserIds = students.map((s: any) => s.user_id).filter(Boolean)
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
          custom_avatar_url: profile.custom_avatar_url,
        }
        return acc
      }, {} as typeof profilesMap)
    }
  }

  // 指定回次のマスタデータを取得
  const { data: masters, error: mastersError } = await supabase
    .from("assessment_masters")
    .select("*")
    .eq("session_number", sessionNumber)

  if (mastersError) {
    return { error: "マスタデータの取得に失敗しました" }
  }

  // マスタを型変換（DBのtitleを優先、なければフォールバック）
  const mathMasters: AssessmentMaster[] = masters
    ?.filter((m) => m.assessment_type === "math_print")
    .map((m) => ({
      id: m.id,
      assessmentType: m.assessment_type as 'math_print',
      grade: m.grade as '5年' | '6年',
      sessionNumber: m.session_number,
      attemptNumber: m.attempt_number,
      maxScore: m.max_score,
      title: m.title ?? getAssessmentTitle(m.assessment_type as 'math_print', m.attempt_number),
    })) || []

  const kanjiMasters = masters
    ?.filter((m) => m.assessment_type === "kanji_test")
    .map((m) => ({
      id: m.id,
      assessmentType: m.assessment_type as 'kanji_test',
      grade: m.grade as '5年' | '6年',
      sessionNumber: m.session_number,
      attemptNumber: m.attempt_number,
      maxScore: m.max_score,
      title: m.title ?? getAssessmentTitle(m.assessment_type as 'kanji_test', m.attempt_number),
    })) || []

  // 各生徒の既存入力を取得
  const studentIds = students.map((s: any) => s.id)
  const { data: existingAssessments } = await supabase
    .from("class_assessments")
    .select("*")
    .in("student_id", studentIds)
    .in("master_id", masters?.map((m) => m.id) || [])
    .eq("is_resubmission", false)

  // 生徒データを整形（学年不正データはスキップ）
  let skippedStudentsCount = 0
  const studentsData: AssessmentInputStudent[] = students
    .map((student: any) => {
      const profile = profilesMap[student.user_id] || { nickname: null, avatar_id: null, custom_avatar_url: null }
      const studentGrade = gradeToString(student.grade)

      if (!studentGrade) {
        console.warn(`[getAssessmentInputData] Skipping student ${student.id} (${student.full_name}) with invalid grade: ${student.grade}`)
        skippedStudentsCount++
        return null
      }

      // 該当学年のマスタを取得
      const mathMaster1 = mathMasters.find((m) => m.grade === studentGrade && m.attemptNumber === 1)
      const mathMaster2 = mathMasters.find((m) => m.grade === studentGrade && m.attemptNumber === 2)
      const kanjiMaster = kanjiMasters.find((m) => m.grade === studentGrade)

      // 既存の入力を取得
      const mathAssessment1 = existingAssessments?.find((a) => a.master_id === mathMaster1?.id && a.student_id === student.id)
      const mathAssessment2 = existingAssessments?.find((a) => a.master_id === mathMaster2?.id && a.student_id === student.id)
      const kanjiAssessment = existingAssessments?.find((a) => a.master_id === kanjiMaster?.id && a.student_id === student.id)

      return {
        id: String(student.id),
        fullName: student.full_name,
        nickname: profile.nickname,
        avatarId: profile.avatar_id,
        customAvatarUrl: profile.custom_avatar_url,
        grade: studentGrade,
        mathScore1: mathAssessment1?.score ?? null,
        mathScore2: mathAssessment2?.score ?? null,
        mathStatus1: mathAssessment1?.status ?? 'not_submitted',
        mathStatus2: mathAssessment2?.status ?? 'not_submitted',
        mathDate1: mathAssessment1?.assessment_date ?? null,
        mathDate2: mathAssessment2?.assessment_date ?? null,
        kanjiScore: kanjiAssessment?.score ?? null,
        kanjiStatus: kanjiAssessment?.status ?? 'not_submitted',
        kanjiDate: kanjiAssessment?.assessment_date ?? null,
      }
    })
    .filter((s): s is AssessmentInputStudent => s !== null)

  return {
    data: {
      sessionNumber,
      students: studentsData,
      mathMasters,
      kanjiMasters,
      skippedStudentsCount,
    },
  }
}

/**
 * 得点を一括保存
 */
export async function saveAssessmentScores(
  sessionNumber: number,
  scores: Array<{
    studentId: string
    masterId: string
    score: number | null
    status: 'completed' | 'absent' | 'not_submitted'
  }>,
  assessmentDate?: string
) {
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

  // マスタデータを取得（grade_at_submission, max_score_at_submission用）
  const masterIds = [...new Set(scores.map((s) => s.masterId))]
  const { data: masters } = await supabase
    .from("assessment_masters")
    .select("id, grade, max_score")
    .in("id", masterIds)

  const masterMap = new Map<string, { grade: string; max_score: number }>()
  masters?.forEach((m) => {
    masterMap.set(m.id, { grade: m.grade, max_score: m.max_score })
  })

  // 一括保存（upsert）
  const dateToUse = assessmentDate || getTodayJST()
  const upsertData = scores.map((score) => {
    const master = masterMap.get(score.masterId)
    return {
      student_id: Number(score.studentId),
      master_id: score.masterId,
      score: score.status === 'completed' ? score.score : null,
      status: score.status,
      assessment_date: dateToUse,  // NOT NULL制約のため常に保存
      grader_id: user.id,
      is_resubmission: false,
      grade_at_submission: master?.grade ?? "",
      max_score_at_submission: master?.max_score ?? 0,
    }
  })

  const { error: saveError } = await supabase
    .from("class_assessments")
    .upsert(upsertData, {
      onConflict: "student_id,master_id,is_resubmission",
      ignoreDuplicates: false,
    })

  if (saveError) {
    console.error("Failed to save assessment scores:", saveError)
    return { error: "得点の保存に失敗しました" }
  }

  return { success: true }
}
