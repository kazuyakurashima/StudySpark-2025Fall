'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { checkStudentAccess } from '@/app/actions/common/check-student-access'

// ================================================================
// 型定義
// ================================================================

export interface ExerciseMasterSession {
  session_number: number
  title: string
  question_set_id: number
  total_questions: number
  submitted_count: number
  total_students: number
  avg_rate: number
}

export interface ExerciseMasterSummary {
  grade: number
  total_students: number
  sessions: ExerciseMasterSession[]
}

export interface ExerciseMasterQuestion {
  id: number
  question_number: string
  section_name: string
  min_course: string | null
  points: number
  display_order: number
}

export interface ExerciseMasterStudent {
  student_id: number
  full_name: string
  login_id: string
  course_level: string
  total_score: number | null
  max_score: number | null
  accuracy_rate: number | null
  results: Record<string, boolean | null>
}

export interface ExerciseMasterQuestionStat {
  question_id: number
  correct_count: number
  answered_count: number
  rate: number
}

export interface ExerciseMasterSectionStat {
  section_name: string
  question_count: number
  correct_count: number
  answered_count: number
  avg_rate: number
}

export interface ExerciseMasterDetail {
  question_set: {
    id: number
    title: string
    grade: number
    session_number: number
  }
  questions: ExerciseMasterQuestion[]
  students: ExerciseMasterStudent[]
  question_stats: ExerciseMasterQuestionStat[]
  section_stats: ExerciseMasterSectionStat[]
}

export interface ExerciseStudentReflection {
  sectionName: string
  reflectionText: string
  feedbackText: string | null
  attemptNumber: number
  createdAt: string
}

// ================================================================
// Server Actions
// ================================================================

/**
 * 演習問題集サマリー取得（指導者/admin向け）
 * RPC内でauth.uid()から認可解決するため、ユーザーコンテキストのSupabaseクライアントを使用
 */
export async function getExerciseMasterSummary(
  grade: number
): Promise<{ data: ExerciseMasterSummary | null; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: null, error: '認証が必要です' }

    const { data, error } = await supabase.rpc('get_exercise_master_summary', {
      p_grade: grade,
    })

    if (error) {
      console.error('[exercise-master] summary RPC error:', error)
      return { data: null, error: error.message }
    }

    return { data: data as unknown as ExerciseMasterSummary }
  } catch (err) {
    console.error('[exercise-master] summary error:', err)
    return { data: null, error: 'データの取得に失敗しました' }
  }
}

/**
 * 演習問題集詳細取得（指導者/admin向け）
 * 正誤マトリクス + セクション統計
 */
export async function getExerciseMasterDetail(
  questionSetId: number
): Promise<{ data: ExerciseMasterDetail | null; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: null, error: '認証が必要です' }

    const { data, error } = await supabase.rpc('get_exercise_master_detail', {
      p_question_set_id: questionSetId,
    })

    if (error) {
      console.error('[exercise-master] detail RPC error:', error)
      return { data: null, error: error.message }
    }

    return { data: data as unknown as ExerciseMasterDetail }
  } catch (err) {
    console.error('[exercise-master] detail error:', err)
    return { data: null, error: 'データの取得に失敗しました' }
  }
}

/**
 * 生徒の演習振り返り+AIフィードバック閲覧（指導者・保護者向け）
 * createAdminClient() + checkStudentAccess() で認可
 */
export async function getStudentExerciseReflections(
  studentId: number,
  questionSetId: number
): Promise<{ data: ExerciseStudentReflection[]; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: [], error: '認証が必要です' }

    const admin = createAdminClient()

    // 認可チェック: 指導者 or 保護者が対象生徒にアクセスできるか
    const hasAccess = await checkStudentAccess(user.id, String(studentId))
    if (!hasAccess) return { data: [], error: 'アクセス権限がありません' }

    // 対象question_setの全answer_sessionを取得
    const { data: sessions } = await admin
      .from('answer_sessions')
      .select('id')
      .eq('student_id', studentId)
      .eq('question_set_id', questionSetId)
      .eq('status', 'graded')

    if (!sessions || sessions.length === 0) return { data: [] }

    const sessionIds = sessions.map(s => s.id)

    // 振り返り + フィードバックを一括取得
    const { data: reflections } = await admin
      .from('exercise_reflections')
      .select(`
        id,
        section_name,
        reflection_text,
        attempt_number,
        created_at,
        exercise_feedbacks (
          feedback_text
        )
      `)
      .in('answer_session_id', sessionIds)
      .order('section_name')
      .order('attempt_number', { ascending: true })

    if (!reflections) return { data: [] }

    const result: ExerciseStudentReflection[] = reflections.map(r => ({
      sectionName: r.section_name,
      reflectionText: r.reflection_text,
      feedbackText: Array.isArray(r.exercise_feedbacks) && r.exercise_feedbacks.length > 0
        ? r.exercise_feedbacks[0].feedback_text
        : null,
      attemptNumber: r.attempt_number,
      createdAt: r.created_at,
    }))

    return { data: result }
  } catch (err) {
    console.error('[exercise-master] reflections error:', err)
    return { data: [], error: 'データの取得に失敗しました' }
  }
}

// 認可チェックは共通関数 checkStudentAccess を使用
// → app/actions/common/check-student-access.ts
// 卒業生フィルタ含む完全な権限チェックを提供
