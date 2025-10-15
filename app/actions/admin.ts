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

    // 今日の学習記録数（JST基準）
    const { getTodayJST } = await import("@/lib/utils/date-jst")
    const todayStr = getTodayJST()
    const { count: todayLogsCount } = await supabase
      .from("study_logs")
      .select("id", { count: "exact", head: true })
      .eq("study_date", todayStr)

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
 * 監査ログを検索・フィルター取得
 */
export async function getAuditLogs(params?: {
  tableName?: string
  operation?: string
  userId?: string
  limit?: number
  offset?: number
}) {
  const authResult = await getAuthenticatedAdmin()
  if (authResult.error) {
    return { error: authResult.error }
  }

  const { supabase } = authResult
  const { tableName, operation, userId, limit = 50, offset = 0 } = params || {}

  let query = supabase
    .from("audit_logs")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1)

  // フィルター適用
  if (tableName) {
    query = query.eq("table_name", tableName)
  }
  if (operation) {
    query = query.eq("operation", operation)
  }
  if (userId) {
    query = query.eq("user_id", userId)
  }

  const { data: logs, error, count } = await query

  if (error) {
    console.error("Failed to get audit logs:", error)
    return { error: "監査ログの取得に失敗しました" }
  }

  return { logs, count }
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

/**
 * 全ユーザー一覧を取得（ロール別）
 */
export async function getAllUsers() {
  const authResult = await getAuthenticatedAdmin()
  if (authResult.error) {
    return { error: authResult.error }
  }

  const { supabase } = authResult

  try {
    // 各ロールのユーザー情報を取得
    const [students, parents, coaches, admins] = await Promise.all([
      supabase
        .from("students")
        .select("id, user_id, login_id, display_name, grade, course, created_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("parents")
        .select("id, user_id, display_name, email, created_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("coaches")
        .select("id, user_id, full_name, email, created_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("admins")
        .select("id, user_id, full_name, email, created_at")
        .order("created_at", { ascending: false }),
    ])

    // 各ユーザーにrole情報を追加
    const allUsers = [
      ...(students.data || []).map((u) => ({ ...u, role: "student" as const })),
      ...(parents.data || []).map((u) => ({ ...u, role: "parent" as const })),
      ...(coaches.data || []).map((u) => ({ ...u, role: "coach" as const })),
      ...(admins.data || []).map((u) => ({ ...u, role: "admin" as const })),
    ]

    // created_atでソート
    allUsers.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    return { users: allUsers }
  } catch (error) {
    console.error("Failed to get all users:", error)
    return { error: "ユーザー一覧の取得に失敗しました" }
  }
}

/**
 * ユーザー検索
 */
export async function searchUsers(query: string) {
  const authResult = await getAuthenticatedAdmin()
  if (authResult.error) {
    return { error: authResult.error }
  }

  const { supabase } = authResult

  try {
    // 各テーブルで検索
    const [students, parents, coaches, admins] = await Promise.all([
      supabase
        .from("students")
        .select("id, user_id, login_id, display_name, grade, course, created_at")
        .or(`login_id.ilike.%${query}%,display_name.ilike.%${query}%`),
      supabase
        .from("parents")
        .select("id, user_id, display_name, email, created_at")
        .or(`display_name.ilike.%${query}%,email.ilike.%${query}%`),
      supabase
        .from("coaches")
        .select("id, user_id, full_name, email, created_at")
        .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`),
      supabase
        .from("admins")
        .select("id, user_id, full_name, email, created_at")
        .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`),
    ])

    const allUsers = [
      ...(students.data || []).map((u) => ({ ...u, role: "student" as const })),
      ...(parents.data || []).map((u) => ({ ...u, role: "parent" as const })),
      ...(coaches.data || []).map((u) => ({ ...u, role: "coach" as const })),
      ...(admins.data || []).map((u) => ({ ...u, role: "admin" as const })),
    ]

    allUsers.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    return { users: allUsers }
  } catch (error) {
    console.error("Failed to search users:", error)
    return { error: "ユーザー検索に失敗しました" }
  }
}

/**
 * システム設定を取得
 */
export async function getSystemSettings() {
  const authResult = await getAuthenticatedAdmin()
  if (authResult.error) {
    return { error: authResult.error }
  }

  const { supabase } = authResult

  const { data: settings, error } = await supabase
    .from("system_settings")
    .select("*")
    .order("key", { ascending: true })

  if (error) {
    console.error("Failed to get system settings:", error)
    return { error: "システム設定の取得に失敗しました" }
  }

  return { settings: settings || [] }
}

/**
 * システム設定を更新
 */
export async function updateSystemSetting(key: string, value: string) {
  const authResult = await getAuthenticatedAdmin()
  if (authResult.error) {
    return { error: authResult.error }
  }

  const { supabase } = authResult

  const { error } = await supabase
    .from("system_settings")
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" })

  if (error) {
    console.error("Failed to update system setting:", error)
    return { error: "システム設定の更新に失敗しました" }
  }

  return { success: true }
}
