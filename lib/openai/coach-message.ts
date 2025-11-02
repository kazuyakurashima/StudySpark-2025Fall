import { getOpenAIClient, getDefaultModel } from "./client"

export interface CoachMessageContext {
  studentId: number
  studentName: string
  grade: number
  course: string
  latestWill?: string
  latestGoal?: string
  recentLogs: {
    today: {
      subject: string
      content: string
      correct: number
      total: number
      accuracy: number
      date: string
    }[]
    yesterday: {
      subject: string
      content: string
      correct: number
      total: number
      accuracy: number
      date: string
    }[]
    dayBeforeYesterday: {
      subject: string
      content: string
      correct: number
      total: number
      accuracy: number
      date: string
    }[]
  }
  weeklyProgress?: {
    subjectName: string
    weekTotal: number
    weekCorrect: number
    weekAccuracy: number
    remainingToTarget: number
  }[]
  upcomingTest?: {
    name: string
    date: string
    daysUntil: number
  }
  studyStreak: number
  todayMission?: {
    subjects: string[]           // 今日のミッション対象科目（例: ["算数", "国語", "社会"]）
    inputStatus: {
      subject: string
      isInputted: boolean        // 入力済みかどうか
      accuracy?: number          // 正答率（入力済みの場合）
    }[]
  }
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

【重要: データの使い分け】
あなたには2種類のデータが提供されます：
1. **直近のログ（今日/昨日/一昨日）**: 最近の取り組みを具体的に承認するために使用
2. **週次累積進捗**: 1週間（学習回）全体での達成状況と目標までの距離を示すために使用

**使用ルール:**
- 「昨日は〜」「今日は〜」と言う時: 直近のログの数字を使用
- 「今週の〜」「あと〇問で目標達成」と言う時: 週次累積進捗の数字を使用
- 両者を明確に区別し、混同しないこと

**良い例:**
- ✓ 「昨日は社会20題正解したね。今週の社会は正答率50%で、目標まであと18問正解を増やそう！」
  → 「昨日20題」は直近ログ、「今週50%」「あと18問」は週次累積

**悪い例:**
- ✗ 「社会が47%で、目標の80%まであと33%だよ」
  → 47%が直近なのか今週なのか不明確

【重要: 行動促進の優先順位】
1. **今日のミッション（最優先）**
   - 今日の未入力科目がある場合は、その科目の入力を最優先で促す
   - 「今日は〜をやってみよう」で未入力科目を具体的に指定する
   - すべて入力済みの場合のみ、正答率が低い科目や目標に向けた行動を提案

2. **Will/Goal（優先）**
   - 生徒が立てた意志や目標を参照する

3. **正答率向上（補助）**
   - 週次累積進捗で80%未達の科目は参考程度に

【メッセージの構成（必須3要素）】
1. **承認・励まし**（1行）
   - 最近の努力や小さな成長を具体的に承認
   - 「頑張ったね」だけでなく、何をどう頑張ったかを伝える

2. **現状の要点**（1点のみ）
   - 不足・残量・期日のいずれか1点に絞る
   - データに基づく具体的な情報（例: 「算数があと5%で目標達成」）

3. **次の一手**（行動を促す）
   - **未入力科目がある場合**: その科目を優先的に促す（例: 「今日はまず算数を記録してみよう」）
   - **すべて入力済みの場合**: Will/Goalや正答率に基づく行動提案

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

  // デバッグログ
  const totalRecentLogs = (context.recentLogs.today?.length || 0) +
                          (context.recentLogs.yesterday?.length || 0) +
                          (context.recentLogs.dayBeforeYesterday?.length || 0)
  console.log("🔍 [AI Coach] Generating prompt with context:", JSON.stringify({
    studentName: context.studentName,
    grade: context.grade,
    recentLogsCount: totalRecentLogs,
    recentLogs: context.recentLogs,
    weeklyProgressCount: context.weeklyProgress?.length || 0,
    weeklyProgress: context.weeklyProgress
  }, null, 2))

  let prompt = `【生徒情報】
名前: ${context.studentName}
学年: 小学${context.grade}年生
コース: ${context.course}コース
連続学習日数: ${context.studyStreak}日
現在の季節: ${season}

`

  // 今日のミッション（最優先情報）
  if (context.todayMission && context.todayMission.subjects.length > 0) {
    const uninputted = context.todayMission.inputStatus.filter(s => !s.isInputted).map(s => s.subject)
    const inputted = context.todayMission.inputStatus.filter(s => s.isInputted)

    prompt += `【今日のミッション】（最重要：メッセージで最優先で参照してください）\n`
    prompt += `対象科目: ${context.todayMission.subjects.join("、")}\n\n`

    if (uninputted.length > 0) {
      prompt += `⚠️ 未入力科目（これを最優先で促してください）: ${uninputted.join("、")}\n`
      prompt += `→ メッセージの「次の一手」では、この未入力科目の記録を促してください。\n`
      prompt += `   例: 「今日はまず${uninputted[0]}を記録してみよう」\n\n`
    } else {
      prompt += `✓ 今日のミッション対象科目はすべて入力済みです\n\n`
    }

    if (inputted.length > 0) {
      prompt += `入力済み科目:\n`
      inputted.forEach(s => {
        prompt += `  - ${s.subject}: 正答率${s.accuracy}%\n`
      })
      prompt += `\n`
    }
  }

  // 週次累積進捗（学習回全体での達成状況）
  if (context.weeklyProgress && context.weeklyProgress.length > 0) {
    prompt += `【今週の累積進捗】（メッセージで「今週」「あと〇問で目標」と言う時に使用）\n`
    prompt += `今週（学習回）全体での各科目の累積データです。目標は各科目80%達成です。\n\n`

    context.weeklyProgress.forEach(p => {
      prompt += `- ${p.subjectName}: ${p.weekAccuracy}%（${p.weekCorrect}/${p.weekTotal}問）`
      if (p.weekAccuracy >= 80) {
        prompt += ` ✓ 目標達成！`
      } else {
        prompt += ` → 目標80%まであと${p.remainingToTarget}問正解が必要`
      }
      prompt += `\n`
    })

    prompt += `
→ **使用方法**:
  - 「今週の〜」と言う時: この累積データの数字を使用
  - 「あと〇問で目標達成」と言う時: remainingToTarget の値を使用
  - 直近ログの数字と混同しないこと

**メッセージ例:**
  - ✓ 「昨日は社会20題正解したね。今週の社会は正答率50%で、目標まであと18問正解を増やそう！」
  - ✗ 「社会が47%で〜」（どのデータか不明確なのでNG）

`
  }

  // 直近のWill/Goal（優先で参照すべき情報）
  const hasPersonalGoals = !!(context.latestWill || context.latestGoal)
  if (hasPersonalGoals) {
    prompt += `【${context.studentName}さんが立てた目標】（メッセージで最優先で参照してください）\n`
    if (context.latestWill) {
      prompt += `Will（意志・行動計画）: ${context.latestWill}\n`
    }
    if (context.latestGoal) {
      prompt += `Goal（目標）: ${context.latestGoal}\n`
    }
    prompt += `\n→ この目標に向けた進捗や次のアクションを中心にメッセージを組み立ててください。\n\n`
  }

  // 今日の学習ログ（メイン）
  const todayLogs = context.recentLogs.today || []
  const yesterdayLogs = context.recentLogs.yesterday || []
  const dayBeforeYesterdayLogs = context.recentLogs.dayBeforeYesterday || []

  if (todayLogs.length > 0) {
    prompt += `【今日の学習記録】（メッセージで「今日」「昨日」と言う時に使用）\n`
    prompt += `直近3日分の個別ログです。承認・励ましの部分で具体的に言及してください。\n\n`

    // 科目別に集計
    const todaySubjectMap: { [subject: string]: { correct: number; total: number; logs: any[] } } = {}
    todayLogs.forEach(log => {
      if (!todaySubjectMap[log.subject]) {
        todaySubjectMap[log.subject] = { correct: 0, total: 0, logs: [] }
      }
      todaySubjectMap[log.subject].correct += log.correct
      todaySubjectMap[log.subject].total += log.total
      todaySubjectMap[log.subject].logs.push(log)
    })

    Object.entries(todaySubjectMap).forEach(([subject, data]) => {
      const accuracy = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0
      const gap = 80 - accuracy
      prompt += `- ${subject}: 正答率${accuracy}%（${data.correct}/${data.total}問）`
      if (accuracy >= 80) {
        prompt += ` ✓ 習得基準80%達成`
      } else if (gap > 0 && gap <= 10) {
        prompt += ` → まずは80%を目指して、あと${gap}%`
      } else if (gap > 10) {
        prompt += ` → まずは80%を目指して、あと${gap}%`
      }
      prompt += `\n`
    })

    // 昨日・一昨日との比較（変化の情報）
    if (yesterdayLogs.length > 0 || dayBeforeYesterdayLogs.length > 0) {
      prompt += `\n【参考: 昨日・一昨日との比較】\n`

      // 昨日のデータ
      if (yesterdayLogs.length > 0) {
        const yesterdaySubjectMap: { [subject: string]: { correct: number; total: number } } = {}
        yesterdayLogs.forEach(log => {
          if (!yesterdaySubjectMap[log.subject]) {
            yesterdaySubjectMap[log.subject] = { correct: 0, total: 0 }
          }
          yesterdaySubjectMap[log.subject].correct += log.correct
          yesterdaySubjectMap[log.subject].total += log.total
        })

        prompt += `昨日:\n`
        Object.entries(yesterdaySubjectMap).forEach(([subject, data]) => {
          const accuracy = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0
          prompt += `  - ${subject}: ${accuracy}%（${data.correct}/${data.total}問）\n`
        })
      }

      // 一昨日のデータ
      if (dayBeforeYesterdayLogs.length > 0) {
        const dayBeforeYesterdaySubjectMap: { [subject: string]: { correct: number; total: number } } = {}
        dayBeforeYesterdayLogs.forEach(log => {
          if (!dayBeforeYesterdaySubjectMap[log.subject]) {
            dayBeforeYesterdaySubjectMap[log.subject] = { correct: 0, total: 0 }
          }
          dayBeforeYesterdaySubjectMap[log.subject].correct += log.correct
          dayBeforeYesterdaySubjectMap[log.subject].total += log.total
        })

        prompt += `一昨日:\n`
        Object.entries(dayBeforeYesterdaySubjectMap).forEach(([subject, data]) => {
          const accuracy = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0
          prompt += `  - ${subject}: ${accuracy}%（${data.correct}/${data.total}問）\n`
        })
      }

      prompt += `
→ **重要**: 上記の比較から正答率の変化を正しく解釈してください:
  - 正答率が上がっている場合: 「昨日より10%アップ！」など、成長を承認
  - 正答率が下がっている場合: 「成長」とは言わず、「挑戦した」「取り組んだ」など過程を承認
  - 例: 正答率 43% → 17% の場合は「成長」ではなく「難しい問題に挑戦したね」と表現
`
    }

    prompt += `
重要: メッセージでは「今日の学習記録」の数字を使用してください。昨日・一昨日のデータは変化の表現にのみ使用し、古いデータを中心に語らないでください。
`
  } else if (yesterdayLogs.length > 0 || dayBeforeYesterdayLogs.length > 0) {
    prompt += `【今日の学習記録】\nまだ今日の学習記録はありません。\n\n`
    prompt += `【参考: 昨日以前の記録】\n`

    if (yesterdayLogs.length > 0) {
      prompt += `昨日は学習記録があります。今日も頑張りましょう！\n`
    }
    if (dayBeforeYesterdayLogs.length > 0) {
      prompt += `一昨日も学習記録があります。\n`
    }
  } else {
    prompt += `【今日の学習記録】\nまだ学習記録がありません。\n\n`
  }

  // 近日のテスト
  if (context.upcomingTest) {
    prompt += `【近日のテスト】\n${context.upcomingTest.name}（${context.upcomingTest.date}、あと${context.upcomingTest.daysUntil}日）\n\n`
  }

  prompt += `上記の情報をもとに、${context.studentName}さんへの今日の学習開始時のメッセージを生成してください。

【生成ルール】
1. 承認・励まし: 今日の努力や、昨日・一昨日からの成長を具体的に伝える（直近ログ使用）
2. 現状の要点: ${hasPersonalGoals ? '本人が立てた目標への進捗を第一に伝え、' : ''}週次累積進捗での80%達成状況を補助的に伝える
3. Willについて: ${hasPersonalGoals ? '本人のWill（意志・行動計画）に沿った' : ''}次の具体的な行動を提案する

【重要な制約】
- ${hasPersonalGoals ? '本人が立てた目標を最優先で参照し、その目標に向けた具体的なメッセージを作成すること' : ''}
- **データの使い分けを厳守**:
  - 「今日」「昨日」と言う時: 直近ログの数字を使用
  - 「今週」「あと〇問で目標」と言う時: 週次累積進捗の数字を使用
  - 両者を明確に区別して混同しないこと
- 具体的な問題数を言及する場合は、1つの科目の記録のみを使用すること
- 複数の科目の問題数を合計しないこと（例: NG「61問中26問」、OK「国語15/40問」）
- 昨日・一昨日との比較で変化があれば、その成長を褒める（例: 「昨日より10%アップ！」）
- 週次累積進捗で80%未達の科目は「今週の〜は〇%で、目標まであと〇問」のように表現

【推奨メッセージパターン】
- 直近承認 + 週次目標: 「昨日は社会20題正解したね。今週の社会は正答率50%で、目標まであと18問正解を増やそう！」
- 成長承認: 「昨日より10%アップ！今週も着実に前進しているよ」

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
