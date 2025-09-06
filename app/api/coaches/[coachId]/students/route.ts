import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { detectAlerts, calculatePriority, type StudentAlert } from '@/lib/services/alert-detection'

interface StudentSummary {
  id: string
  name: string
  email?: string
  lastRecordDate?: string
  totalRecords: number
  averageUnderstanding: number
  consistencyRate: number
  strongSubjects: string[]
  weakSubjects: string[]
  alerts: StudentAlert[]
  priority: number
}

interface CoachStudentsResponse {
  students: StudentSummary[]
  totalStudents: number
  alertCount: number
  lastUpdated: string
}

// GET /api/coaches/[coachId]/students
export async function GET(
  request: NextRequest,
  { params }: { params: { coachId: string } }
) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({
        type: 'https://tools.ietf.org/html/rfc7807',
        title: 'Unauthorized',
        detail: '認証が必要です',
        status: 401
      }, { status: 401 })
    }

    // Validate coach ID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.coachId)) {
      return NextResponse.json({
        type: 'https://tools.ietf.org/html/rfc7807',
        title: 'Validation Error',
        detail: '有効なコーチIDを指定してください',
        status: 400
      }, { status: 400 })
    }

    // Check if user has access to this coach's data
    const hasAccess = await checkCoachAccess(supabase, user.id, params.coachId)
    if (!hasAccess) {
      return NextResponse.json({
        type: 'https://tools.ietf.org/html/rfc7807',
        title: 'Forbidden',
        detail: 'このコーチの情報にアクセスする権限がありません',
        status: 403
      }, { status: 403 })
    }

    // Get students assigned to this coach
    const students = await getCoachStudents(supabase, params.coachId)
    
    // Calculate alerts and priorities for all students
    const studentsWithAlerts = await Promise.all(
      students.map(async (student) => {
        const alerts = await detectAlerts(supabase, student.id)
        const priority = calculatePriority(student, alerts)
        
        return {
          ...student,
          alerts,
          priority
        }
      })
    )

    // Sort by priority (highest first)
    const sortedStudents = studentsWithAlerts.sort((a, b) => b.priority - a.priority)

    const totalAlerts = sortedStudents.reduce((sum, student) => sum + student.alerts.length, 0)

    return NextResponse.json({
      students: sortedStudents,
      totalStudents: sortedStudents.length,
      alertCount: totalAlerts,
      lastUpdated: new Date().toISOString()
    })

  } catch (error) {
    console.error('Coach students API error:', error)
    return NextResponse.json({
      type: 'https://tools.ietf.org/html/rfc7807',
      title: 'Internal Server Error',
      detail: 'サーバーエラーが発生しました',
      status: 500
    }, { status: 500 })
  }
}

/**
 * コーチアクセス権限確認
 */
async function checkCoachAccess(supabase: any, userId: string, coachId: string): Promise<boolean> {
  try {
    // Check if the authenticated user is the coach themselves
    const { data: coachProfile } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('id', coachId)
      .eq('role', 'coach')
      .single()

    if (coachProfile && coachProfile.user_id === userId) {
      return true
    }

    // TODO: Add organization admin access check
    // const { data: adminProfile } = await supabase
    //   .from('profiles')
    //   .select('id')
    //   .eq('user_id', userId)
    //   .eq('role', 'admin')
    //   .single()

    return false
  } catch (error) {
    console.error('Error checking coach access:', error)
    return false
  }
}

/**
 * コーチの担当生徒一覧を取得
 */
async function getCoachStudents(supabase: any, coachId: string): Promise<StudentSummary[]> {
  try {
    // TODO: Implement proper coach-student relationship via memberships table
    // For now, return mock data based on the same organization
    
    // Get all students (temporary implementation)
    const { data: students, error: studentsError } = await supabase
      .from('profiles')
      .select('id, full_name, email, user_id')
      .eq('role', 'student')

    if (studentsError) {
      console.error('Error fetching students:', studentsError)
      return []
    }

    // Get study data for each student
    const studentsWithData = await Promise.all(
      (students || []).map(async (student) => {
        const studyData = await getStudentStudyData(supabase, student.id)
        
        return {
          id: student.id,
          name: student.full_name || 'Unknown Student',
          email: student.email,
          lastRecordDate: studyData.lastRecordDate,
          totalRecords: studyData.totalRecords,
          averageUnderstanding: studyData.averageUnderstanding,
          consistencyRate: studyData.consistencyRate,
          strongSubjects: studyData.strongSubjects,
          weakSubjects: studyData.weakSubjects,
          alerts: [], // Will be populated by detectAlerts
          priority: 0 // Will be calculated later
        }
      })
    )

    return studentsWithData

  } catch (error) {
    console.error('Error in getCoachStudents:', error)
    return []
  }
}

/**
 * 学生の学習データサマリーを取得
 */
async function getStudentStudyData(supabase: any, studentId: string) {
  try {
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

    // Calculate metrics
    const subjectCounts: Record<string, number> = {}
    let totalUnderstanding = 0
    let understandingCount = 0
    const activeDays = new Set<string>()

    studyRecords.forEach(record => {
      // Subject tracking
      subjectCounts[record.subject] = (subjectCounts[record.subject] || 0) + 1

      // Understanding score
      const understandingScore = getUnderstandingScore(record.understanding_level)
      totalUnderstanding += understandingScore
      understandingCount++

      // Active days
      activeDays.add(record.date)
    })

    const averageUnderstanding = understandingCount > 0 ? totalUnderstanding / understandingCount : 0
    const consistencyRate = Math.round((activeDays.size / 30) * 100)

    // Strong/weak subjects
    const sortedSubjects = Object.entries(subjectCounts)
      .sort(([, a], [, b]) => b - a)
      .map(([subject]) => subject)

    const strongSubjects = sortedSubjects.slice(0, 2)
    const weakSubjects = sortedSubjects.length > 2 ? [sortedSubjects[sortedSubjects.length - 1]] : []

    return {
      lastRecordDate: studyRecords.length > 0 ? studyRecords[0].date : undefined,
      totalRecords: studyRecords.length,
      averageUnderstanding: Math.round(averageUnderstanding * 10) / 10,
      consistencyRate,
      strongSubjects,
      weakSubjects
    }

  } catch (error) {
    console.error('Error fetching student study data:', error)
    return {
      lastRecordDate: undefined,
      totalRecords: 0,
      averageUnderstanding: 0,
      consistencyRate: 0,
      strongSubjects: [],
      weakSubjects: []
    }
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