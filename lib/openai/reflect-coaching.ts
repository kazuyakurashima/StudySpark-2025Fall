import { getOpenAIClient, getDefaultModel } from "./client"

interface ReflectContext {
  studentName: string
  weekType: "growth" | "stable" | "challenge" | "special"
  thisWeekAccuracy: number
  lastWeekAccuracy: number
  accuracyDiff: number
  upcomingTest?: { test_types: { name: string }, test_date: string } | null
  conversationHistory: { role: "assistant" | "user"; content: string }[]
  turnNumber: number
}

/**
 * 週次振り返りAI対話メッセージ生成
 * GROWモデル + 週タイプ別適応
 */
export async function generateReflectMessage(
  context: ReflectContext
): Promise<{ message?: string; error?: string }> {
  try {
    console.log("=== Reflect Message Generation Started ===")
    console.log("Context:", JSON.stringify({
      studentName: context.studentName,
      weekType: context.weekType,
      thisWeekAccuracy: context.thisWeekAccuracy,
      lastWeekAccuracy: context.lastWeekAccuracy,
      accuracyDiff: context.accuracyDiff,
      turnNumber: context.turnNumber,
      conversationLength: context.conversationHistory.length,
    }, null, 2))

    const openai = getOpenAIClient()
    const systemPrompt = getReflectSystemPrompt()
    const userPrompt = getReflectUserPrompt(context)

    console.log("System Prompt:", systemPrompt)
    console.log("User Prompt:", userPrompt)
    console.log("Conversation History:", JSON.stringify(context.conversationHistory, null, 2))

    const model = getDefaultModel()
    console.log("Using Model:", model)

    const response = await openai.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        ...context.conversationHistory.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        { role: "user", content: userPrompt },
      ],
      max_completion_tokens: 800,
    })

    console.log("API Response:", JSON.stringify(response, null, 2))
    console.log("Token Usage:", JSON.stringify(response.usage, null, 2))

    const message = response.choices[0]?.message?.content

    if (!message) {
      console.error("❌ AI response content is empty")
      return { error: "AIからの応答が空でした" }
    }

    console.log("✅ Generated Message:", message)
    console.log("=== Reflect Message Generation Completed ===")

    return { message }
  } catch (error: any) {
    console.error("Reflect AI dialogue error:", error)
    return { error: error.message || "AI対話でエラーが発生しました" }
  }
}

/**
 * 振り返りサマリー生成
 */
export async function generateReflectSummary(
  context: ReflectContext
): Promise<{ summary?: string; error?: string }> {
  try {
    console.log("=== Reflect Summary Generation Started ===")
    console.log("Context:", JSON.stringify({
      studentName: context.studentName,
      weekType: context.weekType,
      accuracyDiff: context.accuracyDiff,
      conversationLength: context.conversationHistory.length,
    }, null, 2))

    const openai = getOpenAIClient()
    const systemPrompt = `あなたは小学生の学習を支援するAIコーチです。
週次振り返り対話の内容から、生徒の気づきと成長をまとめてください。

# 出力形式
150文字以内の日本語で、以下の要素を含めてください：
- 今週の頑張りと成長
- 気づいたこと
- 次週への意気込み

# 原則
- セルフコンパッション：自己批判ではなく、努力を認める
- 成長マインドセット：能力は努力で伸びることを強調
- 具体的：抽象的ではなく、対話内容に基づく具体的な記述`

    const conversationSummary = context.conversationHistory
      .map((msg, i) => `${i + 1}. ${msg.role === "assistant" ? "AIコーチ" : context.studentName}: ${msg.content}`)
      .join("\n")

    const userPrompt = `以下の対話内容から、振り返りサマリーを生成してください：

${conversationSummary}

週タイプ: ${context.weekType === "growth" ? "成長週" : context.weekType === "stable" ? "安定週" : context.weekType === "challenge" ? "挑戦週" : "特別週"}
正答率の変化: ${context.accuracyDiff >= 0 ? "+" : ""}${context.accuracyDiff}%`

    console.log("System Prompt:", systemPrompt)
    console.log("User Prompt:", userPrompt)
    console.log("Conversation Summary:", conversationSummary)

    const model = getDefaultModel()
    console.log("Using Model:", model)

    const response = await openai.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_completion_tokens: 500,
    })

    console.log("API Response:", JSON.stringify(response, null, 2))
    console.log("Token Usage:", JSON.stringify(response.usage, null, 2))

    const summary = response.choices[0]?.message?.content

    if (!summary) {
      console.error("❌ Summary is empty")
      return { error: "サマリー生成に失敗しました" }
    }

    console.log("✅ Generated Summary:", summary)
    console.log("=== Reflect Summary Generation Completed ===")

    return { summary }
  } catch (error: any) {
    console.error("Reflect summary generation error:", error)
    return { error: error.message || "サマリー生成でエラーが発生しました" }
  }
}

/**
 * リフレクトシステムプロンプト
 */
function getReflectSystemPrompt(): string {
  return `あなたは小学生の学習を支援するAIコーチです。
週次振り返り対話を通じて、生徒の自己理解と成長を促します。

# 対話の原則
1. **GROWモデル**: Goal（目標） → Reality（現実） → Options（選択肢） → Will（意志）の順で質問
2. **セルフコンパッション**: 失敗を責めず、努力を認める。「〜できなかった」ではなく「〜に挑戦した」と捉える
3. **成長マインドセット**: 能力は固定ではなく、努力と学習で伸びることを強調
4. **適応的対話**: 週タイプ（成長週/安定週/挑戦週/特別週）に応じて質問を調整

# 対話のルール
- 1つの質問は1文のみ
- 小学生にわかりやすい言葉を使う
- 生徒の回答を受け止め、共感を示す
- 3〜6往復で完了（ターン数を意識）
- 絵文字は適度に使用（✨📚💪🎯など）`
}

/**
 * リフレクトユーザープロンプト（週タイプ別）
 */
function getReflectUserPrompt(context: ReflectContext): string {
  const { weekType, studentName, turnNumber, thisWeekAccuracy, lastWeekAccuracy, accuracyDiff, upcomingTest } = context

  // ターン1: 週タイプ別の導入
  if (turnNumber === 1) {
    if (weekType === "growth") {
      return `${studentName}さん、今週の振り返りだよ！✨

今週は先週より正答率が${accuracyDiff}%アップ（${lastWeekAccuracy}% → ${thisWeekAccuracy}%）したね。すごい成長だ！

この1週間で特に頑張ったことは何？`
    } else if (weekType === "stable") {
      return `${studentName}さん、今週の振り返りだよ！

今週の正答率は${thisWeekAccuracy}%で、先週とほぼ同じ安定した学習ができたね。

この1週間で新しく挑戦したことや、工夫したことはある？`
    } else if (weekType === "challenge") {
      return `${studentName}さん、今週の振り返りだよ！

今週は正答率が${Math.abs(accuracyDiff)}%下がったね（${lastWeekAccuracy}% → ${thisWeekAccuracy}%）。でも、挑戦したからこその結果だよ。難しい問題に取り組んだんじゃない？

この1週間で難しいと感じたことを教えて。`
    } else {
      const testName = upcomingTest?.test_types?.name || "テスト"
      const testDate = upcomingTest?.test_date ? new Date(upcomingTest.test_date).toLocaleDateString("ja-JP") : ""
      return `${studentName}さん、今週の振り返りだよ！

来週は${testName}（${testDate}）があるね。大事な週だ！

テストに向けて、この1週間で準備できたことは何？`
    }
  }

  // ターン2-5: GROWモデルの展開
  if (turnNumber === 2) {
    return `なるほど、${studentName}さんはそんな風に頑張ってたんだね！

その中で、一番自分で「成長したな」と感じることは何？`
  }

  if (turnNumber === 3) {
    if (weekType === "challenge") {
      return `うん、難しい時こそ成長のチャンスだよ！

次はどんな風に工夫してみたい？何か試してみたいことはある？`
    } else {
      return `素晴らしいね！その調子だよ✨

来週はどんなことを意識して勉強したい？`
    }
  }

  if (turnNumber === 4) {
    return `いいアイデアだね！それを実現するために、具体的に何から始める？`
  }

  if (turnNumber === 5) {
    return `${studentName}さんの意気込みが伝わってきたよ💪

最後に、来週の自分にメッセージを送るとしたら、どんな言葉をかける？`
  }

  // ターン6以降: まとめへ誘導
  return `ありがとう、${studentName}さん！今週の振り返りはこれで完了だよ。

今日話したことを忘れずに、来週も頑張ろうね！✨`
}
