/**
 * RLS Security Vulnerability Test Script
 *
 * このスクリプトは、応援メッセージのUPDATE/DELETEポリシーが
 * student_id チェックを正しく行っているかを検証します。
 *
 * 検証内容:
 * 1. 保護者が自分の子どもではない生徒にメッセージを付け替えようとする → 拒否
 * 2. 指導者が担当していない生徒にメッセージを付け替えようとする → 拒否
 * 3. 保護者が他の生徒宛メッセージを削除しようとする → 拒否
 * 4. 指導者が他の生徒宛メッセージを削除しようとする → 拒否
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const adminClient = createClient(supabaseUrl, supabaseServiceKey)

interface TestResult {
  test: string
  expected: 'blocked'
  actual: 'blocked' | 'allowed'
  passed: boolean
  error?: string
}

const results: TestResult[] = []

function logResult(test: string, actual: 'blocked' | 'allowed', error?: string) {
  const passed = actual === 'blocked'
  results.push({ test, expected: 'blocked', actual, passed, error })

  const status = passed ? '✅' : '❌ 脆弱性'
  const actualStr = actual === 'blocked' ? '正常にブロック' : '⚠️ 許可された（脆弱性）'

  console.log(`${status} ${test}: ${actualStr}`)
  if (error && passed) {
    console.log(`   エラーメッセージ: ${error}`)
  }
}

async function setupTestData() {
  console.log('\n📝 テストデータをセットアップ中...\n')

  // 2人の生徒を作成
  const { data: student1, error: s1Error } = await adminClient.auth.admin.createUser({
    email: 'security-student1@test.local',
    password: 'testpass123',
    email_confirm: true,
    user_metadata: { role: 'student' }
  })

  const { data: student2, error: s2Error } = await adminClient.auth.admin.createUser({
    email: 'security-student2@test.local',
    password: 'testpass123',
    email_confirm: true,
    user_metadata: { role: 'student' }
  })

  if (s1Error || s2Error) {
    console.log('生徒作成エラー:', s1Error?.message || s2Error?.message)
    return null
  }

  // profiles作成
  await adminClient.from('profiles').insert([
    { id: student1!.user.id, role: 'student', nickname: 'テスト生徒1', avatar: 'default' },
    { id: student2!.user.id, role: 'student', nickname: 'テスト生徒2', avatar: 'default' }
  ])

  // students レコード作成
  const { data: studentRecord1, error: sr1Error } = await adminClient
    .from('students')
    .insert({
      user_id: student1!.user.id,
      login_id: 'security-student1',
      full_name: 'セキュリティテスト生徒1',
      grade: 6,
      course: 'C'
    })
    .select()
    .single()

  if (sr1Error) {
    console.log('生徒1レコード作成エラー:', sr1Error.message)
    return null
  }

  const { data: studentRecord2, error: sr2Error } = await adminClient
    .from('students')
    .insert({
      user_id: student2!.user.id,
      login_id: 'security-student2',
      full_name: 'セキュリティテスト生徒2',
      grade: 6,
      course: 'C'
    })
    .select()
    .single()

  if (sr2Error) {
    console.log('生徒2レコード作成エラー:', sr2Error.message)
    return null
  }

  // 保護者を作成（student1の親）
  const { data: parent, error: pError } = await adminClient.auth.admin.createUser({
    email: 'security-parent@test.local',
    password: 'testpass123',
    email_confirm: true,
    user_metadata: { role: 'parent' }
  })

  if (pError) {
    console.log('保護者作成エラー:', pError.message)
    return null
  }

  await adminClient.from('profiles').insert({
    id: parent!.user.id,
    role: 'parent',
    nickname: 'テスト保護者',
    avatar: 'default'
  })

  // parents レコード作成
  const { data: parentRecord, error: prError } = await adminClient
    .from('parents')
    .insert({
      user_id: parent!.user.id
    })
    .select()
    .single()

  if (prError) {
    console.log('保護者レコード作成エラー:', prError.message)
    return null
  }

  // 親子関係作成（student1のみ）
  await adminClient
    .from('parent_child_relations')
    .insert({
      parent_id: parentRecord!.id,
      student_id: studentRecord1!.id
    })

  // 指導者を作成（student1の担当）
  const { data: coach, error: cError } = await adminClient.auth.admin.createUser({
    email: 'security-coach@test.local',
    password: 'testpass123',
    email_confirm: true,
    user_metadata: { role: 'coach' }
  })

  if (cError) {
    console.log('指導者作成エラー:', cError.message)
    return null
  }

  await adminClient.from('profiles').insert({
    id: coach!.user.id,
    role: 'coach',
    nickname: 'テスト指導者',
    avatar: 'default'
  })

  // coaches レコード作成
  const { data: coachRecord, error: crError } = await adminClient
    .from('coaches')
    .insert({
      user_id: coach!.user.id,
      invitation_code: 'TEST123'
    })
    .select()
    .single()

  if (crError) {
    console.log('指導者レコード作成エラー:', crError.message)
    return null
  }

  // 指導関係作成（student1のみ）
  await adminClient
    .from('coach_student_relations')
    .insert({
      coach_id: coachRecord!.id,
      student_id: studentRecord1!.id
    })

  // 保護者がstudent1に送ったメッセージを作成
  const { data: parentMsg } = await adminClient
    .from('encouragement_messages')
    .insert({
      student_id: studentRecord1!.id,
      sender_id: parent!.user.id,
      sender_role: 'parent',
      message_text: '保護者からのメッセージ'
    })
    .select()
    .single()

  // 指導者がstudent1に送ったメッセージを作成
  const { data: coachMsg } = await adminClient
    .from('encouragement_messages')
    .insert({
      student_id: studentRecord1!.id,
      sender_id: coach!.user.id,
      sender_role: 'coach',
      message_text: '指導者からのメッセージ'
    })
    .select()
    .single()

  console.log('✅ テストデータセットアップ完了')
  console.log(`  - 生徒1: ${studentRecord1!.id}`)
  console.log(`  - 生徒2: ${studentRecord2!.id}`)
  console.log(`  - 保護者メッセージID: ${parentMsg!.id}`)
  console.log(`  - 指導者メッセージID: ${coachMsg!.id}`)

  return {
    student1: studentRecord1!,
    student2: studentRecord2!,
    parent: parent!.user,
    coach: coach!.user,
    parentMsg: parentMsg!,
    coachMsg: coachMsg!
  }
}

async function testParentSecurity(testData: any) {
  console.log('\n👨‍👩‍👧 保護者ロールのセキュリティテスト\n')

  const parentClient = createClient(supabaseUrl, supabaseServiceKey)
  await parentClient.auth.signInWithPassword({
    email: 'security-parent@test.local',
    password: 'testpass123'
  })

  // テスト1: 自分のメッセージを他の生徒(student2)に付け替えようとする
  const { error: updateError } = await parentClient
    .from('encouragement_messages')
    .update({ student_id: testData.student2.id })
    .eq('id', testData.parentMsg.id)

  logResult(
    '保護者: 自分のメッセージを他の生徒に付け替える',
    updateError ? 'blocked' : 'allowed',
    updateError?.message
  )

  // テスト2: student2宛のダミーメッセージを削除しようとする
  // （まず管理者でstudent2宛メッセージを作成）
  const { data: student2Msg } = await adminClient
    .from('encouragement_messages')
    .insert({
      student_id: testData.student2.id,
      sender_id: testData.parent.id,
      sender_role: 'parent',
      message_text: 'student2宛メッセージ'
    })
    .select()
    .single()

  const { error: deleteError } = await parentClient
    .from('encouragement_messages')
    .delete()
    .eq('id', student2Msg!.id)

  logResult(
    '保護者: 他の生徒宛の自分のメッセージを削除',
    deleteError ? 'blocked' : 'allowed',
    deleteError?.message
  )

  await parentClient.auth.signOut()
}

async function testCoachSecurity(testData: any) {
  console.log('\n👨‍🏫 指導者ロールのセキュリティテスト\n')

  const coachClient = createClient(supabaseUrl, supabaseServiceKey)
  await coachClient.auth.signInWithPassword({
    email: 'security-coach@test.local',
    password: 'testpass123'
  })

  // テスト1: 自分のメッセージを他の生徒(student2)に付け替えようとする
  const { error: updateError } = await coachClient
    .from('encouragement_messages')
    .update({ student_id: testData.student2.id })
    .eq('id', testData.coachMsg.id)

  logResult(
    '指導者: 自分のメッセージを担当外の生徒に付け替える',
    updateError ? 'blocked' : 'allowed',
    updateError?.message
  )

  // テスト2: student2宛のダミーメッセージを削除しようとする
  const { data: student2Msg } = await adminClient
    .from('encouragement_messages')
    .insert({
      student_id: testData.student2.id,
      sender_id: testData.coach.id,
      sender_role: 'coach',
      message_text: 'student2宛メッセージ'
    })
    .select()
    .single()

  const { error: deleteError } = await coachClient
    .from('encouragement_messages')
    .delete()
    .eq('id', student2Msg!.id)

  logResult(
    '指導者: 担当外生徒宛の自分のメッセージを削除',
    deleteError ? 'blocked' : 'allowed',
    deleteError?.message
  )

  await coachClient.auth.signOut()
}

async function cleanup() {
  console.log('\n🧹 テストデータをクリーンアップ中...\n')

  const users = [
    'security-student1@test.local',
    'security-student2@test.local',
    'security-parent@test.local',
    'security-coach@test.local'
  ]

  for (const email of users) {
    const { data: { users: userList } } = await adminClient.auth.admin.listUsers()
    const user = userList.find(u => u.email === email)
    if (user) {
      await adminClient.auth.admin.deleteUser(user.id)
      console.log(`削除: ${email}`)
    }
  }
}

async function main() {
  console.log('🔒 RLSセキュリティ脆弱性検証テスト開始\n')
  console.log('============================================================\n')

  // 既存のテストユーザーをクリーンアップ
  const users = [
    'security-student1@test.local',
    'security-student2@test.local',
    'security-parent@test.local',
    'security-coach@test.local'
  ]

  const { data: { users: userList } } = await adminClient.auth.admin.listUsers()
  for (const email of users) {
    const user = userList.find(u => u.email === email)
    if (user) {
      await adminClient.auth.admin.deleteUser(user.id)
    }
  }

  const testData = await setupTestData()
  if (!testData) {
    console.log('テストデータセットアップ失敗')
    return
  }

  await testParentSecurity(testData)
  await testCoachSecurity(testData)

  console.log('\n📊 テスト結果サマリー\n')
  console.log(`合計: ${results.length}件`)
  console.log(`✅ 正常にブロック: ${results.filter(r => r.passed).length}件`)
  console.log(`❌ 脆弱性検出: ${results.filter(r => !r.passed).length}件`)

  const successRate = (results.filter(r => r.passed).length / results.length * 100).toFixed(1)
  console.log(`セキュリティ合格率: ${successRate}%\n`)

  if (results.some(r => !r.passed)) {
    console.log('⚠️  脆弱性が検出されました。RLSポリシーを修正してください。\n')
  } else {
    console.log('✨ すべてのセキュリティテストに合格しました！\n')
  }

  await cleanup()

  console.log('============================================================\n')
  console.log('✨ RLSセキュリティ検証テスト完了\n')
}

main().catch(console.error)
