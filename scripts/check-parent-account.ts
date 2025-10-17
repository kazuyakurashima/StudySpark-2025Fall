/**
 * 保護者アカウントの存在確認スクリプト
 */

import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

const EMAIL_TO_CHECK = "toshin.hitachi+test001@gmail.com"

async function checkAccount() {
  console.log(`\n🔍 Checking account for: ${EMAIL_TO_CHECK}\n`)

  try {
    // 1. Check if user exists in auth.users
    const { data: users } = await supabase.auth.admin.listUsers()
    const user = users.users.find((u) => u.email === EMAIL_TO_CHECK)

    if (!user) {
      console.log("❌ User not found in auth.users")
      console.log("\nPlease register this account first via the parent registration form.")
      return
    }

    console.log("✅ User found in auth.users")
    console.log(`   User ID: ${user.id}`)
    console.log(`   Email: ${user.email}`)
    console.log(`   Email confirmed: ${user.email_confirmed_at ? "Yes" : "No"}`)
    console.log(`   Created: ${user.created_at}`)

    // 2. Check profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single()

    if (profileError || !profile) {
      console.log("\n❌ Profile not found in profiles table")
      console.log("   Error:", profileError?.message)
      return
    }

    console.log("\n✅ Profile found")
    console.log(`   Role: ${profile.role}`)
    console.log(`   Display name: ${profile.display_name || "(not set)"}`)
    console.log(`   Setup completed: ${profile.setup_completed ? "Yes" : "No"}`)

    // 3. Check parent record
    const { data: parentRecord, error: parentError } = await supabase
      .from("parents")
      .select("*")
      .eq("user_id", user.id)
      .single()

    if (parentError || !parentRecord) {
      console.log("\n❌ Parent record not found in parents table")
      console.log("   Error:", parentError?.message)
      return
    }

    console.log("\n✅ Parent record found")
    console.log(`   Parent ID: ${parentRecord.id}`)
    console.log(`   Full name: ${parentRecord.full_name}`)
    console.log(`   Furigana: ${parentRecord.furigana}`)

    // 4. Check children
    const { data: relations, error: relationsError } = await supabase
      .from("parent_child_relations")
      .select("*, students(*)")
      .eq("parent_id", parentRecord.id)

    if (relationsError) {
      console.log("\n❌ Error fetching children")
      console.log("   Error:", relationsError.message)
      return
    }

    console.log(`\n✅ Children: ${relations?.length || 0}`)
    if (relations && relations.length > 0) {
      relations.forEach((rel, index) => {
        const student = rel.students as any
        console.log(`   ${index + 1}. Student ID: ${rel.student_id}`)
        console.log(`      Grade: ${student.grade}`)
        console.log(`      User ID: ${student.user_id}`)
      })
    }

    console.log("\n✅ Account is properly set up!")
    console.log("\n📝 Try logging in with:")
    console.log(`   Email: ${EMAIL_TO_CHECK}`)
    console.log(`   Password: <your password>`)
    console.log("\n   If you forgot your password, use the password reset feature.")

  } catch (error) {
    console.error("\n❌ Error:", error)
  }
}

checkAccount()
