import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  "http://127.0.0.1:54321",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU",
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

async function main() {
  console.log("=== ローカル環境のユーザー確認 ===\n")

  // 生徒ユーザー
  const { data: students, error: studentsError } = await supabase
    .from("students")
    .select("user_id, login_id, grade, course, profiles(display_name)")
    .order("grade", { ascending: false })
    .order("login_id")

  if (studentsError) {
    console.error("生徒取得エラー:", studentsError)
  } else {
    console.log("📚 生徒アカウント:")
    students?.forEach((s: any) => {
      console.log(
        `  - ${s.login_id} (${s.profiles?.display_name}) - 小${s.grade}・${s.course}コース`
      )
    })
  }

  console.log()

  // 保護者ユーザー
  const { data: parents, error: parentsError } = await supabase
    .from("parents")
    .select("user_id, profiles(display_name)")

  if (parentsError) {
    console.error("保護者取得エラー:", parentsError)
  } else {
    console.log("👨‍👩‍👧 保護者アカウント:")
    for (const p of parents || []) {
      // メールアドレスを取得
      const { data: authData } = await supabase.auth.admin.getUserById(p.user_id)
      console.log(`  - ${authData.user?.email} (${(p as any).profiles?.display_name})`)
    }
  }
}

main()
