/**
 * 演習問題集 指導者向け Server Actions テスト
 *
 * exercise-master.ts の3関数をモックDBで検証:
 * - getExerciseMasterSummary: RPC呼び出し+認証チェック
 * - getExerciseMasterDetail: RPC呼び出し+認証チェック
 * - getStudentExerciseReflections: 認可チェック+振り返り取得
 */

import { vi, describe, it, expect, beforeEach } from 'vitest'

// ================================================================
// モック設定
// ================================================================
const mockRpc = vi.fn()
const mockAdminFrom = vi.fn()
const mockAuthGetUser = vi.fn()
const mockCheckStudentAccess = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockAuthGetUser },
    rpc: mockRpc,
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(async () => ({ data: { id: 'user-uuid', role: 'coach' }, error: null })),
        })),
      })),
    })),
  })),
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}))

vi.mock('@/app/actions/common/check-student-access', () => ({
  checkStudentAccess: (...args: unknown[]) => mockCheckStudentAccess(...args),
}))

import {
  getExerciseMasterSummary,
  getExerciseMasterDetail,
  getStudentExerciseReflections,
} from '@/app/actions/exercise-master'

// ================================================================
// ヘルパー
// ================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeChain(data: unknown, error: unknown = null): any {
  const result = { data, error }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain: any = {
    then: (resolve: (v: unknown) => void) => resolve(result),
  }
  for (const m of ['select', 'eq', 'in', 'is', 'order']) chain[m] = vi.fn(() => chain)
  chain.single = vi.fn(() => Promise.resolve(result))
  return chain
}

// ================================================================
// テスト
// ================================================================

describe('getExerciseMasterSummary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuthGetUser.mockResolvedValue({ data: { user: { id: 'coach-uuid' } } })
  })

  it('認証なしでエラーを返す', async () => {
    mockAuthGetUser.mockResolvedValue({ data: { user: null } })

    const result = await getExerciseMasterSummary(5)

    expect(result.data).toBeNull()
    expect(result.error).toBe('認証が必要です')
  })

  it('RPC成功時にデータを返す', async () => {
    const mockData = {
      grade: 5,
      total_students: 3,
      sessions: [
        { session_number: 1, title: '第1回', submitted_count: 2, avg_rate: 0.75 },
      ],
    }
    mockRpc.mockResolvedValue({ data: mockData, error: null })

    const result = await getExerciseMasterSummary(5)

    expect(result.data).toEqual(mockData)
    expect(result.error).toBeUndefined()
    expect(mockRpc).toHaveBeenCalledWith('get_exercise_master_summary', { p_grade: 5 })
  })

  it('RPC失敗時にエラーを返す', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'Unauthorized: role=student' } })

    const result = await getExerciseMasterSummary(5)

    expect(result.data).toBeNull()
    expect(result.error).toContain('Unauthorized')
  })
})

describe('getExerciseMasterDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuthGetUser.mockResolvedValue({ data: { user: { id: 'coach-uuid' } } })
  })

  it('認証なしでエラーを返す', async () => {
    mockAuthGetUser.mockResolvedValue({ data: { user: null } })

    const result = await getExerciseMasterDetail(100)

    expect(result.data).toBeNull()
    expect(result.error).toBe('認証が必要です')
  })

  it('RPC成功時にデータを返す', async () => {
    const mockData = {
      question_set: { id: 100, title: '第1回', grade: 5, session_number: 1 },
      questions: [{ id: 1, question_number: '1(1)', section_name: 'ステップ①' }],
      students: [],
      question_stats: [],
      section_stats: [],
    }
    mockRpc.mockResolvedValue({ data: mockData, error: null })

    const result = await getExerciseMasterDetail(100)

    expect(result.data).toEqual(mockData)
    expect(mockRpc).toHaveBeenCalledWith('get_exercise_master_detail', { p_question_set_id: 100 })
  })
})

describe('getStudentExerciseReflections', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuthGetUser.mockResolvedValue({ data: { user: { id: 'coach-uuid' } } })
  })

  it('認証なしでエラーを返す', async () => {
    mockAuthGetUser.mockResolvedValue({ data: { user: null } })

    const result = await getStudentExerciseReflections(1, 100)

    expect(result.data).toEqual([])
    expect(result.error).toBe('認証が必要です')
  })

  it('アクセス権限なしでエラーを返す', async () => {
    mockCheckStudentAccess.mockResolvedValue(false)

    const result = await getStudentExerciseReflections(1, 100)

    expect(result.data).toEqual([])
    expect(result.error).toBe('アクセス権限がありません')
  })

  it('振り返り+フィードバックを正しく変換して返す', async () => {
    mockCheckStudentAccess.mockResolvedValue(true)
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === 'answer_sessions') {
        return makeChain([{ id: 50 }, { id: 51 }])
      }
      if (table === 'exercise_reflections') {
        return makeChain([
          {
            id: 1,
            section_name: 'ステップ①',
            reflection_text: '難しかった',
            attempt_number: 1,
            created_at: '2026-03-18T10:00:00Z',
            exercise_feedbacks: [{ feedback_text: 'よく頑張りました！' }],
          },
          {
            id: 2,
            section_name: 'ステップ②',
            reflection_text: 'もう少し',
            attempt_number: 1,
            created_at: '2026-03-18T10:01:00Z',
            exercise_feedbacks: [],
          },
        ])
      }
      return makeChain(null)
    })

    const result = await getStudentExerciseReflections(1, 100)

    expect(result.error).toBeUndefined()
    expect(result.data).toHaveLength(2)
    expect(result.data[0]).toEqual({
      sectionName: 'ステップ①',
      reflectionText: '難しかった',
      feedbackText: 'よく頑張りました！',
      attemptNumber: 1,
      createdAt: '2026-03-18T10:00:00Z',
    })
    expect(result.data[1].feedbackText).toBeNull()
  })

  it('採点済みセッションがない場合は空配列を返す', async () => {
    mockCheckStudentAccess.mockResolvedValue(true)
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === 'answer_sessions') return makeChain([])
      return makeChain(null)
    })

    const result = await getStudentExerciseReflections(1, 100)

    expect(result.data).toEqual([])
    expect(result.error).toBeUndefined()
  })
})
