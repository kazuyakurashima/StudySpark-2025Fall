# 実装計画: 得点入力機能の4つのバグ修正

**作成日**: 2025-12-25
**対象ブランチ**: `feature/fix-assessment-input-bugs`
**承認待ち**: はい

---

## 概要

指導者向け得点入力機能（`/coach/assessment-input`）に発見された4つの重大なバグを修正します。

### 修正対象バグ一覧

| 優先度 | バグ内容 | 影響範囲 |
|--------|---------|---------|
| 高 | 漢字テストのマスタが1件しか返らない | 小5/小6の両学年データが必要な場合に片方しか保存できない |
| 中 | 欠席ステータスが上書きされる | 欠席記録が消失し、未提出に戻ってしまう |
| 中 | assessment_date が常に入力日になる | 過去日の遡及入力ができず、分析データの正確性が失われる |
| 中 | N+1クエリによるパフォーマンス問題 | 生徒数が多い場合の読み込み時間の増大 |

---

## Bug 1: 漢字テストのマスタが1件しか返らない

### 現状の問題

**ファイル**: `app/actions/coach.ts`

```typescript
// 現在のコード（Line 1192-1197）
export interface AssessmentInputData {
  sessionNumber: number
  students: AssessmentInputStudent[]
  mathMasters: AssessmentMaster[]
  kanjiMaster: AssessmentMaster | null  // ← 単一オブジェクト
}

// Line 1461
kanjiMaster: kanjiMasters[0] || null  // ← 最初の1件のみ取得
```

**問題点**:
- 漢字テストは学年別にマスタが存在するが、最初の1件しか返していない
- 小5と小6の生徒が混在するクラスで、片方の学年の得点が保存できない

### 修正内容

#### 1. 型定義の変更

```typescript
// app/actions/coach.ts (Line 1192-1197)
export interface AssessmentInputData {
  sessionNumber: number
  students: AssessmentInputStudent[]
  mathMasters: AssessmentMaster[]
  kanjiMasters: AssessmentMaster[]  // ← 配列に変更
}
```

#### 2. データ取得ロジックの変更

```typescript
// app/actions/coach.ts (Line 1461)
kanjiMasters: kanjiMasters  // ← 全件返す
```

#### 3. UIでの学年別フィルタリング

```typescript
// app/coach/assessment-input/page.tsx
// 生徒の学年に対応する漢字マスタを取得
const getKanjiMasterForStudent = (studentGrade: string) => {
  const master = data.kanjiMasters.find(m =>
    m.grade === studentGrade
  )

  // 見つからない場合の警告ログ
  if (!master) {
    console.warn(`漢字テストマスタが見つかりません: 学年=${studentGrade}, 第${data.sessionNumber}回`)
  }

  return master
}

// 各生徒の漢字得点入力時に使用
const kanjiMaster = getKanjiMasterForStudent(student.grade)
```

#### 4. フォールバック処理

```typescript
// マスタが見つからない場合は入力欄を無効化
{kanjiMaster ? (
  <Input
    type="number"
    min="0"
    max={kanjiMaster.total_questions}
    value={kanjiScore ?? ''}
    onChange={(e) => handleScoreChange(student.id, 'kanji', e.target.value)}
  />
) : (
  <div className="text-sm text-slate-400">
    マスタ未設定
  </div>
)}
```

---

## Bug 2: 欠席ステータスが上書きされる

### 現状の問題

**ファイル**: `app/coach/assessment-input/page.tsx`

```typescript
// 現在のコード（推定 Line 145付近）
status: score !== null && score !== undefined ? 'completed' : 'not_submitted'
// ← 得点の有無のみで判定、既存の 'absent' ステータスを考慮していない
```

**問題点**:
- データベースから取得した `absent` ステータスが、得点入力時に `not_submitted` へ上書きされる
- 欠席記録が消失し、出席管理ができない

### 修正内容

#### 1. ステータス選択UIの追加（チップ/ボタン方式）

```typescript
// app/coach/assessment-input/page.tsx
// 各科目の得点入力欄の上部に配置

const [studentStatuses, setStudentStatuses] = useState<
  Record<string, Record<string, AssessmentStatus>>
>({})

// 初期データからステータスを読み込み
useEffect(() => {
  const initialStatuses: Record<string, Record<string, AssessmentStatus>> = {}

  data.students.forEach(student => {
    initialStatuses[student.id] = {
      math: student.mathAssessment?.status || 'not_submitted',
      kanji: student.kanjiAssessment?.status || 'not_submitted'
    }
  })

  setStudentStatuses(initialStatuses)
}, [data])

// ステータス変更ハンドラ
const handleStatusChange = (
  studentId: string,
  subject: 'math' | 'kanji',
  newStatus: AssessmentStatus
) => {
  setStudentStatuses(prev => ({
    ...prev,
    [studentId]: {
      ...prev[studentId],
      [subject]: newStatus
    }
  }))

  // absent/not_submitted の場合は得点をクリア
  if (newStatus === 'absent' || newStatus === 'not_submitted') {
    handleScoreChange(studentId, subject, '')
  }
}
```

#### 2. チップUIコンポーネント

```typescript
// app/coach/assessment-input/page.tsx
// ステータス選択チップ（各科目の得点入力前に配置）

type AssessmentStatus = 'completed' | 'absent' | 'not_submitted'

interface StatusChipProps {
  status: AssessmentStatus
  onChange: (status: AssessmentStatus) => void
}

const StatusChip = ({ status, onChange }: StatusChipProps) => {
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
          onClick={() => onChange(option.value)}
          className={`
            px-2 py-1 text-xs rounded-md border transition-all
            ${status === option.value
              ? `${option.color} font-medium`
              : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
            }
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
  status={studentStatuses[student.id]?.math || 'not_submitted'}
  onChange={(newStatus) => handleStatusChange(student.id, 'math', newStatus)}
/>
```

#### 3. 得点入力の無効化ロジック

```typescript
// app/coach/assessment-input/page.tsx
// absent/not_submitted の場合は入力欄を無効化

<Input
  type="number"
  min="0"
  max={mathMaster.total_questions}
  value={mathScore ?? ''}
  onChange={(e) => handleScoreChange(student.id, 'math', e.target.value)}
  disabled={studentStatuses[student.id]?.math !== 'completed'}
  className={
    studentStatuses[student.id]?.math !== 'completed'
      ? 'bg-slate-50 cursor-not-allowed'
      : ''
  }
/>
```

#### 4. 保存時のロジック修正

```typescript
// app/coach/assessment-input/page.tsx
// handleSubmit 内で、ステータスを明示的に含める

const assessmentData = {
  studentId: student.id,
  sessionNumber: data.sessionNumber,
  subject: 'math',
  score: mathScore,
  status: studentStatuses[student.id]?.math || 'not_submitted',  // ← 明示的に指定
  assessmentDate: selectedDate  // Bug 3 で修正
}
```

---

## Bug 3: assessment_date が常に入力日になる

### 現状の問題

**ファイル**: `app/actions/coach.ts`

```typescript
// 現在のコード（Line 1501）
assessment_date: new Date().toISOString().split('T')[0]
// ← 常に今日の日付
```

**問題点**:
- 過去のテスト結果を遡及入力できない
- 実施日と入力日が異なる場合、分析データの正確性が失われる

### 修正内容

#### 1. 実施日入力UIの追加（デフォルト: 前回の入力日）

```typescript
// app/coach/assessment-input/page.tsx
// ページ上部に日付選択を配置

const [selectedDate, setSelectedDate] = useState<string>('')

// 初期値を前回の入力日に設定
useEffect(() => {
  if (!data.students.length) return

  // 全生徒の最新の assessment_date を取得
  const recentDates = data.students
    .flatMap(s => [
      s.mathAssessment?.assessment_date,
      s.kanjiAssessment?.assessment_date
    ])
    .filter((d): d is string => d != null)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())

  // 最新の日付、なければ今日
  const defaultDate = recentDates[0] || new Date().toISOString().split('T')[0]
  setSelectedDate(defaultDate)
}, [data])
```

#### 2. 日付入力フィールド

```typescript
// app/coach/assessment-input/page.tsx
// セッション番号表示の隣に配置

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
      max={new Date().toISOString().split('T')[0]}  // 未来日は選択不可
    />
  </div>

  <div className="text-xs text-slate-500">
    ※ デフォルトは前回の入力日です
  </div>
</div>
```

#### 3. Server Action への日付渡し

```typescript
// app/actions/coach.ts
// saveClassAssessment の引数に日付を追加

export async function saveClassAssessment(
  studentId: string,
  sessionNumber: number,
  subject: 'math' | 'kanji',
  score: number | null,
  status: AssessmentStatus,
  assessmentDate: string  // ← 追加
): Promise<{ success: boolean; error?: string }> {
  // ...

  const upsertData = {
    student_id: studentId,
    session_number: sessionNumber,
    assessment_master_id: masterId,
    score: score,
    status: status,
    assessment_date: assessmentDate,  // ← クライアントから受け取った日付を使用
    updated_at: new Date().toISOString()
  }

  // ...
}
```

#### 4. バリデーション

```typescript
// app/coach/assessment-input/page.tsx
// 保存前にチェック

const handleSubmit = async () => {
  if (!selectedDate) {
    toast.error('実施日を選択してください')
    return
  }

  const today = new Date().toISOString().split('T')[0]
  if (selectedDate > today) {
    toast.error('未来の日付は選択できません')
    return
  }

  // 保存処理...
}
```

---

## Bug 4: N+1クエリによるパフォーマンス問題

### 現状の問題

**ファイル**: `app/actions/coach.ts` (Line 1254-1295)

```typescript
// 現在のコード: 3重ループでクエリ実行
for (const session of sessionRange) {
  const { data: masters } = await supabase
    .from('assessment_masters')
    .select('id')
    // ...

  for (const master of masters || []) {
    for (const student of students) {
      const { data: assessment } = await supabase  // ← N+1クエリ
        .from('class_assessments')
        // ...
    }
  }
}
```

**問題点**:
- 生徒数×セッション数×科目数だけクエリが発生
- 例: 30名×15回×2科目 = 900クエリ

### 修正内容

#### 1. バッチクエリへの書き換え

```typescript
// app/actions/coach.ts
// getUnconfirmedSessions 関数を完全に書き換え

async function getUnconfirmedSessions(
  coachId: string,
  gradeFilter?: string
): Promise<number[]> {
  const supabase = await createClient()

  // 1. 担当生徒を取得
  const { data: students } = await supabase
    .from('students')
    .select('id, grade')
    .eq('coach_id', coachId)
    .eq('grade', gradeFilter || undefined)

  if (!students?.length) return []

  const studentIds = students.map(s => s.id)
  const grade = gradeFilter || students[0].grade
  const sessionCount = grade === '小5' ? 19 : 15

  // 2. マスタ情報を一括取得
  const { data: masters } = await supabase
    .from('assessment_masters')
    .select('id, session_number, subject')
    .eq('grade', grade)
    .lte('session_number', sessionCount)

  if (!masters?.length) return []

  const masterIds = masters.map(m => m.id)

  // 3. 全アセスメント記録を一括取得（1クエリ）
  const { data: assessments } = await supabase
    .from('class_assessments')
    .select('assessment_master_id, student_id, status')
    .in('assessment_master_id', masterIds)
    .in('student_id', studentIds)

  // 4. メモリ内で未確定セッションを判定
  const unconfirmedSessions = new Set<number>()

  for (const master of masters) {
    // このマスタに対する全生徒の提出状況をチェック
    const submittedStudents = new Set(
      (assessments || [])
        .filter(a =>
          a.assessment_master_id === master.id &&
          (a.status === 'completed' || a.status === 'absent')
        )
        .map(a => a.student_id)
    )

    // 1人でも未提出がいれば未確定
    const hasUnconfirmed = students.some(s => !submittedStudents.has(s.id))

    if (hasUnconfirmed) {
      unconfirmedSessions.add(master.session_number)
    }
  }

  return Array.from(unconfirmedSessions).sort((a, b) => a - b)
}
```

#### 2. パフォーマンス改善効果

| 条件 | 修正前 | 修正後 |
|------|--------|--------|
| 30名 × 15回 × 2科目 | 900クエリ | 3クエリ |
| 推定実行時間 | 5-10秒 | <1秒 |

---

## テスト計画

### 1. 単体テスト

```typescript
// tests/assessment-input.test.ts

describe('Bug 1: Kanji Masters Array', () => {
  it('should return all kanji masters for different grades', async () => {
    const data = await getAssessmentInputData(1)
    expect(data.kanjiMasters).toHaveLength(2)
    expect(data.kanjiMasters.map(m => m.grade)).toContain('小5')
    expect(data.kanjiMasters.map(m => m.grade)).toContain('小6')
  })

  it('should filter kanji master by student grade in UI', () => {
    const masters = [
      { id: '1', grade: '小5', session_number: 1, total_questions: 20 },
      { id: '2', grade: '小6', session_number: 1, total_questions: 20 }
    ]

    const master = masters.find(m => m.grade === '小5')
    expect(master?.id).toBe('1')
  })
})

describe('Bug 2: Status Preservation', () => {
  it('should preserve absent status when updating', async () => {
    // absent ステータスを持つデータを保存
    await saveClassAssessment('student1', 1, 'math', null, 'absent', '2025-01-15')

    // 再度保存してもステータスが維持されることを確認
    const result = await saveClassAssessment('student1', 1, 'math', null, 'absent', '2025-01-15')
    expect(result.success).toBe(true)

    const { data } = await supabase
      .from('class_assessments')
      .select('status')
      .eq('student_id', 'student1')
      .single()

    expect(data?.status).toBe('absent')
  })
})

describe('Bug 3: Assessment Date', () => {
  it('should save custom assessment date', async () => {
    const customDate = '2025-01-10'
    await saveClassAssessment('student1', 1, 'math', 80, 'completed', customDate)

    const { data } = await supabase
      .from('class_assessments')
      .select('assessment_date')
      .eq('student_id', 'student1')
      .single()

    expect(data?.assessment_date).toBe(customDate)
  })
})

describe('Bug 4: N+1 Query Optimization', () => {
  it('should fetch unconfirmed sessions with minimal queries', async () => {
    // クエリカウンターをモック
    const querySpy = jest.spyOn(supabase, 'from')

    await getUnconfirmedSessions('coach1', '小6')

    // 3クエリ以内（students, masters, assessments）
    expect(querySpy).toHaveBeenCalledTimes(3)
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
    const grade5Input = page.locator('[data-student-grade="小5"] [data-subject="kanji"]')
    await expect(grade5Input).toBeEnabled()

    // 小6の生徒の漢字欄も有効
    const grade6Input = page.locator('[data-student-grade="小6"] [data-subject="kanji"]')
    await expect(grade6Input).toBeEnabled()
  })

  it('should preserve absent status', async () => {
    // 欠席ボタンをクリック
    await page.click('[data-student="student1"] [data-status-option="absent"]')

    // 得点入力が無効化される
    const scoreInput = page.locator('[data-student="student1"] [data-subject="math"]')
    await expect(scoreInput).toBeDisabled()

    // 保存
    await page.click('button:has-text("保存")')

    // リロード後も欠席ステータスが保持される
    await page.reload()
    const absentChip = page.locator('[data-student="student1"] [data-status-option="absent"]')
    await expect(absentChip).toHaveClass(/font-medium/)
  })

  it('should allow selecting past assessment date', async () => {
    const pastDate = '2025-01-15'
    await page.fill('input[type="date"]', pastDate)

    // 得点を入力して保存
    await page.fill('[data-student="student1"] [data-subject="math"]', '85')
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

# 実装後、ローカルで動作確認
pnpm run dev

# テスト実行
pnpm run test

# ビルド確認
pnpm run build
```

### 2. 動作確認項目

- [ ] 小5/小6混在クラスで両学年の漢字得点が保存できる
- [ ] 欠席ステータスを選択でき、得点入力が無効化される
- [ ] 過去日を選択して保存できる
- [ ] 30名規模のクラスで読み込みが1秒以内に完了する
- [ ] 既存データの表示が正常（後方互換性）

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

| リスク | 対策 |
|--------|------|
| 既存データとの互換性 | `kanjiMaster → kanjiMasters` の変更は後方互換性あり（配列の最初の要素を使用すれば同じ動作） |
| ステータス変更による混乱 | UI上で明確に3つの選択肢を表示し、デフォルト動作を維持 |
| 日付選択の誤操作 | 未来日を選択不可にし、デフォルト値を前回入力日に設定 |
| パフォーマンス劣化 | バッチクエリにより大幅改善、劣化リスクなし |

---

## 補足事項

### UI/UX 改善ポイント

1. **ステータス選択の視認性**
   - チップ/ボタン方式により、現在の状態が一目で分かる
   - 色分けにより、提出済（緑）・欠席（黄）・未提出（灰）を直感的に識別

2. **日付入力の利便性**
   - 前回の入力日をデフォルト表示することで、連続入力時の手間を削減
   - 未来日を選択不可にし、入力ミスを防止

3. **パフォーマンス体感**
   - ページ読み込み時間が大幅短縮され、ストレスフリーな操作感を実現

### 今後の拡張性

- 複数日分の一括入力機能（将来的な要望に対応しやすい設計）
- CSV インポート機能への対応準備（ステータスと日付を含むデータ構造）
- 統計分析機能での正確な実施日ベースの集計

---

## 承認後のアクション

1. ブランチ作成: `feature/fix-assessment-input-bugs`
2. 実装開始（推定所要時間: 3-4時間）
3. ローカルテスト完了後、レビュー依頼
4. 承認後 main へマージ

---

**実装準備完了。承認をお待ちしています。**
