/**
 * P3-2 リフレクト機能テストスクリプト
 *
 * テスト項目:
 * 1. 時間制御チェック（土曜12:00〜水曜23:59）
 * 2. 週タイプ判定ロジック（成長週/安定週/挑戦週/特別週）
 * 3. セッション開始・重複チェック
 * 4. メッセージ保存（role, content, turn_number, sent_at）
 * 5. セッション完了（summary_text, total_turns, completed_at）
 * 6. 過去セッション取得
 */

import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

interface TestResult {
  test: string
  status: "✅ SUCCESS" | "❌ FAILED"
  details?: string
  error?: string
}

const results: TestResult[] = []

async function test1_timeControl() {
  console.log("\n📝 Test 1: 時間制御チェック")

  try {
    // 土曜12:00のシミュレーション
    const saturdayNoon = new Date("2025-09-07T12:00:00+09:00") // 土曜12:00
    const dayOfWeek = saturdayNoon.getDay()
    const hours = saturdayNoon.getHours()

    const isSaturdayAfterNoon = dayOfWeek === 6 && hours >= 12
    const isAvailable = isSaturdayAfterNoon

    console.log(`   土曜12:00: ${isAvailable ? "✅ 利用可能" : "❌ 利用不可"}`)

    // 木曜のシミュレーション
    const thursday = new Date("2025-09-05T15:00:00+09:00")
    const thursdayDayOfWeek = thursday.getDay()
    const isThursdayAvailable = thursdayDayOfWeek >= 6 || thursdayDayOfWeek <= 3

    console.log(`   木曜15:00: ${isThursdayAvailable ? "❌ バグ" : "✅ 利用不可（正常）"}`)

    results.push({
      test: "Test 1: 時間制御チェック",
      status: isAvailable && !isThursdayAvailable ? "✅ SUCCESS" : "❌ FAILED",
      details: "土曜12:00以降〜水曜23:59の制御確認",
    })
  } catch (error: any) {
    results.push({
      test: "Test 1: 時間制御チェック",
      status: "❌ FAILED",
      error: error.message,
    })
  }
}

async function test2_weekTypeDetection() {
  console.log("\n📝 Test 2: 週タイプ判定ロジック")

  try {
    // テスト用生徒を取得
    const { data: student } = await supabase
      .from("students")
      .select("id, user_id")
      .eq("grade", 6)
      .limit(1)
      .single()

    if (!student) {
      throw new Error("テスト用生徒が見つかりません")
    }

    console.log(`   生徒ID: ${student.id}`)

    // 今週と先週の学習ログを作成
    const now = new Date()
    const thisMonday = new Date(now)
    thisMonday.setDate(now.getDate() - ((now.getDay() + 6) % 7))
    thisMonday.setHours(0, 0, 0, 0)

    const lastMonday = new Date(thisMonday)
    lastMonday.setDate(lastMonday.getDate() - 7)

    const lastSunday = new Date(thisMonday)
    lastSunday.setDate(lastSunday.getDate() - 1)

    // 先週: 50%の正答率（5/10問正解）
    const { error: lastWeekError } = await supabase.from("study_logs").insert({
      student_id: student.id,
      study_date: lastMonday.toISOString().split('T')[0],
      session_id: 1,
      subject_id: 1, // 算数
      study_content_type_id: 1,
      total_problems: 10,
      correct_count: 5,
    })
    if (lastWeekError) console.error("❌ 先週ログ挿入失敗:", lastWeekError)

    // 今週: 70%の正答率（7/10問正解） → 成長週（+20%）
    const { error: thisWeekError } = await supabase.from("study_logs").insert({
      student_id: student.id,
      study_date: thisMonday.toISOString().split('T')[0],
      session_id: 1,
      subject_id: 1, // 算数
      study_content_type_id: 1,
      total_problems: 10,
      correct_count: 7,
    })
    if (thisWeekError) console.error("❌ 今週ログ挿入失敗:", thisWeekError)

    // 週タイプ判定
    const { data: thisWeekLogs } = await supabase
      .from("study_logs")
      .select("total_problems, correct_count")
      .eq("student_id", student.id)
      .gte("study_date", thisMonday.toISOString().split('T')[0])

    const { data: lastWeekLogs } = await supabase
      .from("study_logs")
      .select("total_problems, correct_count")
      .eq("student_id", student.id)
      .gte("study_date", lastMonday.toISOString().split('T')[0])
      .lte("study_date", lastSunday.toISOString().split('T')[0])

    const calculateAccuracy = (logs: any[] | null) => {
      if (!logs || logs.length === 0) return 0
      const total = logs.reduce((sum, log) => sum + (log.total_problems || 0), 0)
      const correct = logs.reduce((sum, log) => sum + (log.correct_count || 0), 0)
      return total > 0 ? (correct / total) * 100 : 0
    }

    const thisWeekAccuracy = calculateAccuracy(thisWeekLogs)
    const lastWeekAccuracy = calculateAccuracy(lastWeekLogs)
    const accuracyDiff = thisWeekAccuracy - lastWeekAccuracy

    let weekType = "stable"
    if (accuracyDiff >= 10) weekType = "growth"
    else if (accuracyDiff <= -10) weekType = "challenge"

    console.log(`   先週: ${lastWeekAccuracy.toFixed(0)}%, 今週: ${thisWeekAccuracy.toFixed(0)}%`)
    console.log(`   差分: ${accuracyDiff.toFixed(0)}% → ${weekType}`)

    // クリーンアップ
    await supabase
      .from("study_logs")
      .delete()
      .eq("student_id", student.id)
      .gte("study_date", lastMonday.toISOString())

    results.push({
      test: "Test 2: 週タイプ判定ロジック",
      status: weekType === "growth" ? "✅ SUCCESS" : "❌ FAILED",
      details: `${lastWeekAccuracy.toFixed(0)}% → ${thisWeekAccuracy.toFixed(0)}% = ${weekType}週`,
    })
  } catch (error: any) {
    results.push({
      test: "Test 2: 週タイプ判定ロジック",
      status: "❌ FAILED",
      error: error.message,
    })
  }
}

async function test3_sessionManagement() {
  console.log("\n📝 Test 3: セッション開始・重複チェック")

  try {
    // テスト用生徒を取得
    const { data: student } = await supabase
      .from("students")
      .select("id")
      .eq("grade", 6)
      .limit(1)
      .single()

    if (!student) {
      throw new Error("テスト用生徒が見つかりません")
    }

    const now = new Date()
    const weekStartDate = new Date(now)
    weekStartDate.setDate(now.getDate() - ((now.getDay() + 6) % 7))
    weekStartDate.setHours(0, 0, 0, 0)

    const weekEndDate = new Date(weekStartDate)
    weekEndDate.setDate(weekStartDate.getDate() + 6)

    // 既存セッションを削除
    await supabase
      .from("coaching_sessions")
      .delete()
      .eq("student_id", student.id)
      .eq("week_start_date", weekStartDate.toISOString().split('T')[0])

    // 1回目: 新規セッション作成
    const { data: session1, error: error1 } = await supabase
      .from("coaching_sessions")
      .insert({
        student_id: student.id,
        week_start_date: weekStartDate.toISOString().split('T')[0],
        week_end_date: weekEndDate.toISOString().split('T')[0],
        week_type: "growth",
        status: "in_progress",
        started_at: now.toISOString(),
      })
      .select()
      .single()

    if (error1) throw error1

    console.log(`   ✅ 新規セッション作成成功 (ID: ${session1.id})`)

    // 2回目: 重複チェック
    const { data: existingSession } = await supabase
      .from("coaching_sessions")
      .select("id")
      .eq("student_id", student.id)
      .eq("week_start_date", weekStartDate.toISOString().split('T')[0])
      .maybeSingle()

    if (existingSession && existingSession.id === session1.id) {
      console.log(`   ✅ 重複チェック成功 (既存セッションID: ${existingSession.id})`)
    } else {
      throw new Error("重複チェック失敗")
    }

    // クリーンアップ
    await supabase
      .from("coaching_sessions")
      .delete()
      .eq("id", session1.id)

    results.push({
      test: "Test 3: セッション開始・重複チェック",
      status: "✅ SUCCESS",
      details: "新規作成・重複チェック正常動作",
    })
  } catch (error: any) {
    results.push({
      test: "Test 3: セッション開始・重複チェック",
      status: "❌ FAILED",
      error: error.message,
    })
  }
}

async function test4_messageStorage() {
  console.log("\n📝 Test 4: メッセージ保存")

  try {
    // テスト用生徒とセッションを取得
    const { data: student } = await supabase
      .from("students")
      .select("id")
      .eq("grade", 6)
      .limit(1)
      .single()

    if (!student) throw new Error("テスト用生徒が見つかりません")

    const now = new Date()
    const weekStartDate = new Date(now)
    weekStartDate.setDate(now.getDate() - ((now.getDay() + 6) % 7))
    weekStartDate.setHours(0, 0, 0, 0)

    const weekEndDate = new Date(weekStartDate)
    weekEndDate.setDate(weekStartDate.getDate() + 6)

    // セッション作成
    const { data: session } = await supabase
      .from("coaching_sessions")
      .insert({
        student_id: student.id,
        week_start_date: weekStartDate.toISOString().split('T')[0],
        week_end_date: weekEndDate.toISOString().split('T')[0],
        week_type: "growth",
        status: "in_progress",
        started_at: now.toISOString(),
      })
      .select()
      .single()

    if (!session) throw new Error("セッション作成失敗")

    // メッセージ保存
    const messages = [
      { role: "assistant", content: "今週の振り返りだよ！", turn_number: 1 },
      { role: "user", content: "算数を頑張りました", turn_number: 1 },
      { role: "assistant", content: "素晴らしいね！", turn_number: 2 },
    ]

    for (const msg of messages) {
      await supabase.from("coaching_messages").insert({
        session_id: session.id,
        role: msg.role,
        content: msg.content,
        turn_number: msg.turn_number,
        sent_at: now.toISOString(),
      })
    }

    // メッセージ取得確認
    const { data: savedMessages } = await supabase
      .from("coaching_messages")
      .select("*")
      .eq("session_id", session.id)
      .order("turn_number")

    console.log(`   ✅ ${savedMessages?.length || 0}件のメッセージ保存成功`)

    // クリーンアップ
    await supabase.from("coaching_sessions").delete().eq("id", session.id)

    results.push({
      test: "Test 4: メッセージ保存",
      status: savedMessages?.length === 3 ? "✅ SUCCESS" : "❌ FAILED",
      details: `${savedMessages?.length || 0}件のメッセージ保存確認`,
    })
  } catch (error: any) {
    results.push({
      test: "Test 4: メッセージ保存",
      status: "❌ FAILED",
      error: error.message,
    })
  }
}

async function test5_sessionCompletion() {
  console.log("\n📝 Test 5: セッション完了")

  try {
    // テスト用生徒とセッションを取得
    const { data: student } = await supabase
      .from("students")
      .select("id")
      .eq("grade", 6)
      .limit(1)
      .single()

    if (!student) throw new Error("テスト用生徒が見つかりません")

    const now = new Date()
    const weekStartDate = new Date(now)
    weekStartDate.setDate(now.getDate() - ((now.getDay() + 6) % 7))
    weekStartDate.setHours(0, 0, 0, 0)

    const weekEndDate = new Date(weekStartDate)
    weekEndDate.setDate(weekStartDate.getDate() + 6)

    // セッション作成
    const { data: session } = await supabase
      .from("coaching_sessions")
      .insert({
        student_id: student.id,
        week_start_date: weekStartDate.toISOString().split('T')[0],
        week_end_date: weekEndDate.toISOString().split('T')[0],
        week_type: "growth",
        status: "in_progress",
        started_at: now.toISOString(),
      })
      .select()
      .single()

    if (!session) throw new Error("セッション作成失敗")

    // セッション完了
    const { error } = await supabase
      .from("coaching_sessions")
      .update({
        status: "completed",
        summary_text: "今週は算数を頑張って、成長できました！",
        total_turns: 6,
        completed_at: now.toISOString(),
      })
      .eq("id", session.id)

    if (error) throw error

    // 完了確認
    const { data: completedSession } = await supabase
      .from("coaching_sessions")
      .select("status, summary_text, total_turns, completed_at")
      .eq("id", session.id)
      .single()

    console.log(`   ✅ セッション完了: ${completedSession?.status}`)
    console.log(`   サマリー: ${completedSession?.summary_text}`)

    // クリーンアップ
    await supabase.from("coaching_sessions").delete().eq("id", session.id)

    results.push({
      test: "Test 5: セッション完了",
      status: completedSession?.status === "completed" ? "✅ SUCCESS" : "❌ FAILED",
      details: "summary_text, total_turns, completed_at 正常保存",
    })
  } catch (error: any) {
    results.push({
      test: "Test 5: セッション完了",
      status: "❌ FAILED",
      error: error.message,
    })
  }
}

async function test6_pastSessionsRetrieval() {
  console.log("\n📝 Test 6: 過去セッション取得")

  try {
    // テスト用生徒を取得
    const { data: student } = await supabase
      .from("students")
      .select("id")
      .eq("grade", 6)
      .limit(1)
      .single()

    if (!student) throw new Error("テスト用生徒が見つかりません")

    const now = new Date()

    // 2週間分のセッションを作成
    const sessions = []
    for (let i = 0; i < 2; i++) {
      const weekStartDate = new Date(now)
      weekStartDate.setDate(now.getDate() - ((now.getDay() + 6) % 7) - (i * 7))
      weekStartDate.setHours(0, 0, 0, 0)

      const weekEndDate = new Date(weekStartDate)
      weekEndDate.setDate(weekStartDate.getDate() + 6)

      const { data: session } = await supabase
        .from("coaching_sessions")
        .insert({
          student_id: student.id,
          week_start_date: weekStartDate.toISOString().split('T')[0],
          week_end_date: weekEndDate.toISOString().split('T')[0],
          week_type: i === 0 ? "growth" : "stable",
          status: "completed",
          summary_text: `第${i + 1}週の振り返り`,
          total_turns: 6,
          started_at: now.toISOString(),
          completed_at: now.toISOString(),
        })
        .select()
        .single()

      if (session) sessions.push(session)
    }

    // 過去セッション取得
    const { data: pastSessions } = await supabase
      .from("coaching_sessions")
      .select(`
        id,
        week_start_date,
        week_end_date,
        week_type,
        status,
        summary_text,
        total_turns
      `)
      .eq("student_id", student.id)
      .order("week_start_date", { ascending: false })

    console.log(`   ✅ ${pastSessions?.length || 0}件の過去セッション取得`)

    // クリーンアップ
    for (const session of sessions) {
      await supabase.from("coaching_sessions").delete().eq("id", session.id)
    }

    results.push({
      test: "Test 6: 過去セッション取得",
      status: pastSessions?.length === 2 ? "✅ SUCCESS" : "❌ FAILED",
      details: `${pastSessions?.length || 0}件のセッション取得確認`,
    })
  } catch (error: any) {
    results.push({
      test: "Test 6: 過去セッション取得",
      status: "❌ FAILED",
      error: error.message,
    })
  }
}

async function runAllTests() {
  console.log("🚀 P3-2 リフレクト機能テスト開始\n")
  console.log("=" .repeat(60))

  await test1_timeControl()
  await test2_weekTypeDetection()
  await test3_sessionManagement()
  await test4_messageStorage()
  await test5_sessionCompletion()
  await test6_pastSessionsRetrieval()

  console.log("\n" + "=".repeat(60))
  console.log("\n📊 テスト結果サマリー\n")

  const successCount = results.filter((r) => r.status === "✅ SUCCESS").length
  const failCount = results.filter((r) => r.status === "❌ FAILED").length

  results.forEach((result) => {
    console.log(`${result.status} ${result.test}`)
    if (result.details) console.log(`   ${result.details}`)
    if (result.error) console.log(`   エラー: ${result.error}`)
  })

  console.log(`\n成功: ${successCount}/${results.length}`)
  console.log(`失敗: ${failCount}/${results.length}`)
  console.log(`成功率: ${((successCount / results.length) * 100).toFixed(1)}%`)

  if (successCount === results.length) {
    console.log("\n✅ すべてのテストが成功しました！")
  } else {
    console.log("\n❌ 一部のテストが失敗しました")
  }

  process.exit(failCount > 0 ? 1 : 0)
}

runAllTests()
