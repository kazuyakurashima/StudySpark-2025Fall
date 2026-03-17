/**
 * 演習問題集 振り返り テスト
 *
 * テスト対象:
 * - saveExerciseReflection: 所有確認、衝突リトライ
 * - getExerciseReflections: 認可チェック、最新振り返り抽出
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

vi.mock('@/app/actions/common/check-student-access', () => ({
  checkStudentAccess: vi.fn(async (_userId: string, studentId: string) => {
    // student_id=1 のみアクセス許可
    return studentId === '1'
  }),
}))

import { saveExerciseReflection, getExerciseReflections } from '@/app/actions/exercise-reflection'

// ================================================================
// ヘルパー
// ================================================================

function makeChain(data: unknown) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain: any = {}
  for (const m of ['select', 'eq', 'order', 'limit', 'insert']) chain[m] = vi.fn(() => chain)
  chain.single = vi.fn(() => Promise.resolve({ data, error: null }))
  return chain
}

function makeThenableChain(data: unknown) {
  const result = { data, error: null }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain: any = { then: (resolve: (v: unknown) => void) => resolve(result) }
  for (const m of ['select', 'eq', 'order']) chain[m] = vi.fn(() => chain)
  return chain
}

// ================================================================
// テスト
// ================================================================

describe('saveExerciseReflection', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('所有確認OK → 保存成功', async () => {
    let callCount = 0
    mockFrom.mockImplementation((table: string) => {
      if (table === 'students') return makeChain({ id: 1 })
      if (table === 'answer_sessions') return makeChain({ id: 100 })
      if (table === 'exercise_reflections') {
        callCount++
        if (callCount === 1) return makeChain(null) // attempt_number 検索 → なし
        // insert → select('id') → single() チェーン
        const insertChain = makeChain({ id: 42 })
        insertChain.insert = vi.fn(() => insertChain)
        return insertChain
      }
      return makeChain(null)
    })

    const result = await saveExerciseReflection({
      answerSessionId: 100,
      sectionName: '反復問題（基本）',
      reflectionText: '倍数の基本は理解できた',
    })

    expect(result.success).toBe(true)
  })

  it('空文字の振り返り → バリデーションエラー', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'students') return makeChain({ id: 1 })
      if (table === 'answer_sessions') return makeChain({ id: 100 })
      return makeChain(null)
    })

    const result = await saveExerciseReflection({
      answerSessionId: 100,
      sectionName: '反復問題（基本）',
      reflectionText: '   ',
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('振り返りテキストを入力してください')
  })

  it('ユニーク衝突時にリトライして成功', async () => {
    let reflectionCallCount = 0
    mockFrom.mockImplementation((table: string) => {
      if (table === 'students') return makeChain({ id: 1 })
      if (table === 'answer_sessions') return makeChain({ id: 100 })
      if (table === 'exercise_reflections') {
        reflectionCallCount++
        // attempt_number検索（奇数回）
        if (reflectionCallCount % 2 === 1) return makeChain({ attempt_number: 1 })
        // INSERT（偶数回）
        if (reflectionCallCount === 2) {
          // 1回目: ユニーク衝突（insert → select → single チェーンでエラー）
          const failChain = makeChain(null)
          failChain.insert = vi.fn(() => failChain)
          failChain.single = vi.fn(() => Promise.resolve({ data: null, error: { code: '23505', message: 'unique violation' } }))
          return failChain
        }
        // 2回目: 成功
        const successChain = makeChain({ id: 42 })
        successChain.insert = vi.fn(() => successChain)
        return successChain
      }
      return makeChain(null)
    })

    const result = await saveExerciseReflection({
      answerSessionId: 100,
      sectionName: '反復問題（基本）',
      reflectionText: 'リトライテスト',
    })

    expect(result.success).toBe(true)
  })

  it('セッション所有不一致 → エラー', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'students') return makeChain({ id: 1 })
      if (table === 'answer_sessions') return makeChain(null) // 所有不一致
      return makeChain(null)
    })

    const result = await saveExerciseReflection({
      answerSessionId: 999,
      sectionName: '反復問題（基本）',
      reflectionText: 'テスト',
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('セッションが見つかりません')
  })
})

describe('getExerciseReflections', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('自分のセッション → 振り返り取得成功', async () => {
    let answerSessionCallCount = 0
    mockFrom.mockImplementation((table: string) => {
      if (table === 'answer_sessions') {
        answerSessionCallCount++
        return makeChain({ student_id: 1 })
      }
      if (table === 'students') return makeChain({ id: 1 })
      if (table === 'exercise_reflections') {
        return makeThenableChain([
          { id: 1, section_name: '反復問題（基本）', reflection_text: '理解できた', attempt_number: 1, created_at: '2026-03-16T00:00:00Z' },
        ])
      }
      return makeChain(null)
    })

    const result = await getExerciseReflections(100)

    expect(result).toHaveLength(1)
    expect(result[0].reflectionText).toBe('理解できた')
  })

  it('他人のセッション → 空配列', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'answer_sessions') return makeChain({ student_id: 999 }) // 他人
      if (table === 'students') return makeChain({ id: 1 }) // 自分は id=1
      return makeChain(null)
    })

    const result = await getExerciseReflections(100)

    expect(result).toHaveLength(0)
  })

  it('targetStudentId指定 + checkStudentAccess許可 → 取得成功', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'answer_sessions') return makeChain({ student_id: 1 })
      if (table === 'exercise_reflections') {
        return makeThenableChain([
          { id: 1, section_name: '反復問題（基本）', reflection_text: '理解できた', attempt_number: 1, created_at: '2026-03-16T00:00:00Z' },
        ])
      }
      return makeChain(null)
    })

    const result = await getExerciseReflections(100, { targetStudentId: 1 })

    expect(result).toHaveLength(1)
  })

  it('targetStudentId指定 + checkStudentAccess拒否 → 空配列', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'answer_sessions') return makeChain({ student_id: 2 }) // student_id=2 はアクセス不可
      return makeChain(null)
    })

    const result = await getExerciseReflections(100, { targetStudentId: 2 })

    expect(result).toHaveLength(0)
  })
})
