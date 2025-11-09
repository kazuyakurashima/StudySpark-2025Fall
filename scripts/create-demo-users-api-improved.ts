/**
 * 改良版デモユーザー作成スクリプト（Supabase Admin API使用）
 *
 * 改善点：
 * 1. Admin API のlistUsersを使った確実な既存ユーザー削除
 * 2. email_existsエラー時の適切なハンドリング
 * 3. 途中でエラーが出ても親子関係データまで進むよう改善
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
      password: "demo2025",
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
      password: "demo2025",
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
      password: "demo2025",
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
      email: "toshin.hitachi+test001@gmail.com",
      password: "Testdemo2025",
      fullName: "青空 太郎",
      furigana: "あおぞらたろう",
      nickname: "太郎さん",
      avatarId: "parent1",
      familyId: "aozora",
    },
    {
      id: "b0000002-0002-0002-0003-000000000003",
      email: "toshin.hitachi+test002@gmail.com",
      password: "Testdemo2025",
      fullName: "星野 一朗",
      furigana: "ほしのいちろう",
      nickname: "一朗さん",
      avatarId: "parent2",
      familyId: "hoshino",
    },
  ],
}

// 作成されたユーザー情報を保持
const createdUsers = {
  students: new Map<string, { userId: string; studentId?: number }>(),
  parents: new Map<string, { userId: string; parentId?: number }>(),
}

async function deleteExistingDemoUsers() {
  console.log("🗑️  既存デモユーザーの削除中...\n")

  try {
    const demoEmails = [
      ...DEMO_USERS.students.map(s => s.email),
      ...DEMO_USERS.parents.map(p => p.email),
    ]

    // Admin APIでユーザーリストを取得（ページネーション対応）
    let page = 1
    let hasMore = true
    const existingUsers: any[] = []

    while (hasMore) {
      const { data, error } = await supabase.auth.admin.listUsers({
        page: page,
        perPage: 1000
      })

      if (error) {
        console.error("❌ ユーザーリスト取得エラー:", error)
        break
      }

      if (data && data.users) {
        // デモユーザーのメールアドレスに一致するものを抽出
        const matchedUsers = data.users.filter(user =>
          demoEmails.includes(user.email || '')
        )
        existingUsers.push(...matchedUsers)
      }

      hasMore = (data?.users?.length || 0) === 1000
      page++
    }

    console.log(`  削除対象ユーザー数: ${existingUsers.length}`)

    let deleteCount = 0
    for (const user of existingUsers) {
      console.log(`  🗑️  削除中: ${user.email}`)
      const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id)

      if (deleteError) {
        console.log(`  ⚠️  削除エラー (${user.email}): ${deleteError.message}`)
      } else {
        deleteCount++
        console.log(`  ✓ 削除完了: ${user.email}`)
      }
    }

    console.log(`\n✓ 既存デモユーザー削除完了: ${deleteCount}件\n`)
  } catch (error) {
    console.error("❌ 既存ユーザー削除中のエラー:", error)
    console.log("  続行します...\n")
  }
}

async function createOrUpdateStudentUser(student: (typeof DEMO_USERS.students)[0]) {
  console.log(`\n👦 生徒アカウント処理中: ${student.fullName} (${student.loginId})`)

  let userId: string | null = null

  // 1. Auth ユーザー作成試行
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
    // email_existsエラーの場合は既存ユーザーのIDを取得
    if (authError.message?.includes('email_exists') || authError.code === 'email_exists') {
      console.log(`  ⚠️  既存ユーザーを再利用: ${student.email}`)

      // 既存ユーザーを検索
      const { data } = await supabase.auth.admin.listUsers()
      const existingUser = data?.users?.find(u => u.email === student.email)

      if (existingUser) {
        userId = existingUser.id
        console.log(`  ✓ 既存ユーザーID取得: ${userId}`)
      }
    } else {
      console.error(`  ❌ Auth作成エラー: ${authError.message}`)
      return
    }
  } else if (authUser?.user) {
    userId = authUser.user.id
    console.log(`  ✓ Authユーザー作成: ${userId}`)
  }

  if (!userId) {
    console.error(`  ❌ ユーザーID取得失敗: ${student.email}`)
    return
  }

  // 2. profilesテーブル
  const { error: profileError } = await supabase
    .from("profiles")
    .upsert({
      id: userId,
      role: "student",
      display_name: student.fullName,
      nickname: student.nickname,
      avatar_id: student.avatarId,
      theme_color: "#3B82F6",
      setup_completed: true,
    })

  if (profileError) {
    console.error(`  ❌ Profile作成エラー: ${profileError.message}`)
  } else {
    console.log(`  ✓ Profile作成完了`)
  }

  // 3. studentsテーブル
  const { data: studentData, error: studentError } = await supabase
    .from("students")
    .upsert({
      user_id: userId,
      login_id: student.loginId,
      full_name: student.fullName,
      furigana: student.furigana,
      grade: student.grade,
      course: student.course,
    })
    .select("id")
    .single()

  if (studentError) {
    // 既存レコードがある場合は取得
    const { data: existing } = await supabase
      .from("students")
      .select("id")
      .eq("user_id", userId)
      .single()

    if (existing) {
      createdUsers.students.set(student.loginId, { userId, studentId: existing.id })
      console.log(`  ✓ 既存生徒データ利用: ${existing.id}`)
    } else {
      console.error(`  ❌ Student作成エラー: ${studentError.message}`)
    }
  } else if (studentData) {
    createdUsers.students.set(student.loginId, { userId, studentId: studentData.id })
    console.log(`  ✓ Student作成完了: ${studentData.id}`)
  }
}

async function createOrUpdateParentUser(parent: (typeof DEMO_USERS.parents)[0]) {
  console.log(`\n👨 保護者アカウント処理中: ${parent.fullName}`)

  let userId: string | null = null

  // 1. Auth ユーザー作成試行
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
    // email_existsエラーの場合は既存ユーザーのIDを取得
    if (authError.message?.includes('email_exists') || authError.code === 'email_exists') {
      console.log(`  ⚠️  既存ユーザーを再利用: ${parent.email}`)

      // 既存ユーザーを検索
      const { data } = await supabase.auth.admin.listUsers()
      const existingUser = data?.users?.find(u => u.email === parent.email)

      if (existingUser) {
        userId = existingUser.id
        console.log(`  ✓ 既存ユーザーID取得: ${userId}`)
      }
    } else {
      console.error(`  ❌ Auth作成エラー: ${authError.message}`)
      return
    }
  } else if (authUser?.user) {
    userId = authUser.user.id
    console.log(`  ✓ Authユーザー作成: ${userId}`)
  }

  if (!userId) {
    console.error(`  ❌ ユーザーID取得失敗: ${parent.email}`)
    return
  }

  // 2. profilesテーブル
  const { error: profileError } = await supabase
    .from("profiles")
    .upsert({
      id: userId,
      role: "parent",
      display_name: parent.fullName,
      nickname: parent.nickname,
      avatar_id: parent.avatarId,
      theme_color: "#10B981",
      setup_completed: true,
    })

  if (profileError) {
    console.error(`  ❌ Profile作成エラー: ${profileError.message}`)
  } else {
    console.log(`  ✓ Profile作成完了`)
  }

  // 3. parentsテーブル
  const { data: parentData, error: parentError } = await supabase
    .from("parents")
    .upsert({
      user_id: userId,
      full_name: parent.fullName,
      furigana: parent.furigana,
    })
    .select("id")
    .single()

  if (parentError) {
    // 既存レコードがある場合は取得
    const { data: existing } = await supabase
      .from("parents")
      .select("id")
      .eq("user_id", userId)
      .single()

    if (existing) {
      createdUsers.parents.set(parent.email, { userId, parentId: existing.id })
      console.log(`  ✓ 既存保護者データ利用: ${existing.id}`)
    } else {
      console.error(`  ❌ Parent作成エラー: ${parentError.message}`)
    }
  } else if (parentData) {
    createdUsers.parents.set(parent.email, { userId, parentId: parentData.id })
    console.log(`  ✓ Parent作成完了: ${parentData.id}`)
  }
}

async function createParentChildRelations() {
  console.log("\n👨‍👧‍👦 親子関係設定中...\n")

  const relations = [
    {
      parentEmail: "toshin.hitachi+test001@gmail.com",
      studentLoginId: "hana6",
      relationType: "guardian"
    },
    {
      parentEmail: "toshin.hitachi+test002@gmail.com",
      studentLoginId: "hikaru6",
      relationType: "guardian"
    },
    {
      parentEmail: "toshin.hitachi+test002@gmail.com",
      studentLoginId: "akira5",
      relationType: "guardian"
    }
  ]

  for (const relation of relations) {
    const parentInfo = createdUsers.parents.get(relation.parentEmail)
    const studentInfo = createdUsers.students.get(relation.studentLoginId)

    if (!parentInfo?.parentId || !studentInfo?.studentId) {
      console.log(`  ⚠️  親子関係スキップ: ${relation.parentEmail} ⇔ ${relation.studentLoginId}`)
      console.log(`     親ID: ${parentInfo?.parentId || 'なし'}, 子ID: ${studentInfo?.studentId || 'なし'}`)
      continue
    }

    const { error } = await supabase
      .from("parent_child_relations")
      .upsert({
        parent_id: parentInfo.parentId,
        student_id: studentInfo.studentId,
        relation_type: relation.relationType
      })

    if (error) {
      console.error(`  ❌ 親子関係作成エラー: ${error.message}`)
    } else {
      console.log(`  ✓ 親子関係作成: ${relation.parentEmail} ⇔ ${relation.studentLoginId}`)
    }
  }
}

// ============================================================================
// 学習ログ生成関数
// ============================================================================
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

function daysAgo(days: number): Date {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

async function createStudyLogs() {
  console.log("\n📚 学習ログ生成中（過去14日分）...")

  // 科目マスター取得
  const { data: subjects } = await supabase.from('subjects').select('id, name')
  const subjectMap: Record<string, number> = {}
  subjects?.forEach((s: any) => {
    subjectMap[s.name] = s.id
  })

  // セッションマップ取得（grade -> first session id）
  const { data: sessions } = await supabase
    .from('study_sessions')
    .select('id, grade, session_number')
    .order('grade', { ascending: true })
    .order('session_number', { ascending: true })

  const sessionMap: Record<number, number> = {}
  sessions?.forEach((s: any) => {
    if (!sessionMap[s.grade]) {
      sessionMap[s.grade] = s.id  // 各学年の最初のセッションIDを使用
    }
  })

  for (const [loginId, userData] of createdUsers.students) {
    const student = DEMO_USERS.students.find(s => s.loginId === loginId)
    if (!student) continue

    // students.id (bigint) を取得
    const { data: studentRecord } = await supabase
      .from('students')
      .select('id, grade, course')
      .eq('user_id', userData.userId)
      .single()

    if (!studentRecord) {
      console.error(`  ❌ ${student.fullName}: students レコードが見つかりません`)
      continue
    }

    // 該当学年・コースの study_content_type_id を取得（「基本問題」を優先）
    const { data: contentTypes } = await supabase
      .from('study_content_types')
      .select('id, content_name, subject_id')
      .eq('grade', studentRecord.grade)
      .eq('course', studentRecord.course)

    const contentTypeMap: Record<number, number> = {}  // subject_id -> content_type_id
    contentTypes?.forEach((ct: any) => {
      // 各科目で「基本問題」を優先、なければ最初のものを使用
      if (ct.content_name === '基本問題' || !contentTypeMap[ct.subject_id]) {
        contentTypeMap[ct.subject_id] = ct.id
      }
    })

    const sessionId = sessionMap[studentRecord.grade]
    if (!sessionId) {
      console.error(`  ❌ ${student.fullName}: セッションが見つかりません`)
      continue
    }

    console.log(`  ${student.fullName}: 生成中...`)

    for (let day = 13; day >= 0; day--) {
      const studyDate = formatDate(daysAgo(day))

      // 1日2～3科目をランダム選択
      const subjectsToStudy = ['算数', '国語', '理科', '社会']
        .sort(() => Math.random() - 0.5)
        .slice(0, randomInt(2, 3))

      for (const subjectName of subjectsToStudy) {
        const subjectId = subjectMap[subjectName]
        if (!subjectId) continue

        const contentTypeId = contentTypeMap[subjectId]
        if (!contentTypeId) continue

        const totalProblems = randomInt(10, 30)
        const correctCount = randomInt(
          Math.floor(totalProblems * 0.6),
          Math.floor(totalProblems * 0.95)
        )

        const { error } = await supabase.from('study_logs').insert({
          student_id: studentRecord.id,  // students.id (bigint) ✓
          session_id: sessionId,         // study_sessions.id (bigint) ✓
          subject_id: subjectId,
          study_content_type_id: contentTypeId,  // study_content_types.id (bigint) ✓
          study_date: studyDate,
          total_problems: totalProblems,  // ✓
          correct_count: correctCount,
        })

        if (error) {
          console.error(`    ❌ 学習ログ作成エラー: ${error.message}`)
        }
      }
    }

    console.log(`  ✓ ${student.fullName}: 14日分完了`)
  }
}

// ============================================================================
// 応援メッセージ生成関数
// ============================================================================
async function createEncouragementMessages() {
  console.log("\n💬 応援メッセージ生成中...")

  const templates = [
    '今日もよく頑張ったね！',
    'コツコツ続けているのが素晴らしいよ！',
    '少しずつ成長しているね、応援してるよ！',
    '今週もいいペースだね！',
    '毎日の積み重ねが大事だよ、頑張って！',
  ]

  for (const [email, parentData] of createdUsers.parents) {
    const parent = DEMO_USERS.parents.find(p => p.email === email)
    if (!parent) continue

    // 親子関係から子供のstudents.idを取得
    const { data: relations } = await supabase
      .from('parent_child_relations')
      .select('student_id')
      .eq('parent_id', parentData.parentId)

    for (const relation of relations || []) {
      const studentDbId = relation.student_id  // students.id (bigint)

      // student情報取得
      const { data: studentInfo } = await supabase
        .from('students')
        .select('full_name')
        .eq('id', studentDbId)
        .single()

      if (!studentInfo) continue

      console.log(`  ${parent.fullName} → ${studentInfo.full_name}`)

      for (let i = 0; i < 5; i++) {
        const { error } = await supabase.from('encouragement_messages').insert({
          sender_id: parentData.userId,  // auth.users.id (UUID)
          student_id: studentDbId,       // students.id (bigint)
          sender_role: 'parent',
          support_type: 'custom',
          message: templates[i % templates.length],
          sent_at: daysAgo(i * 2).toISOString(),
        })

        if (error) {
          console.error(`    ❌ メッセージ作成エラー: ${error.message}`)
        }
      }

      console.log(`  ✓ 5件作成完了`)
    }
  }
}

async function main() {
  console.log("============================================")
  console.log("   StudySpark デモユーザー作成（改良版）")
  console.log("============================================\n")

  // 1. 既存ユーザー削除（オプション）
  const skipDelete = process.argv.includes("--skip-delete")
  if (!skipDelete) {
    await deleteExistingDemoUsers()
  } else {
    console.log("⚠️  既存ユーザー削除をスキップ\n")
  }

  // 2. 生徒アカウント作成
  console.log("\n============ 生徒アカウント作成 ============")
  for (const student of DEMO_USERS.students) {
    await createOrUpdateStudentUser(student)
  }

  // 3. 保護者アカウント作成
  console.log("\n============ 保護者アカウント作成 ============")
  for (const parent of DEMO_USERS.parents) {
    await createOrUpdateParentUser(parent)
  }

  // 4. 親子関係設定（最重要）
  await createParentChildRelations()

  // 5. 学習ログ生成
  await createStudyLogs()

  // 6. 応援メッセージ生成
  await createEncouragementMessages()

  // 7. 結果サマリー
  console.log("\n============================================")
  console.log("                  完了")
  console.log("============================================\n")
  console.log("作成されたアカウント:")
  console.log("\n【生徒】")
  for (const [loginId, info] of createdUsers.students) {
    console.log(`  - ${loginId}: student_id=${info.studentId}`)
  }
  console.log("\n【保護者】")
  for (const [email, info] of createdUsers.parents) {
    console.log(`  - ${email}: parent_id=${info.parentId}`)
  }

  // 6. 親子関係の確認
  const { data: relations } = await supabase
    .from("parent_child_relations")
    .select(`
      parent_id,
      student_id,
      parents!inner(full_name),
      students!inner(full_name)
    `)

  console.log("\n【親子関係】")
  if (relations && relations.length > 0) {
    for (const rel of relations) {
      console.log(`  - ${rel.parents.full_name} → ${rel.students.full_name}`)
    }
  } else {
    console.log("  ⚠️  親子関係が作成されていません")
  }
}

main().catch((error) => {
  console.error("\n❌ 実行中にエラーが発生しました:", error)
  process.exit(1)
})