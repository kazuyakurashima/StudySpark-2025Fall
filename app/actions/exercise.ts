'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { gradeAnswer } from '@/lib/math-grading'
import { sanitizeAnswerConfig, type MultiPartConfig, type SelectionConfig } from '@/lib/math-answer-utils'

// ================================================================
// 型定義
// ================================================================

export interface ExerciseQuestion {
  id: number
  questionNumber: string
  sectionName: string
  answerType: 'numeric' | 'fraction' | 'multi_part' | 'selection' | 'note'
  unitLabel: string | null
  answerConfig: MultiPartConfig | SelectionConfig | null
  points: number
  minCourse: string | null
}

export interface ExerciseQuestionSet {
  id: number
  title: string
  sessionNumber: number
}

export interface ExerciseGradeResult {
  questionId: number
  isCorrect: boolean
  answerValue: string
  correctAnswer: string
}

export interface ExerciseAnswerHistory {
  questionId: number
  rawInput: string
  isCorrect: boolean | null
}

// ================================================================
// ヘルパー
// ================================================================

async function resolveStudentWithCourse(
  admin: ReturnType<typeof createAdminClient>,
  userId: string
): Promise<{ id: number; grade: number; course: string } | null> {
  const { data: student } = await admin
    .from('students')
    .select('id, grade, course')
    .eq('user_id', userId)
    .single()
  if (!student) return null
  return { id: student.id, grade: student.grade, course: student.course || 'A' }
}

/** コースランク定数（course_rank() 関数と同一ロジック） */
const COURSE_RANK: Record<string, number> = { A: 1, B: 2, C: 3, S: 4 }

/**
 * コース別フィルタ: 生徒のコース以下の問題のみを残す
 * DB側 course_rank() と同一ロジックを使用（一元定義）
 */
function filterByCourse<T extends { min_course: string | null }>(
  questions: T[],
  studentCourse: string
): T[] {
  const studentRank = COURSE_RANK[studentCourse] ?? 1
  return questions.filter(q => {
    if (!q.min_course) return true
    return (COURSE_RANK[q.min_course] ?? 1) <= studentRank
  })
}

// ================================================================
// 演習問題集のquestion_set取得（1回分）
// ================================================================

export async function getExerciseQuestionSet(
  sessionId: number,
  subjectId: number
): Promise<{
  questionSet: ExerciseQuestionSet | null
  questions: ExerciseQuestion[]
  error?: string
}> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { questionSet: null, questions: [], error: '認証されていません' }

    const admin = createAdminClient()
    const student = await resolveStudentWithCourse(admin, user.id)
    if (!student) return { questionSet: null, questions: [], error: '生徒情報が見つかりません' }

    // 演習問題集のquestion_setを取得
    const { data: qs } = await admin
      .from('question_sets')
      .select(`
        id, title,
        study_sessions!inner(session_number)
      `)
      .eq('session_id', sessionId)
      .eq('subject_id', subjectId)
      .eq('grade', student.grade)
      .eq('set_type', 'exercise_workbook')
      .eq('status', 'approved')
      .is('edition', null)
      .single()

    if (!qs) return { questionSet: null, questions: [] }

    const sessionInfo = qs.study_sessions as unknown as { session_number: number }

    // 問題一覧（correct_answer除外）
    const { data: allQuestions, error: qError } = await admin
      .from('questions')
      .select('id, question_number, section_name, answer_type, unit_label, answer_config, points, display_order, min_course')
      .eq('question_set_id', qs.id)
      .order('display_order')

    // コース別フィルタ適用
    const questions = filterByCourse(allQuestions || [], student.course)

    if (qError) {
      console.error('Failed to get exercise questions:', qError)
      return { questionSet: null, questions: [], error: 'データ取得に失敗しました' }
    }

    const sanitizedQuestions: ExerciseQuestion[] = questions.map(q => ({
      id: q.id,
      questionNumber: q.question_number,
      sectionName: q.section_name,
      answerType: q.answer_type as ExerciseQuestion['answerType'],
      unitLabel: q.unit_label,
      answerConfig: sanitizeAnswerConfig(q.answer_type, q.answer_config as Record<string, unknown> | null, q.id),
      points: q.points,
      minCourse: q.min_course,
    }))

    return {
      questionSet: {
        id: qs.id,
        title: qs.title || `第${sessionInfo.session_number}回 演習問題集`,
        sessionNumber: sessionInfo.session_number,
      },
      questions: sanitizedQuestions,
    }
  } catch (error) {
    console.error('Error in getExerciseQuestionSet:', error)
    return { questionSet: null, questions: [], error: '予期しないエラーが発生しました' }
  }
}

// ================================================================
// 回答保存 + 採点（即時採点・正答表示）
// RPC create_exercise_session でアトミックなセッション生成
// ================================================================

export async function saveAndGradeExerciseAnswers(input: {
  questionSetId: number
  answers: { questionId: number; rawInput: string }[]
  retryMode?: 'all' | 'incorrect_only'  // 不正解リトライ時は前回正解をマージ
}): Promise<{
  results: ExerciseGradeResult[]
  totalScore: number
  maxScore: number
  answerSessionId: number
  error?: string
}> {
  const empty = { results: [], totalScore: 0, maxScore: 0, answerSessionId: 0 }
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { ...empty, error: '認証されていません' }

    const admin = createAdminClient()
    const student = await resolveStudentWithCourse(admin, user.id)
    if (!student) return { ...empty, error: '生徒情報が見つかりません' }

    // question_set の所有確認
    const { data: qs } = await admin
      .from('question_sets')
      .select('id, grade')
      .eq('id', input.questionSetId)
      .eq('set_type', 'exercise_workbook')
      .eq('status', 'approved')
      .single()

    if (!qs || qs.grade !== student.grade) {
      return { ...empty, error: '問題セットが見つかりません' }
    }

    // 問題と正答を取得
    const { data: allQuestions } = await admin
      .from('questions')
      .select('id, question_number, answer_type, correct_answer, answer_config, points, min_course')
      .eq('question_set_id', input.questionSetId)

    if (!allQuestions || allQuestions.length === 0) return { ...empty, error: '問題が見つかりません' }

    // コース別フィルタ適用 → 表示対象のみを採点分母に
    const questions = filterByCourse(allQuestions, student.course)
    const questionMap = new Map(questions.map(q => [q.id, q]))

    // 不正解リトライ時: 前回セッションの正解回答を取得
    const prevCorrectAnswers: Map<number, { raw_input: string; answer_value: string; scored_at: string }> = new Map()
    if (input.retryMode === 'incorrect_only') {
      // RPC実行前に前回セッション（まだ is_latest=true）の正解を取得
      const { data: prevSession } = await admin
        .from('answer_sessions')
        .select('id')
        .eq('student_id', student.id)
        .eq('question_set_id', input.questionSetId)
        .eq('is_latest', true)
        .single()

      if (prevSession) {
        const { data: prevAnswers } = await admin
          .from('student_answers')
          .select('question_id, raw_input, answer_value, scored_at')
          .eq('answer_session_id', prevSession.id)
          .eq('is_correct', true)

        for (const a of prevAnswers || []) {
          prevCorrectAnswers.set(a.question_id, {
            raw_input: a.raw_input || '',
            answer_value: a.answer_value || '',
            scored_at: a.scored_at || new Date().toISOString(),
          })
        }
      }
    }

    // アトミックなセッション作成
    const { data: sessionResult, error: rpcError } = await admin
      .rpc('create_exercise_session', {
        p_student_id: student.id,
        p_question_set_id: input.questionSetId,
      })

    if (rpcError || !sessionResult || sessionResult.length === 0) {
      console.error('Failed to create exercise session:', rpcError)
      return { ...empty, error: 'セッション作成に失敗しました' }
    }

    const newSessionId = sessionResult[0].id

    // 採点
    let totalScore = 0
    const maxScore = questions.reduce((sum, q) => sum + q.points, 0)
    const results: ExerciseGradeResult[] = []
    const answersToInsert: {
      answer_session_id: number
      question_id: number
      raw_input: string
      answer_value: string
      is_correct: boolean
      scored_at: string
      answered_at: string
    }[] = []

    // 今回送信された回答のIDセット
    const submittedQuestionIds = new Set(input.answers.map(a => a.questionId))

    for (const answer of input.answers) {
      const question = questionMap.get(answer.questionId)
      if (!question) continue

      const gradeResult = gradeAnswer(
        question.answer_type as 'numeric' | 'fraction' | 'multi_part' | 'selection',
        answer.rawInput,
        question.correct_answer,
        question.answer_config as Record<string, unknown> | null
      )

      if (gradeResult.isCorrect) totalScore += question.points

      const now = new Date().toISOString()
      answersToInsert.push({
        answer_session_id: newSessionId,
        question_id: answer.questionId,
        raw_input: answer.rawInput,
        answer_value: gradeResult.answerValue,
        is_correct: gradeResult.isCorrect,
        scored_at: now,
        answered_at: now,
      })

      let correctAnswer = question.correct_answer || ''
      if (question.answer_type === 'multi_part' && question.answer_config) {
        const config = question.answer_config as { correct_values: Record<string, string> }
        correctAnswer = JSON.stringify(config.correct_values)
      }

      results.push({
        questionId: answer.questionId,
        isCorrect: gradeResult.isCorrect,
        answerValue: gradeResult.answerValue,
        correctAnswer,
      })
    }

    // 不正解リトライ時: 前回正解をコピー（送信されなかった正解済み問題）
    if (input.retryMode === 'incorrect_only') {
      for (const [qId, prevAnswer] of prevCorrectAnswers) {
        if (submittedQuestionIds.has(qId)) continue // 今回送信済みならスキップ
        const question = questionMap.get(qId)
        if (!question) continue

        totalScore += question.points

        answersToInsert.push({
          answer_session_id: newSessionId,
          question_id: qId,
          raw_input: prevAnswer.raw_input,
          answer_value: prevAnswer.answer_value,
          is_correct: true,
          scored_at: prevAnswer.scored_at,
          answered_at: prevAnswer.scored_at,
        })

        results.push({
          questionId: qId,
          isCorrect: true,
          answerValue: prevAnswer.answer_value,
          correctAnswer: '',
        })
      }
    }

    // student_answers を一括INSERT
    if (answersToInsert.length > 0) {
      const { error: insertError } = await admin
        .from('student_answers')
        .insert(answersToInsert)

      if (insertError) {
        console.error('Failed to insert student_answers:', insertError)
        return { ...empty, error: '回答の保存に失敗しました' }
      }
    }

    // セッションを graded に更新
    await admin
      .from('answer_sessions')
      .update({
        status: 'graded',
        total_score: totalScore,
        max_score: maxScore,
        completed_at: new Date().toISOString(),
        answers_revealed: true,
      })
      .eq('id', newSessionId)

    return {
      results,
      totalScore,
      maxScore,
      answerSessionId: newSessionId,
    }
  } catch (error) {
    console.error('Error in saveAndGradeExerciseAnswers:', error)
    return { ...empty, error: '予期しないエラーが発生しました' }
  }
}

// ================================================================
// セクション単位採点（段階的にanswer_sessionに蓄積）
// ================================================================

export async function gradeExerciseSection(input: {
  questionSetId: number
  sectionQuestionIds: number[]  // セクション内の全問題ID（未回答検出用）
  answers: { questionId: number; rawInput: string }[]
  isFinal: boolean  // 最終セクション → session を graded に確定
}): Promise<{
  results: ExerciseGradeResult[]
  sectionScore: number
  sectionMaxScore: number
  totalScore?: number    // isFinal 時のみ
  totalMaxScore?: number // isFinal 時のみ
  attemptNumber?: number // isFinal 時のみ
  answerSessionId: number
  error?: string
}> {
  const empty = { results: [], sectionScore: 0, sectionMaxScore: 0, answerSessionId: 0 }
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { ...empty, error: '認証されていません' }

    const admin = createAdminClient()
    const student = await resolveStudentWithCourse(admin, user.id)
    if (!student) return { ...empty, error: '生徒情報が見つかりません' }

    // question_set の所有確認
    const { data: qs } = await admin
      .from('question_sets')
      .select('id, grade')
      .eq('id', input.questionSetId)
      .eq('set_type', 'exercise_workbook')
      .eq('status', 'approved')
      .single()

    if (!qs || qs.grade !== student.grade) {
      return { ...empty, error: '問題セットが見つかりません' }
    }

    // 問題と正答を取得（コースフィルタ適用）
    const { data: allQuestions } = await admin
      .from('questions')
      .select('id, question_number, answer_type, correct_answer, answer_config, points, min_course')
      .eq('question_set_id', input.questionSetId)

    if (!allQuestions || allQuestions.length === 0) return { ...empty, error: '問題が見つかりません' }

    const questions = filterByCourse(allQuestions, student.course)
    const questionMap = new Map(questions.map(q => [q.id, q]))

    // 既存の in_progress セッションを探す（なければ新規作成）
    let sessionId: number

    let attemptNumber = 0

    const { data: existingSession } = await admin
      .from('answer_sessions')
      .select('id, attempt_number')
      .eq('student_id', student.id)
      .eq('question_set_id', input.questionSetId)
      .eq('is_latest', true)
      .eq('status', 'in_progress')
      .single()

    if (existingSession) {
      sessionId = existingSession.id
      attemptNumber = existingSession.attempt_number
    } else {
      // 前回の graded セッションを取得（他セクション回答のコピー元）
      const { data: prevGradedSession } = await admin
        .from('answer_sessions')
        .select('id')
        .eq('student_id', student.id)
        .eq('question_set_id', input.questionSetId)
        .eq('is_latest', true)
        .eq('status', 'graded')
        .single()

      // 新セッション作成（RPC: アトミック）
      const { data: sessionResult, error: rpcError } = await admin
        .rpc('create_exercise_session', {
          p_student_id: student.id,
          p_question_set_id: input.questionSetId,
        })

      if (rpcError || !sessionResult || sessionResult.length === 0) {
        console.error('Failed to create exercise session:', rpcError)
        return { ...empty, error: 'セッション作成に失敗しました' }
      }
      sessionId = sessionResult[0].id
      attemptNumber = sessionResult[0].attempt_number

      // 前回セッションから「今回採点しないセクション」の回答をコピー
      // → リロード後も他セクションの回答が復元される
      if (prevGradedSession) {
        const sectionQIdSet = new Set(input.sectionQuestionIds)
        const { data: prevAnswers } = await admin
          .from('student_answers')
          .select('question_id, raw_input, answer_value, is_correct, scored_at, answered_at')
          .eq('answer_session_id', prevGradedSession.id)

        const otherSectionAnswers = (prevAnswers || [])
          .filter(a => !sectionQIdSet.has(a.question_id))

        if (otherSectionAnswers.length > 0) {
          const { error: copyError } = await admin
            .from('student_answers')
            .insert(otherSectionAnswers.map(a => ({
              answer_session_id: sessionId,
              question_id: a.question_id,
              raw_input: a.raw_input || '',
              answer_value: a.answer_value || '',
              is_correct: a.is_correct ?? false,
              scored_at: a.scored_at || new Date().toISOString(),
              answered_at: a.answered_at || new Date().toISOString(),
            })))

          if (copyError) {
            console.error('Failed to copy other section answers:', copyError)
            return { ...empty, error: '他セクションの回答コピーに失敗しました' }
          }
        }
      }
    }

    // このセクションの採点
    // sectionMaxScore はセクション内の全問題のpoints合計（回答有無に関係なく）
    let sectionScore = 0
    // note（解説参照）は採点対象外 — クライアントが除外済みでも、サーバー側でも明示的に弾く
    const sectionQuestionsInScope = input.sectionQuestionIds
      .map(id => questionMap.get(id))
      .filter((q): q is NonNullable<typeof q> => q !== undefined && q.answer_type !== 'note')
    const sectionMaxScore = sectionQuestionsInScope.reduce((sum, q) => sum + q.points, 0)

    const results: ExerciseGradeResult[] = []
    const answersToUpsert: {
      answer_session_id: number
      question_id: number
      raw_input: string
      answer_value: string
      is_correct: boolean
      scored_at: string
      answered_at: string
    }[] = []

    // 回答済みの問題IDセット（セクション外・note の回答を拒否）
    const sectionQIdSet = new Set(sectionQuestionsInScope.map(q => q.id))
    const validAnswers = input.answers.filter(a => sectionQIdSet.has(a.questionId))
    const answeredIds = new Set(validAnswers.map(a => a.questionId))

    // 回答済み問題を採点
    for (const answer of validAnswers) {
      const question = questionMap.get(answer.questionId)
      if (!question) continue

      const gradeResult = gradeAnswer(
        question.answer_type as 'numeric' | 'fraction' | 'multi_part' | 'selection',
        answer.rawInput,
        question.correct_answer,
        question.answer_config as Record<string, unknown> | null
      )

      if (gradeResult.isCorrect) sectionScore += question.points

      const now = new Date().toISOString()
      answersToUpsert.push({
        answer_session_id: sessionId,
        question_id: answer.questionId,
        raw_input: answer.rawInput,
        answer_value: gradeResult.answerValue,
        is_correct: gradeResult.isCorrect,
        scored_at: now,
        answered_at: now,
      })

      let correctAnswer = question.correct_answer || ''
      if (question.answer_type === 'multi_part' && question.answer_config) {
        const config = question.answer_config as { correct_values: Record<string, string> }
        correctAnswer = JSON.stringify(config.correct_values)
      }

      results.push({
        questionId: answer.questionId,
        isCorrect: gradeResult.isCorrect,
        answerValue: gradeResult.answerValue,
        correctAnswer,
      })
    }

    // 未回答問題を不正解として記録
    for (const q of sectionQuestionsInScope) {
      if (answeredIds.has(q.id)) continue
      const now = new Date().toISOString()
      answersToUpsert.push({
        answer_session_id: sessionId,
        question_id: q.id,
        raw_input: '',
        answer_value: '',
        is_correct: false,
        scored_at: now,
        answered_at: now,
      })

      let correctAnswer = q.correct_answer || ''
      if (q.answer_type === 'multi_part' && q.answer_config) {
        const config = q.answer_config as { correct_values: Record<string, string> }
        correctAnswer = JSON.stringify(config.correct_values)
      }

      results.push({
        questionId: q.id,
        isCorrect: false,
        answerValue: '',
        correctAnswer,
      })
    }

    // student_answers を upsert（再採点に対応）
    if (answersToUpsert.length > 0) {
      const { error: upsertError } = await admin
        .from('student_answers')
        .upsert(answersToUpsert, { onConflict: 'answer_session_id,question_id' })

      if (upsertError) {
        console.error('Failed to upsert student_answers:', upsertError)
        return { ...empty, error: '回答の保存に失敗しました' }
      }
    }

    // セッション完了判定: クライアントの isFinal に加え、
    // サーバー側でも全問回答済みかを自動検出して graded に確定する
    // （クライアントが isFinal を送り損ねた場合のフォールバック）
    let shouldFinalize = input.isFinal

    if (!shouldFinalize) {
      // 全問回答済みかサーバー側で確認
      const { count: answeredCount } = await admin
        .from('student_answers')
        .select('*', { count: 'exact', head: true })
        .eq('answer_session_id', sessionId)
        .not('is_correct', 'is', null)

      const totalQuestionCount = questions.length
      if (answeredCount !== null && answeredCount >= totalQuestionCount) {
        shouldFinalize = true
      }
    }

    if (shouldFinalize) {
      // 全回答を集計
      const { data: allAnswers } = await admin
        .from('student_answers')
        .select('question_id, is_correct')
        .eq('answer_session_id', sessionId)

      let totalScore = 0
      const totalMaxScore = questions.reduce((sum, q) => sum + q.points, 0)

      for (const a of allAnswers || []) {
        if (a.is_correct) {
          const q = questionMap.get(a.question_id)
          if (q) totalScore += q.points
        }
      }

      await admin
        .from('answer_sessions')
        .update({
          status: 'graded',
          total_score: totalScore,
          max_score: totalMaxScore,
          completed_at: new Date().toISOString(),
          answers_revealed: true,
        })
        .eq('id', sessionId)

      return {
        results,
        sectionScore,
        sectionMaxScore,
        totalScore,
        totalMaxScore,
        attemptNumber,
        answerSessionId: sessionId,
      }
    }

    return {
      results,
      sectionScore,
      sectionMaxScore,
      answerSessionId: sessionId,
    }
  } catch (error) {
    console.error('Error in gradeExerciseSection:', error)
    return { ...empty, error: '予期しないエラーが発生しました' }
  }
}

// ================================================================
// 既存回答取得（再入力時のプリフィル + 結果表示）
// ================================================================

export async function getExerciseAnswerHistory(
  questionSetId: number
): Promise<{
  answerSessionId: number
  answers: ExerciseAnswerHistory[]
  attemptNumber: number
  totalScore: number | null
  maxScore: number | null
} | null> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const admin = createAdminClient()
    const student = await resolveStudentWithCourse(admin, user.id)
    if (!student) return null

    // 最新セッション
    const { data: session } = await admin
      .from('answer_sessions')
      .select('id, attempt_number, total_score, max_score')
      .eq('student_id', student.id)
      .eq('question_set_id', questionSetId)
      .eq('is_latest', true)
      .single()

    if (!session) return null

    // 解答データ
    const { data: answers } = await admin
      .from('student_answers')
      .select('question_id, raw_input, is_correct')
      .eq('answer_session_id', session.id)

    return {
      answerSessionId: session.id,
      answers: (answers || []).map(a => ({
        questionId: a.question_id,
        rawInput: a.raw_input || '',
        isCorrect: a.is_correct,
      })),
      attemptNumber: session.attempt_number,
      totalScore: session.total_score,
      maxScore: session.max_score,
    }
  } catch (error) {
    console.error('Error in getExerciseAnswerHistory:', error)
    return null
  }
}

// ================================================================
// 統合ロード: 1回のServer Action呼び出しで全データを返す
// auth + student解決を1回だけ行い、DB往復を並列化
// ================================================================

export interface ExerciseBundleReflection {
  id: number
  sectionName: string
  reflectionText: string
  attemptNumber: number
}

export interface ExerciseBundleFeedback {
  sectionName: string
  feedbackText: string
}

export interface ExerciseReflectionHistoryItem {
  sectionName: string
  reflectionText: string
  feedbackText: string | null
  sessionAttemptNumber: number
}

export interface ExerciseBundle {
  questionSet: ExerciseQuestionSet | null
  questions: ExerciseQuestion[]
  history: {
    answerSessionId: number
    answers: ExerciseAnswerHistory[]
    attemptNumber: number
    totalScore: number | null
    maxScore: number | null
  } | null
  reflections: ExerciseBundleReflection[]
  feedbacks: ExerciseBundleFeedback[]
  reflectionHistory: ExerciseReflectionHistoryItem[]
  error?: string
}

export async function loadExerciseBundle(
  sessionId: number,
  subjectId: number
): Promise<ExerciseBundle> {
  const empty: ExerciseBundle = {
    questionSet: null, questions: [], history: null,
    reflections: [], feedbacks: [], reflectionHistory: [],
  }

  try {
    // 認証 + student解決（1回だけ）
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { ...empty, error: '認証されていません' }

    const admin = createAdminClient()
    const student = await resolveStudentWithCourse(admin, user.id)
    if (!student) return { ...empty, error: '生徒情報が見つかりません' }

    // --- Phase 1: question_set 取得 ---
    const { data: qs } = await admin
      .from('question_sets')
      .select('id, title, study_sessions!inner(session_number)')
      .eq('session_id', sessionId)
      .eq('subject_id', subjectId)
      .eq('grade', student.grade)
      .eq('set_type', 'exercise_workbook')
      .eq('status', 'approved')
      .is('edition', null)
      .single()

    if (!qs) return empty

    const sessionInfo = qs.study_sessions as unknown as { session_number: number }
    const questionSetId = qs.id

    // --- Phase 2: questions + answer_session を並列取得 ---
    const [questionsResult, sessionResult] = await Promise.all([
      admin
        .from('questions')
        .select('id, question_number, section_name, answer_type, unit_label, answer_config, points, display_order, min_course')
        .eq('question_set_id', questionSetId)
        .order('display_order'),
      admin
        .from('answer_sessions')
        .select('id, attempt_number, total_score, max_score')
        .eq('student_id', student.id)
        .eq('question_set_id', questionSetId)
        .eq('is_latest', true)
        .maybeSingle(),
    ])

    // questions は致命的 — 問題データなしでは画面が成立しない
    if (questionsResult.error) {
      console.error('[loadExerciseBundle] questions fetch failed:', questionsResult.error)
      return { ...empty, error: '問題データの取得に失敗しました' }
    }
    // session は「行なし」が正常（未着手ユーザー）。DB障害のみエラー扱い
    if (sessionResult.error) {
      console.error('[loadExerciseBundle] session fetch failed:', sessionResult.error)
      return { ...empty, error: '回答セッションの取得に失敗しました' }
    }

    const questions = filterByCourse(questionsResult.data || [], student.course)
    const sanitizedQuestions: ExerciseQuestion[] = questions.map(q => ({
      id: q.id,
      questionNumber: q.question_number,
      sectionName: q.section_name,
      answerType: q.answer_type as ExerciseQuestion['answerType'],
      unitLabel: q.unit_label,
      answerConfig: sanitizeAnswerConfig(q.answer_type, q.answer_config as Record<string, unknown> | null, q.id),
      points: q.points,
      minCourse: q.min_course,
    }))

    const questionSet: ExerciseQuestionSet = {
      id: questionSetId,
      title: qs.title || `第${sessionInfo.session_number}回 演習問題集`,
      sessionNumber: sessionInfo.session_number,
    }

    const session = sessionResult.data
    if (!session) {
      return { ...empty, questionSet, questions: sanitizedQuestions }
    }

    // --- Phase 3: answers + reflections + feedbacks + history を並列取得 ---
    const allSessions = admin
      .from('answer_sessions')
      .select('id, attempt_number')
      .eq('student_id', student.id)
      .eq('question_set_id', questionSetId)
      .order('attempt_number')

    const [answersResult, reflectionsResult, allSessionsResult] = await Promise.all([
      admin
        .from('student_answers')
        .select('question_id, raw_input, is_correct')
        .eq('answer_session_id', session.id),
      admin
        .from('exercise_reflections')
        .select('id, section_name, reflection_text, attempt_number, answer_session_id')
        .eq('answer_session_id', session.id)
        .order('section_name')
        .order('attempt_number', { ascending: false }),
      allSessions,
    ])

    // answers は致命的 — 回答データなしでは採点結果を復元できない
    if (answersResult.error) {
      console.error('[loadExerciseBundle] answers fetch failed:', answersResult.error)
      return { ...empty, questionSet, questions: sanitizedQuestions, error: '回答データの取得に失敗しました' }
    }
    // reflections/allSessions は非致命的 — 振り返りが出ないだけで続行可
    if (reflectionsResult.error) {
      console.error('[loadExerciseBundle] reflections fetch failed:', reflectionsResult.error)
    }
    if (allSessionsResult.error) {
      console.error('[loadExerciseBundle] allSessions fetch failed:', allSessionsResult.error)
    }

    const answers: ExerciseAnswerHistory[] = (answersResult.data || []).map(a => ({
      questionId: a.question_id,
      rawInput: a.raw_input || '',
      isCorrect: a.is_correct,
    }))

    // 現セッションの振り返り（セクション最新のみ）
    type ReflectionRow = { id: number; section_name: string; reflection_text: string; attempt_number: number; answer_session_id: number }
    const reflectionRows = (reflectionsResult.data || []) as ReflectionRow[]
    const latestBySection = new Map<string, ReflectionRow>()
    for (const r of reflectionRows) {
      if (!latestBySection.has(r.section_name)) {
        latestBySection.set(r.section_name, r)
      }
    }
    const reflections: ExerciseBundleReflection[] = Array.from(latestBySection.values()).map(r => ({
      id: r.id,
      sectionName: r.section_name,
      reflectionText: r.reflection_text,
      attemptNumber: r.attempt_number,
    }))

    // --- Phase 4: feedbacks + 過去セッション振り返り を並列取得 ---
    const latestReflectionIds = reflections.map(r => r.id)
    const allSessionIds = (allSessionsResult.data || []).map(s => s.id)
    const sessionAttemptMap = new Map((allSessionsResult.data || []).map(s => [s.id, s.attempt_number]))

    const [feedbacksResult, allReflectionsResult] = await Promise.all([
      latestReflectionIds.length > 0
        ? admin.from('exercise_feedbacks')
            .select('exercise_reflection_id, feedback_text')
            .in('exercise_reflection_id', latestReflectionIds)
        : Promise.resolve({ data: [] as { exercise_reflection_id: number; feedback_text: string }[] }),
      // セッション1件 = 初回 or リトライなし → 過去セッションの振り返りは存在しない
      // 現セッションの振り返りは Phase 3 の reflectionsResult で取得済み
      allSessionIds.length > 1
        ? admin.from('exercise_reflections')
            .select('id, answer_session_id, section_name, reflection_text, created_at')
            .in('answer_session_id', allSessionIds)
            .order('created_at')
        : Promise.resolve({ data: [] as { id: number; answer_session_id: number; section_name: string; reflection_text: string; created_at: string }[] }),
    ])

    // Phase 4 は非致命的 — フィードバック/履歴が出ないだけで続行可
    if ('error' in feedbacksResult && feedbacksResult.error) {
      console.error('[loadExerciseBundle] feedbacks fetch failed:', feedbacksResult.error)
    }
    if ('error' in allReflectionsResult && allReflectionsResult.error) {
      console.error('[loadExerciseBundle] allReflections fetch failed:', allReflectionsResult.error)
    }

    // feedbacks → sectionName マッピング
    const idToSection = new Map(reflections.map(r => [r.id, r.sectionName]))
    const feedbacks: ExerciseBundleFeedback[] = (feedbacksResult.data || []).map(f => ({
      sectionName: idToSection.get(f.exercise_reflection_id) || '',
      feedbackText: f.feedback_text,
    }))

    // 過去セッションの振り返り履歴
    let reflectionHistory: ExerciseReflectionHistoryItem[] = []
    const pastReflections = allReflectionsResult.data || []
    if (pastReflections.length > 0) {
      const pastReflectionIds = pastReflections.map(r => r.id)
      const { data: pastFeedbacks, error: pastFbError } = await admin
        .from('exercise_feedbacks')
        .select('exercise_reflection_id, feedback_text')
        .in('exercise_reflection_id', pastReflectionIds)

      if (pastFbError) {
        console.error('[loadExerciseBundle] pastFeedbacks fetch failed:', pastFbError)
      }
      const pastFbMap = new Map((pastFeedbacks || []).map(f => [f.exercise_reflection_id, f.feedback_text]))
      reflectionHistory = pastReflections.map(r => ({
        sectionName: r.section_name,
        reflectionText: r.reflection_text,
        feedbackText: pastFbMap.get(r.id) || null,
        sessionAttemptNumber: sessionAttemptMap.get(r.answer_session_id) || 1,
      }))
    }

    return {
      questionSet,
      questions: sanitizedQuestions,
      history: {
        answerSessionId: session.id,
        answers,
        attemptNumber: session.attempt_number,
        totalScore: session.total_score,
        maxScore: session.max_score,
      },
      reflections,
      feedbacks,
      reflectionHistory,
    }
  } catch (error) {
    console.error('Error in loadExerciseBundle:', error)
    return { ...empty, error: '予期しないエラーが発生しました' }
  }
}
