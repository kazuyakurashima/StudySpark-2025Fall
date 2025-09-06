import type { StudentAlert, AlertSeverity } from '@/lib/services/alert-detection'

export interface PrioritizedStudent {
  id: string
  name: string
  priority: number
  alerts: StudentAlert[]
  lastRecordDate?: string
  totalRecords: number
  averageUnderstanding: number
  consistencyRate: number
}

export type SortCriteria = 
  | 'priority' 
  | 'alerts' 
  | 'last_activity' 
  | 'understanding' 
  | 'consistency'
  | 'alphabetical'

export interface SortOptions {
  criteria: SortCriteria
  direction: 'asc' | 'desc'
  secondaryCriteria?: SortCriteria
}

/**
 * 学生リストを優先度順でソート
 */
export function sortStudentsByPriority(
  students: PrioritizedStudent[],
  options: SortOptions = { criteria: 'priority', direction: 'desc' }
): PrioritizedStudent[] {
  return [...students].sort((a, b) => {
    const primaryComparison = compareStudents(a, b, options.criteria)
    const result = options.direction === 'desc' ? -primaryComparison : primaryComparison
    
    // If primary comparison is equal, use secondary criteria
    if (result === 0 && options.secondaryCriteria) {
      const secondaryComparison = compareStudents(a, b, options.secondaryCriteria)
      return options.direction === 'desc' ? -secondaryComparison : secondaryComparison
    }
    
    return result
  })
}

/**
 * アラートでフィルタリング
 */
export function filterStudentsByAlerts(
  students: PrioritizedStudent[],
  filters: {
    minSeverity?: AlertSeverity
    alertTypes?: string[]
    hasAlerts?: boolean
  }
): PrioritizedStudent[] {
  return students.filter(student => {
    // hasAlerts filter
    if (filters.hasAlerts !== undefined) {
      if (filters.hasAlerts && student.alerts.length === 0) return false
      if (!filters.hasAlerts && student.alerts.length > 0) return false
    }

    // minSeverity filter
    if (filters.minSeverity) {
      const severityOrder: AlertSeverity[] = ['low', 'medium', 'high', 'critical']
      const minSeverityIndex = severityOrder.indexOf(filters.minSeverity)
      
      const hasRequiredSeverity = student.alerts.some(alert => {
        const alertSeverityIndex = severityOrder.indexOf(alert.severity)
        return alertSeverityIndex >= minSeverityIndex
      })
      
      if (!hasRequiredSeverity) return false
    }

    // alertTypes filter
    if (filters.alertTypes && filters.alertTypes.length > 0) {
      const hasRequiredType = student.alerts.some(alert => 
        filters.alertTypes!.includes(alert.type)
      )
      
      if (!hasRequiredType) return false
    }

    return true
  })
}

/**
 * 学生の統計サマリーを計算
 */
export function calculateStudentStatistics(students: PrioritizedStudent[]) {
  const totalStudents = students.length
  
  if (totalStudents === 0) {
    return {
      totalStudents: 0,
      studentsWithAlerts: 0,
      alertDistribution: { critical: 0, high: 0, medium: 0, low: 0 },
      averageUnderstanding: 0,
      averageConsistency: 0,
      totalAlerts: 0,
      topConcerns: []
    }
  }

  const studentsWithAlerts = students.filter(s => s.alerts.length > 0).length
  const totalAlerts = students.reduce((sum, s) => sum + s.alerts.length, 0)

  // Alert distribution
  const alertDistribution = { critical: 0, high: 0, medium: 0, low: 0 }
  students.forEach(student => {
    student.alerts.forEach(alert => {
      alertDistribution[alert.severity]++
    })
  })

  // Average metrics
  const averageUnderstanding = students.reduce((sum, s) => sum + s.averageUnderstanding, 0) / totalStudents
  const averageConsistency = students.reduce((sum, s) => sum + s.consistencyRate, 0) / totalStudents

  // Top concerns (most common alert types)
  const alertTypeCounts: Record<string, number> = {}
  students.forEach(student => {
    student.alerts.forEach(alert => {
      alertTypeCounts[alert.type] = (alertTypeCounts[alert.type] || 0) + 1
    })
  })

  const topConcerns = Object.entries(alertTypeCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([type, count]) => ({ type, count }))

  return {
    totalStudents,
    studentsWithAlerts,
    alertDistribution,
    averageUnderstanding: Math.round(averageUnderstanding * 10) / 10,
    averageConsistency: Math.round(averageConsistency),
    totalAlerts,
    topConcerns
  }
}

/**
 * 時間帯別の学習パターン分析
 */
export function analyzeStudyPatterns(students: PrioritizedStudent[]) {
  // This would require more detailed study_inputs data with timestamps
  // For now, return basic pattern analysis
  
  const activeStudents = students.filter(s => s.lastRecordDate && getDaysSince(s.lastRecordDate) <= 7).length
  const inactiveStudents = students.filter(s => !s.lastRecordDate || getDaysSince(s.lastRecordDate) > 7).length
  const strugglingStudents = students.filter(s => s.averageUnderstanding < 3.0).length
  const consistentStudents = students.filter(s => s.consistencyRate >= 60).length

  return {
    active: activeStudents,
    inactive: inactiveStudents,
    struggling: strugglingStudents,
    consistent: consistentStudents,
    needsAttention: students.filter(s => s.priority > 50).length
  }
}

// Helper functions

function compareStudents(a: PrioritizedStudent, b: PrioritizedStudent, criteria: SortCriteria): number {
  switch (criteria) {
    case 'priority':
      return a.priority - b.priority

    case 'alerts':
      return a.alerts.length - b.alerts.length

    case 'last_activity':
      const aDays = a.lastRecordDate ? getDaysSince(a.lastRecordDate) : 999
      const bDays = b.lastRecordDate ? getDaysSince(b.lastRecordDate) : 999
      return aDays - bDays

    case 'understanding':
      return a.averageUnderstanding - b.averageUnderstanding

    case 'consistency':
      return a.consistencyRate - b.consistencyRate

    case 'alphabetical':
      return a.name.localeCompare(b.name, 'ja')

    default:
      return 0
  }
}

function getDaysSince(dateString: string): number {
  const date = new Date(dateString)
  const now = new Date()
  const diffTime = now.getTime() - date.getTime()
  return Math.floor(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * 優先度に基づく推奨アクション
 */
export function getRecommendedActions(student: PrioritizedStudent): string[] {
  const actions: string[] = []

  // Critical alerts
  const criticalAlerts = student.alerts.filter(a => a.severity === 'critical')
  if (criticalAlerts.length > 0) {
    actions.push('即座に学生に連絡を取ってください')
    actions.push('学習状況について面談を設定してください')
  }

  // High priority alerts
  const highAlerts = student.alerts.filter(a => a.severity === 'high')
  if (highAlerts.length > 0) {
    if (highAlerts.some(a => a.type === 'no_recent_records')) {
      actions.push('学習記録の継続を促してください')
    }
    if (highAlerts.some(a => a.type === 'understanding_decline')) {
      actions.push('理解度低下の原因を確認してください')
    }
    if (highAlerts.some(a => a.type === 'poor_performance')) {
      actions.push('学習方法の見直しを検討してください')
    }
  }

  // Medium priority suggestions
  const mediumAlerts = student.alerts.filter(a => a.severity === 'medium')
  if (mediumAlerts.length > 0) {
    actions.push('学習状況の確認メッセージを送ってください')
    if (mediumAlerts.some(a => a.type === 'low_consistency')) {
      actions.push('学習習慣の改善を提案してください')
    }
  }

  // General recommendations based on data
  if (student.averageUnderstanding < 3.0) {
    actions.push('理解度向上のための補習を検討してください')
  }

  if (student.consistencyRate < 40) {
    actions.push('学習計画の見直しを支援してください')
  }

  return actions.slice(0, 3) // Limit to top 3 actions
}