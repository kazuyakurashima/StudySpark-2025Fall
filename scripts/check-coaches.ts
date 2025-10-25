import { createClient } from "@supabase/supabase-js"

async function checkCoaches(env: "local" | "production") {
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

  console.log(`=== ${isLocal ? "ローカル" : "本番"}環境 - 指導者アカウント ===\n`)

  const { data: coaches, error } = await supabase
    .from("coaches")
    .select("user_id, profiles(display_name)")

  if (error) {
    console.error("エラー:", error)
    return
  }

  if (!coaches || coaches.length === 0) {
    console.log("❌ 指導者アカウントは存在しません\n")
    return
  }

  console.log("👨‍🏫 指導者アカウント:")
  for (const c of coaches) {
    const { data: authData } = await supabase.auth.admin.getUserById(c.user_id)
    console.log(`  - ${authData.user?.email} (${(c as any).profiles?.display_name})`)
  }
  console.log()
}

async function main() {
  await checkCoaches("local")
  await checkCoaches("production")
}

main()
