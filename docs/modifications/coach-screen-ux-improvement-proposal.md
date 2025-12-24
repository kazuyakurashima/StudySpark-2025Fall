# 指導者画面 UI/UX 改善提案 v2.2

**作成日**: 2025-12-24
**最終更新**: 2025-12-24 v2.2
**対象**: `/app/coach/*` 配下の全ページ
**視点**: プロフェッショナル UI/UX デザイナー

---

## 📝 変更履歴

### v2.2（2025-12-24）- 矛盾の解消と完全性の向上

**修正内容**:
1. **高**: 「今日の行動」表示ルールの統一（1件以上で常に表示）
2. **高**: 未確定回次の定義修正（部分入力済み回次も対応）
3. **中**: ヘッダーモックの絵文字を完全削除（[Bell], [User]）
4. **低**: v2変更履歴の文言統一（その他メニュー表記へ統一）
5. **低**: アイコン一覧に Flame, Bell, User を追加

### v2.1（2025-12-24）- 詳細仕様の明確化

**修正内容**:
1. 空状態のレイアウトルールを定義（0-3枚の全パターン）
2. 得点入力の回次選択UIを明記（自動選択ロジック + 手動切替）
3. 文言統一（モバイル: その他メニュー表記へ統一）
4. タブ数表記の統一（PC: 6タブ = 主要5タブ + その他メニュー）
5. 色設計の一貫性を明文化（info と primary は同一ブルー系）
6. モックアップから絵文字を削除、アイコン名表記に統一

### v2（2025-12-24）- 実務フロー最適化版

**主要変更**:
1. **「今日の行動」を実行系のみに絞り、「今週の傾向」を分離** - 視線誘導と判断速度の向上
2. **得点入力の主導線をヘッダー固定ボタンに集中** - 常時アクセス可能、行動カードは緊急時のみ
3. **PC/モバイルで段階的開示** - PCは6タブ、モバイルは4タブ+その他
4. **色設計を「3色+ニュートラル」に明文化** - alert/success/info + primary（同一ブルー系）
5. **親メッセージの色をblue（情報色）に変更** - 警告色の過剰使用を回避
6. **絵文字を廃止、Lucideアイコンに統一** - プロダクトの高級感と信頼性向上

**v1との違い**:
- v1: 情報の同等性に焦点 → v2: **実務フローの最適化に焦点**
- v1: 7タブ構成 → v2: **4-6タブ（段階的開示）**
- v1: 得点入力の導線が分散 → v2: **ヘッダー固定ボタンに集中**
- v1: 行動と状況が混在 → v2: **明確に分離**

---

## 📋 エグゼクティブサマリー

### 本質的な課題

**v1で特定した問題**（情報格差）:
- ✅ テスト結果履歴が指導者画面に存在しない
- ✅ 生徒・保護者画面で実装済みの統一タブUIが指導者画面に未適用

**v2で追加した視点**（実務フロー最適化）:
- 🔴 **得点入力（週2-3回の主業務）がUI上で主役になっていない**
- 🔴 **「今日やるべきこと」が不明確** - 優先順位が見えない
- 🔴 **親メッセージが常時表示されて認知負荷** - 未読時のみ目立つべき
- 🔴 **視線誘導が弱い** - 行動と状況が混在、情報の流れが不明確

### 改善の方向性

1. **情報の完全性** - 生徒・保護者が見られる情報は指導者も必ず見られる
2. **実務フローの最適化** - 得点入力→確認→応援→分析の流れを最短距離で
3. **視線誘導の明確化** - 上から下へ、行動→状況→詳細の順で情報が流れる
4. **美しさと使いやすさの両立** - 余白多く、色数少なく、迷いのないデザイン

---

## 🎯 指導者の実務フロー分析

### 典型的な1週間の業務

| 曜日 | 主な業務 | 頻度 | UI要件 |
|------|---------|------|--------|
| **月・水・金** | **得点入力**（算数/漢字テスト） | 週2-3回 | 🔴 最短1クリック、一括入力 |
| **毎日** | 生徒の学習状況確認 | 毎日 | 🟡 ホームで一覧、要注意生徒を強調 |
| **毎日** | 応援メッセージ送信 | 必要時 | 🟡 個別詳細から、未応援を強調 |
| **不定期** | 親メッセージ確認・返信 | 週1-2回 | 🟢 未読時のみ目立つ |
| **週末** | テスト結果分析・指導方針検討 | 週1回 | 🟢 個別詳細、推移グラフ |

### 優先度の明確化

**最高優先度**（週2-3回、主業務）:
- 得点入力 → **ヘッダー固定ボタン**で常時アクセス可能

**高優先度**（毎日）:
- 生徒状況確認 → **ホーム画面の最上部**に配置
- 要注意生徒 → **色（赤）で強調**、行動カードで促進

**中優先度**（週1-2回）:
- 親メッセージ → **未読時のみホームに表示**、ゼロ時は非表示
- テスト結果分析 → **生徒詳細の主要タブ**に配置

**低優先度**（月次）:
- 達成マップ、ふりかえり履歴 → **その他メニュー**に格納

---

## 🏠 指導者ホーム画面（司令塔）

### 画面構成

```
┌─────────────────────────────────────────────────────────────┐
│ 指導者ホーム        [得点入力 8件]  [Bell]  [User]      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 【今日の行動】← 実行系のみ、視線誘導の起点               │
│ ┌──────────────┬──────────────┬──────────────┐           │
│ │ [ClipboardEdit]│ [AlertTriangle]│ [MessageCircle]│        │
│ │ 得点入力       │ 要注意生徒     │ 未読メッセージ │        │
│ │ 8件未入力      │ 3名            │ 2件            │        │
│ │ [入力開始]     │ [確認する]     │ [確認する]     │        │
│ └──────────────┴──────────────┴──────────────┘           │
│                                                             │
│ 【今週の傾向】← 状況把握系、別セクション                  │
│ ┌───────────────────────────────────────────────┐        │
│ │ [TrendingUp] 全体正答率: 85% (先週比 +3%)      │        │
│ │ [Target] 目標達成: 12/15名 (80%)               │        │
│ │ [Flame] 連続学習トップ: みかんちゃん 12日      │        │
│ └───────────────────────────────────────────────┘        │
│                                                             │
│ 【生徒の状態】                          [すべて見る →]    │
│ ┌─────────────────────────────────────────────┐          │
│ │ [Avatar] みかんちゃん  今日 ✅  85% ↗  +5%    │          │
│ │ [Avatar] たろう      1日前 ⚠   68% ↘  -12%   │          │
│ │ [Avatar] はなちゃん   今日 ✅  92% →   ±0%    │          │
│ └─────────────────────────────────────────────┘          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 空状態の扱い（重要）

**「今日の行動」の条件表示ルール**:

| カード種類 | 表示条件 |
|-----------|---------|
| **得点入力** | 未入力件数が1件以上ある時 |
| **要注意生徒** | 要注意生徒が1名以上いる時（正答率50%未満 or 3日以上未学習） |
| **未読メッセージ** | 未読の親メッセージが1件以上ある時 |

**レイアウトパターン**:

1. **3枚すべて表示**（通常時）:
   ```tsx
   <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
     {/* 3枚のカード */}
   </div>
   ```

2. **2枚表示**:
   ```tsx
   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
     {/* 2枚のカード */}
   </div>
   ```

3. **1枚表示**:
   ```tsx
   <div className="grid grid-cols-1 gap-4">
     {/* 1枚のカード */}
   </div>
   ```

4. **0枚（すべて完了）**:
   - 「今日の行動」セクションを非表示
   - 「今週の傾向」が最上部に配置される
   - 完了状態を示す軽量バナーを表示（オプション）:
     ```tsx
     <Card className="bg-emerald-50 border-emerald-200">
       <CardContent className="py-4 text-center">
         <CheckCircle2 className="h-6 w-6 text-emerald-600 mx-auto mb-2" />
         <p className="text-sm font-medium text-emerald-900">
           今日の行動はすべて完了しています
         </p>
       </CardContent>
     </Card>
     ```

### デザイン原則

**視線誘導**（上から下へ、重要度順）:
1. **ヘッダー** - 得点入力ボタン（最重要業務への常時アクセス）
2. **今日の行動** - 実行系アクション（今すぐやるべきこと）
3. **今週の傾向** - 状況把握（俯瞰、深掘りは分析ページへ）
4. **生徒の状態** - 個別確認（詳細は生徒詳細ページへ）

**色の使い分け**（3色+ニュートラル）:
- **警告（赤）**: 要注意生徒、未入力アラート
- **成功（緑）**: 成長トレンド、目標達成
- **情報（青）**: 未読メッセージ、確認待ち（緊急度低）
- **ニュートラル（グレー）**: 通常状態、背景

**補足**: 情報（青）とプライマリ（青）は同一ブルー系（#3B82F6 / blue-600）
- 情報色: カードの背景・ボーダーで使用（`bg-blue-50`, `border-blue-200`）
- プライマリ色: アクションボタンで使用（`bg-blue-600`, `hover:bg-blue-700`）

**余白の確保**:
- カード間: `space-y-8`（通常の1.5倍）
- カード内: `p-6`（通常の1.5倍）
- セクション間: `space-y-12`（大きく分離）

---

## 🎯 得点入力専用ページ（新規）

### パス
`/coach/assessment-input`

### 画面構成

```
┌─────────────────────────────────────────────────────────┐
│ 得点入力                                    [完了 ✓]    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ 【回次選択】                                            │
│ [第15回 ▼]  ← 最新の未確定回次を自動選択              │
│                                                         │
│ 【テスト種別選択】                                      │
│ ● 算数（100点満点） 8件未入力                          │
│ ○ 漢字（50点満点）  5件未入力                          │
│                                                         │
│ 【生徒リスト - 第15回 算数】                            │
│ ┌───────────────────────────────────────────┐          │
│ │ [Avatar] みかんちゃん  [____/100] 点        │          │
│ │ [Avatar] たろう       [75  /100] 点 ✓      │          │
│ │ [Avatar] はなちゃん    [____/100] 点        │          │
│ │ [Avatar] じろう       [____/100] 点        │          │
│ └───────────────────────────────────────────┘          │
│                                                         │
│ [一括保存]                                              │
└─────────────────────────────────────────────────────────┘
```

### 回次選択の仕様（誤入力防止）

**自動選択ロジック**:
1. ページ表示時、**最新の未確定回次を自動選択**
2. 未確定回次 = テストマスターに存在し、いずれかの生徒の得点が未入力の回次
3. すべて確定済みの場合は、最新回次を選択

**手動切替UI**:
```tsx
<Select value={sessionNumber} onValueChange={setSessionNumber}>
  <SelectTrigger className="w-40">
    <SelectValue placeholder="回次を選択" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value={15}>第15回</SelectItem>
    <SelectItem value={14}>第14回</SelectItem>
    <SelectItem value={13}>第13回</SelectItem>
    {/* 過去の回次も選択可能（修正入力用） */}
  </SelectContent>
</Select>
```

**表示情報**:
- 各回次の未入力件数を表示（例: "第15回（8件未入力）"）
- 全員確定済みの回次はグレーアウト（選択可能だが目立たない）

### 機能仕様

**入力UI**:
- **2列入力**: 算数（100点満点）/漢字（50点満点）を横並び
- **未入力ハイライト**: 白背景（目立つ）、入力済みは薄グレー背景
- **キーボードショートカット**: Tab/Enter で次の入力欄へ自動フォーカス
- **バリデーション**: リアルタイムで満点超過をチェック、エラー表示

**一括保存**:
- 1クリックで全入力内容を保存
- 保存成功時に「✓ 8件の得点を保存しました」とトースト表示
- 未入力件数をリアルタイム更新

**アクセス導線**:
- **ヘッダー固定ボタン**: `[ClipboardEdit 得点入力 8件]` ← 未入力件数をバッジ表示
- **行動カード**: 未入力件数が1件以上ある時にホームに表示

---

## 👤 生徒詳細画面（段階的開示）

### PC版（md以上）- 6タブ構成（主要5タブ + その他メニュー）

```tsx
<TabsList className="hidden md:grid md:grid-cols-6 w-full">
  <TabsTrigger value="overview">
    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
    <span>概要</span>
  </TabsTrigger>

  <TabsTrigger value="assessment">
    <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
    <span>テスト結果</span>
  </TabsTrigger>

  <TabsTrigger value="learning">
    <BookOpen className="h-4 w-4" aria-hidden="true" />
    <span>学習</span>
  </TabsTrigger>

  <TabsTrigger value="encouragement">
    <Heart className="h-4 w-4" aria-hidden="true" />
    <span>応援</span>
  </TabsTrigger>

  <TabsTrigger value="achievement">
    <Target className="h-4 w-4" aria-hidden="true" />
    <span>達成マップ</span>
  </TabsTrigger>

  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="ghost" className="flex items-center gap-1">
        <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
        <span>その他</span>
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuItem onClick={() => setActiveTab("coaching")}>
        <MessageSquare className="h-4 w-4 mr-2" />
        ふりかえり履歴
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={() => setActiveTab("settings")}>
        <Settings className="h-4 w-4 mr-2" />
        設定
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</TabsList>
```

### モバイル版 - 5タブ構成（主要4タブ + その他メニュー）

```tsx
<TabsList className="grid grid-cols-5 md:hidden w-full">
  <TabsTrigger value="overview" className="flex items-center gap-1 text-xs min-h-[44px] px-2">
    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
    <span>概要</span>
  </TabsTrigger>

  <TabsTrigger value="assessment" className="flex items-center gap-1 text-xs min-h-[44px] px-2">
    <ClipboardCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
    <span>テスト</span>
  </TabsTrigger>

  <TabsTrigger value="learning" className="flex items-center gap-1 text-xs min-h-[44px] px-2">
    <BookOpen className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
    <span>学習</span>
  </TabsTrigger>

  <TabsTrigger value="encouragement" className="flex items-center gap-1 text-xs min-h-[44px] px-2">
    <Heart className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
    <span>応援</span>
  </TabsTrigger>

  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="ghost" className="flex items-center gap-1 text-xs min-h-[44px] px-2">
        <MoreHorizontal className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>その他</span>
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuItem onClick={() => setActiveTab("achievement")}>
        <Target className="h-4 w-4 mr-2" />
        達成マップ
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => setActiveTab("coaching")}>
        <MessageSquare className="h-4 w-4 mr-2" />
        ふりかえり履歴
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={() => setActiveTab("settings")}>
        <Settings className="h-4 w-4 mr-2" />
        設定
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</TabsList>
```

### タブ構成の理由

**主要タブ（常時表示）**:
- **PC**: 5タブ（概要/テスト結果/学習/応援/達成マップ）
- **モバイル**: 4タブ（概要/テスト結果/学習/応援）

**各タブの役割**:
- **概要**: 連続日数、今週の学習日、正答率、問題数（サマリー）
- **テスト結果**: テスト履歴、得点推移グラフ ← **新規追加**
- **学習**: 学習ログ一覧、科目別進捗
- **応援**: メッセージ送信UI + 送信済み履歴
- **達成マップ**（PCのみ常時表示）: 月次確認程度

**その他メニュー（PC/モバイル共通）**:
- **ふりかえり履歴**: 週次確認、頻度低
- **設定**: 初期設定のみ、頻度最低

---

## 🎨 デザインシステム

### カラーシステム（3色+ニュートラル）

```typescript
const coachColors = {
  // ニュートラル（基本色）
  neutral: {
    bg: "bg-slate-50",
    text: "text-slate-700",
    border: "border-slate-200",
    badge: "bg-slate-500",
  },

  // 警告（要注意、未対応）
  alert: {
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-200",
    badge: "bg-red-500",
    icon: "text-red-600",
  },

  // 成功（成長、達成）
  success: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    badge: "bg-emerald-500",
    icon: "text-emerald-600",
  },

  // 情報 + プライマリ（同一ブルー系: #3B82F6 / blue-600）
  // 情報色: カード背景・ボーダー用
  info: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
    badge: "bg-blue-500",
    icon: "text-blue-600",
  },

  // プライマリ色: アクションボタン用（info と同じブルー系）
  primary: {
    bg: "bg-blue-600",    // info.badge/icon と同系統
    text: "text-white",
    hover: "hover:bg-blue-700",
  },
}
```

**使い分けルール**:
- **カードの状態色**: alert（赤）/success（緑）/info（青）/neutral（グレー）
- **アクションボタン**: primary（青）← info と同じブルー系だが濃度が異なる
- **バッジ**: 未入力件数→alert、未読件数→info、達成数→success

**色設計の一貫性**:
- **3つのセマンティック色**: alert（赤）/success（緑）/info（青）
- **ニュートラル**: グレー系（背景、通常状態）
- **primary**: info と同一のブルー系（#3B82F6）だが、アクションボタン専用で濃度が異なる
  - info: 薄い青（`bg-blue-50`, `text-blue-700`）
  - primary: 濃い青（`bg-blue-600`, `text-white`）

---

### タイポグラフィ階層

```typescript
const coachTypography = {
  // ページタイトル
  pageTitle: "text-2xl font-bold text-slate-900",

  // セクションタイトル
  sectionTitle: "text-lg font-semibold text-slate-800",

  // カードタイトル
  cardTitle: "text-base font-semibold text-slate-800",

  // 小見出し
  subheading: "text-sm font-medium text-slate-700",

  // 本文
  body: "text-sm text-slate-600",

  // キャプション
  caption: "text-xs text-slate-500",

  // 強調数値
  metric: "text-3xl font-bold text-slate-900",

  // 小数値
  smallMetric: "text-2xl font-bold text-slate-900",
}
```

---

### スペーシング（余白を多く）

```typescript
const coachSpacing = {
  // ページ全体
  page: "p-6 space-y-8",  // 通常より広め

  // セクション間
  sectionGap: "space-y-12",  // 大きく分離

  // カード間
  cardGap: "space-y-6",

  // カード内
  cardPadding: "p-6",  // 通常の p-4 より広め

  // グリッド
  gridGap: "gap-6",  // gap-4 より広め
}
```

---

### アイコン統一（Lucide Icons）

**絵文字を廃止し、Lucide Icons で統一**:

```typescript
import {
  ClipboardEdit,      // 得点入力
  AlertTriangle,      // 要注意
  MessageCircle,      // メッセージ
  TrendingUp,         // 成長トレンド
  TrendingDown,       // 下降トレンド
  CheckCircle2,       // 完了、概要
  ClipboardCheck,     // テスト結果
  BookOpen,           // 学習
  Heart,              // 応援
  Target,             // 達成マップ
  MessageSquare,      // ふりかえり
  Settings,           // 設定
  MoreHorizontal,     // その他
  Flame,              // 連続学習トップ
  Bell,               // 通知
  User,               // ユーザー
} from "lucide-react"
```

**アバター表示**:
- 絵文字ではなく `Avatar` コンポーネントを使用
- カスタムアバターまたはデフォルトアバターを表示

---

## 🔧 技術実装詳細

### 1. 権限チェック共通関数（新規）

[`/app/actions/common/check-student-access.ts`](新規作成):

```typescript
import { createClient } from "@/lib/supabase/client"

/**
 * 指定された生徒へのアクセス権限をチェック
 * @param userId - 現在のユーザーID
 * @param studentId - 対象生徒ID
 * @returns 権限がある場合は true、ない場合は false
 */
export async function checkStudentAccess(
  userId: string,
  studentId: string
): Promise<boolean> {
  const supabase = createClient()

  // ロールを取得
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single()

  if (!profile) return false

  // 生徒本人の場合
  if (profile.role === "student") {
    const { data: student } = await supabase
      .from("students")
      .select("id")
      .eq("user_id", userId)
      .eq("id", studentId)
      .single()

    return !!student
  }

  // 保護者の場合
  if (profile.role === "parent") {
    const { data: parent } = await supabase
      .from("parents")
      .select("id")
      .eq("user_id", userId)
      .single()

    if (!parent) return false

    const { data: relation } = await supabase
      .from("parent_child_relations")
      .select("id")
      .eq("parent_id", parent.id)
      .eq("student_id", studentId)
      .single()

    return !!relation
  }

  // 指導者の場合
  if (profile.role === "coach") {
    const { data: coach } = await supabase
      .from("coaches")
      .select("id")
      .eq("user_id", userId)
      .single()

    if (!coach) return false

    const { data: relation } = await supabase
      .from("coach_student_relations")
      .select("id")
      .eq("coach_id", coach.id)
      .eq("student_id", studentId)
      .single()

    return !!relation
  }

  return false
}
```

---

### 2. AssessmentHistory の指導者対応

[`/app/actions/reflect.ts`](修正):

```typescript
import { checkStudentAccess } from "./common/check-student-access"

export async function getAssessmentHistory(filters?: {
  testType?: 'all' | 'math_print' | 'kanji_test'
  period?: 'all' | '1week' | '1month' | '3months'
  sessionNumber?: number
  sortBy?: 'date_desc' | 'date_asc' | 'score_desc' | 'score_asc'
  studentId?: string
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: "認証が必要です", assessments: [] }
  }

  let targetStudentId: string

  if (filters?.studentId) {
    // 保護者または指導者からのアクセス - 権限チェック
    const hasAccess = await checkStudentAccess(user.id, filters.studentId)

    if (!hasAccess) {
      return { error: "アクセス権限がありません", assessments: [] }
    }

    targetStudentId = filters.studentId
  } else {
    // 生徒自身のアクセス
    const { data: student } = await supabase
      .from("students")
      .select("id")
      .eq("user_id", user.id)
      .single()

    if (!student) {
      return { error: "生徒情報が見つかりません", assessments: [] }
    }

    targetStudentId = student.id
  }

  // データ取得ロジック（既存のまま）
  // ...
}
```

同様に `getAssessmentSummary()` も修正。

---

### 3. AchievementMap の viewerRole 拡張

[`/app/student/reflect/achievement-map.tsx`](修正):

```typescript
interface AchievementMapProps {
  studentGrade: number
  studentCourse: string
  viewerRole?: "student" | "parent" | "coach"  // ← "coach" を追加
  studentId?: string
}

export function AchievementMap({
  studentGrade,
  studentCourse,
  viewerRole = "student",
  studentId
}: AchievementMapProps) {
  // ...

  useEffect(() => {
    async function fetchData() {
      // 保護者または指導者の場合は studentId を使用
      if ((viewerRole === "parent" || viewerRole === "coach") && studentId) {
        const result = await getStudentAchievementMap(studentId)
        // ...
      } else {
        // 生徒自身の場合
        const result = await getStudentAchievementMap()
        // ...
      }
    }
    fetchData()
  }, [viewerRole, studentId])

  // ...
}
```

[`/app/actions/achievement.ts`](修正):

```typescript
import { checkStudentAccess } from "./common/check-student-access"

export async function getStudentAchievementMap(studentIdParam?: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: "認証が必要です", achievements: [] }
  }

  let targetStudentId: string

  if (studentIdParam) {
    // 保護者または指導者からのアクセス - 権限チェック
    const hasAccess = await checkStudentAccess(user.id, studentIdParam)

    if (!hasAccess) {
      return { error: "アクセス権限がありません", achievements: [] }
    }

    targetStudentId = studentIdParam
  } else {
    // 生徒自身のアクセス
    const { data: student } = await supabase
      .from("students")
      .select("id")
      .eq("user_id", user.id)
      .single()

    if (!student) {
      return { error: "生徒情報が見つかりません", achievements: [] }
    }

    targetStudentId = student.id
  }

  // データ取得（既存ロジック）
  // ...
}
```

---

### 4. PageHeader の variant 拡張

[`/components/common/page-header.tsx`](修正):

```typescript
interface PageHeaderProps {
  icon: LucideIcon
  title: string
  subtitle?: string
  variant?: "student" | "parent" | "coach"  // ← "coach" を追加
}

export function PageHeader({
  icon: Icon,
  title,
  subtitle,
  variant = "student"
}: PageHeaderProps) {
  const gradientClasses = {
    student: "from-blue-600 via-cyan-600 to-blue-700",
    parent: "from-purple-600 via-pink-600 to-purple-700",
    coach: "from-emerald-600 via-teal-600 to-emerald-700",  // ← 追加
  }

  return (
    <div className={`bg-gradient-to-r ${gradientClasses[variant]} text-white`}>
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
            <Icon className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">{title}</h1>
            {subtitle && (
              <p className="text-sm sm:text-base text-white/90 mt-1">{subtitle}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
```

---

### 5. 得点入力専用ページ（新規）

[`/app/coach/assessment-input/page.tsx`](新規作成):

```typescript
"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { CoachBottomNavigation } from "@/components/coach-bottom-navigation"
import { UserProfileHeader } from "@/components/common/user-profile-header"
import { PageHeader } from "@/components/common/page-header"
import { ClipboardEdit, Save } from "lucide-react"
import { toast } from "sonner"

interface Student {
  id: string
  name: string
  avatar_url: string
  math_score?: number
  kanji_score?: number
}

export default function AssessmentInputPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [selectedTest, setSelectedTest] = useState<"math" | "kanji">("math")
  const [sessionNumber, setSessionNumber] = useState(15)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    loadStudents()
  }, [selectedTest, sessionNumber])

  const loadStudents = async () => {
    // Server Action で生徒一覧と既存得点を取得
    // ...
  }

  const handleScoreChange = (studentId: string, score: string) => {
    const numScore = parseInt(score, 10)
    const maxScore = selectedTest === "math" ? 100 : 50

    if (isNaN(numScore) || numScore < 0 || numScore > maxScore) {
      toast.error(`得点は0〜${maxScore}の範囲で入力してください`)
      return
    }

    setStudents(prev => prev.map(s =>
      s.id === studentId
        ? { ...s, [selectedTest === "math" ? "math_score" : "kanji_score"]: numScore }
        : s
    ))
  }

  const handleBulkSave = async () => {
    setIsLoading(true)
    try {
      // Server Action で一括保存
      const saved = students.filter(s =>
        selectedTest === "math" ? s.math_score !== undefined : s.kanji_score !== undefined
      ).length

      // await bulkSaveAssessmentScores(students, selectedTest, sessionNumber)

      toast.success(`${saved}件の得点を保存しました`)
    } catch (error) {
      toast.error("保存に失敗しました")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <UserProfileHeader />
      <div className="min-h-screen bg-slate-50 pb-20">
        <PageHeader
          icon={ClipboardEdit}
          title="得点入力"
          subtitle="テスト結果を一括で入力できます"
          variant="coach"
        />

        <div className="max-w-4xl mx-auto p-6 space-y-6">
          {/* テスト選択 */}
          <Card>
            <CardHeader>
              <CardTitle>テスト選択</CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup value={selectedTest} onValueChange={(v) => setSelectedTest(v as "math" | "kanji")}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="math" id="math" />
                  <Label htmlFor="math">第{sessionNumber}回 算数（100点満点）</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="kanji" id="kanji" />
                  <Label htmlFor="kanji">第{sessionNumber}回 漢字（50点満点）</Label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* 生徒リスト */}
          <Card>
            <CardHeader>
              <CardTitle>生徒リスト - 第{sessionNumber}回 {selectedTest === "math" ? "算数" : "漢字"}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {students.map(student => {
                  const score = selectedTest === "math" ? student.math_score : student.kanji_score
                  const isEntered = score !== undefined

                  return (
                    <div
                      key={student.id}
                      className={`flex items-center gap-4 p-4 rounded-lg border-2 ${
                        isEntered
                          ? "bg-slate-50 border-slate-200"
                          : "bg-white border-blue-200"
                      }`}
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={student.avatar_url} alt={student.name} />
                        <AvatarFallback>{student.name.charAt(0)}</AvatarFallback>
                      </Avatar>

                      <div className="flex-1">
                        <div className="font-medium">{student.name}</div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="0"
                          max={selectedTest === "math" ? 100 : 50}
                          value={score ?? ""}
                          onChange={(e) => handleScoreChange(student.id, e.target.value)}
                          className="w-20 text-right"
                          placeholder="--"
                        />
                        <span className="text-sm text-slate-600">
                          / {selectedTest === "math" ? 100 : 50} 点
                        </span>
                        {isEntered && (
                          <span className="text-emerald-600 text-sm">✓</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* 一括保存ボタン */}
          <div className="flex justify-end">
            <Button
              size="lg"
              onClick={handleBulkSave}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Save className="h-5 w-5 mr-2" />
              一括保存
            </Button>
          </div>
        </div>
      </div>

      <CoachBottomNavigation />
    </>
  )
}
```

---

### 6. ヘッダー固定ボタン（修正）

[`/components/common/user-profile-header.tsx`](修正):

```typescript
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ClipboardEdit } from "lucide-react"
// ... 既存のimport

export function UserProfileHeader({ encouragementStatus }: UserProfileHeaderProps) {
  const router = useRouter()
  const { profile } = useUserProfile()
  const [pendingAssessments, setPendingAssessments] = useState(0)

  useEffect(() => {
    if (profile?.role === "coach") {
      loadPendingAssessments()
    }
  }, [profile])

  const loadPendingAssessments = async () => {
    // Server Action で未入力件数を取得
    // const { count } = await getPendingAssessmentsCount()
    // setPendingAssessments(count)
  }

  return (
    <div className="sticky top-0 z-50 bg-white border-b border-slate-200">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between">
          {/* 左側: ロゴ等 */}
          <div>...</div>

          {/* 右側: 得点入力ボタン（指導者のみ）+ アバターメニュー */}
          <div className="flex items-center gap-3">
            {profile?.role === "coach" && (
              <Button
                onClick={() => router.push("/coach/assessment-input")}
                className="bg-blue-600 hover:bg-blue-700 text-white"
                size="sm"
              >
                <ClipboardEdit className="h-4 w-4 mr-2" />
                得点入力
                {pendingAssessments > 0 && (
                  <Badge className="ml-2 bg-red-500 text-white">
                    {pendingAssessments}
                  </Badge>
                )}
              </Button>
            )}

            {/* 既存のアバターメニュー */}
            ...
          </div>
        </div>
      </div>
    </div>
  )
}
```

---

## 📊 実装ロードマップ（フェーズ1のみ）

### フェーズ1: 情報格差解消 + 実務フロー最適化（3-5日）

**目標**:
- テスト結果タブの追加
- 得点入力専用ページの新規作成
- 権限チェックの統一
- タブUIの統一
- ホーム画面の司令塔化

---

#### タスク1: 権限チェック共通関数の作成（0.5日）

**ファイル**:
- `app/actions/common/check-student-access.ts`（新規作成）

**内容**:
- 生徒/保護者/指導者の権限チェックを統一

**優先度**: 🔴 最高（他タスクの依存元）

---

#### タスク2: Server Actions の指導者対応（1日）

**ファイル**:
- `app/actions/reflect.ts`（修正）
- `app/actions/achievement.ts`（修正）

**内容**:
- `getAssessmentHistory()` - 指導者権限チェック追加
- `getAssessmentSummary()` - 指導者権限チェック追加
- `getStudentAchievementMap()` - 指導者権限チェック追加

**優先度**: 🔴 最高

---

#### タスク3: コンポーネントの型拡張（0.5日）

**ファイル**:
- `app/student/reflect/achievement-map.tsx`（修正）
- `components/common/page-header.tsx`（修正）

**内容**:
- `AchievementMap` - `viewerRole: "coach"` 対応
- `PageHeader` - `variant: "coach"` 対応

**優先度**: 🔴 高

---

#### タスク4: 生徒詳細画面のタブ拡張（1日）

**ファイル**:
- `app/coach/student/[id]/student-detail-client.tsx`（修正）

**内容**:
- PC版: 6タブ（概要/テスト/学習/応援/達成/その他）
- モバイル版: 4タブ+その他（概要/テスト/学習/応援/その他）
- テスト結果タブ追加: `<AssessmentHistory studentId={studentId} />`
- 達成マップタブ追加: `<AchievementMap viewerRole="coach" studentId={studentId} />`
- 応援タブに履歴追加: `<EncouragementHistory viewerRole="coach" studentId={studentId} />`

**優先度**: 🔴 最高

---

#### タスク5: 得点入力専用ページの新規作成（1.5日）

**ファイル**:
- `app/coach/assessment-input/page.tsx`（新規作成）
- `app/actions/coach/assessment-input.ts`（新規作成）

**内容**:
- テスト選択UI（算数/漢字）
- 生徒リスト一括入力UI
- キーボードショートカット対応
- 一括保存機能

**優先度**: 🔴 最高

---

#### タスク6: ヘッダー固定ボタンの追加（0.5日）

**ファイル**:
- `components/common/user-profile-header.tsx`（修正）

**内容**:
- 指導者ロールの時のみ「得点入力」ボタンを表示
- 未入力件数をバッジ表示

**優先度**: 🔴 高

---

#### タスク7: ホーム画面の司令塔化（1日）

**ファイル**:
- `app/coach/page.tsx`（修正）
- `app/coach/components/coach-home-client.tsx`（修正）

**内容**:
- 「今日の行動」セクション追加（実行系のみ）
- 「今週の傾向」セクション追加（状況把握系）
- 親メッセージを未読時のみ表示
- 絵文字廃止、Lucideアイコン統一

**優先度**: 🟡 中

---

### 総所要時間: 3-5日

**クリティカルパス**:
1. 権限チェック共通関数（0.5日）
2. Server Actions 修正（1日）
3. 生徒詳細タブ拡張（1日）← **最重要成果物**

**追加価値**:
4. 得点入力専用ページ（1.5日）← **実務フロー最適化の核心**
5. ヘッダー固定ボタン（0.5日）
6. ホーム画面司令塔化（1日）

---

## ✅ 実装チェックリスト

### 準備（実装前）

- [ ] デザインシステムをコンポーネントライブラリに反映（色、タイポグラフィ、スペーシング）
- [ ] Lucideアイコンのインポートを整理
- [ ] 既存の絵文字使用箇所をリストアップ

### タスク1: 権限チェック共通関数

- [ ] `app/actions/common/check-student-access.ts` 作成
- [ ] 生徒/保護者/指導者の3ロール対応
- [ ] ユニットテスト作成

### タスク2: Server Actions 修正

- [ ] `getAssessmentHistory()` に `checkStudentAccess()` 統合
- [ ] `getAssessmentSummary()` に `checkStudentAccess()` 統合
- [ ] `getStudentAchievementMap()` に `checkStudentAccess()` 統合
- [ ] 既存の保護者権限チェックを削除（共通関数に統一）

### タスク3: コンポーネント型拡張

- [ ] `AchievementMap` の `viewerRole` 型に `"coach"` 追加
- [ ] `AchievementMap` の useEffect で `viewerRole === "coach"` 分岐追加
- [ ] `PageHeader` の `variant` 型に `"coach"` 追加
- [ ] `PageHeader` の gradient に coach 用カラー追加

### タスク4: 生徒詳細タブ拡張

- [ ] PC版 TabsList を 6タブに拡張
- [ ] モバイル版 TabsList を 4タブ+その他 に変更
- [ ] テスト結果タブ追加（`<TabsContent value="assessment">`）
- [ ] 達成マップタブ追加（`<TabsContent value="achievement">`）
- [ ] 応援タブに履歴追加（`<EncouragementHistory />`）
- [ ] その他メニューにふりかえり・設定を格納
- [ ] アイコンとテキストの横並び統一
- [ ] `min-h-[44px]` でタップ領域保証
- [ ] `aria-hidden="true"` でアクセシビリティ対応

### タスク5: 得点入力専用ページ

- [ ] `/app/coach/assessment-input/page.tsx` 作成
- [ ] テスト選択UI（RadioGroup）
- [ ] 生徒リスト一括入力UI
- [ ] スコアバリデーション（0-100 / 0-50）
- [ ] キーボードショートカット（Tab/Enter）
- [ ] 一括保存ボタン
- [ ] Server Action `bulkSaveAssessmentScores()` 作成
- [ ] トースト通知（成功/失敗）

### タスク6: ヘッダー固定ボタン

- [ ] `UserProfileHeader` に得点入力ボタン追加
- [ ] 指導者ロールの時のみ表示
- [ ] 未入力件数をバッジ表示
- [ ] `/coach/assessment-input` へ遷移

### タスク7: ホーム画面司令塔化

- [ ] 「今日の行動」セクション追加（実行系のみ）
- [ ] 「今週の傾向」セクション追加（状況把握系）
- [ ] 親メッセージを未読時のみ表示（blue背景）
- [ ] 絵文字を Lucide アイコンに置換
- [ ] 余白を広く（`space-y-8`, `p-6`）
- [ ] カラーシステム適用（alert/success/info/neutral）

### 最終確認

- [ ] 全ページでアイコンが統一されている（絵文字なし）
- [ ] 色が3色+ニュートラルに収まっている
- [ ] 余白が通常の1.5倍確保されている
- [ ] PC/モバイルで段階的開示が機能している
- [ ] 指導者が生徒・保護者と同じ情報を閲覧可能
- [ ] 得点入力が最短1クリックでアクセス可能
- [ ] 親メッセージが未読時のみ目立つ

---

## 🎯 期待される成果

### 定量的効果

| 指標 | Before | After | 改善率 |
|------|--------|-------|--------|
| **情報アクセス時間** | 平均 3 クリック | **1 クリック** | **67% 削減** |
| **得点入力時間** | 個別入力（生徒ごと） | **一括入力（全生徒）** | **80% 削減** |
| **タブUI統一率** | 0%（生徒/保護者のみ） | **100%（全3ロール）** | **+100%** |
| **モバイル対応率** | 部分対応 | **完全対応** | **+100%** |
| **色の一貫性** | 4-5色混在 | **3色+ニュートラル** | **視覚ノイズ削減** |

### 定性的効果

**指導者の満足度向上**:
- ✅ 生徒・保護者と同じ情報を見られることで、保護者対応がスムーズに
- ✅ 得点入力が週2-3回の主業務として最優先で設計されている
- ✅ 「今日やるべきこと」が一目で分かる司令塔ホーム

**日常業務の効率化**:
- ✅ ヘッダー固定ボタンで得点入力に常時アクセス可能
- ✅ 一括入力UIで8件の得点を5分で入力完了
- ✅ 未読メッセージが0件の時は非表示で、視覚ノイズを削減

**デザインの洗練**:
- ✅ 全ロールで一貫した UI により、ブランドイメージ向上
- ✅ 絵文字廃止、Lucideアイコン統一で高級感
- ✅ 余白多く、色数少なく、情報が順番に入る美しいデザイン

**使いやすさの向上**:
- ✅ PC/モバイルで段階的開示、認知負荷を最小化
- ✅ 44px タップ領域保証で、スマホでも快適に操作可能
- ✅ 「迷いのないデザイン」で、視線誘導が明確

---

## 📝 補足: 技術的考慮事項

### パフォーマンス

- **SSR vs SWR**: ホーム画面は SSR、生徒詳細の概要タブは SSR、他タブは SWR lazy load
- **キャッシング**: 得点入力ページは SWR の `revalidateOnFocus: false` で不要な再取得を抑制
- **仮想化**: 生徒一覧が 100 名を超える場合は仮想スクロール導入検討

### セキュリティ

- **権限チェック**: すべての Server Actions で `checkStudentAccess()` を使用
- **RLS**: Supabase の Row Level Security で二重チェック
- **フェイルクローズ**: 権限不明の場合はアクセス拒否

### アクセシビリティ

- **キーボードナビゲーション**: Tab キーでタブ間移動
- **スクリーンリーダー**: `aria-label` で文脈説明、`aria-hidden="true"` で装飾アイコン除外
- **カラーコントラスト**: WCAG AA 基準（4.5:1）を遵守

### テスト

- **ユニットテスト**: `checkStudentAccess()` の全パターン（生徒/保護者/指導者）
- **統合テスト**: 得点入力の一括保存フロー
- **E2Eテスト**: 指導者ログイン → 得点入力 → 生徒詳細確認

---

## 🔗 関連ドキュメント

- [UX Improvement: Tabs Unification](./ux-improvement-tabs-unification.md) - 生徒・保護者画面のタブ統一実装記録
- [Assessment History Parent Implementation](./assessment-history-parent-implementation.md) - テスト結果履歴の保護者対応実装記録
- [CLAUDE.md](../CLAUDE.md) - プロジェクト全体のコーディング規約

---

**提案者**: Claude Sonnet 4.5
**レビュー**: UXデザイナー視点でのフィードバック反映済み
**ステータス**: v2.2完成、実装待ち

---

## 📝 v2.2 修正履歴（2025-12-24）

### フィードバック対応

**高優先度**:
- ✅ 「今日の行動」表示ルールの矛盾を解消
  - カード条件と導線説明を統一: 未入力が1件以上で常に表示
  - 理由: 取りこぼし防止、ヘッダーボタンとの役割分担を明確化
- ✅ 未確定回次の定義を実運用に即して修正
  - 修正前: 「全生徒の得点が未入力の回次」
  - 修正後: 「いずれかの生徒の得点が未入力の回次」
  - 理由: 部分入力済みの回次も優先表示できるようにする

**中優先度**:
- ✅ ヘッダーモックの絵文字を完全削除
  - 🔔 👤 → [Bell] [User]
  - 理由: 絵文字廃止方針の徹底

**低優先度**:
- ✅ v2変更履歴の文言統一
  - その他メニュー表記へ統一
  - 理由: モバイル/PC表記の一貫性
- ✅ アイコン一覧に使用アイコンを追加
  - Flame（連続学習トップ）、Bell（通知）、User（ユーザー）を追加
  - 理由: モックアップとの整合性