/**
 * 15家族のテストデータ削除スクリプト
 *
 * 削除対象:
 * - 16名の生徒（デモユーザー hana6, akira5, hikaru6 以外）
 * - 学習ログ: 11月9日〜13日
 * - リフレクト: 第1回〜第6回
 *
 * ⚠️ デモユーザー（青空・星野家族）のデータは保持
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
  console.log('🗑️  テストデータ削除開始...\n')

  try {
    // 1. デモユーザー以外の生徒IDを取得
    const { data: allStudents, error: allStudentsError } = await supabase
      .from('students')
      .select('id, login_id, full_name')
      .order('login_id')

    if (allStudentsError) {
      console.error('❌ 生徒取得エラー:', allStudentsError)
      process.exit(1)
    }

    // デモユーザーを除外
    const demoLoginIds = ['hana6', 'akira5', 'hikaru6']
    const targetStudents = allStudents?.filter(s => !demoLoginIds.includes(s.login_id)) || []
    const targetStudentIds = targetStudents.map(s => s.id)

    console.log(`✅ 削除対象生徒: ${targetStudents.length}名`)
    targetStudents.forEach(s => console.log(`   - ${s.login_id} (${s.full_name})`))

    console.log(`\n✅ 保持対象生徒: ${demoLoginIds.length}名（デモユーザー）`)
    demoLoginIds.forEach(id => console.log(`   - ${id}`))

    // 2. 学習ログ削除（11月9日〜13日）
    console.log('\n📊 学習ログ削除（11月9日〜13日）...')
    const { data: deletedLogs, error: logsError } = await supabase
      .from('study_logs')
      .delete()
      .in('student_id', targetStudentIds)
      .gte('study_date', '2025-11-09')
      .lte('study_date', '2025-11-13')
      .select('id')

    if (logsError) {
      console.error('❌ 学習ログ削除エラー:', logsError)
    } else {
      console.log(`   ✅ 削除完了: ${deletedLogs?.length || 0}件`)
    }

    // 3. リフレクト削除（第1回〜第6回）
    console.log('\n📝 リフレクト削除（第1回〜第6回）...')

    // まず対象のセッションIDを取得
    const { data: targetSessions, error: sessionsError } = await supabase
      .from('coaching_sessions')
      .select('id, session_number, students!inner(id)')
      .in('students.id', targetStudentIds)
      .eq('session_type', 'reflect')
      .gte('session_number', 1)
      .lte('session_number', 6)

    if (sessionsError) {
      console.error('❌ セッション取得エラー:', sessionsError)
    } else {
      const sessionIds = targetSessions?.map((s: any) => s.id) || []
      console.log(`   対象セッション数: ${sessionIds.length}件`)

      if (sessionIds.length > 0) {
        // コーチングメッセージを先に削除
        const { data: deletedMessages, error: messagesError } = await supabase
          .from('coaching_messages')
          .delete()
          .in('session_id', sessionIds)
          .select('id')

        if (messagesError) {
          console.error('❌ メッセージ削除エラー:', messagesError)
        } else {
          console.log(`   ✅ メッセージ削除: ${deletedMessages?.length || 0}件`)
        }

        // セッションを削除
        const { data: deletedSessions, error: deleteSessionsError } = await supabase
          .from('coaching_sessions')
          .delete()
          .in('id', sessionIds)
          .select('id')

        if (deleteSessionsError) {
          console.error('❌ セッション削除エラー:', deleteSessionsError)
        } else {
          console.log(`   ✅ セッション削除: ${deletedSessions?.length || 0}件`)
        }
      }
    }

    console.log('\n' + '='.repeat(60))
    console.log('✅ 削除処理完了')
    console.log('='.repeat(60))

  } catch (error) {
    console.error('\n❌ エラー:', error)
    process.exit(1)
  }
}

main()
