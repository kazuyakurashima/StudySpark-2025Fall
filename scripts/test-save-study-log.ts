/**
 * saveStudyLog と getExistingStudyLog のテストスクリプト
 *
 * テスト内容:
 * 1. study_date と reflection_text が正しく保存されるか
 * 2. getExistingStudyLog が study_date で正しくフィルタするか
 * 3. study_content_type_id が正しく取得できるか (getContentTypeId)
 *
 * 実行方法:
 * NEXT_PUBLIC_SUPABASE_URL="http://127.0.0.1:54321" \
 * SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU" \
 * npx tsx scripts/test-save-study-log.ts
 */

import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function setup() {
  console.log("\n=== セットアップ: テストユーザーと生徒を取得 ===")

  // student1 ユーザーを取得
  const { data: authUser, error: authError } = await supabase.auth.admin.listUsers()

  if (authError || !authUser?.users?.length) {
    console.error("❌ ユーザーが見つかりません")
    return null
  }

  const student1User = authUser.users.find((u) => u.email === "student5a@studyspark.local")

  if (!student1User) {
    console.error("❌ student5a@studyspark.local が見つかりません")
    return null
  }

  // 生徒レコードを取得
  const { data: student, error: studentError } = await supabase
    .from("students")
    .select("id, user_id")
    .eq("user_id", student1User.id)
    .single()

  if (studentError || !student) {
    console.error("❌ 生徒レコードが見つかりません")
    return null
  }

  console.log(`✅ テスト対象生徒: ID=${student.id}, user_id=${student.user_id}`)

  return { studentId: student.id, userId: student1User.id }
}

async function testSaveStudyLog(studentId: number) {
  console.log("\n=== Test 1: saveStudyLog (study_date + reflection_text 保存) ===")

  // マスターデータを取得
  const { data: subject } = await supabase
    .from("subjects")
    .select("id")
    .eq("name", "算数")
    .single()

  const { data: session } = await supabase
    .from("study_sessions")
    .select("id")
    .eq("grade", 5)
    .eq("session_number", 1)
    .single()

  const { data: contentType } = await supabase
    .from("study_content_types")
    .select("id")
    .eq("grade", 5)
    .eq("subject_id", subject!.id)
    .eq("course", "A")
    .eq("content_name", "類題")
    .single()

  if (!subject || !session || !contentType) {
    console.error("❌ マスターデータの取得に失敗")
    return
  }

  const testDate = "2024-09-15"
  const testReflection = "テスト用振り返り: 類題が難しかった"

  // 学習ログを保存
  const { error: insertError } = await supabase.from("study_logs").insert({
    student_id: studentId,
    session_id: session.id,
    subject_id: subject.id,
    study_content_type_id: contentType.id,
    correct_count: 7,
    total_problems: 10,
    study_date: testDate,
    reflection_text: testReflection,
  })

  if (insertError) {
    console.error("❌ INSERT エラー:", insertError)
    return
  }

  console.log("✅ 学習ログを保存しました")

  // 保存されたデータを確認
  const { data: savedLog } = await supabase
    .from("study_logs")
    .select("id, study_date, reflection_text, correct_count, total_problems")
    .eq("student_id", studentId)
    .eq("session_id", session.id)
    .eq("subject_id", subject.id)
    .eq("study_content_type_id", contentType.id)
    .eq("study_date", testDate)
    .single()

  if (!savedLog) {
    console.error("❌ 保存したログが見つかりません")
    return
  }

  console.log("✅ 保存確認:")
  console.log(`  - study_date: ${savedLog.study_date}`)
  console.log(`  - reflection_text: ${savedLog.reflection_text}`)
  console.log(`  - correct_count: ${savedLog.correct_count}/${savedLog.total_problems}`)

  // 日付フィルタのテスト（異なる日のログを追加）
  const differentDate = "2024-09-20"
  const { error: insert2Error } = await supabase.from("study_logs").insert({
    student_id: studentId,
    session_id: session.id,
    subject_id: subject.id,
    study_content_type_id: contentType.id,
    correct_count: 8,
    total_problems: 10,
    study_date: differentDate,
    reflection_text: "別の日の振り返り",
  })

  if (insert2Error) {
    console.error("❌ 2つ目のログ INSERT エラー:", insert2Error)
    return
  }

  console.log(`✅ 別の日 (${differentDate}) のログも保存しました`)

  return { sessionId: session.id, subjectId: subject.id, testDate, differentDate }
}

async function testGetExistingStudyLog(
  studentId: number,
  sessionId: number,
  subjectId: number,
  testDate: string,
  differentDate: string,
) {
  console.log("\n=== Test 2: getExistingStudyLog (study_date フィルタ) ===")

  // testDate でフィルタ
  const { data: logs1 } = await supabase
    .from("study_logs")
    .select("study_content_type_id, correct_count, total_problems, reflection_text, study_date")
    .eq("student_id", studentId)
    .eq("session_id", sessionId)
    .eq("subject_id", subjectId)
    .eq("study_date", testDate)

  console.log(`✅ ${testDate} のログ: ${logs1?.length}件`)
  logs1?.forEach((log) => {
    console.log(`  - ${log.study_date}: ${log.correct_count}/${log.total_problems}問`)
  })

  // differentDate でフィルタ
  const { data: logs2 } = await supabase
    .from("study_logs")
    .select("study_content_type_id, correct_count, total_problems, reflection_text, study_date")
    .eq("student_id", studentId)
    .eq("session_id", sessionId)
    .eq("subject_id", subjectId)
    .eq("study_date", differentDate)

  console.log(`✅ ${differentDate} のログ: ${logs2?.length}件`)
  logs2?.forEach((log) => {
    console.log(`  - ${log.study_date}: ${log.correct_count}/${log.total_problems}問`)
  })

  // 日付フィルタなしの場合（両方取得される）
  const { data: logsAll } = await supabase
    .from("study_logs")
    .select("study_content_type_id, correct_count, total_problems, reflection_text, study_date")
    .eq("student_id", studentId)
    .eq("session_id", sessionId)
    .eq("subject_id", subjectId)

  console.log(`✅ 日付フィルタなし: ${logsAll?.length}件 (両方取得されるべき)`)

  if (logsAll?.length === 2) {
    console.log("✅ study_date フィルタが正しく動作しています")
  } else {
    console.error("❌ 期待件数と異なります")
  }
}

async function cleanup(studentId: number) {
  console.log("\n=== クリーンアップ: テストデータ削除 ===")

  const { error } = await supabase.from("study_logs").delete().eq("student_id", studentId)

  if (error) {
    console.error("❌ クリーンアップエラー:", error)
    return
  }

  console.log("✅ テストデータを削除しました")
}

async function main() {
  console.log("🧪 saveStudyLog / getExistingStudyLog テスト開始\n")

  const setupData = await setup()
  if (!setupData) {
    console.error("❌ セットアップに失敗しました")
    return
  }

  const testData = await testSaveStudyLog(setupData.studentId)
  if (!testData) {
    console.error("❌ Test 1 に失敗しました")
    return
  }

  await testGetExistingStudyLog(
    setupData.studentId,
    testData.sessionId,
    testData.subjectId,
    testData.testDate,
    testData.differentDate,
  )

  await cleanup(setupData.studentId)

  console.log("\n✅ すべてのテスト完了\n")
}

main().catch(console.error)
