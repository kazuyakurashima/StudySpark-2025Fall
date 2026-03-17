/**
 * loadExerciseBundle テスト
 *
 * テスト対象:
 * - 初回アクセス（history なし）→ questionSet + questions のみ
 * - 採点済み復元 → 全フィールドに値
 * - questions クエリ失敗 → エラー返却
 * - session 行なし（未着手）→ 正常扱い
 * - answers クエリ失敗 → エラー返却
 * - reflections クエリ失敗 → 非致命的（空で続行）
 */

import { vi, describe, it, expect, beforeEach } from 'vitest'

// ================================================================
// モック設定
// ================================================================

const mockFrom = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: vi.fn(async () => ({ data: { user: { id: 'user-uuid' } } })) },
  })),
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}))

import { loadExerciseBundle } from '@/app/actions/exercise'

// ================================================================
// ヘルパー
// ================================================================

interface ChainOptions {
  data?: unknown
  error?: { message: string; code?: string } | null
}

/** Supabase クエリチェインのモック生成 */
function makeChain(opts: ChainOptions = {}) {
  const result = { data: opts.data ?? null, error: opts.error ?? null }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain: any = {}
  for (const m of ['select', 'eq', 'is', 'in', 'order', 'limit']) {
    chain[m] = vi.fn(() => chain)
  }
  chain.single = vi.fn(() => Promise.resolve(result))
  chain.maybeSingle = vi.fn(() => Promise.resolve(result))
  // thenable（await で直接解決可能）
  chain.then = (resolve: (v: unknown) => void) => resolve(result)
  return chain
}

// question_set の固定データ
const MOCK_QS = {
  id: 100,
  title: '小5第1回 算数 演習問題集',
  study_sessions: { session_number: 1 },
}

// questions の固定データ
const MOCK_QUESTIONS = [
  { id: 1, question_number: '1(1)', section_name: 'ステップ①', answer_type: 'numeric', unit_label: 'km', answer_config: null, points: 1, display_order: 1, min_course: 'A' },
  { id: 2, question_number: '1(2)', section_name: 'ステップ①', answer_type: 'numeric', unit_label: 'm', answer_config: null, points: 1, display_order: 2, min_course: 'A' },
]

// student の固定データ
const MOCK_STUDENT = { id: 1, grade: 5, course: 'A' }

// ================================================================
// テスト本体
// ================================================================

describe('loadExerciseBundle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  /** mockFrom の呼び出しをテーブル名で設定 */
  function setupMockFrom(tableMap: Record<string, ReturnType<typeof makeChain>>) {
    mockFrom.mockImplementation((table: string) => {
      return tableMap[table] || makeChain({ data: null })
    })
  }

  it('初回アクセス: questionSet + questions のみ、history は null', async () => {
    setupMockFrom({
      students: makeChain({ data: MOCK_STUDENT }),
      question_sets: makeChain({ data: MOCK_QS }),
      questions: makeChain({ data: MOCK_QUESTIONS }),
      answer_sessions: makeChain({ data: null }), // 未着手 → maybeSingle で null
    })

    const result = await loadExerciseBundle(1, 1)

    expect(result.error).toBeUndefined()
    expect(result.questionSet).not.toBeNull()
    expect(result.questionSet!.id).toBe(100)
    expect(result.questions).toHaveLength(2)
    expect(result.history).toBeNull()
    expect(result.reflections).toEqual([])
    expect(result.feedbacks).toEqual([])
    expect(result.reflectionHistory).toEqual([])
  })

  it('採点済み復元: 全フィールドに値が入る', async () => {
    const sessionChainPhase2 = makeChain({
      data: { id: 10, attempt_number: 1, total_score: 2, max_score: 2 },
    })
    const sessionChainPhase3 = makeChain({
      data: [{ id: 10, attempt_number: 1 }],
    })

    // answer_sessions は Phase 2（maybeSingle）と Phase 3（order → thenable）で2回呼ばれる
    let answerSessionCallCount = 0
    const answerSessionChain = {
      ...makeChain({ data: null }),
      // Phase 2 と 3 で異なるデータを返す
    }

    setupMockFrom({
      students: makeChain({ data: MOCK_STUDENT }),
      question_sets: makeChain({ data: MOCK_QS }),
      questions: makeChain({ data: MOCK_QUESTIONS }),
      answer_sessions: (() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const chain: any = {}
        for (const m of ['select', 'eq', 'is', 'in', 'order', 'limit']) {
          chain[m] = vi.fn(() => chain)
        }
        chain.maybeSingle = vi.fn(() => {
          answerSessionCallCount++
          if (answerSessionCallCount === 1) {
            // Phase 2: latest session
            return Promise.resolve({ data: { id: 10, attempt_number: 1, total_score: 2, max_score: 2 }, error: null })
          }
          return Promise.resolve({ data: null, error: null })
        })
        chain.single = chain.maybeSingle
        chain.then = (resolve: (v: unknown) => void) => {
          // Phase 3: all sessions (thenable)
          return resolve({ data: [{ id: 10, attempt_number: 1 }], error: null })
        }
        return chain
      })(),
      student_answers: makeChain({
        data: [
          { question_id: 1, raw_input: '4.8', is_correct: true },
          { question_id: 2, raw_input: '100', is_correct: true },
        ],
      }),
      exercise_reflections: makeChain({
        data: [{ id: 50, section_name: 'ステップ①', reflection_text: '速さの計算が分かった', attempt_number: 1, answer_session_id: 10 }],
      }),
      exercise_feedbacks: makeChain({
        data: [{ exercise_reflection_id: 50, feedback_text: 'よく頑張りました！' }],
      }),
    })

    const result = await loadExerciseBundle(1, 1)

    expect(result.error).toBeUndefined()
    expect(result.questionSet).not.toBeNull()
    expect(result.history).not.toBeNull()
    expect(result.history!.answerSessionId).toBe(10)
    expect(result.history!.answers).toHaveLength(2)
    expect(result.history!.totalScore).toBe(2)
    expect(result.reflections).toHaveLength(1)
    expect(result.reflections[0].reflectionText).toBe('速さの計算が分かった')
  })

  it('questions クエリ失敗: エラー返却', async () => {
    setupMockFrom({
      students: makeChain({ data: MOCK_STUDENT }),
      question_sets: makeChain({ data: MOCK_QS }),
      questions: makeChain({ data: null, error: { message: 'DB connection failed' } }),
      answer_sessions: makeChain({ data: null }),
    })

    const result = await loadExerciseBundle(1, 1)

    expect(result.error).toBe('問題データの取得に失敗しました')
    expect(result.questionSet).toBeNull()
    expect(result.questions).toEqual([])
  })

  it('session 行なし（未着手ユーザー）: 正常扱い', async () => {
    setupMockFrom({
      students: makeChain({ data: MOCK_STUDENT }),
      question_sets: makeChain({ data: MOCK_QS }),
      questions: makeChain({ data: MOCK_QUESTIONS }),
      answer_sessions: makeChain({ data: null, error: null }), // maybeSingle → null, no error
    })

    const result = await loadExerciseBundle(1, 1)

    expect(result.error).toBeUndefined()
    expect(result.questionSet).not.toBeNull()
    expect(result.questions).toHaveLength(2)
    expect(result.history).toBeNull()
  })

  it('answers クエリ失敗: エラー返却（致命的）', async () => {
    let answerSessionCallCount = 0
    setupMockFrom({
      students: makeChain({ data: MOCK_STUDENT }),
      question_sets: makeChain({ data: MOCK_QS }),
      questions: makeChain({ data: MOCK_QUESTIONS }),
      answer_sessions: (() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const chain: any = {}
        for (const m of ['select', 'eq', 'is', 'in', 'order', 'limit']) {
          chain[m] = vi.fn(() => chain)
        }
        chain.maybeSingle = vi.fn(() => {
          answerSessionCallCount++
          if (answerSessionCallCount === 1) {
            return Promise.resolve({ data: { id: 10, attempt_number: 1, total_score: 2, max_score: 2 }, error: null })
          }
          return Promise.resolve({ data: null, error: null })
        })
        chain.single = chain.maybeSingle
        chain.then = (resolve: (v: unknown) => void) => resolve({ data: [], error: null })
        return chain
      })(),
      student_answers: makeChain({ data: null, error: { message: 'timeout' } }),
      exercise_reflections: makeChain({ data: [] }),
    })

    const result = await loadExerciseBundle(1, 1)

    expect(result.error).toBe('回答データの取得に失敗しました')
    expect(result.questionSet).not.toBeNull()
    expect(result.questions).toHaveLength(2)
    expect(result.history).toBeNull()
  })

  it('reflections クエリ失敗: 非致命的（空で続行）', async () => {
    let answerSessionCallCount = 0
    setupMockFrom({
      students: makeChain({ data: MOCK_STUDENT }),
      question_sets: makeChain({ data: MOCK_QS }),
      questions: makeChain({ data: MOCK_QUESTIONS }),
      answer_sessions: (() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const chain: any = {}
        for (const m of ['select', 'eq', 'is', 'in', 'order', 'limit']) {
          chain[m] = vi.fn(() => chain)
        }
        chain.maybeSingle = vi.fn(() => {
          answerSessionCallCount++
          if (answerSessionCallCount === 1) {
            return Promise.resolve({ data: { id: 10, attempt_number: 1, total_score: 2, max_score: 2 }, error: null })
          }
          return Promise.resolve({ data: null, error: null })
        })
        chain.single = chain.maybeSingle
        chain.then = (resolve: (v: unknown) => void) => resolve({ data: [{ id: 10, attempt_number: 1 }], error: null })
        return chain
      })(),
      student_answers: makeChain({
        data: [
          { question_id: 1, raw_input: '4.8', is_correct: true },
          { question_id: 2, raw_input: '100', is_correct: false },
        ],
      }),
      exercise_reflections: makeChain({ data: null, error: { message: 'connection reset' } }),
      exercise_feedbacks: makeChain({ data: [] }),
    })

    const result = await loadExerciseBundle(1, 1)

    // エラーは返さず、振り返りは空で続行
    expect(result.error).toBeUndefined()
    expect(result.history).not.toBeNull()
    expect(result.history!.answers).toHaveLength(2)
    expect(result.reflections).toEqual([])
    expect(result.feedbacks).toEqual([])
  })
})
