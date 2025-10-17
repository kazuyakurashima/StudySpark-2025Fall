/**
 * 学習回スケジュールを要件定義書に合わせて修正
 *
 * 小学6年生の学習回スケジュールが要件定義と異なっていたため修正
 */

import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing Supabase environment variables")
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// 要件定義書に基づく小学6年生の学習回スケジュール
const grade6Sessions = [
  { session_number: 1, start_date: "2025-08-25", end_date: "2025-09-07" },
  { session_number: 2, start_date: "2025-09-08", end_date: "2025-09-14" },
  { session_number: 3, start_date: "2025-09-15", end_date: "2025-09-21" },
  { session_number: 4, start_date: "2025-09-22", end_date: "2025-10-05" },
  { session_number: 5, start_date: "2025-10-06", end_date: "2025-10-12" },
  { session_number: 6, start_date: "2025-10-13", end_date: "2025-10-19" },
  { session_number: 7, start_date: "2025-10-20", end_date: "2025-10-26" },
  { session_number: 8, start_date: "2025-10-27", end_date: "2025-11-02" },
  { session_number: 9, start_date: "2025-11-03", end_date: "2025-11-16" },
  { session_number: 10, start_date: "2025-11-17", end_date: "2025-11-23" },
  { session_number: 11, start_date: "2025-11-24", end_date: "2025-12-07" },
  { session_number: 12, start_date: "2025-12-08", end_date: "2025-12-14" },
  { session_number: 13, start_date: "2025-12-15", end_date: "2025-12-21" },
  { session_number: 14, start_date: "2025-12-22", end_date: "2026-01-11" },
  { session_number: 15, start_date: "2026-01-12", end_date: "2026-01-18" },
]

// 要件定義書に基づく小学5年生の学習回スケジュール
const grade5Sessions = [
  { session_number: 1, start_date: "2025-09-01", end_date: "2025-09-07" },
  { session_number: 2, start_date: "2025-09-08", end_date: "2025-09-14" },
  { session_number: 3, start_date: "2025-09-15", end_date: "2025-09-21" },
  { session_number: 4, start_date: "2025-09-22", end_date: "2025-09-28" },
  { session_number: 5, start_date: "2025-09-29", end_date: "2025-10-05" },
  { session_number: 6, start_date: "2025-10-06", end_date: "2025-10-12" },
  { session_number: 7, start_date: "2025-10-13", end_date: "2025-10-19" },
  { session_number: 8, start_date: "2025-10-20", end_date: "2025-10-26" },
  { session_number: 9, start_date: "2025-10-27", end_date: "2025-11-02" },
  { session_number: 10, start_date: "2025-11-03", end_date: "2025-11-09" },
  { session_number: 11, start_date: "2025-11-10", end_date: "2025-11-16" },
  { session_number: 12, start_date: "2025-11-17", end_date: "2025-11-23" },
  { session_number: 13, start_date: "2025-11-24", end_date: "2025-11-30" },
  { session_number: 14, start_date: "2025-12-01", end_date: "2025-12-07" },
  { session_number: 15, start_date: "2025-12-08", end_date: "2025-12-14" },
  { session_number: 16, start_date: "2025-12-15", end_date: "2025-12-21" },
  { session_number: 17, start_date: "2025-12-22", end_date: "2026-01-11" },
  { session_number: 18, start_date: "2026-01-12", end_date: "2026-01-18" },
  { session_number: 19, start_date: "2026-01-19", end_date: "2026-01-25" },
]

async function fixStudySessions() {
  console.log("=== 学習回スケジュール修正開始 ===\n")

  // 既存のstudy_sessionsを削除
  console.log("1. 既存のstudy_sessionsを削除...")
  const { error: deleteError } = await supabase.from("study_sessions").delete().neq("id", 0)

  if (deleteError) {
    console.error("削除エラー:", deleteError)
    throw deleteError
  }
  console.log("✓ 削除完了\n")

  // 小学6年生のセッションを挿入
  console.log("2. 小学6年生の学習回を挿入...")
  for (const session of grade6Sessions) {
    const { error } = await supabase.from("study_sessions").insert({
      grade: 6,
      session_number: session.session_number,
      start_date: session.start_date,
      end_date: session.end_date,
    })

    if (error) {
      console.error(`第${session.session_number}回の挿入エラー:`, error)
      throw error
    }
    console.log(`  ✓ 第${session.session_number}回: ${session.start_date} 〜 ${session.end_date}`)
  }
  console.log("✓ 小学6年生完了\n")

  // 小学5年生のセッションを挿入
  console.log("3. 小学5年生の学習回を挿入...")
  for (const session of grade5Sessions) {
    const { error } = await supabase.from("study_sessions").insert({
      grade: 5,
      session_number: session.session_number,
      start_date: session.start_date,
      end_date: session.end_date,
    })

    if (error) {
      console.error(`第${session.session_number}回の挿入エラー:`, error)
      throw error
    }
    console.log(`  ✓ 第${session.session_number}回: ${session.start_date} 〜 ${session.end_date}`)
  }
  console.log("✓ 小学5年生完了\n")

  // 検証: 今日（2025-10-15）の学習回を確認
  console.log("4. 検証: 2025-10-15の学習回を確認...")
  const today = "2025-10-15"

  const { data: grade6Session, error: grade6Error } = await supabase
    .from("study_sessions")
    .select("*")
    .eq("grade", 6)
    .lte("start_date", today)
    .gte("end_date", today)
    .single()

  if (grade6Error) {
    console.error("小学6年生の検証エラー:", grade6Error)
  } else {
    console.log("  小学6年生:", grade6Session)
  }

  const { data: grade5Session, error: grade5Error } = await supabase
    .from("study_sessions")
    .select("*")
    .eq("grade", 5)
    .lte("start_date", today)
    .gte("end_date", today)
    .single()

  if (grade5Error) {
    console.error("小学5年生の検証エラー:", grade5Error)
  } else {
    console.log("  小学5年生:", grade5Session)
  }

  console.log("\n=== 修正完了 ===")
}

fixStudySessions()
  .then(() => {
    console.log("✓ 正常終了")
    process.exit(0)
  })
  .catch((error) => {
    console.error("✗ エラー発生:", error)
    process.exit(1)
  })
