'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'

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
// 演習問題集の到達度データ取得（自分のみ — 1A-6/7で他生徒対応を追加）
// 仕様: latestセッションが graded のみ表示。in_progress は到達度マップに含めない
//       （セクション単位で段階的に採点するため、部分データの表示を避ける）
// ================================================================

export async function getExerciseAchievementMapData(): Promise<{
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

    // 自分の生徒情報のみ取得（認可: 自分のuser_idに紐づく生徒のみ）
    const { data: student } = await admin
      .from('students')
      .select('id, grade, course')
      .eq('user_id', user.id)
      .single()
    if (!student) return { data: [], summary: emptySummary, error: '生徒情報が見つかりません' }

    const studentId = student.id
    const studentGrade = student.grade
    const studentCourse = student.course || 'A'
    const studentRank = COURSE_RANK[studentCourse] ?? 1

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
