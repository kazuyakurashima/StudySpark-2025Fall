/**
 * 週境界管理ユーティリティ（月曜開始〜日曜終了、Asia/Tokyo基準）
 */

export interface WeekPeriod {
  weekNumber: number
  year: number
  startDate: string // YYYY-MM-DD
  endDate: string   // YYYY-MM-DD
  weekId: string    // YYYY-W##
}

export interface DayOfWeek {
  dayNumber: number // 0: Sunday, 1: Monday, ..., 6: Saturday
  dayName: string
  isWeekend: boolean
  canReflect: boolean // Saturday or Sunday
}

/**
 * 指定された日付の週情報を取得（月曜開始）
 */
export function getWeekPeriod(date: Date = new Date()): WeekPeriod {
  // Asia/Tokyo timezone adjustment
  const tokyoDate = new Date(date.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }))
  
  // Get Monday of the week (start of week)
  const monday = new Date(tokyoDate)
  const dayOfWeek = tokyoDate.getDay() // 0: Sunday, 1: Monday, ..., 6: Saturday
  const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek // If Sunday, go back 6 days
  monday.setDate(tokyoDate.getDate() + daysToMonday)
  
  // Get Sunday of the week (end of week)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  
  // Calculate week number (ISO week numbering)
  const weekNumber = getWeekNumber(monday)
  const year = getWeekYear(monday)
  
  return {
    weekNumber,
    year,
    startDate: monday.toISOString().split('T')[0],
    endDate: sunday.toISOString().split('T')[0],
    weekId: `${year}-W${weekNumber.toString().padStart(2, '0')}`
  }
}

/**
 * 現在の曜日情報を取得
 */
export function getCurrentDayInfo(date: Date = new Date()): DayOfWeek {
  const tokyoDate = new Date(date.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }))
  const dayNumber = tokyoDate.getDay()
  
  const dayNames = ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日']
  
  return {
    dayNumber,
    dayName: dayNames[dayNumber],
    isWeekend: dayNumber === 0 || dayNumber === 6, // Sunday or Saturday
    canReflect: dayNumber === 0 || dayNumber === 6  // Can reflect on weekends
  }
}

/**
 * 振り返り入力が可能かチェック
 */
export function canSubmitReflection(date: Date = new Date()): {
  canSubmit: boolean
  reason: string
  nextAvailableDate?: string
} {
  const dayInfo = getCurrentDayInfo(date)
  
  if (dayInfo.canReflect) {
    return {
      canSubmit: true,
      reason: `${dayInfo.dayName}なので振り返りを入力できます`
    }
  }
  
  // Calculate next weekend
  const tokyoDate = new Date(date.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }))
  const nextSaturday = new Date(tokyoDate)
  const daysUntilSaturday = (6 - tokyoDate.getDay() + 7) % 7
  nextSaturday.setDate(tokyoDate.getDate() + (daysUntilSaturday === 0 ? 7 : daysUntilSaturday))
  
  return {
    canSubmit: false,
    reason: '振り返りは土曜日または日曜日のみ入力可能です',
    nextAvailableDate: nextSaturday.toISOString().split('T')[0]
  }
}

/**
 * 週間学習データの日付範囲を取得
 */
export function getWeekDateRange(weekId?: string): { startDate: string; endDate: string } {
  if (!weekId) {
    const currentWeek = getWeekPeriod()
    return {
      startDate: currentWeek.startDate,
      endDate: currentWeek.endDate
    }
  }
  
  // Parse weekId (YYYY-W##)
  const match = weekId.match(/^(\d{4})-W(\d{2})$/)
  if (!match) {
    throw new Error(`Invalid week ID format: ${weekId}`)
  }
  
  const year = parseInt(match[1])
  const week = parseInt(match[2])
  
  // Calculate the Monday of the specified week
  const jan1 = new Date(year, 0, 1)
  const daysToFirstMonday = (8 - jan1.getDay()) % 7
  const firstMonday = new Date(year, 0, 1 + daysToFirstMonday)
  
  const targetMonday = new Date(firstMonday)
  targetMonday.setDate(firstMonday.getDate() + (week - 1) * 7)
  
  const targetSunday = new Date(targetMonday)
  targetSunday.setDate(targetMonday.getDate() + 6)
  
  return {
    startDate: targetMonday.toISOString().split('T')[0],
    endDate: targetSunday.toISOString().split('T')[0]
  }
}

/**
 * 過去の週一覧を取得
 */
export function getPastWeeks(weeksCount: number = 8): WeekPeriod[] {
  const weeks: WeekPeriod[] = []
  const today = new Date()
  
  for (let i = 0; i < weeksCount; i++) {
    const targetDate = new Date(today)
    targetDate.setDate(today.getDate() - (i * 7))
    
    const weekPeriod = getWeekPeriod(targetDate)
    weeks.push(weekPeriod)
  }
  
  return weeks.reverse() // 古い週から新しい週の順序
}

/**
 * 振り返り締切チェック
 */
export function getReflectionDeadline(weekId: string): {
  deadline: string
  isOverdue: boolean
  daysRemaining: number
} {
  const { endDate } = getWeekDateRange(weekId)
  const deadline = new Date(endDate)
  deadline.setDate(deadline.getDate() + 1) // Monday after the week ends
  
  const now = new Date()
  const tokyoNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }))
  
  const diffTime = deadline.getTime() - tokyoNow.getTime()
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  return {
    deadline: deadline.toISOString().split('T')[0],
    isOverdue: daysRemaining < 0,
    daysRemaining: Math.max(0, daysRemaining)
  }
}

/**
 * 週番号を表示用に整形
 */
export function formatWeekDisplay(weekPeriod: WeekPeriod): string {
  const startDate = new Date(weekPeriod.startDate)
  const endDate = new Date(weekPeriod.endDate)
  
  const startMonth = startDate.getMonth() + 1
  const startDay = startDate.getDate()
  const endMonth = endDate.getMonth() + 1
  const endDay = endDate.getDate()
  
  if (startMonth === endMonth) {
    return `${startMonth}月${startDay}日〜${endDay}日`
  } else {
    return `${startMonth}月${startDay}日〜${endMonth}月${endDay}日`
  }
}

// Helper functions

function getWeekNumber(date: Date): number {
  // ISO week numbering
  const thursday = new Date(date)
  thursday.setDate(date.getDate() + (4 - (date.getDay() || 7)))
  
  const yearStart = new Date(thursday.getFullYear(), 0, 1)
  const weekNumber = Math.ceil((((thursday.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  
  return weekNumber
}

function getWeekYear(date: Date): number {
  // ISO week year (may differ from calendar year for early January/late December)
  const thursday = new Date(date)
  thursday.setDate(date.getDate() + (4 - (date.getDay() || 7)))
  
  return thursday.getFullYear()
}

/**
 * 学習継続性分析用のヘルパー
 */
export function analyzeWeeklyConsistency(studyDates: string[]): {
  studyDays: number
  weekdays: number
  weekends: number
  longestStreak: number
  gaps: number[]
} {
  if (studyDates.length === 0) {
    return {
      studyDays: 0,
      weekdays: 0,
      weekends: 0,
      longestStreak: 0,
      gaps: []
    }
  }
  
  const dates = studyDates.map(d => new Date(d)).sort((a, b) => a.getTime() - b.getTime())
  
  let weekdays = 0
  let weekends = 0
  let longestStreak = 1
  let currentStreak = 1
  const gaps: number[] = []
  
  dates.forEach((date, index) => {
    const dayOfWeek = date.getDay()
    
    // Count weekdays vs weekends
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      weekends++
    } else {
      weekdays++
    }
    
    // Calculate streaks and gaps
    if (index > 0) {
      const prevDate = dates[index - 1]
      const daysDiff = Math.round((date.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24))
      
      if (daysDiff === 1) {
        currentStreak++
      } else {
        longestStreak = Math.max(longestStreak, currentStreak)
        currentStreak = 1
        if (daysDiff > 1) {
          gaps.push(daysDiff - 1)
        }
      }
    }
  })
  
  longestStreak = Math.max(longestStreak, currentStreak)
  
  return {
    studyDays: dates.length,
    weekdays,
    weekends,
    longestStreak,
    gaps
  }
}