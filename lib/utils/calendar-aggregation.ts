import { type UnderstandingLevel } from '@/lib/schemas/study-record'

export interface DayData {
  date: string
  recordCount: number
  subjectCount: number
  subjects: string[]
  understandingLevels: Record<UnderstandingLevel, number>
  totalStudyTime: number
  levelTypes: {
    spark: number
    flame: number
    blaze: number
  }
  intensity: number // 0-3
  understandingScore: number // 1-5 average
}

export interface CalendarSummary {
  totalDays: number
  activeDays: number
  totalRecords: number
  totalStudyTime: number
  averageUnderstanding: number
  streakDays: number
}

/**
 * Calculate calendar intensity based on activity
 * @param subjectCount Number of unique subjects studied
 * @param understandingScore Weighted understanding average (1-5)
 * @returns Intensity level 0-3
 */
export function calculateIntensity(subjectCount: number, understandingScore: number): number {
  if (subjectCount === 0) return 0
  
  const baseScore = Math.min(subjectCount * 2, 6) // Max 6 for subjects
  const understandingBonus = Math.floor(understandingScore) // 1-5
  const totalScore = baseScore + understandingBonus
  
  if (totalScore >= 8) return 3      // High (濃い)
  else if (totalScore >= 5) return 2 // Medium (中)
  else if (totalScore >= 2) return 1 // Light (薄い)
  else return 0                      // None (なし)
}

/**
 * Calculate weighted understanding score
 * @param levels Understanding level counts
 * @param totalRecords Total number of records
 * @returns Weighted average (1-5)
 */
export function calculateUnderstandingScore(
  levels: Record<UnderstandingLevel, number>,
  totalRecords: number
): number {
  if (totalRecords === 0) return 0
  
  const score = (
    levels.excellent * 5 +
    levels.good * 4 +
    levels.normal * 3 +
    levels.struggling * 2 +
    levels.difficult * 1
  ) / totalRecords
  
  return Math.round(score * 10) / 10
}

/**
 * Get CSS class for intensity level
 * @param intensity Intensity level 0-3
 * @returns CSS class string
 */
export function getIntensityClass(intensity: number): string {
  const classes = {
    0: 'bg-slate-50 border-slate-100', // None
    1: 'bg-primary/20 border-primary/30', // Light
    2: 'bg-primary/50 border-primary/60', // Medium
    3: 'bg-primary/80 border-primary/90 text-white' // High
  }
  
  return classes[intensity as keyof typeof classes] || classes[0]
}

/**
 * Calculate learning streak
 * @param calendarData Array of day data sorted by date
 * @returns Number of consecutive days with activity
 */
export function calculateStreak(calendarData: DayData[]): number {
  let streak = 0
  const sortedData = [...calendarData].reverse() // Start from most recent
  
  for (const day of sortedData) {
    if (day.recordCount > 0) {
      streak++
    } else if (streak > 0) {
      break // End streak on first gap
    }
  }
  
  return streak
}

/**
 * Generate month navigation helpers
 * @param currentMonth Current month in YYYY-MM format
 * @returns Navigation helpers
 */
export function getMonthNavigation(currentMonth: string) {
  const [year, month] = currentMonth.split('-').map(Number)
  const date = new Date(year, month - 1, 1)
  
  const prevMonth = new Date(date)
  prevMonth.setMonth(prevMonth.getMonth() - 1)
  
  const nextMonth = new Date(date)
  nextMonth.setMonth(nextMonth.getMonth() + 1)
  
  const formatMonth = (d: Date) => 
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  
  return {
    current: {
      year,
      month,
      monthName: date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' })
    },
    prev: {
      month: formatMonth(prevMonth),
      monthName: prevMonth.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' })
    },
    next: {
      month: formatMonth(nextMonth),
      monthName: nextMonth.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' })
    },
    isCurrentMonth: formatMonth(new Date()) === currentMonth
  }
}

/**
 * Generate calendar grid with proper week structure
 * @param calendarData Day data array
 * @param targetMonth Target month in YYYY-MM format
 * @returns Grid data with weeks
 */
export function generateCalendarGrid(calendarData: DayData[], targetMonth: string) {
  const [year, month] = targetMonth.split('-').map(Number)
  const firstDay = new Date(year, month - 1, 1)
  const lastDay = new Date(year, month, 0)
  
  // Start from Sunday (0) of the week containing the 1st
  const startDate = new Date(firstDay)
  startDate.setDate(startDate.getDate() - firstDay.getDay())
  
  // End on Saturday of the week containing the last day
  const endDate = new Date(lastDay)
  endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()))
  
  const weeks = []
  const currentWeek = []
  const currentDate = new Date(startDate)
  
  while (currentDate <= endDate) {
    const dateStr = currentDate.toISOString().split('T')[0]
    const dayData = calendarData.find(d => d.date === dateStr)
    const isCurrentMonth = currentDate.getMonth() === month - 1
    
    currentWeek.push({
      date: dateStr,
      day: currentDate.getDate(),
      isCurrentMonth,
      isToday: dateStr === new Date().toISOString().split('T')[0],
      data: dayData || {
        date: dateStr,
        recordCount: 0,
        subjectCount: 0,
        subjects: [],
        understandingLevels: {
          excellent: 0,
          good: 0,
          normal: 0,
          struggling: 0,
          difficult: 0
        },
        totalStudyTime: 0,
        levelTypes: {
          spark: 0,
          flame: 0,
          blaze: 0
        },
        intensity: 0,
        understandingScore: 0
      }
    })
    
    if (currentWeek.length === 7) {
      weeks.push([...currentWeek])
      currentWeek.length = 0
    }
    
    currentDate.setDate(currentDate.getDate() + 1)
  }
  
  return weeks
}