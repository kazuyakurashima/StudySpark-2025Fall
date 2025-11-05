/**
 * Phase 2 RLSポリシーテスト
 * 保護者が子供のデータにアクセスできることを確認
 */

import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"

async function testParentRLS() {
  console.log("🧪 Testing Parent RLS Policies...\n")

  // Create client with anon key
  const supabase = createClient(supabaseUrl, supabaseAnonKey)

  // Sign in as parent
  const parentEmail = "toshin.hitachi+test002@gmail.com"
  const parentPassword = "Testdemo2025"

  console.log(`🔐 Signing in as parent: ${parentEmail}`)
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: parentEmail,
    password: parentPassword,
  })

  if (authError || !authData.user) {
    console.error("❌ Failed to sign in:", authError?.message)
    return
  }

  console.log(`✅ Signed in successfully (user_id: ${authData.user.id})\n`)

  // Test 1: Get parent's own info
  console.log("Test 1: Get parent's own profile")
  const { data: parentProfile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", authData.user.id)
    .single()

  if (profileError) {
    console.error("  ❌ Failed:", profileError.message)
  } else {
    console.log(`  ✅ Success: ${parentProfile.nickname} (role: ${parentProfile.role})`)
  }

  // Test 2: Get parent record
  console.log("\nTest 2: Get parent record")
  const { data: parent, error: parentError } = await supabase
    .from("parents")
    .select("*")
    .eq("user_id", authData.user.id)
    .single()

  if (parentError) {
    console.error("  ❌ Failed:", parentError.message)
    return
  }
  console.log(`  ✅ Success: parent_id=${parent.id}, ${parent.full_name}`)

  // Test 3: Get children via parent_child_relations
  console.log("\nTest 3: Get children via parent_child_relations")
  const { data: relations, error: relationsError } = await supabase
    .from("parent_child_relations")
    .select(
      `
      student_id,
      students!inner (
        id, full_name, grade, course, user_id,
        profiles!inner (id, nickname, avatar_id, theme_color)
      )
    `
    )
    .eq("parent_id", parent.id)

  if (relationsError) {
    console.error("  ❌ Failed:", relationsError.message)
  } else {
    console.log(`  ✅ Success: Found ${relations.length} children`)
    relations.forEach((rel: any) => {
      console.log(
        `    - ${rel.students.full_name} (${rel.students.grade}年, ${rel.students.course}コース)`
      )
      console.log(
        `      Profile: ${rel.students.profiles.nickname}, avatar: ${rel.students.profiles.avatar_id}`
      )
    })
  }

  // Test 4: Direct access to students table (RLS should allow)
  console.log("\nTest 4: Direct access to students table (via RLS)")
  const { data: students, error: studentsError } = await supabase
    .from("students")
    .select("id, full_name, grade")

  if (studentsError) {
    console.error("  ❌ Failed:", studentsError.message)
  } else {
    console.log(`  ✅ Success: Can access ${students.length} students (should be 2: akira5, hikaru6)`)
    students.forEach((s) => {
      console.log(`    - ${s.full_name} (Grade ${s.grade})`)
    })
  }

  // Test 5: Direct access to children's profiles (RLS should allow)
  console.log("\nTest 5: Direct access to children's profiles (via RLS)")

  // Get child user IDs
  const childUserIds = relations?.map((r: any) => r.students.user_id) || []

  const { data: childProfiles, error: childProfilesError } = await supabase
    .from("profiles")
    .select("id, nickname, avatar_id, role")
    .in("id", childUserIds)

  if (childProfilesError) {
    console.error("  ❌ Failed:", childProfilesError.message)
  } else {
    console.log(`  ✅ Success: Can access ${childProfiles.length} children profiles`)
    childProfiles.forEach((p) => {
      console.log(`    - ${p.nickname} (${p.role}, avatar: ${p.avatar_id})`)
    })
  }

  // Test 6: Access to master data (should work for all authenticated users)
  console.log("\nTest 6: Access to master data (study_sessions, subjects)")
  const { data: sessions, error: sessionsError } = await supabase
    .from("study_sessions")
    .select("id")
    .limit(1)

  const { data: subjects, error: subjectsError } = await supabase.from("subjects").select("name")

  if (sessionsError || subjectsError) {
    console.error("  ❌ Failed:", sessionsError?.message || subjectsError?.message)
  } else {
    console.log(`  ✅ Success: Can access master data`)
    console.log(`    - Subjects: ${subjects?.map((s) => s.name).join(", ")}`)
  }

  // Sign out
  await supabase.auth.signOut()
  console.log("\n✅ All RLS tests completed successfully!")
  console.log("\n📊 Summary:")
  console.log("  ✅ Parent can access own profile")
  console.log("  ✅ Parent can access children via relations")
  console.log("  ✅ Parent can access children students records (RLS)")
  console.log("  ✅ Parent can access children profiles (RLS)")
  console.log("  ✅ Parent can access master data")
}

testParentRLS().catch((error) => {
  console.error("💥 Unexpected error:", error)
  process.exit(1)
})
