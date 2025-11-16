/**
 * リフレクトセッション削除（16名の生徒）
 *
 * 削除対象: 11月14日より前のリフレクトセッション
 * 保護対象: デモユーザー（hana6, akira5, hikaru6）
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function main() {
  console.log('🗑️  リフレクトセッション削除...\n')

  try {
    // 1. デモユーザー以外の生徒IDを取得
    const { data: allStudents } = await supabase
      .from('students')
      .select('id, login_id, full_name')
      .order('login_id')

    const demoLoginIds = ['hana6', 'akira5', 'hikaru6']
    const targetStudents = allStudents?.filter(s => !demoLoginIds.includes(s.login_id)) || []
    const targetStudentIds = targetStudents.map(s => s.id)

    console.log(`対象生徒: ${targetStudents.length}名`)
    console.log(`保護対象: ${demoLoginIds.length}名（デモユーザー）\n`)

    // 2. 削除対象のセッションを取得
    const { data: targetSessions, error: sessionsError } = await supabase
      .from('coaching_sessions')
      .select('id, student_id, week_start_date, week_end_date')
      .in('student_id', targetStudentIds)
      .lt('week_start_date', '2025-11-14')

    if (sessionsError) {
      console.error('❌ セッション取得エラー:', sessionsError)
      process.exit(1)
    }

    const sessionIds = targetSessions?.map(s => s.id) || []
    console.log(`削除対象セッション: ${sessionIds.length}件`)

    if (sessionIds.length === 0) {
      console.log('✅ 削除対象のセッションはありません')
      return
    }

    // 3. コーチングメッセージを先に削除
    console.log('\n📝 コーチングメッセージ削除中...')
    const { data: deletedMessages, error: messagesError } = await supabase
      .from('coaching_messages')
      .delete()
      .in('session_id', sessionIds)
      .select('id')

    if (messagesError) {
      console.error('❌ メッセージ削除エラー:', messagesError)
      process.exit(1)
    }

    console.log(`   ✅ メッセージ削除完了: ${deletedMessages?.length || 0}件`)

    // 4. コーチングセッションを削除
    console.log('\n🎯 コーチングセッション削除中...')
    const { data: deletedSessions, error: deleteSessionsError } = await supabase
      .from('coaching_sessions')
      .delete()
      .in('id', sessionIds)
      .select('id')

    if (deleteSessionsError) {
      console.error('❌ セッション削除エラー:', deleteSessionsError)
      process.exit(1)
    }

    console.log(`   ✅ セッション削除完了: ${deletedSessions?.length || 0}件`)

    // 5. 削除結果確認
    const { data: remainingSessions } = await supabase
      .from('coaching_sessions')
      .select('id')
      .in('student_id', targetStudentIds)
      .lt('week_start_date', '2025-11-14')

    console.log(`\n確認: 残り ${remainingSessions?.length || 0}件（0件であることを期待）`)

    console.log('\n' + '='.repeat(60))
    console.log('✅ 削除処理完了')
    console.log('='.repeat(60))

  } catch (error) {
    console.error('❌ エラー:', error)
    process.exit(1)
  }
}

main()
