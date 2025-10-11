"use server"

import { createClient } from "@/lib/supabase/server"

/**
 * 管理者認証チェック
 */
async function getAuthenticatedAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: "認証が必要です" }
  }

  // 管理者情報を取得
  const { data: admin, error: adminError } = await supabase
    .from("admins")
    .select("id, user_id, full_name")
    .eq("user_id", user.id)
    .single()

  if (adminError || !admin) {
    return { error: "管理者権限がありません" }
  }

  return { supabase, user, admin }
}

/**
 * システム統計を取得
 */
export async function getSystemStats() {
  const authResult = await getAuthenticatedAdmin()
  if (authResult.error) {
    return { error: authResult.error }
  }

  const { supabase } = authResult

  try {
    // ユーザー数（各ロール別）
    const [studentsCount, parentsCount, coachesCount, adminsCount] = await Promise.all([
      supabase.from("students").select("id", { count: "exact", head: true }),
      supabase.from("parents").select("id", { count: "exact", head: true }),
      supabase.from("coaches").select("id", { count: "exact", head: true }),
      supabase.from("admins").select("id", { count: "exact", head: true }),
    ])

    // 学習ログ数
    const { count: studyLogsCount } = await supabase
      .from("study_logs")
      .select("id", { count: "exact", head: true })

    // 週次分析数
    const { count: weeklyAnalysisCount } = await supabase
      .from("weekly_analysis")
      .select("id", { count: "exact", head: true })

    // 監査ログ数
    const { count: auditLogsCount } = await supabase
      .from("audit_logs")
      .select("id", { count: "exact", head: true })

    // 応援メッセージ数
    const { count: encouragementsCount } = await supabase
      .from("encouragements")
      .select("id", { count: "exact", head: true })

    // 今日の学習記録数
    const today = new Date().toISOString().split("T")[0]
    const { count: todayLogsCount } = await supabase
      .from("study_logs")
      .select("id", { count: "exact", head: true })
      .gte("created_at", today)

    return {
      stats: {
        users: {
          students: studentsCount.count || 0,
          parents: parentsCount.count || 0,
          coaches: coachesCount.count || 0,
          admins: adminsCount.count || 0,
          total:
            (studentsCount.count || 0) +
            (parentsCount.count || 0) +
            (coachesCount.count || 0) +
            (adminsCount.count || 0),
        },
        data: {
          studyLogs: studyLogsCount || 0,
          weeklyAnalysis: weeklyAnalysisCount || 0,
          auditLogs: auditLogsCount || 0,
          encouragements: encouragementsCount || 0,
          todayLogs: todayLogsCount || 0,
        },
      },
    }
  } catch (error) {
    console.error("Failed to get system stats:", error)
    return { error: "システム統計の取得に失敗しました" }
  }
}

/**
 * 最近の監査ログを取得
 */
export async function getRecentAuditLogs(limit = 10) {
  const authResult = await getAuthenticatedAdmin()
  if (authResult.error) {
    return { error: authResult.error }
  }

  const { supabase } = authResult

  const { data: logs, error } = await supabase
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) {
    console.error("Failed to get recent audit logs:", error)
    return { error: "監査ログの取得に失敗しました" }
  }

  return { logs }
}

/**
 * 招待コード一覧を取得
 */
export async function getInvitationCodes() {
  const authResult = await getAuthenticatedAdmin()
  if (authResult.error) {
    return { error: authResult.error }
  }

  const { supabase } = authResult

  const { data: codes, error } = await supabase
    .from("invitation_codes")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Failed to get invitation codes:", error)
    return { error: "招待コードの取得に失敗しました" }
  }

  return { codes }
}

/**
 * 新規招待コードを生成
 */
export async function generateInvitationCode(role: "parent" | "coach", expiresInDays = 30) {
  const authResult = await getAuthenticatedAdmin()
  if (authResult.error) {
    return { error: authResult.error }
  }

  const { supabase, admin } = authResult

  // ランダムな8文字のコードを生成
  const code = Math.random().toString(36).substring(2, 10).toUpperCase()

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + expiresInDays)

  const { data: invitationCode, error } = await supabase
    .from("invitation_codes")
    .insert({
      code,
      role,
      expires_at: expiresAt.toISOString(),
      created_by: admin.id,
    })
    .select()
    .single()

  if (error) {
    console.error("Failed to generate invitation code:", error)
    return { error: "招待コードの生成に失敗しました" }
  }

  return { code: invitationCode }
}

/**
 * 招待コードの有効/無効を切り替え
 */
export async function toggleInvitationCode(codeId: string) {
  const authResult = await getAuthenticatedAdmin()
  if (authResult.error) {
    return { error: authResult.error }
  }

  const { supabase } = authResult

  // 現在の状態を取得
  const { data: currentCode, error: fetchError } = await supabase
    .from("invitation_codes")
    .select("is_active")
    .eq("id", codeId)
    .single()

  if (fetchError) {
    return { error: "招待コードが見つかりません" }
  }

  // 状態を反転
  const { error: updateError } = await supabase
    .from("invitation_codes")
    .update({ is_active: !currentCode.is_active })
    .eq("id", codeId)

  if (updateError) {
    console.error("Failed to toggle invitation code:", updateError)
    return { error: "招待コードの更新に失敗しました" }
  }

  return { success: true }
}
