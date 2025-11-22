import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getCoachStudentLearningRecords, getInactiveStudents } from "@/app/actions/coach"
import { CoachHomeClient } from "./components/coach-home-client"

export default async function CoachHomePage() {
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

  // 学習記録と未入力生徒データを取得
  const [recordsResult, inactiveResult] = await Promise.all([
    getCoachStudentLearningRecords(50),
    getInactiveStudents(3), // 3日以上で取得し、クライアント側でフィルタリング
  ])

  const records = recordsResult.records || []
  const inactiveStudents = inactiveResult.students || []

  return (
    <CoachHomeClient
      initialRecords={records}
      initialInactiveStudents={inactiveStudents}
    />
  )
}
