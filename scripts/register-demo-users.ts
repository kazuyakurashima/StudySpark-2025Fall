/**
 * デモユーザー登録スクリプト（2026年度）
 *
 * 機能:
 * - 3名の生徒（小5×1、小6×2）と2名の保護者を登録
 * - 再実行時は既存デモユーザーを削除して再作成（冪等性確保）
 * - demo_ プレフィックスで本番ユーザーと区別
 *
 * 実行方法:
 *   npx tsx scripts/register-demo-users.ts
 *
 * オプション:
 *   --dry-run  実際には作成せず、処理内容を表示
 *   --force    確認プロンプトをスキップ
 *
 * デモユーザー:
 *   生徒:
 *     - demo_yui5 / Demo2026!  (山田結衣・小5・Bコース)
 *     - demo_sora6 / Demo2026! (鈴木空・小6・Aコース)
 *     - demo_umi6 / Demo2026!  (鈴木海・小6・Bコース)
 *   保護者:
 *     - demo_yamada@studyspark.local / Demo2026! (山田太郎 → demo_yui5)
 *     - demo_suzuki@studyspark.local / Demo2026! (鈴木花子 → demo_sora6, demo_umi6)
 */

import { createClient } from '@supabase/supabase-js'

// 環境変数チェック
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Error: Missing required environment variables')
  console.error('Please set:')
  console.error('  - NEXT_PUBLIC_SUPABASE_URL')
  console.error('  - SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false }
})

// ============================================================================
// デモユーザーデータ定義
// ============================================================================

const DEMO_PASSWORD = 'Demo2026!'
const DEMO_PREFIX = 'demo_'

interface DemoStudent {
  loginId: string
  fullName: string
  furigana: string
  grade: 5 | 6
  course: 'A' | 'B'
  parentLoginId: string  // 紐づける保護者のloginId
}

interface DemoParent {
  loginId: string  // メールのローカル部分（demo_yamada）
  email: string
  fullName: string
  furigana: string
}

const DEMO_PARENTS: DemoParent[] = [
  {
    loginId: 'demo_yamada',
    email: 'demo_yamada@studyspark.local',
    fullName: '山田 太郎',
    furigana: 'やまだ たろう'
  },
  {
    loginId: 'demo_suzuki',
    email: 'demo_suzuki@studyspark.local',
    fullName: '鈴木 花子',
    furigana: 'すずき はなこ'
  }
]

const DEMO_STUDENTS: DemoStudent[] = [
  {
    loginId: 'demo_yui5',
    fullName: '山田 結衣',
    furigana: 'やまだ ゆい',
    grade: 5,
    course: 'B',
    parentLoginId: 'demo_yamada'
  },
  {
    loginId: 'demo_sora6',
    fullName: '鈴木 空',
    furigana: 'すずき そら',
    grade: 6,
    course: 'A',
    parentLoginId: 'demo_suzuki'
  },
  {
    loginId: 'demo_umi6',
    fullName: '鈴木 海',
    furigana: 'すずき うみ',
    grade: 6,
    course: 'B',
    parentLoginId: 'demo_suzuki'
  }
]

// ============================================================================
// ユーティリティ関数
// ============================================================================

interface ExistingDemoUser {
  id: string
  email: string
  role: 'student' | 'parent'
}

/**
 * 既存のデモユーザーを検索
 */
async function findExistingDemoUsers(): Promise<ExistingDemoUser[]> {
  const existing: ExistingDemoUser[] = []

  // students テーブルから demo_ プレフィックスのユーザーを検索
  const { data: students, error: studentError } = await supabase
    .from('students')
    .select('user_id, login_id')
    .like('login_id', 'demo_%')

  if (studentError) {
    console.error(`  ⚠️  Failed to search students: ${studentError.message}`)
  } else if (students) {
    for (const s of students) {
      existing.push({
        id: s.user_id,
        email: `${s.login_id}@studyspark.local`,
        role: 'student'
      })
    }
  }

  // parents テーブルから demo_ プレフィックスのユーザーを検索
  // profiles 経由で email を取得
  const { data: parents, error: parentError } = await supabase
    .from('parents')
    .select('user_id, full_name')

  if (parentError) {
    console.error(`  ⚠️  Failed to search parents: ${parentError.message}`)
  } else if (parents) {
    for (const p of parents) {
      // profiles から email を取得して demo_ かチェック
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', p.user_id)
        .single()

      if (profile) {
        // auth.users から email を取得
        const { data: authUser } = await supabase.auth.admin.getUserById(p.user_id)
        if (authUser?.user?.email?.startsWith('demo_')) {
          existing.push({
            id: p.user_id,
            email: authUser.user.email,
            role: 'parent'
          })
        }
      }
    }
  }

  return existing
}

/**
 * 既存デモユーザーを削除
 */
async function deleteExistingDemoUsers(users: ExistingDemoUser[], dryRun: boolean): Promise<void> {
  if (users.length === 0) {
    console.log('  既存のデモユーザーはありません')
    return
  }

  console.log(`\n🗑️  既存デモユーザー ${users.length} 件を削除中...`)

  for (const user of users) {
    console.log(`  - ${user.email} (${user.role})`)

    if (dryRun) {
      console.log(`    [dry-run] 削除をスキップ`)
      continue
    }

    // 1. 関係テーブルから削除
    if (user.role === 'student') {
      const { data: student } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (student) {
        const { error: relError } = await supabase
          .from('parent_child_relations')
          .delete()
          .eq('student_id', student.id)
        if (relError) console.error(`    ⚠️  関係削除失敗: ${relError.message}`)
      }

      const { error: stuError } = await supabase
        .from('students')
        .delete()
        .eq('user_id', user.id)
      if (stuError) console.error(`    ⚠️  生徒削除失敗: ${stuError.message}`)
    } else {
      const { data: parent } = await supabase
        .from('parents')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (parent) {
        const { error: relError } = await supabase
          .from('parent_child_relations')
          .delete()
          .eq('parent_id', parent.id)
        if (relError) console.error(`    ⚠️  関係削除失敗: ${relError.message}`)
      }

      const { error: parError } = await supabase
        .from('parents')
        .delete()
        .eq('user_id', user.id)
      if (parError) console.error(`    ⚠️  保護者削除失敗: ${parError.message}`)
    }

    // 2. auth.users を削除
    //    profiles は profiles(id) REFERENCES auth.users(id) ON DELETE CASCADE により自動削除
    //    計画(05_demo_users.md 4.2)では profiles → auth.users の順だが、
    //    CASCADE で同等の結果になるため auth.users 削除のみで対応
    const { error } = await supabase.auth.admin.deleteUser(user.id)
    if (error) {
      console.error(`    ⚠️  auth.users 削除失敗: ${error.message}`)
    } else {
      console.log(`    ✓ 削除完了`)
    }
  }
}

/**
 * 保護者を作成
 */
async function createParent(
  parent: DemoParent,
  dryRun: boolean
): Promise<{ userId: string; parentId: number } | null> {
  console.log(`\n👨‍👩‍👧 保護者作成: ${parent.fullName} (${parent.email})`)

  if (dryRun) {
    console.log(`  [dry-run] 作成をスキップ`)
    return { userId: 'dry-run-parent-id', parentId: 0 }
  }

  // 1. auth.users 作成
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: parent.email,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: {
      role: 'parent',
      display_name: parent.fullName
    }
  })

  if (authError || !authData.user) {
    console.error(`  ❌ Auth作成失敗: ${authError?.message}`)
    return null
  }

  const userId = authData.user.id
  console.log(`  ✓ Auth user: ${userId}`)

  // 2. profiles 更新（トリガーで自動作成されるため UPDATE のみ）
  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      role: 'parent',
      display_name: parent.fullName,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId)

  if (profileError) {
    console.error(`  ❌ Profile更新失敗: ${profileError.message}`)
    await supabase.auth.admin.deleteUser(userId)
    return null
  }

  console.log(`  ✓ Profile updated`)

  // 3. parents テーブル作成
  const { data: parentData, error: parentError } = await supabase
    .from('parents')
    .insert({
      user_id: userId,
      full_name: parent.fullName,
      furigana: parent.furigana
    })
    .select('id')
    .single()

  if (parentError || !parentData) {
    console.error(`  ❌ Parents作成失敗: ${parentError?.message}`)
    await supabase.auth.admin.deleteUser(userId)
    return null
  }

  console.log(`  ✓ Parent record: ID=${parentData.id}`)

  return { userId, parentId: parentData.id }
}

/**
 * 生徒を作成
 */
async function createStudent(
  student: DemoStudent,
  dryRun: boolean
): Promise<{ userId: string; studentId: number } | null> {
  const email = `${student.loginId}@studyspark.local`
  console.log(`\n👦 生徒作成: ${student.fullName} (${student.loginId})`)

  if (dryRun) {
    console.log(`  [dry-run] 作成をスキップ`)
    return { userId: 'dry-run-student-id', studentId: 0 }
  }

  // 1. auth.users 作成
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: {
      role: 'student',
      display_name: student.fullName,
      login_id: student.loginId
    }
  })

  if (authError || !authData.user) {
    console.error(`  ❌ Auth作成失敗: ${authError?.message}`)
    return null
  }

  const userId = authData.user.id
  console.log(`  ✓ Auth user: ${userId}`)

  // 2. profiles 更新
  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      role: 'student',
      display_name: student.fullName,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId)

  if (profileError) {
    console.error(`  ❌ Profile更新失敗: ${profileError.message}`)
    await supabase.auth.admin.deleteUser(userId)
    return null
  }

  console.log(`  ✓ Profile updated`)

  // 3. students テーブル作成
  const { data: studentData, error: studentError } = await supabase
    .from('students')
    .insert({
      user_id: userId,
      login_id: student.loginId,
      full_name: student.fullName,
      furigana: student.furigana,
      grade: student.grade,
      course: student.course
    })
    .select('id')
    .single()

  if (studentError || !studentData) {
    console.error(`  ❌ Students作成失敗: ${studentError?.message}`)
    await supabase.auth.admin.deleteUser(userId)
    return null
  }

  console.log(`  ✓ Student record: ID=${studentData.id}, Grade=${student.grade}, Course=${student.course}`)

  return { userId, studentId: studentData.id }
}

/**
 * 親子関係を作成
 */
async function createRelation(
  parentId: number,
  studentId: number,
  parentName: string,
  studentName: string,
  dryRun: boolean
): Promise<boolean> {
  console.log(`\n🔗 親子関係作成: ${parentName} → ${studentName}`)

  if (dryRun) {
    console.log(`  [dry-run] 作成をスキップ`)
    return true
  }

  const { error } = await supabase
    .from('parent_child_relations')
    .insert({
      parent_id: parentId,
      student_id: studentId,
      relation_type: 'guardian'
    })

  if (error) {
    console.error(`  ❌ 関係作成失敗: ${error.message}`)
    return false
  }

  console.log(`  ✓ 関係作成完了`)
  return true
}

// ============================================================================
// メイン処理
// ============================================================================

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const force = args.includes('--force')

  console.log('='.repeat(60))
  console.log('デモユーザー登録スクリプト（2026年度）')
  console.log('='.repeat(60))
  console.log(`Supabase: ${supabaseUrl}`)
  console.log(`Mode: ${dryRun ? 'DRY-RUN（実際には変更しません）' : 'EXECUTE'}`)
  console.log('='.repeat(60))

  // 1. 既存デモユーザーの検索
  console.log('\n🔍 既存デモユーザーを検索中...')
  const existingUsers = await findExistingDemoUsers()
  console.log(`  - 既存: ${existingUsers.length} 件`)

  // 2. 登録内容の表示
  console.log('\n📋 登録内容:')
  console.log(`  保護者: ${DEMO_PARENTS.length} 名`)
  DEMO_PARENTS.forEach(p => {
    console.log(`    - ${p.fullName} (${p.email})`)
  })
  console.log(`  生徒: ${DEMO_STUDENTS.length} 名`)
  DEMO_STUDENTS.forEach(s => {
    console.log(`    - ${s.fullName} (${s.loginId}) - 小${s.grade}・${s.course}コース`)
  })
  console.log(`  親子関係: ${DEMO_STUDENTS.length} 件`)

  // 3. 確認プロンプト
  if (!force && !dryRun) {
    console.log('\n⚠️  この操作はデータベースを変更します。')
    if (existingUsers.length > 0) {
      console.log(`⚠️  既存デモユーザー ${existingUsers.length} 件は削除されます。`)
    }
    console.log('\n続行するには Enter キーを押してください（CTRL+C で中断）...')

    await new Promise<void>((resolve) => {
      process.stdin.once('data', () => resolve())
    })
  }

  // 4. 既存ユーザーの削除
  if (existingUsers.length > 0) {
    await deleteExistingDemoUsers(existingUsers, dryRun)
  }

  // 5. 保護者の作成
  console.log('\n' + '='.repeat(60))
  console.log('[Phase 1/3] 保護者作成')
  console.log('='.repeat(60))

  const parentMap = new Map<string, { userId: string; parentId: number }>()

  for (const parent of DEMO_PARENTS) {
    const result = await createParent(parent, dryRun)
    if (result) {
      parentMap.set(parent.loginId, result)
    } else {
      console.error(`\n❌ 保護者作成失敗のため中断します: ${parent.email}`)
      process.exit(1)
    }
  }

  // 6. 生徒の作成
  console.log('\n' + '='.repeat(60))
  console.log('[Phase 2/3] 生徒作成')
  console.log('='.repeat(60))

  const studentMap = new Map<string, { userId: string; studentId: number }>()

  for (const student of DEMO_STUDENTS) {
    const result = await createStudent(student, dryRun)
    if (result) {
      studentMap.set(student.loginId, result)
    } else {
      console.error(`\n❌ 生徒作成失敗のため中断します: ${student.loginId}`)
      process.exit(1)
    }
  }

  // 7. 親子関係の作成
  console.log('\n' + '='.repeat(60))
  console.log('[Phase 3/3] 親子関係作成')
  console.log('='.repeat(60))

  for (const student of DEMO_STUDENTS) {
    const parentResult = parentMap.get(student.parentLoginId)
    const studentResult = studentMap.get(student.loginId)

    if (!parentResult || !studentResult) {
      console.error(`\n❌ 親子関係作成失敗: データが見つかりません`)
      continue
    }

    const parent = DEMO_PARENTS.find(p => p.loginId === student.parentLoginId)!

    const success = await createRelation(
      parentResult.parentId,
      studentResult.studentId,
      parent.fullName,
      student.fullName,
      dryRun
    )

    if (!success) {
      console.error(`\n⚠️  親子関係作成に失敗しましたが、続行します`)
    }
  }

  // 8. 結果サマリー
  console.log('\n' + '='.repeat(60))
  console.log('✨ 完了')
  console.log('='.repeat(60))

  if (dryRun) {
    console.log('\n[dry-run] 実際には何も変更されていません。')
    console.log('実行するには --dry-run オプションを外してください。')
  } else {
    console.log('\n✅ デモユーザーの登録が完了しました！')

    console.log('\n📝 ログイン情報:')
    console.log('\n  【生徒】')
    DEMO_STUDENTS.forEach(s => {
      console.log(`    ${s.loginId} / ${DEMO_PASSWORD}`)
    })
    console.log('\n  【保護者】')
    DEMO_PARENTS.forEach(p => {
      console.log(`    ${p.email} / ${DEMO_PASSWORD}`)
    })

    console.log('\n⚠️  シーケンス更新SQL（Supabase SQL Editorで実行）:')
    console.log(`
SELECT setval('students_id_seq', COALESCE((SELECT MAX(id) FROM students), 0), true);
SELECT setval('parents_id_seq', COALESCE((SELECT MAX(id) FROM parents), 0), true);
SELECT setval('parent_child_relations_id_seq', COALESCE((SELECT MAX(id) FROM parent_child_relations), 0), true);
`)
  }
}

main().catch(error => {
  console.error('\n💥 Fatal error:', error)
  process.exit(1)
})
