# 指導者画面UI改善計画

## 概要

指導者が「今すぐ対応すべき生徒」を発見し、1画面で学習状況を横断確認できるUIへ改善する。

---

## 現状分析

### 実装状況

| ページ | URL | 状態 | 課題 |
|-------|-----|------|------|
| ホーム | `/coach` | ✅ 実装済み | 要対応リストがない |
| 生徒一覧 | `/coach/students` | ⚠️ 一部ハリボテ | アクションボタンがプレースホルダー |
| ゴールナビ | `/coach/goal` | ✅ 実装済み | ボトムナビに未配置 |
| 応援一覧 | `/coach/encouragement` | ✅ 実装済み | - |
| 分析機能 | `/coach/analysis` | ✅ 実装済み | - |

### ボトムナビ現状

```
ホーム | 生徒一覧 | 応援一覧 | 分析機能
```

**課題**: ゴールナビへの動線がない

---

## 改善方針

### 決定事項

| 項目 | 方針 | 理由 |
|------|------|------|
| ボトムナビ | 4タブ維持 | 5タブはモバイルで親指リーチ・視認性が厳しい |
| メモ機能 | Phase 5に後ろ倒し | DBスキーマ設計を急がず要件固めてから |
| データ取得 | SWR統一 | タブ切替で増分読み込み、初回TTFBを抑制 |
| ID型 | **string統一** | API呼び出し直前に`String()`で変換、型揺れ防止 |

### 新ボトムナビ構成

```
ホーム | ゴールナビ | 応援 | 分析
```

- **生徒一覧**: ホーム内のカードから遷移（カード配置は上部に固定、目立つデザイン）
- **生徒詳細**: 各一覧からタップで遷移

---

## フェーズ計画

### Phase 1: ナビゲーション整理（工数: 小）

#### 1-1. ボトムナビ変更

**ファイル**: `components/coach-bottom-navigation.tsx`

```typescript
const tabs = [
  { id: "home", label: "ホーム", icon: Home, href: "/coach" },
  { id: "goal", label: "ゴールナビ", icon: Target, href: "/coach/goal" },
  { id: "encouragement", label: "応援", icon: Heart, href: "/coach/encouragement" },
  { id: "analysis", label: "分析", icon: BarChart3, href: "/coach/analysis" },
]
```

#### 1-2. ホームにクイックアクセスカード追加

**ファイル**: `app/coach/page.tsx`

**カード配置（上から順）**:

| 順位 | カード | 内容 | 優先度 |
|------|--------|------|--------|
| 1 | 要対応リスト | 要対応生徒数サマリー（Phase 1では件数のみ） | 最高 |
| 2 | 生徒一覧 | 全生徒へのアクセスリンク | 高 |
| 3 | 今週のサマリー | 学習状況の概要 | 中 |

---

### Phase 2: 生徒詳細ページ統合（工数: 大）

#### 2-1. 統合詳細ページ作成

**新規ファイル**: `app/coach/student/[id]/page.tsx`

**ページ設定**:
```typescript
// 動的レンダリング必須（セッション依存）
export const dynamic = "force-dynamic"
export const revalidate = 0
```

**タブ構成**:

| タブ | 内容 | データソース | 取得方式 |
|------|------|-------------|---------|
| 概要 | 基本情報、直近の学習状況、要対応フラグ | 既存API統合 | **SSR（初回描画）** |
| 学習 | 学習履歴、正答率推移、科目別実績 | `getStudentStudyLogs` | SWR（lazy） |
| 目標 | テスト目標・結果一覧 | `getAllTestGoalsForStudent`, `getAllTestResultsForStudent` | SWR（lazy） |
| 応援 | 応援履歴、送信フォーム | `getStudentEncouragementHistory` | SWR（lazy） |
| 分析 | 週次AI分析 | `getStoredWeeklyAnalysis` | SWR（lazy） |
| メモ | 指導メモ（準備中） | Phase 5で実装 | - |

**SSR/SWR役割分担**:
- **概要タブのみSSR**: 初回アクセス時に最低限の情報を即時表示
- **他タブはSWR**: タブ切替時にlazy load、初回TTFBを抑制
- **2度フェッチ回避**: 概要タブのデータはSWRのinitialDataとして渡す

#### 2-2. データ取得パターン

```typescript
// SWRフック例
export function useStudentDetail(studentId: string, tab: string) {
  // studentIdは必ずstring型で受け取る（呼び出し側でString()変換済み）
  const { data, error, isLoading } = useSWR(
    [`student-${tab}`, studentId],
    () => fetchTabData(studentId, tab),
    { revalidateOnFocus: false }
  )
  return { data, error, isLoading }
}

// Server Action経由でRLSチェック
async function fetchTabData(studentId: string, tab: string) {
  switch (tab) {
    case "learning":
      return getStudentStudyLogs(studentId)
    case "goal":
      return getStudentGoalData(studentId)
    // ...
  }
}
```

**日付文字列の生成**:
```typescript
// Server Action内で日付をJST文字列に変換して返す
const formatDateJST = (date: Date) => {
  return date.toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo" })
}

// クライアントではnew Date()を使わず、サーバーから受け取った文字列をそのまま表示
```

#### 2-3. 生徒一覧のアクションボタン修正

**ファイル**: `app/coach/students/page.tsx`

現在のプレースホルダーを削除し、統合詳細ページへのリンクに変更。

---

### Phase 3: ダッシュボード強化（工数: 中）

#### 3-1. 要対応リスト

**表示条件と優先順位**:

| 優先度 | 条件 | 重要度 | 表示色 | ソート順 |
|--------|------|--------|--------|---------|
| 1 | 7日以上未入力 | 高 | 赤色 | 未入力日数降順 |
| 2 | 成績急落（前週比-20%以上） | 高 | 赤色 | 下落率降順 |
| 3 | 目標未設定 | 中 | 黄色 | 名前順 |
| 4 | 応援未送信（3日以上） | 低 | グレー | 未送信日数降順 |

**空状態・エラー状態**:

| 状態 | 表示内容 |
|------|---------|
| 要対応なし | 「全員順調です」＋ チェックマークアイコン |
| データ取得失敗 | 「データを取得できませんでした」＋ 再試行ボタン |
| 一部取得失敗 | 取得成功分を表示＋ 警告バナー |

#### 3-2. API設計

```typescript
// app/actions/coach-dashboard.ts
export async function getCoachDashboardData() {
  const [students, alerts] = await Promise.all([
    getCoachStudents(),
    getCoachAlerts(), // 新規
  ])
  return { students, alerts }
}

export async function getCoachAlerts(): Promise<{
  noGoal: AlertStudent[]
  inactive: AlertStudent[]
  declining: AlertStudent[]
  noEncouragement: AlertStudent[]
  error?: string
}> {
  // 要対応生徒を検出
  // studentIdはすべてstring型で返す
  return {
    noGoal: [...],      // 目標未設定
    inactive: [...],    // 7日以上未入力
    declining: [...],   // 成績急落
    noEncouragement: [...], // 応援未送信
  }
}
```

---

### Phase 4: デザイン統一（工数: 中）

#### 4-1. カラートークン定義

**ファイル**: `lib/constants/design-tokens.ts`

```typescript
/**
 * デザイントークン
 *
 * 使用ルール:
 * - statusColors: 生徒の状態表示に使用（順調/注意/要対応）
 * - courseColors: コースバッジ表示にのみ使用（S/C/B/A）
 * - brandColors: ブランド要素に使用（ロゴ、プライマリCTA）
 *
 * ⚠️ statusColorsとcourseColorsを同一コンポーネントで併用する場合、
 *    視覚的混乱を避けるため、配置を離すか、一方をアイコン表示にする
 */

// 状態色（生徒の状況を示す）
export const statusColors = {
  success: { bg: "bg-green-50", border: "border-green-200", text: "text-green-700" },
  warning: { bg: "bg-yellow-50", border: "border-yellow-200", text: "text-yellow-700" },
  error: { bg: "bg-red-50", border: "border-red-200", text: "text-red-700" },
  info: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700" },
  neutral: { bg: "bg-gray-50", border: "border-gray-200", text: "text-gray-700" },
}

// コース色（学力レベルを示す）- statusColorsと明確に区別
export const courseColors = {
  S: { bg: "bg-purple-100", text: "text-purple-800" },
  C: { bg: "bg-cyan-100", text: "text-cyan-800" },    // blueからcyanに変更（infoとの混同回避）
  B: { bg: "bg-emerald-100", text: "text-emerald-800" }, // greenからemeraldに変更（successとの混同回避）
  A: { bg: "bg-amber-100", text: "text-amber-800" },  // orangeからamberに変更（warningとの混同回避）
}

// ブランド色（アプリ全体のアイデンティティ）
export const brandColors = {
  primary: "bg-primary text-primary-foreground",
  secondary: "bg-secondary text-secondary-foreground",
}
```

#### 4-2. レイアウト基準

**グリッドシステム**:
- 基本単位: **8px**
- 余白: 8px, 16px, 24px, 32px, 48px
- カード内パディング: 16px（モバイル）、24px（デスクトップ）
- カード間マージン: 16px

**アイコンサイズ**:
- 小（インライン）: 16px (h-4 w-4)
- 中（ボタン内）: 20px (h-5 w-5)
- 大（ヘッダー）: 24px (h-6 w-6)
- 特大（空状態）: 48px (h-12 w-12)

**情報密度**:
- 一覧カード: 最大3行の情報 + アクションボタン1行
- 詳細カード: セクション分割、各セクション最大5項目

#### 4-3. 共通カードコンポーネント

**ファイル**: `components/coach/student-card.tsx`

全ページで統一したカード表示。状態色とコース色の配置ルール:
- コースバッジ: 名前の右横（常時表示）
- 状態バッジ: カード右上（要対応時のみ表示）

---

### Phase 5: メモ機能（工数: 中）

#### 5-1. DBスキーマ

```sql
CREATE TABLE coach_student_notes (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  coach_id BIGINT NOT NULL REFERENCES coaches(id),
  student_id BIGINT NOT NULL REFERENCES students(id),
  content TEXT NOT NULL,
  note_type TEXT DEFAULT 'general', -- general, meeting, followup
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス（クエリパフォーマンス向上）
CREATE INDEX idx_coach_student_notes_coach_id ON coach_student_notes(coach_id);
CREATE INDEX idx_coach_student_notes_student_id ON coach_student_notes(student_id);
CREATE INDEX idx_coach_student_notes_created_at ON coach_student_notes(created_at DESC);

-- RLSポリシー（USING + WITH CHECK で読み書き両方を制御）
ALTER TABLE coach_student_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches can manage own notes"
  ON coach_student_notes FOR ALL TO authenticated
  USING (coach_id IN (SELECT id FROM coaches WHERE user_id = auth.uid()))
  WITH CHECK (coach_id IN (SELECT id FROM coaches WHERE user_id = auth.uid()));
```

#### 5-2. UI

- メモ一覧表示
- 新規メモ追加フォーム
- メモ種別フィルター（一般/面談/フォローアップ）

---

## 実装優先順位

| 順位 | Phase | 内容 | 工数 | 依存 |
|------|-------|------|------|------|
| 1 | 1-1 | ボトムナビ変更 | 0.5h | なし |
| 2 | 1-2 | ホームにクイックアクセス追加 | 1h | なし |
| 3 | 2-1 | 生徒詳細ページ（概要タブ） | 2h | なし |
| 4 | 2-1 | 生徒詳細ページ（学習タブ） | 2h | 概要タブ |
| 5 | 2-1 | 生徒詳細ページ（目標タブ） | 1h | 概要タブ |
| 6 | 2-1 | 生徒詳細ページ（応援タブ） | 1h | 概要タブ |
| 7 | 2-1 | 生徒詳細ページ（分析タブ） | 1h | 概要タブ |
| 8 | 2-3 | 生徒一覧のリンク修正 | 0.5h | 詳細ページ |
| 9 | 3-1 | 要対応リストAPI | 2h | なし |
| 10 | 3-2 | ダッシュボードUI | 1h | 要対応API |
| 11 | 4-1 | デザイントークン定義 | 1h | なし |
| 12 | 4-2 | 共通カードコンポーネント | 2h | トークン |
| 13 | 5-1 | メモ機能DBスキーマ | 1h | なし |
| 14 | 5-2 | メモ機能UI | 2h | DBスキーマ |

---

## 技術的注意事項

### ID型の統一

- **ルール**: `studentId`は**string型で統一**
- **変換タイミング**: API呼び出し直前に`String()`で変換
- **理由**: SupabaseがBIGINTを数値で返す場合があり、比較や状態管理で不一致が発生するため

```typescript
// ✅ 正しい
const studentId = String(student.id)
await getAllTestGoalsForStudent(studentId)

// ❌ 避ける
await getAllTestGoalsForStudent(student.id)  // numberの可能性
```

### N+1問題

- 生徒一覧＋詳細の同時描画は避ける
- タブごとにlazy loadでデータ取得
- 一覧は最小限のデータのみ（名前、アバター、状態フラグ）
- `.in()`を使った一括取得時もRLSは正常に機能する（Supabase標準動作）

### RLSチェック

- すべてのデータ取得はServer Action経由
- SWRのfetcherでServer Actionを呼び出す
- クライアント直接のSupabaseアクセスは禁止
- 新規テーブルは必ず`USING`と`WITH CHECK`の両方を設定

### タイムゾーン

- 日付比較は`Asia/Tokyo`基準で統一
- **サーバー側で日付文字列を生成**してクライアントに渡す
- `new Date()`のローカルタイムゾーン依存を避ける

```typescript
// Server Action内で日付をフォーマット
const formatDateJST = (date: Date | string) => {
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleDateString("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "long",
    day: "numeric"
  })
}
```

---

## 成功指標

| 指標 | 現状 | 目標 |
|------|------|------|
| 要対応生徒の発見までのタップ数 | 3-4回 | 1回（ダッシュボード表示） |
| 生徒詳細確認のページ遷移数 | 4ページ | 1ページ（タブ切替） |
| ゴールナビへのアクセス | 不可（動線なし） | 1タップ |

### 計測方法

| 指標 | 計測イベント | 担当 | 頻度 |
|------|-------------|------|------|
| タップ数 | ページ遷移ログ（Next.js Router） | 開発者 | リリース後1週間 |
| ページ遷移数 | Vercel Analytics | 開発者 | 週次 |
| ゴールナビアクセス | ボトムナビクリックイベント | 開発者 | リリース後1週間 |

**達成確認タイミング**: Phase 3完了後に計測開始、2週間後に評価レビュー

---

**作成日**: 2025-12-07
**最終更新**: 2025-12-07
**ステータス**: 計画策定完了。Phase 1から実装開始可能。

---

## 変更履歴

| 日付 | 変更内容 |
|------|---------|
| 2025-12-07 | 初版作成 |
| 2025-12-07 | レビュー反映: SSR/SWR役割分担明記、要対応リストのソート/空状態追加、RLS WITH CHECK追加、デザイントークン使用ルール追加、成功指標の計測方法追加、ID型統一ルール追加 |
