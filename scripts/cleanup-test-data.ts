/**
 * テストデータ完全クリーンアップスクリプト
 */

import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function cleanupAll() {
  console.log("🧹 完全クリーンアップ開始...\n")

  // 1. テスト用ログインIDを持つ生徒を削除
  console.log("1. 生徒レコードを削除...")
  const { data: students } = await supabase
    .from("students")
    .select("*")
    .or("login_id.like.test_child_%")

  if (students && students.length > 0) {
    console.log(`  見つかった生徒: ${students.length}件`)
    for (const student of students) {
      console.log(`    - ${student.login_id} (user_id: ${student.user_id})`)
      // 親子関係を削除
      await supabase.from("parent_child_relations").delete().eq("student_id", student.id)
      //生徒レコードを削除
      await supabase.from("students").delete().eq("id", student.id)
    }
  } else {
    console.log("  生徒レコードなし")
  }

  // 2. テスト用メールアドレスを持つ保護者を削除
  console.log("\n2. 保護者レコードを削除...")
  const { data: parents } = await supabase
    .from("parents")
    .select("*, profiles!inner(id)")
    .ilike("profiles.id::text", "%")

  if (parents && parents.length > 0) {
    for (const parent of parents) {
      // user_idから保護者のメールを取得
      const { data: profile } = await supabase.from("profiles").select("id").eq("id", parent.user_id).single()

      if (profile) {
        const { data: users } = await supabase.auth.admin.listUsers()
        const user = users.users.find((u) => u.id === profile.id)
        if (user && user.email?.includes("test-parent")) {
          console.log(`    - ${user.email} (user_id: ${profile.id})`)
          await supabase.from("parent_child_relations").delete().eq("parent_id", parent.id)
          await supabase.from("parents").delete().eq("id", parent.id)
        }
      }
    }
  } else {
    console.log("  保護者レコードなし")
  }

  // 3. 認証ユーザーを削除
  console.log("\n3. 認証ユーザーを削除...")
  const { data: users } = await supabase.auth.admin.listUsers()

  let deletedCount = 0
  for (const user of users.users) {
    if (user.email?.includes("test-parent") || user.email?.includes("test_child_")) {
      console.log(`    - ${user.email}`)
      await supabase.auth.admin.deleteUser(user.id)
      deletedCount++
    }
  }

  if (deletedCount === 0) {
    console.log("  認証ユーザーなし")
  }

  console.log("\n✅ クリーンアップ完了\n")
}

cleanupAll()
