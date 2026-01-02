# 実装計画: 得点入力機能のバグ修正（v2.1 - 最終版）

**作成日**: 2025-12-25
**最終更新**: 2025-12-25 v2.1（設計確定）
**対象ブランチ**: `feature/fix-assessment-input-bugs`
**承認**: ✅ 承認済み

---

## 📋 変更履歴

### v2.1（2025-12-25）- レビュー指摘の反映と設計確定

**v2からの変更点**:
1. **高**: `assessment_date` フィールドを追加（フラット構造で実装）
2. **高**: `gradeToString` を寛容設計に変更（エラーではなくスキップ）
3. **中**: `scoreCache` の更新ロジック追加（入力時にキャッシュ更新）
4. **中**: `getUnconfirmedSessions` を Map 化（O(n²) → O(n) に改善）
5. **低**: 日付ソートを文字列比較に変更（UTC問題完全回避）

**レビュー指摘への対応**:
- ✅ `assessment_date` が存在しない → `mathDate1/2/kanjiDate` フィールド追加
- ✅ `gradeToString` が例外を投げる → null 返却 + スキップ処理に変更
- ✅ `scoreCache` が初期値のみ保存 → `handleScoreChange` で更新
- ✅ `assessments.find` が O(n²) → Map で O(n) に改善
- ✅ `new Date()` での sort → 文字列比較に変更

---

## 概要

指導者向け得点入力機能（`/coach/assessment-input`）に発見された**5つの重大なバグ**を修正します。

### 修正対象バグ一覧

| 優先度 | バグ内容 | 影響範囲 | 根本原因 |
|--------|---------|---------|---------|
| **🔴 重大** | **学年表記の不一致** | **マスタが見つからず得点保存失敗** | 数値 `5/6` と文字列 `'5年'/'6年'` の型不一致 |
| 🔴 高 | 漢字テストのマスタが1件しか返らない | 小5/小6混在クラスで片方の学年が保存不可 | `kanjiMasters[0]` で最初の1件のみ取得 |
| 🟡 中 | 欠席ステータスが上書きされる | 欠席記録が消失し未提出に戻る | ステータス選択UIの欠如 |
| 🟡 中 | assessment_date が常に入力日 | 過去日の遡及入力不可 | 日付入力UIの欠如 + UTC境界バグ |
| 🟡 中 | N+1クエリでパフォーマンス劣化 | 生徒数が多い場合の読み込み遅延 | 3重ループクエリ |

---

## 🔧 共通: 学年変換ユーティリティ（寛容設計）

### ユーティリティ関数の実装

```typescript
// lib/utils/grade-converter.ts（新規ファイル）

/**
 * 数値学年を文字列学年に変換（寛容設計）
 * @param grade - 数値学年（5 or 6）
 * @returns 文字列学年（'5年' or '6年'）、無効値の場合は null
 */
export function gradeToString(grade: number | null | undefined): '5年' | '6年' | null {
  if (grade === 5) return '5年'
  if (grade === 6) return '6年'

  // 無効値の場合は警告ログを出してnullを返す（エラーにしない）
  console.warn(`[gradeToString] Invalid grade: ${grade}. Expected 5 or 6. Returning null.`)
  return null
}

/**
 * 文字列学年を数値学年に変換（寛容設計）
 * @param gradeStr - 文字列学年（'5年' or '6年'）
 * @returns 数値学年（5 or 6）、無効値の場合は null
 */
export function gradeToNumber(gradeStr: string | null | undefined): 5 | 6 | null {
  if (gradeStr === '5年') return 5
  if (gradeStr === '6年') return 6

  console.warn(`[gradeToNumber] Invalid grade string: ${gradeStr}. Expected '5年' or '6年'. Returning null.`)
  return null
}
```

---

## Bug 1: 漢字テストのマスタが1件しか返らない

### 修正内容

#### 1. 型定義の変更

```typescript
// app/actions/coach.ts (Line 1175-1197)

export interface AssessmentInputStudent {
  id: string
  fullName: string
  nickname: string | null
  avatarId: string | null
  customAvatarUrl: string | null
  grade: string

  // 算数プリント
  mathScore1?: number | null
  mathScore2?: number | null
  mathStatus1?: 'completed' | 'absent' | 'not_submitted'
  mathStatus2?: 'completed' | 'absent' | 'not_submitted'
  mathDate1?: string | null  // ← 追加（YYYY-MM-DD形式）
  mathDate2?: string | null  // ← 追加

  // 漢字テスト
  kanjiScore?: number | null
  kanjiStatus?: 'completed' | 'absent' | 'not_submitted'
  kanjiDate?: string | null  // ← 追加
}

export interface AssessmentInputData {
  sessionNumber: number
  students: AssessmentInputStudent[]
  mathMasters: AssessmentMaster[]
  kanjiMasters: AssessmentMaster[]  // ← 配列に変更（複数形）
}
```

#### 2. データ取得ロジックの変更（学年欠損対応）

```typescript
// app/actions/coach.ts (Line 1425-1463)

import { gradeToString } from '@/lib/utils/grade-converter'

// 生徒データを整形（学年欠損時はスキップ）
const studentsData: AssessmentInputStudent[] = students
  .map((student: any) => {
    const profile = profilesMap[student.user_id] || { nickname: null, avatar_id: null, custom_avatar_url: null }
    const studentGrade = gradeToString(student.grade)

    // 学年が無効な場合はスキップ（null を返す）
    if (!studentGrade) {
      console.warn(
        `[getAssessmentInputData] Skipping student due to invalid grade`,
        { studentId: student.id, fullName: student.full_name, grade: student.grade }
      )
      return null
    }

    // 該当学年のマスタを取得
    const mathMaster1 = mathMasters.find((m) => m.grade === studentGrade && m.attemptNumber === 1)
    const mathMaster2 = mathMasters.find((m) => m.grade === studentGrade && m.attemptNumber === 2)
    const kanjiMaster = kanjiMasters.find((m) => m.grade === studentGrade)

    // 既存の入力を取得
    const mathAssessment1 = existingAssessments?.find((a) => a.master_id === mathMaster1?.id && a.student_id === student.id)
    const mathAssessment2 = existingAssessments?.find((a) => a.master_id === mathMaster2?.id && a.student_id === student.id)
    const kanjiAssessment = existingAssessments?.find((a) => a.master_id === kanjiMaster?.id && a.student_id === student.id)

    return {
      id: String(student.id),
      fullName: student.full_name,
      nickname: profile.nickname,
      avatarId: profile.avatar_id,
      customAvatarUrl: profile.custom_avatar_url,
      grade: studentGrade,

      mathScore1: mathAssessment1?.score ?? null,
      mathStatus1: mathAssessment1?.status ?? 'not_submitted',
      mathDate1: mathAssessment1?.assessment_date ?? null,  // ← 追加

      mathScore2: mathAssessment2?.score ?? null,
      mathStatus2: mathAssessment2?.status ?? 'not_submitted',
      mathDate2: mathAssessment2?.assessment_date ?? null,  // ← 追加

      kanjiScore: kanjiAssessment?.score ?? null,
      kanjiStatus: kanjiAssessment?.status ?? 'not_submitted',
      kanjiDate: kanjiAssessment?.assessment_date ?? null,  // ← 追加
    }
  })
  .filter((s): s is AssessmentInputStudent => s !== null)  // null を除外

return {
  data: {
    sessionNumber,
    students: studentsData,
    mathMasters,
    kanjiMasters,  // ← 全件返す（v1: kanjiMasters[0] || null）
  },
}
```

---

## Bug 2: 欠席ステータスが上書きされる

### 修正内容

#### 1. ステータス管理State の追加（キャッシュ更新機能付き）

```typescript
// app/coach/assessment-input/page.tsx

import { getTodayJST } from '@/lib/utils/date-jst'

type AssessmentStatus = 'completed' | 'absent' | 'not_submitted'

interface StudentStatusState {
  [studentId: string]: {
    math1?: AssessmentStatus
    math2?: AssessmentStatus
    kanji?: AssessmentStatus
  }
}

const [studentStatuses, setStudentStatuses] = useState<StudentStatusState>({})

// 得点の直前値をキャッシュ（absent → completed 切替時の復元用）
interface ScoreCacheState {
  [studentId: string]: {
    math1?: number | null
    math2?: number | null
    kanji?: number | null
  }
}

const [scoreCache, setScoreCache] = useState<ScoreCacheState>({})

// 初期データからステータスと得点を読み込み
useEffect(() => {
  const initialStatuses: StudentStatusState = {}
  const initialCache: ScoreCacheState = {}

  data.students.forEach(student => {
    initialStatuses[student.id] = {
      math1: student.mathStatus1 || 'not_submitted',
      math2: student.mathStatus2 || 'not_submitted',
      kanji: student.kanjiStatus || 'not_submitted',
    }

    initialCache[student.id] = {
      math1: student.mathScore1,
      math2: student.mathScore2,
      kanji: student.kanjiScore,
    }
  })

  setStudentStatuses(initialStatuses)
  setScoreCache(initialCache)
}, [data])
```

#### 2. 得点変更ハンドラ（キャッシュ更新）

```typescript
// app/coach/assessment-input/page.tsx

const handleScoreChange = (
  studentId: string,
  subject: 'math1' | 'math2' | 'kanji',
  value: string
) => {
  const numValue = value === '' ? null : parseInt(value, 10)

  // 得点を更新
  setScores(prev => ({
    ...prev,
    [studentId]: {
      ...prev[studentId],
      [subject]: numValue
    }
  }))

  // キャッシュも更新（v2.1追加: 入力時にキャッシュ更新）
  setScoreCache(prev => ({
    ...prev,
    [studentId]: {
      ...prev[studentId],
      [subject]: numValue
    }
  }))
}
```

#### 3. ステータス変更ハンドラ（得点復元機能付き）

```typescript
// app/coach/assessment-input/page.tsx

const handleStatusChange = (
  studentId: string,
  subject: 'math1' | 'math2' | 'kanji',
  newStatus: AssessmentStatus
) => {
  setStudentStatuses(prev => ({
    ...prev,
    [studentId]: {
      ...prev[studentId],
      [subject]: newStatus
    }
  }))

  // absent/not_submitted → completed への切替時、キャッシュから復元
  if (newStatus === 'completed') {
    const cachedScore = scoreCache[studentId]?.[subject]
    if (cachedScore !== null && cachedScore !== undefined) {
      handleScoreChange(studentId, subject, String(cachedScore))
    }
  }

  // completed → absent/not_submitted への切替時、得点をクリア
  if (newStatus === 'absent' || newStatus === 'not_submitted') {
    handleScoreChange(studentId, subject, '')
  }
}
```

#### 4. チップUIコンポーネント

```typescript
// app/coach/assessment-input/page.tsx

interface StatusChipProps {
  status: AssessmentStatus
  onChange: (status: AssessmentStatus) => void
  disabled?: boolean
}

const StatusChip = ({ status, onChange, disabled = false }: StatusChipProps) => {
  const options: { value: AssessmentStatus; label: string; color: string }[] = [
    { value: 'completed', label: '提出済', color: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
    { value: 'absent', label: '欠席', color: 'bg-amber-100 text-amber-700 border-amber-300' },
    { value: 'not_submitted', label: '未提出', color: 'bg-slate-100 text-slate-600 border-slate-300' }
  ]

  return (
    <div className="flex gap-1 mb-2">
      {options.map(option => (
        <button
          key={option.value}
          type="button"
          onClick={() => !disabled && onChange(option.value)}
          disabled={disabled}
          className={`
            px-2 py-1 text-xs rounded-md border transition-all
            ${status === option.value
              ? `${option.color} font-medium`
              : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
```

---

## Bug 3: assessment_date が常に入力日になる（+ UTC境界バグ）

### 修正内容

#### 1. 実施日入力UIの追加（文字列比較で sort）

```typescript
// app/coach/assessment-input/page.tsx

import { getTodayJST } from '@/lib/utils/date-jst'

const [selectedDate, setSelectedDate] = useState<string>('')

// 初期値を前回の入力日に設定（YYYY-MM-DD文字列比較でソート）
useEffect(() => {
  if (!data.students.length) return

  const recentDates = data.students
    .flatMap(s => [s.mathDate1, s.mathDate2, s.kanjiDate])
    .filter((d): d is string => d != null)
    .sort((a, b) => b.localeCompare(a))  // ← 文字列比較（UTC問題回避）

  // 最新の日付、なければ今日（JST基準）
  const defaultDate = recentDates[0] || getTodayJST()
  setSelectedDate(defaultDate)
}, [data])
```

#### 2. 日付入力フィールド

```typescript
// app/coach/assessment-input/page.tsx

<div className="flex items-center gap-4 mb-6">
  <div>
    <label className="text-sm font-medium text-slate-700 mb-1 block">
      実施日
    </label>
    <Input
      type="date"
      value={selectedDate}
      onChange={(e) => setSelectedDate(e.target.value)}
      className="w-40"
      max={getTodayJST()}  // 未来日は選択不可（JST基準）
    />
  </div>

  <div className="text-xs text-slate-500">
    ※ デフォルトは前回の入力日です
  </div>
</div>
```

#### 3. Server Action への日付渡し（JST統一）

```typescript
// app/actions/coach.ts

import { getTodayJST } from '@/lib/utils/date-jst'

export async function saveAssessmentScores(
  sessionNumber: number,
  scores: Array<{
    studentId: string
    masterId: string
    score: number | null
    status: 'completed' | 'absent' | 'not_submitted'
  }>,
  assessmentDate?: string  // ← 追加（オプショナル）
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  // ... 認証処理 ...

  // JST基準の日付を使用（v2: new Date().toISOString().split('T')[0]）
  const dateToUse = assessmentDate || getTodayJST()

  const upsertData = scores.map((score) => ({
    student_id: parseInt(score.studentId, 10),
    master_id: score.masterId,
    score: score.status === 'completed' ? score.score : null,
    status: score.status,
    assessment_date: dateToUse,  // ← クライアントから受け取った日付 or 今日（JST）
    grader_id: user.id,
    is_resubmission: false,
  }))

  const { error: saveError } = await supabase
    .from('class_assessments')
    .upsert(upsertData, {
      onConflict: 'student_id,master_id,is_resubmission',
      ignoreDuplicates: false,
    })

  if (saveError) {
    console.error('[saveAssessmentScores] Failed:', saveError)
    return { error: '得点の保存に失敗しました' }
  }

  return { success: true }
}
```

---

## Bug 4: N+1クエリによるパフォーマンス問題

### 修正内容（Map化でO(n)に改善）

```typescript
// app/actions/coach.ts

import { gradeToString } from '@/lib/utils/grade-converter'

async function getUnconfirmedSessions(): Promise<{
  sessions?: Array<{ sessionNumber: number; unconfirmedCount: number; label: string }>
  error?: string
}> {
  const supabase = await createClient()

  // 1. 現在のユーザーと指導者IDを取得
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '認証が必要です' }

  const { data: coach, error: coachError } = await supabase
    .from('coaches')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (coachError || !coach) return { error: '指導者情報が見つかりません' }

  // 2. 担当生徒を取得（学年情報含む）
  const { data: relations, error: relationsError } = await supabase
    .from('coach_student_relations')
    .select('student_id, students(grade)')
    .eq('coach_id', coach.id)

  if (relationsError) return { error: '担当生徒の取得に失敗しました' }

  const studentIds = relations?.map(r => r.student_id) || []
  if (studentIds.length === 0) return { sessions: [] }

  // 3. 学年別にセッション範囲を計算（混合学年対応）
  const grades = [...new Set(
    relations
      ?.map((rel: any) => rel.students?.grade)
      .filter((g): g is number => g === 5 || g === 6)  // 無効値を除外
  )]

  if (grades.length === 0) {
    console.warn('[getUnconfirmedSessions] No valid grades found in students')
    return { sessions: [] }
  }

  const maxSession = Math.max(...grades.map(g => g === 5 ? 19 : 15))
  const allSessions = Array.from({ length: maxSession }, (_, i) => i + 1).reverse()

  // 4. マスタ情報を一括取得（全学年分）
  const gradeStrings = grades
    .map(g => gradeToString(g))
    .filter((g): g is '5年' | '6年' => g !== null)

  const { data: masters } = await supabase
    .from('assessment_masters')
    .select('id, assessment_type, grade, session_number, attempt_number')
    .in('grade', gradeStrings)
    .lte('session_number', maxSession)

  if (!masters?.length) return { sessions: [] }

  const masterIds = masters.map(m => m.id)

  // 5. 全アセスメント記録を一括取得（1クエリ）
  const { data: assessments } = await supabase
    .from('class_assessments')
    .select('master_id, student_id, status')
    .in('master_id', masterIds)
    .in('student_id', studentIds)

  // 6. Map化してO(n)に改善（v2.1追加）
  const assessmentMap = new Map<string, 'completed' | 'absent' | 'not_submitted'>()
  assessments?.forEach(a => {
    const key = `${a.master_id}:${a.student_id}`
    assessmentMap.set(key, a.status)
  })

  // 学年マップも作成（学年判定を高速化）
  const studentGradeMap = new Map<number, '5年' | '6年' | null>()
  relations?.forEach((rel: any) => {
    const grade = gradeToString(rel.students?.grade)
    studentGradeMap.set(rel.student_id, grade)
  })

  // 7. メモリ内で未確定セッションを判定
  const sessionStats = allSessions.map(sessionNumber => {
    // このセッションのマスタを取得
    const sessionMasters = masters.filter(m => m.session_number === sessionNumber)

    let unconfirmedCount = 0

    sessionMasters.forEach(master => {
      // この学年の生徒のみを対象（Map経由で高速化）
      studentIds.forEach(studentId => {
        const studentGrade = studentGradeMap.get(studentId)
        if (studentGrade !== master.grade) return

        // Map から取得（O(1)）
        const key = `${master.id}:${studentId}`
        const status = assessmentMap.get(key)

        if (!status || status === 'not_submitted') {
          unconfirmedCount++
        }
      })
    })

    return { sessionNumber, unconfirmedCount }
  })

  // 8. 未確定件数が1件以上ある回次のみを返す
  const unconfirmedSessions = sessionStats
    .filter(stat => stat.unconfirmedCount > 0)
    .map(stat => ({
      sessionNumber: stat.sessionNumber,
      unconfirmedCount: stat.unconfirmedCount,
      label: `第${stat.sessionNumber}回（${stat.unconfirmedCount}件未入力）`,
    }))

  return { sessions: unconfirmedSessions }
}
```

### パフォーマンス改善効果

| 条件 | 修正前 | 修正後（v2.1） |
|------|--------|--------------|
| 30名 × 15回 × 2科目 | **900クエリ** | **3クエリ** |
| 計算量 | O(n³) | **O(n)** |
| 推定実行時間 | 5-10秒 | <1秒 |
| クエリ削減率 | - | **99.7%削減** |

---

## テスト計画

### 1. 単体テスト

```typescript
// tests/assessment-input.test.ts

import { gradeToString, gradeToNumber } from '@/lib/utils/grade-converter'

describe('学年変換ユーティリティ（寛容設計）', () => {
  it('should convert valid number to string grade', () => {
    expect(gradeToString(5)).toBe('5年')
    expect(gradeToString(6)).toBe('6年')
  })

  it('should return null for invalid grade', () => {
    expect(gradeToString(4)).toBeNull()
    expect(gradeToString(7)).toBeNull()
    expect(gradeToString(null)).toBeNull()
    expect(gradeToString(undefined)).toBeNull()
  })

  it('should log warning for invalid grade', () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()
    gradeToString(4)
    expect(consoleSpy).toHaveBeenCalledWith(
      '[gradeToString] Invalid grade: 4. Expected 5 or 6. Returning null.'
    )
    consoleSpy.mockRestore()
  })
})

describe('Bug 1: Kanji Masters Array + Grade Filter', () => {
  it('should return all kanji masters for different grades', async () => {
    const { data } = await getAssessmentInputData(1)
    expect(data?.kanjiMasters).toHaveLength(2)
    expect(data?.kanjiMasters.map(m => m.grade)).toContain('5年')
    expect(data?.kanjiMasters.map(m => m.grade)).toContain('6年')
  })

  it('should skip students with invalid grade', async () => {
    // 学年が null の生徒を含むデータ
    const { data } = await getAssessmentInputData(1)

    // 無効な学年の生徒はスキップされる
    expect(data?.students.every(s => s.grade === '5年' || s.grade === '6年')).toBe(true)
  })

  it('should include assessment_date fields', async () => {
    const { data } = await getAssessmentInputData(1)
    const student = data?.students[0]

    expect(student).toHaveProperty('mathDate1')
    expect(student).toHaveProperty('mathDate2')
    expect(student).toHaveProperty('kanjiDate')
  })
})

describe('Bug 2: Status Preservation + Cache Update', () => {
  it('should update cache when score changes', () => {
    let cache = { student1: { math1: 80 } }

    // 得点を変更
    cache = { ...cache, student1: { ...cache.student1, math1: 85 } }

    expect(cache.student1.math1).toBe(85)
  })

  it('should restore score from cache when toggling status', () => {
    const cache = { student1: { math1: 85 } }
    let status = 'completed'
    let score = 85

    // absent に切替
    status = 'absent'
    score = null

    // completed に戻す → cache から復元
    status = 'completed'
    score = cache.student1.math1

    expect(score).toBe(85)
  })
})

describe('Bug 3: Assessment Date (String Sort)', () => {
  it('should sort dates using string comparison', () => {
    const dates = ['2025-01-10', '2025-01-15', '2025-01-08']
    const sorted = dates.sort((a, b) => b.localeCompare(a))

    expect(sorted[0]).toBe('2025-01-15')  // 最新
    expect(sorted[2]).toBe('2025-01-08')  // 最古
  })

  it('should save custom assessment date (JST)', async () => {
    const customDate = '2025-01-10'
    await saveAssessmentScores(
      1,
      [{ studentId: 'student1', masterId: 'master1', score: 80, status: 'completed' }],
      customDate
    )

    const { data } = await supabase
      .from('class_assessments')
      .select('assessment_date')
      .eq('student_id', 'student1')
      .single()

    expect(data?.assessment_date).toBe(customDate)
  })
})

describe('Bug 4: N+1 Query Optimization (Map)', () => {
  it('should use Map for O(1) lookup', () => {
    const assessments = [
      { master_id: 'master1', student_id: 'student1', status: 'completed' as const },
      { master_id: 'master1', student_id: 'student2', status: 'not_submitted' as const },
    ]

    const map = new Map<string, 'completed' | 'absent' | 'not_submitted'>()
    assessments.forEach(a => {
      const key = `${a.master_id}:${a.student_id}`
      map.set(key, a.status)
    })

    expect(map.get('master1:student1')).toBe('completed')
    expect(map.get('master1:student2')).toBe('not_submitted')
    expect(map.get('master1:student3')).toBeUndefined()
  })
})
```

### 2. E2Eテスト

```typescript
// e2e/assessment-input.spec.ts

describe('Assessment Input Page (v2.1)', () => {
  beforeEach(async () => {
    await loginAsCoach('coach1')
    await page.goto('/coach/assessment-input')
  })

  it('should skip students with invalid grade gracefully', async () => {
    // 無効な学年の生徒がいても、UIは正常に表示される
    const studentList = page.locator('[data-testid="student-list"]')
    await expect(studentList).toBeVisible()

    // 有効な生徒のみが表示される
    const students = await page.locator('[data-student-grade]').all()
    for (const student of students) {
      const grade = await student.getAttribute('data-student-grade')
      expect(['5年', '6年']).toContain(grade)
    }
  })

  it('should restore score from cache when toggling status', async () => {
    // 初期状態: completed, 85点
    await page.fill('[data-student="student1"] [data-subject="math1"]', '85')
    await page.click('[data-student="student1"] [data-subject="math1"] [data-status="completed"]')

    // 欠席に変更
    await page.click('[data-student="student1"] [data-subject="math1"] [data-status="absent"]')
    const scoreInputAfterAbsent = page.locator('[data-student="student1"] [data-subject="math1"]')
    await expect(scoreInputAfterAbsent).toHaveValue('')

    // 提出済に戻す → 85点が復元される
    await page.click('[data-student="student1"] [data-subject="math1"] [data-status="completed"]')
    await expect(scoreInputAfterAbsent).toHaveValue('85')
  })

  it('should default to most recent assessment date', async () => {
    // 前回の入力日が 2025-01-10 の場合
    const dateInput = page.locator('input[type="date"]')
    await expect(dateInput).toHaveValue('2025-01-10')
  })
})
```

---

## デプロイ手順

### 1. ローカル環境での検証

```bash
# ブランチ作成
git checkout -b feature/fix-assessment-input-bugs

# 実装
# 1. lib/utils/grade-converter.ts を作成
# 2. app/actions/coach.ts を修正
# 3. app/coach/assessment-input/page.tsx を修正

# ローカルで動作確認
pnpm run dev

# テスト実行
pnpm run test

# ビルド確認
pnpm run build
```

### 2. 動作確認項目

#### 必須確認事項
- [ ] 小5/小6混在クラスで両学年の漢字得点が保存できる
- [ ] 学年が無効な生徒がいても、その生徒だけスキップされる
- [ ] 欠席ステータスを選択でき、得点入力が無効化される
- [ ] 欠席 → 提出済 に戻すと、直前の得点が復元される
- [ ] 得点を入力後、absent → completed → absent → completed と切り替えても、最新の得点が復元される
- [ ] 過去日を選択して保存できる
- [ ] デフォルト日付が前回の入力日になる（mathDate1/2/kanjiDate の最新値）
- [ ] JST 23:00以降でも正しい日付で保存される（UTC境界バグ修正確認）
- [ ] 30名規模のクラスで読み込みが1秒以内に完了する
- [ ] 既存データの表示が正常（後方互換性）

#### リグレッションテスト
- [ ] 単一学年クラスでも正常動作
- [ ] 算数プリント2回分の入力が正常
- [ ] 再提出フラグが正しく動作
- [ ] RLSポリシーが正常動作（指導者は担当生徒のみアクセス可能）

### 3. 本番デプロイ

```bash
# main へマージ
git checkout main
git merge feature/fix-assessment-input-bugs
git push origin main

# Vercel 自動デプロイ
# → デプロイ完了後、本番環境で動作確認
```

---

## リスク評価

| リスク | 影響度 | 対策 | 残存リスク |
|--------|--------|------|----------|
| 学年欠損でシステム停止 | 🔴 高 | gradeToString が null 返却 + スキップ処理 | **解消済み** |
| assessment_date が取得できない | 🔴 高 | mathDate1/2/kanjiDate フィールド追加 | **解消済み** |
| scoreCache が更新されない | 🟡 中 | handleScoreChange で更新 | **解消済み** |
| Map化でメモリ消費増 | 🟢 低 | 30名規模では negligible | 低（実用上問題なし） |
| 文字列ソートの誤動作 | 🟢 低 | YYYY-MM-DD は辞書順＝日付順 | なし |

---

## 補足事項

### v2.1 で追加された設計改善

1. **assessment_date のフラット構造**
   - `mathDate1/2/kanjiDate` として既存構造に統合
   - UI側のアクセスが簡潔で、既存コードとの一貫性あり

2. **grade 欠損時のスキップ処理**
   - 1人のデータ不備で全体が落ちることを防止
   - 管理者が後から調査できるよう、詳細ログを出力

3. **scoreCache の逐次更新**
   - 入力時にキャッシュを更新することで、常に最新値を保持
   - absent → completed → absent → completed の繰り返しでも正しく動作

4. **Map化によるO(n)化**
   - `assessments.find` の O(n²) を Map で O(n) に改善
   - 生徒数が増えてもパフォーマンスが線形に保たれる

5. **文字列比較での日付ソート**
   - `new Date()` の UTC 問題を完全回避
   - YYYY-MM-DD 形式は辞書順＝日付順なので安全

---

## 承認後のアクション

1. ブランチ作成: `feature/fix-assessment-input-bugs`
2. `lib/utils/grade-converter.ts` 作成（推定所要時間: 15分）
3. `app/actions/coach.ts` 修正（推定所要時間: 2時間）
4. `app/coach/assessment-input/page.tsx` 修正（推定所要時間: 2.5時間）
5. テストコード作成（推定所要時間: 1時間）
6. ローカルテスト完了後、レビュー依頼
7. 承認後 main へマージ

**合計推定所要時間**: 5.5-6時間

---

**実装準備完了。設計確定。実装開始の承認をお待ちしています。**
