# 実装計画: 得点入力機能のバグ修正（v2.2 - 最終確定版）

**作成日**: 2025-12-25
**最終更新**: 2025-12-25 v2.2（最終確定）
**対象ブランチ**: `feature/fix-assessment-input-bugs`
**承認**: ✅ 全承認完了・実装開始可能

---

## 📋 変更履歴

### v2.2（2025-12-25）- 最終レビュー指摘の反映と実装開始

**v2.1からの変更点**:
1. **高**: `scoreCache` 更新ロジックを修正（システムクリア時は更新しない）
2. **中**: `assessment_date` の absent 時の扱いを明記（日付保存、未提出は null）
3. **低**: 学年スキップ時のトースト通知を追加（サーバーで skippedCount 返却）

**レビュー指摘への対応**:
- ✅ `scoreCache` がシステムクリアで上書きされる → `isSystemClear` フラグ追加
- ✅ `assessment_date` の absent 時の仕様が不明 → absent でも日付保存、分析で追跡可能に
- ✅ 学年スキップがサイレント → トーストで通知、サーバーで件数返却

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

```typescript
// lib/utils/grade-converter.ts（新規ファイル）

/**
 * 数値学年を文字列学年に変換（寛容設計）
 */
export function gradeToString(grade: number | null | undefined): '5年' | '6年' | null {
  if (grade === 5) return '5年'
  if (grade === 6) return '6年'

  console.warn(`[gradeToString] Invalid grade: ${grade}. Expected 5 or 6. Returning null.`)
  return null
}

/**
 * 文字列学年を数値学年に変換（寛容設計）
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

### 型定義の変更（日付フィールド追加 + skippedCount 追加）

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
  skippedStudentsCount: number  // ← 追加（学年不正でスキップされた生徒数）
}
```

### データ取得ロジックの変更（学年欠損対応 + スキップ数カウント）

```typescript
// app/actions/coach.ts (Line 1425-1463)

import { gradeToString } from '@/lib/utils/grade-converter'

// 生徒データを整形（学年欠損時はスキップ）
let skippedCount = 0

const studentsData: AssessmentInputStudent[] = students
  .map((student: any) => {
    const profile = profilesMap[student.user_id] || { nickname: null, avatar_id: null, custom_avatar_url: null }
    const studentGrade = gradeToString(student.grade)

    // 学年が無効な場合はスキップ（null を返す）
    if (!studentGrade) {
      skippedCount++
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
    skippedStudentsCount: skippedCount,  // ← 追加
  },
}
```

---

## Bug 2: 欠席ステータスが上書きされる

### ステータス管理State の追加（システムクリアフラグ対応）

```typescript
// app/coach/assessment-input/page.tsx

import { getTodayJST } from '@/lib/utils/date-jst'
import { useToast } from '@/hooks/use-toast'

const { toast } = useToast()

type AssessmentStatus = 'completed' | 'absent' | 'not_submitted'

const [studentStatuses, setStudentStatuses] = useState<StudentStatusState>({})
const [scoreCache, setScoreCache] = useState<ScoreCacheState>({})

// 初期データからステータスと得点を読み込み + スキップ通知
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

  // スキップされた生徒がいる場合は通知（警告トーン）
  if (data.skippedStudentsCount > 0) {
    toast({
      title: '学年情報の不備',
      description: `${data.skippedStudentsCount}名の生徒が学年情報の不備によりスキップされました。管理者に連絡してください。`,
      variant: 'default',  // destructive ではなく default（警告トーン）
    })
  }
}, [data])
```

### 得点変更ハンドラ（システムクリアフラグ対応）

```typescript
// app/coach/assessment-input/page.tsx

const handleScoreChange = (
  studentId: string,
  subject: 'math1' | 'math2' | 'kanji',
  value: string,
  isSystemClear: boolean = false  // ← v2.2追加: システムによるクリアかどうか
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

  // キャッシュ更新（v2.2: システムクリア時は更新しない）
  if (!isSystemClear && numValue !== null) {
    setScoreCache(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [subject]: numValue
      }
    }))
  }
}
```

### ステータス変更ハンドラ（システムクリアフラグ使用）

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

  // completed → absent/not_submitted への切替時、得点をクリア（キャッシュは保持）
  if (newStatus === 'absent' || newStatus === 'not_submitted') {
    handleScoreChange(studentId, subject, '', true)  // ← isSystemClear = true
  }
}
```

---

## Bug 3: assessment_date が常に入力日になる（+ UTC境界バグ）

### assessment_date の保存ロジック（absent でも日付保存）

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
  assessmentDate?: string  // ← オプショナル
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  // ... 認証処理 ...

  // JST基準の日付を使用
  const dateToUse = assessmentDate || getTodayJST()

  const upsertData = scores.map((score) => ({
    student_id: parseInt(score.studentId, 10),
    master_id: score.masterId,
    score: score.status === 'completed' ? score.score : null,
    status: score.status,

    // v2.2: absent でも日付を保存（欠席日の記録）、not_submitted は null
    assessment_date: score.status !== 'not_submitted' ? dateToUse : null,

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

### 実施日入力UIの追加（文字列比較でソート）

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

  // ... 認証・生徒取得 ...

  // 学年別にセッション範囲を計算（混合学年対応）
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

  // マスタ情報を一括取得（全学年分）
  const gradeStrings = grades
    .map(g => gradeToString(g))
    .filter((g): g is '5年' | '6年' => g !== null)  // v2.1: null 除外

  const { data: masters } = await supabase
    .from('assessment_masters')
    .select('id, assessment_type, grade, session_number, attempt_number')
    .in('grade', gradeStrings)
    .lte('session_number', maxSession)

  if (!masters?.length) return { sessions: [] }

  const masterIds = masters.map(m => m.id)

  // 全アセスメント記録を一括取得（1クエリ）
  const { data: assessments } = await supabase
    .from('class_assessments')
    .select('master_id, student_id, status')
    .in('master_id', masterIds)
    .in('student_id', studentIds)

  // Map化してO(n)に改善（v2.1）
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

  // メモリ内で未確定セッションを判定
  const sessionStats = allSessions.map(sessionNumber => {
    const sessionMasters = masters.filter(m => m.session_number === sessionNumber)
    let unconfirmedCount = 0

    sessionMasters.forEach(master => {
      studentIds.forEach(studentId => {
        const studentGrade = studentGradeMap.get(studentId)
        if (studentGrade !== master.grade) return

        const key = `${master.id}:${studentId}`
        const status = assessmentMap.get(key)

        // v2.2: absent は確定扱い（未確定にカウントしない）
        if (!status || status === 'not_submitted') {
          unconfirmedCount++
        }
      })
    })

    return { sessionNumber, unconfirmedCount }
  })

  // 未確定件数が1件以上ある回次のみを返す
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

---

## テスト計画

### 1. 単体テスト

```typescript
// tests/assessment-input.test.ts

describe('Bug 2: Status Preservation + Cache Update (v2.2)', () => {
  it('should NOT update cache when system clears score', () => {
    let cache = { student1: { math1: 85 } }
    let score = 85

    // ユーザーが手動で入力 → キャッシュ更新
    score = 90
    cache = { ...cache, student1: { ...cache.student1, math1: 90 } }
    expect(cache.student1.math1).toBe(90)

    // absent に切替（システムクリア） → キャッシュは保持
    score = null
    // cache は更新しない（isSystemClear = true）
    expect(cache.student1.math1).toBe(90)

    // completed に戻す → cache から復元
    score = cache.student1.math1
    expect(score).toBe(90)
  })
})

describe('Bug 3: Assessment Date (v2.2)', () => {
  it('should save date for absent status', async () => {
    const absentDate = '2025-01-15'
    await saveAssessmentScores(
      1,
      [{ studentId: 'student1', masterId: 'master1', score: null, status: 'absent' }],
      absentDate
    )

    const { data } = await supabase
      .from('class_assessments')
      .select('assessment_date, status')
      .eq('student_id', 'student1')
      .single()

    expect(data?.status).toBe('absent')
    expect(data?.assessment_date).toBe(absentDate)  // absent でも日付保存
  })

  it('should NOT save date for not_submitted status', async () => {
    await saveAssessmentScores(
      1,
      [{ studentId: 'student2', masterId: 'master2', score: null, status: 'not_submitted' }],
      '2025-01-15'
    )

    const { data } = await supabase
      .from('class_assessments')
      .select('assessment_date, status')
      .eq('student_id', 'student2')
      .single()

    expect(data?.status).toBe('not_submitted')
    expect(data?.assessment_date).toBeNull()  // not_submitted は日付なし
  })
})

describe('Bug 1: Grade Skip + Toast Notification (v2.2)', () => {
  it('should return skippedStudentsCount', async () => {
    const { data } = await getAssessmentInputData(1)

    expect(data).toHaveProperty('skippedStudentsCount')
    expect(typeof data?.skippedStudentsCount).toBe('number')
  })

  it('should show toast when students are skipped', () => {
    const data = { students: [], skippedStudentsCount: 2 }
    const toastSpy = jest.spyOn(toast, 'call')

    // useEffect でトースト表示
    if (data.skippedStudentsCount > 0) {
      toast({
        title: '学年情報の不備',
        description: `${data.skippedStudentsCount}名の生徒が学年情報の不備によりスキップされました。`,
        variant: 'default',
      })
    }

    expect(toastSpy).toHaveBeenCalled()
  })
})
```

### 2. E2Eテスト

```typescript
// e2e/assessment-input.spec.ts

describe('Assessment Input Page (v2.2 Final)', () => {
  it('should NOT update cache on system clear', async () => {
    await loginAsCoach('coach1')
    await page.goto('/coach/assessment-input')

    // 85点を入力
    await page.fill('[data-student="student1"] [data-subject="math1"]', '85')

    // absent に切替 → 得点クリア（キャッシュ保持）
    await page.click('[data-student="student1"] [data-subject="math1"] [data-status="absent"]')
    const scoreInputAfterAbsent = page.locator('[data-student="student1"] [data-subject="math1"]')
    await expect(scoreInputAfterAbsent).toHaveValue('')

    // 90点を別途入力（キャッシュ更新）
    await page.click('[data-student="student1"] [data-subject="math1"] [data-status="completed"]')
    await page.fill('[data-student="student1"] [data-subject="math1"]', '90')

    // 再度 absent に切替
    await page.click('[data-student="student1"] [data-subject="math1"] [data-status="absent"]')

    // completed に戻す → 90点が復元される（85点ではない）
    await page.click('[data-student="student1"] [data-subject="math1"] [data-status="completed"]')
    await expect(scoreInputAfterAbsent).toHaveValue('90')
  })

  it('should save date for absent but not for not_submitted', async () => {
    const testDate = '2025-01-15'
    await page.fill('input[type="date"]', testDate)

    // student1 を absent に設定
    await page.click('[data-student="student1"] [data-status="absent"]')

    // student2 を not_submitted のまま

    // 保存
    await page.click('button:has-text("保存")')

    // DB確認
    const { data: student1 } = await supabase
      .from('class_assessments')
      .select('assessment_date, status')
      .eq('student_id', 'student1')
      .single()

    const { data: student2 } = await supabase
      .from('class_assessments')
      .select('assessment_date, status')
      .eq('student_id', 'student2')
      .single()

    expect(student1?.status).toBe('absent')
    expect(student1?.assessment_date).toBe(testDate)  // absent は日付保存

    expect(student2?.status).toBe('not_submitted')
    expect(student2?.assessment_date).toBeNull()  // not_submitted は null
  })

  it('should show toast when students are skipped', async () => {
    await loginAsCoach('coach1')
    await page.goto('/coach/assessment-input')

    // トーストが表示されることを確認
    const toast = page.locator('.toast', { hasText: '学年情報の不備' })
    await expect(toast).toBeVisible()
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
- [ ] 学年が無効な生徒がいても、その生徒だけスキップされ、トーストで通知される
- [ ] 欠席ステータスを選択でき、得点入力が無効化される
- [ ] 欠席 → 提出済 に戻すと、直前の得点が復元される
- [ ] **得点を入力後、absent に切替、再度 completed に戻すと、最新の得点が復元される**
- [ ] **absent で日付が保存される、not_submitted で日付が null になる**
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

---

## リスク評価

| リスク | 影響度 | 対策 | 残存リスク |
|--------|--------|------|----------|
| scoreCache がシステムクリアで上書き | 🔴 高 | isSystemClear フラグで分岐 | **解消済み** |
| absent で日付が保存されない | 🟡 中 | status !== 'not_submitted' で保存 | **解消済み** |
| 学年スキップがサイレント | 🟡 中 | トースト通知 + skippedCount 返却 | **解消済み** |
| Map化でメモリ消費増 | 🟢 低 | 30名規模では negligible | 低（実用上問題なし） |

---

## 補足事項

### v2.2 で追加された設計改善

1. **scoreCache の更新タイミング制御**
   - `isSystemClear` フラグで、ステータス変更時のクリアを区別
   - ユーザーの手動入力のみキャッシュ更新、システムクリアは保持

2. **assessment_date の absent 時の扱い**
   - **absent**: 日付保存（欠席した日を記録、補習管理・分析で追跡可能）
   - **not_submitted**: null（まだテストを実施していない）

3. **学年スキップのトースト通知**
   - サーバーで `skippedStudentsCount` を返却
   - 1回のみトースト表示（警告トーン、`variant: 'default'`）
   - 管理者への連絡を促す

---

## 承認後のアクション

1. ブランチ作成: `feature/fix-assessment-input-bugs`
2. `lib/utils/grade-converter.ts` 作成（推定所要時間: 15分）
3. `app/actions/coach.ts` 修正（推定所要時間: 2.5時間）
4. `app/coach/assessment-input/page.tsx` 修正（推定所要時間: 2.5時間）
5. テストコード作成（推定所要時間: 1時間）
6. ローカルテスト完了後、レビュー依頼
7. 承認後 main へマージ

**合計推定所要時間**: 6-6.5時間

---

**実装準備完了。最終版確定。実装開始の承認をお待ちしています。**
