/**
 * study_sessionsテーブルの確認
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
  console.log('🔍 study_sessionsテーブル確認...\n')

  try {
    // study_sessionsを全件取得
    const { data: sessions, error } = await supabase
      .from('study_sessions')
      .select('*')
      .order('session_number')

    if (error) {
      console.error('❌ エラー:', error)
      process.exit(1)
    }

    console.log(`全セッション数: ${sessions?.length || 0}件\n`)

    if (sessions && sessions.length > 0) {
      console.log('セッション一覧:')
      sessions.forEach((s: any) => {
        console.log(`\n第${s.session_number}回:`)
        console.log(`  ID: ${s.id}`)
        console.log(`  学年: 小${s.grade}`)
        console.log(`  開始日: ${s.start_date}`)
        console.log(`  終了日: ${s.end_date}`)
      })

      // 11月14日より前のセッション（第1回〜第6回相当）
      const oldSessions = sessions.filter((s: any) => s.end_date < '2025-11-14')
      console.log(`\n\n11月14日より前に終了するセッション: ${oldSessions.length}件`)

      if (oldSessions.length > 0) {
        console.log('\n削除対象の回:')
        oldSessions.forEach((s: any) => {
          console.log(`  - 第${s.session_number}回 (ID: ${s.id}, 学年: 小${s.grade}, 終了日: ${s.end_date})`)
        })

        const sessionIds = oldSessions.map((s: any) => s.id)
        console.log(`\n削除対象session_ids: ${JSON.stringify(sessionIds)}`)

        // このsession_idを持つstudy_logsを確認
        const { data: logs } = await supabase
          .from('study_logs')
          .select('id, student_id, session_id, study_date')
          .in('session_id', sessionIds)

        console.log(`\nこれらのsession_idに紐づく学習ログ: ${logs?.length || 0}件`)
      }
    }

  } catch (error) {
    console.error('❌ エラー:', error)
    process.exit(1)
  }
}

main()
