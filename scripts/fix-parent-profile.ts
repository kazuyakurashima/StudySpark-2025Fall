import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function fixParentProfile() {
  console.log("🔧 保護者プロフィールを修正中...\n")

  // 星野 一朗のユーザーIDを取得
  const hoshinoParentId = "a27bd21c-0ac4-478c-bce1-e64e26a7fe4a"

  // 現在のデータを確認
  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", hoshinoParentId)
    .single()

  console.log("📋 修正前のプロフィール:")
  console.table(currentProfile)

  // 保護者の正しい情報に修正
  const { data: updatedProfile, error } = await supabase
    .from("profiles")
    .update({
      nickname: "星野 一朗",  // display_nameと同じにする
      avatar_id: "parent1",   // 保護者用のアバターに変更
    })
    .eq("id", hoshinoParentId)
    .select()
    .single()

  if (error) {
    console.error("❌ エラー:", error)
    return
  }

  console.log("\n✅ 修正後のプロフィール:")
  console.table(updatedProfile)

  console.log("\n🎉 保護者プロフィールを修正しました！")
}

fixParentProfile().catch(console.error)
