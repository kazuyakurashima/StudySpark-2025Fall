import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function fixLocalParentEmails() {
  try {
    console.log("🔧 ローカル環境：保護者のメールアドレスを本番に合わせます\n")
    console.log("=".repeat(80))

    // Get auth users and profiles
    const { data: authData } = await supabase.auth.admin.listUsers()
    const { data: profiles } = await supabase.from("profiles").select("id, display_name, role")

    if (!authData || !profiles) {
      console.error("❌ データ取得に失敗しました")
      return
    }

    // Find parents
    const hoshino_parent = profiles.find((p) => p.display_name === "星野 一朗" && p.role === "parent")
    const aozora_parent = profiles.find((p) => p.display_name === "青空 太郎" && p.role === "parent")
    const unknown_parent = profiles.find((p) => !p.display_name && p.role === "parent")

    console.log("📋 保護者アカウント確認:\n")

    // Get current emails
    const hoshino_auth = authData.users.find((u) => u.id === hoshino_parent?.id)
    const aozora_auth = authData.users.find((u) => u.id === aozora_parent?.id)
    const unknown_auth = authData.users.find((u) => u.id === unknown_parent?.id)

    console.log(`星野一朗: ${hoshino_auth?.email || '未設定'} → demo-parent1@example.com`)
    console.log(`青空太郎: ${aozora_auth?.email || '未設定'} → demo-parent2@example.com`)
    if (unknown_auth) {
      console.log(`（未設定）: ${unknown_auth.email} → 削除`)
    }
    console.log("")

    // Update Hoshino
    if (hoshino_parent && hoshino_auth?.email !== "demo-parent1@example.com") {
      console.log("🔄 星野一朗のメールアドレスを更新中...")
      const { error } = await supabase.auth.admin.updateUserById(hoshino_parent.id, {
        email: "demo-parent1@example.com",
      })

      if (error) {
        console.error(`❌ エラー:`, error.message)
      } else {
        console.log(`✅ 更新完了\n`)
      }
    } else {
      console.log("⏭️  星野一朗は既に正しいメールアドレスです\n")
    }

    // Update Aozora
    if (aozora_parent && aozora_auth?.email !== "demo-parent2@example.com") {
      console.log("🔄 青空太郎のメールアドレスを更新中...")
      const { error } = await supabase.auth.admin.updateUserById(aozora_parent.id, {
        email: "demo-parent2@example.com",
      })

      if (error) {
        console.error(`❌ エラー:`, error.message)
      } else {
        console.log(`✅ 更新完了\n`)
      }
    } else {
      console.log("⏭️  青空太郎は既に正しいメールアドレスです\n")
    }

    // Delete unknown parent
    if (unknown_parent) {
      console.log("🗑️  未設定の保護者アカウントを削除中...")

      // First delete from parents table
      const { error: parentsError } = await supabase
        .from("parents")
        .delete()
        .eq("user_id", unknown_parent.id)

      if (parentsError) {
        console.error(`❌ parentsテーブル削除エラー:`, parentsError.message)
      }

      // Then delete from profiles
      const { error: profileError } = await supabase
        .from("profiles")
        .delete()
        .eq("id", unknown_parent.id)

      if (profileError) {
        console.error(`❌ profilesテーブル削除エラー:`, profileError.message)
      }

      // Finally delete from auth
      const { error: authError } = await supabase.auth.admin.deleteUser(unknown_parent.id)

      if (authError) {
        console.error(`❌ auth削除エラー:`, authError.message)
      } else {
        console.log(`✅ 削除完了\n`)
      }
    }

    console.log("=".repeat(80))
    console.log("🎉 ローカル環境の修正が完了しました！")
    console.log("=".repeat(80))

    // Verify
    console.log("\n🔍 確認:\n")
    const { data: newAuthData } = await supabase.auth.admin.listUsers()
    const { data: newProfiles } = await supabase.from("profiles").select("id, display_name, role")

    const newParents = newProfiles?.filter((p) => p.role === "parent") || []

    for (const parent of newParents) {
      const authUser = newAuthData?.users.find((u) => u.id === parent.id)
      console.log(`${parent.display_name || '未設定'}: ${authUser?.email || '未設定'}`)
    }

    console.log("\n✅ 完了！ローカル環境が本番環境と一致しました。")
  } catch (error) {
    console.error("❌ エラー:", error)
    process.exit(1)
  }
}

fixLocalParentEmails()
