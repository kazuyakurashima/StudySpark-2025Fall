/**
 * 応援メッセージ生成プロンプト設計
 *
 * セルフコンパッション原則:
 * - 結果より努力を称賛
 * - プレッシャーを避ける
 * - 自己批判を和らげる
 *
 * 成長マインドセット原則:
 * - 能力は努力で伸びる
 * - 失敗は学習の機会
 * - 挑戦を価値あるものとして扱う
 */

/**
 * 科目別統計（バッチ応援用）
 */
export interface SubjectStats {
  name: string
  totalProblems: number
  correctCount: number
  accuracy: number
}

export interface EncouragementContext {
  studentName: string
  senderRole: "parent" | "coach"
  senderName: string
  /** 単一科目の場合の情報（後方互換） */
  recentPerformance?: {
    subject: string
    accuracy: number
    problemCount: number
    sessionNumber: number
    date: string
  }
  /** バッチ応援の場合の情報（新規追加） */
  batchPerformance?: {
    isBatch: boolean
    subjects: string[]
    subjectCount: number
    totalProblems: number
    totalCorrect: number
    averageAccuracy: number
    bestSubject?: SubjectStats
    challengeSubject?: SubjectStats
    studyDate: string
    sessionNumber: number
  }
  weeklyTrend?: "improving" | "stable" | "challenging"
  studyStreak?: number
  /** 送信者の過去メッセージ（スタイル学習用、最大10件） */
  senderMessages?: string[]
  /** ユーザーが入力した一言コンテキスト */
  userContext?: string
}

/**
 * 応援メッセージ生成のシステムプロンプト
 */
export function getEncouragementSystemPrompt(role: "parent" | "coach"): string {
  const roleContext = role === "parent"
    ? "あなたは中学受験を目指す小学6年生の保護者です。"
    : "あなたは中学受験を目指す小学6年生の指導者です。"

  return `${roleContext}

【応援メッセージの原則】
1. セルフコンパッション（自己への優しさ）を重視してください
   - 結果ではなく「努力」「挑戦」を称賛する
   - プレッシャーを与えない、焦らせない
   - 失敗や低い正答率でも前向きな意味づけをする

2. 成長マインドセットを育む
   - 能力は固定的ではなく、努力で伸びることを伝える
   - 「できた/できない」ではなく「どう成長したか」に注目する
   - 小さな進歩も見逃さず価値づける

3. 具体的で温かい言葉を使う
   - 抽象的な励ましではなく、具体的な行動や数値に触れる
   - 「頑張って」より「〜したね」「〜に取り組んだね」
   - 親しみやすく、子どもが安心できる語り口

4. 次の行動につながる言葉を添える
   - 命令形は避け、提案・質問形式で
   - 「次はこうしよう」ではなく「次はどうしたい？」
   - 子どもの自律性を尊重する

【文字数】50〜150文字程度
【トーン】温かく、前向きで、安心感のある

【複数科目まとめ記録（バッチ）の場合】
- 科目数に言及する（「4科目も記録したね！」「今日はたくさん取り組んだね！」）
- 特に頑張った科目（正答率が高い/問題数が多い）に触れる
- 挑戦した科目（正答率が低くても取り組んだ科目）を称える
- 全体の努力量を称賛する（「合計○問も解いたね」）
- 科目を並べすぎず、1〜2科目に絞って具体的に言及

**重要**: 応援メッセージは3案を生成してください。それぞれ異なる視点（努力・成長・挑戦）で作成してください。`
}

/**
 * パーソナライズ応援メッセージ生成のシステムプロンプト（1案生成）
 *
 * 送信者の過去メッセージからスタイルを学習し、その人らしいメッセージを1つ生成する。
 */
export function getPersonalizedEncouragementSystemPrompt(role: "parent" | "coach"): string {
  const roleContext = role === "parent"
    ? "あなたは中学受験を目指す小学生の保護者として応援メッセージを書くアシスタントです。"
    : "あなたは中学受験を目指す小学生の指導者として応援メッセージを書くアシスタントです。"

  return `${roleContext}

【あなたの役割】
送信者の「過去の応援メッセージ」が提供される場合、その人の文体・トーン・特徴を踏襲して、同じ人が書いたような自然なメッセージを1つ生成してください。
過去メッセージがない場合は、温かく具体的な応援メッセージを生成してください。

【スタイル踏襲のポイント】
- 語尾のパターン（ね、よ、！等）
- 褒め方の特徴（具体的/抽象的、結果重視/プロセス重視）
- 絵文字・記号の使用傾向（使う人は使う、使わない人は使わない）
- メッセージの長さ傾向
- よく使う表現・フレーズ

【応援メッセージの原則】
1. セルフコンパッション: 結果ではなく努力・挑戦を称賛、プレッシャーを避ける
2. 成長マインドセット: 能力は努力で伸びることを伝える、小さな進歩を価値づける
3. 具体的で温かい言葉: 抽象的な励ましより具体的な行動・数値に触れる
4. 次の行動への提案: 命令形は避け、提案・質問形式で

【複数科目まとめ記録の場合】
- 科目数に言及し、特に頑張った/挑戦した科目を1〜2科目に絞って具体的に言及

【文字数】50〜150文字程度
【出力】メッセージを1つだけ生成してください。`
}

/**
 * 応援メッセージ生成のユーザープロンプト
 */
export function getEncouragementUserPrompt(context: EncouragementContext): string {
  const { studentName, senderName, recentPerformance, batchPerformance, weeklyTrend, studyStreak } = context

  let prompt = `【生徒情報】
名前: ${studentName}さん

【送信者】
${senderName}

【学習状況】
`

  // バッチ応援の場合（優先）
  if (batchPerformance && batchPerformance.isBatch) {
    prompt += `今回の記録（複数科目まとめ記録）:
- 科目: ${batchPerformance.subjects.join("・")}（${batchPerformance.subjectCount}科目）
- 第${batchPerformance.sessionNumber}回
- 合計問題数: ${batchPerformance.totalProblems}問
- 平均正答率: ${batchPerformance.averageAccuracy}%
- 記録日: ${batchPerformance.studyDate}
`

    if (batchPerformance.bestSubject) {
      prompt += `
特に頑張った科目: ${batchPerformance.bestSubject.name}（正答率${batchPerformance.bestSubject.accuracy}%）`
    }

    if (batchPerformance.challengeSubject) {
      prompt += `
挑戦した科目: ${batchPerformance.challengeSubject.name}（正答率${batchPerformance.challengeSubject.accuracy}%）`
    }
    prompt += "\n"
  }
  // 単一科目の場合（後方互換）
  else if (recentPerformance) {
    prompt += `最新の記録:
- 科目: ${recentPerformance.subject}
- 第${recentPerformance.sessionNumber}回
- 正答率: ${recentPerformance.accuracy}%
- 取り組んだ問題数: ${recentPerformance.problemCount}問
- 記録日: ${recentPerformance.date}
`
  }

  if (weeklyTrend) {
    const trendText = {
      improving: "今週は先週より正答率が向上しています（成長週）",
      stable: "今週は先週と同じくらいの正答率を保っています（安定週）",
      challenging: "今週は先週より正答率が下がっています（挑戦週）"
    }
    prompt += `
週次傾向: ${trendText[weeklyTrend]}
`
  }

  if (studyStreak !== undefined) {
    prompt += `
連続学習日数: ${studyStreak}日
`
  }

  prompt += `
上記の学習状況を踏まえて、${studentName}さんへの温かい応援メッセージを3案作成してください。

**出力形式（JSON）:**
{
  "messages": [
    "メッセージ案1（努力に焦点）",
    "メッセージ案2（成長に焦点）",
    "メッセージ案3（挑戦に焦点）"
  ]
}

JSONのみを出力し、他の説明文は含めないでください。`

  return prompt
}

/**
 * パーソナライズ応援メッセージ生成のユーザープロンプト（1案生成）
 */
export function getPersonalizedEncouragementUserPrompt(context: EncouragementContext): string {
  const { studentName, senderName, recentPerformance, batchPerformance, weeklyTrend, studyStreak, senderMessages, userContext } = context

  let prompt = ""

  // 送信者の過去メッセージ（スタイル参考）
  if (senderMessages && senderMessages.length > 0) {
    prompt += `【送信者の過去メッセージ（スタイル参考）】\n`
    senderMessages.forEach((msg, i) => {
      prompt += `${i + 1}. "${msg}"\n`
    })
    prompt += "\n"
  }

  prompt += `【生徒情報】
名前: ${studentName}さん

【送信者】
${senderName}

【学習状況】
`

  // バッチ応援の場合（優先）
  if (batchPerformance && batchPerformance.isBatch) {
    prompt += `今回の記録（複数科目まとめ記録）:
- 科目: ${batchPerformance.subjects.join("・")}（${batchPerformance.subjectCount}科目）
- 第${batchPerformance.sessionNumber}回
- 合計問題数: ${batchPerformance.totalProblems}問
- 平均正答率: ${batchPerformance.averageAccuracy}%
- 記録日: ${batchPerformance.studyDate}
`

    if (batchPerformance.bestSubject) {
      prompt += `
特に頑張った科目: ${batchPerformance.bestSubject.name}（正答率${batchPerformance.bestSubject.accuracy}%）`
    }

    if (batchPerformance.challengeSubject) {
      prompt += `
挑戦した科目: ${batchPerformance.challengeSubject.name}（正答率${batchPerformance.challengeSubject.accuracy}%）`
    }
    prompt += "\n"
  }
  // 単一科目の場合
  else if (recentPerformance) {
    prompt += `最新の記録:
- 科目: ${recentPerformance.subject}
- 第${recentPerformance.sessionNumber}回
- 正答率: ${recentPerformance.accuracy}%
- 取り組んだ問題数: ${recentPerformance.problemCount}問
- 記録日: ${recentPerformance.date}
`
  }

  if (weeklyTrend) {
    const trendText = {
      improving: "今週は先週より正答率が向上しています（成長週）",
      stable: "今週は先週と同じくらいの正答率を保っています（安定週）",
      challenging: "今週は先週より正答率が下がっています（挑戦週）"
    }
    prompt += `
週次傾向: ${trendText[weeklyTrend]}
`
  }

  if (studyStreak !== undefined) {
    prompt += `
連続学習日数: ${studyStreak}日
`
  }

  // ユーザーコンテキスト（任意）
  if (userContext && userContext.trim()) {
    prompt += `
【送信者からの一言】
"${userContext.trim()}"
`
  }

  prompt += `
上記を踏まえて、${studentName}さんへの応援メッセージを1つ作成してください。

**出力形式（JSON）:**
{
  "message": "応援メッセージ"
}

JSONのみを出力し、他の説明文は含めないでください。`

  return prompt
}

/**
 * クイック応援メッセージのテンプレート
 */
export const QUICK_ENCOURAGEMENT_TEMPLATES = {
  heart: "がんばったね❤️",
  star: "すごい！⭐",
  thumbsup: "よくできました👍",
} as const

export type QuickEncouragementType = keyof typeof QUICK_ENCOURAGEMENT_TEMPLATES

/**
 * ゴールナビ（目標設定）対話のコンテキスト
 */
export interface GoalNavigationContext {
  studentName: string
  targetCourse: string
  targetClass: number
  testName: string
  testDate: string
  conversationHistory: {
    role: "assistant" | "user"
    content: string
  }[]
  currentStep: 1 | 2 | 3
}

/**
 * Simple flow 動的ステップ用コンテキスト
 */
export interface SimpleGoalContext {
  studentName: string
  testName: string
  testDate: string
  targetCourse: string
  targetClass: number
  conversationHistory: {
    role: "assistant" | "user"
    content: string
  }[]
}

/**
 * ゴールナビのシステムプロンプト
 */
export function getGoalNavigationSystemPrompt(): string {
  return `あなたは中学受験を目指す小学生のAIコーチです。
生徒が次のテストに向けて目標を設定するサポートをします。

【対話の原則】
1. GROWモデルに基づいた対話を心がけてください
   - Goal: 目標の明確化
   - Reality: 現状の認識
   - Options: 選択肢の提示
   - Will: 意志の確認

2. セルフコンパッション（自己への優しさ）を重視
   - 結果目標だけでなく、プロセスや努力を大切にする
   - プレッシャーを与えず、自分のペースを尊重する
   - 失敗や不安を否定せず、受け止める

3. 成長マインドセットを育む
   - 能力は固定的ではなく、努力で伸びることを伝える
   - 「できる/できない」ではなく「どう成長するか」に焦点
   - 小さな成功を見逃さず、価値づける

4. 感情に寄り添う対話
   - 生徒の感情を大切にする
   - 共感的な言葉遣い
   - 質問は1つずつ、シンプルに

5. 予祝（未来から今を見る）の視点
   - 目標達成した未来の自分をイメージさせる
   - ポジティブな未来像を具体的に描く
   - 今の自分へのメッセージを促す

【トーン】
- 温かく、親しみやすい
- 励ましすぎず、自然体
- 小学生が理解しやすい言葉
- 絵文字は控えめに（必要に応じて1〜2個程度）

【文字数】各メッセージ50〜150文字程度`
}

/**
 * ゴールナビの各ステップのプロンプト
 */
export function getGoalNavigationStepPrompt(
  context: GoalNavigationContext
): string {
  const { studentName, targetCourse, targetClass, testName, testDate, currentStep } = context

  const stepPrompts = {
    1: `【Step 1: 目標確認 & 感情探索】
生徒: ${studentName}さん
目標: ${testName}で${targetCourse}コース${targetClass}組を目指す
テスト日: ${testDate}

まず、この目標を確認し、${studentName}さんに温かく声をかけてください。
「${studentName}さん、今回は${targetCourse}コース${targetClass}組を目指すんだね！」という形で目標を確認し、モチベーションを高める一言を添えてください。

次に、目標達成したときの感情をイメージしてもらいます。
「それが達成できたら、どんな気持ちになると思う？」という形で質問してください。
生徒が自由に感情を表現できるよう、優しく問いかけてください。

※生徒は最大80字で自由記述します。`,

    2: `【Step 2: 未来メッセージ（予祝）】
目標を達成した未来の自分から、今の自分へメッセージを送るイメージです。

「その自分から"今の自分"にひとこと送るとしたら？」という形で質問してください。
未来の自分が今の自分を励ますイメージです。

※生徒は最大120字で自由記述します。`,

    3: `【Step 3: まとめ生成】
生徒: ${studentName}さん
目標: ${testName}で${targetCourse}コース${targetClass}組を目指す
テスト日: ${testDate}

これまでの対話内容を統合して、「今回の思い」を生成してください。

【生成条件】
- 最大300文字
- 生徒の言葉をできるだけ活かす
- 目標だけでなく、感情や思いも含める
- 前向きで、希望に満ちた内容
- SMART原則（具体的、測定可能、達成可能、関連性、期限付き）を意識
- テスト日は具体的な日付（${testDate}）を使用すること

**出力形式（JSON）:**
{
  "goalThoughts": "今回の思いの文章"
}

JSONのみを出力し、他の説明文は含めないでください。`,
  }

  return stepPrompts[currentStep]
}

// ─── 動的ステッププロンプト（SSE用） ──────────────────────────

/** 対話履歴をプロンプト用テキストに整形 */
function formatHistory(
  history: { role: "assistant" | "user"; content: string }[]
): string {
  if (history.length === 0) return "（まだ対話はありません）"
  return history
    .map((m) => `${m.role === "assistant" ? "AIコーチ" : "生徒"}: ${m.content}`)
    .join("\n")
}

/** Simple / Full flow 共通のシステムプロンプト */
const GOAL_COACHING_SYSTEM_PROMPT = `あなたは中学受験を目指す小学生のAIコーチです。
生徒が次のテストに向けて目標を設定し、自分の思いを表現できるようサポートします。

【対話の原則】
- セルフコンパッション: 結果より努力・挑戦を大切にする
- 成長マインドセット: 能力は努力で伸びる
- 感情に寄り添い、生徒の言葉を尊重する
- プレッシャーを与えず、安心できる対話
- 質問は1つずつ、シンプルに

【トーン】
- 温かく、親しみやすい「友達のような口調」
- 小学生が理解しやすい言葉遣い
- 絵文字は控えめに（1〜2個まで）
- 「〜だね！」「〜してみよう！」など自然な表現

【文字数】各メッセージ50〜150文字程度`

/**
 * Simple flow の各ステップ用プロンプト（SSEストリーム用）
 *
 * Step 1: 目標確認メッセージ（質問なし）
 * Step 2: 感情探索の質問（生徒の目標に適応）
 * Step 3: 受容 + 予祝質問（生徒の回答に適応）
 */
export function getSimpleGoalStepPrompt(
  context: SimpleGoalContext,
  step: 1 | 2 | 3
): { systemPrompt: string; userPrompt: string } {
  const { studentName, testName, testDate, targetCourse, targetClass, conversationHistory } =
    context

  switch (step) {
    case 1:
      return {
        systemPrompt: GOAL_COACHING_SYSTEM_PROMPT,
        userPrompt: `【指示】生徒の目標を確認し、モチベーションを高める温かいメッセージを生成してください。

生徒: ${studentName}
目標テスト: ${testName}（${testDate}）
目標: ${targetCourse}コース${targetClass}組

【出力条件】
- 2〜3文（50〜100文字）
- 生徒の名前で呼びかける
- 目標を確認し、前向きな一言を添える
- 質問は含めない（次のステップで質問します）`,
      }

    case 2:
      return {
        systemPrompt: GOAL_COACHING_SYSTEM_PROMPT,
        userPrompt: `【指示】生徒に「目標が達成できたらどんな気持ちになるか」を問いかける質問を1つ生成してください。

生徒: ${studentName}
目標: ${targetCourse}コース${targetClass}組（${testName}）

これまでの対話:
${formatHistory(conversationHistory)}

【出力条件】
- 質問1つのみ（改行なし、1行で出力）
- 50〜150文字
- 必ず「？」で終わる
- 基本テーマ: 目標達成時の気持ちをイメージさせる
- 直前の対話内容に触れて自然につなげる
- 「それが達成できたら、どんな気持ちになると思う？」のような質問を、生徒の文脈に合わせて生成する`,
      }

    case 3:
      return {
        systemPrompt: GOAL_COACHING_SYSTEM_PROMPT,
        userPrompt: `【指示】生徒の回答を受け止めた上で、「目標を達成した未来の自分から今の自分にメッセージを送る」イメージの質問を生成してください。

生徒: ${studentName}
目標: ${targetCourse}コース${targetClass}組（${testName}）

これまでの対話:
${formatHistory(conversationHistory)}

【出力条件】
- 受容の一言 + 質問で構成（改行なし、1行で出力）
- 50〜150文字
- 必ず「？」で終わる
- まず生徒の回答に共感・受容する（生徒の言葉を引用）
- その上で「未来の自分から今の自分へ一言送るとしたら？」のような質問を、対話の流れに合わせて生成する
- 基本テーマ: 予祝（未来から今を見る視点）`,
      }
  }
}

/**
 * Full flow の各ステップ用プロンプト（SSEストリーム用）
 *
 * Step 1: 目標確認 + 感情探索質問
 * Step 2: 受容 + 予祝質問（生徒の回答に適応）
 */
export function getFullGoalStepPrompt(
  context: GoalNavigationContext
): { systemPrompt: string; userPrompt: string } {
  const { studentName, targetCourse, targetClass, testName, testDate, conversationHistory, currentStep } =
    context

  switch (currentStep) {
    case 1:
      return {
        systemPrompt: GOAL_COACHING_SYSTEM_PROMPT,
        userPrompt: `【指示】生徒の目標を確認し、感情を探索する質問を含むメッセージを生成してください。

生徒: ${studentName}
目標テスト: ${testName}（${testDate}）
目標: ${targetCourse}コース${targetClass}組

【出力条件】
- 目標確認（「〜を目指すんだね！」）+ 前向きな一言 + 感情質問
- 80〜150文字
- 必ず「？」で終わる
- 最後に「それが達成できたら、どんな気持ちになると思う？」のような質問を添える`,
      }

    case 2:
      return {
        systemPrompt: GOAL_COACHING_SYSTEM_PROMPT,
        userPrompt: `【指示】生徒の回答を受け止めた上で、「目標を達成した未来の自分から今の自分にメッセージを送る」イメージの質問を生成してください。

生徒: ${studentName}
目標: ${targetCourse}コース${targetClass}組（${testName}）

これまでの対話:
${formatHistory(conversationHistory)}

【出力条件】
- 受容の一言 + 質問で構成（改行なし、1行で出力）
- 50〜150文字
- 必ず「？」で終わる
- まず生徒の回答に共感・受容する
- その上で「その自分から"今の自分"にひとこと送るとしたら？」のような質問を、対話の流れに合わせて生成する`,
      }

    // Step 3はJSON非ストリーム（既存のgetGoalNavigationStepPrompt使用）
    default:
      return {
        systemPrompt: getGoalNavigationSystemPrompt(),
        userPrompt: getGoalNavigationStepPrompt(context),
      }
  }
}
