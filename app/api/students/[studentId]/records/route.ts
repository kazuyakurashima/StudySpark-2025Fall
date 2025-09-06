import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { 
  createStudyRecordSchema, 
  validateCorrectProblems,
  type StudyRecord 
} from '@/lib/schemas/study-record'

// GET /api/students/{studentId}/records?date=YYYY-MM-DD
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
    const date = searchParams.get('date')
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

    let query = supabase
      .from('study_inputs')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })

    // Filter by date if provided
    if (date) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return NextResponse.json({
          type: 'https://tools.ietf.org/html/rfc7807',
          title: 'Invalid Date Format',
          detail: '日付の形式が正しくありません (YYYY-MM-DD)',
          status: 400
        }, { status: 400 })
      }
      query = query.eq('date', date)
    }

    const { data: records, error } = await query

    if (error) {
      console.error('Error fetching study records:', error)
      return NextResponse.json({
        type: 'https://tools.ietf.org/html/rfc7807',
        title: 'Database Error',
        detail: '学習記録の取得に失敗しました',
        status: 500
      }, { status: 500 })
    }

    return NextResponse.json({
      records: records || [],
      count: records?.length || 0
    })

  } catch (error) {
    console.error('Study records fetch error:', error)
    return NextResponse.json({
      type: 'https://tools.ietf.org/html/rfc7807',
      title: 'Internal Server Error',
      detail: 'サーバーエラーが発生しました',
      status: 500
    }, { status: 500 })
  }
}

// POST /api/students/{studentId}/records (UPSERT)
export async function POST(
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

    const studentId = params.studentId
    const body = await request.json()

    // Validate studentId is UUID
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(studentId)) {
      return NextResponse.json({
        type: 'https://tools.ietf.org/html/rfc7807',
        title: 'Invalid Student ID',
        detail: '有効な学生IDを指定してください',
        status: 400
      }, { status: 400 })
    }

    // Validate request body
    const validationResult = createStudyRecordSchema.safeParse(body)
    
    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0]
      return NextResponse.json({
        type: 'https://tools.ietf.org/html/rfc7807',
        title: 'Validation Error',
        detail: firstError.message,
        status: 400,
        errors: validationResult.error.errors
      }, { status: 400 })
    }

    const recordData = validationResult.data

    // Additional validation for correct_problems <= total_problems
    const correctProblemsValidation = validateCorrectProblems(recordData)
    if (!correctProblemsValidation.isValid) {
      return NextResponse.json({
        type: 'https://tools.ietf.org/html/rfc7807',
        title: 'Validation Error',
        detail: correctProblemsValidation.message,
        status: 400
      }, { status: 400 })
    }

    // Check if record exists for same date/subject/type (for UPSERT)
    const { data: existingRecord } = await supabase
      .from('study_inputs')
      .select('id')
      .eq('student_id', studentId)
      .eq('date', recordData.date)
      .eq('subject', recordData.subject)
      .eq('study_type', recordData.study_type)
      .single()

    const now = new Date().toISOString()
    const recordToSave = {
      ...recordData,
      student_id: studentId,
      updated_at: now,
      ...(existingRecord ? {} : { created_at: now })
    }

    let result
    if (existingRecord) {
      // Update existing record
      result = await supabase
        .from('study_inputs')
        .update(recordToSave)
        .eq('id', existingRecord.id)
        .select()
        .single()
    } else {
      // Insert new record
      result = await supabase
        .from('study_inputs')
        .insert(recordToSave)
        .select()
        .single()
    }

    const { data: savedRecord, error: saveError } = result

    if (saveError) {
      console.error('Error saving study record:', saveError)
      return NextResponse.json({
        type: 'https://tools.ietf.org/html/rfc7807',
        title: 'Database Error',
        detail: '学習記録の保存に失敗しました',
        status: 500
      }, { status: 500 })
    }

    // Create audit log entry
    await supabase.from('audit_logs').insert({
      table_name: 'study_inputs',
      record_id: savedRecord.id,
      action: existingRecord ? 'UPDATE' : 'CREATE',
      user_id: user.id,
      changed_data: recordToSave,
      created_at: now
    })

    return NextResponse.json(savedRecord, { 
      status: existingRecord ? 200 : 201 
    })

  } catch (error) {
    console.error('Study record save error:', error)
    return NextResponse.json({
      type: 'https://tools.ietf.org/html/rfc7807',
      title: 'Internal Server Error', 
      detail: 'サーバーエラーが発生しました',
      status: 500
    }, { status: 500 })
  }
}