import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function clearParentByEmail(email: string) {
  try {
    console.log(`🧹 Clearing parent data for email: ${email}`)

    // 1. メールアドレスから認証ユーザーを検索
    const { data: authUsers, error: authSearchError } =
      await supabase.auth.admin.listUsers()

    if (authSearchError) {
      console.error("❌ Error searching auth users:", authSearchError)
      return
    }

    const targetUser = authUsers.users.find((user) => user.email === email)

    if (!targetUser) {
      console.log("✅ No user found with that email address")
      return
    }

    console.log(`📋 Found user: ${targetUser.email} (ID: ${targetUser.id})`)

    // 2. parentsテーブルから保護者を検索
    const { data: parent, error: parentSearchError } = await supabase
      .from("parents")
      .select("id, full_name")
      .eq("user_id", targetUser.id)
      .single()

    if (parentSearchError && parentSearchError.code !== "PGRST116") {
      console.error("❌ Error searching for parent:", parentSearchError)
      return
    }

    if (!parent) {
      console.log("⚠️  No parent record found, deleting auth user only...")
      const { error: authDeleteError } = await supabase.auth.admin.deleteUser(
        targetUser.id
      )
      if (authDeleteError) {
        console.error("❌ Error deleting auth user:", authDeleteError)
      } else {
        console.log("✅ Auth user deleted")
      }
      return
    }

    console.log(`📋 Found parent: ${parent.full_name} (ID: ${parent.id})`)

    // 3. 関連する子どもを検索
    const { data: relations, error: relationsError } = await supabase
      .from("parent_child_relations")
      .select("student_id, students(id, full_name, user_id, login_id)")
      .eq("parent_id", parent.id)

    if (relationsError) {
      console.error("❌ Error searching for children:", relationsError)
    } else if (relations && relations.length > 0) {
      console.log(`📋 Found ${relations.length} child(ren):`)
      relations.forEach((rel: any) => {
        if (rel.students) {
          console.log(
            `   - ${rel.students.full_name} (${rel.students.login_id})`
          )
        }
      })

      const studentIds = relations
        .map((rel: any) => rel.students?.id)
        .filter(Boolean)
      const studentUserIds = relations
        .map((rel: any) => rel.students?.user_id)
        .filter(Boolean)

      // 4. 親子関係を削除
      console.log("\n🗑️  Deleting parent-child relations...")
      const { error: relationDeleteError } = await supabase
        .from("parent_child_relations")
        .delete()
        .eq("parent_id", parent.id)

      if (relationDeleteError) {
        console.error("❌ Error deleting relations:", relationDeleteError)
      } else {
        console.log("✅ Relations deleted")
      }

      // 5. 子どもの学習記録を削除
      if (studentIds.length > 0) {
        console.log("\n🗑️  Deleting student study logs...")
        const { error: logsDeleteError } = await supabase
          .from("study_logs")
          .delete()
          .in("student_id", studentIds)

        if (logsDeleteError) {
          console.error("❌ Error deleting study logs:", logsDeleteError)
        } else {
          console.log("✅ Study logs deleted")
        }
      }

      // 6. 子どもレコードを削除
      if (studentIds.length > 0) {
        console.log("\n🗑️  Deleting student records...")
        const { error: studentDeleteError } = await supabase
          .from("students")
          .delete()
          .in("id", studentIds)

        if (studentDeleteError) {
          console.error("❌ Error deleting students:", studentDeleteError)
        } else {
          console.log("✅ Student records deleted")
        }
      }

      // 7. 子どもの認証ユーザーを削除
      if (studentUserIds.length > 0) {
        console.log("\n🗑️  Deleting student auth users...")
        for (const userId of studentUserIds) {
          const { error: authDeleteError } = await supabase.auth.admin.deleteUser(
            userId
          )
          if (authDeleteError) {
            console.error(
              `❌ Error deleting student auth user ${userId}:`,
              authDeleteError
            )
          } else {
            console.log(`✅ Deleted student auth user: ${userId}`)
          }
        }
      }
    }

    // 8. 保護者レコードを削除
    console.log("\n🗑️  Deleting parent record...")
    const { error: parentDeleteError } = await supabase
      .from("parents")
      .delete()
      .eq("id", parent.id)

    if (parentDeleteError) {
      console.error("❌ Error deleting parent:", parentDeleteError)
    } else {
      console.log("✅ Parent record deleted")
    }

    // 9. 保護者の認証ユーザーを削除
    console.log("\n🗑️  Deleting parent auth user...")
    const { error: authDeleteError } = await supabase.auth.admin.deleteUser(
      targetUser.id
    )

    if (authDeleteError) {
      console.error("❌ Error deleting auth user:", authDeleteError)
    } else {
      console.log("✅ Parent auth user deleted")
    }

    console.log("\n✅ Parent data cleared successfully!")
  } catch (error) {
    console.error("❌ Unexpected error:", error)
    process.exit(1)
  }
}

// コマンドライン引数からメールアドレスを取得
const email = process.argv[2]

if (!email) {
  console.error("❌ Please provide an email address")
  console.log("Usage: pnpm tsx scripts/clear-parent-by-email.ts <email>")
  process.exit(1)
}

clearParentByEmail(email)
