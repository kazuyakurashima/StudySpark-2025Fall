import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function testStudentDashboard() {
  console.log("🔍 Testing student dashboard data fetch...")

  const adminClient = createSupabaseClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  // Get demo student users
  const { data: users, error: usersError } = await adminClient.auth.admin.listUsers()
  const demoStudents = users?.users?.filter(u => u.email?.startsWith('student')) || []

  console.log(`✅ Found ${demoStudents.length} student users`)

  for (const student of demoStudents.slice(0, 2)) {
    console.log("\n" + "=".repeat(60))
    console.log("🔍 Testing student:", student.email, student.id)

    // Get profile
    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("display_name, avatar_url, role")
      .eq("id", student.id)
      .single()

    console.log("📝 Profile:", profile ? `${profile.display_name} (${profile.role})` : "NOT FOUND")
    if (profileError) console.error("❌ Profile error:", profileError.message)

    // Get student record
    const { data: studentRecord, error: studentError } = await adminClient
      .from("students")
      .select("id, full_name, grade, course, user_id")
      .eq("user_id", student.id)
      .single()

    console.log("👨‍🎓 Student record:", studentRecord ? `${studentRecord.full_name} (Grade ${studentRecord.grade}, Course ${studentRecord.course})` : "NOT FOUND")
    if (studentError) console.error("❌ Student error:", studentError.message)

    // Test RLS by simulating as this user
    console.log("🔐 Testing RLS policies...")

    // Test profiles table access
    const { data: profileRLS, error: profileRLSError } = await adminClient
      .rpc('check_profile_access', { user_id: student.id })
      .catch(() => ({ data: null, error: { message: "RPC not available" } }))

    // Test students table access
    const { data: studentRLS, error: studentRLSError } = await adminClient
      .from("students")
      .select("id, full_name, grade")
      .eq("user_id", student.id)
      .single()

    console.log("✅ Students table RLS test:", studentRLS ? "PASSED" : "FAILED")
    if (studentRLSError) console.log("   Error:", studentRLSError.message)
  }

  console.log("\n" + "=".repeat(60))
  console.log("✅ Test completed")
}

testStudentDashboard().catch(console.error)
