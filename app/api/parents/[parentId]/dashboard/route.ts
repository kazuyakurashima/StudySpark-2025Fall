import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/parents/{parentId}/dashboard
export async function GET(
  request: NextRequest,
  { params }: { params: { parentId: string } }
) {
  const supabase = await createClient()

  try {
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const parentId = params.parentId

    // Validate parentId is UUID
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(parentId)) {
      return NextResponse.json({
        type: 'https://tools.ietf.org/html/rfc7807',
        title: 'Invalid Parent ID',
        detail: '有効な保護者IDを指定してください',
        status: 400
      }, { status: 400 })
    }

    // Get parent's children with their profiles
    const { data: children, error: childrenError } = await supabase
      .from('parent_student_relations')
      .select(`
        student_id,
        profiles!inner(
          id,
          display_name,
          avatar_url
        )
      `)
      .eq('parent_id', parentId)

    if (childrenError) {
      console.error('Error fetching children:', childrenError)
      return NextResponse.json({
        type: 'https://tools.ietf.org/html/rfc7807',
        title: 'Database Error',
        detail: '子供の情報取得に失敗しました',
        status: 500
      }, { status: 500 })
    }

    if (!children || children.length === 0) {
      return NextResponse.json({
        children: [],
        message: '関連する生徒が見つかりません'
      })
    }

    // Get this week's learning data for each child
    const weekStart = getWeekStart()
    const weekEnd = getWeekEnd()
    
    const childrenData = await Promise.all(
      children.map(async (child) => {
        const studentId = child.student_id
        
        // Get this week's study records
        const { data: records, error: recordsError } = await supabase
          .from('study_inputs')
          .select('*')
          .eq('student_id', studentId)
          .gte('date', weekStart)
          .lte('date', weekEnd)
          .order('date', { ascending: false })

        if (recordsError) {
          console.error(`Error fetching records for student ${studentId}:`, recordsError)
          return {
            student: child.profiles,
            weeklyData: null,
            error: 'データ取得エラー'
          }
        }

        // Aggregate weekly data
        const weeklyData = aggregateWeeklyData(records || [])
        
        return {
          student: child.profiles,
          weeklyData,
          error: null
        }
      })
    )

    return NextResponse.json({
      children: childrenData,
      weekRange: {
        start: weekStart,
        end: weekEnd
      },
      generatedAt: new Date().toISOString()
    })

  } catch (error) {
    console.error('Parent dashboard API error:', error)
    return NextResponse.json({
      type: 'https://tools.ietf.org/html/rfc7807',
      title: 'Internal Server Error',
      detail: 'サーバーエラーが発生しました',
      status: 500
    }, { status: 500 })
  }
}

// Helper functions
function getWeekStart(): string {
  const now = new Date()
  const dayOfWeek = now.getDay()
  const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1 // Monday = 0
  const monday = new Date(now)
  monday.setDate(monday.getDate() - daysToSubtract)
  return monday.toISOString().split('T')[0]
}

function getWeekEnd(): string {
  const now = new Date()
  const dayOfWeek = now.getDay()
  const daysToAdd = dayOfWeek === 0 ? 0 : 7 - dayOfWeek // Sunday = 0
  const sunday = new Date(now)
  sunday.setDate(sunday.getDate() + daysToAdd)
  return sunday.toISOString().split('T')[0]
}

function aggregateWeeklyData(records: any[]) {
  const summary = {
    totalRecords: records.length,
    totalStudyTime: 0,
    subjectsStudied: new Set<string>(),
    averageUnderstanding: 0,
    dailyActivity: {} as Record<string, number>,
    understandingDistribution: {
      excellent: 0,
      good: 0,
      normal: 0,
      struggling: 0,
      difficult: 0
    },
    levelTypeDistribution: {
      spark: 0,
      flame: 0,
      blaze: 0
    },
    studyPattern: {
      mostActiveDay: '',
      consistencyScore: 0, // 0-100
      improvementTrend: 'stable' as 'improving' | 'declining' | 'stable'
    }
  }

  if (records.length === 0) {
    return {
      ...summary,
      isEmpty: true,
      message: '今週の学習記録がありません'
    }
  }

  // Calculate basic metrics
  let totalUnderstandingScore = 0
  
  records.forEach(record => {
    // Study time
    if (record.study_time_minutes) {
      summary.totalStudyTime += record.study_time_minutes
    }

    // Subjects
    summary.subjectsStudied.add(record.subject)

    // Understanding levels
    summary.understandingDistribution[record.understanding_level]++
    
    // Convert understanding to numeric score for average
    const understandingScore = getUnderstandingScore(record.understanding_level)
    totalUnderstandingScore += understandingScore

    // Level types
    summary.levelTypeDistribution[record.level_type]++

    // Daily activity
    const date = record.date
    summary.dailyActivity[date] = (summary.dailyActivity[date] || 0) + 1
  })

  // Calculate averages
  summary.averageUnderstanding = totalUnderstandingScore / records.length

  // Find most active day
  const dailyEntries = Object.entries(summary.dailyActivity)
  if (dailyEntries.length > 0) {
    const [mostActiveDate, count] = dailyEntries.reduce((max, current) => 
      current[1] > max[1] ? current : max
    )
    const dayNames = ['日', '月', '火', '水', '木', '金', '土']
    const dayOfWeek = new Date(mostActiveDate).getDay()
    summary.studyPattern.mostActiveDay = dayNames[dayOfWeek]
  }

  // Calculate consistency score (0-100)
  const activeDays = Object.keys(summary.dailyActivity).length
  const totalWeekDays = 7
  summary.studyPattern.consistencyScore = Math.round((activeDays / totalWeekDays) * 100)

  // Simple improvement trend (would need historical data for real implementation)
  if (summary.averageUnderstanding >= 4.0) {
    summary.studyPattern.improvementTrend = 'improving'
  } else if (summary.averageUnderstanding < 3.0) {
    summary.studyPattern.improvementTrend = 'declining'
  }

  return {
    ...summary,
    subjects: Array.from(summary.subjectsStudied),
    isEmpty: false
  }
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