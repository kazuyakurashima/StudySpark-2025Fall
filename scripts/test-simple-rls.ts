/**
 * シンプルなRLSテスト - 各テーブルを個別にテスト
 */

import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"

async function testSimpleRLS() {
  console.log("🧪 Simple RLS Test...\n")

  const supabase = createClient(supabaseUrl, supabaseAnonKey)

  // Sign in as parent
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: "toshin.hitachi+test002@gmail.com",
    password: "Testdemo2025",
  })

  if (authError || !authData.user) {
    console.error("❌ Sign in failed:", authError?.message)
    return
  }

  console.log(`✅ Signed in as: ${authData.user.id}\n`)

  // Test 1: profiles (own)
  console.log("Test 1: Get own profile (should work - no RLS issue)")
  const { data: ownProfile, error: ownProfileError } = await supabase
    .from("profiles")
    .select("id, nickname, role")
    .eq("id", authData.user.id)
    .single()

  if (ownProfileError) {
    console.error("  ❌ Error:", ownProfileError.message)
  } else {
    console.log(`  ✅ Success: ${ownProfile.nickname} (${ownProfile.role})`)
  }

  // Test 2: parents
  console.log("\nTest 2: Get parent record (should work)")
  const { data: parent, error: parentError } = await supabase
    .from("parents")
    .select("id, full_name")
    .eq("user_id", authData.user.id)
    .single()

  if (parentError) {
    console.error("  ❌ Error:", parentError.message)
    return
  }
  console.log(`  ✅ Success: parent_id=${parent.id}, ${parent.full_name}`)

  // Test 3: parent_child_relations (no JOIN)
  console.log("\nTest 3: Get parent_child_relations WITHOUT JOIN")
  const { data: relations, error: relationsError } = await supabase
    .from("parent_child_relations")
    .select("id, student_id, relation_type")
    .eq("parent_id", parent.id)

  if (relationsError) {
    console.error("  ❌ Error:", relationsError.message)
  } else {
    console.log(`  ✅ Success: Found ${relations.length} relations`)
    relations.forEach((r) => {
      console.log(`    - student_id=${r.student_id}, type=${r.relation_type}`)
    })
  }

  // Test 4: students (direct, no JOIN)
  console.log("\nTest 4: Get students WITHOUT JOIN")
  const { data: students, error: studentsError } = await supabase
    .from("students")
    .select("id, login_id, full_name")

  if (studentsError) {
    console.error("  ❌ Error:", studentsError.message)
  } else {
    console.log(`  ✅ Success: Found ${students.length} students`)
    students.forEach((s) => {
      console.log(`    - ${s.full_name} (${s.login_id})`)
    })
  }

  // Test 5: students WITH JOIN to parent_child_relations
  console.log("\nTest 5: Get students WITH JOIN to parent_child_relations")
  const { data: studentsJoin, error: studentsJoinError } = await supabase
    .from("parent_child_relations")
    .select(
      `
      student_id,
      students!inner (id, login_id, full_name)
    `
    )
    .eq("parent_id", parent.id)

  if (studentsJoinError) {
    console.error("  ❌ Error:", studentsJoinError.message)
    console.error("  Detail:", JSON.stringify(studentsJoinError, null, 2))
  } else {
    console.log(`  ✅ Success: Found ${studentsJoin.length} students via JOIN`)
  }

  // Test 6: profiles of children (direct query)
  if (relations && relations.length > 0) {
    console.log("\nTest 6: Get children profiles (direct query, no JOIN)")
    const studentIds = relations.map((r) => r.student_id)

    // First get user_ids from students
    const { data: studentUsers, error: studentUsersError } = await supabase
      .from("students")
      .select("id, user_id")
      .in("id", studentIds)

    if (studentUsersError) {
      console.error("  ❌ Error getting student user_ids:", studentUsersError.message)
    } else {
      const userIds = studentUsers.map((s) => s.user_id)
      console.log(`  Student user_ids: ${userIds.join(", ")}`)

      const { data: childProfiles, error: childProfilesError } = await supabase
        .from("profiles")
        .select("id, nickname, avatar_id")
        .in("id", userIds)

      if (childProfilesError) {
        console.error("  ❌ Error:", childProfilesError.message)
        console.error("  Detail:", JSON.stringify(childProfilesError, null, 2))
      } else {
        console.log(`  ✅ Success: Found ${childProfiles.length} child profiles`)
        childProfiles.forEach((p) => {
          console.log(`    - ${p.nickname} (avatar: ${p.avatar_id})`)
        })
      }
    }
  }

  await supabase.auth.signOut()
  console.log("\n✅ Test completed")
}

testSimpleRLS().catch((error) => {
  console.error("💥 Unexpected error:", error)
  process.exit(1)
})
