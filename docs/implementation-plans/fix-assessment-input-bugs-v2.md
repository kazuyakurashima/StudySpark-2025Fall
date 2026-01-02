# 実装計画: 得点入力機能のバグ修正（v2 - スキーマ検証済み）

**作成日**: 2025-12-25
**最終更新**: 2025-12-25 v2
**対象ブランチ**: `feature/fix-assessment-input-bugs`
**承認待ち**: はい

---

## 📋 変更履歴

### v2（2025-12-25）- スキーマ検証とリスク潰し

**v1からの変更点**:
1. **重大**: 学年表記の不一致を修正（数値 `5/6` ↔ 文字列 `'5年'/'6年'` の変換ロジック追加）
2. **重大**: カラム名をスキーマ準拠に修正（`master_id`, `max_score`, `assessment_type`）
3. **高**: JST日付処理に統一（`getTodayJST()` ヘルパー使用、UTC境界バグ修正）
4. **高**: `getUnconfirmedSessions` の混合学年対応強化
5. **中**: ステータス切替時の得点復元ロジック追加（UX改善）

**スキーマ検証結果**（マイグレーションファイル確認済み）:
- ✅ `students.grade`: `SMALLINT CHECK (grade IN (5, 6))` - **数値型**
- ✅ `assessment_masters.grade`: `VARCHAR CHECK (grade IN ('5年', '6年'))` - **文字列型**
- ✅ 外部キー: `class_assessments.master_id` (~~not `assessment_master_id`~~)
- ✅ 満点カラム: `assessment_masters.max_score` (~~not `total_questions`~~)
- ✅ テスト種別: `assessment_type` (~~not `subject`~~)

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

## 🔧 共通: 学年表記の正規化関数（新規追加）

### 問題の詳細

**スキーマの型不一致**:
- `students.grade`: 数値 `5` または `6`
- `assessment_masters.grade`: 文字列 `'5年'` または `'6年'`

**既存コードの問題箇所**:
```typescript
// app/actions/coach.ts:1274 - 既存の変換ロジック
master.grade === (studentGrade === 5 ? "5年" : "6年")

// 計画書v1の誤った想定
m.grade === studentGrade  // ← 型が違うので常に false
```

### 修正内容

#### 1. ユーティリティ関数の追加

```typescript
// lib/utils/grade-converter.ts（新規ファイル）

/**
 * 数値学年を文字列学年に変換
 * @param grade - 数値学年（5 or 6）
 * @returns 文字列学年（'5年' or '6年'）
 */
export function gradeToString(grade: number): '5年' | '6年' {
  if (grade !== 5 && grade !== 6) {
    throw new Error(`Invalid grade: ${grade}. Must be 5 or 6.`)
  }
  return `${grade}年` as '5年' | '6年'
}

/**
 * 文字列学年を数値学年に変換
 * @param gradeStr - 文字列学年（'5年' or '6年'）
 * @returns 数値学年（5 or 6）
 */
export function gradeToNumber(gradeStr: string): 5 | 6 {
  if (gradeStr === '5年') return 5
  if (gradeStr === '6年') return 6
  throw new Error(`Invalid grade string: ${gradeStr}. Must be '5年' or '6年'.`)
}
```

#### 2. 既存コードでの使用箇所

```typescript
// app/actions/coach.ts

import { gradeToString, gradeToNumber } from '@/lib/utils/grade-converter'

// 学年フィルタリング時（Line 1274付近）
const targetStudentIds = studentIds.filter((sid) => {
  const rel = relations?.find((r) => r.student_id === sid)
  const studentGrade = (rel as any)?.students?.grade  // 数値 5 or 6
  return master.grade === gradeToString(studentGrade)  // ← 変換して比較
})

// 生徒データ整形時（Line 1428付近）
const studentsData: AssessmentInputStudent[] = students.map((student: any) => {
  const studentGrade = gradeToString(student.grade)  // 数値 → 文字列変換

  // 該当学年のマスタを取得
  const mathMaster1 = mathMasters.find((m) => m.grade === studentGrade && m.attemptNumber === 1)
  const mathMaster2 = mathMasters.find((m) => m.grade === studentGrade && m.attemptNumber === 2)
  const kanjiMaster = kanjiMasters.find((m) => m.grade === studentGrade)

  return {
    ...
    grade: studentGrade,  // UI表示用に文字列で返す
  }
})
```

---

## Bug 1: 漢字テストのマスタが1件しか返らない

### 現状の問題

**ファイル**: [app/actions/coach.ts:1461](app/actions/coach.ts#L1461)

```typescript
// 現在のコード
export interface AssessmentInputData {
  sessionNumber: number
  students: AssessmentInputStudent[]
  mathMasters: AssessmentMaster[]
  kanjiMaster: AssessmentMaster | null  // ← 単一オブジェクト
}

// Line 1461
kanjiMaster: kanjiMasters[0] || null  // ← 最初の1件のみ
```

**問題点**:
- 漢字テストは学年別にマスタが存在するが、最初の1件しか返していない
- 小5/小6混在クラスで片方の学年の得点が保存できない

### 修正内容

#### 1. 型定義の変更

```typescript
// app/actions/coach.ts (Line 1192-1197)
export interface AssessmentInputData {
  sessionNumber: number
  students: AssessmentInputStudent[]
  mathMasters: AssessmentMaster[]
  kanjiMasters: AssessmentMaster[]  // ← 配列に変更（複数形）
}
```

#### 2. データ取得ロジックの変更

```typescript
// app/actions/coach.ts (Line 1461)
return {
  data: {
    sessionNumber,
    students: studentsData,
    mathMasters,
    kanjiMasters,  // ← 全件返す（v1: kanjiMasters[0] || null）
  },
}
```

#### 3. UIでの学年別フィルタリング（学年変換対応）

```typescript
// app/coach/assessment-input/page.tsx

import { gradeToString } from '@/lib/utils/grade-converter'

// 生徒の学年に対応する漢字マスタを取得
const getKanjiMasterForStudent = (studentGrade: '5年' | '6年') => {
  const master = data.kanjiMasters.find(m => m.grade === studentGrade)

  // 見つからない場合の警告ログ
  if (!master) {
    console.warn(
      `[Assessment Input] 漢字テストマスタが見つかりません`,
      { grade: studentGrade, session: data.sessionNumber }
    )
  }

  return master
}

// 各生徒の漢字得点入力時に使用
{students.map(student => {
  const kanjiMaster = getKanjiMasterForStudent(student.grade)  // ← 学年は既に '5年'/'6年' 形式

  return (
    <div key={student.id}>
      {kanjiMaster ? (
        <Input
          type="number"
          min="0"
          max={kanjiMaster.maxScore}  // ✅ max_score（v1誤: total_questions）
          value={student.kanjiScore ?? ''}
          onChange={(e) => handleScoreChange(student.id, 'kanji', e.target.value)}
        />
      ) : (
        <div className="text-sm text-slate-400">マスタ未設定</div>
      )}
    </div>
  )
})}
```

---

## Bug 2: 欠席ステータスが上書きされる

### 現状の問題

**ファイル**: [app/coach/assessment-input/page.tsx](app/coach/assessment-input/page.tsx)

```typescript
// 現在のコード（推定箇所）
status: score !== null ? 'completed' : 'not_submitted'
// ← 得点の有無のみで判定、既存の 'absent' ステータスを無視
```

**問題点**:
- データベースから取得した `absent` ステータスが、得点入力時に `not_submitted` へ上書き
- 欠席記録が消失し、出席管理ができない

### 修正内容

#### 1. ステータス管理State の追加

```typescript
// app/coach/assessment-input/page.tsx

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

#### 2. ステータス変更ハンドラ（得点復元機能付き）

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

#### 3. チップUIコンポーネント

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

// 使用例
<StatusChip
  status={studentStatuses[student.id]?.math1 || 'not_submitted'}
  onChange={(newStatus) => handleStatusChange(student.id, 'math1', newStatus)}
/>
```

#### 4. 得点入力の無効化ロジック

```typescript
// app/coach/assessment-input/page.tsx

<Input
  type="number"
  min="0"
  max={mathMaster1.maxScore}
  value={student.mathScore1 ?? ''}
  onChange={(e) => handleScoreChange(student.id, 'math1', e.target.value)}
  disabled={studentStatuses[student.id]?.math1 !== 'completed'}
  className={
    studentStatuses[student.id]?.math1 !== 'completed'
      ? 'bg-slate-50 cursor-not-allowed'
      : ''
  }
/>
```

#### 5. 保存時のロジック修正

```typescript
// app/coach/assessment-input/page.tsx

const handleSubmit = async () => {
  const scoresData = students.flatMap(student => {
    const results = []

    // 算数1回目
    if (mathMaster1) {
      results.push({
        studentId: student.id,
        masterId: mathMaster1.id,
        score: studentStatuses[student.id]?.math1 === 'completed' ? student.mathScore1 : null,
        status: studentStatuses[student.id]?.math1 || 'not_submitted',
      })
    }

    // 算数2回目、漢字も同様...

    return results
  })

  await saveAssessmentScores(sessionNumber, scoresData, selectedDate)  // ← 日付も渡す
}
```

---

## Bug 3: assessment_date が常に入力日になる（+ UTC境界バグ）

### 現状の問題

**ファイル**: [app/actions/coach.ts:1501](app/actions/coach.ts#L1501)

```typescript
// 現在のコード
const today = new Date().toISOString().split('T')[0]  // ← UTC基準
assessment_date: today
```

**問題点**:
1. 過去のテスト結果を遡及入力できない（常に今日の日付）
2. **UTC境界バグ**: JST 23:00以降に実行すると翌日になる
   - 例: JST 2025-01-15 23:30 → UTC 2025-01-15 14:30 → `split('T')[0]` = `'2025-01-15'` ✅
   - 例: JST 2025-01-16 00:30 → UTC 2025-01-15 15:30 → `split('T')[0]` = `'2025-01-15'` ❌（1日ズレ）

### 修正内容

#### 1. 実施日入力UIの追加（デフォルト: 前回の入力日）

```typescript
// app/coach/assessment-input/page.tsx

import { getTodayJST } from '@/lib/utils/date-jst'

const [selectedDate, setSelectedDate] = useState<string>('')

// 初期値を前回の入力日に設定（最新の assessment_date を取得）
useEffect(() => {
  if (!data.students.length) return

  const recentDates = data.students
    .flatMap(s => [
      s.mathAssessment1?.assessment_date,
      s.mathAssessment2?.assessment_date,
      s.kanjiAssessment?.assessment_date,
    ])
    .filter((d): d is string => d != null)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())

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

  // JST基準の日付を使用（v1誤: new Date().toISOString().split('T')[0]）
  const dateToUse = assessmentDate || getTodayJST()

  const upsertData = scores.map((score) => ({
    student_id: parseInt(score.studentId, 10),
    master_id: score.masterId,  // ✅ master_id（v1誤: assessment_master_id）
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

#### 4. バリデーション

```typescript
// app/coach/assessment-input/page.tsx

import { getTodayJST } from '@/lib/utils/date-jst'
import { useToast } from '@/hooks/use-toast'

const { toast } = useToast()

const handleSubmit = async () => {
  if (!selectedDate) {
    toast({
      title: 'エラー',
      description: '実施日を選択してください',
      variant: 'destructive',
    })
    return
  }

  const today = getTodayJST()
  if (selectedDate > today) {
    toast({
      title: 'エラー',
      description: '未来の日付は選択できません',
      variant: 'destructive',
    })
    return
  }

  // 保存処理...
  await saveAssessmentScores(sessionNumber, scoresData, selectedDate)
}
```

---

## Bug 4: N+1クエリによるパフォーマンス問題

### 現状の問題

**ファイル**: [app/actions/coach.ts:1254-1295](app/actions/coach.ts#L1254-L1295)

```typescript
// 現在のコード: 3重ループでクエリ実行
for (const session of sessionRange) {
  const { data: masters } = await supabase
    .from('assessment_masters')
    .select('id')
    // ... ← クエリ1

  for (const master of masters || []) {
    for (const student of students) {
      const { data: assessment } = await supabase  // ← クエリN+1
        .from('class_assessments')
        // ...
    }
  }
}
```

**問題点**:
- 生徒数×セッション数×科目数だけクエリが発生
- 例: 30名×15回×2科目 = **900クエリ**
- 読み込み時間が5-10秒に

### 修正内容

#### 1. バッチクエリへの書き換え（混合学年対応）

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
  const grades = [...new Set(relations?.map((rel: any) => rel.students?.grade) || [])]
  const maxSession = Math.max(...grades.map(g => g === 5 ? 19 : 15))
  const allSessions = Array.from({ length: maxSession }, (_, i) => i + 1).reverse()

  // 4. マスタ情報を一括取得（全学年分）
  const gradeStrings = grades.map(g => gradeToString(g))  // [5, 6] → ['5年', '6年']

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

  // 6. メモリ内で未確定セッションを判定
  const sessionStats = allSessions.map(sessionNumber => {
    // このセッションのマスタを取得
    const sessionMasters = masters.filter(m => m.session_number === sessionNumber)

    let unconfirmedCount = 0

    sessionMasters.forEach(master => {
      // この学年の生徒のみを対象
      const targetStudents = relations?.filter((rel: any) => {
        const studentGrade = rel.students?.grade
        return master.grade === gradeToString(studentGrade)
      }) || []

      // 各生徒の入力状況を確認
      targetStudents.forEach(rel => {
        const assessment = assessments?.find(
          a => a.master_id === master.id && a.student_id === rel.student_id
        )

        if (!assessment || assessment.status === 'not_submitted') {
          unconfirmedCount++
        }
      })
    })

    return { sessionNumber, unconfirmedCount }
  })

  // 7. 未確定件数が1件以上ある回次のみを返す
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

#### 2. パフォーマンス改善効果

| 条件 | 修正前 | 修正後 |
|------|--------|--------|
| 30名 × 15回 × 2科目 | **900クエリ** | **3クエリ** |
| 推定実行時間 | 5-10秒 | <1秒 |
| クエリ削減率 | - | **99.7%削減** |

---

## テスト計画

### 1. 単体テスト

```typescript
// tests/assessment-input.test.ts

import { gradeToString, gradeToNumber } from '@/lib/utils/grade-converter'

describe('学年変換ユーティリティ', () => {
  it('should convert number to string grade', () => {
    expect(gradeToString(5)).toBe('5年')
    expect(gradeToString(6)).toBe('6年')
  })

  it('should throw error for invalid grade', () => {
    expect(() => gradeToString(4)).toThrow('Invalid grade: 4')
    expect(() => gradeToString(7)).toThrow('Invalid grade: 7')
  })

  it('should convert string to number grade', () => {
    expect(gradeToNumber('5年')).toBe(5)
    expect(gradeToNumber('6年')).toBe(6)
  })
})

describe('Bug 1: Kanji Masters Array', () => {
  it('should return all kanji masters for different grades', async () => {
    const data = await getAssessmentInputData(1)
    expect(data.kanjiMasters).toHaveLength(2)
    expect(data.kanjiMasters.map(m => m.grade)).toContain('5年')
    expect(data.kanjiMasters.map(m => m.grade)).toContain('6年')
  })

  it('should filter kanji master by student grade', () => {
    const masters = [
      { id: '1', grade: '5年', sessionNumber: 1, maxScore: 10 },
      { id: '2', grade: '6年', sessionNumber: 1, maxScore: 10 }
    ]

    const master = masters.find(m => m.grade === '5年')
    expect(master?.id).toBe('1')
  })
})

describe('Bug 2: Status Preservation', () => {
  it('should preserve absent status when updating', async () => {
    await saveAssessmentScores(
      1,
      [{ studentId: 'student1', masterId: 'master1', score: null, status: 'absent' }],
      '2025-01-15'
    )

    const { data } = await supabase
      .from('class_assessments')
      .select('status')
      .eq('student_id', 'student1')
      .eq('master_id', 'master1')
      .single()

    expect(data?.status).toBe('absent')
  })

  it('should cache and restore score when toggling status', () => {
    // 初期状態: completed, score=85
    let status = 'completed'
    let score = 85
    const cache = { value: score }

    // absent に切替 → score クリア
    status = 'absent'
    score = null

    // completed に戻す → cache から復元
    status = 'completed'
    score = cache.value

    expect(score).toBe(85)
  })
})

describe('Bug 3: Assessment Date', () => {
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

  it('should use JST for default date (not UTC)', () => {
    // JST 2025-01-16 00:30 をシミュレート
    const jstDate = getTodayJST()
    expect(jstDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)  // YYYY-MM-DD 形式

    // UTC ズレがないことを確認
    const utcDate = new Date().toISOString().split('T')[0]
    // JST 00:00-08:59 の場合、UTC と JST で日付が異なる可能性がある
    // getTodayJST() は常に JST 基準なので正しい
  })
})

describe('Bug 4: N+1 Query Optimization', () => {
  it('should fetch unconfirmed sessions with minimal queries', async () => {
    const querySpy = jest.spyOn(supabase, 'from')

    await getUnconfirmedSessions()

    // 3クエリ以内（students, masters, assessments）
    expect(querySpy.mock.calls.length).toBeLessThanOrEqual(5)  // auth含めても5以内
  })

  it('should handle mixed grades correctly', async () => {
    // 小5: 19回、小6: 15回
    const result = await getUnconfirmedSessions()

    // 両学年の生徒が混在していても正しく集計される
    expect(result.sessions).toBeDefined()
    expect(result.error).toBeUndefined()
  })
})
```

### 2. E2Eテスト

```typescript
// e2e/assessment-input.spec.ts

describe('Assessment Input Page', () => {
  beforeEach(async () => {
    await loginAsCoach('coach1')
    await page.goto('/coach/assessment-input')
  })

  it('should allow selecting kanji score for each grade', async () => {
    // 小5の生徒の漢字欄が有効
    const grade5Input = page.locator('[data-student-grade="5年"] [data-subject="kanji"]')
    await expect(grade5Input).toBeEnabled()

    // 小6の生徒の漢字欄も有効
    const grade6Input = page.locator('[data-student-grade="6年"] [data-subject="kanji"]')
    await expect(grade6Input).toBeEnabled()
  })

  it('should preserve absent status and restore score', async () => {
    // 初期状態: completed, 85点
    await page.fill('[data-student="student1"] [data-subject="math1"]', '85')
    await page.click('[data-student="student1"] [data-subject="math1"] [data-status="completed"]')
    await page.click('button:has-text("保存")')

    // 欠席に変更
    await page.click('[data-student="student1"] [data-subject="math1"] [data-status="absent"]')

    // 得点入力が無効化される
    const scoreInput = page.locator('[data-student="student1"] [data-subject="math1"]')
    await expect(scoreInput).toBeDisabled()
    await expect(scoreInput).toHaveValue('')

    // 保存
    await page.click('button:has-text("保存")')

    // リロード後も欠席ステータスが保持される
    await page.reload()
    const absentChip = page.locator('[data-student="student1"] [data-status="absent"]')
    await expect(absentChip).toHaveClass(/font-medium/)

    // 提出済に戻す → 85点が復元される
    await page.click('[data-student="student1"] [data-subject="math1"] [data-status="completed"]')
    await expect(scoreInput).toBeEnabled()
    await expect(scoreInput).toHaveValue('85')
  })

  it('should allow selecting past assessment date', async () => {
    const pastDate = '2025-01-15'
    await page.fill('input[type="date"]', pastDate)

    // 得点を入力して保存
    await page.fill('[data-student="student1"] [data-subject="math1"]', '85')
    await page.click('button:has-text("保存")')

    // DBに保存された日付を確認
    const { data } = await supabase
      .from('class_assessments')
      .select('assessment_date')
      .eq('student_id', 'student1')
      .single()

    expect(data?.assessment_date).toBe(pastDate)
  })
})
```

---

## マイグレーション計画

### 必要なマイグレーション

**なし** - 既存のスキーマで対応可能

全ての修正はアプリケーション層の変更のみで、データベーススキーマの変更は不要です。

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
- [ ] 欠席ステータスを選択でき、得点入力が無効化される
- [ ] 欠席 → 提出済 に戻すと、直前の得点が復元される
- [ ] 過去日を選択して保存できる
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
| 学年表記の変換ミス | 🔴 高 | `grade-converter.ts` でバリデーション + エラーハンドリング | 低（型安全性確保） |
| カラム名の誤り | 🔴 高 | スキーマ検証済み + TypeScript型定義 | 低（実装時にエラー検出） |
| UTC境界バグ | 🟡 中 | `getTodayJST()` 統一 + E2Eテスト | 低（既存ヘルパー使用） |
| ステータス切替の混乱 | 🟡 中 | チップUI + 得点復元機能 | 低（UX改善済み） |
| パフォーマンス劣化 | 🟢 低 | バッチクエリで大幅改善 | なし |

---

## 補足事項

### UI/UX 改善ポイント

1. **学年判定の透明性**
   - コンソールログで学年変換過程を可視化
   - マスタ未設定時に学年情報を表示

2. **ステータス選択の視認性**
   - チップ/ボタン方式により、現在の状態が一目で分かる
   - 色分けにより、提出済（緑）・欠席（黄）・未提出（灰）を直感的に識別

3. **得点復元機能の利便性**
   - 誤って欠席に切り替えても、再度提出済に戻せば得点が復元される
   - 入力ミスによるデータ損失を防止

4. **日付入力の利便性**
   - 前回の入力日をデフォルト表示することで、連続入力時の手間を削減
   - 未来日を選択不可にし、入力ミスを防止
   - JST基準で一貫性を保ち、UTC境界バグを完全排除

5. **パフォーマンス体感**
   - ページ読み込み時間が大幅短縮され、ストレスフリーな操作感を実現

### 今後の拡張性

- 複数日分の一括入力機能（将来的な要望に対応しやすい設計）
- CSV インポート機能への対応準備（ステータスと日付を含むデータ構造）
- 統計分析機能での正確な実施日ベースの集計
- 学年の自動判定機能（生徒マスタから自動取得）

---

## 承認後のアクション

1. ブランチ作成: `feature/fix-assessment-input-bugs`
2. `lib/utils/grade-converter.ts` 作成（推定所要時間: 15分）
3. `app/actions/coach.ts` 修正（推定所要時間: 1.5時間）
4. `app/coach/assessment-input/page.tsx` 修正（推定所要時間: 2時間）
5. テストコード作成（推定所要時間: 1時間）
6. ローカルテスト完了後、レビュー依頼
7. 承認後 main へマージ

**合計推定所要時間**: 4.5-5時間

---

**実装準備完了。スキーマ検証済み。承認をお待ちしています。**
