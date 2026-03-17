// ============================================================================
// 演習問題集 AIコーチフィードバック — プロンプト + DB操作
// ============================================================================

import crypto from 'crypto'

export const EXERCISE_PROMPT_VERSION = 'v1.0'

// ================================================================
// プロンプト
// ================================================================

export function getExerciseFeedbackSystemPrompt(): string {
  return `あなたは中学受験を目指す小学生を応援するAIコーチです。

【役割】
演習問題集の採点結果と生徒の振り返りを見て、励ましとアドバイスを返します。

【セルフコンパッション原則】
- 結果ではなく、取り組んだ過程・努力を認める
- 振り返りを書いたこと自体を称える
- 不正解を責めず、学びの機会として捉える

【振り返りへの共感】
- 生徒が書いた振り返りの内容に必ず触れる
- 気づきや反省点があればそれを認める
- 次の学習への具体的なヒントを1つ添える

【正答率別トーン】
- 80%以上: 達成を称え、振り返りの深さにも言及
- 50-79%: 挑戦を認め、振り返りから次の一歩を提案
- 50%未満: 取り組みを肯定、振り返りの姿勢を称賛

【出力】
- 60〜150文字
- 振り返りの内容に必ず言及
- 温かく親しみやすい言葉
- 生徒の名前を使ってください`
}

export function getExerciseFeedbackUserPrompt(data: {
  studentName: string
  sectionName: string
  score: number
  maxScore: number
  incorrectCount: number
  reflectionText: string
}): string {
  const accuracy = data.maxScore > 0 ? Math.round((data.score / data.maxScore) * 100) : 0

  return `${data.studentName}さんの演習問題集の結果:
セクション: ${data.sectionName}
正答率: ${accuracy}% (${data.score}/${data.maxScore}問正解)
${data.incorrectCount > 0 ? `不正解: ${data.incorrectCount}問` : '全問正解！'}

生徒の振り返り:
「${data.reflectionText}」

この結果と振り返りに対して、${data.studentName}さんを励ますメッセージを返してください。`
}

export function getExerciseFeedbackPromptHash(systemPrompt: string, userPrompt: string): string {
  return crypto.createHash('sha256').update(systemPrompt + userPrompt).digest('hex').slice(0, 16)
}

// ================================================================
// フォールバック
// ================================================================

export function getExerciseFallbackFeedback(accuracy: number): string {
  if (accuracy === 100) return '全問正解、すごい！振り返りもしっかり書けていて素晴らしいね'
  if (accuracy >= 80) return 'よく頑張ったね！振り返りで気づいたことを次に活かそう'
  if (accuracy >= 50) return 'しっかり取り組めたね！振り返りの姿勢が大事だよ'
  return '挑戦したことが大切だよ！振り返りで次の一歩を考えられたね'
}
