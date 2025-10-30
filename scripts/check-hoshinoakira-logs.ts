import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function checkHoshinoAkiraLogs() {
  try {
    console.log("🔍 Searching for 星野 明...")

    // Search for student with display_name containing "星野" and "明"
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, display_name, role")
      .ilike("display_name", "%星野%明%")

    if (profilesError) {
      throw new Error(`Failed to search profiles: ${profilesError.message}`)
    }

    console.log(`✅ Found ${profiles?.length || 0} matching profiles:`)
    profiles?.forEach(p => {
      console.log(`  - ${p.display_name} (ID: ${p.id}, Role: ${p.role})`)
    })

    // Also search for students
    const { data: students, error: studentsError } = await supabase
      .from("students")
      .select(`
        id,
        user_id,
        grade,
        profiles (display_name)
      `)

    if (studentsError) {
      throw new Error(`Failed to fetch students: ${studentsError.message}`)
    }

    console.log(`\n✅ All students in database:`)
    students?.forEach(s => {
      const displayName = (s as any).profiles?.display_name || "Unknown"
      console.log(`  - ${displayName} (Student ID: ${s.id}, User ID: ${s.user_id}, Grade: ${s.grade})`)
    })

    // If we found 星野明, get their logs
    const hoshinoProfile = profiles?.find(p => p.display_name.includes("星野") && p.display_name.includes("明"))

    if (hoshinoProfile) {
      console.log(`\n📚 Found 星野明! Fetching their study logs...`)

      // Get student record
      const { data: student, error: studentError } = await supabase
        .from("students")
        .select("id, grade")
        .eq("user_id", hoshinoProfile.id)
        .single()

      if (studentError || !student) {
        console.log(`⚠️ No student record found for this user`)
        return
      }

      console.log(`✅ Student ID: ${student.id}, Grade: ${student.grade}`)

      // Get Japanese subject ID
      const { data: subject, error: subjectError } = await supabase
        .from("subjects")
        .select("id")
        .eq("name", "国語")
        .single()

      if (subjectError || !subject) {
        throw new Error(`Failed to find subject: ${subjectError?.message}`)
      }

      // Get all Japanese logs
      const { data: logs, error: logsError } = await supabase
        .from("study_logs")
        .select(`
          id,
          session_id,
          study_date,
          study_content_type_id,
          correct_count,
          total_problems,
          reflection_text,
          study_sessions (session_number)
        `)
        .eq("student_id", student.id)
        .eq("subject_id", subject.id)
        .order("study_date", { ascending: false })
        .order("id", { ascending: false })

      if (logsError) {
        console.error(`❌ Failed to fetch logs: ${logsError.message}`)
        return
      }

      console.log(`\n📋 Found ${logs?.length || 0} Japanese logs:`)
      logs?.forEach(log => {
        const sessionNum = (log as any).study_sessions?.session_number || "?"
        console.log(`  - [ID: ${log.id}] Session ${sessionNum}: ${log.study_date} - ${log.correct_count}/${log.total_problems} (Content Type: ${log.study_content_type_id})`)
      })

      // Focus on Session 6 and 9
      const session6Logs = logs?.filter(log => (log as any).study_sessions?.session_number === 6)
      const session9Logs = logs?.filter(log => (log as any).study_sessions?.session_number === 9)

      console.log(`\n📅 Session 6 logs:`)
      if (session6Logs && session6Logs.length > 0) {
        session6Logs.forEach(log => {
          console.log(`  - [ID: ${log.id}] ${log.study_date}: ${log.correct_count}/${log.total_problems} (Content Type: ${log.study_content_type_id})`)
        })
      } else {
        console.log(`  - No logs`)
      }

      console.log(`\n📅 Session 9 logs:`)
      if (session9Logs && session9Logs.length > 0) {
        session9Logs.forEach(log => {
          console.log(`  - [ID: ${log.id}] ${log.study_date}: ${log.correct_count}/${log.total_problems} (Content Type: ${log.study_content_type_id})`)
        })
      } else {
        console.log(`  - No logs`)
      }
    } else {
      console.log(`\n⚠️ Could not find 星野明 in profiles`)
    }

    console.log(`\n🎉 Check completed!`)

  } catch (error) {
    console.error("❌ Error:", error)
    process.exit(1)
  }
}

checkHoshinoAkiraLogs()
