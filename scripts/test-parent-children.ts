/**
 * 保護者の子ども一覧取得をテスト
 * profiles テーブルから display_name と avatar_url が正しく取得できることを確認
 */

import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function testParentChildren() {
  const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  })

  console.log("🔍 Testing getParentChildren logic...\n")

  // 保護者を取得（demo-parent@example.com）
  const { data: authUser } = await adminClient.auth.admin.listUsers()
  const parentUser = authUser.users.find((u) => u.email === "demo-parent@example.com")

  if (!parentUser) {
    console.error("❌ demo-parent@example.com が見つかりません")
    return
  }

  console.log(`✅ Parent user found: ${parentUser.email} (ID: ${parentUser.id})\n`)

  // 保護者情報取得
  const { data: parent } = await adminClient
    .from("parents")
    .select("id")
    .eq("user_id", parentUser.id)
    .single()

  if (!parent) {
    console.error("❌ 保護者情報が見つかりません")
    return
  }

  console.log(`✅ Parent record found (ID: ${parent.id})\n`)

  // parent_child_relations経由でstudent_id一覧を取得
  const { data: relations } = await adminClient
    .from("parent_child_relations")
    .select("student_id")
    .eq("parent_id", parent.id)

  console.log(`📋 Found ${relations?.length || 0} child relations\n`)

  if (!relations || relations.length === 0) {
    console.log("ℹ️  No children found for this parent")
    return
  }

  // student_id一覧からstudentsデータを取得
  const studentIds = relations.map((r) => r.student_id)
  const { data: students } = await adminClient
    .from("students")
    .select("id, full_name, grade, user_id")
    .in("id", studentIds)

  console.log(`👨‍🎓 Students data:`)
  students?.forEach((s) => {
    console.log(`   - ${s.full_name} (ID: ${s.id}, user_id: ${s.user_id})`)
  })
  console.log()

  // 各生徒のprofileデータを取得
  const userIds = students?.map((s) => s.user_id) || []
  const { data: profiles, error: profilesError } = await adminClient
    .from("profiles")
    .select("id, display_name, avatar_url")
    .in("id", userIds)

  if (profilesError) {
    console.error("❌ Profiles error:", profilesError)
    return
  }

  console.log(`📸 Profiles data:`)
  profiles?.forEach((p) => {
    console.log(`   - ${p.display_name} (ID: ${p.id})`)
    console.log(`     avatar_url: ${p.avatar_url || "(null)"}`)
  })
  console.log()

  // studentsデータとprofilesデータをマージ
  const profileMap = new Map(profiles?.map((p) => [p.id, p]) || [])
  const children = students?.map((student) => {
    const profile = profileMap.get(student.user_id)
    return {
      id: student.id,
      full_name: student.full_name,
      display_name: profile?.display_name || student.full_name,
      grade: student.grade,
      user_id: student.user_id,
      avatar_url: profile?.avatar_url || null,
    }
  })

  console.log(`✅ Final merged children data:`)
  children?.forEach((child) => {
    console.log(`   - ${child.display_name} (full_name: ${child.full_name})`)
    console.log(`     Grade: ${child.grade}, Avatar: ${child.avatar_url || "(none)"}`)
  })

  console.log("\n✅ Test complete!")
}

testParentChildren().catch(console.error)
