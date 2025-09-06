import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { AIReflectionService, type WeeklyReflectionData, type AIReflectionResponse } from '@/lib/services/ai-reflection'
import { getWeekPeriod, canSubmitReflection } from '@/lib/utils/week-boundaries'

interface ReflectionRequest {
  goodPoints: string[]
  improvements: string[]
  goals?: string[]
  feelings?: string
  weekId?: string // Optional, defaults to current week
}

interface ReflectionResponse extends AIReflectionResponse {
  weekId: string
  submittedAt: string
  canReflectToday: boolean
}

// POST /api/ai/reflection-feedback
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

    // Check if user is a student
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('user_id', user.id)
      .single()

    if (!profile || profile.role !== 'student') {
      return NextResponse.json({
        type: 'https://tools.ietf.org/html/rfc7807',
        title: 'Forbidden',
        detail: '学生のみがこの機能を利用できます',
        status: 403
      }, { status: 403 })
    }

    // Validate reflection submission timing
    const reflectionCheck = canSubmitReflection()
    if (!reflectionCheck.canSubmit) {
      return NextResponse.json({
        type: 'https://tools.ietf.org/html/rfc7807',
        title: 'Timing Error',
        detail: reflectionCheck.reason,
        status: 400,
        nextAvailableDate: reflectionCheck.nextAvailableDate
      }, { status: 400 })
    }

    // Parse request body
    let body: ReflectionRequest
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
    if (!body.goodPoints || !Array.isArray(body.goodPoints) || body.goodPoints.length === 0) {
      return NextResponse.json({
        type: 'https://tools.ietf.org/html/rfc7807',
        title: 'Validation Error',
        detail: '良かった点を少なくとも1つ入力してください',
        status: 400
      }, { status: 400 })
    }

    if (!body.improvements || !Array.isArray(body.improvements) || body.improvements.length === 0) {
      return NextResponse.json({
        type: 'https://tools.ietf.org/html/rfc7807',
        title: 'Validation Error',
        detail: '改善したい点を少なくとも1つ入力してください',
        status: 400
      }, { status: 400 })
    }

    // Validate content length
    const allText = [...body.goodPoints, ...body.improvements, ...(body.goals || []), body.feelings || ''].join(' ')
    if (allText.length > 2000) {
      return NextResponse.json({
        type: 'https://tools.ietf.org/html/rfc7807',
        title: 'Validation Error',
        detail: '入力内容が長すぎます（2000文字以内にしてください）',
        status: 400
      }, { status: 400 })
    }

    // Determine target week
    const weekPeriod = body.weekId ? 
      { ...getWeekPeriod(), weekId: body.weekId } : // Simple override for now
      getWeekPeriod()

    // Create reflection data
    const reflectionData: WeeklyReflectionData = {
      weekId: weekPeriod.weekId,
      weekPeriod,
      goodPoints: body.goodPoints.filter(p => p.trim().length > 0),
      improvements: body.improvements.filter(p => p.trim().length > 0),
      goals: body.goals?.filter(g => g.trim().length > 0),
      feelings: body.feelings?.trim()
    }

    // Analyze weekly study data
    const studyData = await AIReflectionService.analyzeWeeklyStudyData(
      supabase, 
      profile.id, 
      weekPeriod.weekId
    )

    // Generate AI feedback
    const aiFeedback = await AIReflectionService.generateReflectionFeedback(
      reflectionData, 
      studyData
    )

    // Store reflection in database
    const { error: insertError } = await supabase
      .from('reflections')
      .insert({
        student_id: profile.id,
        week_id: weekPeriod.weekId,
        week_start_date: weekPeriod.startDate,
        week_end_date: weekPeriod.endDate,
        good_points: reflectionData.goodPoints,
        improvements: reflectionData.improvements,
        goals: reflectionData.goals || [],
        feelings: reflectionData.feelings,
        ai_feedback: aiFeedback,
        submitted_at: new Date().toISOString()
      })
      .select()

    if (insertError) {
      console.error('Error saving reflection:', insertError)
      // Continue anyway - the feedback is more important than storage
    }

    const response: ReflectionResponse = {
      ...aiFeedback,
      weekId: weekPeriod.weekId,
      submittedAt: new Date().toISOString(),
      canReflectToday: true
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('AI reflection feedback API error:', error)
    
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

// GET /api/ai/reflection-feedback - Get past reflections
export async function GET(request: NextRequest) {
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

    // Get student profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('user_id', user.id)
      .single()

    if (!profile || profile.role !== 'student') {
      return NextResponse.json({
        type: 'https://tools.ietf.org/html/rfc7807',
        title: 'Forbidden',
        detail: '学生のみがこの機能を利用できます',
        status: 403
      }, { status: 403 })
    }

    // Parse query parameters
    const url = new URL(request.url)
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '10'), 50)
    const weekId = url.searchParams.get('week')

    let query = supabase
      .from('reflections')
      .select('*')
      .eq('student_id', profile.id)

    if (weekId) {
      query = query.eq('week_id', weekId)
    }

    const { data: reflections, error } = await query
      .order('week_start_date', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching reflections:', error)
      return NextResponse.json({
        type: 'https://tools.ietf.org/html/rfc7807',
        title: 'Database Error',
        detail: '振り返りデータの取得に失敗しました',
        status: 500
      }, { status: 500 })
    }

    // Add current reflection capability info
    const currentReflectionInfo = canSubmitReflection()

    return NextResponse.json({
      reflections: reflections || [],
      canReflectToday: currentReflectionInfo.canSubmit,
      nextAvailableDate: currentReflectionInfo.nextAvailableDate,
      currentWeek: getWeekPeriod().weekId
    })

  } catch (error) {
    console.error('Get reflections API error:', error)
    return NextResponse.json({
      type: 'https://tools.ietf.org/html/rfc7807',
      title: 'Internal Server Error',
      detail: 'サーバーエラーが発生しました',
      status: 500
    }, { status: 500 })
  }
}