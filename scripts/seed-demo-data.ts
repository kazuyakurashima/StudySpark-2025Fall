/**
 * デモデータ投入スクリプト（Phase 2対応版）
 *
 * 実行方法:
 * NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 \
 * SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... \
 * npx tsx scripts/seed-demo-data.ts
 */

import { createClient } from "@supabase/supabase-js"

// 環境変数チェック
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error("❌ Error: Missing required environment variables")
  console.error("Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY")
  process.exit(1)
}

// Service Role Keyを使用したSupabaseクライアント
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

// デモデータ定義
const demoData = {
  students: [
    {
      loginId: "akira5",
      password: process.env.DEMO_STUDENT_PASSWORD || "demo2025",
      fullName: "星野 明",
      nickname: "星野 明",
      grade: 5,
      course: "B" as const,
      avatarId: "student1",
    },
    {
      loginId: "hikaru6",
      password: process.env.DEMO_STUDENT_PASSWORD || "demo2025",
      fullName: "星野 光",
      nickname: "星野 光",
      grade: 6,
      course: "A" as const,
      avatarId: "student2",
    },
    {
      loginId: "hana6",
      password: process.env.DEMO_STUDENT_PASSWORD || "demo2025",
      fullName: "青空 花",
      nickname: "青空 花",
      grade: 6,
      course: "B" as const,
      avatarId: "student3",
    },
  ],
  parents: [
    {
      email: "demo-parent2@example.com",
      password: process.env.DEMO_PARENT_PASSWORD || "Testdemo2025",
      fullName: "星野 一朗",
      nickname: "星野 一朗",
      avatarId: "parent1",
      children: ["akira5", "hikaru6"], // login_id
    },
    {
      email: "demo-parent1@example.com",
      password: process.env.DEMO_PARENT_PASSWORD || "Testdemo2025",
      fullName: "青空 太郎",
      nickname: "青空 太郎",
      avatarId: "parent2",
      children: ["hana6"], // login_id
    },
  ],
}

// 生徒作成
async function createStudent(student: typeof demoData.students[0]) {
  console.log(`\n📝 Creating student: ${student.fullName} (${student.loginId})`)

  const email = `${student.loginId}@studyspark.local`

  // 1. Auth user作成
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password: student.password,
    email_confirm: true,
    user_metadata: {
      role: "student",
    },
  })

  if (authError) {
    console.error(`❌ Failed to create auth user: ${authError.message}`)
    return null
  }

  const userId = authData.user.id
  console.log(`✅ Auth user created: ${userId}`)

  // 2. Profile更新（トリガーで自動作成されるため更新のみ）
  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      nickname: student.nickname,
      avatar_id: student.avatarId,
      theme_color: "#3b82f6", // デフォルト色
      setup_completed: true,
    })
    .eq("id", userId)

  if (profileError) {
    console.error(`❌ Failed to update profile: ${profileError.message}`)
    return null
  }

  console.log(`✅ Profile updated`)

  // 3. Student作成
  const { data: studentData, error: studentError } = await supabase
    .from("students")
    .insert({
      user_id: userId,
      login_id: student.loginId,
      full_name: student.fullName,
      furigana: null,
      grade: student.grade,
      course: student.course,
    })
    .select("id")
    .single()

  if (studentError) {
    console.error(`❌ Failed to create student: ${studentError.message}`)
    return null
  }

  console.log(`✅ Student record created (id: ${studentData.id})`)

  return {
    userId,
    studentId: studentData.id,
    loginId: student.loginId,
  }
}

// 保護者作成
async function createParent(parent: typeof demoData.parents[0]) {
  console.log(`\n📝 Creating parent: ${parent.fullName} (${parent.email})`)

  // 1. Auth user作成
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: parent.email,
    password: parent.password,
    email_confirm: true,
    user_metadata: {
      role: "parent",
    },
  })

  if (authError) {
    console.error(`❌ Failed to create auth user: ${authError.message}`)
    return null
  }

  const userId = authData.user.id
  console.log(`✅ Auth user created: ${userId}`)

  // 2. Profile更新（トリガーで自動作成されるため更新のみ）
  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      nickname: parent.nickname,
      avatar_id: parent.avatarId,
      theme_color: "#3b82f6", // デフォルト色
      setup_completed: true,
    })
    .eq("id", userId)

  if (profileError) {
    console.error(`❌ Failed to update profile: ${profileError.message}`)
    return null
  }

  console.log(`✅ Profile updated`)

  // 3. Parent作成
  const { data: parentData, error: parentError } = await supabase
    .from("parents")
    .insert({
      user_id: userId,
      full_name: parent.fullName,
      furigana: null,
    })
    .select("id")
    .single()

  if (parentError) {
    console.error(`❌ Failed to create parent: ${parentError.message}`)
    return null
  }

  console.log(`✅ Parent record created (id: ${parentData.id})`)

  return {
    userId,
    parentId: parentData.id,
    email: parent.email,
    children: parent.children,
  }
}

// 親子関係作成
async function createParentChildRelation(
  parentId: number,
  studentId: number,
  relationType: "father" | "mother" | "guardian" = "father"
) {
  const { error } = await supabase.from("parent_child_relations").insert({
    parent_id: parentId,
    student_id: studentId,
    relation_type: relationType,
  })

  if (error) {
    console.error(`❌ Failed to create parent-child relation: ${error.message}`)
    return false
  }

  return true
}

// メイン処理
async function main() {
  console.log("🚀 Starting demo data seeding...")
  console.log(`📍 Supabase URL: ${supabaseUrl}\n`)

  let successCount = 0
  let failCount = 0

  // 生徒マップ（login_id -> studentId）
  const studentMap = new Map<string, number>()

  console.log("=" .repeat(50))
  console.log("👨‍🎓 Creating Students")
  console.log("=" .repeat(50))

  for (const student of demoData.students) {
    const result = await createStudent(student)
    if (result) {
      studentMap.set(result.loginId, result.studentId)
      successCount++
    } else {
      failCount++
    }
  }

  console.log("\n" + "=".repeat(50))
  console.log("👪 Creating Parents")
  console.log("=" .repeat(50))

  for (const parent of demoData.parents) {
    const result = await createParent(parent)
    if (result) {
      successCount++

      // 親子関係登録
      console.log(`\n🔗 Creating parent-child relations for ${parent.fullName}...`)
      for (const childLoginId of result.children) {
        const studentId = studentMap.get(childLoginId)
        if (studentId) {
          const relationSuccess = await createParentChildRelation(
            result.parentId,
            studentId,
            "father"
          )
          if (relationSuccess) {
            console.log(`✅ Linked ${parent.fullName} → ${childLoginId}`)
          }
        } else {
          console.error(`❌ Student ${childLoginId} not found`)
        }
      }
    } else {
      failCount++
    }
  }

  console.log("\n" + "=".repeat(50))
  console.log("📊 Summary")
  console.log("=" .repeat(50))
  console.log(`✅ Success: ${successCount}`)
  console.log(`❌ Failed: ${failCount}`)
  console.log(`📝 Total: ${successCount + failCount}`)

  if (failCount > 0) {
    console.log("\n⚠️  Some records failed to create. Check the logs above.")
  } else {
    console.log("\n🎉 All demo data created successfully!")
  }

  console.log("\n✅ Script completed")
}

main().catch((error) => {
  console.error("💥 Unexpected error:", error)
  process.exit(1)
})
