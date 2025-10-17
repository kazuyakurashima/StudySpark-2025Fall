import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function clearTestParentData() {
  try {
    console.log("🧹 Clearing test parent data...")

    // 1. テスト用保護者メールアドレスのパターン
    const testEmailPatterns = [
      "test%",
      "parent%",
      "%@example.com",
      "%@studyspark.local",
    ]

    // 2. テスト用の保護者を検索
    const { data: testParents, error: searchError } = await supabase
      .from("parents")
      .select("id, user_id, full_name")
      .or(testEmailPatterns.map((pattern) => `user_id.like.${pattern}`).join(","))

    if (searchError) {
      console.error("❌ Error searching for test parents:", searchError)
      return
    }

    if (!testParents || testParents.length === 0) {
      console.log("✅ No test parent data found to clear")
      return
    }

    console.log(`📋 Found ${testParents.length} test parent(s) to delete:`)
    testParents.forEach((parent) => {
      console.log(`   - ${parent.full_name} (ID: ${parent.id})`)
    })

    const parentIds = testParents.map((p) => p.id)
    const userIds = testParents.map((p) => p.user_id)

    // 3. 関連する子どもを検索
    const { data: relatedStudents, error: studentSearchError } = await supabase
      .from("parent_child_relations")
      .select("student_id, students(id, full_name, user_id)")
      .in("parent_id", parentIds)

    if (studentSearchError) {
      console.error("❌ Error searching for related students:", studentSearchError)
    } else if (relatedStudents && relatedStudents.length > 0) {
      console.log(`📋 Found ${relatedStudents.length} related student(s):`)
      relatedStudents.forEach((rel: any) => {
        if (rel.students) {
          console.log(`   - ${rel.students.full_name} (ID: ${rel.students.id})`)
        }
      })

      const studentIds = relatedStudents
        .map((rel: any) => rel.students?.id)
        .filter(Boolean)
      const studentUserIds = relatedStudents
        .map((rel: any) => rel.students?.user_id)
        .filter(Boolean)

      // 4. 親子関係を削除
      console.log("\n🗑️  Deleting parent-child relations...")
      const { error: relationDeleteError } = await supabase
        .from("parent_child_relations")
        .delete()
        .in("parent_id", parentIds)

      if (relationDeleteError) {
        console.error("❌ Error deleting relations:", relationDeleteError)
      } else {
        console.log("✅ Parent-child relations deleted")
      }

      // 5. 子どもの学習記録を削除
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

      // 6. 子どもレコードを削除
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

      // 7. 子どもの認証ユーザーを削除
      console.log("\n🗑️  Deleting student auth users...")
      for (const userId of studentUserIds) {
        const { error: authDeleteError } = await supabase.auth.admin.deleteUser(
          userId
        )
        if (authDeleteError) {
          console.error(`❌ Error deleting auth user ${userId}:`, authDeleteError)
        } else {
          console.log(`✅ Deleted auth user: ${userId}`)
        }
      }
    }

    // 8. 保護者レコードを削除
    console.log("\n🗑️  Deleting parent records...")
    const { error: parentDeleteError } = await supabase
      .from("parents")
      .delete()
      .in("id", parentIds)

    if (parentDeleteError) {
      console.error("❌ Error deleting parents:", parentDeleteError)
    } else {
      console.log("✅ Parent records deleted")
    }

    // 9. 保護者の認証ユーザーを削除
    console.log("\n🗑️  Deleting parent auth users...")
    for (const userId of userIds) {
      const { error: authDeleteError } = await supabase.auth.admin.deleteUser(
        userId
      )
      if (authDeleteError) {
        console.error(`❌ Error deleting auth user ${userId}:`, authDeleteError)
      } else {
        console.log(`✅ Deleted auth user: ${userId}`)
      }
    }

    console.log("\n✅ Test parent data cleared successfully!")
  } catch (error) {
    console.error("❌ Unexpected error:", error)
    process.exit(1)
  }
}

clearTestParentData()
