# 春期講習期間対応 — 実装計画

## 1. 背景・課題

2026年3月25日現在、`getCurrentSession()` は `study_sessions` テーブルに当日を含むレコードがないと、最新回（小5→第20回、小6→第18回）にフォールバックする。
春期講習期間中の生徒にとって、7月の回が表示されるのは不自然。

### 講習・休暇期間（study_sessions のギャップ）

| 学年 | 期間 | 種別 |
|------|------|------|
| 小5 | 2026-03-23 〜 2026-04-05 | 春期講習 |
| 小6 | 2026-03-23 〜 2026-04-12 | 春期講習 |
| 小5 | 2026-04-27 〜 2026-05-03 | GW休み |
| 小6 | 2026-04-27 〜 2026-05-03 | GW休み |

**注意**: ギャップ検出だけでは春期とGWを区別できないため、明示的な期間定義が必要。

## 2. 設計方針

**「共通の期間判定関数を先に作り、春期UIを出す」**

- `study_sessions` テーブルは変更しない（session_number: 0/null は不可）
- 講習期間は定数として明示定義（DB追加は長期課題）
- 既存の全回次プルダウン・復習週UIはそのまま活用

## 3. 実装内容

### 3-1. 共通定数: `lib/constants/special-periods.ts`（新規）

```typescript
export type SpecialPeriodType = 'spring_break' | 'gw_break' | 'summer_break'

export interface SpecialPeriod {
  type: SpecialPeriodType
  label: string         // 「春期講習」
  message: string       // 「春期講習がんばろう！」
  description: string   // 詳細メッセージ
  startDate: string     // 'YYYY-MM-DD'
  endDate: string       // 'YYYY-MM-DD'
  grade: number
}

// 2026年度の特別期間（年度更新時にここだけ変更）
export const SPECIAL_PERIODS_2026: SpecialPeriod[] = [
  {
    type: 'spring_break',
    label: '春期講習',
    message: '春期講習がんばろう！🌸',
    description: 'この期間は、既習分野の復習や予習シリーズの振り返りに取り組みましょう。演習問題集にもチャレンジしてみよう！',
    startDate: '2026-03-23',
    endDate: '2026-04-05',
    grade: 5,
  },
  {
    type: 'spring_break',
    label: '春期講習',
    message: '春期講習がんばろう！🌸',
    description: 'この期間は、既習分野の復習や予習シリーズの振り返りに取り組みましょう。演習問題集にもチャレンジしてみよう！',
    startDate: '2026-03-23',
    endDate: '2026-04-12',
    grade: 6,
  },
  {
    type: 'gw_break',
    label: 'GW休み',
    message: 'GW中も少しずつ取り組もう！',
    description: 'ゴールデンウィーク中です。苦手分野の復習や、演習問題集に取り組みましょう。',
    startDate: '2026-04-27',
    endDate: '2026-05-03',
    grade: 5,
  },
  {
    type: 'gw_break',
    label: 'GW休み',
    message: 'GW中も少しずつ取り組もう！',
    description: 'ゴールデンウィーク中です。苦手分野の復習や、演習問題集に取り組みましょう。',
    startDate: '2026-04-27',
    endDate: '2026-05-03',
    grade: 6,
  },
]
```

### 3-2. 共通判定関数: `lib/utils/learning-period.ts`（新規）

```typescript
import { SPECIAL_PERIODS_2026, SpecialPeriod } from '@/lib/constants/special-periods'
import { getTodayJST } from '@/lib/utils/date-jst'

export type LearningPeriodResult =
  | { type: 'regular'; session: { id: number; session_number: number; start_date: string; end_date: string } }
  | { type: 'special'; period: SpecialPeriod; lastSession: { id: number; session_number: number } | null }

/**
 * 現在の学習期間を判定する。
 * - study_sessions に当日が含まれる → 'regular'（通常回）
 * - SPECIAL_PERIODS に当日が含まれる → 'special'（講習/休暇期間）
 * - どちらでもない → フォールバック: 直前の通常回を 'regular' として返す
 */
export async function getCurrentLearningPeriod(
  grade: number,
  supabase: SupabaseClient,
): Promise<LearningPeriodResult> {
  const today = getTodayJST()

  // 1. 通常回に該当するか
  const { data: session, error: sessionError } = await supabase
    .from('study_sessions')
    .select('id, session_number, start_date, end_date')
    .eq('grade', grade)
    .lte('start_date', today)
    .gte('end_date', today)
    .single()

  if (session) {
    return { type: 'regular', session }
  }

  // DB接続エラー等の異常はここで検出（PGRST116 = 0行ヒットは正常）
  if (sessionError && sessionError.code !== 'PGRST116') {
    console.error('[getCurrentLearningPeriod] DB error:', sessionError)
    throw new Error(`study_sessions query failed: ${sessionError.message}`)
  }

  // 2. 特別期間に該当するか
  const specialPeriod = SPECIAL_PERIODS_2026.find(
    p => p.grade === grade && today >= p.startDate && today <= p.endDate
  )

  if (specialPeriod) {
    // 直前の通常回を取得（プルダウンのデフォルト位置用）
    const { data: lastSession } = await supabase
      .from('study_sessions')
      .select('id, session_number')
      .eq('grade', grade)
      .lte('end_date', today)
      .order('session_number', { ascending: false })
      .limit(1)
      .single()

    return { type: 'special', period: specialPeriod, lastSession }
  }

  // 3. フォールバック: 直前の通常回
  const { data: fallback } = await supabase
    .from('study_sessions')
    .select('id, session_number, start_date, end_date')
    .eq('grade', grade)
    .lte('end_date', today)
    .order('session_number', { ascending: false })
    .limit(1)
    .single()

  if (fallback) {
    return { type: 'regular', session: fallback }
  }

  // 4. 最終フォールバック: 最初の回
  const { data: first } = await supabase
    .from('study_sessions')
    .select('id, session_number, start_date, end_date')
    .eq('grade', grade)
    .order('session_number', { ascending: true })
    .limit(1)
    .single()

  return { type: 'regular', session: first! }
}
```

### 3-3. `getCurrentSession()` は変更しない

既存の `getCurrentSession()` の戻り値・シグネチャは維持する。
呼び出し元は `spark-client.tsx` のみであり、互換性を壊す価値がない。

スパーク側では `getCurrentLearningPeriod()` を直接呼び出す（Server Action 経由）。
ダッシュボード側も `getCurrentLearningPeriod()` を直接使う。

```typescript
// app/actions/study-log.ts に新規追加（getCurrentSession は既存のまま残す）
export async function getLearningPeriod(grade: number): Promise<LearningPeriodResult> {
  const supabase = await createClient()
  return getCurrentLearningPeriod(grade, supabase)
}
```

### 3-4. スパーク画面の変更: `app/student/spark/spark-client.tsx`

#### 初期化ロジック（useEffect）
```typescript
// getLearningPeriod() を直接使用（getCurrentSession は変更しない）
const result = await getLearningPeriod(grade)
if (result.type === 'special') {
  setSpecialPeriod(result.period)       // 新 state
  setSelectedSessionId(null)             // 初期選択なし（プレースホルダー表示）
} else {
  setCurrentSessionNumber(result.session.session_number)
  setSelectedSessionId(result.session.id)
}
```

#### UI変更
- **バナー表示**: `specialPeriod` が存在する場合、セッション選択カードの上に講習期間バナーを表示
- **初期選択**: 空（「学習回を選択してください」プレースホルダー）
- **プルダウン**: 全回次が選択可能（既存のまま）
- **選択後**: 通常通りコンテンツを表示（復習週カードも既存ロジックで表示される）

```tsx
{specialPeriod && (
  <Card className="shadow-lg border-0 bg-gradient-to-r from-pink-50 to-orange-50 border-l-4 border-pink-400">
    <CardContent className="py-4">
      <div className="flex items-center gap-3">
        <span className="text-2xl">🌸</span>
        <div>
          <p className="font-bold text-lg text-pink-800">{specialPeriod.message}</p>
          <p className="text-sm text-pink-600 mt-1">{specialPeriod.description}</p>
        </div>
      </div>
    </CardContent>
  </Card>
)}
```

### 3-5. ダッシュボードの変更

**方針**: ダッシュボードでは「直前回のデータを返す」のではなく、特別期間専用の表示に切り替える。
現行の週次集計は session_id 単位で全件集計しており（dashboard.ts line 835）、直前回を使うと
休み前の古いログが混入する。保護者側はすでに「直近7日」フォールバックを持っている（parent-dashboard.ts line 1037）。

#### 生徒ダッシュボード: `app/actions/dashboard.ts`

| 関数名 | 行 | special期間の処理 |
|--------|-----|------------------|
| `getWeeklyCumulativeProgress()` | L360 | セッション未ヒット時に `getCurrentLearningPeriod()` で判定。special なら `{ progress: [], specialPeriod }` を返す（直前回のログは混ぜない）。AIコーチメッセージの材料用 |
| `getWeeklySubjectProgress()` | L792 | 同様に special 判定。`{ progress: [], sessionNumber: null, specialPeriod }` を返す。**週次**集計なので直前回ログを混ぜない |
| `getTodayMissionData()` | L1049 | special 期間中は `{ todayProgress: [], specialPeriod }` を返す。ミッション自体が存在しない期間 |
| `getRecentStudyLogs()` | L149 | 変更なし。study_date ベースの直近ログなのでセッションに依存しない |
| `getLearningCalendarData()` | L1127 | 変更なし。study_date ベースの過去データなのでセッションに依存しない |

#### 保護者ダッシュボード: `app/actions/parent-dashboard.ts`

| 関数名 | 行 | special期間の処理 |
|--------|-----|------------------|
| `getStudentTodayMissionData()` | L831 | special 期間中は `{ todayProgress: [], specialPeriod }` を返す |
| `getStudentWeeklyProgress()` | L967 | 既存の「直近7日」フォールバック（L1037）はそのまま維持。special 判定を追加し `specialPeriod` フラグも返す |

#### AIコーチメッセージ: `getWeeklyCumulativeProgress()` (dashboard.ts L360)

- special 期間中はAIコーチの週次進捗材料が存在しないため、空進捗を返す
- UI側で specialPeriod を検出したら、AIコーチ欄に固定メッセージを表示:
  「春期講習期間です。これまでの復習や、演習問題集に取り組んでみましょう！」

#### ダッシュボードUI: カード別の表示方針（`app/student/dashboard-client.tsx`）

specialPeriod が返された場合の各カードの動作:

| カード | props元 | special期間の表示 | 理由 |
|--------|---------|-----------------|------|
| 春期講習バナー | specialPeriod | **新規表示**（スパークと同じデザイン） | 期間認識のため |
| AIコーチメッセージ | `aiCoachMessage` | 講習期間用の固定メッセージに差し替え | 週次進捗材料がないため |
| 今日のミッション | `todayProgress` | 「講習期間中はミッションはお休みです」表示 | ミッション不在 |
| 学習カレンダー | `calendarData` | **通常表示** | study_date ベースの過去データ |
| 今週の科目別進捗 | `weeklyProgress` | **空表示**（進捗バー非表示 or 「-」） | 週次集計であり、直前回の古いログを出すと誤解を招く |
| 直近の学習履歴 | `recentLogs` | **通常表示** | study_date ベースの直近ログ |
| 応援メッセージ | `recentMessages` | **通常表示** | セッション非依存 |

### 3-6. コーチ側への影響

コーチ側（`app/actions/coach.ts`）は `study_sessions.session_number` を全回次として扱っているが、コーチ画面自体は「生徒を選んで履歴を見る」構造なので、春期講習バナーは不要。変更なし。

## 4. 影響範囲

| ファイル | 変更内容 |
|---------|---------|
| `lib/constants/special-periods.ts` | **新規** — 特別期間定数 |
| `lib/utils/learning-period.ts` | **新規** — `getCurrentLearningPeriod()` |
| `app/actions/study-log.ts` | `getLearningPeriod()` 新規追加（`getCurrentSession()` は既存のまま） |
| `app/student/spark/spark-client.tsx` | 春期バナー追加、初期選択空 |
| `app/student/page.tsx` または dashboard コンポーネント | バナー表示 |
| `app/actions/dashboard.ts` | `getWeeklyCumulativeProgress`, `getWeeklySubjectProgress`, `getTodayMissionData` に special 判定追加 |
| `app/actions/parent-dashboard.ts` | `getStudentTodayMissionData`, `getStudentWeeklyProgress` に special 判定追加 |
| `app/student/dashboard-client.tsx` | specialPeriod 受け取り、バナー・各カード表示分岐 |

## 5. DB変更

**なし** — アプリ層のみの変更。マイグレーション不要。

## 6. テスト観点

- `getCurrentLearningPeriod()`: 通常回/春期/GW/期間外の4パターン
- `getCurrentLearningPeriod()`: DB接続エラー時に例外を投げること（PGRST116 以外）
- `getCurrentSession()`: 既存動作が変わらないことの確認（変更しないため回帰テストのみ）
- スパーク画面: 春期中にバナー表示、セッション未選択、セッション選択後は通常動作
- ダッシュボード混入テスト: 春期中に第6回へ今日の日付で入力したログが週次進捗に混ざらないこと
- ダッシュボード混入テスト: 休み前の第6回ログが春期中の集計に含まれないこと

## 7. 長期課題（今回はスコープ外）

- `special_periods` テーブルのDB化（管理画面から期間設定可能に）
- 夏期講習・冬期講習の対応
- 年度更新時の定数ファイル更新手順のドキュメント化
