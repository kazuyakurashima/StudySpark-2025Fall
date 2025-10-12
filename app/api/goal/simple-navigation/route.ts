import { NextRequest, NextResponse } from "next/server"
import { getDefaultModel } from "@/lib/openai/client"
import OpenAI from "openai"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

interface RequestBody {
  studentName: string
  testName: string
  testDate: string
  targetCourse: string
  targetClass: number
  step: 1 | 2 | 3
  previousAnswer?: string
}

export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json()
    const { studentName, testName, testDate, targetCourse, targetClass, step, previousAnswer } = body

    let systemPrompt = ""
    let userPrompt = ""

    // Step 1: 目標確認
    if (step === 1) {
      systemPrompt = `あなたは中学受験を目指す小学生を応援するAIコーチです。
生徒が設定した目標に対して、温かく前向きな言葉でモチベーションを高めてください。

# 重要な指針
- 生徒の名前を呼びかけて親しみを持たせる
- 「〜だね！」「〜しようね！」など、友達のような口調
- 目標達成への期待感を込める
- プレッシャーを与えず、ポジティブな気持ちにさせる

# 出力形式
- 2〜3文で簡潔に
- 絵文字を1〜2個使用してもOK
- 生徒の名前を最初に呼びかける`

      userPrompt = `生徒情報:
- 名前: ${studentName}
- 目標テスト: ${testName}（${testDate}）
- 目標コース: ${targetCourse}コース
- 目標組: ${targetClass}組

上記の目標に対して、生徒を励ますメッセージを生成してください。`
    }
    // Step 2: 感情探索
    else if (step === 2) {
      // Step2は固定の質問を返す
      return NextResponse.json({
        message: "それが達成できたら、どんな気持ちになると思う？"
      })
    }
    // Step 3: 未来メッセージ
    else if (step === 3) {
      // Step3は固定の質問を返す
      return NextResponse.json({
        message: 'その自分から"今の自分"にひとこと送るとしたら？'
      })
    }

    const model = getDefaultModel()
    const completion = await openai.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_completion_tokens: 300,
    })

    const message = completion.choices[0]?.message?.content?.trim()

    if (!message) {
      return NextResponse.json({ error: "メッセージ生成に失敗しました" }, { status: 500 })
    }

    return NextResponse.json({ message })
  } catch (error) {
    console.error("AI対話エラー:", error)
    return NextResponse.json({ error: "AI対話中にエラーが発生しました" }, { status: 500 })
  }
}
