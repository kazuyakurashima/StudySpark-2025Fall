import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function checkGrade6Sessions() {
  try {
    console.log("🔍 Checking all Grade 6 study sessions...")

    // Get all grade 6 sessions
    const { data: sessions, error } = await supabase
      .from("study_sessions")
      .select("id, session_number, grade, start_date, end_date")
      .eq("grade", 6)
      .order("session_number", { ascending: true })

    if (error) {
      console.error("❌ Error:", error)
      return
    }

    console.log(`\n📋 Found ${sessions?.length || 0} sessions for Grade 6:\n`)

    sessions?.forEach((session) => {
      console.log(`Session ${session.session_number}: ID=${session.id}, ${session.start_date} ~ ${session.end_date}`)
    })

    // Check for overlapping periods
    console.log(`\n🔍 Checking for overlapping periods...`)
    const overlaps: string[] = []

    for (let i = 0; i < (sessions?.length || 0); i++) {
      for (let j = i + 1; j < (sessions?.length || 0); j++) {
        const s1 = sessions![i]
        const s2 = sessions![j]

        const start1 = new Date(s1.start_date)
        const end1 = new Date(s1.end_date)
        const start2 = new Date(s2.start_date)
        const end2 = new Date(s2.end_date)

        // Check if periods overlap
        if (start1 <= end2 && start2 <= end1) {
          overlaps.push(`⚠️ Session ${s1.session_number} (${s1.start_date}~${s1.end_date}) overlaps with Session ${s2.session_number} (${s2.start_date}~${s2.end_date})`)
        }
      }
    }

    if (overlaps.length > 0) {
      console.log(`\n⚠️ Found ${overlaps.length} overlapping period(s):`)
      overlaps.forEach((msg) => console.log(`   ${msg}`))
    } else {
      console.log(`\n✅ No overlapping periods found`)
    }

    // Check which session today belongs to
    const now = new Date()
    const jstDate = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }))
    const today = jstDate.toISOString().split("T")[0]

    console.log(`\n📅 Today (JST): ${today}`)
    console.log(`\nSessions that include today:`)

    const todaySessions = sessions?.filter((s) => {
      return s.start_date <= today && s.end_date >= today
    })

    if (todaySessions && todaySessions.length > 0) {
      todaySessions.forEach((s) => {
        console.log(`   - Session ${s.session_number} (ID: ${s.id}): ${s.start_date} ~ ${s.end_date}`)
      })

      if (todaySessions.length > 1) {
        console.log(`\n⚠️ WARNING: Multiple sessions include today! This will cause data inconsistency.`)
      }
    } else {
      console.log(`   - No sessions found for today`)
    }

    console.log(`\n🎉 Check completed!`)
  } catch (error) {
    console.error("❌ Error:", error)
    process.exit(1)
  }
}

checkGrade6Sessions()
