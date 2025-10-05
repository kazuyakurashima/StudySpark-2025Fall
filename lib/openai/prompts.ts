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

export interface EncouragementContext {
  studentName: string
  senderRole: "parent" | "coach"
  senderName: string
  recentPerformance?: {
    subject: string
    accuracy: number
    problemCount: number
    sessionNumber: number
    date: string
  }
  weeklyTrend?: "improving" | "stable" | "challenging"
  studyStreak?: number
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

**重要**: 応援メッセージは3案を生成してください。それぞれ異なる視点（努力・成長・挑戦）で作成してください。`
}

/**
 * 応援メッセージ生成のユーザープロンプト
 */
export function getEncouragementUserPrompt(context: EncouragementContext): string {
  const { studentName, senderName, recentPerformance, weeklyTrend, studyStreak } = context

  let prompt = `【生徒情報】
名前: ${studentName}さん

【送信者】
${senderName}

【学習状況】
`

  if (recentPerformance) {
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
 * クイック応援メッセージのテンプレート
 */
export const QUICK_ENCOURAGEMENT_TEMPLATES = {
  heart: "いつも頑張っているね！応援しています❤️",
  star: "素晴らしい努力だね！この調子で⭐",
  thumbsup: "よく頑張ったね！その調子👍",
} as const

export type QuickEncouragementType = keyof typeof QUICK_ENCOURAGEMENT_TEMPLATES
