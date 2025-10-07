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

    const systemPrompt = `あなたは中学受験を目指す小学6年生の学習をサポートするAIコーチです。
生徒の今日の学習記録に基づいて、振り返り文を3つのバリエーションで生成してください。

【重要な指針】
- セルフコンパッション: 結果より努力を評価し、過度なプレッシャーを避ける
- 成長マインドセット: 能力は努力で伸びることを強調
- 具体的: 今日の学習内容や正答率に具体的に言及する
- 前向き: 次への意欲を引き出す

【3つのバリエーション】
1. 「今日の成果を祝福する」視点（今日できたこと、頑張った点を具体的に評価）
2. 「学びや気づきを深める」視点（学習内容から得た発見や理解を言語化）
3. 「明日への行動につなげる」視点（次にどう活かすか、具体的な改善点）

【出力形式】
3つの振り返り文を以下の形式で出力してください：
---1---
（1つ目の振り返り文）
---2---
（2つ目の振り返り文）
---3---
（3つ目の振り返り文）

【制約】
- 各振り返り文は80-120文字程度
- 小学6年生が自分の言葉として使える自然な表現
- 「です・ます」調
- 絵文字不使用
- 学習内容の具体的な科目名や正答率に言及すること`

    const userPrompt = `今日の学習記録:
${studyDetails}

上記の学習記録に基づいて、指定された形式で3つの異なる視点から振り返り文を生成してください。`

    console.log("AI reflection API call starting with model:", getDefaultModel())
    console.log("Max completion tokens: 600")

    const response = await openai.chat.completions.create({
      model: getDefaultModel(),
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_completion_tokens: 600,
    })

    console.log("API response received:", JSON.stringify({
      choices: response.choices.length,
      firstChoice: response.choices[0],
      finishReason: response.choices[0]?.finish_reason,
      contentLength: response.choices[0]?.message?.content?.length,
    }, null, 2))

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error("AI response is empty")
    }

    console.log("AI reflection response:", content)

    // レスポンスを3つの振り返り文に分割（---1---, ---2---, ---3--- で分割）
    const parts = content.split(/---\d+---/).map((text) => text.trim()).filter((text) => text.length > 0)

    let reflections: string[] = []

    if (parts.length >= 3) {
      // 成功: 指定形式で生成された
      reflections = parts.slice(0, 3)
    } else {
      // フォールバック: 別の分割方法を試す
      console.warn("Failed to parse with separator, trying alternative methods")

      // 「1. 」「2. 」「3. 」または改行で分割
      const altParts = content
        .split(/(?:\n\s*\d+[.、．]\s*|\n{2,})/)
        .map((text) => text.trim())
        .filter((text) => text.length > 30 && text.length < 250)

      if (altParts.length >= 3) {
        reflections = altParts.slice(0, 3)
      } else {
        // それでも失敗した場合は定型文を使用
        console.warn("Failed to parse AI response, using fallback")
        const studiedSubjects = studyData.subjects
          .map((id) => ({ math: "算数", japanese: "国語", science: "理科", social: "社会" }[id]))
          .join("、")

        reflections = [
          `今日は${studiedSubjects}の学習に取り組めました。特に難しい問題にも諦めずに挑戦できたのは素晴らしいことです。`,
          `${studiedSubjects}を学習する中で、基礎をしっかり理解することの大切さに気づきました。一つひとつ丁寧に取り組むことで理解が深まります。`,
          `明日は今日間違えた問題を復習し、もし分からない部分があれば先生に質問して、確実に理解してから次に進みます。`,
        ]
      }
    }

    console.log("Parsed reflections:", reflections)
    return { reflections: reflections.slice(0, 3) }
  } catch (error) {
    console.error("Generate daily reflections error:", error)
    const errorMessage = handleOpenAIError(error)
    return { error: errorMessage }
  }
}
