import { NextRequest, NextResponse } from 'next/server'
import { validateParentAuth, checkParentStudentAccess } from '@/lib/utils/parent-student-access'
import { generateAIInterpretation, generateParentCoaching, generateSimpleCoachingMessage, type WeeklyLearningData } from '@/lib/services/ai-parent-coaching'
import { createClient } from '@/lib/supabase/server'

// GET /api/parents/{parentId}/coaching?studentId=xxx
export async function GET(
  request: NextRequest,
  { params }: { params: { parentId: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('studentId')
    const parentId = params.parentId

    // Validate authentication
    const authResult = await validateParentAuth(parentId)
    if (!authResult.isValid) {
      return NextResponse.json({
        type: 'https://tools.ietf.org/html/rfc7807',
        title: 'Unauthorized',
        detail: authResult.error,
        status: 401
      }, { status: 401 })
    }

    // Validate studentId is provided
    if (!studentId) {
      return NextResponse.json({
        type: 'https://tools.ietf.org/html/rfc7807',
        title: 'Validation Error',
        detail: '生徒IDが必要です',
        status: 400
      }, { status: 400 })
    }

    // Check parent-student access
    const accessResult = await checkParentStudentAccess(parentId, studentId)
    if (!accessResult.hasAccess) {
      return NextResponse.json({
        type: 'https://tools.ietf.org/html/rfc7807',
        title: 'Forbidden',
        detail: accessResult.error || 'アクセス権限がありません',
        status: 403
      }, { status: 403 })
    }

    // Get student profile
    const supabase = await createClient()
    const { data: student, error: studentError } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url')
      .eq('id', studentId)
      .single()

    if (studentError || !student) {
      return NextResponse.json({
        type: 'https://tools.ietf.org/html/rfc7807',
        title: 'Not Found',
        detail: '生徒が見つかりません',
        status: 404
      }, { status: 404 })
    }

    // Get this week's learning data
    const weekStart = getWeekStart()
    const weekEnd = getWeekEnd()
    
    const { data: records, error: recordsError } = await supabase
      .from('study_inputs')
      .select('*')
      .eq('student_id', studentId)
      .gte('date', weekStart)
      .lte('date', weekEnd)
      .order('date', { ascending: false })

    if (recordsError) {
      console.error('Error fetching student records:', recordsError)
      return NextResponse.json({
        type: 'https://tools.ietf.org/html/rfc7807',
        title: 'Database Error',
        detail: '学習記録の取得に失敗しました',
        status: 500
      }, { status: 500 })
    }

    // Aggregate weekly data
    const weeklyData = aggregateWeeklyData(records || [])

    // Generate AI interpretation and coaching
    const interpretation = generateAIInterpretation(student.display_name, weeklyData)
    const coaching = generateParentCoaching(student.display_name, weeklyData, interpretation)
    const simpleMessage = generateSimpleCoachingMessage(student.display_name, weeklyData)

    return NextResponse.json({
      student: {
        id: student.id,
        name: student.display_name,
        avatar: student.avatar_url
      },
      weekRange: {
        start: weekStart,
        end: weekEnd
      },
      weeklyData: {
        ...weeklyData,
        subjects: weeklyData.subjects || []
      },
      aiInterpretation: interpretation,
      coaching,
      simpleMessage,
      generatedAt: new Date().toISOString()
    })

  } catch (error) {
    console.error('Parent coaching API error:', error)
    return NextResponse.json({
      type: 'https://tools.ietf.org/html/rfc7807',
      title: 'Internal Server Error',
      detail: 'サーバーエラーが発生しました',
      status: 500
    }, { status: 500 })
  }
}

// Helper functions (duplicated from dashboard route - could be refactored into shared utils)
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

function aggregateWeeklyData(records: any[]): WeeklyLearningData {
  const summary = {
    totalRecords: records.length,
    totalStudyTime: 0,
    subjects: [] as string[],
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
      consistencyScore: 0,
      improvementTrend: 'stable' as 'improving' | 'declining' | 'stable'
    },
    isEmpty: records.length === 0
  }

  if (records.length === 0) {
    return {
      ...summary,
      message: '今週の学習記録がありません'
    }
  }

  const subjectsStudied = new Set<string>()
  let totalUnderstandingScore = 0
  
  records.forEach(record => {
    // Study time
    if (record.study_time_minutes) {
      summary.totalStudyTime += record.study_time_minutes
    }

    // Subjects
    subjectsStudied.add(record.subject)

    // Understanding levels
    summary.understandingDistribution[record.understanding_level]++
    
    // Convert understanding to numeric score
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
  summary.subjects = Array.from(subjectsStudied)

  // Find most active day
  const dailyEntries = Object.entries(summary.dailyActivity)
  if (dailyEntries.length > 0) {
    const [mostActiveDate] = dailyEntries.reduce((max, current) => 
      current[1] > max[1] ? current : max
    )
    const dayNames = ['日', '月', '火', '水', '木', '金', '土']
    const dayOfWeek = new Date(mostActiveDate).getDay()
    summary.studyPattern.mostActiveDay = dayNames[dayOfWeek]
  }

  // Calculate consistency score
  const activeDays = Object.keys(summary.dailyActivity).length
  const totalWeekDays = 7
  summary.studyPattern.consistencyScore = Math.round((activeDays / totalWeekDays) * 100)

  // Simple improvement trend
  if (summary.averageUnderstanding >= 4.0) {
    summary.studyPattern.improvementTrend = 'improving'
  } else if (summary.averageUnderstanding < 3.0) {
    summary.studyPattern.improvementTrend = 'declining'
  }

  return summary
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