'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { gradeAnswer } from '@/lib/math-grading'
import { sanitizeAnswerConfig, type MultiPartConfig, type SelectionConfig } from '@/lib/math-answer-utils'

// ================================================================
// 型定義（計画書 Section 5-3 準拠）
// ================================================================

export interface MathQuestionSetSummary {
  id: number
  title: string
  sessionNumber: number
  questionCount: number
  status: 'not_started' | 'in_progress' | 'graded'
  answersRevealed: boolean
  score?: { total: number; max: number; percentage: number }
  remainingCount?: number
}

export interface MathQuestionForUI {
  id: number
  questionNumber: string
  sectionName: string
  answerType: 'numeric' | 'fraction' | 'multi_part' | 'selection'
  unitLabel: string | null
  answerConfig: MultiPartConfig | SelectionConfig | null
  points: number
}

// MultiPartConfig, SelectionConfig は lib/math-answer-utils.ts から re-export

export interface MathGradingHistoryItem {
  questionSetId: number
  title: string
  sessionNumber: number
  questionCount: number
  latestAttempt: {
    attemptNumber: number
    status: 'in_progress' | 'graded'
    score: number
    maxScore: number
    percentage: number
    answersRevealed: boolean
    gradedAt: string | null
  } | null
  attemptHistory: {
    attempt: number
    score: number
    maxScore: number
    percentage: number
    gradedAt: string
  }[]
}

interface MathGradeDetail {
  questionId: number
  questionNumber: string
  sectionName: string
  answerType: string
  isCorrect: boolean | null
  rawInput: string | null
  unitLabel: string | null
  points: number
  earnedPoints: number
}

interface MathGradeDetailWithAnswer extends MathGradeDetail {
  rawInput: string | null
  correctAnswer: string
}

interface MathGradeResultWithoutAnswers {
  totalScore: number
  maxScore: number
  percentage: number
  attemptNumber: number
  answerSessionId: number
  details: MathGradeDetail[]
  answersRevealed: false
}

interface MathGradeResultWithAnswers {
  totalScore: number
  maxScore: number
  percentage: number
  attemptNumber: number
  answerSessionId: number
  details: MathGradeDetailWithAnswer[]
  answersRevealed: true
}

export type MathGradeResult = MathGradeResultWithoutAnswers | MathGradeResultWithAnswers

// ================================================================
// ヘルパー関数
// ================================================================

async function resolveStudentId(supabase: ReturnType<typeof createAdminClient>, userId: string): Promise<number | null> {
  const { data } = await supabase
    .from('students')
    .select('id')
    .eq('user_id', userId)
    .single()
  return data?.id ?? null
}

async function resolveParentId(supabase: ReturnType<typeof createAdminClient>, userId: string): Promise<number | null> {
  const { data } = await supabase
    .from('parents')
    .select('id')
    .eq('user_id', userId)
    .single()
  return data?.id ?? null
}

async function resolveCoachId(supabase: ReturnType<typeof createAdminClient>, userId: string): Promise<number | null> {
  const { data } = await supabase
    .from('coaches')
    .select('id')
    .eq('user_id', userId)
    .single()
  return data?.id ?? null
}

// sanitizeAnswerConfig は lib/math-answer-utils.ts に定義（import 済み）

// ================================================================
// 問題セット取得系
// ================================================================

/**
 * 生徒の学年に対応する算数の問題セット一覧を取得
 */
export async function getMathQuestionSets(): Promise<{
  questionSets: MathQuestionSetSummary[]
  error?: string
}> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { questionSets: [], error: '認証されていません' }

    const admin = createAdminClient()
    const studentId = await resolveStudentId(admin, user.id)
    if (!studentId) return { questionSets: [], error: '生徒情報が見つかりません' }

    // 生徒の学年を取得
    const { data: student } = await admin
      .from('students')
      .select('grade')
      .eq('id', studentId)
      .single()
    if (!student) return { questionSets: [], error: '生徒情報が見つかりません' }

    // approved な算数の問題セットを取得
    const { data: questionSets, error: qsError } = await admin
      .from('question_sets')
      .select(`
        id,
        title,
        display_order,
        study_sessions!inner(session_number)
      `)
      .eq('grade', student.grade)
      .eq('status', 'approved')
      .eq('subject_id', 1) // 算数
      .order('display_order')

    if (qsError) {
      console.error('Failed to get question sets:', qsError)
      return { questionSets: [], error: 'データ取得に失敗しました' }
    }

    const qsIds = (questionSets || []).map(qs => qs.id)
    if (qsIds.length === 0) return { questionSets: [] }

    // バッチ: 全問題セットの問題数を一括取得
    const { data: questionCounts } = await admin
      .from('questions')
      .select('question_set_id')
      .in('question_set_id', qsIds)

    const countMap = new Map<number, number>()
    for (const q of questionCounts || []) {
      countMap.set(q.question_set_id, (countMap.get(q.question_set_id) || 0) + 1)
    }

    // バッチ: 全 is_latest セッションを一括取得
    const { data: latestSessions } = await admin
      .from('answer_sessions')
      .select('id, question_set_id, status, total_score, max_score, answers_revealed, attempt_number')
      .eq('student_id', studentId)
      .in('question_set_id', qsIds)
      .eq('is_latest', true)

    const sessionMap = new Map(
      (latestSessions || []).map(s => [s.question_set_id, s])
    )

    // バッチ: graded セッションの残り問題数を一括取得
    const gradedSessionIds = (latestSessions || [])
      .filter(s => s.status === 'graded' && s.total_score !== null)
      .map(s => s.id)

    const remainingMap = new Map<number, number>()
    if (gradedSessionIds.length > 0) {
      const { data: remainingAnswers } = await admin
        .from('student_answers')
        .select('answer_session_id, is_correct')
        .in('answer_session_id', gradedSessionIds)
        .or('is_correct.is.null,is_correct.eq.false')

      for (const a of remainingAnswers || []) {
        remainingMap.set(a.answer_session_id, (remainingMap.get(a.answer_session_id) || 0) + 1)
      }
    }

    // 結果を組み立て
    const results: MathQuestionSetSummary[] = (questionSets || []).map(qs => {
      const sessionInfo = qs.study_sessions as unknown as { session_number: number }
      const session = sessionMap.get(qs.id)

      const summary: MathQuestionSetSummary = {
        id: qs.id,
        title: qs.title || `第${sessionInfo.session_number}回`,
        sessionNumber: sessionInfo.session_number,
        questionCount: countMap.get(qs.id) || 0,
        status: session ? (session.status as 'in_progress' | 'graded') : 'not_started',
        answersRevealed: session?.answers_revealed ?? false,
      }

      if (session?.status === 'graded' && session.total_score !== null && session.max_score !== null) {
        summary.score = {
          total: session.total_score,
          max: session.max_score,
          percentage: session.max_score > 0 ? Math.round((session.total_score / session.max_score) * 100) : 0,
        }
        summary.remainingCount = remainingMap.get(session.id) ?? undefined
      }

      return summary
    })

    return { questionSets: results }
  } catch (error) {
    console.error('Error in getMathQuestionSets:', error)
    return { questionSets: [], error: '予期しないエラーが発生しました' }
  }
}

/**
 * 指定の問題セットの全問題を取得（解答入力用）
 * 正答データは含めない
 */
export async function getMathQuestionsForAnswering(
  questionSetId: number
): Promise<{
  questions: MathQuestionForUI[]
  questionSet: { title: string; questionCount: number } | null
  error?: string
}> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { questions: [], questionSet: null, error: '認証されていません' }

    // 問題セット情報
    const { data: qs } = await supabase
      .from('question_sets')
      .select('id, title, status')
      .eq('id', questionSetId)
      .eq('status', 'approved')
      .single()

    if (!qs) return { questions: [], questionSet: null, error: '問題セットが見つかりません' }

    // 問題一覧（correct_answer を除外）
    const { data: questions, error: qError } = await supabase
      .from('questions')
      .select('id, question_number, section_name, answer_type, unit_label, answer_config, points, display_order')
      .eq('question_set_id', questionSetId)
      .order('display_order')

    if (qError) {
      console.error('Failed to get questions:', qError)
      return { questions: [], questionSet: null, error: 'データ取得に失敗しました' }
    }

    const sanitizedQuestions: MathQuestionForUI[] = (questions || []).map(q => ({
      id: q.id,
      questionNumber: q.question_number,
      sectionName: q.section_name,
      answerType: q.answer_type as MathQuestionForUI['answerType'],
      unitLabel: q.unit_label,
      answerConfig: sanitizeAnswerConfig(q.answer_type, q.answer_config as Record<string, unknown> | null, q.id),
      points: q.points,
    }))

    return {
      questions: sanitizedQuestions,
      questionSet: { title: qs.title || '', questionCount: sanitizedQuestions.length },
    }
  } catch (error) {
    console.error('Error in getMathQuestionsForAnswering:', error)
    return { questions: [], questionSet: null, error: '予期しないエラーが発生しました' }
  }
}

// ================================================================
// 解答保存・採点系
// ================================================================

/**
 * 途中保存（UPSERT）
 */
export async function saveMathDraftAnswers(input: {
  questionSetId: number
  answers: { questionId: number; rawInput: string | null }[]
}): Promise<{
  answerSessionId: number
  savedCount: number
  error?: string
}> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { answerSessionId: 0, savedCount: 0, error: '認証されていません' }

    const admin = createAdminClient()
    const studentId = await resolveStudentId(admin, user.id)
    if (!studentId) return { answerSessionId: 0, savedCount: 0, error: '生徒情報が見つかりません' }

    // 既存の in_progress セッションを検索
    let { data: session } = await admin
      .from('answer_sessions')
      .select('id, attempt_number')
      .eq('student_id', studentId)
      .eq('question_set_id', input.questionSetId)
      .eq('is_latest', true)
      .eq('status', 'in_progress')
      .single()

    // なければ新規作成
    if (!session) {
      // 前回のアテンプト番号を確認
      const { data: prevSession } = await admin
        .from('answer_sessions')
        .select('attempt_number')
        .eq('student_id', studentId)
        .eq('question_set_id', input.questionSetId)
        .order('attempt_number', { ascending: false })
        .limit(1)
        .single()

      const nextAttempt = (prevSession?.attempt_number ?? 0) + 1

      // 前の is_latest を false に
      if (prevSession) {
        await admin
          .from('answer_sessions')
          .update({ is_latest: false })
          .eq('student_id', studentId)
          .eq('question_set_id', input.questionSetId)
          .eq('is_latest', true)
      }

      const { data: newSession, error: createError } = await admin
        .from('answer_sessions')
        .insert({
          student_id: studentId,
          question_set_id: input.questionSetId,
          attempt_number: nextAttempt,
          is_latest: true,
          status: 'in_progress',
        })
        .select('id, attempt_number')
        .single()

      if (createError || !newSession) {
        console.error('Failed to create answer session:', createError)
        return { answerSessionId: 0, savedCount: 0, error: 'セッション作成に失敗しました' }
      }

      session = newSession
    }

    // 解答をUPSERT（空欄は既存レコードを削除）
    let savedCount = 0
    for (const answer of input.answers) {
      const isEmpty = answer.rawInput === null || answer.rawInput.trim() === ''

      if (isEmpty) {
        // 空欄 → 既存レコードがあれば削除（未回答に戻す）
        await admin
          .from('student_answers')
          .delete()
          .eq('answer_session_id', session.id)
          .eq('question_id', answer.questionId)
          .is('is_correct', null)  // 正解済み（リトライコピー）は削除しない
        continue
      }

      const { error: upsertError } = await admin
        .from('student_answers')
        .upsert(
          {
            answer_session_id: session.id,
            question_id: answer.questionId,
            raw_input: answer.rawInput,
            answered_at: new Date().toISOString(),
          },
          { onConflict: 'answer_session_id,question_id' }
        )

      if (!upsertError) savedCount++
    }

    return { answerSessionId: session.id, savedCount }
  } catch (error) {
    console.error('Error in saveMathDraftAnswers:', error)
    return { answerSessionId: 0, savedCount: 0, error: '予期しないエラーが発生しました' }
  }
}

/**
 * 採点（部分提出OK）
 */
export async function submitAndGradeMathAnswers(input: {
  answerSessionId: number
}): Promise<{
  result: MathGradeResult | null
  error?: string
}> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { result: null, error: '認証されていません' }

    const admin = createAdminClient()
    const studentId = await resolveStudentId(admin, user.id)
    if (!studentId) return { result: null, error: '生徒情報が見つかりません' }

    // 行ロック + 所有者チェック
    const { data: session, error: lockError } = await admin
      .rpc('lock_answer_session', {
        p_session_id: input.answerSessionId,
        p_student_id: studentId,
      })

    if (lockError || !session) {
      console.error('Failed to lock session:', lockError)
      return { result: null, error: 'セッションが見つかりません' }
    }

    // 既に graded の場合は既存結果を返す（冪等）
    if (session.status === 'graded') {
      return await buildGradeResult(admin, input.answerSessionId, session.question_set_id, studentId)
    }

    // 問題と正答を取得
    const { data: questions } = await admin
      .from('questions')
      .select('id, question_number, section_name, answer_type, correct_answer, answer_config, unit_label, points, display_order')
      .eq('question_set_id', session.question_set_id)
      .order('display_order')

    if (!questions || questions.length === 0) {
      return { result: null, error: '問題が見つかりません' }
    }

    // 生徒の解答を取得
    const { data: studentAnswers } = await admin
      .from('student_answers')
      .select('id, question_id, raw_input, is_correct')
      .eq('answer_session_id', input.answerSessionId)

    const answersMap = new Map(
      (studentAnswers || []).map(a => [a.question_id, a])
    )

    // 採点ループ
    let totalScore = 0
    const maxScore = questions.reduce((sum, q) => sum + q.points, 0)

    for (const question of questions) {
      const studentAnswer = answersMap.get(question.id)

      // 正解済みはスキップ（リトライ時）
      if (studentAnswer?.is_correct === true) {
        totalScore += question.points
        continue
      }

      // 未回答 or 空回答 → is_correct=NULL のまま
      if (!studentAnswer || !studentAnswer.raw_input || studentAnswer.raw_input.trim() === '') {
        continue
      }

      // 採点
      const result = gradeAnswer(
        question.answer_type as 'numeric' | 'fraction' | 'multi_part' | 'selection',
        studentAnswer.raw_input,
        question.correct_answer,
        question.answer_config as Record<string, unknown> | null
      )

      if (result.isCorrect) totalScore += question.points

      // student_answers を更新
      await admin
        .from('student_answers')
        .update({
          answer_value: result.answerValue,
          is_correct: result.isCorrect,
          scored_at: new Date().toISOString(),
        })
        .eq('id', studentAnswer.id)
    }

    // 全問正解チェック
    const allCorrect = totalScore === maxScore

    // answer_session を graded に更新
    await admin
      .from('answer_sessions')
      .update({
        status: 'graded',
        total_score: totalScore,
        max_score: maxScore,
        completed_at: new Date().toISOString(),
        answers_revealed: allCorrect,
      })
      .eq('id', input.answerSessionId)

    return await buildGradeResult(admin, input.answerSessionId, session.question_set_id, studentId)
  } catch (error) {
    console.error('Error in submitAndGradeMathAnswers:', error)
    return { result: null, error: '予期しないエラーが発生しました' }
  }
}

/**
 * 途中保存データの復元
 */
export async function getMathDraftAnswers(
  questionSetId: number
): Promise<{
  answerSessionId: number
  attemptNumber: number
  answers: { questionId: number; rawInput: string; isCorrect: boolean | null }[]
} | null> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const admin = createAdminClient()
    const studentId = await resolveStudentId(admin, user.id)
    if (!studentId) return null

    // 最新の in_progress セッション
    const { data: session } = await admin
      .from('answer_sessions')
      .select('id, attempt_number')
      .eq('student_id', studentId)
      .eq('question_set_id', questionSetId)
      .eq('is_latest', true)
      .eq('status', 'in_progress')
      .single()

    if (!session) return null

    // 解答データ
    const { data: answers } = await admin
      .from('student_answers')
      .select('question_id, raw_input, is_correct')
      .eq('answer_session_id', session.id)

    return {
      answerSessionId: session.id,
      attemptNumber: session.attempt_number,
      answers: (answers || []).map(a => ({
        questionId: a.question_id,
        rawInput: a.raw_input || '',
        isCorrect: a.is_correct,
      })),
    }
  } catch (error) {
    console.error('Error in getMathDraftAnswers:', error)
    return null
  }
}

/**
 * 採点結果の取得
 */
export async function getMathGradeResult(
  questionSetId: number
): Promise<{
  result: MathGradeResult | null
  error?: string
}> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { result: null, error: '認証されていません' }

    const admin = createAdminClient()
    const studentId = await resolveStudentId(admin, user.id)
    if (!studentId) return { result: null, error: '生徒情報が見つかりません' }

    // 最新の graded セッション
    const { data: session } = await admin
      .from('answer_sessions')
      .select('id, question_set_id')
      .eq('student_id', studentId)
      .eq('question_set_id', questionSetId)
      .eq('is_latest', true)
      .eq('status', 'graded')
      .single()

    if (!session) return { result: null }

    return await buildGradeResult(admin, session.id, questionSetId, studentId)
  } catch (error) {
    console.error('Error in getMathGradeResult:', error)
    return { result: null, error: '予期しないエラーが発生しました' }
  }
}

/**
 * リトライ開始
 */
export async function startMathRetry(input: {
  answerSessionId: number
}): Promise<{
  newAnswerSessionId: number
  error?: string
}> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { newAnswerSessionId: 0, error: '認証されていません' }

    const admin = createAdminClient()
    const studentId = await resolveStudentId(admin, user.id)
    if (!studentId) return { newAnswerSessionId: 0, error: '生徒情報が見つかりません' }

    // アトミック UPDATE: status='graded' + answers_revealed=false + is_latest=true を検証し
    // is_latest=false に更新。単一 UPDATE 文により、正答開示（reveal_math_answers）との
    // 競合を PostgreSQL 行レベルロックで防止。
    const { data: session, error: rpcError } = await admin
      .rpc('begin_math_retry', {
        p_session_id: input.answerSessionId,
        p_student_id: studentId,
      })

    if (rpcError || !session?.id) {
      if (rpcError) console.error('Failed to begin retry:', rpcError)
      return { newAnswerSessionId: 0, error: 'リトライを開始できません（解答開示済み、またはリトライ済みの可能性があります）' }
    }

    // 新セッション作成（is_latest は begin_math_retry で false に更新済み）
    const { data: newSession, error: createError } = await admin
      .from('answer_sessions')
      .insert({
        student_id: studentId,
        question_set_id: session.question_set_id,
        attempt_number: session.attempt_number + 1,
        is_latest: true,
        status: 'in_progress',
      })
      .select('id')
      .single()

    if (createError || !newSession) {
      if (createError?.code === '23505') {
        // 重複キー: 別の並行リクエストが既にリトライセッションを作成済み
        // 新セッションが is_latest=true を保持しているため、補償（旧セッション復元）は不要・逆効果
        console.warn('Duplicate retry session detected:', createError)
        return { newAnswerSessionId: 0, error: 'リトライセッションは既に作成されています。画面を更新してください。' }
      }
      // 23505 以外のエラー: 旧セッションの is_latest を復元（補償）
      // 注: 通信障害等で createError の実際のDB状態が不明な場合、この補償が逆効果になる
      // 可能性がある（例: INSERT は実際には成功している）。PoC段階ではログ出力で対応し、
      // 本番化時に最新セッション再取得による retry-safe 設計への移行を検討する。
      const { error: compensationError } = await admin
        .from('answer_sessions')
        .update({ is_latest: true })
        .eq('id', input.answerSessionId)

      if (compensationError) {
        // TODO: 本番化時に Sentry/監視アラート連携を追加（運用手順: 01_Math-AutoGrading-Plan.md 参照）
        console.error('CRITICAL: Compensation update also failed. Manual intervention may be needed.', {
          originalError: createError,
          compensationError,
          answerSessionId: input.answerSessionId,
        })
      }

      console.error('Failed to create retry session:', createError)
      return { newAnswerSessionId: 0, error: 'リトライセッション作成に失敗しました。画面を更新してください。' }
    }

    // 正解済み解答 + 不正解解答をコピー
    // - 正解 (is_correct=true): そのままコピー（ロック対象）
    // - 不正解 (is_correct=false): raw_input をプリフィルとしてコピー、is_correct/scored_at は NULL リセット
    // - 未回答 (is_correct=null, raw_input なし): コピーしない
    const { data: prevAnswers } = await admin
      .from('student_answers')
      .select('question_id, raw_input, answer_value, is_correct, scored_at')
      .eq('answer_session_id', input.answerSessionId)
      .not('is_correct', 'is', null)  // 正解 or 不正解のみ（未回答は除外）

    if (prevAnswers && prevAnswers.length > 0) {
      const { error: copyError } = await admin
        .from('student_answers')
        .insert(
          prevAnswers.map(a => a.is_correct
            ? {
                // 正解: そのままコピー
                answer_session_id: newSession.id,
                question_id: a.question_id,
                raw_input: a.raw_input,
                answer_value: a.answer_value,
                is_correct: true,
                scored_at: a.scored_at,
              }
            : {
                // 不正解: raw_input のみコピー、is_correct=NULL でリセット
                answer_session_id: newSession.id,
                question_id: a.question_id,
                raw_input: a.raw_input,
                answer_value: null,
                is_correct: null,
                scored_at: null,
              }
          )
        )

      if (copyError) {
        console.error('Failed to copy answers to new session:', copyError)
        // 新セッションは作成済みだが解答コピー失敗 — ユーザーに通知
        return { newAnswerSessionId: newSession.id, error: '解答のコピーに一部失敗しました。正解済みの解答が表示されない場合があります。' }
      }
    }

    return { newAnswerSessionId: newSession.id }
  } catch (error) {
    console.error('Error in startMathRetry:', error)
    return { newAnswerSessionId: 0, error: '予期しないエラーが発生しました' }
  }
}

/**
 * 正答開示
 */
export async function revealMathAnswers(input: {
  answerSessionId: number
}): Promise<{
  result: MathGradeResult | null
  error?: string
}> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { result: null, error: '認証されていません' }

    const admin = createAdminClient()
    const studentId = await resolveStudentId(admin, user.id)
    if (!studentId) return { result: null, error: '生徒情報が見つかりません' }

    // アトミック UPDATE: status='graded' + is_latest=true を検証し answers_revealed=true に更新
    // 単一 UPDATE 文により、リトライ開始（begin_math_retry）との競合を PostgreSQL 行レベルロックで防止
    const { data: session, error: rpcError } = await admin
      .rpc('reveal_math_answers', {
        p_session_id: input.answerSessionId,
        p_student_id: studentId,
      })

    if (rpcError || !session?.id) {
      if (rpcError) console.error('Failed to reveal answers:', rpcError)
      return { result: null, error: '正答開示に失敗しました（リトライが開始された可能性があります）' }
    }

    return await buildGradeResult(admin, input.answerSessionId, session.question_set_id, studentId)
  } catch (error) {
    console.error('Error in revealMathAnswers:', error)
    return { result: null, error: '予期しないエラーが発生しました' }
  }
}

/**
 * 算数自動採点の全履歴を取得（リフレクト・他ロール表示用）
 * 計画書 Section 12 準拠
 */
export async function getMathGradingHistory(input?: {
  studentId?: number  // 保護者・指導者用（省略時は自分）
}): Promise<{
  results: MathGradingHistoryItem[]
  summary: {
    latestScore: number | null
    averagePercentage: number | null
    completedSets: number
    inProgressSets: number
  }
  error?: string
}> {
  const emptySummary = { latestScore: null, averagePercentage: null, completedSets: 0, inProgressSets: 0 }
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { results: [], summary: emptySummary, error: '認証されていません' }

    const admin = createAdminClient()

    // studentId の解決（自分 or 指定された生徒）
    // クエリ数方針（計画書 Section 12「最大2クエリ」）:
    //   生徒パス: resolveStudentId (1) + RPC (1) = 2 ✓
    //   保護者/指導者パス: 認可チェック (2-3) + RPC (1) = 3-4
    //     → 認可クエリはセキュリティ上不可避。「最大2」はデータ取得クエリの目標であり、認可は別枠。
    let targetStudentId: number | null
    if (input?.studentId) {
      // 保護者・指導者による他生徒アクセス — 認可チェック
      targetStudentId = input.studentId

      // プロフィールからロール取得
      const { data: profile } = await admin
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (!profile) return { results: [], summary: emptySummary, error: 'プロフィールが見つかりません' }

      if (profile.role === 'parent') {
        const parentId = await resolveParentId(admin, user.id)
        if (!parentId) return { results: [], summary: emptySummary, error: '保護者情報が見つかりません' }
        const { data: parentRel } = await admin
          .from('parent_child_relations')
          .select('id')
          .eq('student_id', targetStudentId)
          .eq('parent_id', parentId)
          .single()
        if (!parentRel) return { results: [], summary: emptySummary, error: 'アクセス権限がありません' }
      } else if (profile.role === 'coach') {
        const coachId = await resolveCoachId(admin, user.id)
        if (!coachId) return { results: [], summary: emptySummary, error: '指導者情報が見つかりません' }
        const { data: coachRel } = await admin
          .from('coach_student_relations')
          .select('id')
          .eq('student_id', targetStudentId)
          .eq('coach_id', coachId)
          .single()
        if (!coachRel) return { results: [], summary: emptySummary, error: 'アクセス権限がありません' }
      } else if (profile.role !== 'admin') {
        return { results: [], summary: emptySummary, error: 'アクセス権限がありません' }
      }
    } else {
      targetStudentId = await resolveStudentId(admin, user.id)
    }
    if (!targetStudentId) return { results: [], summary: emptySummary, error: '生徒情報が見つかりません' }

    // CTE 集約 RPC: 1クエリでセット一覧 + 最新セッション + アテンプト履歴を取得
    // 計画書 Section 12 の「最大2クエリ」方針に準拠（resolveStudentId + この RPC）
    const { data: rows, error: rpcError } = await admin
      .rpc('get_math_grading_history', { p_student_id: targetStudentId })

    if (rpcError) {
      console.error('Failed to get math grading history:', rpcError)
      return { results: [], summary: emptySummary, error: 'データ取得に失敗しました' }
    }

    // RPC 結果を MathGradingHistoryItem[] に変換
    const results: MathGradingHistoryItem[] = (rows || []).map((row: {
      question_set_id: number; title: string; session_number: number;
      question_count: number; latest_session_id: number | null;
      latest_attempt_number: number | null; latest_status: string | null;
      latest_total_score: number | null; latest_max_score: number | null;
      latest_answers_revealed: boolean | null; latest_completed_at: string | null;
      attempt_history: { attempt: number; score: number; maxScore: number; percentage: number; gradedAt: string }[];
    }) => ({
      questionSetId: row.question_set_id,
      title: row.title || `第${row.session_number}回`,
      sessionNumber: row.session_number,
      questionCount: row.question_count,
      latestAttempt: row.latest_session_id ? {
        attemptNumber: row.latest_attempt_number!,
        status: row.latest_status as 'in_progress' | 'graded',
        score: row.latest_total_score ?? 0,
        maxScore: row.latest_max_score ?? 0,
        percentage: (row.latest_max_score && row.latest_max_score > 0)
          ? Math.round(((row.latest_total_score ?? 0) / row.latest_max_score) * 100) : 0,
        answersRevealed: row.latest_answers_revealed ?? false,
        gradedAt: row.latest_completed_at || null,
      } : null,
      attemptHistory: row.attempt_history || [],
    }))

    // サマリ集約
    let totalPercentage = 0
    let gradedCount = 0
    let completedSets = 0
    let inProgressSets = 0
    let latestScore: number | null = null
    let latestGradedAt: string | null = null

    for (const r of results) {
      if (!r.latestAttempt) continue
      if (r.latestAttempt.status === 'graded') {
        completedSets++
        totalPercentage += r.latestAttempt.percentage
        gradedCount++
        // completed_at が最も新しいセッションのスコアを latestScore とする
        if (!latestGradedAt || (r.latestAttempt.gradedAt && r.latestAttempt.gradedAt > latestGradedAt)) {
          latestGradedAt = r.latestAttempt.gradedAt
          latestScore = r.latestAttempt.score
        }
      } else {
        inProgressSets++
      }
    }

    return {
      results,
      summary: {
        latestScore,
        averagePercentage: gradedCount > 0 ? Math.round(totalPercentage / gradedCount) : null,
        completedSets,
        inProgressSets,
      },
    }
  } catch (error) {
    console.error('Error in getMathGradingHistory:', error)
    return { results: [], summary: emptySummary, error: '予期しないエラーが発生しました' }
  }
}

// ================================================================
// 内部ヘルパー
// ================================================================

async function buildGradeResult(
  admin: ReturnType<typeof createAdminClient>,
  answerSessionId: number,
  questionSetId: number,
  studentId: number
): Promise<{ result: MathGradeResult | null; error?: string }> {
  // セッション情報
  const { data: session } = await admin
    .from('answer_sessions')
    .select('total_score, max_score, attempt_number, answers_revealed')
    .eq('id', answerSessionId)
    .single()

  if (!session) return { result: null, error: 'セッション情報の取得に失敗しました' }

  // 問題一覧
  const { data: questions } = await admin
    .from('questions')
    .select('id, question_number, section_name, answer_type, correct_answer, answer_config, unit_label, points, display_order')
    .eq('question_set_id', questionSetId)
    .order('display_order')

  if (!questions) return { result: null, error: '問題情報の取得に失敗しました' }

  // 生徒の解答
  const { data: studentAnswers } = await admin
    .from('student_answers')
    .select('question_id, raw_input, is_correct')
    .eq('answer_session_id', answerSessionId)

  const answersMap = new Map(
    (studentAnswers || []).map(a => [a.question_id, a])
  )

  const totalScore = session.total_score ?? 0
  const maxScore = session.max_score ?? 0

  if (session.answers_revealed) {
    // 正答開示モード
    const details: MathGradeDetailWithAnswer[] = questions.map(q => {
      const answer = answersMap.get(q.id)
      let displayCorrectAnswer = q.correct_answer || ''
      if (q.answer_type === 'multi_part' && q.answer_config) {
        const config = q.answer_config as { correct_values: Record<string, string> }
        displayCorrectAnswer = JSON.stringify(config.correct_values)
      } else if (q.answer_type === 'selection' && q.answer_config) {
        const config = q.answer_config as { correct_values: string[] }
        displayCorrectAnswer = config.correct_values.join(', ')
      }

      return {
        questionId: q.id,
        questionNumber: q.question_number,
        sectionName: q.section_name,
        answerType: q.answer_type,
        isCorrect: answer?.is_correct ?? null,
        rawInput: answer?.raw_input ?? null,
        unitLabel: q.unit_label,
        points: q.points,
        earnedPoints: answer?.is_correct ? q.points : 0,
        correctAnswer: displayCorrectAnswer,
      }
    })

    return {
      result: {
        totalScore,
        maxScore,
        percentage: maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0,
        attemptNumber: session.attempt_number,
        answerSessionId,
        details,
        answersRevealed: true,
      },
    }
  } else {
    // 正答非表示モード — rawInput はクライアントに返さない（✅/❌/⬜ のみ）
    const details: MathGradeDetail[] = questions.map(q => {
      const answer = answersMap.get(q.id)
      return {
        questionId: q.id,
        questionNumber: q.question_number,
        sectionName: q.section_name,
        answerType: q.answer_type,
        isCorrect: answer?.is_correct ?? null,
        rawInput: null,  // 正答非表示モードでは返却しない
        unitLabel: q.unit_label,
        points: q.points,
        earnedPoints: answer?.is_correct ? q.points : 0,
      }
    })

    return {
      result: {
        totalScore,
        maxScore,
        percentage: maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0,
        attemptNumber: session.attempt_number,
        answerSessionId,
        details,
        answersRevealed: false,
      },
    }
  }
}
