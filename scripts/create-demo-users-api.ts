/**
 * デモユーザー作成スクリプト（Supabase Admin API使用）
 *
 * 重要: auth.users に直接 INSERT/UPDATE を行わず、必ず supabase.auth.admin を使用してください。
 * これにより auth.identities が自動生成され、認証が正常に機能します。
 */

import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ 環境変数が設定されていません")
  console.error("   NEXT_PUBLIC_SUPABASE_URL:", supabaseUrl ? "✓" : "✗")
  console.error("   SUPABASE_SERVICE_ROLE_KEY:", supabaseServiceKey ? "✓" : "✗")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

// デモユーザー定義
const DEMO_USERS = {
  students: [
    {
      id: "a0000001-0001-0001-0001-000000000001",
      loginId: "hana6",
      email: "hana6@studyspark.local",
      password: process.env.DEMO_STUDENT_PASSWORD || "demo2025",
      fullName: "青空 花",
      furigana: "あおぞらはな",
      nickname: "さくちゃん🌸",
      avatarId: "student2",
      grade: 6,
      course: "B",
      familyId: "aozora",
    },
    {
      id: "b0000002-0002-0002-0001-000000000001",
      loginId: "hikaru6",
      email: "hikaru6@studyspark.local",
      password: process.env.DEMO_STUDENT_PASSWORD || "demo2025",
      fullName: "星野 光",
      furigana: "ほしのひかる",
      nickname: "星野 光",
      avatarId: "student3",
      grade: 6,
      course: "B",
      familyId: "hoshino",
    },
    {
      id: "b0000002-0002-0002-0002-000000000002",
      loginId: "akira5",
      email: "akira5@studyspark.local",
      password: process.env.DEMO_STUDENT_PASSWORD || "demo2025",
      fullName: "星野 明",
      furigana: "ほしのあきら",
      nickname: "星野 明",
      avatarId: "student5",
      grade: 5,
      course: "B",
      familyId: "hoshino",
    },
  ],
  parents: [
    {
      id: "a0000001-0001-0001-0002-000000000002",
      email: "demo-parent1@example.com",
      password: process.env.DEMO_PARENT_PASSWORD || "Testdemo2025",
      fullName: "青空 太郎",
      furigana: "あおぞらたろう",
      nickname: "太郎さん",
      avatarId: "parent1",
      familyId: "aozora",
    },
    {
      id: "b0000002-0002-0002-0003-000000000003",
      email: "demo-parent2@example.com",
      password: process.env.DEMO_PARENT_PASSWORD || "Testdemo2025",
      fullName: "星野 一朗",
      furigana: "ほしのいちろう",
      nickname: "一朗さん",
      avatarId: "parent2",
      familyId: "hoshino",
    },
  ],
}

async function deleteExistingDemoUsers() {
  console.log("🗑️  既存デモユーザーの削除中...\n")

  try {
    // auth.usersテーブルから既存のデモユーザーをメールアドレスで検索
    const demoEmails = [
      ...DEMO_USERS.students.map((s) => s.email),
      ...DEMO_USERS.parents.map((p) => p.email),
    ]

    const { data: authUsers, error: queryError } = await supabase
      .from("auth_users_view")
      .select("id, email")
      .or(demoEmails.map((email) => `email.eq.${email}`).join(","))

    // auth_users_viewが無い場合、直接SQLクエリを実行
    const { data: existingUsers } = await supabase.rpc("get_users_by_emails", {
      emails: demoEmails,
    })

    const userIdsToDelete = existingUsers?.map((u: any) => u.id) || []

    console.log(`  削除対象ユーザー数: ${userIdsToDelete.length}`)

    let deleteCount = 0

    for (const userId of userIdsToDelete) {
      const user = existingUsers?.find((u: any) => u.id === userId)
      console.log(`  🗑️  削除中: ${user?.email || userId}`)
      const { error: deleteError } = await supabase.auth.admin.deleteUser(userId)

      if (deleteError) {
        console.log(`  ⚠️  削除エラー (${user?.email || userId}): ${deleteError.message}`)
      } else {
        deleteCount++
        console.log(`  ✓ 削除完了: ${user?.email || userId}`)
      }
    }

    console.log(`\n✓ 既存デモユーザー削除完了: ${deleteCount}件\n`)
  } catch (error) {
    console.error("❌ 既存ユーザー削除中のエラー:", error)
    console.log("  スキップして続行します...\n")
  }
}

async function createStudentUser(student: (typeof DEMO_USERS.students)[0]) {
  console.log(`\n👦 生徒アカウント作成中: ${student.fullName} (${student.loginId})`)

  // 1. Auth ユーザー作成
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email: student.email,
    password: student.password,
    email_confirm: true,
    user_metadata: {
      role: "student",
      login_id: student.loginId,
      full_name: student.fullName,
    },
  })

  if (authError) {
    console.error(`❌ Auth作成エラー (${student.loginId}):`, authError.message)
    throw authError
  }

  console.log(`  ✓ Auth作成完了: ${authUser.user.id}`)

  // 2. Profiles 更新（トリガーで自動作成されているため更新のみ）
  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      display_name: student.fullName,
      nickname: student.nickname,
      avatar_id: student.avatarId,
      theme_color: "#3B82F6",
      setup_completed: true,
    })
    .eq("id", authUser.user.id)

  if (profileError) {
    console.error(`❌ Profile更新エラー (${student.loginId}):`, profileError.message)
    throw profileError
  }

  console.log(`  ✓ Profile更新完了`)

  // 3. Students 作成
  const { data: studentRecord, error: studentError } = await supabase
    .from("students")
    .insert({
      user_id: authUser.user.id,
      login_id: student.loginId,
      full_name: student.fullName,
      furigana: student.furigana,
      grade: student.grade,
      course: student.course,
    })
    .select()
    .single()

  if (studentError) {
    console.error(`❌ Student作成エラー (${student.loginId}):`, studentError.message)
    throw studentError
  }

  console.log(`  ✓ Student作成完了: ID=${studentRecord.id}`)

  return {
    authUserId: authUser.user.id,
    studentId: studentRecord.id,
    familyId: student.familyId,
  }
}

async function createParentUser(parent: (typeof DEMO_USERS.parents)[0]) {
  console.log(`\n👨‍👩 保護者アカウント作成中: ${parent.fullName}`)

  // 1. Auth ユーザー作成
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email: parent.email,
    password: parent.password,
    email_confirm: true,
    user_metadata: {
      role: "parent",
      full_name: parent.fullName,
    },
  })

  if (authError) {
    console.error(`❌ Auth作成エラー (${parent.email}):`, authError.message)
    throw authError
  }

  console.log(`  ✓ Auth作成完了: ${authUser.user.id}`)

  // 2. Profiles 更新（トリガーで自動作成されているため更新のみ）
  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      display_name: parent.fullName,
      nickname: parent.nickname,
      avatar_id: parent.avatarId,
      theme_color: "#3B82F6",
      setup_completed: true,
    })
    .eq("id", authUser.user.id)

  if (profileError) {
    console.error(`❌ Profile更新エラー (${parent.email}):`, profileError.message)
    throw profileError
  }

  console.log(`  ✓ Profile更新完了`)

  // 3. Parents 作成
  const { data: parentRecord, error: parentError } = await supabase
    .from("parents")
    .insert({
      user_id: authUser.user.id,
      full_name: parent.fullName,
      furigana: parent.furigana,
    })
    .select()
    .single()

  if (parentError) {
    console.error(`❌ Parent作成エラー (${parent.email}):`, parentError.message)
    throw parentError
  }

  console.log(`  ✓ Parent作成完了: ID=${parentRecord.id}`)

  return {
    authUserId: authUser.user.id,
    parentId: parentRecord.id,
    familyId: parent.familyId,
  }
}

async function createParentChildRelations(
  parents: Array<{ parentId: number; familyId: string }>,
  students: Array<{ studentId: number; familyId: string }>
) {
  console.log("\n👨‍👩‍👧‍👦 親子関係作成中...")

  let relationCount = 0

  for (const parent of parents) {
    const children = students.filter((s) => s.familyId === parent.familyId)

    for (const child of children) {
      const { error: relationError } = await supabase.from("parent_child_relations").insert({
        parent_id: parent.parentId,
        student_id: child.studentId,
      })

      if (relationError) {
        console.error(
          `❌ 親子関係作成エラー (parent_id=${parent.parentId}, student_id=${child.studentId}):`,
          relationError.message
        )
      } else {
        relationCount++
        console.log(`  ✓ 親子関係作成: parent_id=${parent.parentId} ⇔ student_id=${child.studentId}`)
      }
    }
  }

  console.log(`\n✓ 親子関係作成完了: ${relationCount}件`)
}

async function main() {
  console.log("=== デモユーザー作成開始（Supabase Admin API使用） ===\n")

  try {
    // 1. 既存デモユーザーの削除
    await deleteExistingDemoUsers()

    // 2. 生徒アカウント作成
    console.log("📚 生徒アカウント作成\n" + "=".repeat(50))
    const createdStudents = []

    for (const student of DEMO_USERS.students) {
      const result = await createStudentUser(student)
      createdStudents.push(result)
    }

    // 3. 保護者アカウント作成
    console.log("\n\n📧 保護者アカウント作成\n" + "=".repeat(50))
    const createdParents = []

    for (const parent of DEMO_USERS.parents) {
      const result = await createParentUser(parent)
      createdParents.push(result)
    }

    // 4. 親子関係作成
    console.log("\n" + "=".repeat(50))
    await createParentChildRelations(createdParents, createdStudents)

    // 5. 最終確認
    console.log("\n\n📋 作成されたユーザー一覧\n" + "=".repeat(50))

    console.log("\n【生徒アカウント】")
    for (const student of DEMO_USERS.students) {
      const result = createdStudents.find((s) => s.familyId === student.familyId &&
        DEMO_USERS.students.find((st) => st.familyId === s.familyId && st.loginId === student.loginId))
      console.log(`  ${student.fullName} (小${student.grade})`)
      console.log(`    ログインID: ${student.loginId}`)
      console.log(`    メール: ${student.email}`)
      console.log(`    パスワード: ${student.password}`)
      console.log(`    Auth ID: ${result?.authUserId || "作成済み"}`)
      console.log("")
    }

    console.log("【保護者アカウント】")
    for (const parent of DEMO_USERS.parents) {
      const result = createdParents.find((p) => p.familyId === parent.familyId)
      const children = DEMO_USERS.students.filter((s) => s.familyId === parent.familyId)
      console.log(`  ${parent.fullName}`)
      console.log(`    メール: ${parent.email}`)
      console.log(`    パスワード: ${parent.password}`)
      console.log(`    Auth ID: ${result?.authUserId || "作成済み"}`)
      console.log(`    お子様: ${children.map((c) => c.fullName).join("、")}`)
      console.log("")
    }

    console.log("\n=== ✅ デモユーザー作成完了 ===\n")
    console.log("ログインテスト用URL: http://localhost:3000")
    console.log("\n生徒ログイン例:")
    console.log("  ログインID: hana6")
    console.log("  パスワード: <環境変数 DEMO_STUDENT_PASSWORD>")
    console.log("\n保護者ログイン例:")
    console.log("  メール: demo-parent1@example.com")
    console.log("  パスワード: <環境変数 DEMO_PARENT_PASSWORD>")
  } catch (error) {
    console.error("\n❌ エラーが発生しました:", error)
    process.exit(1)
  }
}

main()
