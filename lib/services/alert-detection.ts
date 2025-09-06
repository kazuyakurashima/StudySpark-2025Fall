import 'server-only'

export type AlertType = 
  | 'no_recent_records' 
  | 'understanding_decline' 
  | 'low_consistency'
  | 'poor_performance'
  | 'inactive_streak'

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical'

export interface StudentAlert {
  type: AlertType
  severity: AlertSeverity
  title: string
  description: string
  daysSince?: number
  value?: number
  threshold?: number
}

export interface StudentSummary {
  id: string
  name: string
  lastRecordDate?: string
  totalRecords: number
  averageUnderstanding: number
  consistencyRate: number
  strongSubjects: string[]
  weakSubjects: string[]
}

/**
 * 学生のアラートを検出
 */
export async function detectAlerts(supabase: any, studentId: string): Promise<StudentAlert[]> {
  try {
    const alerts: StudentAlert[] = []
    
    // Get recent study records
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const startDate = thirtyDaysAgo.toISOString().split('T')[0]

    const { data: records } = await supabase
      .from('study_inputs')
      .select('*')
      .eq('student_id', studentId)
      .gte('date', startDate)
      .order('date', { ascending: false })

    const studyRecords = records || []

    // Alert 1: No recent records
    const noRecentRecordsAlert = checkNoRecentRecords(studyRecords)
    if (noRecentRecordsAlert) alerts.push(noRecentRecordsAlert)

    // Alert 2: Understanding decline
    const understandingDeclineAlert = checkUnderstandingDecline(studyRecords)
    if (understandingDeclineAlert) alerts.push(understandingDeclineAlert)

    // Alert 3: Low consistency
    const lowConsistencyAlert = checkLowConsistency(studyRecords)
    if (lowConsistencyAlert) alerts.push(lowConsistencyAlert)

    // Alert 4: Poor performance
    const poorPerformanceAlert = checkPoorPerformance(studyRecords)
    if (poorPerformanceAlert) alerts.push(poorPerformanceAlert)

    // Alert 5: Inactive streak
    const inactiveStreakAlert = checkInactiveStreak(studyRecords)
    if (inactiveStreakAlert) alerts.push(inactiveStreakAlert)

    return alerts

  } catch (error) {
    console.error('Error detecting alerts for student:', studentId, error)
    return []
  }
}

/**
 * 学生の優先度を計算
 */
export function calculatePriority(student: StudentSummary, alerts: StudentAlert[]): number {
  let priority = 0

  // Base priority from alerts
  alerts.forEach(alert => {
    switch (alert.severity) {
      case 'critical': priority += 100; break
      case 'high': priority += 50; break
      case 'medium': priority += 25; break
      case 'low': priority += 10; break
    }
  })

  // Additional factors
  
  // Recent activity (lower is higher priority)
  if (student.lastRecordDate) {
    const daysSinceLastRecord = getDaysSince(student.lastRecordDate)
    if (daysSinceLastRecord > 7) priority += 30
    else if (daysSinceLastRecord > 3) priority += 15
  } else {
    priority += 50 // No records at all
  }

  // Understanding level (lower is higher priority)
  if (student.averageUnderstanding < 2.0) priority += 30
  else if (student.averageUnderstanding < 3.0) priority += 20
  else if (student.averageUnderstanding < 3.5) priority += 10

  // Consistency (lower is higher priority)
  if (student.consistencyRate < 20) priority += 20
  else if (student.consistencyRate < 40) priority += 15
  else if (student.consistencyRate < 60) priority += 10

  // Total records (fewer is higher priority for new students)
  if (student.totalRecords === 0) priority += 25
  else if (student.totalRecords < 5) priority += 15
  else if (student.totalRecords < 10) priority += 5

  return Math.min(priority, 999) // Cap at 999
}

/**
 * 最近の記録なしアラート
 */
function checkNoRecentRecords(records: any[]): StudentAlert | null {
  if (records.length === 0) {
    return {
      type: 'no_recent_records',
      severity: 'critical',
      title: '記録なし',
      description: '過去30日間に学習記録がありません'
    }
  }

  const daysSinceLastRecord = getDaysSince(records[0].date)
  
  if (daysSinceLastRecord >= 7) {
    return {
      type: 'no_recent_records',
      severity: 'high',
      title: '記録が途絶えています',
      description: `${daysSinceLastRecord}日間記録がありません`,
      daysSince: daysSinceLastRecord
    }
  } else if (daysSinceLastRecord >= 3) {
    return {
      type: 'no_recent_records',
      severity: 'medium',
      title: '記録が少なくなっています',
      description: `${daysSinceLastRecord}日間記録がありません`,
      daysSince: daysSinceLastRecord
    }
  }

  return null
}

/**
 * 理解度低下アラート
 */
function checkUnderstandingDecline(records: any[]): StudentAlert | null {
  if (records.length < 5) return null

  // Compare recent 3 records with previous 3 records
  const recent = records.slice(0, 3)
  const previous = records.slice(3, 6)

  const recentAvg = recent.reduce((sum, r) => sum + getUnderstandingScore(r.understanding_level), 0) / recent.length
  const previousAvg = previous.reduce((sum, r) => sum + getUnderstandingScore(r.understanding_level), 0) / previous.length

  const decline = previousAvg - recentAvg

  if (decline >= 1.5) {
    return {
      type: 'understanding_decline',
      severity: 'high',
      title: '理解度が大幅に低下',
      description: `理解度が${decline.toFixed(1)}ポイント低下しています`,
      value: recentAvg,
      threshold: previousAvg
    }
  } else if (decline >= 1.0) {
    return {
      type: 'understanding_decline',
      severity: 'medium',
      title: '理解度が低下',
      description: `理解度が${decline.toFixed(1)}ポイント低下しています`,
      value: recentAvg,
      threshold: previousAvg
    }
  }

  return null
}

/**
 * 低一貫性アラート
 */
function checkLowConsistency(records: any[]): StudentAlert | null {
  const activeDays = new Set(records.map(r => r.date))
  const consistencyRate = Math.round((activeDays.size / 30) * 100)

  if (consistencyRate < 20) {
    return {
      type: 'low_consistency',
      severity: 'high',
      title: '学習継続率が低い',
      description: `過去30日の学習継続率が${consistencyRate}%です`,
      value: consistencyRate,
      threshold: 20
    }
  } else if (consistencyRate < 40) {
    return {
      type: 'low_consistency',
      severity: 'medium',
      title: '学習継続率が低め',
      description: `過去30日の学習継続率が${consistencyRate}%です`,
      value: consistencyRate,
      threshold: 40
    }
  }

  return null
}

/**
 * 成績不良アラート
 */
function checkPoorPerformance(records: any[]): StudentAlert | null {
  if (records.length < 3) return null

  const avgUnderstanding = records.reduce((sum, r) => sum + getUnderstandingScore(r.understanding_level), 0) / records.length

  if (avgUnderstanding < 2.0) {
    return {
      type: 'poor_performance',
      severity: 'high',
      title: '理解度が低い状態が続いています',
      description: `平均理解度が${avgUnderstanding.toFixed(1)}です`,
      value: avgUnderstanding,
      threshold: 2.0
    }
  } else if (avgUnderstanding < 2.5) {
    return {
      type: 'poor_performance',
      severity: 'medium',
      title: '理解度の向上が必要',
      description: `平均理解度が${avgUnderstanding.toFixed(1)}です`,
      value: avgUnderstanding,
      threshold: 2.5
    }
  }

  return null
}

/**
 * 非アクティブ期間アラート
 */
function checkInactiveStreak(records: any[]): StudentAlert | null {
  if (records.length === 0) return null

  // Find the longest gap between consecutive records
  let longestGap = 0
  let currentGap = 0

  const sortedDates = records
    .map(r => new Date(r.date))
    .sort((a, b) => b.getTime() - a.getTime())

  for (let i = 1; i < sortedDates.length; i++) {
    const daysDiff = Math.floor((sortedDates[i - 1].getTime() - sortedDates[i].getTime()) / (1000 * 60 * 60 * 24))
    
    if (daysDiff > 1) {
      currentGap = daysDiff
      longestGap = Math.max(longestGap, currentGap)
    } else {
      currentGap = 0
    }
  }

  if (longestGap >= 10) {
    return {
      type: 'inactive_streak',
      severity: 'medium',
      title: '長期間の学習休止',
      description: `最大${longestGap}日間の学習休止期間がありました`,
      daysSince: longestGap
    }
  } else if (longestGap >= 5) {
    return {
      type: 'inactive_streak',
      severity: 'low',
      title: '学習休止期間',
      description: `最大${longestGap}日間の学習休止期間がありました`,
      daysSince: longestGap
    }
  }

  return null
}

// Helper functions

function getDaysSince(dateString: string): number {
  const date = new Date(dateString)
  const now = new Date()
  const diffTime = now.getTime() - date.getTime()
  return Math.floor(diffTime / (1000 * 60 * 60 * 24))
}

function getUnderstandingScore(level: string): number {
  switch (level) {
    case 'excellent': return 5
    case 'good': return 4
    case 'normal': return 3
    case 'struggling': return 2
    case 'difficult': return 1
    default: return 3
  }
}