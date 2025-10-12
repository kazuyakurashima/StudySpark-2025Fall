import { NextRequest, NextResponse } from "next/server"
import { getDefaultModel } from "@/lib/openai/client"
import OpenAI from "openai"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

interface Message {
  id: number
  role: "assistant" | "user"
  content: string
}

interface RequestBody {
  studentName: string
  testName: string
  testDate: string
  targetCourse: string
  targetClass: number
  conversationHistory: Message[]
}

export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json()
    const { studentName, testName, testDate, targetCourse, targetClass, conversationHistory } = body

    // 生徒の回答を抽出（ユーザーメッセージのみ）
    const userAnswers = conversationHistory
      .filter((msg) => msg.role === "user")
      .map((msg) => msg.content)

    const systemPrompt = `あなたは中学受験を目指す小学生を応援するAIコーチです。
生徒との対話内容をもとに、「今回の思い」を生成してください。

# 「今回の思い」とは
- 生徒が目標に向けて持っている気持ちや決意を表現したもの
- 100〜200文字程度
- 生徒の言葉を活かしながら、前向きで温かい表現にまとめる
- 生徒自身が書いたような自然な文章

# 重要な指針
- 生徒の回答をそのまま使わず、意図を汲み取って整える
- 「〜したい」「〜できるように頑張りたい」など、前向きな表現
- プレッシャーを与えない、セルフコンパッション重視
- 絵文字は使わない
- 一人称は「私」または「自分」

# 出力形式
- 段落分けせず、1つの文章として出力
- 改行は入れない
- 「今回の思い」のテキストのみを出力（前置きや説明は不要）`

    const userPrompt = `生徒情報:
- 名前: ${studentName}
- 目標テスト: ${testName}（${testDate}）
- 目標コース: ${targetCourse}コース
- 目標組: ${targetClass}組

対話内容:
質問1: それが達成できたら、どんな気持ちになると思う？
回答1: ${userAnswers[0] || "（回答なし）"}

質問2: その自分から"今の自分"にひとこと送るとしたら？
回答2: ${userAnswers[1] || "（回答なし）"}

上記の対話内容をもとに、「今回の思い」を生成してください。`

    const model = getDefaultModel()
    const completion = await openai.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_completion_tokens: 500,
    })

    const thoughts = completion.choices[0]?.message?.content?.trim()

    if (!thoughts) {
      return NextResponse.json({ error: "思い生成に失敗しました" }, { status: 500 })
    }

    return NextResponse.json({ thoughts })
  } catch (error) {
    console.error("思い生成エラー:", error)
    return NextResponse.json({ error: "思い生成中にエラーが発生しました" }, { status: 500 })
  }
}
