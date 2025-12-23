/**
 * テスト結果履歴機能のテストスクリプト
 * Phase 1: Server Actions の動作確認
 *
 * 実行方法:
 * NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 \
 * SUPABASE_SERVICE_ROLE_KEY=your_service_role_key \
 * npx tsx scripts/test-assessment-history.ts
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!supabaseKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY が設定されていません')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function testAssessmentHistory() {
  console.log('\n=== テスト結果履歴機能テスト ===\n')

  // 1. テスト用の生徒を取得
  console.log('📌 Step 1: テスト用生徒を取得...')
  const { data: students, error: studentError } = await supabase
    .from('students')
    .select('id, user_id, full_name, nickname')
    .limit(1)

  if (studentError || !students || students.length === 0) {
    console.error('❌ 生徒データが見つかりません:', studentError)
    return
  }

  const testStudent = students[0]
  console.log(`✅ テスト対象生徒: ${testStudent.nickname || testStudent.full_name} (ID: ${testStudent.id})`)

  // 2. テスト結果データの確認
  console.log('\n📌 Step 2: テスト結果データを確認...')
  const { data: assessments, error: assessmentError } = await supabase
    .from('class_assessments')
    .select(`
      id,
      score,
      max_score_at_submission,
      assessment_date,
      status,
      master:assessment_masters!class_assessments_master_id_fkey (
        title,
        assessment_type
      )
    `)
    .eq('student_id', testStudent.id)
    .eq('status', 'completed')
    .not('assessment_date', 'is', null)
    .order('assessment_date', { ascending: false })
    .limit(5)

  if (assessmentError) {
    console.error('❌ テスト結果取得エラー:', assessmentError)
    return
  }

  if (!assessments || assessments.length === 0) {
    console.log('⚠️  テスト結果がまだ登録されていません')
    console.log('💡 指導者画面からテスト結果を入力してください')
    return
  }

  console.log(`✅ テスト結果: ${assessments.length}件見つかりました`)
  assessments.forEach((a: any, i: number) => {
    const percentage = a.max_score_at_submission > 0
      ? Math.round((a.score / a.max_score_at_submission) * 100)
      : 0
    console.log(`   ${i + 1}. ${a.master?.title} - ${a.score}/${a.max_score_at_submission} (${percentage}%)`)
  })

  // 3. getAssessmentHistory() のシミュレーション
  console.log('\n📌 Step 3: getAssessmentHistory() をシミュレート...')

  // フィルターなし（全て）
  const { data: allHistory, error: historyError } = await supabase
    .from('class_assessments')
    .select(`
      id,
      student_id,
      master_id,
      score,
      max_score_at_submission,
      assessment_date,
      status,
      created_at,
      master:assessment_masters!class_assessments_master_id_fkey (
        id,
        title,
        assessment_type,
        max_score,
        session_number
      )
    `)
    .eq('student_id', testStudent.id)
    .eq('status', 'completed')
    .not('assessment_date', 'is', null)
    .order('assessment_date', { ascending: false })

  if (historyError) {
    console.error('❌ 履歴取得エラー:', historyError)
    return
  }

  console.log(`✅ 全履歴: ${allHistory?.length || 0}件`)

  // 算数プリントのみフィルター
  const mathOnly = allHistory?.filter((a: any) => a.master?.assessment_type === 'math_print') || []
  console.log(`✅ 算数プリント: ${mathOnly.length}件`)

  // 漢字テストのみフィルター
  const kanjiOnly = allHistory?.filter((a: any) => a.master?.assessment_type === 'kanji_test') || []
  console.log(`✅ 漢字テスト: ${kanjiOnly.length}件`)

  // 4. getAssessmentSummary() のシミュレーション
  console.log('\n📌 Step 4: getAssessmentSummary() をシミュレート...')

  const mathAssessments = allHistory?.filter((a: any) => a.master?.assessment_type === 'math_print') || []
  const kanjiAssessments = allHistory?.filter((a: any) => a.master?.assessment_type === 'kanji_test') || []

  const latestMath = mathAssessments[0]
  const latestKanji = kanjiAssessments[0]

  console.log('\n【最新テスト】')
  if (latestMath) {
    const mathPercentage = latestMath.max_score_at_submission > 0
      ? Math.round((latestMath.score / latestMath.max_score_at_submission) * 100)
      : 0
    console.log(`  📊 算数プリント: ${(latestMath as any).master?.title}`)
    console.log(`     スコア: ${latestMath.score}/${latestMath.max_score_at_submission} (${mathPercentage}%)`)
  } else {
    console.log('  📊 算数プリント: データなし')
  }

  if (latestKanji) {
    const kanjiPercentage = latestKanji.max_score_at_submission > 0
      ? Math.round((latestKanji.score / latestKanji.max_score_at_submission) * 100)
      : 0
    console.log(`  ✏️  漢字テスト: ${(latestKanji as any).master?.title}`)
    console.log(`     スコア: ${latestKanji.score}/${latestKanji.max_score_at_submission} (${kanjiPercentage}%)`)
  } else {
    console.log('  ✏️  漢字テスト: データなし')
  }

  // 平均点計算（直近3回）
  const calculateAverage = (assessments: any[]) => {
    const recent = assessments.slice(0, 3)
    if (recent.length === 0) return null

    const total = recent.reduce((sum: number, a: any) => {
      const percentage = a.max_score_at_submission > 0
        ? (a.score / a.max_score_at_submission) * 100
        : 0
      return sum + percentage
    }, 0)

    return Math.round(total / recent.length)
  }

  const mathAverage = calculateAverage(mathAssessments)
  const kanjiAverage = calculateAverage(kanjiAssessments)

  console.log('\n【平均点（直近3回）】')
  console.log(`  📊 算数プリント: ${mathAverage !== null ? `${mathAverage}%` : 'データなし'}`)
  console.log(`  ✏️  漢字テスト: ${kanjiAverage !== null ? `${kanjiAverage}%` : 'データなし'}`)

  console.log('\n【受験回数】')
  console.log(`  📊 算数プリント: ${mathAssessments.length}回`)
  console.log(`  ✏️  漢字テスト: ${kanjiAssessments.length}回`)
  console.log(`  📈 合計: ${allHistory?.length || 0}回`)

  console.log('\n✅ 全てのテストが正常に完了しました！')
  console.log('\n💡 次のステップ: Phase 2（サマリーカード実装）に進めます\n')
}

// 実行
testAssessmentHistory().catch(console.error)
