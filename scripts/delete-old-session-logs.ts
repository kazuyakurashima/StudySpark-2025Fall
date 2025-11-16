/**
 * 古いセッションの学習ログ削除
 *
 * 削除対象: 11月14日より前に終了するセッション（第1回〜第11回相当）の学習ログ
 * 対象生徒: デモユーザー以外の16名
 * 保護対象: デモユーザー（hana6, akira5, hikaru6）のデータ
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
  console.log('🗑️  古いセッションの学習ログ削除...\n')

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

    // 2. 11月14日より前に終了するセッションIDを取得
    const { data: oldSessions, error: sessionsError } = await supabase
      .from('study_sessions')
      .select('id, session_number, grade, end_date')
      .lt('end_date', '2025-11-14')
      .order('session_number')

    if (sessionsError) {
      console.error('❌ セッション取得エラー:', sessionsError)
      process.exit(1)
    }

    const sessionIds = oldSessions?.map(s => s.id) || []
    console.log(`削除対象セッション: ${oldSessions?.length || 0}件`)
    console.log(`削除対象session_ids: [${sessionIds.join(', ')}]\n`)

    // 3. 削除前の確認: 対象ログ数を確認
    const { data: targetLogs, error: logsCheckError } = await supabase
      .from('study_logs')
      .select('id, student_id, session_id, study_date')
      .in('student_id', targetStudentIds)
      .in('session_id', sessionIds)

    if (logsCheckError) {
      console.error('❌ ログ確認エラー:', logsCheckError)
      process.exit(1)
    }

    console.log(`削除対象ログ数: ${targetLogs?.length || 0}件`)

    if (targetLogs && targetLogs.length > 0) {
      // セッション別の集計
      const bySession = targetLogs.reduce((acc, log) => {
        acc[log.session_id] = (acc[log.session_id] || 0) + 1
        return acc
      }, {} as Record<number, number>)

      console.log('\nセッション別内訳:')
      Object.entries(bySession).sort((a, b) => Number(a[0]) - Number(b[0])).forEach(([sid, count]) => {
        const session = oldSessions?.find(s => s.id === Number(sid))
        console.log(`  - 第${session?.session_number}回 (小${session?.grade}): ${count}件`)
      })
    }

    if (!targetLogs || targetLogs.length === 0) {
      console.log('\n✅ 削除対象のログはありません')
      return
    }

    // 4. 学習ログを削除
    console.log('\n📊 学習ログ削除中...')
    const { data: deletedLogs, error: deleteError } = await supabase
      .from('study_logs')
      .delete()
      .in('student_id', targetStudentIds)
      .in('session_id', sessionIds)
      .select('id')

    if (deleteError) {
      console.error('❌ 削除エラー:', deleteError)
      process.exit(1)
    }

    console.log(`   ✅ 削除完了: ${deletedLogs?.length || 0}件`)

    // 5. 削除結果確認
    const { data: remainingLogs } = await supabase
      .from('study_logs')
      .select('id')
      .in('student_id', targetStudentIds)
      .in('session_id', sessionIds)

    console.log(`\n確認: 残り ${remainingLogs?.length || 0}件（0件であることを期待）`)

    // 6. デモユーザーのデータが保護されていることを確認
    const { data: demoStudents } = await supabase
      .from('students')
      .select('id, login_id')
      .in('login_id', demoLoginIds)

    const demoStudentIds = demoStudents?.map(s => s.id) || []

    const { data: demoLogs } = await supabase
      .from('study_logs')
      .select('id')
      .in('student_id', demoStudentIds)
      .in('session_id', sessionIds)

    console.log(`\n【デモユーザー保護確認】: デモユーザーの古いセッションログ ${demoLogs?.length || 0}件 → 保持`)

    console.log('\n' + '='.repeat(60))
    console.log('✅ 削除処理完了')
    console.log('='.repeat(60))

  } catch (error) {
    console.error('❌ エラー:', error)
    process.exit(1)
  }
}

main()
