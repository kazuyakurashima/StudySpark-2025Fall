import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function checkAllAccounts() {
  try {
    console.log("🔍 ローカルデータベースの全アカウント情報\n")
    console.log("=" .repeat(80))

    // Get all profiles
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("*")
      .order("role", { ascending: true })
      .order("display_name", { ascending: true })

    if (profilesError) {
      console.error("❌ Error fetching profiles:", profilesError)
      return
    }

    if (!profiles || profiles.length === 0) {
      console.log("⚠️ データベースにアカウントが存在しません")
      return
    }

    console.log(`\n📊 合計 ${profiles.length} アカウント\n`)

    // Group by role
    const studentProfiles = profiles.filter((p) => p.role === "student")
    const parentProfiles = profiles.filter((p) => p.role === "parent")
    const coachProfiles = profiles.filter((p) => p.role === "coach")
    const adminProfiles = profiles.filter((p) => p.role === "admin")

    // Display students
    if (studentProfiles.length > 0) {
      console.log("👨‍🎓 生徒アカウント")
      console.log("-".repeat(80))
      console.log("表示名\t\t\tメール/ユーザーID\t\t\tアバター\t\t学年\tコース")
      console.log("-".repeat(80))

      for (const profile of studentProfiles) {
        const { data: student } = await supabase
          .from("students")
          .select("grade, course")
          .eq("user_id", profile.id)
          .maybeSingle()

        const grade = student?.grade || "未設定"
        const course = student?.course || "未設定"
        const avatar = profile.avatar_url || "未設定"
        const identifier = profile.email || profile.id.substring(0, 8)

        console.log(`${profile.display_name}\t\t${identifier}\t${avatar}\t${grade}\t${course}`)
      }
      console.log("")
    }

    // Display parents
    if (parentProfiles.length > 0) {
      console.log("👪 保護者アカウント")
      console.log("-".repeat(80))
      console.log("メール\t\t\t\t表示名\t\tアバター\t\t子供")
      console.log("-".repeat(80))

      for (const profile of parentProfiles) {
        const { data: relationships } = await supabase
          .from("parent_student_relationships")
          .select(`
            student_id,
            students!inner(
              user_id,
              profiles!inner(display_name)
            )
          `)
          .eq("parent_id", profile.id)

        const children = relationships
          ?.map((r: any) => r.students?.profiles?.display_name)
          .filter(Boolean)
          .join(", ") || "なし"

        const avatar = profile.avatar_url || "未設定"
        const email = profile.email || "未設定"

        console.log(`${email}\t${profile.display_name}\t${avatar}\t${children}`)
      }
      console.log("")
    }

    // Display coaches
    if (coachProfiles.length > 0) {
      console.log("🎓 指導者アカウント")
      console.log("-".repeat(80))
      console.log("メール\t\t\t\t表示名\t\tアバター")
      console.log("-".repeat(80))

      for (const profile of coachProfiles) {
        const avatar = profile.avatar_url || "未設定"
        const email = profile.email || "未設定"

        console.log(`${email}\t${profile.display_name}\t${avatar}`)
      }
      console.log("")
    }

    // Display admins
    if (adminProfiles.length > 0) {
      console.log("👑 管理者アカウント")
      console.log("-".repeat(80))
      console.log("メール\t\t\t\t表示名")
      console.log("-".repeat(80))

      for (const profile of adminProfiles) {
        const email = profile.email || "未設定"
        console.log(`${email}\t${profile.display_name}`)
      }
      console.log("")
    }

    // Summary
    console.log("=" .repeat(80))
    console.log("📊 サマリー:")
    console.log(`   生徒: ${studentProfiles.length}`)
    console.log(`   保護者: ${parentProfiles.length}`)
    console.log(`   指導者: ${coachProfiles.length}`)
    console.log(`   管理者: ${adminProfiles.length}`)
    console.log("=" .repeat(80))

    console.log("\n🎉 確認完了!")
  } catch (error) {
    console.error("❌ Error:", error)
    process.exit(1)
  }
}

checkAllAccounts()
