import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function checkParentProfiles() {
  console.log("🔍 保護者のプロフィールデータをチェック中...\n")

  // 保護者のプロフィールを取得
  const { data: parentProfiles, error: profileError } = await supabase
    .from("profiles")
    .select("id, display_name, nickname, avatar_id, role")
    .eq("role", "parent")
    .limit(5)

  if (profileError) {
    console.error("❌ エラー:", profileError)
    return
  }

  console.log("📋 保護者のプロフィール:")
  console.table(parentProfiles)

  // 各保護者の親レコードも確認
  for (const profile of parentProfiles || []) {
    const { data: parent } = await supabase
      .from("parents")
      .select("id, full_name")
      .eq("user_id", profile.id)
      .single()

    console.log(`\n👤 ${profile.display_name} (${profile.id}):`)
    console.log("  - nickname:", profile.nickname)
    console.log("  - avatar_id:", profile.avatar_id)
    console.log("  - parent record:", parent)
  }

  // 参考：生徒のプロフィールも確認
  console.log("\n\n📚 参考：生徒のプロフィール（最初の3件）:")
  const { data: studentProfiles } = await supabase
    .from("profiles")
    .select("id, display_name, nickname, avatar_id, role")
    .eq("role", "student")
    .limit(3)

  console.table(studentProfiles)
}

checkParentProfiles().catch(console.error)
