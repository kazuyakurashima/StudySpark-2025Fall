/**
 * 削除対象データの確認スクリプト
 *
 * 対象:
 * - 15家族（test010〜test024）の学習ログ（11月9日〜13日）
 * - 15家族（test010〜test024）のリフレクト（第1回〜第6回）
 *
 * ⚠️ 青空・星野家族（test001, test002）のデータは保持
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
  console.log('🔍 削除対象データの確認...\n')

  try {
    // 1. test010-test024 に該当する生徒IDを取得
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('id, login_id, full_name')
      .in('login_id', [
        'mao5', 'ことのか5', 'いち5', 'はるき5', 'ななこ5', 'ともき5', 'しゅうへい5',
        'たくみ6', 'たいよう6', 'としたか6', 'みやこ6', 'しょうや6', 'まなと6', 'ともえ6', 'みすず6', 'そうま6'
      ])

    if (studentsError) {
      console.error('❌ 生徒取得エラー:', studentsError)
      process.exit(1)
    }

    console.log(`✅ 対象生徒数: ${students?.length || 0}名`)
    students?.forEach(s => console.log(`   - ${s.login_id} (${s.full_name})`))

    const studentIds = students?.map(s => s.id) || []

    // 2. 学習ログ削除対象の確認（11月9日〜13日）
    console.log('\n📊 学習ログ削除対象（11月9日〜13日）:')
    const { data: studyLogs, error: studyLogsError } = await supabase
      .from('study_logs')
      .select('id, student_id, study_date, subject_id')
      .in('student_id', studentIds)
      .gte('study_date', '2025-11-09')
      .lte('study_date', '2025-11-13')

    if (studyLogsError) {
      console.error('❌ 学習ログ取得エラー:', studyLogsError)
    } else {
      console.log(`   削除件数: ${studyLogs?.length || 0}件`)

      // 日付別の集計
      const byDate = studyLogs?.reduce((acc, log) => {
        acc[log.study_date] = (acc[log.study_date] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      Object.entries(byDate || {}).forEach(([date, count]) => {
        console.log(`   - ${date}: ${count}件`)
      })
    }

    // 3. リフレクト削除対象の確認（第1回〜第6回）
    console.log('\n📝 リフレクト削除対象（第1回〜第6回）:')
    const { data: sessions, error: sessionsError } = await supabase
      .from('coaching_sessions')
      .select(`
        id,
        student_id,
        session_number,
        study_sessions!inner(session_number, grade)
      `)
      .in('student_id', studentIds)
      .eq('session_type', 'reflect')

    if (sessionsError) {
      console.error('❌ リフレクト取得エラー:', sessionsError)
    } else {
      // 第1回〜第6回のみフィルター
      const targetSessions = sessions?.filter((s: any) => {
        const sessionNum = s.study_sessions?.session_number
        return sessionNum >= 1 && sessionNum <= 6
      })

      console.log(`   削除件数: ${targetSessions?.length || 0}件`)

      // セッション番号別の集計
      const bySession = targetSessions?.reduce((acc: any, session: any) => {
        const num = session.study_sessions?.session_number
        acc[num] = (acc[num] || 0) + 1
        return acc
      }, {} as Record<number, number>)

      Object.entries(bySession || {}).sort(([a], [b]) => Number(a) - Number(b)).forEach(([session, count]) => {
        console.log(`   - 第${session}回: ${count}件`)
      })

      // コーチングメッセージも確認
      if (targetSessions && targetSessions.length > 0) {
        const sessionIds = targetSessions.map((s: any) => s.id)
        const { data: messages } = await supabase
          .from('coaching_messages')
          .select('id')
          .in('session_id', sessionIds)

        console.log(`   関連メッセージ: ${messages?.length || 0}件`)
      }
    }

    // 4. デモユーザー（青空・星野）のデータが含まれていないことを確認
    console.log('\n🔒 デモユーザーデータの保護確認:')
    const { data: demoStudents } = await supabase
      .from('students')
      .select('id, login_id, full_name')
      .in('login_id', ['hana6', 'akira5', 'hikaru6'])

    const demoStudentIds = demoStudents?.map(s => s.id) || []

    const { data: demoStudyLogs } = await supabase
      .from('study_logs')
      .select('id')
      .in('student_id', demoStudentIds)
      .gte('study_date', '2025-11-09')
      .lte('study_date', '2025-11-13')

    const { data: demoSessions } = await supabase
      .from('coaching_sessions')
      .select('id, study_sessions!inner(session_number)')
      .in('student_id', demoStudentIds)
      .eq('session_type', 'reflect')

    const demoTargetSessions = demoSessions?.filter((s: any) => {
      const num = s.study_sessions?.session_number
      return num >= 1 && num <= 6
    })

    console.log(`   デモ生徒: ${demoStudents?.length || 0}名`)
    demoStudents?.forEach(s => console.log(`   - ${s.login_id} (${s.full_name})`))
    console.log(`   ⚠️ デモ生徒の学習ログ（11/9-13）: ${demoStudyLogs?.length || 0}件 → 保持`)
    console.log(`   ⚠️ デモ生徒のリフレクト（第1-6回）: ${demoTargetSessions?.length || 0}件 → 保持`)

    console.log('\n' + '='.repeat(60))
    console.log('✅ 確認完了')
    console.log('='.repeat(60))

  } catch (error) {
    console.error('\n❌ エラー:', error)
    process.exit(1)
  }
}

main()
