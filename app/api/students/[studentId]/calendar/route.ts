import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/students/{studentId}/calendar?month=YYYY-MM
export async function GET(
  request: NextRequest,
  { params }: { params: { studentId: string } }
) {
  const supabase = await createClient()

  try {
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month')
    const studentId = params.studentId

    // Validate studentId is UUID
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(studentId)) {
      return NextResponse.json({
        type: 'https://tools.ietf.org/html/rfc7807',
        title: 'Invalid Student ID',
        detail: '有効な学生IDを指定してください',
        status: 400
      }, { status: 400 })
    }

    // Validate month format
    if (month && !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({
        type: 'https://tools.ietf.org/html/rfc7807',
        title: 'Invalid Month Format',
        detail: '月の形式が正しくありません (YYYY-MM)',
        status: 400
      }, { status: 400 })
    }

    // Default to current month if not provided
    const targetMonth = month || new Date().toISOString().slice(0, 7)
    const [year, monthNum] = targetMonth.split('-').map(Number)
    
    // Calculate date range (current month + next month for better UX)
    const startDate = new Date(year, monthNum - 1, 1)
    const endDate = new Date(year, monthNum + 1, 0) // Last day of next month
    
    const startDateStr = startDate.toISOString().split('T')[0]
    const endDateStr = endDate.toISOString().split('T')[0]

    // Fetch study records for the date range
    const { data: records, error } = await supabase
      .from('study_inputs')
      .select('date, subject, understanding_level, level_type, study_time_minutes')
      .eq('student_id', studentId)
      .gte('date', startDateStr)
      .lte('date', endDateStr)
      .order('date', { ascending: true })

    if (error) {
      console.error('Error fetching calendar data:', error)
      return NextResponse.json({
        type: 'https://tools.ietf.org/html/rfc7807',
        title: 'Database Error',
        detail: '学習記録の取得に失敗しました',
        status: 500
      }, { status: 500 })
    }

    // Aggregate data by date
    const dailyData = new Map()
    
    records?.forEach(record => {
      const date = record.date
      if (!dailyData.has(date)) {
        dailyData.set(date, {
          date,
          recordCount: 0,
          subjects: new Set(),
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
          }
        })
      }
      
      const dayData = dailyData.get(date)
      dayData.recordCount++
      dayData.subjects.add(record.subject)
      dayData.understandingLevels[record.understanding_level]++
      dayData.levelTypes[record.level_type]++
      
      if (record.study_time_minutes) {
        dayData.totalStudyTime += record.study_time_minutes
      }
    })

    // Calculate intensity levels and convert to array
    const calendarData = Array.from(dailyData.values()).map(day => {
      const subjectCount = day.subjects.size
      
      // Calculate understanding score (weighted average)
      const understandingScore = (
        day.understandingLevels.excellent * 5 +
        day.understandingLevels.good * 4 +
        day.understandingLevels.normal * 3 +
        day.understandingLevels.struggling * 2 +
        day.understandingLevels.difficult * 1
      ) / Math.max(day.recordCount, 1)
      
      // Calculate intensity (0-3) based on subject count and understanding
      let intensity = 0
      if (day.recordCount > 0) {
        const baseScore = Math.min(subjectCount * 2, 6) // Max 6 for subjects
        const understandingBonus = Math.floor(understandingScore) // 1-5
        const totalScore = baseScore + understandingBonus
        
        if (totalScore >= 8) intensity = 3      // High (濃い)
        else if (totalScore >= 5) intensity = 2 // Medium (中)
        else if (totalScore >= 2) intensity = 1 // Light (薄い)
        else intensity = 0                      // None (なし)
      }
      
      return {
        date: day.date,
        recordCount: day.recordCount,
        subjectCount: day.subjects.size,
        subjects: Array.from(day.subjects),
        understandingLevels: day.understandingLevels,
        totalStudyTime: day.totalStudyTime,
        levelTypes: day.levelTypes,
        intensity,
        understandingScore: Math.round(understandingScore * 10) / 10
      }
    })

    // Generate full calendar with empty days
    const fullCalendar = []
    const currentDate = new Date(startDate)
    
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0]
      const existingData = calendarData.find(d => d.date === dateStr)
      
      fullCalendar.push(existingData || {
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
      })
      
      currentDate.setDate(currentDate.getDate() + 1)
    }

    return NextResponse.json({
      month: targetMonth,
      dateRange: {
        start: startDateStr,
        end: endDateStr
      },
      summary: {
        totalDays: fullCalendar.length,
        activeDays: calendarData.length,
        totalRecords: calendarData.reduce((sum, day) => sum + day.recordCount, 0),
        totalStudyTime: calendarData.reduce((sum, day) => sum + day.totalStudyTime, 0)
      },
      data: fullCalendar
    })

  } catch (error) {
    console.error('Calendar API error:', error)
    return NextResponse.json({
      type: 'https://tools.ietf.org/html/rfc7807',
      title: 'Internal Server Error',
      detail: 'サーバーエラーが発生しました',
      status: 500
    }, { status: 500 })
  }
}