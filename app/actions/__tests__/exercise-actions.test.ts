/**
 * 演習問題集 Server Actions 統合テスト
 *
 * exercise.ts 本体を直接importし、モックDBで以下を検証:
 * - RPC呼び出し（create_exercise_session）
 * - コースフィルタ後のmaxScore
 * - RPC失敗時のエラー返却
 * - student_answers INSERT失敗時の挙動
 */

import { vi, describe, it, expect, beforeEach } from 'vitest'

// ================================================================
// モック設定
// ================================================================
const mockRpc = vi.fn()
const mockFrom = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: vi.fn(async () => ({ data: { user: { id: 'user-uuid' } } })) },
  })),
  createAdminClient: vi.fn(() => ({ from: mockFrom, rpc: mockRpc })),
}))

vi.mock('@/lib/math-answer-utils', () => ({
  sanitizeAnswerConfig: vi.fn((_t: string, config: unknown) => config),
}))

// exercise.ts をトップレベルでimport（vi.mockより後に）
import { saveAndGradeExerciseAnswers, gradeExerciseSection } from '@/app/actions/exercise'

// ================================================================
// ヘルパー
// ================================================================

// .select().eq()...single() → Promise チェーン
function makeChain(data: unknown) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain: any = {}
  for (const m of ['select', 'eq', 'is', 'neq', 'update']) chain[m] = vi.fn(() => chain)
  chain.single = vi.fn(() => Promise.resolve({ data, error: null }))
  return chain
}

// .select().eq() → thenable チェーン（questions テーブル用）
// Supabase client は .eq() の戻り値がthenable（await可能）
function makeQuestionsChain(data: unknown[]) {
  const result = { data, error: null }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain: any = {
    // thenable: await chain で result を返す
    then: (resolve: (v: unknown) => void) => resolve(result),
  }
  chain.select = vi.fn(() => chain)
  chain.eq = vi.fn(() => chain)
  chain.order = vi.fn(() => chain)
  return chain
}

function setupMocks(opts: {
  questions: unknown[]
  rpcResult: { data: unknown; error: unknown }
  insertResult?: { error: unknown }
}) {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'students') return makeChain({ id: 1, grade: 5, course: 'A' })
    if (table === 'question_sets') return makeChain({ id: 100, grade: 5 })
    if (table === 'questions') return makeQuestionsChain(opts.questions)
    if (table === 'student_answers')
      return { insert: vi.fn(() => Promise.resolve(opts.insertResult ?? { error: null })) }
    if (table === 'answer_sessions') return makeChain(null)
    return makeChain(null)
  })
  mockRpc.mockResolvedValue(opts.rpcResult)
}

// ================================================================
// テスト
// ================================================================

describe('saveAndGradeExerciseAnswers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('正答/不正答を正しく判定し、コースフィルタ後のmaxScoreを返す', async () => {
    setupMocks({
      questions: [
        { id: 1, question_number: '1(1)', answer_type: 'numeric', correct_answer: '12', answer_config: null, points: 1, min_course: 'A' },
        { id: 2, question_number: '1(2)', answer_type: 'numeric', correct_answer: '42', answer_config: null, points: 1, min_course: 'A' },
        { id: 3, question_number: '2(1)', answer_type: 'numeric', correct_answer: '99', answer_config: null, points: 1, min_course: 'B' },
      ],
      rpcResult: { data: [{ id: 999, attempt_number: 1 }], error: null },
    })

    // saveAndGradeExerciseAnswers はトップレベルimport済み
    const result = await saveAndGradeExerciseAnswers({
      questionSetId: 100,
      answers: [
        { questionId: 1, rawInput: '12' },
        { questionId: 2, rawInput: '99' },
      ],
    })

    expect(mockRpc).toHaveBeenCalledWith('create_exercise_session', {
      p_student_id: 1, p_question_set_id: 100,
    })
    expect(result.maxScore).toBe(2) // Aコースでmin_course='B'除外
    expect(result.totalScore).toBe(1)
    expect(result.results).toHaveLength(2)
    expect(result.results[0].isCorrect).toBe(true)
    expect(result.results[1].isCorrect).toBe(false)
    expect(result.error).toBeUndefined()
  })

  it('RPC失敗時: エラーを返す', async () => {
    setupMocks({
      questions: [{ id: 1, points: 1, min_course: 'A', answer_type: 'numeric', correct_answer: '1', answer_config: null }],
      rpcResult: { data: null, error: { message: 'conflict' } },
    })

    // saveAndGradeExerciseAnswers はトップレベルimport済み
    const result = await saveAndGradeExerciseAnswers({
      questionSetId: 100,
      answers: [{ questionId: 1, rawInput: '1' }],
    })

    expect(result.error).toBe('セッション作成に失敗しました')
    expect(result.answerSessionId).toBe(0)
  })

  it('student_answers INSERT失敗時: エラーを返す', async () => {
    setupMocks({
      questions: [{ id: 1, points: 1, min_course: 'A', answer_type: 'numeric', correct_answer: '1', answer_config: null }],
      rpcResult: { data: [{ id: 888, attempt_number: 1 }], error: null },
      insertResult: { error: { message: 'insert failed' } },
    })

    // saveAndGradeExerciseAnswers はトップレベルimport済み
    const result = await saveAndGradeExerciseAnswers({
      questionSetId: 100,
      answers: [{ questionId: 1, rawInput: '1' }],
    })

    expect(result.error).toBe('回答の保存に失敗しました')
  })

  it('不正解リトライ: 前回正解が新セッションにマージされ総合点が維持される', async () => {
    // 前回: q1=正解, q2=不正解 → 今回: q2だけ再送信
    // 期待: q1の正解が新セッションにコピーされ、totalScore = q1 + q2の結果

    // answer_sessions: is_latest=true の前回セッション(id=500)
    const prevSessionChain = makeChain({ id: 500 })
    // student_answers: 前回の正解回答
    const prevAnswersChain = makeQuestionsChain([
      { question_id: 1, raw_input: '12', answer_value: '12', scored_at: '2026-03-15T00:00:00Z' },
    ])

    let answerSessionCallCount = 0
    let studentAnswersCallCount = 0

    mockFrom.mockImplementation((table: string) => {
      if (table === 'students') return makeChain({ id: 1, grade: 5, course: 'A' })
      if (table === 'question_sets') return makeChain({ id: 100, grade: 5 })
      if (table === 'questions') return makeQuestionsChain([
        { id: 1, question_number: '1(1)', answer_type: 'numeric', correct_answer: '12', answer_config: null, points: 1, min_course: 'A' },
        { id: 2, question_number: '1(2)', answer_type: 'numeric', correct_answer: '42', answer_config: null, points: 1, min_course: 'A' },
      ])
      if (table === 'answer_sessions') {
        answerSessionCallCount++
        if (answerSessionCallCount === 1) return prevSessionChain // 前回セッション取得
        return makeChain(null) // graded更新
      }
      if (table === 'student_answers') {
        studentAnswersCallCount++
        if (studentAnswersCallCount === 1) return prevAnswersChain // 前回正解取得
        return { insert: vi.fn(() => Promise.resolve({ error: null })) } // 一括INSERT
      }
      return makeChain(null)
    })

    mockRpc.mockResolvedValue({ data: [{ id: 777, attempt_number: 2 }], error: null })

    const result = await saveAndGradeExerciseAnswers({
      questionSetId: 100,
      answers: [{ questionId: 2, rawInput: '42' }], // 不正解だったq2を再送信（今回は正解）
      retryMode: 'incorrect_only',
    })

    expect(result.error).toBeUndefined()
    expect(result.maxScore).toBe(2) // 2問がコースA対象
    expect(result.totalScore).toBe(2) // q1(前回正解コピー) + q2(今回正解) = 2
    expect(result.results).toHaveLength(2) // q2の採点結果 + q1のコピー結果

    // q2は今回正解
    const q2Result = result.results.find(r => r.questionId === 2)
    expect(q2Result?.isCorrect).toBe(true)

    // q1は前回正解がマージされている
    const q1Result = result.results.find(r => r.questionId === 1)
    expect(q1Result?.isCorrect).toBe(true)
  })
})

// ================================================================
// gradeExerciseSection テスト
// ================================================================

describe('gradeExerciseSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  function setupSectionMocks(opts: {
    questions: unknown[]
    existingSession?: { id: number } | null
    rpcResult?: { data: unknown; error: unknown }
    upsertResult?: { error: unknown }
    allAnswersForFinal?: unknown[]
  }) {
    let answerSessionCallCount = 0
    let studentAnswersCallCount = 0

    mockFrom.mockImplementation((table: string) => {
      if (table === 'students') return makeChain({ id: 1, grade: 5, course: 'A' })
      if (table === 'question_sets') return makeChain({ id: 100, grade: 5 })
      if (table === 'questions') return makeQuestionsChain(opts.questions)
      if (table === 'answer_sessions') {
        answerSessionCallCount++
        if (answerSessionCallCount === 1) {
          // 既存 in_progress セッション検索
          return makeChain(opts.existingSession ?? null)
        }
        // graded更新
        return makeChain(null)
      }
      if (table === 'student_answers') {
        studentAnswersCallCount++
        if (opts.allAnswersForFinal && studentAnswersCallCount > 1) {
          // isFinal時の全回答取得
          return makeQuestionsChain(opts.allAnswersForFinal)
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const saChain: any = {
          upsert: vi.fn(() => Promise.resolve(opts.upsertResult ?? { error: null })),
          then: (resolve: (v: unknown) => void) => resolve({ data: opts.allAnswersForFinal || [], error: null, count: (opts.allAnswersForFinal || []).length }),
        }
        // select('*', { count, head }) チェーン対応
        saChain.select = vi.fn(() => saChain)
        saChain.eq = vi.fn(() => saChain)
        saChain.not = vi.fn(() => saChain)
        return saChain
      }
      return makeChain(null)
    })
    if (opts.rpcResult) mockRpc.mockResolvedValue(opts.rpcResult)
  }

  it('既存セッションがない場合RPCで新規作成する', async () => {
    setupSectionMocks({
      questions: [
        { id: 1, answer_type: 'numeric', correct_answer: '12', answer_config: null, points: 1, min_course: 'A' },
      ],
      existingSession: null,
      rpcResult: { data: [{ id: 500, attempt_number: 1 }], error: null },
    })

    const result = await gradeExerciseSection({
      questionSetId: 100,
      sectionQuestionIds: [1],
      answers: [{ questionId: 1, rawInput: '12' }],
      isFinal: false,
    })

    expect(mockRpc).toHaveBeenCalledWith('create_exercise_session', {
      p_student_id: 1, p_question_set_id: 100,
    })
    expect(result.error).toBeUndefined()
    expect(result.sectionScore).toBe(1)
    expect(result.sectionMaxScore).toBe(1)
  })

  it('既存in_progressセッションを再利用する', async () => {
    setupSectionMocks({
      questions: [
        { id: 1, answer_type: 'numeric', correct_answer: '12', answer_config: null, points: 1, min_course: 'A' },
      ],
      existingSession: { id: 999 },
    })

    const result = await gradeExerciseSection({
      questionSetId: 100,
      sectionQuestionIds: [1],
      answers: [{ questionId: 1, rawInput: '12' }],
      isFinal: false,
    })

    // RPCは呼ばれない（既存セッション再利用）
    expect(mockRpc).not.toHaveBeenCalled()
    expect(result.error).toBeUndefined()
    expect(result.answerSessionId).toBe(999)
  })

  it('未回答問題は不正解として記録され、sectionMaxScoreに含まれる', async () => {
    setupSectionMocks({
      questions: [
        { id: 1, answer_type: 'numeric', correct_answer: '12', answer_config: null, points: 1, min_course: 'A' },
        { id: 2, answer_type: 'numeric', correct_answer: '42', answer_config: null, points: 1, min_course: 'A' },
        { id: 3, answer_type: 'numeric', correct_answer: '99', answer_config: null, points: 1, min_course: 'A' },
      ],
      existingSession: { id: 500 },
    })

    const result = await gradeExerciseSection({
      questionSetId: 100,
      sectionQuestionIds: [1, 2, 3], // 3問がセクション内
      answers: [{ questionId: 1, rawInput: '12' }], // 1問だけ回答
      isFinal: false,
    })

    expect(result.sectionMaxScore).toBe(3) // 全3問
    expect(result.sectionScore).toBe(1) // 1問正解
    expect(result.results).toHaveLength(3) // 1正解 + 2未回答(不正解)
    expect(result.results.filter(r => !r.isCorrect)).toHaveLength(2)
  })

  it('他セクション回答コピーinsert失敗時にエラーを返す', async () => {
    // in_progress無し + 前回graded有り → 新セッション作成 → コピーinsert失敗
    let answerSessionCallCount = 0
    let studentAnswersCallCount = 0

    mockFrom.mockImplementation((table: string) => {
      if (table === 'students') return makeChain({ id: 1, grade: 5, course: 'A' })
      if (table === 'question_sets') return makeChain({ id: 100, grade: 5 })
      if (table === 'questions') return makeQuestionsChain([
        { id: 1, answer_type: 'numeric', correct_answer: '12', answer_config: null, points: 1, min_course: 'A' },
      ])
      if (table === 'answer_sessions') {
        answerSessionCallCount++
        if (answerSessionCallCount === 1) return makeChain(null) // in_progress無し
        if (answerSessionCallCount === 2) return makeChain({ id: 800 }) // 前回graded
        return makeChain(null)
      }
      if (table === 'student_answers') {
        studentAnswersCallCount++
        if (studentAnswersCallCount === 1) {
          // 前回回答取得（他セクションの回答がある）
          return makeQuestionsChain([
            { question_id: 99, raw_input: '5', answer_value: '5', is_correct: true, scored_at: '2026-03-15T00:00:00Z', answered_at: '2026-03-15T00:00:00Z' },
          ])
        }
        // コピーinsert → 失敗
        return { insert: vi.fn(() => Promise.resolve({ error: { message: 'copy failed' } })) }
      }
      return makeChain(null)
    })

    mockRpc.mockResolvedValue({ data: [{ id: 900, attempt_number: 2 }], error: null })

    const result = await gradeExerciseSection({
      questionSetId: 100,
      sectionQuestionIds: [1],
      answers: [{ questionId: 1, rawInput: '12' }],
      isFinal: true,
    })

    expect(result.error).toBe('他セクションの回答コピーに失敗しました')
    expect(result.answerSessionId).toBe(0)
  })

  it('セクション再挑戦後もisFinalでattemptNumberが返却される', async () => {
    setupSectionMocks({
      questions: [
        { id: 1, answer_type: 'numeric', correct_answer: '12', answer_config: null, points: 1, min_course: 'A' },
      ],
      existingSession: { id: 700 },
    })

    // 既存セッション再利用（再挑戦シナリオ）
    // existingSession のモックに attempt_number を追加
    mockFrom.mockImplementation((table: string) => {
      if (table === 'students') return makeChain({ id: 1, grade: 5, course: 'A' })
      if (table === 'question_sets') return makeChain({ id: 100, grade: 5 })
      if (table === 'questions') return makeQuestionsChain([
        { id: 1, answer_type: 'numeric', correct_answer: '12', answer_config: null, points: 1, min_course: 'A' },
      ])
      if (table === 'answer_sessions') return makeChain({ id: 700, attempt_number: 3 })
      if (table === 'student_answers') {
        return {
          upsert: vi.fn(() => Promise.resolve({ error: null })),
          then: (resolve: (v: unknown) => void) => resolve({ data: [{ question_id: 1, is_correct: true }], error: null }),
          select: vi.fn(function(this: unknown) { return this }),
          eq: vi.fn(function(this: unknown) { return this }),
        }
      }
      return makeChain(null)
    })

    const result = await gradeExerciseSection({
      questionSetId: 100,
      sectionQuestionIds: [1],
      answers: [{ questionId: 1, rawInput: '12' }],
      isFinal: true,
    })

    expect(result.error).toBeUndefined()
    expect(result.attemptNumber).toBe(3) // サーバーのDBの値が返る
  })
})
