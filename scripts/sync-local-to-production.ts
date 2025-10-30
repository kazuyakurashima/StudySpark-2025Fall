import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function syncLocalToProduction() {
  try {
    console.log("🔧 ローカル環境を本番環境に合わせます\n")
    console.log("=".repeat(80))

    // ステップ1: 保護者のメールアドレスを変更
    console.log("\n📧 ステップ1: 保護者のメールアドレスを変更\n")

    // Get all auth users
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers()

    if (authError || !authData) {
      console.error("❌ ユーザーの取得に失敗しました:", authError)
      return
    }

    // Get profiles
    const { data: profiles } = await supabase.from("profiles").select("id, display_name, role")

    if (!profiles) {
      console.error("❌ プロフィールの取得に失敗しました")
      return
    }

    // Find parent by display name
    const hoshino_parent = profiles.find((p) => p.display_name === "星野 一朗" && p.role === "parent")
    const aozora_parent = profiles.find((p) => p.display_name === "青空 太郎" && p.role === "parent")
    const unknown_parent = profiles.find((p) => !p.display_name && p.role === "parent")

    console.log("📋 保護者アカウント確認:")
    console.log(`   星野一朗: ${hoshino_parent ? '✅' : '❌'} ${hoshino_parent?.id}`)
    console.log(`   青空太郎: ${aozora_parent ? '✅' : '❌'} ${aozora_parent?.id}`)
    console.log(`   （未設定）: ${unknown_parent ? '✅' : '❌'} ${unknown_parent?.id}`)
    console.log("")

    // Get current emails
    const hoshino_auth = authData.users.find((u) => u.id === hoshino_parent?.id)
    const aozora_auth = authData.users.find((u) => u.id === aozora_parent?.id)
    const unknown_auth = authData.users.find((u) => u.id === unknown_parent?.id)

    console.log("📧 現在のメールアドレス:")
    console.log(`   星野一朗: ${hoshino_auth?.email || '未設定'}`)
    console.log(`   青空太郎: ${aozora_auth?.email || '未設定'}`)
    console.log(`   （未設定）: ${unknown_auth?.email || '未設定'}`)
    console.log("")

    // Update emails if needed
    console.log("🔄 メールアドレスを更新中...\n")

    if (hoshino_parent && hoshino_auth?.email !== "toshin.hitachi+test001@gmail.com") {
      const { error } = await supabase.auth.admin.updateUserById(hoshino_parent.id, {
        email: "toshin.hitachi+test001@gmail.com",
      })

      if (error) {
        console.error(`❌ 星野一朗のメール更新エラー:`, error.message)
      } else {
        console.log(`✅ 星野一朗: parent1@example.com → toshin.hitachi+test001@gmail.com`)
      }
    } else {
      console.log(`⏭️  星野一朗: 既に正しいメールアドレスです`)
    }

    if (aozora_parent && aozora_auth?.email !== "toshin.hitachi+test002@gmail.com") {
      const { error } = await supabase.auth.admin.updateUserById(aozora_parent.id, {
        email: "toshin.hitachi+test002@gmail.com",
      })

      if (error) {
        console.error(`❌ 青空太郎のメール更新エラー:`, error.message)
      } else {
        console.log(`✅ 青空太郎: ${aozora_auth?.email} → toshin.hitachi+test002@gmail.com`)
      }
    } else {
      console.log(`⏭️  青空太郎: 既に正しいメールアドレスです`)
    }

    // Handle unknown parent - delete if exists
    if (unknown_parent) {
      console.log(`\n🗑️  未設定の保護者アカウントを削除中...`)
      const { error } = await supabase.auth.admin.deleteUser(unknown_parent.id)

      if (error) {
        console.error(`❌ 削除エラー:`, error.message)
      } else {
        console.log(`✅ 未設定の保護者アカウントを削除しました`)
      }
    }

    // ステップ2: 親子紐付けを設定
    console.log("\n🔗 ステップ2: 親子紐付けを設定\n")

    // Get students
    const { data: students } = await supabase
      .from("students")
      .select("id, user_id, profiles!inner(display_name)")

    if (!students) {
      console.error("❌ 生徒情報の取得に失敗しました")
      return
    }

    const hikaru = students.find((s: any) => s.profiles?.display_name === "星野 光")
    const akira = students.find((s: any) => s.profiles?.display_name === "星野 明")
    const hana = students.find((s: any) => s.profiles?.display_name === "青空 花")

    console.log("📋 生徒アカウント確認:")
    console.log(`   星野 光: ${hikaru ? '✅' : '❌'} student_id=${hikaru?.id}`)
    console.log(`   星野 明: ${akira ? '✅' : '❌'} student_id=${akira?.id}`)
    console.log(`   青空 花: ${hana ? '✅' : '❌'} student_id=${hana?.id}`)
    console.log("")

    if (!hoshino_parent || !aozora_parent || !hikaru || !akira || !hana) {
      console.error("❌ 必要なアカウントが見つかりません")
      return
    }

    // Clear existing relationships
    const { data: existingRels } = await supabase.from("parent_student_relationships").select("*")

    if (existingRels && existingRels.length > 0) {
      console.log(`🗑️  既存の紐付け ${existingRels.length}件を削除中...`)
      const { error: deleteError } = await supabase
        .from("parent_student_relationships")
        .delete()
        .in(
          "id",
          existingRels.map((r) => r.id)
        )

      if (deleteError) {
        console.error("❌ 削除エラー:", deleteError.message)
        return
      }
      console.log("✅ 削除完了\n")
    }

    // Insert new relationships
    console.log("🔗 新しい紐付けを作成中...\n")

    const relationships = [
      {
        parent_id: hoshino_parent.id,
        student_id: hikaru.id,
        relationship_type: "parent",
      },
      {
        parent_id: hoshino_parent.id,
        student_id: akira.id,
        relationship_type: "parent",
      },
      {
        parent_id: aozora_parent.id,
        student_id: hana.id,
        relationship_type: "parent",
      },
    ]

    for (const rel of relationships) {
      const { error } = await supabase.from("parent_student_relationships").insert(rel)

      if (error) {
        console.error(`❌ 紐付けエラー:`, error.message)
      } else {
        const parent = profiles.find((p) => p.id === rel.parent_id)
        const student = students.find((s: any) => s.id === rel.student_id)
        console.log(`✅ ${parent?.display_name} → ${(student as any)?.profiles?.display_name}`)
      }
    }

    console.log("\n" + "=".repeat(80))
    console.log("🎉 ローカル環境の同期が完了しました！")
    console.log("=".repeat(80))

    // Verify
    console.log("\n🔍 設定確認:\n")
    const { data: newRels } = await supabase.from("parent_student_relationships").select(`
        parent_id,
        student_id,
        parent_profiles:profiles!parent_student_relationships_parent_id_fkey(display_name),
        student:students!inner(profiles!inner(display_name))
      `)

    newRels?.forEach((rel, i) => {
      const parentName = (rel as any).parent_profiles?.display_name
      const studentName = (rel as any).student?.profiles?.display_name
      console.log(`${i + 1}. ${parentName} → ${studentName}`)
    })

    console.log("\n📋 次のステップ:")
    console.log("   1. 青空花、星野明のコースをアプリから変更（青空花: S→B、星野明: A→B）")
    console.log("   2. ローカル環境で動作確認")
    console.log("   3. 本番環境にも同じ設定を適用")
  } catch (error) {
    console.error("❌ エラー:", error)
    process.exit(1)
  }
}

syncLocalToProduction()
