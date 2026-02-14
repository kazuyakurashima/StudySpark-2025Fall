"use server"

import "server-only"
import { createClient } from "@/lib/supabase/server"
import { getDailySparkLevel as getLevel } from "@/lib/utils/daily-spark"
import { checkStudentAccess } from "@/app/actions/common/check-student-access"

export type { SparkLevel } from "@/lib/types/daily-spark"

/**
 * Server Action: Daily Sparkレベルを取得
 * 認証・認可チェック付き。parentUserId はサーバー側でセッションから確定する。
 * @param studentId 生徒ID
 * @returns SparkLevel
 */
export async function getDailySparkLevel(studentId: number) {
  // 入力バリデーション（Server Action は型境界を越えて呼ばれうる）
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

  // 認可チェック（既存の共通関数を再利用）
  // checkStudentAccess は生徒本人・保護者（parent_child_relations）・
  // コーチ（coach_student_relations = 担当生徒のみ）を判定
  const hasAccess = await checkStudentAccess(user.id, String(studentId))
  if (!hasAccess) {
    throw new Error("アクセス権限がありません")
  }

  // 保護者の場合はサーバー側で user.id を parentUserId として渡す
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profileError || !profile) {
    throw new Error("プロフィールの取得に失敗しました")
  }

  const parentUserId = profile.role === "parent" ? user.id : undefined
  return await getLevel(studentId, parentUserId)
}
