// Complete hana6 user setup in production
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = "https://zlipaeanhcslhintxpej.supabase.co"
const supabaseServiceKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsaXBhZWFuaGNzbGhpbnR4cGVqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTQwODQyNywiZXhwIjoyMDc0OTg0NDI3fQ.vHLWUSK8UURjH1_W-vIImz5f7QU1J9tEKGhsfKHDs1Y"

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function completeHana6() {
  const userId = "1f01a511-3045-4a5c-9c1c-115913c630d9"

  console.log("Step 1: Creating profile for hana6...")
  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .insert({
      id: userId,
      role: "student",
      display_name: "青空 花",
      nickname: "ユーザー1234",
      avatar_id: "student1",
      theme_color: "#3B82F6",
    })
    .select()

  if (profileError) {
    console.error("Profile error:", profileError)
    return
  }
  console.log("✅ Profile created:", profileData)

  console.log("\nStep 2: Creating student record for hana6...")
  const { data: studentData, error: studentError } = await supabase
    .from("students")
    .insert({
      user_id: userId,
      full_name: "青空 花",
      furigana: "あおぞら はな",
      login_id: "hana6",
      grade: 6,
      course: "B",
    })
    .select()

  if (studentError) {
    console.error("Student error:", studentError)
    return
  }
  console.log("✅ Student created:", studentData)

  console.log("\n✅ hana6 setup complete!")
}

completeHana6().catch(console.error)
