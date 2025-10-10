/**
 * 週次分析機能のテストスクリプト
 *
 * テスト項目:
 * 1. バッチ処理による分析生成（月曜速報版）
 * 2. 手動による分析再生成
 * 3. バッチ処理による分析上書き（木曜確定版）
 * 4. 分析履歴の保持確認
 */

import { createClient } from "@supabase/supabase-js"
import { generateWeeklyAnalysisForBatch } from "../app/actions/weekly-analysis"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Environment variables not set:")
  console.error(`  NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl}`)
  console.error(`  SUPABASE_SERVICE_ROLE_KEY: ${supabaseServiceKey ? "[SET]" : "[NOT SET]"}`)
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function main() {
  console.log("🧪 週次分析機能テスト開始\n")

  // テスト用生徒を取得
  const { data: student } = await supabase
    .from("students")
    .select("id, full_name")
    .limit(1)
    .single()

  if (!student) {
    console.error("❌ テスト用生徒が見つかりません")
    return
  }

  console.log(`📝 テスト対象: ${student.full_name} (ID: ${student.id})\n`)

  // Week 1: 前々週（履歴保持確認用）
  const week1Start = new Date("2025-09-22")
  const week1End = new Date("2025-09-28")

  // Week 2: 前週（上書きテスト用）
  const week2Start = new Date("2025-09-29")
  const week2End = new Date("2025-10-05")

  // === Test 1: 前々週の分析生成（履歴保持確認用） ===
  console.log("=== Test 1: 前々週の分析生成 ===")
  const result1 = await generateWeeklyAnalysisForBatch(student.id, week1Start, week1End)

  if (result1.error) {
    console.error(`❌ 前々週の分析生成失敗: ${result1.error}`)
  } else {
    console.log("✅ 前々週の分析生成成功")
    console.log(`   生成日時: ${result1.analysis.generated_at}`)
    console.log(`   バッチ生成: ${result1.analysis.generated_by_batch}`)
  }

  // === Test 2: 前週の分析生成（月曜速報版） ===
  console.log("\n=== Test 2: 前週の分析生成（月曜速報版） ===")
  const result2 = await generateWeeklyAnalysisForBatch(student.id, week2Start, week2End)

  if (result2.error) {
    console.error(`❌ 月曜速報版生成失敗: ${result2.error}`)
    return
  }

  console.log("✅ 月曜速報版生成成功")
  console.log(`   生成日時: ${result2.analysis.generated_at}`)
  console.log(`   バッチ生成: ${result2.analysis.generated_by_batch}`)
  console.log(`   強み: ${result2.analysis.strengths.substring(0, 50)}...`)

  const mondayGeneratedAt = result2.analysis.generated_at

  // 3秒待機（生成日時が確実に異なるようにする）
  console.log("\n⏳ 3秒待機中...")
  await new Promise((resolve) => setTimeout(resolve, 3000))

  // === Test 3: 同じ週の分析を再生成（木曜確定版・上書き） ===
  console.log("\n=== Test 3: 同じ週の分析を再生成（木曜確定版・上書き） ===")
  const result3 = await generateWeeklyAnalysisForBatch(student.id, week2Start, week2End)

  if (result3.error) {
    console.error(`❌ 木曜確定版生成失敗: ${result3.error}`)
    return
  }

  console.log("✅ 木曜確定版生成成功（上書き）")
  console.log(`   生成日時（旧）: ${mondayGeneratedAt}`)
  console.log(`   生成日時（新）: ${result3.analysis.generated_at}`)
  console.log(`   バッチ生成: ${result3.analysis.generated_by_batch}`)
  console.log(`   強み: ${result3.analysis.strengths.substring(0, 50)}...`)

  if (result3.analysis.generated_at !== mondayGeneratedAt) {
    console.log("✅ 生成日時が更新されました（上書き成功）")
  } else {
    console.log("⚠️ 生成日時が更新されていません")
  }

  // === Test 4: データベース確認（履歴保持） ===
  console.log("\n=== Test 4: データベース確認（履歴保持） ===")
  const { data: allAnalysis } = await supabase
    .from("weekly_analysis")
    .select("week_start_date, week_end_date, generated_at, generated_by_batch")
    .eq("student_id", student.id)
    .order("week_start_date", { ascending: false })

  if (allAnalysis && allAnalysis.length >= 2) {
    console.log(`✅ 分析履歴が保持されています（${allAnalysis.length}件）`)
    allAnalysis.forEach((analysis, index) => {
      console.log(
        `   [${index + 1}] ${analysis.week_start_date} 〜 ${analysis.week_end_date} (${analysis.generated_by_batch ? "バッチ" : "手動"})`
      )
    })
  } else {
    console.log(`⚠️ 分析履歴が少ない（${allAnalysis?.length || 0}件）`)
  }

  // === Test 5: 週次分析データ集計のテスト ===
  console.log("\n=== Test 5: 週次分析データ集計のテスト ===")

  // 学習ログ件数確認
  const { data: studyLogs } = await supabase
    .from("study_logs")
    .select("id, study_date, subject_id, correct_count, total_problems")
    .eq("student_id", student.id)
    .gte("study_date", week2Start.toISOString().split("T")[0])
    .lte("study_date", week2End.toISOString().split("T")[0])

  console.log(`   学習ログ: ${studyLogs?.length || 0}件`)

  // 応援メッセージ件数確認
  const { data: messages } = await supabase
    .from("encouragement_messages")
    .select("id")
    .eq("student_id", student.id)
    .gte("created_at", week2Start.toISOString())
    .lte("created_at", week2End.toISOString())

  console.log(`   応援メッセージ: ${messages?.length || 0}件`)

  // 振り返り件数確認
  const { data: reflections } = await supabase
    .from("coaching_sessions")
    .select("id")
    .eq("student_id", student.id)
    .eq("session_type", "reflection")
    .gte("week_start_date", week2Start.toISOString().split("T")[0])
    .lte("week_start_date", week2End.toISOString().split("T")[0])
    .not("completed_at", "is", null)

  console.log(`   完了した振り返り: ${reflections?.length || 0}件`)

  // 目標件数確認
  const { data: goals } = await supabase
    .from("coaching_sessions")
    .select("id")
    .eq("student_id", student.id)
    .eq("session_type", "goal")
    .gte("week_start_date", week2Start.toISOString().split("T")[0])
    .lte("week_start_date", week2End.toISOString().split("T")[0])
    .not("completed_at", "is", null)

  console.log(`   設定した目標: ${goals?.length || 0}件`)

  console.log("\n✅ 週次分析機能テスト完了")
}

main().catch(console.error)
