import { createClient } from "@/lib/supabase/server"
import { getOpenAIClient, handleOpenAIError, getDefaultModel } from "./client"
import crypto from "crypto"

export interface DailyStatusContext {
  studentName: string
  grade: number
  course: string
  todayLogs: {
    subject: string
    content: string
    correct: number
    total: number
    accuracy: number
    time: string
  }[]
  studyStreak: number
  weeklyTrend: "improving" | "stable" | "declining" | "none"
  recentReflection?: string
  upcomingTest?: {
    name: string
    date: string
    daysUntil: number
  }
}

/**
 * キャッシュキーを生成
 */
function generateCacheKey(context: DailyStatusContext, promptVersion: string = "v1.0"): string {
  const keyData = {
    grade: context.grade,
    course: context.course,
    // 今日の学習記録数を5件刻みで丸める
    todayLogCount: Math.floor(context.todayLogs.length / 5) * 5,
    // 平均正答率を10%刻みで丸める
    avgAccuracyRange: context.todayLogs.length > 0
      ? Math.floor((context.todayLogs.reduce((sum, log) => sum + log.accuracy, 0) / context.todayLogs.length) / 10) * 10
      : 0,
    // 連続学習日数を5日刻みで丸める
    studyStreakRange: Math.floor(context.studyStreak / 5) * 5,
    weeklyTrend: context.weeklyTrend,
    hasUpcomingTest: !!context.upcomingTest,
    promptVersion,
  }

  const keyString = JSON.stringify(keyData)
  return crypto.createHash("sha256").update(keyString).digest("hex")
}

/**
 * キャッシュから取得
 */
async function getCachedMessage(cacheKey: string): Promise<string | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("ai_cache")
    .select("cached_content, hit_count")
    .eq("cache_key", cacheKey)
    .eq("cache_type", "daily_status")
    .single()

  if (error || !data) {
    return null
  }

  // 使用回数を更新
  await supabase
    .from("ai_cache")
    .update({
      hit_count: data.hit_count + 1,
      last_accessed_at: new Date().toISOString(),
    })
    .eq("cache_key", cacheKey)

  return JSON.parse(data.cached_content) as string
}

/**
 * キャッシュに保存
 */
async function cacheMessage(cacheKey: string, message: string): Promise<void> {
  const supabase = await createClient()

  await supabase.from("ai_cache").insert({
    cache_key: cacheKey,
    cache_type: "daily_status",
    cached_content: JSON.stringify(message),
  })
}

/**
 * システムプロンプト
 */
function getSystemPrompt(): string {
  return `あなたは中学受験を目指す小学生の保護者に寄り添う、経験豊富な学習コーチです。

【あなたの役割】
- 保護者に対して、お子さんの「今日の様子」を温かく、かつ具体的に伝える
- お子さんの努力と成長を認め、保護者が安心できるメッセージを届ける
- データに基づきながらも、温かみのある表現を心がける

【メッセージの方針】
1. **ポジティブな視点**: まず努力や良い点を伝える
2. **具体性**: 「頑張っています」だけでなく、何をどれだけ頑張ったか
3. **成長の視点**: 小さな進歩も見逃さず伝える
4. **適度な長さ**: 2〜3文程度（60〜100文字程度）
5. **セルフコンパッション**: 結果より過程を重視
6. **保護者の安心**: 親が子どもを応援したくなる内容

【避けるべき表現】
- プレッシャーを与える表現（「もっと頑張らないと」など）
- ネガティブな比較（「他の子と比べて」など）
- 過度な心配を煽る表現
- 結果だけに焦点を当てた評価

【保護者への語りかけ方】
- 敬語で丁寧に
- 「〜さん」と子どもの名前を使う
- 「今日も」「着実に」など継続性を示す言葉を使う`
}

/**
 * ユーザープロンプト
 */
function getUserPrompt(context: DailyStatusContext): string {
  let prompt = `お子さんの今日の学習状況から、保護者向けの「今日の様子」メッセージを生成してください。

【お子さんの基本情報】
名前: ${context.studentName}
学年: 小学${context.grade}年生
コース: ${context.course}コース
連続学習日数: ${context.studyStreak}日

【今日の学習記録】
`

  if (context.todayLogs.length === 0) {
    prompt += `まだ学習記録がありません。

メッセージ例: 「まだ今日の学習記録はありませんが、${context.studentName}さんのペースで大丈夫ですよ。」
`
  } else {
    context.todayLogs.forEach((log, index) => {
      prompt += `${index + 1}. ${log.subject} - ${log.content}: ${log.correct}/${log.total}問正解 (正答率${log.accuracy}%) - ${log.time}\n`
    })

    const totalProblems = context.todayLogs.reduce((sum, log) => sum + log.total, 0)
    const totalCorrect = context.todayLogs.reduce((sum, log) => sum + log.correct, 0)
    const avgAccuracy = Math.round((totalCorrect / totalProblems) * 100)

    prompt += `
【今日の合計】
問題数: ${totalProblems}問
正解数: ${totalCorrect}問
平均正答率: ${avgAccuracy}%
`
  }

  prompt += `
【最近の傾向】
`

  switch (context.weeklyTrend) {
    case "improving":
      prompt += "先週と比べて正答率が上昇傾向にあります。"
      break
    case "stable":
      prompt += "安定したペースで学習を継続しています。"
      break
    case "declining":
      prompt += "先週と比べて少し苦戦している様子ですが、継続して取り組んでいます。"
      break
    case "none":
      prompt += "データが不十分です。"
      break
  }

  if (context.recentReflection) {
    prompt += `\n\n【最近の振り返りコメント】\n${context.recentReflection}`
  }

  if (context.upcomingTest) {
    prompt += `\n\n【近日のテスト】\n${context.upcomingTest.name}（${context.upcomingTest.date}、あと${context.upcomingTest.daysUntil}日）`
  }

  prompt += `\n\n上記の情報をもとに、保護者が安心し、お子さんを応援したくなるような「今日の様子」メッセージを2〜3文（60〜100文字程度）で生成してください。`

  return prompt
}

/**
 * AI「今日の様子」メッセージを生成
 */
export async function generateDailyStatusMessage(
  context: DailyStatusContext
): Promise<{ success: true; message: string } | { success: false; error: string }> {
  try {
    const promptVersion = "v1.0"
    const cacheKey = generateCacheKey(context, promptVersion)

    // キャッシュチェック
    const cachedMessage = await getCachedMessage(cacheKey)
    if (cachedMessage) {
      console.log("Cache hit for daily status:", cacheKey)
      return { success: true, message: cachedMessage }
    }

    console.log("Cache miss, generating new daily status:", cacheKey)

    // OpenAI API呼び出し
    const openai = getOpenAIClient()
    const model = getDefaultModel()

    const completion = await openai.chat.completions.create({
      model,
      messages: [
        { role: "system", content: getSystemPrompt() },
        { role: "user", content: getUserPrompt(context) },
      ],
      max_completion_tokens: 500,
    })

    const message = completion.choices[0]?.message?.content?.trim()

    if (!message) {
      throw new Error("OpenAI returned empty message")
    }

    // キャッシュに保存
    await cacheMessage(cacheKey, message)

    return { success: true, message }
  } catch (error) {
    console.error("Generate daily status error:", error)
    return handleOpenAIError(error)
  }
}
