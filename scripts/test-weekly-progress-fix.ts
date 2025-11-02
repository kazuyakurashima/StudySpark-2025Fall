import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

async function testWeeklyProgress() {
  const studentId = 2 // 星野光

  const { data: student } = await supabase
    .from('students')
    .select('grade')
    .eq('id', studentId)
    .single()

  const now = new Date()
  const { data: currentSession } = await supabase
    .from('study_sessions')
    .select('id, session_number')
    .eq('grade', student!.grade)
    .lte('start_date', now.toISOString())
    .gte('end_date', now.toISOString())
    .single()

  const { data: logs } = await supabase
    .from('study_logs')
    .select(
      'correct_count, total_problems, subject_id, study_content_type_id, logged_at, subjects (id, name), study_content_types (id, content_name)'
    )
    .eq('student_id', studentId)
    .eq('session_id', currentSession!.id)
    .order('logged_at', { ascending: false })

  console.log('全ログ数:', logs?.length)

  // 最新のログのみを保持
  const latestLogsMap = new Map()
  logs?.forEach((log: any) => {
    const contentType = Array.isArray(log.study_content_types)
      ? log.study_content_types[0]
      : log.study_content_types
    const contentName = contentType?.content_name || 'その他'
    const key = `${log.subject_id}_${contentName}`
    if (!latestLogsMap.has(key)) {
      latestLogsMap.set(key, log)
    }
  })

  console.log('最新ログ数:', latestLogsMap.size)

  // 科目別に集計
  const subjectMap: any = {}
  latestLogsMap.forEach((log: any) => {
    const subject = Array.isArray(log.subjects)
      ? log.subjects[0]?.name
      : log.subjects?.name
    const subjectName = subject || '不明'
    if (!subjectMap[subjectName]) {
      subjectMap[subjectName] = { weekCorrect: 0, weekTotal: 0 }
    }
    subjectMap[subjectName].weekCorrect += log.correct_count || 0
    subjectMap[subjectName].weekTotal += log.total_problems || 0
  })

  // 社会のみ出力
  const socialData = subjectMap['社会']
  if (socialData) {
    const accuracy = Math.round(
      (socialData.weekCorrect / socialData.weekTotal) * 100
    )
    const targetCorrect = Math.ceil(0.8 * socialData.weekTotal)
    const remaining = Math.max(0, targetCorrect - socialData.weekCorrect)

    console.log('\n【修正後】社会の週次進捗:')
    console.log('  正解数:', socialData.weekCorrect)
    console.log('  総問題数:', socialData.weekTotal)
    console.log('  正答率:', accuracy + '%')
    console.log('  目標正解数 (80%):', targetCorrect)
    console.log('  残り:', remaining + '問')
  }
}

testWeeklyProgress().catch(console.error)
