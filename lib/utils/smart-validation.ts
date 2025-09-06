/**
 * SMART原則（Specific, Measurable, Achievable, Relevant, Time-bound）に基づく目標検証
 */

export interface SMARTGoal {
  id?: string
  specific: string // 具体的な内容
  measurable: string // 測定可能な指標
  achievable: string // 達成可能性の根拠
  relevant: string // 関連性・重要性
  timeBound: string // 期限・時間枠
  targetValue?: number // 数値目標（あれば）
  targetUnit?: string // 単位（点、時間、回数など）
  category: 'academic' | 'study_time' | 'consistency' | 'understanding' | 'other'
  priority: 'high' | 'medium' | 'low'
}

export interface SMARTValidationResult {
  isValid: boolean
  score: number // 0-100点のスコア
  feedback: string[]
  improvements: string[]
  strengths: string[]
}

/**
 * SMART原則に基づいて目標を検証
 */
export function validateSMARTGoal(goal: SMARTGoal): SMARTValidationResult {
  const feedback: string[] = []
  const improvements: string[] = []
  const strengths: string[] = []
  let score = 0

  // Specific（具体的）の検証
  if (goal.specific && goal.specific.length > 10) {
    score += 20
    if (goal.specific.length > 30) {
      strengths.push('目標が具体的に設定されています')
    }
  } else {
    improvements.push('目標をより具体的に設定してください')
    feedback.push('「何を」「どのように」を明確にしましょう')
  }

  // Measurable（測定可能）の検証
  if (goal.measurable && goal.measurable.length > 5) {
    score += 20
    if (goal.targetValue && goal.targetUnit) {
      score += 5
      strengths.push('数値目標が設定されており測定可能です')
    }
  } else {
    improvements.push('測定可能な指標を設定してください')
    feedback.push('「どれくらい」「いくつ」などの数値目標を含めましょう')
  }

  // Achievable（達成可能）の検証
  if (goal.achievable && goal.achievable.length > 10) {
    score += 20
    if (goal.achievable.includes('現在') || goal.achievable.includes('過去')) {
      strengths.push('現状を踏まえた達成可能な目標設定です')
    }
  } else {
    improvements.push('達成可能性の根拠を明確にしてください')
    feedback.push('現在の実力や過去の実績を考慮して設定しましょう')
  }

  // Relevant（関連性）の検証
  if (goal.relevant && goal.relevant.length > 10) {
    score += 20
    if (goal.relevant.includes('学習') || goal.relevant.includes('成績') || goal.relevant.includes('理解')) {
      strengths.push('学習目標として適切な関連性があります')
    }
  } else {
    improvements.push('目標の重要性や関連性を明確にしてください')
    feedback.push('なぜこの目標が重要なのかを考えてみましょう')
  }

  // Time-bound（期限設定）の検証
  if (goal.timeBound && goal.timeBound.length > 5) {
    score += 20
    if (hasTimeReference(goal.timeBound)) {
      strengths.push('明確な期限が設定されています')
    }
  } else {
    improvements.push('具体的な期限を設定してください')
    feedback.push('「いつまでに」達成するかを決めましょう')
  }

  // 総合評価
  const isValid = score >= 70
  
  if (score >= 90) {
    feedback.unshift('素晴らしい目標設定です！SMART原則を満たしています。')
  } else if (score >= 70) {
    feedback.unshift('良い目標設定です。いくつかの改善でより効果的になります。')
  } else if (score >= 50) {
    feedback.unshift('目標の基本はできています。SMART原則を意識してブラッシュアップしましょう。')
  } else {
    feedback.unshift('目標をより具体的で実現可能なものに修正しましょう。')
  }

  return {
    isValid,
    score,
    feedback,
    improvements,
    strengths
  }
}

/**
 * 過去の学習データから現実的な目標値を提案
 */
export function suggestRealisticTarget(
  currentPerformance: number,
  historicalData: number[],
  targetType: 'score' | 'time' | 'frequency'
): {
  conservative: number
  moderate: number
  ambitious: number
  reasoning: string
} {
  if (historicalData.length === 0) {
    // データがない場合のデフォルト提案
    const suggestions = getDefaultSuggestions(currentPerformance, targetType)
    return {
      ...suggestions,
      reasoning: '過去のデータがないため、一般的な改善目標を提案します'
    }
  }

  const average = historicalData.reduce((sum, val) => sum + val, 0) / historicalData.length
  const max = Math.max(...historicalData)
  const trend = calculateTrend(historicalData)

  let conservative: number
  let moderate: number
  let ambitious: number

  switch (targetType) {
    case 'score':
      conservative = Math.min(currentPerformance + 5, max)
      moderate = Math.min(currentPerformance + 10, max + 5)
      ambitious = Math.min(currentPerformance + 15, 100)
      break
    case 'time':
      conservative = Math.max(currentPerformance * 1.1, average)
      moderate = Math.max(currentPerformance * 1.25, max * 0.9)
      ambitious = Math.max(currentPerformance * 1.5, max)
      break
    case 'frequency':
      conservative = Math.ceil(average * 1.1)
      moderate = Math.ceil(Math.max(average * 1.3, max * 0.9))
      ambitious = Math.ceil(max * 1.2)
      break
    default:
      conservative = currentPerformance * 1.05
      moderate = currentPerformance * 1.15
      ambitious = currentPerformance * 1.25
  }

  const reasoning = generateReasoningText(
    currentPerformance,
    average,
    max,
    trend,
    targetType
  )

  return {
    conservative: Math.round(conservative * 10) / 10,
    moderate: Math.round(moderate * 10) / 10,
    ambitious: Math.round(ambitious * 10) / 10,
    reasoning
  }
}

/**
 * 目標カテゴリに基づく推奨設定期間
 */
export function getRecommendedTimeframe(category: SMARTGoal['category']): {
  short: string
  medium: string
  long: string
} {
  switch (category) {
    case 'academic':
      return {
        short: '2週間以内',
        medium: '1ヶ月以内',
        long: '2ヶ月以内'
      }
    case 'study_time':
      return {
        short: '1週間以内',
        medium: '2週間以内',
        long: '1ヶ月以内'
      }
    case 'consistency':
      return {
        short: '1週間継続',
        medium: '2週間継続',
        long: '1ヶ月継続'
      }
    case 'understanding':
      return {
        short: '1週間以内',
        medium: '2週間以内',
        long: '3週間以内'
      }
    default:
      return {
        short: '1週間以内',
        medium: '2週間以内',
        long: '1ヶ月以内'
      }
  }
}

// Helper functions

function hasTimeReference(text: string): boolean {
  const timePatterns = [
    /\d+\s*(日|週間|ヶ月|か月|年)/,
    /まで|以内|までに/,
    /\d{4}[-/]\d{1,2}[-/]\d{1,2}/,
    /(今月|来月|今週|来週|明日|今日)/
  ]
  
  return timePatterns.some(pattern => pattern.test(text))
}

function getDefaultSuggestions(current: number, type: 'score' | 'time' | 'frequency') {
  switch (type) {
    case 'score':
      return {
        conservative: Math.min(current + 5, 100),
        moderate: Math.min(current + 10, 100),
        ambitious: Math.min(current + 20, 100)
      }
    case 'time':
      return {
        conservative: current * 1.1,
        moderate: current * 1.25,
        ambitious: current * 1.5
      }
    case 'frequency':
      return {
        conservative: current + 1,
        moderate: current + 2,
        ambitious: current + 3
      }
    default:
      return {
        conservative: current * 1.05,
        moderate: current * 1.15,
        ambitious: current * 1.3
      }
  }
}

function calculateTrend(data: number[]): 'improving' | 'declining' | 'stable' {
  if (data.length < 2) return 'stable'
  
  const recent = data.slice(-Math.min(5, Math.floor(data.length / 2)))
  const earlier = data.slice(0, Math.min(5, Math.floor(data.length / 2)))
  
  const recentAvg = recent.reduce((sum, val) => sum + val, 0) / recent.length
  const earlierAvg = earlier.reduce((sum, val) => sum + val, 0) / earlier.length
  
  const difference = recentAvg - earlierAvg
  const threshold = Math.abs(earlierAvg) * 0.1 // 10%の変化を閾値とする
  
  if (difference > threshold) return 'improving'
  if (difference < -threshold) return 'declining'
  return 'stable'
}

function generateReasoningText(
  current: number,
  average: number,
  max: number,
  trend: 'improving' | 'declining' | 'stable',
  type: 'score' | 'time' | 'frequency'
): string {
  const trendText = {
    improving: '改善傾向にあります',
    declining: 'やや低下傾向が見られます',
    stable: '安定しています'
  }

  const performanceText = current > average 
    ? '平均を上回る実績' 
    : current < average 
    ? '平均を下回っていますが改善の余地があります'
    : '平均的な実績'

  return `現在の実績は${performanceText}で、最近の傾向は${trendText[trend]}。過去最高（${max}）も考慮した現実的な目標を提案します。`
}