/**
 * AIコーチメッセージ生成テスト
 *
 * 目的: 様々なシナリオでAI生成メッセージが正しく動作することを確認
 */

import { createClient } from "@/lib/supabase/server"

async function testCoachMessageGeneration() {
  console.log("🧪 AIコーチメッセージ生成テスト開始\n")

  const supabase = await createClient()

  // テスト用生徒ID取得（デモ生徒: student1_grade6）
  const { data: student } = await supabase
    .from("students")
    .select("id, user_id, grade, course")
    .eq("user_id", (await supabase.from("profiles").select("id").eq("email", "student1_grade6@example.com").single()).data?.id || "")
    .single()

  if (!student) {
    console.error("❌ テスト用生徒が見つかりません")
    return
  }

  console.log(`✅ テスト対象生徒: ${student.id} (小${student.grade}年生, ${student.course}コース)\n`)

  // テストケース実行
  let successCount = 0
  let failureCount = 0

  // テスト1: GROWデータあり + 学習ログあり
  console.log("📝 テスト1: 通常シナリオ（GROWデータ + 学習ログあり）")
  try {
    const result = await testScenario1(student.id)
    if (result) {
      console.log(`✅ 成功: ${result.message}`)
      console.log(`   文字数: ${result.message.length}文字\n`)
      successCount++
    } else {
      console.log("❌ 失敗: メッセージ生成に失敗\n")
      failureCount++
    }
  } catch (error) {
    console.log(`❌ 失敗: ${error}\n`)
    failureCount++
  }

  // テスト2: GROWデータなし（新規生徒）
  console.log("📝 テスト2: 新規生徒シナリオ（GROWデータなし）")
  try {
    const result = await testScenario2(student.id)
    if (result) {
      console.log(`✅ 成功: ${result.message}`)
      console.log(`   文字数: ${result.message.length}文字\n`)
      successCount++
    } else {
      console.log("❌ 失敗: メッセージ生成に失敗\n")
      failureCount++
    }
  } catch (error) {
    console.log(`❌ 失敗: ${error}\n`)
    failureCount++
  }

  // テスト3: テスト直前シナリオ
  console.log("📝 テスト3: テスト直前シナリオ")
  try {
    const result = await testScenario3(student.id)
    if (result) {
      console.log(`✅ 成功: ${result.message}`)
      console.log(`   文字数: ${result.message.length}文字\n`)
      successCount++
    } else {
      console.log("❌ 失敗: メッセージ生成に失敗\n")
      failureCount++
    }
  } catch (error) {
    console.log(`❌ 失敗: ${error}\n`)
    failureCount++
  }

  // サマリー
  console.log("=" + "=".repeat(59))
  console.log("📊 テスト結果サマリー")
  console.log("=" + "=".repeat(59))
  console.log(`成功: ${successCount}/3`)
  console.log(`失敗: ${failureCount}/3`)
  console.log(`成功率: ${Math.round((successCount / 3) * 100)}%`)
  console.log("=" + "=".repeat(59))

  if (successCount === 3) {
    console.log("\n✅ 全テストケース成功！")
  } else {
    console.log(`\n⚠️  ${failureCount}件のテストケースが失敗しました`)
  }
}

/**
 * テストシナリオ1: 通常シナリオ（GROWデータ + 学習ログあり）
 */
async function testScenario1(studentId: string) {
  const { generateCoachMessage } = await import("@/lib/openai/coach-message")
  const supabase = await createClient()

  // 実際のデータを取得
  const { data: willData } = await supabase
    .from("weekly_analysis")
    .select("growth_areas, challenges")
    .eq("student_id", studentId)
    .order("week_start_date", { ascending: false })
    .limit(1)
    .single()

  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - 3)

  const { data: logs } = await supabase
    .from("study_logs")
    .select(`
      correct_count,
      total_problems,
      study_date,
      subjects (name),
      study_content_types (content_name)
    `)
    .eq("student_id", studentId)
    .gte("study_date", cutoffDate.toISOString().split("T")[0])
    .order("study_date", { ascending: false })
    .limit(10)

  const recentLogs = logs?.map(log => ({
    subject: log.subjects?.name || "算数",
    content: log.study_content_types?.content_name || "基本問題",
    correct: log.correct_count || 0,
    total: log.total_problems || 0,
    accuracy: log.total_problems > 0 ? Math.round((log.correct_count / log.total_problems) * 100) : 0,
    date: log.study_date || "",
  })) || []

  const context = {
    studentId: studentId,
    studentName: "太郎",
    grade: 6,
    course: "B",
    latestWill: willData?.growth_areas || "算数の基本問題を毎日3問ずつ解く",
    latestGoal: willData?.challenges || "算数の正答率を80%以上にする",
    recentLogs,
    studyStreak: 5,
  }

  return await generateCoachMessage(context)
}

/**
 * テストシナリオ2: 新規生徒シナリオ（GROWデータなし）
 */
async function testScenario2(studentId: string) {
  const { generateCoachMessage } = await import("@/lib/openai/coach-message")

  const context = {
    studentId: studentId,
    studentName: "花子",
    grade: 5,
    course: "A",
    recentLogs: [
      {
        subject: "算数",
        content: "類題",
        correct: 7,
        total: 10,
        accuracy: 70,
        date: "2025-10-10",
      },
    ],
    studyStreak: 1,
  }

  return await generateCoachMessage(context)
}

/**
 * テストシナリオ3: テスト直前シナリオ
 */
async function testScenario3(studentId: string) {
  const { generateCoachMessage } = await import("@/lib/openai/coach-message")

  const context = {
    studentId: studentId,
    studentName: "次郎",
    grade: 6,
    course: "C",
    latestWill: "算数と理科を重点的に復習する",
    latestGoal: "合不合判定テストで偏差値55を目指す",
    recentLogs: [
      {
        subject: "算数",
        content: "実戦演習",
        correct: 18,
        total: 20,
        accuracy: 90,
        date: "2025-10-10",
      },
      {
        subject: "理科",
        content: "実戦演習",
        correct: 15,
        total: 20,
        accuracy: 75,
        date: "2025-10-09",
      },
    ],
    upcomingTest: {
      name: "第3回合不合判定テスト",
      date: "2025-10-15",
      daysUntil: 4,
    },
    studyStreak: 12,
  }

  return await generateCoachMessage(context)
}

// 実行
testCoachMessageGeneration()
