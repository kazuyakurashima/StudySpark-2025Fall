/**
 * RLS Policy Verification Test Script
 *
 * このスクリプトは、Phase 0で定義したRLSポリシーが
 * 要件通りに動作するかを検証します。
 */

import { createClient } from '@supabase/supabase-js'

// Supabase接続情報
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

// サービスロールクライアント（テストユーザー作成用）
const adminClient = createClient(supabaseUrl, supabaseServiceKey)

interface TestResult {
  test: string
  expected: 'success' | 'fail'
  actual: 'success' | 'fail'
  passed: boolean
  error?: string
}

const results: TestResult[] = []

function logResult(test: string, expected: 'success' | 'fail', actual: 'success' | 'fail', error?: string) {
  const passed = expected === actual
  results.push({ test, expected, actual, passed, error })

  const status = passed ? '✅' : '❌'
  const expectedStr = expected === 'success' ? '許可' : '拒否'
  const actualStr = actual === 'success' ? '許可された' : '拒否された'

  console.log(`${status} ${test}: 期待=${expectedStr}, 実際=${actualStr}`)
  if (error && !passed) {
    console.log(`   エラー: ${error}`)
  }
}

async function createTestUsers() {
  console.log('\n📝 テストユーザーを作成中...\n')

  // タイムスタンプで一意性を確保
  const timestamp = Date.now()

  // 生徒ユーザー作成
  const { data: student, error: studentError } = await adminClient.auth.admin.createUser({
    email: `rls-student-${timestamp}@test.local`,
    password: 'testpass123',
    email_confirm: true,
    user_metadata: { role: 'student' }
  })

  if (studentError) {
    console.log('生徒ユーザー作成エラー:', studentError.message)
  }

  // 保護者ユーザー作成
  const { data: parent, error: parentError } = await adminClient.auth.admin.createUser({
    email: `rls-parent-${timestamp}@test.local`,
    password: 'testpass123',
    email_confirm: true,
    user_metadata: { role: 'parent' }
  })

  if (parentError) {
    console.log('保護者ユーザー作成エラー:', parentError.message)
  }

  // 指導者ユーザー作成
  const { data: coach, error: coachError } = await adminClient.auth.admin.createUser({
    email: `rls-coach-${timestamp}@test.local`,
    password: 'testpass123',
    email_confirm: true,
    user_metadata: { role: 'coach' }
  })

  if (coachError) {
    console.log('指導者ユーザー作成エラー:', coachError.message)
  }

  // プロフィール、students, parents, coaches テーブルにデータ追加
  if (student?.user) {
    await adminClient.from('profiles').insert({
      id: student.user.id,
      role: 'student',
      display_name: 'テスト生徒',
      avatar_url: null
    })

    const { data: studentData } = await adminClient.from('students').insert({
      user_id: student.user.id,
      login_id: `rls-student-${timestamp}`,
      full_name: 'テスト生徒',
      furigana: 'テストセイト',
      grade: 6,
      course: 'A'
    }).select().single()

    console.log('生徒作成完了:', studentData?.id)
  }

  if (parent?.user) {
    await adminClient.from('profiles').insert({
      id: parent.user.id,
      role: 'parent',
      display_name: 'テスト保護者',
      avatar_url: null
    })

    const { data: parentData } = await adminClient.from('parents').insert({
      user_id: parent.user.id,
      full_name: 'テスト保護者',
      furigana: 'テストホゴシャ'
    }).select().single()

    console.log('保護者作成完了:', parentData?.id)
  }

  if (coach?.user) {
    await adminClient.from('profiles').insert({
      id: coach.user.id,
      role: 'coach',
      display_name: 'テスト指導者',
      avatar_url: null
    })

    const { data: coachData } = await adminClient.from('coaches').insert({
      user_id: coach.user.id,
      full_name: 'テスト指導者',
      furigana: 'テストシドウシャ',
      invitation_code: null
    }).select().single()

    console.log('指導者作成完了:', coachData?.id)
  }

  return {
    student: student?.user,
    parent: parent?.user,
    coach: coach?.user,
    studentEmail: `rls-student-${timestamp}@test.local`,
    parentEmail: `rls-parent-${timestamp}@test.local`,
    coachEmail: `rls-coach-${timestamp}@test.local`
  }
}

async function testStudentRLS(studentUser: any, studentEmail: string) {
  console.log('\n👨‍🎓 生徒ロールのRLSテスト\n')

  const studentClient = createClient(supabaseUrl, supabaseAnonKey)
  const { error: signInError } = await studentClient.auth.signInWithPassword({
    email: studentEmail,
    password: 'testpass123'
  })

  if (signInError) {
    console.log('生徒サインインエラー:', signInError.message)
    return
  }

  // 自分の学習記録を取得（許可されるべき）
  const { data: ownLogs, error: ownLogsError } = await studentClient
    .from('study_logs')
    .select('*')

  logResult(
    '生徒: 自分の学習記録を取得',
    'success',
    ownLogsError ? 'fail' : 'success',
    ownLogsError?.message
  )

  // 自分宛の応援メッセージを取得（許可されるべき）
  const { data: ownMessages, error: ownMessagesError } = await studentClient
    .from('encouragement_messages')
    .select('*')

  logResult(
    '生徒: 自分宛の応援メッセージを取得',
    'success',
    ownMessagesError ? 'fail' : 'success',
    ownMessagesError?.message
  )

  // 応援メッセージを送信（拒否されるべき）
  const { error: sendError } = await studentClient
    .from('encouragement_messages')
    .insert({
      student_id: 'dummy-id',
      sender_id: studentUser.id,
      sender_role: 'student',
      message: 'テスト',
      support_type: 'custom'
    })

  logResult(
    '生徒: 応援メッセージを送信',
    'fail',
    sendError ? 'fail' : 'success',
    sendError?.message
  )

  await studentClient.auth.signOut()
}

async function testParentRLS(parentUser: any, parentEmail: string) {
  console.log('\n👨‍👩‍👧 保護者ロールのRLSテスト\n')

  const parentClient = createClient(supabaseUrl, supabaseAnonKey)
  const { error: signInError } = await parentClient.auth.signInWithPassword({
    email: parentEmail,
    password: 'testpass123'
  })

  if (signInError) {
    console.log('保護者サインインエラー:', signInError.message)
    return
  }

  // 子どもの学習記録を取得（許可されるべき - ただし親子関係が必要）
  const { data: childLogs, error: childLogsError } = await parentClient
    .from('study_logs')
    .select('*')

  logResult(
    '保護者: 子どもの学習記録を取得',
    'success',
    childLogsError ? 'fail' : 'success',
    childLogsError?.message
  )

  // 学習記録を作成（拒否されるべき）
  const { error: createLogError } = await parentClient
    .from('study_logs')
    .insert({
      student_id: 'dummy-id',
      session_id: 'dummy-session',
      subject_id: 'dummy-subject',
      study_content_type_id: 'dummy-type',
      correct_count: 10,
      total_problems: 20
    })

  logResult(
    '保護者: 学習記録を作成',
    'fail',
    createLogError ? 'fail' : 'success',
    createLogError?.message
  )

  await parentClient.auth.signOut()
}

async function testCoachRLS(coachUser: any, coachEmail: string) {
  console.log('\n👨‍🏫 指導者ロールのRLSテスト\n')

  const coachClient = createClient(supabaseUrl, supabaseAnonKey)
  const { error: signInError } = await coachClient.auth.signInWithPassword({
    email: coachEmail,
    password: 'testpass123'
  })

  if (signInError) {
    console.log('指導者サインインエラー:', signInError.message)
    return
  }

  // 担当生徒の学習記録を取得（許可されるべき - ただし指導関係が必要）
  const { data: studentLogs, error: studentLogsError } = await coachClient
    .from('study_logs')
    .select('*')

  logResult(
    '指導者: 担当生徒の学習記録を取得',
    'success',
    studentLogsError ? 'fail' : 'success',
    studentLogsError?.message
  )

  // 学習記録を作成（拒否されるべき）
  const { error: createLogError } = await coachClient
    .from('study_logs')
    .insert({
      student_id: 'dummy-id',
      session_id: 'dummy-session',
      subject_id: 'dummy-subject',
      study_content_type_id: 'dummy-type',
      correct_count: 10,
      total_problems: 20
    })

  logResult(
    '指導者: 学習記録を作成',
    'fail',
    createLogError ? 'fail' : 'success',
    createLogError?.message
  )

  // 週次分析を取得（許可されるべき）
  const { data: analysis, error: analysisError } = await coachClient
    .from('weekly_analysis')
    .select('*')

  logResult(
    '指導者: 週次分析を取得',
    'success',
    analysisError ? 'fail' : 'success',
    analysisError?.message
  )

  await coachClient.auth.signOut()
}

async function cleanupTestUsers() {
  console.log('\n🧹 テストユーザーをクリーンアップ中...\n')

  const { data: users } = await adminClient.auth.admin.listUsers()
  const testUsers = users?.users.filter(u =>
    u.email?.includes('rls-') && u.email?.includes('@test.local')
  )

  for (const user of testUsers || []) {
    await adminClient.auth.admin.deleteUser(user.id)
    console.log(`削除: ${user.email}`)
  }
}

async function printSummary() {
  console.log('\n📊 テスト結果サマリー\n')

  const passed = results.filter(r => r.passed).length
  const failed = results.filter(r => !r.passed).length
  const total = results.length

  console.log(`合計: ${total}件`)
  console.log(`✅ 成功: ${passed}件`)
  console.log(`❌ 失敗: ${failed}件`)
  console.log(`成功率: ${((passed / total) * 100).toFixed(1)}%\n`)

  if (failed > 0) {
    console.log('失敗したテスト:')
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.test}`)
      if (r.error) {
        console.log(`    エラー: ${r.error}`)
      }
    })
  }
}

async function main() {
  console.log('🚀 RLSポリシー検証テスト開始\n')
  console.log('=' .repeat(60))

  try {
    // テストユーザー作成
    const { student, parent, coach, studentEmail, parentEmail, coachEmail } = await createTestUsers()

    // 各ロールのテスト実行
    if (student) await testStudentRLS(student, studentEmail)
    if (parent) await testParentRLS(parent, parentEmail)
    if (coach) await testCoachRLS(coach, coachEmail)

    // サマリー表示
    await printSummary()

    // クリーンアップ
    await cleanupTestUsers()

    console.log('=' .repeat(60))
    console.log('\n✨ RLSポリシー検証テスト完了\n')

    // 失敗があれば終了コード1
    const hasFailed = results.some(r => !r.passed)
    process.exit(hasFailed ? 1 : 0)

  } catch (error) {
    console.error('テスト実行エラー:', error)
    process.exit(1)
  }
}

main()
