"use server"

import { createClient } from "@/lib/supabase/server"
import { getDailySparkLevel as getLevel } from "@/lib/utils/daily-spark"
import { checkStudentAccess } from "@/app/actions/common/check-student-access"

export type { SparkLevel } from "@/lib/utils/daily-spark"

/**
 * Server Action: Daily Sparkレベルを取得
 * 認証・認可チェック付き。parentUserId はサーバー側でセッションから確定する。
 * @param studentId 生徒ID
 * @returns SparkLevel
 */
export async function getDailySparkLevel(studentId: number) {
  if (!Number.isInteger(studentId) || studentId <= 0) {
    throw new Error("無効な生徒IDです")
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error("認証が必要です")
  }

  const hasAccess = await checkStudentAccess(user.id, String(studentId))
  if (!hasAccess) {
    throw new Error("アクセス権限がありません")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  const parentUserId = profile?.role === "parent" ? user.id : undefined
  return await getLevel(studentId, parentUserId)
}
