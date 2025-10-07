/**
 * RLS UPDATE/DELETE Security Test
 *
 * 修正したRLSポリシーが正しく動作するかを検証:
 * - 保護者・指導者が他の生徒にメッセージを付け替えられないこと
 * - 保護者・指導者が他の生徒宛メッセージを削除できないこと
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
    console.log(`   エラー: ${error.substring(0, 100)}`)
  }
}

async function testParentUpdateSecurity() {
  console.log('\n👨‍👩‍👧 保護者のUPDATE/DELETEセキュリティテスト\n')

  // テストユーザーを使用
  // parent1@example.com は student5a の親
  // student6a は無関係な生徒

  const parentClient = createClient(supabaseUrl, supabaseServiceKey)
  const { error: signInError } = await parentClient.auth.signInWithPassword({
    email: 'parent1@example.com',
    password: 'password123'
  })

  if (signInError) {
    console.log('保護者サインインエラー:', signInError.message)
    return
  }

  // 保護者・生徒IDを取得
  const { data: parent } = await adminClient
    .from('parents')
    .select('id, user_id')
    .eq('user_id', (await parentClient.auth.getUser()).data.user!.id)
    .single()

  const { data: student1 } = await adminClient
    .from('students')
    .select('id')
    .eq('login_id', 'student5a')
    .single()

  const { data: student2 } = await adminClient
    .from('students')
    .select('id')
    .eq('login_id', 'student6a')
    .single()

  if (!parent || !student1 || !student2) {
    console.log('テストデータ取得エラー')
    return
  }

  // student1宛のメッセージを作成（管理者権限で）
  const { data: msg1, error: msg1Error } = await adminClient
    .from('encouragement_messages')
    .insert({
      student_id: student1!.id,
      sender_id: parent!.user_id,
      sender_role: 'parent',
      message: 'テストメッセージ1',
      support_type: 'custom'
    })
    .select()
    .single()

  if (msg1Error) {
    console.log('メッセージ1作成エラー:', msg1Error.message)
    return
  }

  // student2宛のメッセージを作成（管理者権限で）
  const { data: msg2, error: msg2Error } = await adminClient
    .from('encouragement_messages')
    .insert({
      student_id: student2!.id,
      sender_id: parent!.user_id,
      sender_role: 'parent',
      message: 'テストメッセージ2',
      support_type: 'custom'
    })
    .select()
    .single()

  if (msg2Error) {
    console.log('メッセージ2作成エラー:', msg2Error.message)
    return
  }

  // テスト1: student1宛のメッセージをstudent2に付け替えようとする（ブロックされるべき）
  const { error: updateError1 } = await parentClient
    .from('encouragement_messages')
    .update({ student_id: student2.id })
    .eq('id', msg1!.id)

  logResult(
    '保護者: 子ども宛メッセージを他の生徒に付け替え',
    updateError1 ? 'blocked' : 'allowed',
    updateError1?.message
  )

  // テスト2: student2宛のメッセージを削除しようとする（ブロックされるべき）
  const { error: deleteError } = await parentClient
    .from('encouragement_messages')
    .delete()
    .eq('id', msg2!.id)

  logResult(
    '保護者: 他の生徒宛メッセージを削除',
    deleteError ? 'blocked' : 'allowed',
    deleteError?.message
  )

  // クリーンアップ
  await adminClient.from('encouragement_messages').delete().eq('id', msg1!.id)
  await adminClient.from('encouragement_messages').delete().eq('id', msg2!.id)
  await parentClient.auth.signOut()
}

async function testCoachUpdateSecurity() {
  console.log('\n👨‍🏫 指導者のUPDATE/DELETEセキュリティテスト\n')

  // coach1@example.com は student5a の担当
  // student6a は担当外

  const coachClient = createClient(supabaseUrl, supabaseServiceKey)
  const { error: signInError } = await coachClient.auth.signInWithPassword({
    email: 'coach1@example.com',
    password: 'password123'
  })

  if (signInError) {
    console.log('指導者サインインエラー:', signInError.message)
    return
  }

  // 指導者・生徒IDを取得
  const { data: coach } = await adminClient
    .from('coaches')
    .select('id, user_id')
    .eq('user_id', (await coachClient.auth.getUser()).data.user!.id)
    .single()

  const { data: student1 } = await adminClient
    .from('students')
    .select('id')
    .eq('login_id', 'student5a')
    .single()

  const { data: student2 } = await adminClient
    .from('students')
    .select('id')
    .eq('login_id', 'student6a')
    .single()

  if (!coach || !student1 || !student2) {
    console.log('テストデータ取得エラー')
    return
  }

  // student1宛のメッセージを作成
  const { data: msg1, error: msg1Error } = await adminClient
    .from('encouragement_messages')
    .insert({
      student_id: student1!.id,
      sender_id: coach!.user_id,
      sender_role: 'coach',
      message: 'テストメッセージ1',
      support_type: 'custom'
    })
    .select()
    .single()

  if (msg1Error) {
    console.log('メッセージ1作成エラー:', msg1Error.message)
    return
  }

  // student2宛のメッセージを作成
  const { data: msg2, error: msg2Error } = await adminClient
    .from('encouragement_messages')
    .insert({
      student_id: student2!.id,
      sender_id: coach!.user_id,
      sender_role: 'coach',
      message: 'テストメッセージ2',
      support_type: 'custom'
    })
    .select()
    .single()

  if (msg2Error) {
    console.log('メッセージ2作成エラー:', msg2Error.message)
    return
  }

  // テスト1: student1宛のメッセージをstudent2に付け替えようとする
  const { error: updateError1 } = await coachClient
    .from('encouragement_messages')
    .update({ student_id: student2.id })
    .eq('id', msg1!.id)

  logResult(
    '指導者: 担当生徒宛メッセージを担当外生徒に付け替え',
    updateError1 ? 'blocked' : 'allowed',
    updateError1?.message
  )

  // テスト2: student2宛のメッセージを削除しようとする
  const { error: deleteError } = await coachClient
    .from('encouragement_messages')
    .delete()
    .eq('id', msg2!.id)

  logResult(
    '指導者: 担当外生徒宛メッセージを削除',
    deleteError ? 'blocked' : 'allowed',
    deleteError?.message
  )

  // クリーンアップ
  await adminClient.from('encouragement_messages').delete().eq('id', msg1!.id)
  await adminClient.from('encouragement_messages').delete().eq('id', msg2!.id)
  await coachClient.auth.signOut()
}

async function main() {
  console.log('🔒 RLS UPDATE/DELETE セキュリティ検証テスト開始\n')
  console.log('============================================================\n')

  await testParentUpdateSecurity()
  await testCoachUpdateSecurity()

  console.log('\n📊 テスト結果サマリー\n')
  console.log(`合計: ${results.length}件`)
  console.log(`✅ 正常にブロック: ${results.filter(r => r.passed).length}件`)
  console.log(`❌ 脆弱性検出: ${results.filter(r => !r.passed).length}件`)

  const successRate = (results.filter(r => r.passed).length / results.length * 100).toFixed(1)
  console.log(`セキュリティ合格率: ${successRate}%\n`)

  if (results.some(r => !r.passed)) {
    console.log('⚠️  脆弱性が検出されました。RLSポリシーを再確認してください。\n')
    process.exit(1)
  } else {
    console.log('✨ すべてのセキュリティテストに合格しました!\n')
  }

  console.log('============================================================\n')
  console.log('✨ RLSセキュリティ検証テスト完了\n')
}

main().catch(console.error)
