# テスト結果履歴機能 - 保護者画面への展開実装タスク

## 📋 実装概要

生徒画面の「ふりかえり」タブに実装済みのテスト結果履歴機能を、保護者画面にも展開する。
既存コンポーネントを再利用し、`studentId` パラメータを追加することで実現する。

**実装前に、以下の事前修正を完了させる必要がある。**

---

## ⚠️ 事前修正タスク（Pre-Fixes）

保護者実装を始める前に、以下の修正を完了させること。

### ✅ タスク 1: JST専用日付ヘルパー関数の追加

**目的**: サーバーのタイムゾーンに依存しない日付計算を実現する

**ファイル**: `lib/utils/date-jst.ts`

**現状の問題**:
- `app/actions/reflect.ts` の期間フィルター計算で `getNowJST()` + `setDate()` / `setMonth()` を使用
- これはローカルタイムゾーンに依存するため、UTCサーバーでは日付境界で1日ずれる可能性がある

**追加する関数**:

```typescript
/**
 * 指定した週数前のJST日付を取得（YYYY-MM-DD形式）
 * @param weeks - 週数（正の値で過去、負の値で未来）
 * @example
 * getWeeksAgoJST(1) // 1週間前
 * getWeeksAgoJST(-1) // 1週間後
 */
export function getWeeksAgoJST(weeks: number): string {
  const todayStr = getTodayJST()
  const jstDate = new Date(`${todayStr}T00:00:00+09:00`)
  const targetMs = jstDate.getTime() - (weeks * 7 * 24 * 60 * 60 * 1000)
  const targetDate = new Date(targetMs)
  return formatDateToJST(targetDate)
}

/**
 * 指定した月数前のJST日付を取得（YYYY-MM-DD形式）
 * @param months - 月数（正の値で過去、負の値で未来）
 * @example
 * getMonthsAgoJST(1) // 1ヶ月前
 * getMonthsAgoJST(3) // 3ヶ月前
 */
export function getMonthsAgoJST(months: number): string {
  const todayStr = getTodayJST()
  const [year, month, day] = todayStr.split('-').map(Number)

  let targetYear = year
  let targetMonth = month - months

  // 月が0以下になる場合、年を調整
  while (targetMonth < 1) {
    targetMonth += 12
    targetYear -= 1
  }

  // 月が13以上になる場合、年を調整
  while (targetMonth > 12) {
    targetMonth -= 12
    targetYear += 1
  }

  // 対象月の最終日を取得（JST完全独立で計算）
  // Date.UTC を使ってローカルTZに依存しないようにする
  const daysInTargetMonth = new Date(Date.UTC(targetYear, targetMonth, 0)).getUTCDate()
  const targetDay = Math.min(day, daysInTargetMonth)

  const monthStr = String(targetMonth).padStart(2, '0')
  const dayStr = String(targetDay).padStart(2, '0')
  return `${targetYear}-${monthStr}-${dayStr}`
}
```

**完了条件**:
- [ ] 2つの関数を `date-jst.ts` に追加
- [ ] JSDocコメントを適切に記述
- [ ] エクスポートを確認

---

### ✅ タスク 2: 共通型定義ファイルの作成

**目的**: 型の重複定義を解消し、メンテナンス性を向上させる

**ファイル**: `app/student/reflect/types.ts`（新規作成）

**現状の問題**:
- `AssessmentData` が3つのコンポーネントに重複定義されている
- `AssessmentSummary` が2つのファイルに重複定義されている
- 将来的に型定義がズレるリスクがある

**作成する型定義**:

```typescript
/**
 * テスト結果履歴機能の共通型定義
 *
 * このファイルは以下のコンポーネントで共有される:
 * - app/student/reflect/assessment-history.tsx
 * - app/student/reflect/components/assessment-summary-cards.tsx
 * - app/student/reflect/components/assessment-trend-chart.tsx
 * - app/student/reflect/components/assessment-history-list.tsx
 * - app/parent/reflect/page.tsx (予定)
 */

/**
 * テスト結果の基本データ型
 * データベースの class_assessments テーブルと assessment_masters テーブルの結合結果
 */
export interface AssessmentData {
  id: string
  score: number
  max_score_at_submission: number
  assessment_date: string
  master?: {
    id: string
    title: string | null
    assessment_type: string
    max_score: number
    session_number: number
  }
}

/**
 * テスト結果のサマリー統計データ型
 * 最新結果、平均、受験回数などを含む
 */
export interface AssessmentSummary {
  latest: {
    math: {
      id: string
      name: string | null
      score: number
      maxScore: number
      percentage: number
      submittedAt: string
    } | null
    kanji: {
      id: string
      name: string | null
      score: number
      maxScore: number
      percentage: number
      submittedAt: string
    } | null
  } | null
  averages: {
    math: number | null
    kanji: number | null
  } | null
  counts: {
    math: number
    kanji: number
    total: number
  }
}
```

**完了条件**:
- [ ] `app/student/reflect/types.ts` を作成
- [ ] 上記の2つのインターフェースを定義
- [ ] JSDocコメントを適切に記述

---

### ✅ タスク 3: コンポーネントの型定義を共通型に置き換え

**目的**: 重複している型定義を削除し、共通型ファイルをインポートする

**対象ファイル**:

#### 3-1: `app/student/reflect/assessment-history.tsx`
- **削除**: 9-51行目のローカル型定義（AssessmentData, AssessmentSummary）
- **追加**: `import { AssessmentData, AssessmentSummary } from './types'`
- **位置**: ファイル先頭のimportセクション

#### 3-2: `app/student/reflect/components/assessment-summary-cards.tsx`
- **削除**: 7-35行目のローカル型定義（AssessmentSummary）
- **追加**: `import { AssessmentSummary } from '../types'`
- **位置**: ファイル先頭のimportセクション

#### 3-3: `app/student/reflect/components/assessment-trend-chart.tsx`
- **削除**: 8-20行目のローカル型定義（AssessmentData）
- **追加**: `import { AssessmentData } from '../types'`
- **位置**: ファイル先頭のimportセクション

#### 3-4: `app/student/reflect/components/assessment-history-list.tsx`
- **削除**: 10-22行目のローカル型定義（AssessmentData）
- **追加**: `import { AssessmentData } from '../types'`
- **位置**: ファイル先頭のimportセクション

**完了条件**:
- [ ] 4つのファイル全てでローカル型定義を削除
- [ ] 共通型ファイルからインポートを追加
- [ ] TypeScriptのビルドエラーがないことを確認

---

### ✅ タスク 4: Server Actionsの日付計算を修正

**目的**: サーバーTZ依存の日付計算をJST専用ヘルパーに置き換える

**ファイル**: `app/actions/reflect.ts`

**修正箇所**: 729-745行目の期間フィルター計算

**修正前**:
```typescript
// 期間フィルターの計算（DATE型カラムと比較するため YYYY-MM-DD 形式、JST基準）
let dateFilter: string | null = null
const nowJST = getNowJST()

if (filters?.period === '1week') {
  const oneWeekAgo = new Date(nowJST)
  oneWeekAgo.setDate(nowJST.getDate() - 7)
  dateFilter = formatDateToJST(oneWeekAgo)
} else if (filters?.period === '1month') {
  const oneMonthAgo = new Date(nowJST)
  oneMonthAgo.setMonth(nowJST.getMonth() - 1)
  dateFilter = formatDateToJST(oneMonthAgo)
} else if (filters?.period === '3months') {
  const threeMonthsAgo = new Date(nowJST)
  threeMonthsAgo.setMonth(nowJST.getMonth() - 3)
  dateFilter = formatDateToJST(threeMonthsAgo)
}
```

**修正後**:
```typescript
// 期間フィルターの計算（DATE型カラムと比較するため YYYY-MM-DD 形式、JST基準）
let dateFilter: string | null = null

if (filters?.period === '1week') {
  dateFilter = getWeeksAgoJST(1)
} else if (filters?.period === '1month') {
  dateFilter = getMonthsAgoJST(1)
} else if (filters?.period === '3months') {
  dateFilter = getMonthsAgoJST(3)
}
```

**import文の追加**:
```typescript
// 既存のimportに追加
import { formatDateToJST, getWeeksAgoJST, getMonthsAgoJST } from '@/lib/utils/date-jst'
```

**完了条件**:
- [ ] 日付計算ロジックを新しいヘルパーに置き換え
- [ ] import文を追加
- [ ] `getNowJST` のインポートは残す（他で使用している可能性があるため）
- [ ] TypeScriptのビルドエラーがないことを確認

---

### ✅ タスク 5: 事前修正の動作確認

**目的**: 生徒画面の既存機能が正常に動作することを確認

**確認項目**:
- [ ] `pnpm run build` が成功する（型エラーなし）
- [ ] 生徒画面のふりかえりタブ > テスト結果タブが開く
- [ ] サマリーカードが正しく表示される
- [ ] トレンドチャートが正しく表示される
- [ ] 履歴リストが正しく表示される
- [ ] 期間フィルター（1週間/1ヶ月/3ヶ月）が正しく動作する
- [ ] テスト種類フィルター（算数/漢字）が正しく動作する
- [ ] 並び順（新しい順/古い順/得点率順）が正しく動作する

**テストアカウント**: `student1` (または任意の生徒アカウント)

**完了条件**:
- [ ] 上記の全ての確認項目が✅
- [ ] コンソールエラーなし
- [ ] 機能的な退行がないことを確認

---

### 📦 事前修正のコミット

**ブランチ**: `fix/assessment-history-improvements`

**コミットメッセージ案**:
```
refactor(reflect): テスト結果履歴機能の型とJST日付計算を改善

事前修正内容:
- JST専用日付ヘルパー（getWeeksAgoJST, getMonthsAgoJST）を追加
- 共通型定義ファイル（types.ts）を作成し、重複定義を解消
- Server Actionsの日付計算をサーバーTZ非依存に修正
- 既存機能の動作確認完了

保護者画面への展開実装のための基盤整備

🤖 Generated with Claude Code
Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

---

## 🚀 保護者実装タスク（Parent Implementation）

事前修正完了後、以下のタスクを実施する。

### ✅ タスク 6: Server Actionsに親権限チェックを追加

**目的**: 保護者が自分の子供のデータのみアクセスできるようにする

**ファイル**: `app/actions/reflect.ts`

**スキーマ情報**（確認済み）:
- `students.id`: `BIGSERIAL` (JavaScriptでは **string** として扱う)
- 親子関係テーブル: `parent_child_relations`
- カラム: `parent_id`, `student_id` (両方とも BIGINT → string)

#### 6-1: `getAssessmentHistory` の修正

**関数シグネチャの変更**:
```typescript
// 修正前
export async function getAssessmentHistory(filters?: {
  testType?: 'all' | 'math_print' | 'kanji_test'  // 'all' を含む
  period?: 'all' | '1week' | '1month' | '3months'  // 'all' を含む
  sessionNumber?: number
  sortBy?: 'date_desc' | 'date_asc' | 'score_desc' | 'score_asc'
}): Promise<...>

// 修正後
export async function getAssessmentHistory(filters?: {
  testType?: 'all' | 'math_print' | 'kanji_test'  // 'all' を含む
  period?: 'all' | '1week' | '1month' | '3months'  // 'all' を含む
  sessionNumber?: number
  sortBy?: 'date_desc' | 'date_asc' | 'score_desc' | 'score_asc'
  studentId?: string  // 👈 追加
}): Promise<...>
```

**注意**: 既存UIでは `testType='all'` と `period='all'` を使用しているため、型定義に含める必要があります。

**権限チェックロジックの追加** (関数の最初に挿入):
```typescript
export async function getAssessmentHistory(filters?: {
  testType?: 'all' | 'math_print' | 'kanji_test'  // 'all' を含む
  period?: 'all' | '1week' | '1month' | '3months'  // 'all' を含む
  sessionNumber?: number
  sortBy?: 'date_desc' | 'date_asc' | 'score_desc' | 'score_asc'
  studentId?: string
}): Promise<{
  assessments: AssessmentData[]
  error?: string
}> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { error: "認証が必要です", assessments: [] }
    }

    // 対象の生徒IDを決定
    let targetStudentId: string

    if (filters?.studentId) {
      // 保護者が他の生徒IDを指定している場合 → 権限チェック
      const { data: parent, error: parentError } = await supabase
        .from("parents")
        .select("id")
        .eq("user_id", user.id)
        .single()

      // Fail-closed: 保護者レコードが存在しない場合は拒否
      if (parentError || !parent) {
        return {
          error: "アクセス権限がありません（保護者情報が見つかりません）",
          assessments: []
        }
      }

      // 親子関係の確認
      const { data: relation, error: relationError } = await supabase
        .from("parent_child_relations")
        .select("id")
        .eq("parent_id", parent.id)
        .eq("student_id", filters.studentId)
        .single()

      // Fail-closed: 親子関係が存在しない場合は拒否
      if (relationError || !relation) {
        return {
          error: "アクセス権限がありません（この生徒の情報は閲覧できません）",
          assessments: []
        }
      }

      targetStudentId = filters.studentId
    } else {
      // studentId未指定 → 現在のユーザーが生徒の場合のみ許可
      const { data: student, error: studentError } = await supabase
        .from("students")
        .select("id")
        .eq("user_id", user.id)
        .single()

      if (studentError || !student) {
        return { error: "生徒情報が見つかりません", assessments: [] }
      }

      targetStudentId = student.id.toString()
    }

    // 以下、既存のロジック（student.id を targetStudentId に置き換える）
    // ...
```

**完了条件**:
- [ ] `studentId` パラメータを追加
- [ ] Fail-closed パターンで権限チェックを実装
- [ ] `targetStudentId` を使用してクエリを実行
- [ ] エラーメッセージを適切に設定

#### 6-2: `getAssessmentSummary` の修正

同様のパターンで `getAssessmentSummary` にも `studentId` パラメータと権限チェックを追加する。

**関数シグネチャの変更**:
```typescript
// 修正前
export async function getAssessmentSummary(): Promise<AssessmentSummary | { error: string }>

// 修正後
export async function getAssessmentSummary(filters?: {
  studentId?: string
}): Promise<AssessmentSummary | { error: string }>
```

**注意**: `getAssessmentHistory` と API 形式を統一するため、`filters` オブジェクト形式を採用します。
将来的にサマリーのフィルター条件（期間など）を追加する可能性も考慮した設計です。

**権限チェックロジック**: `getAssessmentHistory` と同じロジックを実装

**完了条件**:
- [ ] `filters` パラメータを追加
- [ ] 権限チェックロジックを追加
- [ ] `targetStudentId` を使用してクエリを実行

---

### ✅ タスク 7: AssessmentHistoryコンポーネントの拡張

**目的**: 生徒IDを外部から受け取れるようにする

**ファイル**: `app/student/reflect/assessment-history.tsx`

**Props型の拡張**:
```typescript
// 修正前（暗黙的にpropsなし）
export function AssessmentHistory() {
  // ...
}

// 修正後
interface AssessmentHistoryProps {
  studentId?: string  // 保護者画面から渡される生徒ID（オプショナル）
}

export function AssessmentHistory({ studentId }: AssessmentHistoryProps = {}) {
  // ...
}
```

**useEffectの修正**:
```typescript
// 修正前
useEffect(() => {
  async function fetchData() {
    try {
      setLoading(true)
      setError(null)

      const [historyResult, summaryResult] = await Promise.all([
        getAssessmentHistory({ sortBy: 'date_desc' }),
        getAssessmentSummary()
      ])
      // ...
    }
  }

  fetchData()
}, [])

// 修正後
useEffect(() => {
  async function fetchData() {
    try {
      setLoading(true)
      setError(null)

      const [historyResult, summaryResult] = await Promise.all([
        getAssessmentHistory({ sortBy: 'date_desc', studentId }),
        getAssessmentSummary({ studentId })  // 👈 filters形式に統一
      ])
      // ...
    }
  }

  fetchData()
}, [studentId])  // 👈 依存配列に追加
```

**完了条件**:
- [ ] Props型を定義
- [ ] `studentId` をServer Actionsに渡す（両方とも filters 形式）
- [ ] useEffectの依存配列に `studentId` を追加
- [ ] TypeScriptのビルドエラーがないことを確認

---

### ✅ タスク 8: 保護者画面へのタブ追加

**目的**: 保護者のふりかえりページに「テスト結果」タブを追加

**ファイル**: `app/parent/reflect/page.tsx`

#### 8-1: インポートの追加

```typescript
// 既存のimportに追加
import { AssessmentHistory } from '@/app/student/reflect/assessment-history'
```

#### 8-2: タブ値の型とホワイトリストの更新

**修正箇所1**: URLパラメータのホワイトリスト（line 57-59付近）

```typescript
// 修正前
const initialTab = (tabParam && ["map", "history", "encouragement", "coaching"].includes(tabParam))
  ? (tabParam as "map" | "history" | "encouragement" | "coaching")
  : "map"

// 修正後
const initialTab = (tabParam && ["map", "history", "encouragement", "coaching", "assessment-history"].includes(tabParam))
  ? (tabParam as "map" | "history" | "encouragement" | "coaching" | "assessment-history")
  : "map"
```

**修正箇所2**: activeTab の型定義（line 70付近）

```typescript
// 修正前
const [activeTab, setActiveTab] = useState<"map" | "history" | "encouragement" | "coaching">(initialTab)

// 修正後
const [activeTab, setActiveTab] = useState<"map" | "history" | "encouragement" | "coaching" | "assessment-history">(initialTab)
```

**理由**: URLパラメータで `?tab=assessment-history` を使ってタブを直接開けるようにするため、既存のタブ管理ロジックに新しいタブ値を追加する必要があります。

#### 8-3: TabsListの修正

```typescript
// 修正前
<TabsList className="grid w-full grid-cols-4">

// 修正後
<TabsList className="grid w-full grid-cols-5">
```

#### 8-4: 新しいタブの追加

```typescript
// 既存のTabsTriggerの後に追加
<TabsTrigger value="assessment-history">
  <span className="hidden sm:inline">テスト結果</span>
  <span className="sm:hidden">テスト</span>
</TabsTrigger>
```

#### 8-5: TabsContentの追加

```typescript
// 既存のTabsContentの後に追加
<TabsContent value="assessment-history" className="mt-6">
  {!selectedChild ? (
    <Card className="card-elevated">
      <CardContent className="py-12 text-center space-y-4">
        <div className="text-6xl">👨‍👩‍👧‍👦</div>
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-700">
            お子さまを選択してください
          </p>
          <p className="text-xs text-slate-500">
            上のドロップダウンからお子さまを選択すると、テスト結果が表示されます
          </p>
        </div>
      </CardContent>
    </Card>
  ) : (
    <AssessmentHistory studentId={selectedChild.id} />
  )}
</TabsContent>
```

**完了条件**:
- [ ] インポートを追加
- [ ] タブ値の型とホワイトリストを更新（URLパラメータ対応）
- [ ] TabsListを5列に変更
- [ ] 新しいタブトリガーを追加
- [ ] TabsContentを追加（空状態ハンドリング付き）
- [ ] TypeScriptのビルドエラーがないことを確認

---

### ✅ タスク 9: 保護者実装の動作確認

**目的**: 保護者画面でテスト結果が正しく表示されることを確認

**確認項目**:

#### 9-1: 基本表示
- [ ] 保護者ダッシュボードのふりかえりタブで5つのタブが表示される
- [ ] 「テスト結果」タブが表示される
- [ ] 子供が選択されていない状態で空状態メッセージが表示される

#### 9-2: データ表示
- [ ] 子供を選択すると、その子供のテスト結果が表示される
- [ ] サマリーカードが正しく表示される
- [ ] トレンドチャートが正しく表示される
- [ ] 履歴リストが正しく表示される

#### 9-3: フィルター機能
- [ ] テスト種類フィルターが動作する
- [ ] 期間フィルターが動作する
- [ ] 並び順が動作する

#### 9-4: 権限チェック
- [ ] 他人の子供のIDを直接指定しても拒否される（コンソール確認）
- [ ] エラーメッセージが適切に表示される

#### 9-5: 生徒画面の回帰テスト
- [ ] 生徒画面のテスト結果タブが正常に動作する（既存機能が壊れていないこと）
- [ ] 生徒画面でstudentIdなしでも正常に動作する

**テストアカウント**:
- 保護者: `parent1` (または任意の保護者アカウント)
- 生徒: `student1` (確認用)

**完了条件**:
- [ ] 上記の全ての確認項目が✅
- [ ] コンソールエラーなし
- [ ] 権限チェックが正しく動作
- [ ] 既存機能の回帰なし

---

### 📦 保護者実装のコミット

**ブランチ**: `feature/assessment-history-parent`（事前修正のブランチから派生）

**コミットメッセージ案**:
```
feat(parent): テスト結果履歴を保護者画面に追加

実装内容:
- Server ActionsにstudentIdパラメータと親権限チェックを追加
- AssessmentHistoryコンポーネントにstudentId propsを追加
- 保護者のふりかえりページに「テスト結果」タブを追加
- Fail-closedパターンで親子関係を厳格にチェック

既存の生徒画面コンポーネントを再利用し、コード重複を最小化

🤖 Generated with Claude Code
Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

---

## 📊 進捗管理

### 事前修正フェーズ (Pre-Fixes)

- [ ] タスク1: JST専用日付ヘルパー関数の追加
- [ ] タスク2: 共通型定義ファイルの作成
- [ ] タスク3: コンポーネントの型定義を共通型に置き換え
- [ ] タスク4: Server Actionsの日付計算を修正
- [ ] タスク5: 事前修正の動作確認
- [ ] 事前修正のコミット・プッシュ

### 保護者実装フェーズ (Parent Implementation)

- [ ] タスク6: Server Actionsに親権限チェックを追加
  - [ ] 6-1: getAssessmentHistory の修正
  - [ ] 6-2: getAssessmentSummary の修正
- [ ] タスク7: AssessmentHistoryコンポーネントの拡張
- [ ] タスク8: 保護者画面へのタブ追加
  - [ ] 8-1: インポートの追加
  - [ ] 8-2: タブ値の型とホワイトリストの更新
  - [ ] 8-3: TabsListの修正
  - [ ] 8-4: 新しいタブの追加
  - [ ] 8-5: TabsContentの追加
- [ ] タスク9: 保護者実装の動作確認
  - [ ] 9-1: 基本表示
  - [ ] 9-2: データ表示
  - [ ] 9-3: フィルター機能
  - [ ] 9-4: 権限チェック
  - [ ] 9-5: 生徒画面の回帰テスト
- [ ] 保護者実装のコミット・プッシュ

### マージ・デプロイ

- [ ] PR作成（事前修正）
- [ ] PR作成（保護者実装）
- [ ] コードレビュー
- [ ] mainにマージ
- [ ] 本番デプロイ
- [ ] 本番環境での動作確認

---

## 🔧 技術的な補足

### スキーマ情報（確認済み）

**テーブル**: `students`
```sql
CREATE TABLE public.students (
  id BIGSERIAL PRIMARY KEY,  -- JavaScriptでは string として扱う
  user_id UUID NOT NULL UNIQUE,
  login_id VARCHAR(50) NOT NULL UNIQUE,
  full_name VARCHAR(100) NOT NULL,
  ...
)
```

**テーブル**: `parent_child_relations`
```sql
CREATE TABLE public.parent_child_relations (
  id BIGSERIAL PRIMARY KEY,
  parent_id BIGINT NOT NULL,  -- JavaScriptでは string として扱う
  student_id BIGINT NOT NULL,  -- JavaScriptでは string として扱う
  relation_type VARCHAR(20),
  ...
)
```

### 型の扱い

- PostgreSQLの `BIGSERIAL` / `BIGINT` は、JavaScriptでは **string** として扱われる
- これは数値の精度を保つためのSupabaseの設計
- 比較時は文字列として比較する（`===` で問題なし）

### Fail-Closed パターン

保護者の権限チェックは「明示的に許可されない限り拒否」の原則に従う:

```typescript
// ❌ BAD: 親レコードが存在する場合のみチェック（親レコード不在ならスキップ）
if (parent) {
  // 関係チェック
}

// ✅ GOOD: 親レコードが存在しない場合は即座に拒否
if (!parent) {
  return { error: "...", ... }
}
```

---

## 📝 参考ファイル

- [lib/utils/date-jst.ts](../../lib/utils/date-jst.ts) - JST日付ユーティリティ
- [app/actions/reflect.ts](../../app/actions/reflect.ts) - Server Actions
- [app/student/reflect/assessment-history.tsx](../../app/student/reflect/assessment-history.tsx) - メインコンポーネント
- [app/parent/reflect/page.tsx](../../app/parent/reflect/page.tsx) - 保護者ふりかえりページ
- [scripts/test-assessment-history.ts](../../scripts/test-assessment-history.ts) - テストスクリプト

---

## ✅ 完了時のチェックリスト

全てのタスクが完了したら、以下を確認:

- [ ] 全てのタスクが完了している
- [ ] TypeScriptのビルドエラーがない
- [ ] 生徒画面の既存機能が正常に動作する
- [ ] 保護者画面で新機能が正常に動作する
- [ ] 権限チェックが正しく機能する
- [ ] コンソールにエラーが出ていない
- [ ] 本番環境でデータが壊れていない
- [ ] ドキュメントが最新の状態である

---

**作成日**: 2025-12-23
**最終更新**: 2025-12-23
**ステータス**: 📋 準備完了（実装待ち）
