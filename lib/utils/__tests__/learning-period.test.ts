import { describe, it, expect, vi, beforeEach } from 'vitest'

// getTodayJST をモックして日付を制御する
vi.mock('@/lib/utils/date-jst', () => ({
  getTodayJST: vi.fn(),
}))

import { getTodayJST } from '@/lib/utils/date-jst'
import { getCurrentLearningPeriod } from '../learning-period'

const mockedGetTodayJST = vi.mocked(getTodayJST)

// ── Supabase モックヘルパー ──

type QueryResult = { data: unknown; error: unknown }

/**
 * Supabase のチェーンビルダーを模倣するモック。
 * callResults に返すべき結果をキューとして渡す。
 * .single() が呼ばれるたびに先頭からシフトする。
 */
function createMockSupabase(callResults: QueryResult[]) {
  let callIndex = 0

  const chainBuilder: Record<string, unknown> = {}

  // チェーンメソッドは自身を返す
  for (const method of ['select', 'eq', 'lte', 'gte', 'order', 'limit']) {
    chainBuilder[method] = vi.fn().mockReturnValue(chainBuilder)
  }

  // .single() はキューから結果を返す
  chainBuilder.single = vi.fn().mockImplementation(() => {
    const result = callResults[callIndex] ?? { data: null, error: null }
    callIndex++
    return Promise.resolve(result)
  })

  return {
    from: vi.fn().mockReturnValue(chainBuilder),
  } as unknown as Parameters<typeof getCurrentLearningPeriod>[1]
}

// ── テストデータ ──

const SESSION_6 = {
  id: 6,
  session_number: 6,
  start_date: '2026-03-16',
  end_date: '2026-03-22',
}

const SESSION_7 = {
  id: 7,
  session_number: 7,
  start_date: '2026-04-06',
  end_date: '2026-04-12',
}

const FIRST_SESSION = {
  id: 1,
  session_number: 1,
  start_date: '2026-02-09',
  end_date: '2026-02-15',
}

// ── テスト本体 ──

describe('getCurrentLearningPeriod', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  // -------------------------------------------------------
  // 1. 通常回ヒット
  // -------------------------------------------------------
  it('通常回に該当する日付 → type: "regular" でそのセッションを返す', async () => {
    mockedGetTodayJST.mockReturnValue('2026-03-18') // SESSION_6 の期間内

    const supabase = createMockSupabase([
      { data: SESSION_6, error: null }, // 1st .single() → 通常回ヒット
    ])

    const result = await getCurrentLearningPeriod(5, supabase)

    expect(result.type).toBe('regular')
    expect(result.session).toEqual(SESSION_6)
    expect(result.specialPeriod).toBeNull()
  })

  // -------------------------------------------------------
  // 2. 春期講習（小5: 3/23〜4/5）
  // -------------------------------------------------------
  it('春期講習期間（小5）→ type: "special" で春期情報と直前セッションを返す', async () => {
    mockedGetTodayJST.mockReturnValue('2026-03-28')

    const supabase = createMockSupabase([
      { data: null, error: { code: 'PGRST116', message: 'no rows' } }, // 通常回なし
      { data: { id: 6, session_number: 6 }, error: null },             // 直前セッション
    ])

    const result = await getCurrentLearningPeriod(5, supabase)

    expect(result.type).toBe('special')
    expect(result.session).toBeNull()
    expect(result.specialPeriod?.type).toBe('spring_break')
    expect(result.specialPeriod?.grade).toBe(5)
    if (result.type === 'special') {
      expect(result.lastSession).toEqual({ id: 6, session_number: 6 })
    }
  })

  // -------------------------------------------------------
  // 3. 春期講習（小6: 3/23〜4/12）— 小5より長い
  // -------------------------------------------------------
  it('春期講習期間（小6、4/10）→ type: "special"', async () => {
    mockedGetTodayJST.mockReturnValue('2026-04-10') // 小6は4/12まで春期

    const supabase = createMockSupabase([
      { data: null, error: { code: 'PGRST116', message: 'no rows' } },
      { data: { id: 6, session_number: 6 }, error: null },
    ])

    const result = await getCurrentLearningPeriod(6, supabase)

    expect(result.type).toBe('special')
    expect(result.specialPeriod?.type).toBe('spring_break')
    expect(result.specialPeriod?.grade).toBe(6)
  })

  // -------------------------------------------------------
  // 4. GW休み（4/27〜5/3）
  // -------------------------------------------------------
  it('GW休み期間 → type: "special" でGW情報を返す', async () => {
    mockedGetTodayJST.mockReturnValue('2026-04-30')

    const supabase = createMockSupabase([
      { data: null, error: { code: 'PGRST116', message: 'no rows' } },
      { data: { id: 8, session_number: 8 }, error: null },
    ])

    const result = await getCurrentLearningPeriod(5, supabase)

    expect(result.type).toBe('special')
    expect(result.specialPeriod?.type).toBe('gw_break')
    expect(result.specialPeriod?.label).toBe('GW休み')
  })

  // -------------------------------------------------------
  // 5. 期間外（通常回なし・特別期間なし）→ フォールバック
  // -------------------------------------------------------
  it('どの期間にも該当しない → 直前の通常回にフォールバック', async () => {
    mockedGetTodayJST.mockReturnValue('2026-04-20') // 春期終了後〜GW前のギャップ

    const supabase = createMockSupabase([
      { data: null, error: { code: 'PGRST116', message: 'no rows' } }, // 通常回なし
      // 特別期間にも該当しないので → フォールバック直前回クエリ
      { data: SESSION_7, error: null },
    ])

    const result = await getCurrentLearningPeriod(5, supabase)

    expect(result.type).toBe('regular')
    expect(result.session).toEqual(SESSION_7)
    expect(result.specialPeriod).toBeNull()
  })

  // -------------------------------------------------------
  // 6. 最終フォールバック（直前回もない → 最初の回）
  // -------------------------------------------------------
  it('直前の通常回もない → 最初の回にフォールバック', async () => {
    mockedGetTodayJST.mockReturnValue('2026-02-01') // 全セッション開始前

    const supabase = createMockSupabase([
      { data: null, error: { code: 'PGRST116', message: 'no rows' } }, // 通常回なし
      // 特別期間にも該当しない → フォールバック直前回
      { data: null, error: { code: 'PGRST116', message: 'no rows' } }, // 直前回もなし
      // → 最初の回
      { data: FIRST_SESSION, error: null },
    ])

    const result = await getCurrentLearningPeriod(5, supabase)

    expect(result.type).toBe('regular')
    expect(result.session).toEqual(FIRST_SESSION)
  })

  // -------------------------------------------------------
  // 7. DBエラー（PGRST116 以外）→ 例外
  // -------------------------------------------------------
  it('DB接続エラー（PGRST116以外）→ 例外をスローする', async () => {
    mockedGetTodayJST.mockReturnValue('2026-03-18')

    const supabase = createMockSupabase([
      {
        data: null,
        error: { code: '42P01', message: 'relation "study_sessions" does not exist' },
      },
    ])

    await expect(getCurrentLearningPeriod(5, supabase)).rejects.toThrow(
      'study_sessions query failed'
    )
  })

  // -------------------------------------------------------
  // 8. 境界値: 春期開始日（3/23）
  // -------------------------------------------------------
  it('春期開始日ちょうど → special', async () => {
    mockedGetTodayJST.mockReturnValue('2026-03-23')

    const supabase = createMockSupabase([
      { data: null, error: { code: 'PGRST116', message: 'no rows' } },
      { data: { id: 6, session_number: 6 }, error: null },
    ])

    const result = await getCurrentLearningPeriod(5, supabase)
    expect(result.type).toBe('special')
    expect(result.specialPeriod?.type).toBe('spring_break')
  })

  // -------------------------------------------------------
  // 9. 境界値: 春期終了日（小5: 4/5）
  // -------------------------------------------------------
  it('春期終了日ちょうど（小5: 4/5）→ special', async () => {
    mockedGetTodayJST.mockReturnValue('2026-04-05')

    const supabase = createMockSupabase([
      { data: null, error: { code: 'PGRST116', message: 'no rows' } },
      { data: { id: 6, session_number: 6 }, error: null },
    ])

    const result = await getCurrentLearningPeriod(5, supabase)
    expect(result.type).toBe('special')
  })

  // -------------------------------------------------------
  // 10. 境界値: 春期終了翌日（小5: 4/6）→ regular
  // -------------------------------------------------------
  it('春期終了翌日（小5: 4/6）→ 通常回ヒット（SESSION_7 開始日）', async () => {
    mockedGetTodayJST.mockReturnValue('2026-04-06')

    const supabase = createMockSupabase([
      // 通常回ヒット（4/6 は SESSION_7 の開始日）
      { data: SESSION_7, error: null },
    ])

    const result = await getCurrentLearningPeriod(5, supabase)
    expect(result.type).toBe('regular')
    expect(result.session?.session_number).toBe(7)
  })

  // -------------------------------------------------------
  // 11. 学年の区別: 小6は4/10がまだ春期（〜4/12）だが、
  //     小5は4/5で春期終了済み → 小5の4/10は通常回ヒット
  // -------------------------------------------------------
  it('4/10 は小5にとっては通常期間（小5の春期は4/5終了、小6は4/12まで）', async () => {
    mockedGetTodayJST.mockReturnValue('2026-04-10')

    const supabase = createMockSupabase([
      // 通常回ヒット
      { data: SESSION_7, error: null },
    ])

    const result = await getCurrentLearningPeriod(5, supabase)
    expect(result.type).toBe('regular')
  })

  // -------------------------------------------------------
  // 12. 直前セッションがない場合の special
  // -------------------------------------------------------
  it('春期講習で直前セッションがない場合 → lastSession: null', async () => {
    mockedGetTodayJST.mockReturnValue('2026-03-25')

    const supabase = createMockSupabase([
      { data: null, error: { code: 'PGRST116', message: 'no rows' } }, // 通常回なし
      { data: null, error: { code: 'PGRST116', message: 'no rows' } }, // 直前セッションもなし
    ])

    const result = await getCurrentLearningPeriod(5, supabase)

    expect(result.type).toBe('special')
    if (result.type === 'special') {
      expect(result.lastSession).toBeNull()
    }
  })
})

// ── 戻り値の型契約テスト ──
// dashboard.ts / parent-dashboard.ts は getCurrentLearningPeriod() の戻り値に
// 依存して early return 分岐する。ここではその分岐の前提条件
// （discriminated union の形状）を検証する。
// 注意: dashboard 側のクエリ分岐自体（混入防止）は未検証。
//       それにはロジック抽出（A案）が必要で、follow-up PR で対応予定。

describe('LearningPeriodResult 型契約（消費者の分岐前提条件）', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  // -------------------------------------------------------
  // 13. special 時に session が null
  //     dashboard.ts L380, L806, L1049 が early return する前提条件
  //     ※ early return 自体のテストは別途ロジック抽出後に実施予定
  // -------------------------------------------------------
  it('special 時は session: null — 消費者が session_id クエリをスキップする前提', async () => {
    mockedGetTodayJST.mockReturnValue('2026-03-28')

    const supabase = createMockSupabase([
      { data: null, error: { code: 'PGRST116', message: 'no rows' } },
      { data: { id: 6, session_number: 6 }, error: null },
    ])

    const result = await getCurrentLearningPeriod(5, supabase)

    expect(result.type).toBe('special')
    // session が null → 消費者が session.id にアクセスすると TypeError
    // これにより dashboard.ts の early return 分岐が不可欠であることを示す
    expect(result.session).toBeNull()
    expect(result.specialPeriod).not.toBeNull()
  })

  // -------------------------------------------------------
  // 14. regular 時は session が非 null + specialPeriod が null
  //     ログクエリに session.id を安全に使えることの保証
  // -------------------------------------------------------
  it('regular 時は session が非 null で specialPeriod が null であることを保証', async () => {
    mockedGetTodayJST.mockReturnValue('2026-03-18')

    const supabase = createMockSupabase([
      { data: SESSION_6, error: null },
    ])

    const result = await getCurrentLearningPeriod(5, supabase)

    expect(result.type).toBe('regular')
    expect(result.session).not.toBeNull()
    expect(result.session!.id).toBe(6)
    expect(result.session!.session_number).toBe(6)
    expect(result.specialPeriod).toBeNull()
  })

  // -------------------------------------------------------
  // 15. special 時の specialPeriod に必須フィールドが全て存在する
  //     UI 側がバナー表示に使う label, message, description の存在保証
  // -------------------------------------------------------
  it('special 時の specialPeriod はバナー表示に必要な全フィールドを持つ', async () => {
    mockedGetTodayJST.mockReturnValue('2026-03-28')

    const supabase = createMockSupabase([
      { data: null, error: { code: 'PGRST116', message: 'no rows' } },
      { data: { id: 6, session_number: 6 }, error: null },
    ])

    const result = await getCurrentLearningPeriod(5, supabase)

    if (result.type !== 'special') throw new Error('expected special')

    const sp = result.specialPeriod
    expect(sp.type).toBe('spring_break')
    expect(sp.label).toBeTruthy()
    expect(sp.message).toBeTruthy()
    expect(sp.description).toBeTruthy()
    expect(sp.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(sp.endDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(sp.grade).toBe(5)
  })

  // -------------------------------------------------------
  // 16. special 時の lastSession と session の関係
  //     lastSession: スパークのプルダウン初期位置用（null の場合もある）
  //     session: null → 消費者は session_id ベースのクエリを使えない
  //     保護者側（parent-dashboard.ts L1026-1055）は period.type === 'special' を
  //     見て study_date ベースの直近7日クエリに切り替える。
  //     ※ その切り替え自体の検証は別途ロジック抽出後に実施予定
  // -------------------------------------------------------
  it('special 時: lastSession は非 null で返りうるが session は必ず null', async () => {
    mockedGetTodayJST.mockReturnValue('2026-04-01') // 春期中

    const supabase = createMockSupabase([
      { data: null, error: { code: 'PGRST116', message: 'no rows' } },
      { data: { id: 6, session_number: 6 }, error: null },
    ])

    const result = await getCurrentLearningPeriod(5, supabase)

    expect(result.type).toBe('special')
    if (result.type === 'special') {
      expect(result.lastSession).toEqual({ id: 6, session_number: 6 })
      expect(result.session).toBeNull()
    }
  })
})
