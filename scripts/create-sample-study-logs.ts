/**
 * サンプル学習記録を作成するスクリプト
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function main() {
  console.log('🚀 サンプル学習記録を作成します...\n')

  try {
    // 生徒情報を取得
    const { data: students, error: studentError } = await supabase
      .from('students')
      .select('id, full_name, grade')
      .order('id')
      .limit(2)

    if (studentError || !students || students.length === 0) {
      throw new Error('生徒情報の取得に失敗しました')
    }

    console.log(`✅ 生徒情報を取得しました (${students.length}名)\n`)

    // 科目と学習回を取得
    const { data: subjects } = await supabase.from('subjects').select('id, name').order('id')

    const { data: sessions } = await supabase
      .from('study_sessions')
      .select('id, session_number')
      .eq('grade', students[0].grade)
      .order('session_number')
      .limit(3)

    if (!subjects || !sessions) {
      throw new Error('マスターデータの取得に失敗しました')
    }

    console.log(`✅ 科目: ${subjects.length}件, 学習回: ${sessions.length}件\n`)

    // 各生徒に対して学習記録を作成
    for (const student of students) {
      console.log(`\n📚 ${student.full_name} の学習記録を作成中...`)

      // 今日から過去7日分の学習記録を作成
      for (let i = 0; i < 7; i++) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        const studyDate = date.toISOString().split('T')[0]

        // 各日に2-3科目の学習記録を作成
        const subjectsToday = subjects.slice(0, Math.floor(Math.random() * 2) + 2)

        for (const subject of subjectsToday) {
          const session = sessions[i % sessions.length]

          // 生徒のコースに応じた学習内容タイプを取得
          const { data: studentCourseData } = await supabase
            .from('students')
            .select('course')
            .eq('id', student.id)
            .single()

          const studentCourse = studentCourseData?.course || 'A'

          // 学習内容タイプを取得
          const { data: contentTypes } = await supabase
            .from('study_content_types')
            .select('id, content_name')
            .eq('grade', student.grade)
            .eq('subject_id', subject.id)
            .eq('course', studentCourse)
            .limit(1)

          if (!contentTypes || contentTypes.length === 0) {
            console.log(`  ⚠️  学習内容タイプが見つかりません (${subject.name}, コース${studentCourse})`)
            continue
          }

          const totalProblems = Math.floor(Math.random() * 20) + 10
          const correctCount = Math.floor(totalProblems * (0.6 + Math.random() * 0.3))
          const accuracy = Math.round((correctCount / totalProblems) * 100)

          // 学習記録を作成
          const { data: studyLog, error: logError } = await supabase
            .from('study_logs')
            .insert({
              student_id: student.id,
              study_date: studyDate,
              session_id: session.id,
              subject_id: subject.id,
              study_content_type_id: contentTypes[0].id,
              total_problems: totalProblems,
              correct_count: correctCount,
              reflection_text: `${subject.name}の学習を頑張りました。正答率${accuracy}%でした。`,
            })
            .select()
            .single()

          if (logError) {
            console.log(`  ❌ エラー: ${logError.message}`)
          } else {
            console.log(
              `  ✅ ${studyDate} - ${subject.name} (${contentTypes[0].content_name}): ${correctCount}/${totalProblems}問正解 (${accuracy}%)`
            )
          }
        }
      }
    }

    console.log('\n🎉 サンプル学習記録の作成が完了しました！')
  } catch (error) {
    console.error('❌ エラーが発生しました:', error)
    process.exit(1)
  }
}

main()
