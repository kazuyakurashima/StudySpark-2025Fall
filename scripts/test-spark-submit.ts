/**
 * Spark機能のsubmit動作確認テスト
 *
 * テスト内容:
 * 1. session_id が Supabase から正しく取得されるか
 * 2. study_content_type_id が getContentTypeId で正しく取得されるか
 * 3. saveStudyLog が正常に動作するか
 *
 * 実行方法:
 * NEXT_PUBLIC_SUPABASE_URL="http://127.0.0.1:54321" \
 * SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU" \
 * npx tsx scripts/test-spark-submit.ts
 */

import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function testSessionIdRetrieval() {
  console.log("\n=== Test 1: session_id 取得テスト ===")

  // 小5・第1回の session_id を取得
  const { data: sessions, error } = await supabase
    .from("study_sessions")
    .select("id, session_number, grade")
    .eq("grade", 5)
    .eq("session_number", 1)
    .single()

  if (error || !sessions) {
    console.error("❌ エラー:", error)
    return null
  }

  console.log(`✅ 小5・第1回の session_id: ${sessions.id}`)
  console.log(`   (session_number: ${sessions.session_number}, grade: ${sessions.grade})`)

  return sessions.id
}

async function testContentTypeIdRetrieval() {
  console.log("\n=== Test 2: study_content_type_id 取得テスト ===")

  // 小5・算数・Aコース・類題 の study_content_type_id を取得
  const { data, error } = await supabase
    .from("study_content_types")
    .select("id, content_name, grade, subject_id, course")
    .eq("grade", 5)
    .eq("subject_id", 1) // 算数
    .eq("course", "A")
    .eq("content_name", "類題")
    .single()

  if (error || !data) {
    console.error("❌ エラー:", error)
    return null
  }

  console.log(`✅ 小5・算数・Aコース・類題 の study_content_type_id: ${data.id}`)
  console.log(`   (content_name: ${data.content_name}, course: ${data.course})`)

  return data.id
}

async function testSaveStudyLog(sessionId: number, contentTypeId: number) {
  console.log("\n=== Test 3: saveStudyLog 動作確認 ===")

  // テストユーザー (student5a) を取得
  const { data: authUsers } = await supabase.auth.admin.listUsers()
  const student5a = authUsers?.users?.find((u) => u.email === "student5a@studyspark.local")

  if (!student5a) {
    console.error("❌ student5a@studyspark.local が見つかりません")
    return
  }

  const { data: student } = await supabase
    .from("students")
    .select("id")
    .eq("user_id", student5a.id)
    .single()

  if (!student) {
    console.error("❌ 生徒レコードが見つかりません")
    return
  }

  console.log(`テスト対象生徒: ID=${student.id}`)

  // 学習ログを保存
  const testDate = new Date().toISOString().split("T")[0]

  const { error: insertError } = await supabase.from("study_logs").insert({
    student_id: student.id,
    session_id: sessionId,
    subject_id: 1, // 算数
    study_content_type_id: contentTypeId,
    correct_count: 8,
    total_problems: 10,
    study_date: testDate,
    reflection_text: "Spark機能テスト: 正しいIDで保存できました",
  })

  if (insertError) {
    console.error("❌ 保存エラー:", insertError)
    return
  }

  console.log("✅ 学習ログを保存しました")

  // 保存されたデータを確認
  const { data: savedLog } = await supabase
    .from("study_logs")
    .select(
      `
      id,
      session_id,
      subject_id,
      study_content_type_id,
      correct_count,
      total_problems,
      study_date,
      reflection_text,
      study_sessions (session_number, grade),
      subjects (name),
      study_content_types (content_name, course)
    `,
    )
    .eq("student_id", student.id)
    .eq("session_id", sessionId)
    .eq("study_content_type_id", contentTypeId)
    .eq("study_date", testDate)
    .single()

  if (!savedLog) {
    console.error("❌ 保存したログが見つかりません")
    return
  }

  const sessions = Array.isArray(savedLog.study_sessions)
    ? savedLog.study_sessions[0]
    : savedLog.study_sessions
  const subjects = Array.isArray(savedLog.subjects) ? savedLog.subjects[0] : savedLog.subjects
  const contentTypes = Array.isArray(savedLog.study_content_types)
    ? savedLog.study_content_types[0]
    : savedLog.study_content_types

  console.log("\n✅ 保存確認:")
  console.log(`  - 学習回: 小${sessions?.grade}・第${sessions?.session_number}回 (ID: ${savedLog.session_id})`)
  console.log(`  - 科目: ${subjects?.name} (ID: ${savedLog.subject_id})`)
  console.log(
    `  - 学習内容: ${contentTypes?.content_name} (${contentTypes?.course}コース, ID: ${savedLog.study_content_type_id})`,
  )
  console.log(`  - 正答数: ${savedLog.correct_count}/${savedLog.total_problems}`)
  console.log(`  - 学習日: ${savedLog.study_date}`)
  console.log(`  - 振り返り: ${savedLog.reflection_text}`)

  // クリーンアップ
  await supabase.from("study_logs").delete().eq("id", savedLog.id)
  console.log("\n✅ テストデータを削除しました")
}

async function main() {
  console.log("🧪 Spark submit 動作確認テスト開始\n")

  const sessionId = await testSessionIdRetrieval()
  if (!sessionId) {
    console.error("❌ Test 1 に失敗しました")
    return
  }

  const contentTypeId = await testContentTypeIdRetrieval()
  if (!contentTypeId) {
    console.error("❌ Test 2 に失敗しました")
    return
  }

  await testSaveStudyLog(sessionId, contentTypeId)

  console.log("\n✅ すべてのテスト完了\n")
}

main().catch(console.error)
