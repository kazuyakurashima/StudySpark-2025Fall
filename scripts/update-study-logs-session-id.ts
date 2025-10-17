/**
 * study_logsのsession_idを新しいstudy_sessionsに合わせて更新
 */

import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing Supabase environment variables")
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function updateStudyLogsSessions() {
  console.log("=== study_logsのsession_id更新開始 ===\n")

  // 全学習ログを取得
  const { data: logs, error: logsError } = await supabase
    .from("study_logs")
    .select("id, student_id, study_date, session_id")
    .order("id")

  if (logsError) {
    console.error("ログ取得エラー:", logsError)
    throw logsError
  }

  console.log(`取得したログ数: ${logs?.length || 0}\n`)

  if (!logs || logs.length === 0) {
    console.log("更新対象のログがありません")
    return
  }

  // 各学年のstudy_sessionsを取得
  const { data: sessions, error: sessionsError } = await supabase
    .from("study_sessions")
    .select("id, grade, session_number, start_date, end_date")
    .order("grade, session_number")

  if (sessionsError) {
    console.error("セッション取得エラー:", sessionsError)
    throw sessionsError
  }

  console.log(`セッション数: ${sessions?.length || 0}\n`)

  // 各ログのstudy_dateから適切なsession_idを見つけて更新
  let updateCount = 0
  let skipCount = 0

  for (const log of logs) {
    // 生徒の学年を取得
    const { data: student } = await supabase
      .from("students")
      .select("grade")
      .eq("id", log.student_id)
      .single()

    if (!student) {
      console.log(`  ✗ ログID${log.id}: 生徒情報が見つかりません (student_id: ${log.student_id})`)
      skipCount++
      continue
    }

    // study_dateに該当するsessionを探す
    const matchingSession = sessions?.find(
      (s) =>
        s.grade === student.grade && log.study_date >= s.start_date && log.study_date <= s.end_date
    )

    if (!matchingSession) {
      console.log(
        `  ✗ ログID${log.id}: 該当するセッションが見つかりません (grade: ${student.grade}, date: ${log.study_date})`
      )
      skipCount++
      continue
    }

    // session_idが異なる場合のみ更新
    if (log.session_id !== matchingSession.id) {
      const { error: updateError } = await supabase
        .from("study_logs")
        .update({ session_id: matchingSession.id })
        .eq("id", log.id)

      if (updateError) {
        console.error(`  ✗ ログID${log.id}の更新エラー:`, updateError)
        skipCount++
      } else {
        console.log(
          `  ✓ ログID${log.id}: session_id ${log.session_id} → ${matchingSession.id} (第${matchingSession.session_number}回, ${matchingSession.start_date}〜${matchingSession.end_date})`
        )
        updateCount++
      }
    } else {
      skipCount++
    }
  }

  console.log(`\n=== 更新完了 ===`)
  console.log(`更新: ${updateCount}件`)
  console.log(`スキップ: ${skipCount}件`)
}

updateStudyLogsSessions()
  .then(() => {
    console.log("\n✓ 正常終了")
    process.exit(0)
  })
  .catch((error) => {
    console.error("\n✗ エラー発生:", error)
    process.exit(1)
  })
