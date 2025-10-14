/**
 * はなこさんの学習記録のsession_idを正しい値に修正
 *
 * 問題: はなこさん（student_id=4、小6）の学習記録が誤ったsession_idに紐付いている
 * - 10/14のデータがsession_id=1（小5第1回）やsession_id=25（小5第8回）に紐付いている
 * - 正しくは小6の第8回（session_id=27、10/13-10/19）に紐付けるべき
 */

import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function fixHanakoSessionIds() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  console.log("📋 はなこさんの学習記録のsession_id修正を開始...")

  try {
    // はなこさんの情報を確認
    const { data: student, error: studentError } = await supabase
      .from("students")
      .select("id, grade, user_id, profiles!inner(display_name)")
      .eq("id", 4)
      .single()

    if (studentError || !student) {
      console.error("❌ はなこさんの情報が見つかりません:", studentError)
      return
    }

    console.log(`✅ 生徒情報: ${(student as any).profiles.display_name}（ID: ${student.id}, 学年: ${student.grade}）`)

    // 小6の全学習回を取得
    const { data: sessions, error: sessionsError } = await supabase
      .from("study_sessions")
      .select("id, session_number, start_date, end_date")
      .eq("grade", 6)
      .order("start_date", { ascending: true })

    if (sessionsError || !sessions) {
      console.error("❌ 学習回の取得に失敗:", sessionsError)
      return
    }

    console.log(`\n📅 小6の学習回（全${sessions.length}回）:`)
    sessions.forEach(s => {
      console.log(`  第${s.session_number}回: ${s.start_date} 〜 ${s.end_date} (session_id: ${s.id})`)
    })

    // はなこさんの全学習記録を取得
    const { data: allLogs, error: logsError } = await supabase
      .from("study_logs")
      .select("id, study_date, session_id")
      .eq("student_id", 4)
      .order("study_date", { ascending: true })

    if (logsError || !allLogs) {
      console.error("❌ 学習記録の取得に失敗:", logsError)
      return
    }

    console.log(`\n📝 はなこさんの学習記録（全${allLogs.length}件）`)

    // 各学習記録の日付に対応する正しいsession_idを計算
    let fixCount = 0
    const updates: Array<{ id: number; oldSessionId: number; newSessionId: number; date: string }> = []

    for (const log of allLogs) {
      const logDate = new Date(log.study_date)

      // この日付が含まれる学習回を探す
      const correctSession = sessions.find(s => {
        const start = new Date(s.start_date)
        const end = new Date(s.end_date)
        return logDate >= start && logDate <= end
      })

      if (correctSession && log.session_id !== correctSession.id) {
        updates.push({
          id: log.id,
          oldSessionId: log.session_id,
          newSessionId: correctSession.id,
          date: log.study_date,
        })
        fixCount++
      }
    }

    if (fixCount === 0) {
      console.log("\n✅ すべての学習記録が正しいsession_idに紐付いています")
      return
    }

    console.log(`\n🔧 修正が必要な学習記録: ${fixCount}件`)

    // 修正内容を表示
    const groupedByDate = updates.reduce((acc, update) => {
      if (!acc[update.date]) {
        acc[update.date] = []
      }
      acc[update.date].push(update)
      return acc
    }, {} as Record<string, typeof updates>)

    for (const [date, dateUpdates] of Object.entries(groupedByDate)) {
      const session = sessions.find(s => s.id === dateUpdates[0].newSessionId)
      console.log(`\n  ${date} (${dateUpdates.length}件):`)
      console.log(`    誤: session_id=${dateUpdates[0].oldSessionId}`)
      console.log(`    正: session_id=${dateUpdates[0].newSessionId} (第${session?.session_number}回: ${session?.start_date}〜${session?.end_date})`)
    }

    // 確認プロンプト
    console.log(`\n⚠️  ${fixCount}件の学習記録のsession_idを修正します。`)
    console.log("続行するには Y を入力してください...")

    // 実際の修正処理
    console.log("\n🔧 修正を実行中...")

    for (const update of updates) {
      const { error: updateError } = await supabase
        .from("study_logs")
        .update({ session_id: update.newSessionId })
        .eq("id", update.id)

      if (updateError) {
        console.error(`❌ ID ${update.id} の更新に失敗:`, updateError)
      }
    }

    console.log(`\n✅ ${fixCount}件の学習記録を修正しました`)

    // 修正後の確認
    const { data: verifyLogs } = await supabase
      .from("study_logs")
      .select("study_date, session_id")
      .eq("student_id", 4)
      .order("study_date", { ascending: true })

    console.log("\n📋 修正後の学習記録:")
    const dateSessionMap = verifyLogs?.reduce((acc, log) => {
      if (!acc[log.study_date]) {
        acc[log.study_date] = new Set()
      }
      acc[log.study_date].add(log.session_id)
      return acc
    }, {} as Record<string, Set<number>>)

    for (const [date, sessionIds] of Object.entries(dateSessionMap || {})) {
      const sessionIdArray = Array.from(sessionIds)
      const session = sessions.find(s => s.id === sessionIdArray[0])
      console.log(`  ${date}: session_id=${sessionIdArray.join(", ")} (第${session?.session_number}回)`)
    }

  } catch (error) {
    console.error("❌ エラーが発生しました:", error)
  }
}

fixHanakoSessionIds()
