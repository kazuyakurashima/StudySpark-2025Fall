'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { checkStudentAccess } from '@/app/actions/common/check-student-access'

// ================================================================
// 型定義
// ================================================================

export interface ExerciseAchievementQuestion {
  id: number
  questionNumber: string
  sectionName: string
  minCourse: string | null
  /** true=正解, false=不正解, null=未回答, 'excluded'=上位コース（未対象） */
  status: true | false | null | 'excluded'
}

export interface ExerciseAchievementData {
  sessionNumber: number
  sessionId: number
  questions: ExerciseAchievementQuestion[]
}

export interface ExerciseAchievementSummary {
  /** コースフィルタ後の対象問題数 */
  totalQuestions: number
  answeredQuestions: number
  correctQuestions: number
  /** 到達率 = correctQuestions / totalQuestions（計画書準拠） */
  accuracy: number
  /** 回答率 = answeredQuestions / totalQuestions */
  answeredRate: number
}

// ================================================================
// ヘルパー
// ================================================================

const COURSE_RANK: Record<string, number> = { A: 1, B: 2, C: 3, S: 4 }

// ================================================================
// 演習問題集の到達度データ取得
// 仕様: latestセッションが graded のみ表示。in_progress は到達度マップに含めない
//       （セクション単位で段階的に採点するため、部分データの表示を避ける）
// 認可: targetStudentId 指定時は checkStudentAccess() で担当関係/親子関係を検証
// ================================================================

export async function getExerciseAchievementMapData(options?: {
  targetStudentId?: number  // 指導者・保護者用（省略時は自分）
  previewCourse?: string    // コース別プレビュー（実コースを変更せず表示のみ切替）
}): Promise<{
  data: ExerciseAchievementData[]
  summary: ExerciseAchievementSummary
  error?: string
}> {
  const emptySummary: ExerciseAchievementSummary = {
    totalQuestions: 0, answeredQuestions: 0, correctQuestions: 0, accuracy: 0, answeredRate: 0,
  }
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: [], summary: emptySummary, error: '認証されていません' }

    const admin = createAdminClient()

    let studentId: number
    let studentGrade: number
    let studentCourse: string

    if (options?.targetStudentId) {
      // 他生徒アクセス: 認可チェック（担当関係/親子関係を検証）
      const hasAccess = await checkStudentAccess(user.id, String(options.targetStudentId))
      if (!hasAccess) return { data: [], summary: emptySummary, error: 'アクセス権限がありません' }

      const { data: student } = await admin
        .from('students')
        .select('id, grade, course')
        .eq('id', options.targetStudentId)
        .single()
      if (!student) return { data: [], summary: emptySummary, error: '生徒情報が見つかりません' }

      studentId = student.id
      studentGrade = student.grade
      studentCourse = student.course || 'A'
    } else {
      // 自分のデータ
      const { data: student } = await admin
        .from('students')
        .select('id, grade, course')
        .eq('user_id', user.id)
        .single()
      if (!student) return { data: [], summary: emptySummary, error: '生徒情報が見つかりません' }

      studentId = student.id
      studentGrade = student.grade
      studentCourse = student.course || 'A'
    }
    // コース別プレビュー: previewCourse 指定時は表示コースを上書き（実コースは変更しない）
    const validCourses = new Set(['A', 'B', 'C', 'S'])
    const previewCourse = options?.previewCourse && validCourses.has(options.previewCourse)
      ? options.previewCourse
      : null
    const effectiveCourse = previewCourse || studentCourse
    const studentRank = COURSE_RANK[effectiveCourse] ?? 1

    // 演習問題集の question_sets を取得
    const { data: questionSets } = await admin
      .from('question_sets')
      .select(`
        id, session_id,
        study_sessions!inner(session_number)
      `)
      .eq('grade', studentGrade)
      .eq('subject_id', 1)  // 算数（Phase 1Aは算数固定）
      .eq('set_type', 'exercise_workbook')
      .eq('status', 'approved')
      .is('edition', null)
      .order('session_id')

    if (!questionSets || questionSets.length === 0) {
      return { data: [], summary: emptySummary }
    }

    const qsIds = questionSets.map(qs => qs.id)

    // 全問題を一括取得（コースフィルタなし — 上位コース問題も含め「excluded」として表示）
    const { data: allQuestions } = await admin
      .from('questions')
      .select('id, question_set_id, question_number, section_name, display_order, min_course')
      .in('question_set_id', qsIds)
      .order('display_order')

    if (!allQuestions) return { data: [], summary: emptySummary }

    // 最新の graded セッションの回答を一括取得
    const { data: latestSessions } = await admin
      .from('answer_sessions')
      .select('id, question_set_id')
      .eq('student_id', studentId)
      .in('question_set_id', qsIds)
      .eq('is_latest', true)
      .eq('status', 'graded')

    const sessionIds = (latestSessions || []).map(s => s.id)
    const sessionByQsId = new Map((latestSessions || []).map(s => [s.question_set_id, s.id]))

    let allAnswers: { answer_session_id: number; question_id: number; is_correct: boolean | null }[] = []
    if (sessionIds.length > 0) {
      const { data: answers } = await admin
        .from('student_answers')
        .select('answer_session_id, question_id, is_correct')
        .in('answer_session_id', sessionIds)
      allAnswers = answers || []
    }

    const answerMap = new Map(allAnswers.map(a => [`${a.answer_session_id}:${a.question_id}`, a.is_correct]))

    // データ構築
    let totalQuestions = 0      // コースフィルタ後の対象問題数
    let answeredQuestions = 0
    let correctQuestions = 0

    const result: ExerciseAchievementData[] = questionSets.map(qs => {
      const sessionInfo = qs.study_sessions as unknown as { session_number: number }
      const questions = (allQuestions || []).filter(q => q.question_set_id === qs.id)
      const answerSessionId = sessionByQsId.get(qs.id)

      const mappedQuestions: ExerciseAchievementQuestion[] = questions.map(q => {
        // コースフィルタ: 上位コース問題は 'excluded'
        const isInScope = !q.min_course || (COURSE_RANK[q.min_course] ?? 1) <= studentRank

        if (!isInScope) {
          return {
            id: q.id,
            questionNumber: q.question_number,
            sectionName: q.section_name,
            minCourse: q.min_course,
            status: 'excluded' as const,
          }
        }

        totalQuestions++

        const isCorrect = answerSessionId
          ? answerMap.get(`${answerSessionId}:${q.id}`) ?? null
          : null

        if (isCorrect !== null) {
          answeredQuestions++
          if (isCorrect) correctQuestions++
        }

        return {
          id: q.id,
          questionNumber: q.question_number,
          sectionName: q.section_name,
          minCourse: q.min_course,
          status: isCorrect,
        }
      })

      return {
        sessionNumber: sessionInfo.session_number,
        sessionId: qs.session_id,
        questions: mappedQuestions,
      }
    })

    return {
      data: result,
      summary: {
        totalQuestions,
        answeredQuestions,
        correctQuestions,
        accuracy: totalQuestions > 0 ? Math.round((correctQuestions / totalQuestions) * 100) : 0,
        answeredRate: totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0,
      },
    }
  } catch (error) {
    console.error('Error in getExerciseAchievementMapData:', error)
    return { data: [], summary: emptySummary, error: '予期しないエラーが発生しました' }
  }
}
