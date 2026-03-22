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

// ================================================================
// 生徒提出セッション一覧型
// ================================================================

export interface StudentExerciseSession {
  questionSetId: number
  sessionNumber: number
  title: string
  totalScore: number | null
  maxScore: number | null
  accuracyRate: number | null
}

/**
 * 対象生徒が提出済みの演習セッション一覧（指導者・保護者向け）
 * checkStudentAccess() で認可
 */
export async function getStudentExerciseSessions(
  studentId: number,
  grade: number
): Promise<{ data: StudentExerciseSession[]; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: [], error: '認証が必要です' }

    const hasAccess = await checkStudentAccess(user.id, String(studentId))
    if (!hasAccess) return { data: [], error: 'アクセス権限がありません' }

    const admin = createAdminClient()

    const { data: sessions, error } = await admin
      .from('answer_sessions')
      .select(`
        question_set_id,
        total_score,
        max_score,
        question_sets!inner (
          id,
          title,
          session_id,
          set_type,
          grade,
          study_sessions!inner (
            session_number
          )
        )
      `)
      .eq('student_id', studentId)
      .eq('is_latest', true)
      .eq('status', 'graded')
      .eq('question_sets.set_type', 'exercise_workbook')
      .eq('question_sets.grade', grade)

    if (error) {
      console.error('[exercise-master] student sessions error:', error)
      return { data: [], error: 'データの取得に失敗しました' }
    }

    if (!sessions) return { data: [] }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: StudentExerciseSession[] = sessions.map((s: any) => ({
      questionSetId: s.question_set_id,
      sessionNumber: s.question_sets.study_sessions.session_number,
      title: s.question_sets.title || `第${s.question_sets.study_sessions.session_number}回`,
      totalScore: s.total_score,
      maxScore: s.max_score,
      accuracyRate: s.max_score && s.max_score > 0
        ? Math.round((s.total_score / s.max_score) * 100) / 100
        : null,
    }))

    result.sort((a, b) => a.sessionNumber - b.sessionNumber)

    return { data: result }
  } catch (err) {
    console.error('[exercise-master] student sessions error:', err)
    return { data: [], error: 'データの取得に失敗しました' }
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

// ================================================================
// 保護者向け: 1回分の詳細（セクション正答率 + 振り返り + AI）
// ================================================================

export interface ParentExerciseSectionStat {
  sectionName: string
  correctCount: number
  totalCount: number
  accuracyRate: number
}

export interface ParentExerciseDetail {
  sectionStats: ParentExerciseSectionStat[]
  reflections: ExerciseStudentReflection[]
}

/**
 * 保護者向け: 演習1回分の詳細を一括取得
 * - セクション別正答率（student_answers集計）
 * - 振り返りテキスト + AIフィードバック
 * checkStudentAccess() で認可（保護者・指導者共用）
 */
export async function getParentExerciseDetail(
  studentId: number,
  questionSetId: number
): Promise<{ data: ParentExerciseDetail | null; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: null, error: '認証が必要です' }

    const hasAccess = await checkStudentAccess(user.id, String(studentId))
    if (!hasAccess) return { data: null, error: 'アクセス権限がありません' }

    const admin = createAdminClient()

    // 最新セッションのみ取得（is_latest=true）— サマリーの正答率と一致させる
    const { data: sessions } = await admin
      .from('answer_sessions')
      .select('id')
      .eq('student_id', studentId)
      .eq('question_set_id', questionSetId)
      .eq('status', 'graded')
      .eq('is_latest', true)
      .limit(1)

    if (!sessions || sessions.length === 0) {
      return { data: { sectionStats: [], reflections: [] } }
    }

    const sessionIds = sessions.map(s => s.id)

    // セクション別正答率 + 振り返り を並列取得
    const [answersResult, reflectionsResult] = await Promise.all([
      admin
        .from('student_answers')
        .select(`
          is_correct,
          questions!inner (
            section_name
          )
        `)
        .in('answer_session_id', sessionIds),
      admin
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
        .order('attempt_number', { ascending: true }),
    ])

    // エラーハンドリング: 致命的失敗はログ+空データで続行（非致命的扱い）
    if (answersResult.error) {
      console.error('[getParentExerciseDetail] answers error:', answersResult.error)
    }
    if (reflectionsResult.error) {
      console.error('[getParentExerciseDetail] reflections error:', reflectionsResult.error)
    }

    // セクション別正答率を集計
    const sectionMap = new Map<string, { correct: number; total: number }>()
    for (const row of (answersResult.data ?? [])) {
      const section = (row.questions as any)?.section_name ?? '不明'
      const entry = sectionMap.get(section) ?? { correct: 0, total: 0 }
      entry.total++
      if (row.is_correct) entry.correct++
      sectionMap.set(section, entry)
    }

    const sectionStats: ParentExerciseSectionStat[] = Array.from(sectionMap.entries()).map(
      ([sectionName, { correct, total }]) => ({
        sectionName,
        correctCount: correct,
        totalCount: total,
        accuracyRate: total > 0 ? Math.round((correct / total) * 100) : 0,
      })
    )

    // 振り返り整形
    const reflections: ExerciseStudentReflection[] = (reflectionsResult.data ?? []).map(r => ({
      sectionName: r.section_name,
      reflectionText: r.reflection_text,
      feedbackText: Array.isArray(r.exercise_feedbacks) && r.exercise_feedbacks.length > 0
        ? r.exercise_feedbacks[0].feedback_text
        : null,
      attemptNumber: r.attempt_number,
      createdAt: r.created_at,
    }))

    return { data: { sectionStats, reflections } }
  } catch (err) {
    console.error('[exercise-master] parent detail error:', err)
    return { data: null, error: 'データの取得に失敗しました' }
  }
}
