/**
 * リフレクトデータの詳細確認
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
  console.log('🔍 リフレクトデータ確認...\n')

  try {
    // 1. デモユーザー以外の生徒IDを取得
    const { data: allStudents } = await supabase
      .from('students')
      .select('id, login_id, full_name')
      .order('login_id')

    const demoLoginIds = ['hana6', 'akira5', 'hikaru6']
    const targetStudents = allStudents?.filter(s => !demoLoginIds.includes(s.login_id)) || []
    const targetStudentIds = targetStudents.map(s => s.id)

    console.log(`対象生徒: ${targetStudents.length}名\n`)

    // 2. すべてのcoaching_sessionsを確認
    const { data: allSessions, error } = await supabase
      .from('coaching_sessions')
      .select('*')
      .in('student_id', targetStudentIds)
      .order('week_start_date')

    if (error) {
      console.error('❌ エラー:', error)
      process.exit(1)
    }

    console.log(`\n全セッション数: ${allSessions?.length || 0}件\n`)

    if (allSessions && allSessions.length > 0) {
      console.log('セッション詳細:')
      allSessions.forEach((session: any, i: number) => {
        console.log(`\n${i + 1}. セッションID: ${session.id}`)
        console.log(`   生徒ID: ${session.student_id}`)
        console.log(`   セッションタイプ: ${session.session_type || 'N/A'}`)
        console.log(`   週開始日: ${session.week_start_date}`)
        console.log(`   週終了日: ${session.week_end_date}`)
        console.log(`   ステータス: ${session.status || 'N/A'}`)
        console.log(`   作成日: ${session.created_at}`)
      })

      // 11月14日より前のセッション
      const oldSessions = allSessions.filter((s: any) => s.week_start_date < '2025-11-14')
      console.log(`\n\n11月14日より前のセッション: ${oldSessions.length}件`)

      if (oldSessions.length > 0) {
        console.log('\n削除対象:')
        oldSessions.forEach((s: any) => {
          const student = targetStudents.find(st => st.id === s.student_id)
          console.log(`  - ${student?.login_id} (${s.week_start_date} 〜 ${s.week_end_date})`)
        })
      }
    }

    // 3. デモユーザーのセッションも確認
    const { data: demoSessions } = await supabase
      .from('coaching_sessions')
      .select('*, students!inner(login_id, full_name)')
      .in('students.login_id', demoLoginIds)
      .order('week_start_date')

    console.log(`\n\n【デモユーザーのセッション】: ${demoSessions?.length || 0}件`)
    if (demoSessions && demoSessions.length > 0) {
      demoSessions.forEach((s: any) => {
        console.log(`  - ${s.students.login_id}: ${s.week_start_date} 〜 ${s.week_end_date}`)
      })
    }

  } catch (error) {
    console.error('❌ エラー:', error)
    process.exit(1)
  }
}

main()
