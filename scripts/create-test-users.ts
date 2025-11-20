/**
 * テストユーザー作成スクリプト
 *
 * 実行方法:
 * npx tsx scripts/create-test-users.ts
 *
 * 必要な環境変数:
 * - NEXT_PUBLIC_SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js"

// 環境変数チェック
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error("Error: Missing required environment variables")
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

// テストデータ定義
const testUsers = {
  students: [
    {
      loginId: "student5a",
      password: process.env.DEMO_PASSWORD || "password123",
      name: "田中太郎",
      nameKana: "タナカタロウ",
      displayName: "たろう",
      grade: 5,
      avatar: "student1",
    },
    {
      loginId: "student6a",
      password: process.env.DEMO_PASSWORD || "password123",
      name: "鈴木花子",
      nameKana: "スズキハナコ",
      displayName: "はなこ",
      grade: 6,
      avatar: "student2",
    },
  ],
  parents: [
    {
      email: "parent1@example.com",
      password: process.env.DEMO_PASSWORD || "password123",
      name: "山田一郎",
      nameKana: "ヤマダイチロウ",
      displayName: "山田",
    },
  ],
  coaches: [
    {
      email: "coach1@example.com",
      password: process.env.DEMO_PASSWORD || "password123",
      name: "佐藤先生",
      nameKana: "サトウセンセイ",
      displayName: "佐藤先生",
    },
  ],
}

async function createStudent(student: (typeof testUsers.students)[0]) {
  console.log(`\n📝 Creating student: ${student.name} (${student.loginId})`)

  const email = `${student.loginId}@studyspark.local`

  // 1. ユーザー作成
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password: student.password,
    email_confirm: true,
    user_metadata: {
      role: "student",
      name: student.name,
      name_kana: student.nameKana,
      login_id: student.loginId,
    },
  })

  if (authError) {
    console.error(`❌ Failed to create auth user: ${authError.message}`)
    return false
  }

  console.log(`✅ Auth user created: ${authData.user.id}`)

  // 2. プロフィール作成
  const { error: profileError } = await supabase.from("profiles").insert({
    id: authData.user.id,
    role: "student",
    display_name: student.displayName,
    avatar_url: student.avatar,
    setup_completed: true,
  })

  if (profileError) {
    console.error(`❌ Failed to create profile: ${profileError.message}`)
    return false
  }

  console.log(`✅ Profile created`)

  // 3. 生徒レコード作成
  const { data: studentData, error: studentError } = await supabase
    .from("students")
    .insert({
      user_id: authData.user.id,
      full_name: student.name,
      furigana: student.nameKana,
      grade: student.grade,
      login_id: student.loginId,
    })
    .select()
    .single()

  if (studentError) {
    console.error(`❌ Failed to create student record: ${studentError.message}`)
    return false
  }

  console.log(`✅ Student record created: ${studentData.id}`)
  console.log(`🎉 Student created successfully!`)
  console.log(`   Login ID: ${student.loginId}`)
  console.log(`   Password: ${student.password}`)

  return true
}

async function createParent(parent: (typeof testUsers.parents)[0]) {
  console.log(`\n📝 Creating parent: ${parent.name} (${parent.email})`)

  // 1. ユーザー作成
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: parent.email,
    password: parent.password,
    email_confirm: true,
    user_metadata: {
      role: "parent",
      name: parent.name,
      name_kana: parent.nameKana,
    },
    // ローカル環境でパスワード認証を確実にするため
    app_metadata: {
      provider: "email",
      providers: ["email"],
    },
  })

  if (authError) {
    console.error(`❌ Failed to create auth user: ${authError.message}`)
    return false
  }

  console.log(`✅ Auth user created: ${authData.user.id}`)

  // 2. プロフィール作成
  const { error: profileError } = await supabase.from("profiles").insert({
    id: authData.user.id,
    role: "parent",
    display_name: parent.displayName,
    setup_completed: true,
  })

  if (profileError) {
    console.error(`❌ Failed to create profile: ${profileError.message}`)
    return false
  }

  console.log(`✅ Profile created`)

  // 3. 保護者レコード作成
  const { data: parentData, error: parentError } = await supabase
    .from("parents")
    .insert({
      user_id: authData.user.id,
      full_name: parent.name,
      furigana: parent.nameKana,
    })
    .select()
    .single()

  if (parentError) {
    console.error(`❌ Failed to create parent record: ${parentError.message}`)
    return false
  }

  console.log(`✅ Parent record created: ${parentData.id}`)
  console.log(`🎉 Parent created successfully!`)
  console.log(`   Email: ${parent.email}`)
  console.log(`   Password: ${parent.password}`)

  return true
}

async function createCoach(coach: (typeof testUsers.coaches)[0]) {
  console.log(`\n📝 Creating coach: ${coach.name} (${coach.email})`)

  // 1. ユーザー作成
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: coach.email,
    password: coach.password,
    email_confirm: true,
    user_metadata: {
      role: "coach",
      name: coach.name,
      name_kana: coach.nameKana,
    },
  })

  if (authError) {
    console.error(`❌ Failed to create auth user: ${authError.message}`)
    return false
  }

  console.log(`✅ Auth user created: ${authData.user.id}`)

  // 2. プロフィール作成
  const { error: profileError } = await supabase.from("profiles").insert({
    id: authData.user.id,
    role: "coach",
    display_name: coach.displayName,
    setup_completed: true,
  })

  if (profileError) {
    console.error(`❌ Failed to create profile: ${profileError.message}`)
    return false
  }

  console.log(`✅ Profile created`)

  // 3. 指導者レコード作成
  const { data: coachData, error: coachError } = await supabase
    .from("coaches")
    .insert({
      user_id: authData.user.id,
      full_name: coach.name,
      furigana: coach.nameKana,
    })
    .select()
    .single()

  if (coachError) {
    console.error(`❌ Failed to create coach record: ${coachError.message}`)
    return false
  }

  console.log(`✅ Coach record created: ${coachData.id}`)
  console.log(`🎉 Coach created successfully!`)
  console.log(`   Email: ${coach.email}`)
  console.log(`   Password: ${coach.password}`)

  return true
}

async function main() {
  console.log("🚀 Starting test user creation...")
  console.log(`📍 Supabase URL: ${supabaseUrl}`)

  let successCount = 0
  let failCount = 0

  // 生徒作成
  console.log("\n" + "=".repeat(50))
  console.log("👨‍🎓 Creating Students")
  console.log("=".repeat(50))
  for (const student of testUsers.students) {
    const success = await createStudent(student)
    if (success) successCount++
    else failCount++
  }

  // 保護者作成
  console.log("\n" + "=".repeat(50))
  console.log("👨‍👩‍👧 Creating Parents")
  console.log("=".repeat(50))
  for (const parent of testUsers.parents) {
    const success = await createParent(parent)
    if (success) successCount++
    else failCount++
  }

  // 指導者作成
  console.log("\n" + "=".repeat(50))
  console.log("👨‍🏫 Creating Coaches")
  console.log("=".repeat(50))
  for (const coach of testUsers.coaches) {
    const success = await createCoach(coach)
    if (success) successCount++
    else failCount++
  }

  // サマリー
  console.log("\n" + "=".repeat(50))
  console.log("📊 Summary")
  console.log("=".repeat(50))
  console.log(`✅ Success: ${successCount}`)
  console.log(`❌ Failed: ${failCount}`)
  console.log(`📝 Total: ${successCount + failCount}`)

  if (failCount === 0) {
    console.log("\n🎉 All test users created successfully!")
  } else {
    console.log("\n⚠️  Some users failed to create. Check the logs above.")
  }
}

// 実行
main()
  .then(() => {
    console.log("\n✅ Script completed")
    process.exit(0)
  })
  .catch((error) => {
    console.error("\n❌ Script failed:", error)
    process.exit(1)
  })
