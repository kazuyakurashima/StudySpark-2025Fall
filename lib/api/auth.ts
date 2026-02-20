import { createClient } from "@/lib/supabase/route"
import { NextResponse } from "next/server"

type Role = "student" | "parent" | "coach" | "admin"

interface AuthSuccess {
  user: { id: string; email?: string }
  profile: { role: Role }
}

interface AuthError {
  error: NextResponse
}

/**
 * API Route 用認証ヘルパー
 *
 * セッション Cookie からユーザーを取得し、ロールを検証する。
 * lib/supabase/route.ts（Route Handler 専用クライアント）を使用。
 */
export async function requireAuth(
  allowedRoles: Role[]
): Promise<AuthSuccess | AuthError> {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    }
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (!profile || !allowedRoles.includes(profile.role as Role)) {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    }
  }

  return { user, profile: { role: profile.role as Role } }
}
