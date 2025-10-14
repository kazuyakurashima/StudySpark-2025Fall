import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function testParentDashboard() {
  console.log("🔍 Testing parent dashboard data fetch...")

  const adminClient = createSupabaseClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  // Get demo-parent user
  const { data: users, error: usersError } = await adminClient.auth.admin.listUsers()
  const demoParent = users?.users?.find(u => u.email === 'demo-parent@example.com')

  if (!demoParent) {
    console.error("❌ Demo parent user not found")
    return
  }

  console.log("✅ Found demo parent:", demoParent.email, demoParent.id)

  // Get profile
  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("display_name, avatar_url, role")
    .eq("id", demoParent.id)
    .single()

  console.log("🔍 Profile:", { profile, error: profileError?.message })

  // Get parent record
  const { data: parent, error: parentError } = await adminClient
    .from("parents")
    .select("id")
    .eq("user_id", demoParent.id)
    .single()

  console.log("🔍 Parent record:", { parent, error: parentError?.message })

  if (!parent) {
    console.error("❌ Parent record not found")
    return
  }

  // Get parent_child_relations
  const { data: relations, error: relationsError } = await adminClient
    .from("parent_child_relations")
    .select("student_id")
    .eq("parent_id", parent.id)

  console.log("🔍 Relations:", { relations, error: relationsError?.message })

  if (!relations || relations.length === 0) {
    console.error("❌ No child relations found")
    return
  }

  const studentIds = relations.map(r => r.student_id)
  console.log("🔍 Student IDs:", studentIds)

  // Get students
  const { data: students, error: studentsError } = await adminClient
    .from("students")
    .select("id, full_name, grade, course, user_id")
    .in("id", studentIds)

  console.log("🔍 Students:", { students, error: studentsError?.message })

  if (!students) {
    console.error("❌ No students found")
    return
  }

  // Get profiles
  const userIds = students.map(s => s.user_id).filter(Boolean)
  console.log("🔍 User IDs for profiles:", userIds)

  const { data: profiles, error: profilesError } = await adminClient
    .from("profiles")
    .select("id, display_name, avatar_url")
    .in("id", userIds)

  console.log("🔍 Profiles:", { profiles, error: profilesError?.message })

  // Combine data
  const children = relations.map((relation) => {
    const student = students.find((s) => s.id === relation.student_id)
    const studentProfile = profiles?.find((p) => p.id === student?.user_id)

    return {
      student_id: relation.student_id,
      students: {
        id: student?.id,
        full_name: student?.full_name,
        grade: student?.grade,
        course: student?.course,
        user_id: student?.user_id,
        profiles: studentProfile
          ? {
              display_name: studentProfile.display_name,
              avatar_url: studentProfile.avatar_url,
            }
          : null,
      },
    }
  })

  console.log("✅ Final children data:")
  console.log(JSON.stringify(children, null, 2))
}

testParentDashboard().catch(console.error)
