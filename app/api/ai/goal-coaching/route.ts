import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { AIGoalCoach, type CoachingSession, type StudentLearningData } from '@/lib/services/ai-goal-coaching'

interface CoachingRequest {
  action: 'start' | 'message'
  studentId: string
  sessionId?: string
  message?: string
}

// POST /api/ai/goal-coaching
export async function POST(request: NextRequest) {
  try {
    // Check if OpenAI API key is configured
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({
        type: 'https://tools.ietf.org/html/rfc7807',
        title: 'Service Unavailable',
        detail: 'AI機能が利用できません',
        status: 503
      }, { status: 503 })
    }

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

    // Parse request body
    let body: CoachingRequest
    try {
      body = await request.json()
    } catch (error) {
      return NextResponse.json({
        type: 'https://tools.ietf.org/html/rfc7807',
        title: 'Invalid Request Body',
        detail: 'リクエストボディが正しくありません',
        status: 400
      }, { status: 400 })
    }

    // Validate required fields
    if (!body.action || !body.studentId) {
      return NextResponse.json({
        type: 'https://tools.ietf.org/html/rfc7807',
        title: 'Validation Error',
        detail: 'actionとstudentIdが必要です',
        status: 400
      }, { status: 400 })
    }

    if (!['start', 'message'].includes(body.action)) {
      return NextResponse.json({
        type: 'https://tools.ietf.org/html/rfc7807',
        title: 'Validation Error',
        detail: 'actionはstartまたはmessageである必要があります',
        status: 400
      }, { status: 400 })
    }

    // Validate student ID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.studentId)) {
      return NextResponse.json({
        type: 'https://tools.ietf.org/html/rfc7807',
        title: 'Validation Error',
        detail: '有効な学生IDを指定してください',
        status: 400
      }, { status: 400 })
    }

    // Check if user has access to this student
    const hasAccess = await checkStudentAccess(supabase, user.id, body.studentId)
    if (!hasAccess) {
      return NextResponse.json({
        type: 'https://tools.ietf.org/html/rfc7807',
        title: 'Forbidden',
        detail: 'この学生の情報にアクセスする権限がありません',
        status: 403
      }, { status: 403 })
    }

    if (body.action === 'start') {
      return await handleStartSession(supabase, body.studentId)
    } else if (body.action === 'message') {
      if (!body.sessionId || !body.message) {
        return NextResponse.json({
          type: 'https://tools.ietf.org/html/rfc7807',
          title: 'Validation Error',
          detail: 'sessionIdとmessageが必要です',
          status: 400
        }, { status: 400 })
      }

      if (body.message.length > 1000) {
        return NextResponse.json({
          type: 'https://tools.ietf.org/html/rfc7807',
          title: 'Validation Error',
          detail: 'メッセージは1000文字以内にしてください',
          status: 400
        }, { status: 400 })
      }

      return await handleMessageSession(supabase, body.sessionId, body.message)
    }

  } catch (error) {
    console.error('AI goal coaching API error:', error)
    
    if (error instanceof Error && error.message.includes('fetch')) {
      return NextResponse.json({
        type: 'https://tools.ietf.org/html/rfc7807',
        title: 'AI Service Error',
        detail: 'AI サービスに接続できませんでした',
        status: 502
      }, { status: 502 })
    }

    return NextResponse.json({
      type: 'https://tools.ietf.org/html/rfc7807',
      title: 'Internal Server Error',
      detail: 'サーバーエラーが発生しました',
      status: 500
    }, { status: 500 })
  }
}

/**
 * 新しいコーチングセッションを開始
 */
async function handleStartSession(supabase: any, studentId: string) {
  try {
    // Get student learning data
    const studentData = await fetchStudentLearningData(supabase, studentId)
    
    // Start coaching session
    const session = await AIGoalCoach.startSession(studentId, studentData)
    
    // Generate initial coaching message
    const initialMessage = generateInitialMessage(studentData)
    
    // Add initial coach message to session
    session.conversationHistory.push({
      role: 'coach',
      content: initialMessage,
      timestamp: new Date().toISOString(),
      phase: 'goal'
    })

    return NextResponse.json({
      sessionId: session.id,
      phase: session.phase,
      message: initialMessage,
      studentData: {
        averageUnderstanding: studentData.averageUnderstanding,
        consistencyRate: studentData.consistencyRate,
        totalRecords: studentData.totalRecords,
        strongSubjects: studentData.strongSubjects,
        weakSubjects: studentData.weakSubjects
      }
    })

  } catch (error) {
    console.error('Error starting coaching session:', error)
    return NextResponse.json({
      type: 'https://tools.ietf.org/html/rfc7807',
      title: 'Session Start Error',
      detail: 'コーチングセッションの開始に失敗しました',
      status: 500
    }, { status: 500 })
  }
}

/**
 * メッセージベースのコーチングセッション処理
 */
async function handleMessageSession(supabase: any, sessionId: string, message: string) {
  try {
    // TODO: 実際のアプリでは、セッションデータをDBから取得・保存する
    // 現在は簡易的にメモリ内で処理（セッション管理の実装は今回のスコープ外）
    
    // For now, create a minimal session for demonstration
    const mockSession: CoachingSession = {
      id: sessionId,
      studentId: '550e8400-e29b-41d4-a716-446655440000', // Mock student ID
      phase: 'goal',
      conversationHistory: [],
      studentData: await fetchStudentLearningData(supabase, '550e8400-e29b-41d4-a716-446655440000'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    const { session: updatedSession, response } = await AIGoalCoach.processMessage(
      mockSession,
      message
    )

    return NextResponse.json({
      sessionId: updatedSession.id,
      phase: updatedSession.phase,
      message: response.message,
      nextPhase: response.nextPhase,
      suggestions: response.suggestions,
      goalDraft: response.goalDraft,
      isComplete: response.isComplete
    })

  } catch (error) {
    console.error('Error processing coaching message:', error)
    return NextResponse.json({
      type: 'https://tools.ietf.org/html/rfc7807',
      title: 'Message Processing Error',
      detail: 'メッセージの処理に失敗しました',
      status: 500
    }, { status: 500 })
  }
}

/**
 * 学生の学習データを取得
 */
async function fetchStudentLearningData(supabase: any, studentId: string): Promise<StudentLearningData> {
  try {
    // Get recent study records (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const startDate = thirtyDaysAgo.toISOString().split('T')[0]

    const { data: records, error } = await supabase
      .from('study_inputs')
      .select('*')
      .eq('student_id', studentId)
      .gte('date', startDate)
      .order('date', { ascending: false })

    if (error) {
      console.error('Error fetching student records:', error)
      throw new Error('学習データの取得に失敗しました')
    }

    const studyRecords = records || []

    // Calculate learning metrics
    const recentScores: number[] = []
    const studyTimeHistory: number[] = []
    const subjectCounts: Record<string, number> = {}
    let totalUnderstanding = 0
    let understandingCount = 0
    let activeDays = new Set<string>()

    studyRecords.forEach(record => {
      // Study time
      if (record.study_time_minutes) {
        studyTimeHistory.push(record.study_time_minutes)
      }

      // Subject tracking
      subjectCounts[record.subject] = (subjectCounts[record.subject] || 0) + 1

      // Understanding score
      const understandingScore = getUnderstandingScore(record.understanding_level)
      totalUnderstanding += understandingScore
      understandingCount++

      // Active days
      activeDays.add(record.date)

      // Mock scores (would need actual score data from tests/assessments)
      const mockScore = Math.round(understandingScore * 20) // Convert 1-5 to 20-100
      recentScores.push(mockScore)
    })

    // Calculate averages and insights
    const averageUnderstanding = understandingCount > 0 ? totalUnderstanding / understandingCount : 0
    const consistencyRate = Math.round((activeDays.size / 30) * 100)

    // Identify strong/weak subjects
    const sortedSubjects = Object.entries(subjectCounts)
      .sort(([, a], [, b]) => b - a)
      .map(([subject]) => subject)

    const strongSubjects = sortedSubjects.slice(0, 2)
    const weakSubjects = sortedSubjects.length > 2 ? [sortedSubjects[sortedSubjects.length - 1]] : []

    return {
      recentScores: recentScores.slice(0, 10), // Last 10 scores
      studyTimeHistory: studyTimeHistory.slice(0, 10), // Last 10 study sessions
      consistencyRate,
      strongSubjects,
      weakSubjects,
      averageUnderstanding: Math.round(averageUnderstanding * 10) / 10,
      totalRecords: studyRecords.length
    }

  } catch (error) {
    console.error('Error in fetchStudentLearningData:', error)
    // Return default data if fetch fails
    return {
      recentScores: [],
      studyTimeHistory: [],
      consistencyRate: 0,
      strongSubjects: [],
      weakSubjects: [],
      averageUnderstanding: 0,
      totalRecords: 0
    }
  }
}

/**
 * 理解度レベルを数値スコアに変換
 */
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

/**
 * 学生へのアクセス権限をチェック
 */
async function checkStudentAccess(supabase: any, userId: string, studentId: string): Promise<boolean> {
  try {
    // Check if the authenticated user is the student themselves
    const { data: studentProfile } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('id', studentId)
      .eq('role', 'student')
      .single()

    if (studentProfile && studentProfile.user_id === userId) {
      return true
    }

    // Check if the user is a parent of this student
    const { data: parentProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .eq('role', 'parent')
      .single()

    if (parentProfile) {
      const { data: relation } = await supabase
        .from('parent_student_relations')
        .select('*')
        .eq('parent_id', parentProfile.id)
        .eq('student_id', studentId)
        .single()

      if (relation) return true
    }

    // Check if the user is a coach for this student
    const { data: coachProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .eq('role', 'coach')
      .single()

    if (coachProfile) {
      // TODO: Check coach-student relationship in memberships table
      // This would require implementing the coach-student relationship schema
      return true // Temporarily allow coach access
    }

    return false
  } catch (error) {
    console.error('Error checking student access:', error)
    return false
  }
}

/**
 * 初回コーチングメッセージを生成
 */
function generateInitialMessage(studentData: StudentLearningData): string {
  const { totalRecords, averageUnderstanding, strongSubjects, consistencyRate } = studentData

  if (totalRecords === 0) {
    return `こんにちは！AI目標コーチです。今日は一緒に学習目標を設定してみましょう！

まずは、どの科目や分野で成長したいか教えてください。具体的にどんなことができるようになりたいですか？`
  }

  const encouragement = averageUnderstanding >= 4 
    ? 'とても良いペースで学習が続いていますね！'
    : averageUnderstanding >= 3 
    ? '着実に学習を続けていて素晴らしいです！'
    : '学習記録をつけているのが素晴らしいですね！'

  const subjectMention = strongSubjects.length > 0 
    ? `特に${strongSubjects[0]}が得意なようですね。`
    : ''

  return `こんにちは！AI目標コーチです。${encouragement} ${subjectMention}

これまでの学習データを見せてもらいましたが、次のステップとして何か新しい目標を設定してみませんか？

どの科目や分野で、どんな成長を目指したいか教えてください！`
}