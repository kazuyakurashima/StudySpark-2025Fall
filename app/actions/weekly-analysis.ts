"use server"

import { createClient } from "@/lib/supabase/server"
import { getOpenAIClient, handleOpenAIError, getDefaultModel } from "@/lib/openai/client"

/**
 * 過去4週間の学習データを集計
 */
export async function getWeeklyStudyData(studentId: string, weekStartDate: Date, weekEndDate: Date) {
  const supabase = await createClient()

  // 学習ログを取得
  const { data: studyLogs, error: logsError } = await supabase
    .from("study_logs")
    .select(
      `
      id,
      study_date,
      subject_id,
      correct_answers,
      total_problems,
      subjects (name)
    `
    )
    .eq("student_id", studentId)
    .gte("study_date", weekStartDate.toISOString().split("T")[0])
    .lte("study_date", weekEndDate.toISOString().split("T")[0])
    .order("study_date", { ascending: false })

  if (logsError) {
    console.error("Failed to fetch study logs:", logsError)
    return { error: "学習ログの取得に失敗しました" }
  }

  // 科目別の集計
  const subjectStats: {
    [subject: string]: {
      totalProblems: number
      correctAnswers: number
      studyDays: number
    }
  } = {}

  studyLogs?.forEach((log: any) => {
    const subjectName = log.subjects?.name || "不明"
    if (!subjectStats[subjectName]) {
      subjectStats[subjectName] = {
        totalProblems: 0,
        correctAnswers: 0,
        studyDays: 0,
      }
    }

    subjectStats[subjectName].totalProblems += log.total_problems
    subjectStats[subjectName].correctAnswers += log.correct_answers
    subjectStats[subjectName].studyDays += 1
  })

  // 正答率計算
  const subjectSummary = Object.entries(subjectStats).map(([subject, stats]) => ({
    subject,
    accuracy: stats.totalProblems > 0 ? Math.round((stats.correctAnswers / stats.totalProblems) * 100) : 0,
    totalProblems: stats.totalProblems,
    correctAnswers: stats.correctAnswers,
    studyDays: stats.studyDays,
  }))

  return {
    studyLogs,
    subjectSummary,
    totalStudyDays: studyLogs?.length || 0,
  }
}

/**
 * 応援メッセージを取得
 */
export async function getWeeklyEncouragementData(
  studentId: string,
  weekStartDate: Date,
  weekEndDate: Date
) {
  const supabase = await createClient()

  const { data: messages, error } = await supabase
    .from("encouragement_messages")
    .select("id, support_type, sender_role, created_at")
    .eq("student_id", studentId)
    .gte("created_at", weekStartDate.toISOString())
    .lte("created_at", weekEndDate.toISOString())
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Failed to fetch encouragement messages:", error)
    return { error: "応援メッセージの取得に失敗しました" }
  }

  // 種類別・送信者別の集計
  const stats = {
    total: messages?.length || 0,
    byType: {
      quick: messages?.filter((m: any) => m.support_type === "quick").length || 0,
      ai: messages?.filter((m: any) => m.support_type === "ai").length || 0,
      custom: messages?.filter((m: any) => m.support_type === "custom").length || 0,
    },
    byRole: {
      parent: messages?.filter((m: any) => m.sender_role === "parent").length || 0,
      coach: messages?.filter((m: any) => m.sender_role === "coach").length || 0,
    },
  }

  return { messages, stats }
}

/**
 * 週次振り返り（リフレクト）データを取得
 */
export async function getWeeklyReflectionData(studentId: string, weekStartDate: Date, weekEndDate: Date) {
  const supabase = await createClient()

  const { data: reflections, error } = await supabase
    .from("coaching_sessions")
    .select("id, session_type, week_start_date, completed_at, summary")
    .eq("student_id", studentId)
    .eq("session_type", "reflection")
    .gte("week_start_date", weekStartDate.toISOString().split("T")[0])
    .lte("week_start_date", weekEndDate.toISOString().split("T")[0])
    .not("completed_at", "is", null)

  if (error) {
    console.error("Failed to fetch reflections:", error)
    return { error: "振り返りデータの取得に失敗しました" }
  }

  return { reflections }
}

/**
 * 目標（ゴールナビ）データを取得
 */
export async function getWeeklyGoalData(studentId: string, weekStartDate: Date, weekEndDate: Date) {
  const supabase = await createClient()

  const { data: goals, error } = await supabase
    .from("coaching_sessions")
    .select("id, session_type, week_start_date, completed_at, summary")
    .eq("student_id", studentId)
    .eq("session_type", "goal")
    .gte("week_start_date", weekStartDate.toISOString().split("T")[0])
    .lte("week_start_date", weekEndDate.toISOString().split("T")[0])
    .not("completed_at", "is", null)

  if (error) {
    console.error("Failed to fetch goals:", error)
    return { error: "目標データの取得に失敗しました" }
  }

  return { goals }
}

/**
 * 週次分析用の統合データを取得
 */
export async function getWeeklyAnalysisData(studentId: string, weekStartDate: Date, weekEndDate: Date) {
  const [studyResult, encouragementResult, reflectionResult, goalResult] = await Promise.all([
    getWeeklyStudyData(studentId, weekStartDate, weekEndDate),
    getWeeklyEncouragementData(studentId, weekStartDate, weekEndDate),
    getWeeklyReflectionData(studentId, weekStartDate, weekEndDate),
    getWeeklyGoalData(studentId, weekStartDate, weekEndDate),
  ])

  if (studyResult.error) return { error: studyResult.error }
  if (encouragementResult.error) return { error: encouragementResult.error }
  if (reflectionResult.error) return { error: reflectionResult.error }
  if (goalResult.error) return { error: goalResult.error }

  return {
    study: studyResult,
    encouragement: encouragementResult,
    reflection: reflectionResult,
    goal: goalResult,
  }
}

/**
 * AI分析を生成
 */
export async function generateWeeklyAnalysis(studentId: string, weekStartDate: Date, weekEndDate: Date) {
  const supabase = await createClient()

  // 生徒情報を取得
  const { data: student, error: studentError } = await supabase
    .from("students")
    .select("full_name, grade, course")
    .eq("id", studentId)
    .single()

  if (studentError || !student) {
    return { error: "生徒情報の取得に失敗しました" }
  }

  // 週次データを取得
  const analysisData = await getWeeklyAnalysisData(studentId, weekStartDate, weekEndDate)

  if (analysisData.error) {
    return { error: analysisData.error }
  }

  // AI分析プロンプトを構築
  const prompt = buildAnalysisPrompt(student, analysisData, weekStartDate, weekEndDate)

  try {
    const openai = getOpenAIClient()

    const response = await openai.chat.completions.create({
      model: getDefaultModel(),
      messages: [
        {
          role: "system",
          content:
            "あなたは中学受験指導の専門家です。生徒の週次学習データを分析し、指導者向けの具体的なフィードバックを提供してください。",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_completion_tokens: 800,
      reasoning_effort: "low",
    })

    const content = response.choices[0]?.message?.content

    if (!content) {
      throw new Error("AI分析の生成に失敗しました")
    }

    // 結果をパース（強み・課題・アドバイスに分割）
    const analysis = parseAnalysisResponse(content)

    // データベースに保存
    const { data: savedAnalysis, error: saveError } = await supabase
      .from("weekly_analysis")
      .upsert(
        {
          student_id: studentId,
          week_start_date: weekStartDate.toISOString().split("T")[0],
          week_end_date: weekEndDate.toISOString().split("T")[0],
          strengths: analysis.strengths,
          challenges: analysis.challenges,
          advice: analysis.advice,
          generated_at: new Date().toISOString(),
          generated_by_batch: false,
        },
        {
          onConflict: "student_id,week_start_date",
        }
      )
      .select()
      .single()

    if (saveError) {
      console.error("Failed to save analysis:", saveError)
      return { error: "分析結果の保存に失敗しました" }
    }

    return { analysis: savedAnalysis }
  } catch (error) {
    console.error("Generate weekly analysis error:", error)
    const errorMessage = handleOpenAIError(error)
    return { error: errorMessage }
  }
}

/**
 * AI分析プロンプトを構築
 */
function buildAnalysisPrompt(student: any, data: any, weekStart: Date, weekEnd: Date): string {
  const { study, encouragement, reflection, goal } = data

  return `
【生徒情報】
名前: ${student.full_name}
学年: ${student.grade === 5 ? "小学5年" : "小学6年"}
コース: ${student.course || "未設定"}

【分析対象期間】
${weekStart.toLocaleDateString("ja-JP")} 〜 ${weekEnd.toLocaleDateString("ja-JP")}

【学習実績】
学習日数: ${study.totalStudyDays}日
科目別正答率:
${study.subjectSummary?.map((s: any) => `- ${s.subject}: ${s.accuracy}% (${s.correctAnswers}/${s.totalProblems}問)`).join("\n")}

【応援状況】
応援メッセージ総数: ${encouragement.stats?.total}件
- 保護者: ${encouragement.stats?.byRole.parent}件
- 指導者: ${encouragement.stats?.byRole.coach}件

【振り返り状況】
完了した振り返り: ${reflection.reflections?.length || 0}回

【目標設定状況】
設定した目標: ${goal.goals?.length || 0}回

以下の形式で分析結果を出力してください:

---strengths---
（この週の強み・良かった点を2-3文で記述）

---challenges---
（この週の課題・改善点を2-3文で記述）

---advice---
（指導者向けの具体的なアドバイスを2-3文で記述）
`
}

/**
 * AI分析レスポンスをパース
 */
function parseAnalysisResponse(content: string): {
  strengths: string
  challenges: string
  advice: string
} {
  const strengthsMatch = content.match(/---strengths---\s*([\s\S]*?)(?=---challenges---|$)/)
  const challengesMatch = content.match(/---challenges---\s*([\s\S]*?)(?=---advice---|$)/)
  const adviceMatch = content.match(/---advice---\s*([\s\S]*)/)

  return {
    strengths: strengthsMatch?.[1]?.trim() || "分析データが不足しています",
    challenges: challengesMatch?.[1]?.trim() || "分析データが不足しています",
    advice: adviceMatch?.[1]?.trim() || "分析データが不足しています",
  }
}

/**
 * 保存済みの週次分析を取得
 */
export async function getStoredWeeklyAnalysis(studentId: string, weekStartDate: Date) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("weekly_analysis")
    .select("*")
    .eq("student_id", studentId)
    .eq("week_start_date", weekStartDate.toISOString().split("T")[0])
    .single()

  if (error) {
    if (error.code === "PGRST116") {
      // データが存在しない
      return { analysis: null }
    }
    console.error("Failed to fetch stored analysis:", error)
    return { error: "分析データの取得に失敗しました" }
  }

  return { analysis: data }
}
