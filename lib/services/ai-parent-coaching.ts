import { getSubjectLabel, getStudyTypeLabel } from '@/lib/schemas/study-record'

export interface WeeklyLearningData {
  totalRecords: number
  totalStudyTime: number
  subjects: string[]
  averageUnderstanding: number
  dailyActivity: Record<string, number>
  understandingDistribution: {
    excellent: number
    good: number
    normal: number
    struggling: number
    difficult: number
  }
  levelTypeDistribution: {
    spark: number
    flame: number
    blaze: number
  }
  studyPattern: {
    mostActiveDay: string
    consistencyScore: number
    improvementTrend: 'improving' | 'declining' | 'stable'
  }
  isEmpty: boolean
  message?: string
}

export interface StudentProfile {
  id: string
  display_name: string
  avatar_url?: string
}

export interface AIInterpretation {
  summary: string
  strengths: string[]
  concernAreas: string[]
  recommendations: string[]
  encouragementLevel: 'high' | 'medium' | 'low'
  nextSteps: string[]
}

export interface ParentCoachingResponse {
  interpretation: AIInterpretation
  suggestedConversations: string[]
  praisePoints: string[]
  supportActions: string[]
}

/**
 * Generate AI interpretation of child's weekly learning data
 */
export function generateAIInterpretation(
  studentName: string,
  weeklyData: WeeklyLearningData
): AIInterpretation {
  if (weeklyData.isEmpty) {
    return {
      summary: `${studentName}さんの今週の学習記録がありません。学習習慣の定着をサポートしてあげましょう。`,
      strengths: [],
      concernAreas: ['学習記録が記録されていない'],
      recommendations: [
        '一緒に学習計画を立ててみましょう',
        '短時間でも毎日続けることから始めましょう',
        '学習記録をつける習慣を身につけましょう'
      ],
      encouragementLevel: 'high',
      nextSteps: [
        '明日から一緒に学習時間を決める',
        '好きな科目から始めてみる',
        '学習の成果を記録する楽しさを伝える'
      ]
    }
  }

  const strengths: string[] = []
  const concernAreas: string[] = []
  const recommendations: string[] = []
  const nextSteps: string[] = []

  // Analyze consistency
  if (weeklyData.studyPattern.consistencyScore >= 70) {
    strengths.push(`継続性が素晴らしい（${weeklyData.studyPattern.consistencyScore}%）`)
  } else if (weeklyData.studyPattern.consistencyScore >= 40) {
    recommendations.push('学習の継続性を向上させましょう')
  } else {
    concernAreas.push('学習の継続性に課題があります')
    nextSteps.push('毎日決まった時間に学習する習慣を作る')
  }

  // Analyze understanding levels
  const totalUnderstanding = Object.values(weeklyData.understandingDistribution).reduce((sum, count) => sum + count, 0)
  const excellentRatio = weeklyData.understandingDistribution.excellent / totalUnderstanding
  const strugglingRatio = (weeklyData.understandingDistribution.struggling + weeklyData.understandingDistribution.difficult) / totalUnderstanding

  if (excellentRatio >= 0.6) {
    strengths.push('理解度が非常に高く、しっかりと学習内容を身につけています')
  } else if (excellentRatio >= 0.3) {
    strengths.push('理解度は良好です')
  }

  if (strugglingRatio >= 0.3) {
    concernAreas.push('理解が不十分な分野があります')
    recommendations.push('苦手分野の復習時間を増やしましょう')
    nextSteps.push('一緒に苦手な問題に取り組む時間を作る')
  }

  // Analyze study variety
  if (weeklyData.subjects.length >= 4) {
    strengths.push('バランス良く複数科目に取り組んでいます')
  } else if (weeklyData.subjects.length === 1) {
    recommendations.push('他の科目にもバランス良く取り組みましょう')
  }

  // Analyze engagement level
  const blazeRatio = weeklyData.levelTypeDistribution.blaze / weeklyData.totalRecords
  if (blazeRatio >= 0.3) {
    strengths.push('詳細な振り返りができており、学習への取り組み意識が高いです')
  }

  // Analyze study time
  const averageStudyTime = weeklyData.totalStudyTime / Math.max(Object.keys(weeklyData.dailyActivity).length, 1)
  if (averageStudyTime >= 60) {
    strengths.push('十分な学習時間を確保できています')
  } else if (averageStudyTime < 30) {
    recommendations.push('学習時間の確保を意識してみましょう')
  }

  // Generate summary
  const summaryParts = []
  if (strengths.length > 0) {
    summaryParts.push(`${studentName}さんは${strengths[0]}`)
  }
  if (weeklyData.totalRecords > 0) {
    summaryParts.push(`今週は${weeklyData.totalRecords}回の学習記録をつけています`)
  }
  if (weeklyData.studyPattern.mostActiveDay) {
    summaryParts.push(`${weeklyData.studyPattern.mostActiveDay}曜日が最も活発でした`)
  }

  const summary = summaryParts.join('。') + '。'

  // Determine encouragement level
  let encouragementLevel: 'high' | 'medium' | 'low' = 'medium'
  if (weeklyData.studyPattern.improvementTrend === 'improving' && excellentRatio >= 0.5) {
    encouragementLevel = 'high'
  } else if (concernAreas.length > strengths.length) {
    encouragementLevel = 'high' // More encouragement needed when there are concerns
  }

  return {
    summary,
    strengths,
    concernAreas,
    recommendations,
    encouragementLevel,
    nextSteps
  }
}

/**
 * Generate parent coaching suggestions
 */
export function generateParentCoaching(
  studentName: string,
  weeklyData: WeeklyLearningData,
  interpretation: AIInterpretation
): ParentCoachingResponse {
  const suggestedConversations: string[] = []
  const praisePoints: string[] = []
  const supportActions: string[] = []

  // Generate praise points
  if (interpretation.strengths.length > 0) {
    praisePoints.push(`「${studentName}、今週もよく頑張ったね！」`)
    
    if (weeklyData.studyPattern.consistencyScore >= 70) {
      praisePoints.push('「毎日コツコツ続けているのが素晴らしいよ」')
    }
    
    if (weeklyData.subjects.length >= 3) {
      praisePoints.push('「いろいろな科目をバランス良く勉強できているね」')
    }

    if (weeklyData.levelTypeDistribution.blaze > 0) {
      praisePoints.push('「振り返りをしっかり書いているのがえらいね」')
    }
  }

  // Generate conversation starters
  suggestedConversations.push('「今週の勉強で一番面白かったことは何？」')
  
  if (weeklyData.subjects.length > 0) {
    const subjectLabels = weeklyData.subjects.map(s => getSubjectLabel(s as any))
    suggestedConversations.push(`「${subjectLabels[0]}で新しく覚えたことを教えて」`)
  }

  if (interpretation.concernAreas.length > 0) {
    suggestedConversations.push('「難しいと感じた問題があったら一緒に考えてみよう」')
  }

  suggestedConversations.push('「明日はどんな勉強をする予定？」')

  // Generate support actions
  if (interpretation.encouragementLevel === 'high') {
    supportActions.push('学習環境を整える（静かな場所、必要な道具の準備）')
    supportActions.push('一緒に学習計画を立てる時間を作る')
  }

  if (weeklyData.studyPattern.consistencyScore < 50) {
    supportActions.push('毎日決まった時間に「勉強タイム」を設ける')
    supportActions.push('学習記録をつける習慣をサポートする')
  }

  if (interpretation.concernAreas.some(area => area.includes('理解'))) {
    supportActions.push('苦手分野について一緒に復習する時間を作る')
    supportActions.push('理解できたときには具体的に褒める')
  }

  supportActions.push('頑張りを認めて励ます声かけを続ける')
  
  if (weeklyData.totalStudyTime > 0) {
    supportActions.push('適切な休憩時間も大切にする')
  }

  return {
    interpretation,
    suggestedConversations,
    praisePoints,
    supportActions
  }
}

/**
 * Generate simple coaching messages (for UI display)
 */
export function generateSimpleCoachingMessage(
  studentName: string,
  weeklyData: WeeklyLearningData
): string {
  if (weeklyData.isEmpty) {
    return `${studentName}さんの今週の学習記録がまだありません。一緒に学習習慣を作っていきましょう。`
  }

  const messages = []

  // Positive patterns
  if (weeklyData.studyPattern.consistencyScore >= 70) {
    messages.push(`${studentName}さんは今週${weeklyData.studyPattern.consistencyScore}%の日で学習記録をつけており、継続性が素晴らしいです。`)
  }

  if (weeklyData.averageUnderstanding >= 4.0) {
    messages.push('理解度も高く、しっかりと学習内容を身につけています。')
  }

  if (weeklyData.subjects.length >= 4) {
    messages.push('複数の科目にバランス良く取り組んでいます。')
  }

  // Areas for improvement
  if (weeklyData.studyPattern.consistencyScore < 50) {
    messages.push('学習の継続性を高めるサポートがあると良いでしょう。')
  }

  if (messages.length === 0) {
    messages.push(`${studentName}さんは今週${weeklyData.totalRecords}回の学習記録をつけています。`)
  }

  return messages.join('') + ' 引き続き温かくサポートしてあげてください。'
}