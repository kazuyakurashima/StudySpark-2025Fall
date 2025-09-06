import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validateParentAuth, getParentStudents, createParentStudentRelation } from '@/lib/utils/parent-student-access'

// GET /api/parents/{parentId}/students - Get all students for a parent
export async function GET(
  request: NextRequest,
  { params }: { params: { parentId: string } }
) {
  try {
    const parentId = params.parentId

    // Validate authentication and authorization
    const authResult = await validateParentAuth(parentId)
    if (!authResult.isValid) {
      return NextResponse.json({
        type: 'https://tools.ietf.org/html/rfc7807',
        title: 'Unauthorized',
        detail: authResult.error,
        status: 401
      }, { status: 401 })
    }

    // Get students for this parent
    const students = await getParentStudents(parentId)

    return NextResponse.json({
      students,
      totalCount: students.length
    })

  } catch (error) {
    console.error('Parent students API error:', error)
    return NextResponse.json({
      type: 'https://tools.ietf.org/html/rfc7807',
      title: 'Internal Server Error',
      detail: error instanceof Error ? error.message : 'サーバーエラーが発生しました',
      status: 500
    }, { status: 500 })
  }
}

// POST /api/parents/{parentId}/students - Add a student relationship
export async function POST(
  request: NextRequest,
  { params }: { params: { parentId: string } }
) {
  try {
    const parentId = params.parentId
    const body = await request.json()

    // Validate authentication and authorization
    const authResult = await validateParentAuth(parentId)
    if (!authResult.isValid) {
      return NextResponse.json({
        type: 'https://tools.ietf.org/html/rfc7807',
        title: 'Unauthorized',
        detail: authResult.error,
        status: 401
      }, { status: 401 })
    }

    // Validate request body
    if (!body.studentId || typeof body.studentId !== 'string') {
      return NextResponse.json({
        type: 'https://tools.ietf.org/html/rfc7807',
        title: 'Validation Error',
        detail: '生徒IDが必要です',
        status: 400
      }, { status: 400 })
    }

    const relationshipType = body.relationshipType === 'guardian' ? 'guardian' : 'parent'

    // Validate student exists
    const supabase = await createClient()
    const { data: student, error: studentError } = await supabase
      .from('profiles')
      .select('id, display_name, role')
      .eq('id', body.studentId)
      .eq('role', 'student')
      .single()

    if (studentError || !student) {
      return NextResponse.json({
        type: 'https://tools.ietf.org/html/rfc7807',
        title: 'Not Found',
        detail: '指定された生徒が見つかりません',
        status: 404
      }, { status: 404 })
    }

    // Create the relationship
    const relation = await createParentStudentRelation(parentId, body.studentId, relationshipType)

    return NextResponse.json({
      relation,
      message: `${student.display_name}さんとの関係を作成しました`
    }, { status: 201 })

  } catch (error) {
    console.error('Create parent-student relation error:', error)
    return NextResponse.json({
      type: 'https://tools.ietf.org/html/rfc7807',
      title: 'Internal Server Error',
      detail: error instanceof Error ? error.message : 'サーバーエラーが発生しました',
      status: 500
    }, { status: 500 })
  }
}