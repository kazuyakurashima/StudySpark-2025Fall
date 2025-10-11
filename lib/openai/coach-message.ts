import { getOpenAIClient, getDefaultModel } from "./client"

export interface CoachMessageContext {
  studentId: string
  studentName: string
  grade: number
  course: string
  latestWill?: string
  latestGoal?: string
  recentLogs: {
    subject: string
    content: string
    correct: number
    total: number
    accuracy: number
    date: string
  }[]
  upcomingTest?: {
    name: string
    date: string
    daysUntil: number
  }
  studyStreak: number
}

/**
 * システムプロンプト
 */
function getSystemPrompt(): string {
  return `あなたは中学受験を目指す小学生の学習を支援する、経験豊富なAIコーチです。

【あなたの役割】
- 毎日の学習開始時に、生徒を動機づける1つのメッセージを伝える
- GROWモデル（Goal / Reality / Options / Will）に基づき、次の一手を提示する
- セルフコンパッションの原則に従い、責めずに小さな達成を承認する

【メッセージの構成（必須3要素）】
1. **承認・励まし**（1行）
   - 最近の努力や小さな成長を具体的に承認
   - 「頑張ったね」だけでなく、何をどう頑張ったかを伝える

2. **現状の要点**（1点のみ）
   - 不足・残量・期日のいずれか1点に絞る
   - データに基づく具体的な情報（例: 「算数があと5%で目標達成」）

3. **Willについて**（行動を促す）
   - 生徒が立てたWill（意志）を参照し、具体的な行動を提案
   - 「今日は〜をやってみよう」のように、次の一手を明確に

【トーン・表現原則】
- **セルフコンパッション**: 結果より過程を重視、自己批判ではなく努力を認める
- **成長マインドセット**: 能力は努力と学習で成長することを強調
- **小学生向け**: 親しみやすく、わかりやすい言葉
- **具体性**: 抽象的な励ましではなく、データや行動に基づく具体的な内容
- **温かさ**: 応援する気持ちが伝わる表現
- **季節感**: 時期に応じた表現を自然に織り交ぜる（例: 夏「暑い中」、冬「寒い中」）

【避けるべき表現】
- プレッシャーを与える表現（「やらないと」「〜しなければ」）
- ネガティブな比較（「他の子は〜」「まだまだ足りない」）
- 結果だけに焦点を当てた評価（「点数が低い」「できていない」）
- 長すぎるメッセージ（100文字超過）
- 機械的な定型文（「今日も頑張ろう」のみ）

【出力形式】
60〜100文字程度の日本語で、上記3要素を含む1つのメッセージを生成してください。
改行は使わず、1つの段落にまとめてください。`
}

/**
 * ユーザープロンプト
 */
function getUserPrompt(context: CoachMessageContext): string {
  const today = new Date()
  const month = today.getMonth() + 1
  const season = month >= 3 && month <= 5 ? "春" : month >= 6 && month <= 8 ? "夏" : month >= 9 && month <= 11 ? "秋" : "冬"

  let prompt = `【生徒情報】
名前: ${context.studentName}
学年: 小学${context.grade}年生
コース: ${context.course}コース
連続学習日数: ${context.studyStreak}日
現在の季節: ${season}

`

  // 直近のWill/Goal
  if (context.latestWill || context.latestGoal) {
    prompt += `【最近の目標設定（GROWモデルから）】\n`
    if (context.latestWill) {
      prompt += `Will（意志・行動計画）: ${context.latestWill}\n`
    }
    if (context.latestGoal) {
      prompt += `Goal（目標）: ${context.latestGoal}\n`
    }
    prompt += `\n`
  }

  // 直近3日の学習ログ
  if (context.recentLogs.length > 0) {
    prompt += `【直近3日間の学習記録】\n`

    // 科目別に集計
    const subjectStats: { [subject: string]: { totalCorrect: number, totalProblems: number, logs: typeof context.recentLogs } } = {}

    context.recentLogs.forEach(log => {
      if (!subjectStats[log.subject]) {
        subjectStats[log.subject] = { totalCorrect: 0, totalProblems: 0, logs: [] }
      }
      subjectStats[log.subject].totalCorrect += log.correct
      subjectStats[log.subject].totalProblems += log.total
      subjectStats[log.subject].logs.push(log)
    })

    Object.entries(subjectStats).forEach(([subject, stats]) => {
      const accuracy = stats.totalProblems > 0 ? Math.round((stats.totalCorrect / stats.totalProblems) * 100) : 0
      const gap = 80 - accuracy // 目標80%までの差
      prompt += `- ${subject}: 正答率${accuracy}%（${stats.totalCorrect}/${stats.totalProblems}問）`
      if (accuracy >= 80) {
        prompt += ` ✓ 目標達成`
      } else if (gap <= 10) {
        prompt += ` → あと${gap}%で目標達成`
      } else {
        prompt += ` → 復習が必要`
      }
      prompt += `\n`
    })
    prompt += `\n`
  } else {
    prompt += `【直近3日間の学習記録】\nまだ学習記録がありません。\n\n`
  }

  // 近日のテスト
  if (context.upcomingTest) {
    prompt += `【近日のテスト】\n${context.upcomingTest.name}（${context.upcomingTest.date}、あと${context.upcomingTest.daysUntil}日）\n\n`
  }

  prompt += `上記の情報をもとに、${context.studentName}さんへの今日の学習開始時のメッセージを生成してください。

【生成ルール】
1. 承認・励まし: 最近の努力や小さな成長を具体的に伝える
2. 現状の要点: 不足・残量・期日のいずれか1点を具体的に伝える
3. Willについて: 次の具体的な行動を提案する

60〜100文字で、1つの段落にまとめてください。`

  return prompt
}

/**
 * AIコーチメッセージ生成
 */
export async function generateCoachMessage(
  context: CoachMessageContext
): Promise<{ success: true; message: string } | { success: false; error: string }> {
  try {
    const openai = getOpenAIClient()
    const model = getDefaultModel()

    const completion = await openai.chat.completions.create({
      model,
      messages: [
        { role: "system", content: getSystemPrompt() },
        { role: "user", content: getUserPrompt(context) },
      ],
      max_completion_tokens: 500, // 60-100文字メッセージ + 複雑なケースの余裕
    })

    const message = completion.choices[0]?.message?.content?.trim()

    if (!message) {
      console.error("[Coach Message] Empty message from OpenAI")
      throw new Error("OpenAI returned empty message")
    }

    // 文字数チェック（60-100文字推奨、150文字まで許容）
    if (message.length > 150) {
      console.warn(`Coach message too long: ${message.length} chars`)
    }

    return { success: true, message }
  } catch (error) {
    console.error("Generate coach message error:", error)

    if (error instanceof Error) {
      return { success: false, error: error.message }
    }

    return { success: false, error: "AI生成中にエラーが発生しました" }
  }
}
