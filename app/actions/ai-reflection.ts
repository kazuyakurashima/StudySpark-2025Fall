"use server"

import { getOpenAIClient, handleOpenAIError, getDefaultModel } from "@/lib/openai/client"

export type StudyData = {
  subjects: string[]
  details: {
    [subjectId: string]: {
      [contentId: string]: {
        contentName: string
        correct: number
        total: number
      }
    }
  }
}

/**
 * 学習記録に基づいてAIが振り返り文を3つ生成
 */
export async function generateDailyReflections(studyData: StudyData) {
  try {
    console.log("=== AI Reflection Generation Started ===")
    console.log("Study Data:", JSON.stringify(studyData, null, 2))

    const openai = getOpenAIClient()

    // 学習データをテキストに整形
    const studyDetails = studyData.subjects
      .map((subjectId) => {
        const subject = {
          math: "算数",
          japanese: "国語",
          science: "理科",
          social: "社会",
        }[subjectId] || subjectId

        const contents = studyData.details[subjectId] || {}
        const contentList = Object.entries(contents)
          .map(([_, contentData]) => {
            const accuracy = contentData.total > 0
              ? Math.round((contentData.correct / contentData.total) * 100)
              : 0
            return `${contentData.contentName}（正答率${accuracy}%、${contentData.correct}/${contentData.total}問正解）`
          })
          .join("、")

        return `${subject}: ${contentList || "記録あり"}`
      })
      .join("\n")

    console.log("Study Details Text:", studyDetails)

    const systemPrompt = `あなたは中学受験を目指す小学生です。
ユーザーが提供する今日の学習記録に基づいて、振り返り文を3つ生成してください。

【３つの指針】
1. 頑張った点を具体的に評価
2. 学習内容から得た発見や理解を言語化
3. 次にどう活かすか、具体的な改善点

【出力形式】
以下の形式で出力してください:
#1
(80-120文字の振り返り)
#2
(80-120文字の振り返り)
#3
(80-120文字の振り返り)`

    const userPrompt = studyDetails

    console.log("System Prompt:", systemPrompt)
    console.log("User Prompt:", userPrompt)

    const model = getDefaultModel()
    console.log("Using Model:", model)

    const response = await openai.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_completion_tokens: 600,
    })

    console.log("API Response:", JSON.stringify(response, null, 2))

    const content = response.choices[0]?.message?.content
    if (!content) {
      console.error("AI response content is empty")
      throw new Error("AI response is empty")
    }

    console.log("Raw AI Response Content:", content)

    // レスポンスを3つの振り返り文に分割（#1, #2, #3 で分割）
    const parts = content.split(/#\d+/).map((text) => text.trim()).filter((text) => text.length > 0)
    console.log("Parsed Parts (by separator):", parts)
    console.log("Parts Count:", parts.length)

    let reflections: string[] = []

    if (parts.length >= 3) {
      // 成功: 指定形式で生成された
      reflections = parts.slice(0, 3)
      console.log("✅ Successfully parsed with separator format")
      console.log("Reflections:", reflections)
    } else {
      // フォールバック: 別の分割方法を試す
      console.warn("⚠️ Failed to parse with separator, trying alternative methods")

      // 「1. 」「2. 」「3. 」または改行で分割
      const altParts = content
        .split(/(?:\n\s*\d+[.、．]\s*|\n{2,})/)
        .map((text) => text.trim())
        .filter((text) => text.length > 30 && text.length < 250)

      console.log("Alternative Parse Attempt:", altParts)
      console.log("Alt Parts Count:", altParts.length)

      if (altParts.length >= 3) {
        reflections = altParts.slice(0, 3)
        console.log("✅ Successfully parsed with alternative method")
        console.log("Reflections:", reflections)
      } else {
        // それでも失敗した場合は定型文を使用
        console.warn("❌ Failed to parse AI response, using fallback template")
        const studiedSubjects = studyData.subjects
          .map((id) => ({ math: "算数", japanese: "国語", science: "理科", social: "社会" }[id]))
          .join("、")

        console.log("Studied Subjects:", studiedSubjects)

        reflections = [
          `今日は${studiedSubjects}の学習に取り組めました。特に難しい問題にも諦めずに挑戦できたのは素晴らしいことです。`,
          `${studiedSubjects}を学習する中で、基礎をしっかり理解することの大切さに気づきました。一つひとつ丁寧に取り組むことで理解が深まります。`,
          `明日は今日間違えた問題を復習し、もし分からない部分があれば先生に質問して、確実に理解してから次に進みます。`,
        ]
        console.log("Using Fallback Reflections:", reflections)
      }
    }

    console.log("=== Final Reflections ===")
    reflections.slice(0, 3).forEach((ref, idx) => {
      console.log(`Reflection ${idx + 1}:`, ref)
    })
    console.log("=== AI Reflection Generation Completed ===")

    return { reflections: reflections.slice(0, 3) }
  } catch (error) {
    console.error("Generate daily reflections error:", error)
    const errorMessage = handleOpenAIError(error)
    return { error: errorMessage }
  }
}
