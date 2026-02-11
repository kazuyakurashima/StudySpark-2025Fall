// ============================================================================
// 算数自動採点 — Server Actions テスト
// ============================================================================
// 計画書: docs/poc-auto-grading/01_Math-AutoGrading-Plan.md Section 9 Step 3
//
// テスト範囲:
//   1. sanitizeAnswerConfig() — 正答漏えい防止テスト（6ケース）
//   2. buildGradeResult 相当のロジック — 正答非表示モードの DTO 検証
//
// 注: Server Actions 自体（getMathQuestionsForAnswering 等）は Supabase 接続が必要なため
//     ここでは sanitizeAnswerConfig の純粋関数部分をテスト対象とする。
//     Server Actions の統合テストは E2E テストで担保する。

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { sanitizeAnswerConfig } from '@/lib/math-answer-utils'

// ============================================================
// Supabase モック（Server Actions テスト用）
// ============================================================
// createClient / createAdminClient をモック化し、
// 各テストで応答値を注入する

// モック用のレスポンスストア
let mockAdminTableResponses: Record<string, { data?: unknown; error?: unknown; count?: number | null }[]> = {}
let mockAdminRpcResponses: Record<string, { data?: unknown; error?: unknown }> = {}
let mockAuthUser: { id: string } | null = { id: 'test-user-uuid' }
const mockInsertCalls: { table: string; data: unknown }[] = []
const mockUpdateCalls: { table: string; data: unknown }[] = []

function resetMocks() {
  mockAdminTableResponses = {}
  mockAdminRpcResponses = {}
  mockAuthUser = { id: 'test-user-uuid' }
  mockInsertCalls.length = 0
  mockUpdateCalls.length = 0
}

// テーブルごとの応答カウンター
const tableCounters: Record<string, number> = {}

function createChain(table: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain: any = new Proxy({}, {
    get(_, prop: string) {
      if (prop === 'then') {
        return (resolve: (v: unknown) => void) => {
          const idx = tableCounters[table] ?? 0
          tableCounters[table] = idx + 1
          const responses = mockAdminTableResponses[table] ?? []
          resolve(responses[idx] ?? { data: null, error: null })
        }
      }
      if (prop === 'insert') {
        return (data: unknown) => { mockInsertCalls.push({ table, data }); return chain }
      }
      if (prop === 'upsert') {
        return (data: unknown) => { mockInsertCalls.push({ table, data }); return chain }
      }
      if (prop === 'update') {
        return (data: unknown) => { mockUpdateCalls.push({ table, data }); return chain }
      }
      if (prop === 'delete') {
        return () => chain
      }
      // All other methods (select, eq, in, is, not, or, order, limit, single, head) return chain
      return (..._args: unknown[]) => chain
    },
  })
  return chain
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: mockAuthUser },
      })),
    },
    from: (table: string) => createChain(table),
  })),
  createAdminClient: vi.fn(() => ({
    from: (table: string) => createChain(table),
    rpc: (fn: string, _params: unknown) => {
      return mockAdminRpcResponses[fn] ?? { data: null, error: null }
    },
  })),
}))

// ============================================================
// 正答漏えい防止テスト: sanitizeAnswerConfig
// ============================================================
describe('sanitizeAnswerConfig — 正答漏えい防止', () => {
  // ----------------------------------------------------------------
  // numeric タイプ
  // ----------------------------------------------------------------
  it('numeric タイプ: answer_config が null → null を返す', () => {
    const result = sanitizeAnswerConfig('numeric', null, 1)
    expect(result).toBeNull()
  })

  it('numeric タイプ: answer_config があっても null を返す（numeric は config 不要）', () => {
    const result = sanitizeAnswerConfig('numeric', { some: 'data' }, 1)
    expect(result).toBeNull()
  })

  // ----------------------------------------------------------------
  // fraction タイプ
  // ----------------------------------------------------------------
  it('fraction タイプ: null を返す（fraction は config 不要）', () => {
    const result = sanitizeAnswerConfig('fraction', null, 1)
    expect(result).toBeNull()
  })

  // ----------------------------------------------------------------
  // multi_part タイプ
  // ----------------------------------------------------------------
  it('multi_part タイプ: correct_values が除去される', () => {
    const config = {
      slots: [{ label: 'A', unit: '個' }, { label: 'B', unit: '個' }],
      correct_values: { A: '14', B: '11' },
      template: 'Aは{A}個、Bは{B}個',
    }

    const result = sanitizeAnswerConfig('multi_part', config, 1)

    expect(result).not.toBeNull()
    // correct_values が含まれないこと
    expect(result).not.toHaveProperty('correct_values')
    // template と slots は含まれること
    expect(result).toHaveProperty('template', 'Aは{A}個、Bは{B}個')
    expect(result).toHaveProperty('slots')
    const mpResult = result as { template: string; slots: { label: string; unit: string }[] }
    expect(mpResult.slots).toHaveLength(2)
    expect(mpResult.slots[0]).toEqual({ label: 'A', unit: '個' })
  })

  it('multi_part タイプ: slots が配列でない → null を返す', () => {
    const config = {
      slots: 'invalid',
      correct_values: { A: '14' },
      template: 'Aは{A}個',
    }

    const result = sanitizeAnswerConfig('multi_part', config, 1)
    expect(result).toBeNull()
  })

  it('multi_part タイプ: template が文字列でない → null を返す', () => {
    const config = {
      slots: [{ label: 'A', unit: '個' }],
      correct_values: { A: '14' },
      template: 123,
    }

    const result = sanitizeAnswerConfig('multi_part', config as Record<string, unknown>, 1)
    expect(result).toBeNull()
  })

  // ----------------------------------------------------------------
  // selection タイプ
  // ----------------------------------------------------------------
  it('selection タイプ: correct_values と dummy_values が分離され options に統合される', () => {
    const config = {
      correct_values: ['3', '7', '11'],
      dummy_values: ['5', '9', '13'],
      unit: null,
    }

    const result = sanitizeAnswerConfig('selection', config, 42)

    expect(result).not.toBeNull()
    // correct_values が含まれないこと
    expect(result).not.toHaveProperty('correct_values')
    // dummy_values が含まれないこと
    expect(result).not.toHaveProperty('dummy_values')
    // options が含まれること（correct + dummy の全要素）
    expect(result).toHaveProperty('options')
    const selResult = result as { options: string[]; unit: string | null }
    expect(selResult.options).toHaveLength(6)
    // 全要素が含まれていること（順序はシャッフルされるため確認しない）
    expect(selResult.options.sort()).toEqual(['11', '13', '3', '5', '7', '9'])
  })

  it('selection タイプ: unit プロパティが返却される', () => {
    const config = {
      correct_values: ['金曜日'],
      dummy_values: ['月曜日', '火曜日'],
      unit: '曜日',
    }

    const result = sanitizeAnswerConfig('selection', config, 1)

    expect(result).not.toBeNull()
    const selResult = result as { options: string[]; unit: string | null }
    expect(selResult.unit).toBe('曜日')
  })

  it('selection タイプ: correct_values が配列でない → null を返す', () => {
    const config = {
      correct_values: 'not an array',
      dummy_values: ['5', '9'],
    }

    const result = sanitizeAnswerConfig('selection', config as Record<string, unknown>, 1)
    expect(result).toBeNull()
  })

  it('selection タイプ: dummy_values が配列でない → null を返す', () => {
    const config = {
      correct_values: ['3', '7'],
      dummy_values: 'not an array',
    }

    const result = sanitizeAnswerConfig('selection', config as Record<string, unknown>, 1)
    expect(result).toBeNull()
  })

  // ----------------------------------------------------------------
  // エッジケース
  // ----------------------------------------------------------------
  it('config が null → null を返す', () => {
    expect(sanitizeAnswerConfig('multi_part', null, 1)).toBeNull()
    expect(sanitizeAnswerConfig('selection', null, 1)).toBeNull()
  })

  it('不明な answer_type → null を返す', () => {
    const config = { some: 'data' }
    expect(sanitizeAnswerConfig('unknown_type', config, 1)).toBeNull()
  })

  // ----------------------------------------------------------------
  // シャッフル安定性
  // ----------------------------------------------------------------
  it('selection タイプ: 同一 questionId で同一シャッフル順序', () => {
    const config = {
      correct_values: ['3', '7', '11'],
      dummy_values: ['5', '9', '13'],
    }

    const result1 = sanitizeAnswerConfig('selection', config, 42)
    const result2 = sanitizeAnswerConfig('selection', config, 42)

    expect(result1).toEqual(result2)
  })

  // シャッフル順序の差異テストは lib/__tests__/math-grading.test.ts の
  // shuffleWithSeed テストでカバー済みのため、ここでは省略
})

// ============================================================
// リトライ関連テスト（計画書 Section 9 Step 3 lines 1753-1760）
// ============================================================
// Supabase モックを使用した Server Actions テスト

// Server Actions は vi.mock の後にインポート
// eslint-disable-next-line @typescript-eslint/no-require-imports
const {
  startMathRetry,
  getMathDraftAnswers,
  submitAndGradeMathAnswers,
  getMathQuestionsForAnswering,
  getMathGradeResult,
  revealMathAnswers,
} = await import('@/app/actions/math-answer')

describe('リトライ関連テスト — Server Actions (Supabase モック)', () => {
  beforeEach(() => {
    resetMocks()
    // tableCounters もリセット
    for (const key of Object.keys(tableCounters)) {
      delete tableCounters[key]
    }
  })

  // ----------------------------------------------------------------
  // startMathRetry テスト
  // ----------------------------------------------------------------
  it('startMathRetry: answers_revealed=true → begin_math_retry が null を返しエラー', async () => {
    // resolveStudentId 用
    mockAdminTableResponses['students'] = [
      { data: { id: 100 } },
    ]
    // begin_math_retry: answers_revealed=true のため WHERE 不一致 → null
    mockAdminRpcResponses['begin_math_retry'] = {
      data: null,
      error: null,
    }

    const result = await startMathRetry({ answerSessionId: 1 })

    expect(result.error).toBeTruthy()
    expect(result.error).toContain('リトライを開始できません')
    expect(result.newAnswerSessionId).toBe(0)
  })

  it('startMathRetry: 新セッション（attempt_number+1, is_latest=true, in_progress）が作成される', async () => {
    mockAdminTableResponses['students'] = [
      { data: { id: 100 } },
    ]
    // begin_math_retry: is_latest=false に更新後の行を返す
    mockAdminRpcResponses['begin_math_retry'] = {
      data: {
        id: 1, student_id: 100, question_set_id: 10,
        status: 'graded', attempt_number: 2,
        answers_revealed: false, is_latest: false,
      },
      error: null,
    }
    // insert new session のみ（is_latest 更新は RPC 内で完了済み）
    mockAdminTableResponses['answer_sessions'] = [
      { data: { id: 99 }, error: null }, // insert new session
    ]
    // 前回の解答（空 = コピーなし）
    mockAdminTableResponses['student_answers'] = [
      { data: [], error: null },
    ]

    const result = await startMathRetry({ answerSessionId: 1 })

    expect(result.error).toBeUndefined()
    expect(result.newAnswerSessionId).toBe(99)
    // insert が呼ばれたことを確認
    const sessionInsert = mockInsertCalls.find(c => c.table === 'answer_sessions')
    expect(sessionInsert).toBeDefined()
    const insertData = sessionInsert!.data as Record<string, unknown>
    expect(insertData.attempt_number).toBe(3) // 2 + 1
    expect(insertData.is_latest).toBe(true)
    expect(insertData.status).toBe('in_progress')
  })

  it('startMathRetry: begin_math_retry RPC が is_latest=false を返し、更に個別 update は不要', async () => {
    mockAdminTableResponses['students'] = [
      { data: { id: 100 } },
    ]
    // begin_math_retry: アトミックに is_latest=false を設定済み
    mockAdminRpcResponses['begin_math_retry'] = {
      data: {
        id: 5, student_id: 100, question_set_id: 10,
        status: 'graded', attempt_number: 1,
        answers_revealed: false, is_latest: false,
      },
      error: null,
    }
    mockAdminTableResponses['answer_sessions'] = [
      { data: { id: 50 }, error: null },  // insert new session
    ]
    mockAdminTableResponses['student_answers'] = [
      { data: [], error: null },
    ]

    const result = await startMathRetry({ answerSessionId: 5 })

    expect(result.newAnswerSessionId).toBe(50)
    // is_latest 更新は RPC 内で完了 → answer_sessions への update 呼び出しなし
    const sessionUpdates = mockUpdateCalls.filter(c => c.table === 'answer_sessions')
    expect(sessionUpdates).toHaveLength(0)
  })

  it('startMathRetry: 正解済み解答（is_correct=true）が新セッションにコピーされる', async () => {
    mockAdminTableResponses['students'] = [
      { data: { id: 100 } },
    ]
    mockAdminRpcResponses['begin_math_retry'] = {
      data: {
        id: 1, student_id: 100, question_set_id: 10,
        status: 'graded', attempt_number: 1,
        answers_revealed: false, is_latest: false,
      },
      error: null,
    }
    mockAdminTableResponses['answer_sessions'] = [
      { data: { id: 77 }, error: null },  // insert new session
    ]
    // 前回の解答: 正解1件 + 不正解1件
    mockAdminTableResponses['student_answers'] = [
      {
        data: [
          { question_id: 101, raw_input: '42', answer_value: '42', is_correct: true, scored_at: '2026-01-01' },
          { question_id: 102, raw_input: '99', answer_value: '99', is_correct: false, scored_at: '2026-01-01' },
        ],
        error: null,
      },
      { data: null, error: null }, // insert copy 結果
    ]

    const result = await startMathRetry({ answerSessionId: 1 })

    expect(result.newAnswerSessionId).toBe(77)
    // student_answers への insert を確認
    const answerInsert = mockInsertCalls.find(c => c.table === 'student_answers')
    expect(answerInsert).toBeDefined()
    const copied = answerInsert!.data as Record<string, unknown>[]
    expect(copied).toHaveLength(2)

    // 正解コピー: is_correct=true が維持される
    const correctCopy = copied.find((a) => a.question_id === 101)
    expect(correctCopy).toBeDefined()
    expect(correctCopy!.is_correct).toBe(true)
    expect(correctCopy!.answer_session_id).toBe(77)

    // 不正解コピー: is_correct=null にリセット
    const incorrectCopy = copied.find((a) => a.question_id === 102)
    expect(incorrectCopy).toBeDefined()
    expect(incorrectCopy!.is_correct).toBeNull()
    expect(incorrectCopy!.raw_input).toBe('99') // プリフィル用に保持
  })

  // ----------------------------------------------------------------
  // submitAndGradeMathAnswers テスト
  // ----------------------------------------------------------------
  it('submitAndGradeMathAnswers: 部分提出時に未入力問題が is_correct=NULL のまま', async () => {
    const questionsData = [
      { id: 201, question_number: '(1)', section_name: 'A', answer_type: 'numeric', correct_answer: '42', answer_config: null, unit_label: null, points: 1, display_order: 1 },
      { id: 202, question_number: '(2)', section_name: 'A', answer_type: 'numeric', correct_answer: '100', answer_config: null, unit_label: null, points: 1, display_order: 2 },
    ]
    mockAdminTableResponses['students'] = [
      { data: { id: 100 } },
    ]
    mockAdminRpcResponses['lock_answer_session'] = {
      data: {
        id: 1, student_id: 100, question_set_id: 10,
        status: 'in_progress', attempt_number: 1,
        answers_revealed: false, is_latest: true,
      },
      error: null,
    }
    mockAdminTableResponses['questions'] = [
      { data: questionsData, error: null },         // submitAndGrade: 問題取得
      { data: questionsData, error: null },         // buildGradeResult: 問題取得
    ]
    mockAdminTableResponses['student_answers'] = [
      // submitAndGrade: 生徒の解答（201のみ回答、202は未回答）
      { data: [{ id: 301, question_id: 201, raw_input: '42', is_correct: null }], error: null },
      // grading loop: update for q201 → resolves from queue
      { data: null, error: null },
      // buildGradeResult: 生徒の解答再取得
      { data: [{ question_id: 201, raw_input: '42', is_correct: true }], error: null },
    ]
    mockAdminTableResponses['answer_sessions'] = [
      { data: null, error: null },  // graded へ更新
      // buildGradeResult: セッション情報
      { data: { total_score: 1, max_score: 2, attempt_number: 1, answers_revealed: false }, error: null },
    ]

    const result = await submitAndGradeMathAnswers({ answerSessionId: 1 })

    expect(result.result).not.toBeNull()
    // student_answers の update は回答済みの201に対してのみ
    const answerUpdates = mockUpdateCalls.filter(c => c.table === 'student_answers')
    expect(answerUpdates).toHaveLength(1)
    expect((answerUpdates[0].data as Record<string, unknown>).is_correct).toBe(true)
  })

  it('submitAndGradeMathAnswers: リトライ時に is_correct=true の問題がスキップされる', async () => {
    const questionsData = [
      { id: 201, question_number: '(1)', section_name: 'A', answer_type: 'numeric', correct_answer: '42', answer_config: null, unit_label: null, points: 1, display_order: 1 },
      { id: 202, question_number: '(2)', section_name: 'A', answer_type: 'numeric', correct_answer: '100', answer_config: null, unit_label: null, points: 1, display_order: 2 },
    ]
    mockAdminTableResponses['students'] = [
      { data: { id: 100 } },
    ]
    mockAdminRpcResponses['lock_answer_session'] = {
      data: {
        id: 2, student_id: 100, question_set_id: 10,
        status: 'in_progress', attempt_number: 2,
        answers_revealed: false, is_latest: true,
      },
      error: null,
    }
    mockAdminTableResponses['questions'] = [
      { data: questionsData, error: null },  // submitAndGrade: 問題取得
      { data: questionsData, error: null },  // buildGradeResult: 問題取得
    ]
    // 201=前回正解済み（スキップ対象）、202=新規回答
    mockAdminTableResponses['student_answers'] = [
      { data: [
        { id: 301, question_id: 201, raw_input: '42', is_correct: true },
        { id: 302, question_id: 202, raw_input: '100', is_correct: null },
      ], error: null },
      // grading loop: update for q202 のみ（201 はスキップ）
      { data: null, error: null },
      // buildGradeResult: 解答再取得
      { data: [
        { question_id: 201, raw_input: '42', is_correct: true },
        { question_id: 202, raw_input: '100', is_correct: true },
      ], error: null },
    ]
    mockAdminTableResponses['answer_sessions'] = [
      { data: null, error: null },  // graded へ更新
      // buildGradeResult: セッション情報（全問正解 → answers_revealed=true）
      { data: { total_score: 2, max_score: 2, attempt_number: 2, answers_revealed: true }, error: null },
    ]

    const result = await submitAndGradeMathAnswers({ answerSessionId: 2 })

    expect(result.result).not.toBeNull()
    // student_answers の update は 202 のみ（201 は is_correct=true でスキップ）
    const answerUpdates = mockUpdateCalls.filter(c => c.table === 'student_answers')
    expect(answerUpdates).toHaveLength(1)
    const updated = answerUpdates[0].data as Record<string, unknown>
    expect(updated.is_correct).toBe(true)
  })

  // ----------------------------------------------------------------
  // getMathDraftAnswers テスト
  // ----------------------------------------------------------------
  it('getMathDraftAnswers: リトライ時に各問題の isCorrect 状態を含めて返す', async () => {
    mockAdminTableResponses['students'] = [
      { data: { id: 100 } },
    ]
    // in_progress セッション
    mockAdminTableResponses['answer_sessions'] = [
      { data: { id: 5, attempt_number: 2 }, error: null },
    ]
    // 正解済み + 未採点の解答
    mockAdminTableResponses['student_answers'] = [
      {
        data: [
          { question_id: 201, raw_input: '42', is_correct: true },
          { question_id: 202, raw_input: '50', is_correct: null },
        ],
        error: null,
      },
    ]

    const result = await getMathDraftAnswers(10)

    expect(result).not.toBeNull()
    expect(result!.answerSessionId).toBe(5)
    expect(result!.attemptNumber).toBe(2)
    expect(result!.answers).toHaveLength(2)

    const q201 = result!.answers.find(a => a.questionId === 201)
    expect(q201).toBeDefined()
    expect(q201!.isCorrect).toBe(true)  // 正解済みフラグが返される

    const q202 = result!.answers.find(a => a.questionId === 202)
    expect(q202).toBeDefined()
    expect(q202!.isCorrect).toBeNull()  // 未採点
  })
})

// ============================================================
// 正答漏えい防止テスト — Server Action レベル（計画書 lines 1748-1752）
// ============================================================
describe('正答漏えい防止 — Server Action レベル (Supabase モック)', () => {
  beforeEach(() => {
    resetMocks()
    for (const key of Object.keys(tableCounters)) {
      delete tableCounters[key]
    }
  })

  // Plan line 1748: getMathQuestionsForAnswering のレスポンスに correct_answer が含まれないこと
  it('getMathQuestionsForAnswering: レスポンスに correct_answer が含まれない', async () => {
    // question_sets クエリ（createClient 経由 = RLS 有効）
    mockAdminTableResponses['question_sets'] = [
      { data: { id: 10, title: 'テスト', status: 'approved' }, error: null },
    ]
    // questions クエリ
    mockAdminTableResponses['questions'] = [
      {
        data: [
          {
            id: 201, question_number: '(1)', section_name: 'A',
            answer_type: 'numeric', unit_label: 'cm', answer_config: null,
            points: 1, display_order: 1,
            correct_answer: '42',  // DB からは返るが、サニタイズされるべき
          },
          {
            id: 202, question_number: '(2)', section_name: 'A',
            answer_type: 'selection', unit_label: null, points: 1, display_order: 2,
            answer_config: {
              correct_values: ['3', '7'],
              dummy_values: ['5', '9'],
            },
            correct_answer: null,
          },
        ],
        error: null,
      },
    ]

    const result = await getMathQuestionsForAnswering(10)

    // correct_answer がレスポンスのどの問題にも含まれないこと
    for (const q of result.questions) {
      expect(q).not.toHaveProperty('correct_answer')
      expect(q).not.toHaveProperty('correctAnswer')
    }
  })

  // Plan line 1749: answerConfig に correct_values が含まれないこと
  it('getMathQuestionsForAnswering: answerConfig に correct_values が含まれない', async () => {
    mockAdminTableResponses['question_sets'] = [
      { data: { id: 10, title: 'テスト', status: 'approved' }, error: null },
    ]
    mockAdminTableResponses['questions'] = [
      {
        data: [
          {
            id: 201, question_number: '(1)', section_name: 'A',
            answer_type: 'multi_part', unit_label: null, points: 1, display_order: 1,
            answer_config: {
              slots: [{ label: 'A', unit: '個' }],
              correct_values: { A: '14' },
              template: 'Aは{A}個',
            },
            correct_answer: null,
          },
        ],
        error: null,
      },
    ]

    const result = await getMathQuestionsForAnswering(10)

    expect(result.questions).toHaveLength(1)
    expect(result.questions[0].answerConfig).not.toBeNull()
    expect(result.questions[0].answerConfig).not.toHaveProperty('correct_values')
  })

  // Plan line 1750: selection で dummy_values がレスポンスに含まれないこと
  it('getMathQuestionsForAnswering: selection の dummy_values がレスポンスに含まれない', async () => {
    mockAdminTableResponses['question_sets'] = [
      { data: { id: 10, title: 'テスト', status: 'approved' }, error: null },
    ]
    mockAdminTableResponses['questions'] = [
      {
        data: [
          {
            id: 201, question_number: '(1)', section_name: 'A',
            answer_type: 'selection', unit_label: null, points: 1, display_order: 1,
            answer_config: {
              correct_values: ['3', '7'],
              dummy_values: ['5', '9'],
            },
            correct_answer: null,
          },
        ],
        error: null,
      },
    ]

    const result = await getMathQuestionsForAnswering(10)

    expect(result.questions).toHaveLength(1)
    const config = result.questions[0].answerConfig as { options: string[]; unit: string | null }
    expect(config).not.toHaveProperty('correct_values')
    expect(config).not.toHaveProperty('dummy_values')
    expect(config.options).toBeDefined()
    expect(config.options.sort()).toEqual(['3', '5', '7', '9'])
  })

  // Plan line 1751: getMathGradeResult で answers_revealed=false の場合に正答が含まれない
  it('getMathGradeResult: answers_revealed=false で正答が含まれない', async () => {
    mockAdminTableResponses['students'] = [
      { data: { id: 100 } },
    ]
    // getMathGradeResult: graded セッション取得
    mockAdminTableResponses['answer_sessions'] = [
      { data: { id: 1, question_set_id: 10 }, error: null },
      // buildGradeResult: セッション情報
      { data: { total_score: 1, max_score: 2, attempt_number: 1, answers_revealed: false }, error: null },
    ]
    mockAdminTableResponses['questions'] = [
      {
        data: [
          { id: 201, question_number: '(1)', section_name: 'A', answer_type: 'numeric', correct_answer: '42', answer_config: null, unit_label: null, points: 1, display_order: 1 },
        ],
        error: null,
      },
    ]
    mockAdminTableResponses['student_answers'] = [
      { data: [{ question_id: 201, raw_input: '99', is_correct: false }], error: null },
    ]

    const result = await getMathGradeResult(10)

    expect(result.result).not.toBeNull()
    expect(result.result!.answersRevealed).toBe(false)
    // 各 detail に correctAnswer が含まれないこと
    for (const d of result.result!.details) {
      expect(d).not.toHaveProperty('correctAnswer')
    }
    // rawInput も null であること（DTO 分離）
    for (const d of result.result!.details) {
      expect(d.rawInput).toBeNull()
    }
  })

  // Plan line 1752: revealMathAnswers で answers_revealed=true 後に正答が含まれること
  it('revealMathAnswers: 正答開示後に correctAnswer が含まれる', async () => {
    mockAdminTableResponses['students'] = [
      { data: { id: 100 } },
    ]
    // reveal_math_answers: アトミック UPDATE で answers_revealed=true に更新済みの行を返す
    mockAdminRpcResponses['reveal_math_answers'] = {
      data: {
        id: 1, student_id: 100, question_set_id: 10,
        status: 'graded', attempt_number: 1,
        answers_revealed: true, is_latest: true,
      },
      error: null,
    }
    mockAdminTableResponses['answer_sessions'] = [
      // buildGradeResult: セッション情報（answers_revealed=true）
      { data: { total_score: 1, max_score: 1, attempt_number: 1, answers_revealed: true }, error: null },
    ]
    mockAdminTableResponses['questions'] = [
      {
        data: [
          { id: 201, question_number: '(1)', section_name: 'A', answer_type: 'numeric', correct_answer: '42', answer_config: null, unit_label: null, points: 1, display_order: 1 },
        ],
        error: null,
      },
    ]
    mockAdminTableResponses['student_answers'] = [
      { data: [{ question_id: 201, raw_input: '42', is_correct: true }], error: null },
    ]

    const result = await revealMathAnswers({ answerSessionId: 1 })

    expect(result.result).not.toBeNull()
    expect(result.result!.answersRevealed).toBe(true)
    // correctAnswer が含まれること
    const detail = result.result!.details[0]
    expect(detail).toHaveProperty('correctAnswer')
    expect((detail as { correctAnswer: string }).correctAnswer).toBe('42')
    // rawInput も含まれること
    expect(detail.rawInput).toBe('42')
  })
})

// ============================================================
// アトミック RPC 失敗系テスト（0行更新・RPC エラー分岐）
// ============================================================
describe('アトミック RPC 失敗系テスト (Supabase モック)', () => {
  beforeEach(() => {
    resetMocks()
    for (const key of Object.keys(tableCounters)) {
      delete tableCounters[key]
    }
  })

  // ----------------------------------------------------------------
  // reveal_math_answers: 0行更新（リトライ済み → is_latest=false）
  // ----------------------------------------------------------------
  it('revealMathAnswers: is_latest=false（リトライ済み）→ reveal_math_answers が null 返却 → エラー', async () => {
    mockAdminTableResponses['students'] = [
      { data: { id: 100 } },
    ]
    // reveal_math_answers: WHERE is_latest=true 不一致 → 0行更新 → null
    mockAdminRpcResponses['reveal_math_answers'] = {
      data: null,
      error: null,
    }

    const result = await revealMathAnswers({ answerSessionId: 1 })

    expect(result.result).toBeNull()
    expect(result.error).toBeTruthy()
    expect(result.error).toContain('正答開示に失敗しました')
  })

  // ----------------------------------------------------------------
  // reveal_math_answers: RPC 自体がエラー（DB接続失敗等）
  // ----------------------------------------------------------------
  it('revealMathAnswers: RPC エラー → エラーを返す', async () => {
    mockAdminTableResponses['students'] = [
      { data: { id: 100 } },
    ]
    mockAdminRpcResponses['reveal_math_answers'] = {
      data: null,
      error: { message: 'connection refused', code: 'PGRST301' },
    }

    const result = await revealMathAnswers({ answerSessionId: 1 })

    expect(result.result).toBeNull()
    expect(result.error).toBeTruthy()
  })

  // ----------------------------------------------------------------
  // begin_math_retry: 0行更新（既にリトライ済み → is_latest=false）
  // ----------------------------------------------------------------
  it('startMathRetry: 既にリトライ済み（is_latest=false）→ begin_math_retry が null 返却 → エラー', async () => {
    mockAdminTableResponses['students'] = [
      { data: { id: 100 } },
    ]
    mockAdminRpcResponses['begin_math_retry'] = {
      data: null,
      error: null,
    }

    const result = await startMathRetry({ answerSessionId: 1 })

    expect(result.newAnswerSessionId).toBe(0)
    expect(result.error).toBeTruthy()
    expect(result.error).toContain('リトライを開始できません')
  })

  // ----------------------------------------------------------------
  // begin_math_retry: RPC 自体がエラー
  // ----------------------------------------------------------------
  it('startMathRetry: RPC エラー → エラーを返す', async () => {
    mockAdminTableResponses['students'] = [
      { data: { id: 100 } },
    ]
    mockAdminRpcResponses['begin_math_retry'] = {
      data: null,
      error: { message: 'function not found', code: '42883' },
    }

    const result = await startMathRetry({ answerSessionId: 1 })

    expect(result.newAnswerSessionId).toBe(0)
    expect(result.error).toBeTruthy()
  })
})
