import { redirect, notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { StudentDetailClient } from "./student-detail-client"
import { getTodayJST, getDateJST, getYesterdayJST } from "@/lib/utils/date-jst"

// 動的レンダリング必須（セッション依存）
export const dynamic = "force-dynamic"
export const revalidate = 0

interface PageProps {
  params: { id: string }
}

/**
 * 生徒詳細ページ（Server Component）
 * - 認証・権限チェック
 * - 概要タブ用の初期データをSSRで取得
 * - 他タブはクライアント側でSWR lazy load
 */
export default async function StudentDetailPage({ params }: PageProps) {
  const studentId = params.id
  const supabase = await createClient()

  // 認証チェック
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/")
  }

  // ロールチェック
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (!profile || profile.role !== "coach") {
    redirect("/")
  }

  // コーチIDを取得
  const { data: coach } = await supabase
    .from("coaches")
    .select("id")
    .eq("user_id", user.id)
    .single()

  if (!coach) {
    redirect("/coach")
  }

  // この生徒が自分の担当かチェック
  const { data: relation } = await supabase
    .from("coach_student_relations")
    .select("id")
    .eq("coach_id", coach.id)
    .eq("student_id", Number(studentId))
    .single()

  if (!relation) {
    notFound()
  }

  // 生徒の基本情報を取得（概要タブ用SSRデータ）
  const { data: student, error: studentError } = await supabase
    .from("students")
    .select(`
      id,
      user_id,
      full_name,
      grade,
      course,
      profiles!students_user_id_fkey (
        nickname,
        avatar_id,
        custom_avatar_url
      )
    `)
    .eq("id", Number(studentId))
    .single()

  if (studentError || !student) {
    notFound()
  }

  // 直近の学習状況を取得（JST基準）
  const todayJST = getTodayJST()
  const weekAgoJST = getDateJST(-7)

  const { data: recentLogs } = await supabase
    .from("study_logs")
    .select(`
      id,
      study_date,
      correct_count,
      total_problems,
      subjects (name)
    `)
    .eq("student_id", Number(studentId))
    .gte("study_date", weekAgoJST)
    .order("study_date", { ascending: false })
    .limit(20)

  // 学習サマリーを計算
  const totalQuestions = recentLogs?.reduce((sum, log) => sum + (log.total_problems || 0), 0) || 0
  const totalCorrect = recentLogs?.reduce((sum, log) => sum + (log.correct_count || 0), 0) || 0
  const recentAccuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0
  const studyDaysCount = new Set(recentLogs?.map((log) => log.study_date)).size

  // 連続学習日数を計算
  const { data: allLogs } = await supabase
    .from("study_logs")
    .select("study_date")
    .eq("student_id", Number(studentId))
    .order("study_date", { ascending: false })
    .limit(100)

  let streak = 0
  if (allLogs && allLogs.length > 0) {
    const uniqueDates = [...new Set(allLogs.map((log) => log.study_date))].sort().reverse()
    const yesterdayJST = getYesterdayJST()

    // 今日または昨日から始まるかチェック（JST基準）
    if (uniqueDates[0] === todayJST || uniqueDates[0] === yesterdayJST) {
      streak = 1

      for (let i = 1; i < uniqueDates.length; i++) {
        // 連続する日付かチェック（YYYY-MM-DD形式で比較）
        const currentDate = uniqueDates[i - 1]
        const prevDate = uniqueDates[i]

        // 1日差かどうかを確認
        const current = new Date(`${currentDate}T12:00:00+09:00`)
        const prev = new Date(`${prevDate}T12:00:00+09:00`)
        const diffDays = Math.round((current.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24))

        if (diffDays === 1) {
          streak++
        } else {
          break
        }
      }
    }
  }

  // 初期データを構築
  const initialData = {
    student: {
      id: String(student.id),
      full_name: student.full_name,
      nickname: (student.profiles as { nickname?: string | null })?.nickname || null,
      grade: student.grade,
      course: student.course,
      avatar_id: (student.profiles as { avatar_id?: string | null })?.avatar_id || null,
      custom_avatar_url: (student.profiles as { custom_avatar_url?: string | null })?.custom_avatar_url || null,
    },
    summary: {
      streak,
      studyDaysThisWeek: studyDaysCount,
      recentAccuracy,
      totalQuestionsThisWeek: totalQuestions,
    },
  }

  return <StudentDetailClient studentId={studentId} initialData={initialData} />
}
