/**
 * デモデータ検証スクリプト
 * RLSポリシーが正しく動作しているか確認
 */

import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function verifyData() {
  console.log("🔍 Verifying demo data...\n")

  // 1. Check students
  const { data: students, error: studentsError } = await supabase
    .from("students")
    .select("id, login_id, full_name, grade, course")
    .order("id")

  if (studentsError) {
    console.error("❌ Failed to fetch students:", studentsError.message)
    return
  }

  console.log("📚 Students:")
  students?.forEach((s) => {
    console.log(`  ${s.id}. ${s.full_name} (${s.login_id}) - Grade ${s.grade}, Course ${s.course}`)
  })

  // 2. Check parents
  const { data: parents, error: parentsError } = await supabase
    .from("parents")
    .select("id, full_name")
    .order("id")

  if (parentsError) {
    console.error("❌ Failed to fetch parents:", parentsError.message)
    return
  }

  console.log("\n👪 Parents:")
  parents?.forEach((p) => {
    console.log(`  ${p.id}. ${p.full_name}`)
  })

  // 3. Check parent-child relations
  const { data: relations, error: relationsError } = await supabase
    .from("parent_child_relations")
    .select(
      `
      id,
      relation_type,
      parents (full_name),
      students (login_id, full_name)
    `
    )
    .order("id")

  if (relationsError) {
    console.error("❌ Failed to fetch relations:", relationsError.message)
    return
  }

  console.log("\n🔗 Parent-Child Relations:")
  relations?.forEach((r: any) => {
    console.log(
      `  ${r.id}. ${r.parents.full_name} (${r.relation_type}) → ${r.students.full_name} (${r.students.login_id})`
    )
  })

  // 4. Check profiles
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, role, nickname, avatar_id")
    .in("role", ["student", "parent"])
    .order("role", { ascending: false })

  if (profilesError) {
    console.error("❌ Failed to fetch profiles:", profilesError.message)
    return
  }

  console.log("\n👤 Profiles:")
  profiles?.forEach((p) => {
    console.log(`  ${p.role}: ${p.nickname} (avatar: ${p.avatar_id})`)
  })

  console.log("\n✅ Verification completed!")
  console.log("\n📝 Login credentials:")
  console.log("  Students:")
  console.log("    akira5 / demo2025")
  console.log("    hikaru6 / demo2025")
  console.log("    hana6 / demo2025")
  console.log("  Parents:")
  console.log("    toshin.hitachi+test002@gmail.com / Testdemo2025 (星野 一朗)")
  console.log("    toshin.hitachi+test001@gmail.com / Testdemo2025 (青空 太郎)")
}

verifyData().catch((error) => {
  console.error("💥 Unexpected error:", error)
  process.exit(1)
})
