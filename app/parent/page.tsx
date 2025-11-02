import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import {
  getParentChildren,
  getTodayStatusMessageAI,
  getStudentStreak,
  getStudentTodayMissionData,
  getStudentWeeklyProgress,
  getStudentCalendarData,
  getStudentRecentLogs,
  getStudentRecentMessages,
  checkStudentWeeklyReflection,
} from "@/app/actions/parent-dashboard"
import ParentDashboardClient from "./dashboard-client"
import type { ChildProfile, ParentDashboardData } from "@/lib/types/profile"

/**
 * 保護者ダッシュボード - サーバーコンポーネント
 *
 * データ取得をサーバー側で一括実行し、クライアントコンポーネントに渡す
 */
export default async function ParentDashboardPage() {
  // 認証チェック
  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect("/")
  }

  // 保護者プロフィール取得
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("display_name, avatar_id, role, theme_color")
    .eq("id", user.id)
    .single()

  if (profileError || !profile) {
    redirect("/setup")
  }

  if (profile.role !== "parent") {
    redirect("/")
  }

  // 保護者レコード取得
  const { data: parent, error: parentError } = await supabase
    .from("parents")
    .select("id")
    .eq("user_id", user.id)
    .single()

  if (parentError || !parent) {
    redirect("/setup")
  }

  // 子ども一覧取得（エラーハンドリング付き）
  const { children, error: childrenError } = await getParentChildren()

  // 子どもが紐付いていない場合
  if (childrenError || !children || children.length === 0) {
    return (
      <ParentDashboardClient
        parentProfile={{
          displayName: profile.display_name || "保護者",
          avatarId: profile.avatar_id || "parent1",
          themeColor: profile.theme_color || "default",
        }}
        children={[]}
        selectedChild={null}
        initialData={null}
      />
    )
  }

  // デフォルトで最初の子どもを選択
  const selectedChild = children[0]

  // 選択された子どものデータを並列取得（Service Role使用はサーバー側に限定）
  const [
    todayStatus,
    streak,
    todayMission,
    weeklyProgress,
    calendarData,
    recentLogs,
    recentMessages,
    reflectionStatus,
  ] = await Promise.all([
    getTodayStatusMessageAI(selectedChild.id),
    getStudentStreak(selectedChild.id),
    getStudentTodayMissionData(selectedChild.id),
    getStudentWeeklyProgress(selectedChild.id),
    getStudentCalendarData(selectedChild.id),
    getStudentRecentLogs(selectedChild.id, 50),
    getStudentRecentMessages(selectedChild.id, 3),
    checkStudentWeeklyReflection(selectedChild.id),
  ])

  const initialData: ParentDashboardData = {
    todayStatus,
    streak,
    todayMission,
    weeklyProgress,
    calendarData,
    recentLogs,
    recentMessages,
    reflectionStatus,
  }

  return (
    <ParentDashboardClient
      parentProfile={{
        displayName: profile.display_name || "保護者",
        avatarId: profile.avatar_id || "parent1",
        themeColor: profile.theme_color || "default",
      }}
      children={children}
      selectedChild={selectedChild}
      initialData={initialData}
    />
  )
}
