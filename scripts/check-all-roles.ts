import { createClient } from "@supabase/supabase-js"

async function checkAllRoles(env: "local" | "production") {
  const isLocal = env === "local"

  const supabase = createClient(
    isLocal
      ? "http://127.0.0.1:54321"
      : "https://zlipaeanhcslhintxpej.supabase.co",
    isLocal
      ? "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU"
      : "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsaXBhZWFuaGNzbGhpbnR4cGVqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTQwODQyNywiZXhwIjoyMDc0OTg0NDI3fQ.vHLWUSK8UURjH1_W-vIImz5f7QU1J9tEKGhsfKHDs1Y",
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )

  console.log(`=== ${isLocal ? "ローカル" : "本番"}環境 - 全ロール確認 ===\n`)

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, display_name, role")
    .order("role")

  if (error) {
    console.error("エラー:", error)
    return
  }

  const roleGroups = {
    student: [] as any[],
    parent: [] as any[],
    coach: [] as any[],
    admin: [] as any[],
  }

  for (const profile of profiles || []) {
    if (roleGroups[profile.role as keyof typeof roleGroups]) {
      roleGroups[profile.role as keyof typeof roleGroups].push(profile)
    }
  }

  console.log(`📊 ロール別ユーザー数:`)
  console.log(`  - 生徒 (student): ${roleGroups.student.length}名`)
  console.log(`  - 保護者 (parent): ${roleGroups.parent.length}名`)
  console.log(`  - 指導者 (coach): ${roleGroups.coach.length}名`)
  console.log(`  - 管理者 (admin): ${roleGroups.admin.length}名`)
  console.log()

  if (roleGroups.coach.length > 0) {
    console.log("👨‍🏫 指導者アカウント:")
    for (const coach of roleGroups.coach) {
      const { data: authData } = await supabase.auth.admin.getUserById(coach.id)
      console.log(`  - ${authData.user?.email} (${coach.display_name})`)
    }
    console.log()
  }

  if (roleGroups.admin.length > 0) {
    console.log("👑 管理者アカウント:")
    for (const admin of roleGroups.admin) {
      const { data: authData } = await supabase.auth.admin.getUserById(admin.id)
      console.log(`  - ${authData.user?.email} (${admin.display_name})`)
    }
    console.log()
  }
}

async function main() {
  await checkAllRoles("local")
  await checkAllRoles("production")
}

main()
