/**
 * 残りの学習ログ削除（11月8日）
 *
 * 16名の生徒の11月8日の学習ログを削除
 * デモユーザー（hana6, akira5, hikaru6）のデータは保持
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
  console.log('🗑️  11月8日の学習ログ削除...\n')

  try {
    // デモユーザー以外の生徒IDを取得
    const { data: allStudents } = await supabase
      .from('students')
      .select('id, login_id, full_name')
      .order('login_id')

    const demoLoginIds = ['hana6', 'akira5', 'hikaru6']
    const targetStudents = allStudents?.filter(s => !demoLoginIds.includes(s.login_id)) || []
    const targetStudentIds = targetStudents.map(s => s.id)

    console.log(`対象生徒: ${targetStudents.length}名`)

    // 11月8日の学習ログを削除
    const { data: deletedLogs, error } = await supabase
      .from('study_logs')
      .delete()
      .in('student_id', targetStudentIds)
      .eq('study_date', '2025-11-08')
      .select('id')

    if (error) {
      console.error('❌ エラー:', error)
      process.exit(1)
    }

    console.log(`✅ 削除完了: ${deletedLogs?.length || 0}件`)

  } catch (error) {
    console.error('❌ エラー:', error)
    process.exit(1)
  }
}

main()
