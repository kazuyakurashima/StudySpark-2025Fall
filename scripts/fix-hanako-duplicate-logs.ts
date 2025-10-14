/**
 * はなこさんの重複学習記録を統合
 *
 * 問題: 10/14に同じ科目・内容で複数の学習記録が存在し、session_idが異なる
 * - 算数（study_content_type_id=34）: id=18とid=36
 * - 国語（study_content_type_id=46）: id=19とid=37
 *
 * 解決策: 同じ科目・内容の記録を統合し、正しいsession_idで1つにまとめる
 */

import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function fixHanakoDuplicateLogs() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  console.log("📋 はなこさんの重複学習記録を統合...")

  try {
    // 10/14の重複レコードを確認
    const { data: duplicates } = await supabase
      .from("study_logs")
      .select("id, session_id, subject_id, study_content_type_id, correct_count, total_problems")
      .eq("student_id", 4)
      .eq("study_date", "2025-10-14")
      .order("subject_id")
      .order("study_content_type_id")
      .order("id")

    console.log("\n📝 10/14の学習記録:")
    duplicates?.forEach(log => {
      console.log(`  ID ${log.id}: 科目${log.subject_id}, 内容${log.study_content_type_id}, session=${log.session_id}, ${log.correct_count}/${log.total_problems}`)
    })

    // 重複を検出してグループ化
    const groups: Record<string, typeof duplicates> = {}
    duplicates?.forEach(log => {
      const key = `${log.subject_id}_${log.study_content_type_id}`
      if (!groups[key]) {
        groups[key] = []
      }
      groups[key].push(log)
    })

    console.log("\n🔍 重複グループ:")
    for (const [key, logs] of Object.entries(groups)) {
      if (logs.length > 1) {
        console.log(`  科目${logs[0].subject_id}/内容${logs[0].study_content_type_id}: ${logs.length}件の重複`)
        logs.forEach(log => {
          console.log(`    - ID ${log.id}: ${log.correct_count}/${log.total_problems} (session=${log.session_id})`)
        })
      }
    }

    // 正しいsession_idを取得（10/14は第8回: session_id=27）
    const correctSessionId = 27

    // 各グループを統合
    for (const [key, logs] of Object.entries(groups)) {
      if (logs.length <= 1) continue

      // 合計値を計算
      const totalCorrect = logs.reduce((sum, log) => sum + log.correct_count, 0)
      const totalProblems = logs.reduce((sum, log) => sum + log.total_problems, 0)

      // session_id=27のレコードを探す
      const correctLog = logs.find(log => log.session_id === correctSessionId)
      const wrongLogs = logs.filter(log => log.session_id !== correctSessionId)

      if (correctLog) {
        // 正しいsession_idのレコードがある場合、それを更新
        console.log(`\n✏️  科目${correctLog.subject_id}/内容${correctLog.study_content_type_id} を統合:`)
        console.log(`  ID ${correctLog.id} を更新: ${correctLog.correct_count}/${correctLog.total_problems} → ${totalCorrect}/${totalProblems}`)

        const { error: updateError } = await supabase
          .from("study_logs")
          .update({
            correct_count: totalCorrect,
            total_problems: totalProblems,
          })
          .eq("id", correctLog.id)

        if (updateError) {
          console.error(`❌ 更新エラー:`, updateError)
          continue
        }

        // 古いレコードを削除
        for (const wrongLog of wrongLogs) {
          console.log(`  ID ${wrongLog.id} を削除`)
          const { error: deleteError } = await supabase
            .from("study_logs")
            .delete()
            .eq("id", wrongLog.id)

          if (deleteError) {
            console.error(`❌ 削除エラー:`, deleteError)
          }
        }
      } else {
        // 正しいsession_idのレコードがない場合、最初のレコードを更新
        const firstLog = logs[0]
        console.log(`\n✏️  科目${firstLog.subject_id}/内容${firstLog.study_content_type_id} を統合:`)
        console.log(`  ID ${firstLog.id} を更新: session=${firstLog.session_id}→${correctSessionId}, ${firstLog.correct_count}/${firstLog.total_problems} → ${totalCorrect}/${totalProblems}`)

        const { error: updateError } = await supabase
          .from("study_logs")
          .update({
            session_id: correctSessionId,
            correct_count: totalCorrect,
            total_problems: totalProblems,
          })
          .eq("id", firstLog.id)

        if (updateError) {
          console.error(`❌ 更新エラー:`, updateError)
          continue
        }

        // 他のレコードを削除
        for (const otherLog of logs.slice(1)) {
          console.log(`  ID ${otherLog.id} を削除`)
          const { error: deleteError } = await supabase
            .from("study_logs")
            .delete()
            .eq("id", otherLog.id)

          if (deleteError) {
            console.error(`❌ 削除エラー:`, deleteError)
          }
        }
      }
    }

    // 修正後の確認
    const { data: afterLogs } = await supabase
      .from("study_logs")
      .select("id, session_id, subject_id, study_content_type_id, correct_count, total_problems, subjects(name)")
      .eq("student_id", 4)
      .eq("study_date", "2025-10-14")
      .order("subject_id")

    console.log("\n✅ 修正後の10/14の学習記録:")
    afterLogs?.forEach(log => {
      const subject = Array.isArray(log.subjects) ? log.subjects[0] : log.subjects
      console.log(`  ID ${log.id}: ${(subject as any)?.name || '不明'}, 内容${log.study_content_type_id}, session=${log.session_id}, ${log.correct_count}/${log.total_problems}`)
    })

    // 週次進捗を確認
    const { data: sessionLogs } = await supabase
      .from("study_logs")
      .select("subject_id, correct_count, total_problems, subjects(name)")
      .eq("student_id", 4)
      .eq("session_id", 27)

    console.log("\n📊 第8回（session_id=27）の学習記録:")
    const subjectMap: Record<string, { correct: number; total: number }> = {}
    sessionLogs?.forEach(log => {
      const subject = Array.isArray(log.subjects) ? log.subjects[0] : log.subjects
      const subjectName = (subject as any)?.name || '不明'
      if (!subjectMap[subjectName]) {
        subjectMap[subjectName] = { correct: 0, total: 0 }
      }
      subjectMap[subjectName].correct += log.correct_count
      subjectMap[subjectName].total += log.total_problems
    })

    for (const [subject, data] of Object.entries(subjectMap)) {
      const accuracy = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0
      console.log(`  ${subject}: ${data.correct}/${data.total} (${accuracy}%)`)
    }

  } catch (error) {
    console.error("❌ エラーが発生しました:", error)
  }
}

fixHanakoDuplicateLogs()
