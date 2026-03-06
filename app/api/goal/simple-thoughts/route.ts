import { NextRequest, NextResponse } from "next/server"
import { getOpenAIClient } from "@/lib/openai/client"
import { getGeminiClient, getModelForModule } from "@/lib/llm/client"
import { sanitizeForLog } from "@/lib/llm/logger"
import { requireAuth } from "@/lib/api/auth"
import { simpleThoughtsSchema } from "@/lib/api/goal-schemas"
import { createClient } from "@/lib/supabase/route"

const requestSchema = simpleThoughtsSchema

export async function POST(request: NextRequest) {
  const auth = await requireAuth(["student"])
  if ("error" in auth) return auth.error

  let rawBody: unknown
  try {
    rawBody = await request.json()
  } catch {
    return NextResponse.json(
      { error: "リクエストの解析に失敗しました" },
      { status: 400 }
    )
  }

  const parsed = requestSchema.safeParse(rawBody)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "不正なリクエストです", details: parsed.error.flatten() },
      { status: 400 }
    )
  }
  const body = parsed.data

  try {
    const supabase = await createClient()

    const [studentResult, scheduleResult] = await Promise.all([
      supabase
        .from("students")
        .select("id, full_name, grade")
        .eq("user_id", auth.user.id)
        .single(),
      supabase
        .from("test_schedules")
        .select(`
            id,
            test_date,
            test_types!inner ( name, grade )
          `)
        .eq("id", body.testScheduleId)
        .single(),
    ])

    if (!studentResult.data) {
      return NextResponse.json({ error: "生徒情報が見つかりません" }, { status: 404 })
    }
    const student = studentResult.data

    if (!scheduleResult.data) {
      return NextResponse.json(
        { error: "指定されたテスト日程が見つかりません" },
        { status: 404 }
      )
    }
    const schedule = scheduleResult.data

    // 学年整合チェック
    const testTypes = Array.isArray(schedule.test_types)
      ? schedule.test_types[0]
      : schedule.test_types
    if (testTypes && testTypes.grade !== student.grade) {
      return NextResponse.json(
        { error: "テストの対象学年と生徒の学年が一致しません" },
        { status: 400 }
      )
    }

    const studentName = student.full_name
    const testName = testTypes?.name ?? "テスト"
    const testDate = schedule.test_date

    // 生徒の回答を抽出（ユーザーメッセージのみ）
    const userAnswers = body.conversationHistory
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
- 目標コース: ${body.targetCourse}コース
- 目標組: ${body.targetClass}組

対話内容:
質問1: それが達成できたら、どんな気持ちになると思う？
回答1: ${userAnswers[0] || "（回答なし）"}

質問2: その自分から"今の自分"にひとこと送るとしたら？
回答2: ${userAnswers[1] || "（回答なし）"}

上記の対話内容をもとに、「今回の思い」を生成してください。`

    // AI呼び出し（プロバイダ分岐）
    const { provider, model } = getModelForModule("goal", "realtime")
    let thoughts: string | undefined

    if (provider === "gemini") {
      const client = getGeminiClient()
      const response = await client.models.generateContent({
        model,
        config: {
          systemInstruction: systemPrompt,
          maxOutputTokens: 500,
        },
        contents: [{ role: "user" as const, parts: [{ text: userPrompt }] }],
      })
      thoughts = response.text?.trim()
    } else {
      const openai = getOpenAIClient()
      const completion = await openai.chat.completions.create({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_completion_tokens: 500,
      })
      thoughts = completion.choices[0]?.message?.content?.trim()
    }

    if (!thoughts) {
      return NextResponse.json({ error: "思い生成に失敗しました" }, { status: 500 })
    }

    return NextResponse.json({ thoughts })
  } catch (error) {
    console.error("思い生成エラー:", sanitizeForLog(error))
    return NextResponse.json({ error: "思い生成中にエラーが発生しました" }, { status: 500 })
  }
}
