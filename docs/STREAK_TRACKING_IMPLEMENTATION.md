# 連続学習日数追跡システム実装ドキュメント

**実装日**: 2025-11-09
**バージョン**: 1.0.0
**担当**: AI開発チーム

---

## 📋 目次

1. [概要](#概要)
2. [ユーザー要求仕様](#ユーザー要求仕様)
3. [システムアーキテクチャ](#システムアーキテクチャ)
4. [データベース設計](#データベース設計)
5. [バックエンド実装](#バックエンド実装)
6. [フロントエンド実装](#フロントエンド実装)
7. [UX/UIデザイン](#uxuiデザイン)
8. [状態遷移図](#状態遷移図)
9. [テストケース](#テストケース)
10. [今後の拡張可能性](#今後の拡張可能性)

---

## 概要

### 背景

従来のシステムでは、連続学習日数（streak）が1日でも途切れると即座にリセットされていた。これにより、生徒のモチベーション低下や学習継続の心理的ハードルが高まる問題があった。

### 目的

1. **グレースピリオドの導入**: 1日の猶予期間を設け、柔軟な学習継続を支援
2. **セルフコンパッションの実現**: リセット時も前向きなフィードバックを提供
3. **健康配慮**: 時間帯別メッセージで深夜学習を抑制
4. **視覚的なモチベーション向上**: 美しいUIで達成感を演出

### 主な改善点

| Before | After |
|--------|-------|
| 1日でも記録がないと即リセット | 1日の猶予期間（グレースピリオド） |
| ヘッダーに数字だけ表示 | 専用カードで大きく美しく表示 |
| 状態説明なし | 4つの状態を視覚的に区別 |
| 健康配慮なし | 時間帯別健康配慮メッセージ |
| 最高記録の非表示 | 最高記録を常時表示して励ます |

---

## ユーザー要求仕様

### 原文引用

> **ユーザーからの要求**:
>
> 「連続学習日数について、14日連続 → 次の日に見たら0日になっているのは、学習記録を入力する前だからで、入力していないから0日になるわけではない。つまり、入力前は昨日までの連続日数を表示し、1日入力しなかった日の翌日0:00以降に0にリセットすればよい。」
>
> 「デザインは洗練されていながらも美しく、超一流のUX/UIデザイナーとして実装してほしい。」

### 解釈と設計方針

1. **グレースピリオド**: 昨日まで記録していた場合、今日は猶予期間とする
2. **2層表示**: 「昨日までの継続状態」と「今日の記録状況」を分離表示
3. **時間帯考慮**: 深夜（22時以降）は健康配慮メッセージ
4. **セルフコンパッション**: リセット時も過去の最高記録を称賛
5. **美しいデザイン**: 状態別カラーパレットとアニメーション

---

## システムアーキテクチャ

### データフロー

```
┌─────────────────┐
│  学習ログ挿入   │
│ (study_logs)    │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────┐
│ DBトリガー自動発火           │
│ update_student_streak()      │
│ - last_study_date 更新       │
│ - current_streak 計算        │
│ - max_streak 更新            │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│ getStudyStreak()             │
│ - DBから最新streak取得       │
│ - 今日の記録有無チェック     │
│ - streakState判定            │
│   (active/grace/reset)       │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│ StreakCard コンポーネント    │
│ - 状態別デザイン適用         │
│ - 時間帯別メッセージ表示     │
│ - アニメーション実行         │
└─────────────────────────────┘
```

### 技術スタック

- **データベース**: PostgreSQL (Supabase)
- **バックエンド**: Next.js Server Actions
- **フロントエンド**: React 18 + TypeScript
- **UI**: Tailwind CSS + Radix UI
- **状態管理**: React Hooks (useState)

---

## データベース設計

### テーブル拡張: `students`

**新規カラム**:

| カラム名 | 型 | デフォルト | NULL許可 | 説明 |
|---------|-----|-----------|---------|------|
| `last_study_date` | DATE | NULL | YES | 最後に学習記録を入力した日付（JST基準） |
| `current_streak` | INTEGER | 0 | NO | 現在の連続学習日数 |
| `max_streak` | INTEGER | 0 | NO | これまでの最高連続学習日数 |
| `streak_updated_at` | TIMESTAMPTZ | NOW() | YES | streak情報が最後に更新された日時 |

**インデックス**:

```sql
CREATE INDEX idx_students_last_study_date ON students(last_study_date);
CREATE INDEX idx_students_current_streak ON students(current_streak);
```

### トリガー関数: `update_student_streak()`

**目的**: 学習ログ挿入時に自動的にstreak情報を更新

**ロジック**:

```sql
IF 初回記録 THEN
  current_streak = 1
  max_streak = MAX(max_streak, 1)

ELSE IF 同じ日の記録 THEN
  変更なし

ELSE IF 連続している (yesterday or today) THEN
  current_streak = current_streak + 1
  max_streak = MAX(max_streak, current_streak)

ELSE (途切れた) THEN
  current_streak = 1
  max_streak はそのまま保持
END IF
```

**SECURITY DEFINER**: トリガーは管理者権限で実行され、RLS制約を回避

### 既存データ移行

**マイグレーションスクリプト**: `20251109000001_add_streak_tracking.sql`

全生徒の過去の学習ログから以下を計算:

1. `last_study_date`: 最新の学習日
2. `current_streak`: 今日 or 昨日から遡った連続日数
3. `max_streak`: 全期間から計算した最大連続日数

---

## バックエンド実装

### Server Action: `getStudyStreak()`

**ファイル**: `app/actions/dashboard.ts:509-581`

**処理フロー**:

```typescript
1. 現在のユーザー取得
2. students テーブルから streak 情報取得
   - last_study_date
   - current_streak
   - max_streak

3. JST 基準で今日と昨日の日付を取得

4. 今日の学習記録有無をチェック
   - study_logs テーブルから today の記録を検索

5. streakState 判定:
   IF last_study_date が NULL THEN
     state = "reset", streak = 0

   ELSE IF last_study_date == 今日 THEN
     state = "active", streak = current_streak

   ELSE IF last_study_date == 昨日 THEN
     state = "grace", streak = current_streak

   ELSE (2日以上空いた) THEN
     state = "reset", streak = 0
   END IF

6. 返却データ:
   {
     streak: number,
     maxStreak: number,
     lastStudyDate: string | null,
     todayStudied: boolean,
     streakState: "active" | "grace" | "reset"
   }
```

**エラーハンドリング**:

- 認証エラー → `{ error: "認証エラー" }`
- 生徒情報なし → `{ error: "生徒情報が見つかりません" }`
- 予期しないエラー → `{ error: "予期しないエラーが発生しました" }`

---

## フロントエンド実装

### コンポーネント構成

```
StudentDashboard (page.tsx)
  └── StudentDashboardClient (dashboard-client.tsx)
       ├── AICoachCard
       ├── TodayMissionCard
       ├── StreakCard ← ★新規コンポーネント
       ├── LearningHistoryCalendar
       ├── WeeklySubjectProgressCard
       ├── RecentEncouragementCard
       └── RecentLearningHistoryCard
```

### StreakCard コンポーネント

**ファイル**: `components/streak-card.tsx`

**Props**:

```typescript
interface StreakCardProps {
  streak: number              // 表示用連続日数
  maxStreak: number           // 最高記録
  lastStudyDate: string | null // 最終学習日
  todayStudied: boolean       // 今日記録済みか
  streakState: "active" | "grace" | "warning" | "reset"
  themeColor?: string         // ユーザーテーマカラー
}
```

**主要機能**:

1. **時間帯別メッセージ生成** (`getTimeBasedMessage`):
   - 6:00-21:59: 通常メッセージ
   - 22:00-23:59: 健康配慮（夜遅め）
   - 0:00-5:59: 強い健康配慮（深夜〜早朝）

2. **状態別スタイル設定** (`getStateStyles`):
   - カラーパレット
   - アイコン（絵文字）
   - アニメーション
   - バッジデザイン

3. **レスポンシブレイアウト**:
   - モバイル: AIコーチ → ミッション → **StreakCard** → カレンダー
   - デスクトップ: 右列（1/3幅）の最上部に配置

---

## UX/UIデザイン

### デザイン原則

1. **カラーハーモニー**: 状態ごとに統一されたトーンオントーン配色
2. **視覚的階層**: 大きな数字 → 絵文字 → 説明文の順
3. **アニメーション**: 控えめで意味のある動き
4. **アクセシビリティ**: 十分なコントラスト比とテキストシャドウ

### 状態別デザイン仕様

#### 🔥 Active状態（記録完了）

**カラーパレット**:
```css
背景グラデーション: linear-gradient(135deg,
  rgba(255, 237, 213, 0.6) 0%,
  rgba(254, 215, 170, 0.8) 100%)
ボーダー: rgba(251, 146, 60, 0.3)
メイン数字: rgb(234, 88, 12)  /* 深いオレンジ */
バッジ背景: rgba(255, 247, 237, 0.95)  /* 極薄ベージュ */
バッジテキスト: rgb(194, 65, 12)  /* 濃い赤みオレンジ */
バッジボーダー: rgba(251, 146, 60, 0.4)
```

**UI要素**:
- 絵文字: 🔥
- アニメーション: `animate-pulse`
- チェックマーク: ✅ + `animate-bounce-in`

**メッセージ例**:
- 6-21時: "今日の記録: 完了"
- 22-23時: "今日もお疲れさま！ ゆっくり休んでね"
- 0-5時: "お疲れさま！ 早く休んでね"

---

#### ⏳ Grace状態（グレースピリオド）

**カラーパレット**:
```css
背景グラデーション: linear-gradient(135deg,
  rgba(254, 249, 195, 0.6) 0%,
  rgba(253, 230, 138, 0.8) 100%)
ボーダー: rgba(252, 211, 77, 0.4)
メイン数字: rgb(217, 119, 6)  /* アンバー */
バッジ背景: rgba(254, 252, 232, 0.95)  /* 極薄イエロー */
バッジテキスト: rgb(161, 98, 7)  /* 濃いアンバー */
バッジボーダー: rgba(252, 211, 77, 0.5)
```

**UI要素**:
- 絵文字: ⏳
- アニメーション: `animate-bounce-slow` (2秒ループ)
- 砂時計アイコン: 動的パルス

**メッセージ例**:
- 6-21時: "今日の記録: 未完了 → 記録で継続！"
- 22-23時: "今日の記録: 未完了 → でも、無理しないでね"
- 0-5時: "記録は明日でも大丈夫！ まずは休もう"

**追加表示**:
```
記録すると 15日連続 に！
（黄色の点線ボーダーボックス内）
```

---

#### ✨ Reset状態（リセット、セルフコンパッション）

**カラーパレット**:
```css
背景グラデーション: linear-gradient(135deg,
  rgba(243, 232, 255, 0.6) 0%,
  rgba(233, 213, 255, 0.8) 100%)
ボーダー: rgba(196, 181, 253, 0.4)
メイン数字: rgb(147, 51, 234)  /* パープル */
バッジ背景: rgba(250, 245, 255, 0.95)  /* 極薄パープル */
バッジテキスト: rgb(107, 33, 168)  /* 濃いパープル */
バッジボーダー: rgba(196, 181, 253, 0.5)
```

**UI要素**:
- 絵文字: ✨
- アニメーション: なし（落ち着いたトーン）
- スパークルアイコン

**メッセージ例**:
- 6-21時: "新しいスタート！ 今日から記録しよう"
- 22-23時: "また明日から頑張ろう！"
- 0-5時: "今は休んで、また明日から頑張ろう"

**セルフコンパッション要素**:
```
🏆 これまでの最高記録
   14日連続
   また新しい記録を作ろう！
（パープルの点線ボーダーボックス内）
```

---

### アニメーション仕様

#### `animate-bounce-in`

```css
@keyframes bounce-in {
  0% {
    transform: scale(0);
    opacity: 0;
  }
  50% {
    transform: scale(1.2);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.animate-bounce-in {
  animation: bounce-in 0.6s ease-out;
}
```

**用途**: チェックマーク表示時のポップイン効果

---

#### `animate-bounce-slow`

```css
@keyframes bounce-slow {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-4px);
  }
}

.animate-bounce-slow {
  animation: bounce-slow 2s ease-in-out infinite;
}
```

**用途**: グレースピリオド時の砂時計アイコン

---

#### `animate-pulse`

Tailwind CSS 標準の pulse アニメーション

**用途**: Active状態の炎アイコン

---

### レスポンシブデザイン

#### モバイル（`lg:hidden`）

表示順序:
1. AIコーチメッセージ
2. 今日のミッション
3. **🔥 連続学習カード** ← ここに配置
4. 学習カレンダー
5. 週次科目別進捗
6. 直近の応援履歴
7. 直近の学習履歴

#### デスクトップ（`lg:grid lg:grid-cols-3`）

レイアウト:
```
┌────────────────────┬──────────────┐
│ 左列（2/3幅）       │ 右列（1/3幅）│
├────────────────────┼──────────────┤
│ AIコーチ            │🔥連続学習     │← ここに配置
│                    ├──────────────┤
│ 今日のミッション    │ カレンダー    │
│                    ├──────────────┤
│ 応援履歴           │ 週次進捗      │
│                    │              │
│ 学習履歴           │              │
└────────────────────┴──────────────┘
```

---

## 状態遷移図

```
┌─────────────┐
│   初回起動   │
│  streak = 0  │
│ state=reset  │
└──────┬──────┘
       │ 学習記録入力
       ▼
┌─────────────┐
│   Active    │
│ last=今日    │
│ streak=1    │
└──────┬──────┘
       │ 翌日（記録前）
       ▼
┌─────────────┐
│   Grace     │◄──┐
│ last=昨日    │   │ 記録前
│ streak=1    │   │
└──────┬──────┘   │
       │          │
       ├──────────┤
       │ 記録入力  │ 2日間記録なし
       ▼          │
┌─────────────┐   │
│   Active    │   │
│ last=今日    │   │
│ streak=2    │   │
└─────────────┘   │
                  ▼
              ┌─────────────┐
              │   Reset     │
              │ last=一昨日  │
              │ streak=0    │
              │ max保持     │
              └─────────────┘
```

### 状態遷移条件

| 現在の状態 | 条件 | 次の状態 | streak変化 |
|-----------|------|---------|-----------|
| 初回 | 学習記録入力 | Active | 0 → 1 |
| Active | 翌日（記録前） | Grace | 変化なし |
| Active | 翌日（記録済み） | Active | +1 |
| Grace | 記録入力 | Active | +1 |
| Grace | 2日間記録なし | Reset | → 0 |
| Reset | 学習記録入力 | Active | 0 → 1 |

---

## テストケース

### ユニットテスト

#### `getStudyStreak()`

| # | テストケース | 期待値 |
|---|------------|-------|
| 1 | 初回ユーザー（記録なし） | `{ streak: 0, state: "reset", todayStudied: false }` |
| 2 | 今日記録済み（1日目） | `{ streak: 1, state: "active", todayStudied: true }` |
| 3 | 昨日まで継続、今日未記録 | `{ streak: 14, state: "grace", todayStudied: false }` |
| 4 | 2日間記録なし | `{ streak: 0, state: "reset", maxStreak: 14 }` |
| 5 | 30日連続記録中 | `{ streak: 30, state: "active", maxStreak: 30 }` |

#### `getTimeBasedMessage()`

| # | 時刻 | 状態 | 期待メッセージ |
|---|-----|-----|---------------|
| 1 | 10:00 | active | "今日の記録: 完了" |
| 2 | 22:30 | active | "今日もお疲れさま！ ゆっくり休んでね" |
| 3 | 2:00 | active | "お疲れさま！ 早く休んでね" |
| 4 | 15:00 | grace | "今日の記録: 未完了 → 記録で継続！" |
| 5 | 23:00 | grace | "今日の記録: 未完了 → でも、無理しないでね" |

### 統合テスト

#### シナリオ1: 初回ユーザーの1週間

```
Day 1: 記録入力 → Active (streak=1)
Day 2: 記録入力 → Active (streak=2)
Day 3: 記録なし → Grace (streak=2, 翌日リセット猶予)
Day 4: 記録入力 → Active (streak=3)
Day 5: 記録なし → Grace (streak=3)
Day 6: 記録なし → Reset (streak=0, max=3)
Day 7: 記録入力 → Active (streak=1, max=3)
```

#### シナリオ2: 長期継続ユーザー

```
Day 1-14: 連続記録 → Active (streak=14)
Day 15: 記録なし（朝10時確認） → Grace (streak=14, "記録すると15日に！")
Day 15: 夜21時に記録 → Active (streak=15, max=15)
```

### E2Eテスト

| # | 操作 | 期待表示 |
|---|-----|---------|
| 1 | ログイン（15日連続中） | オレンジカードに "🔥 15日連続学習中" 表示 |
| 2 | 学習記録入力 → ダッシュボード遷移 | "✅ 今日の記録: 完了" 表示、パルスアニメーション |
| 3 | 翌日ログイン（記録前、10時） | イエローカードに "⏳ 15日連続学習中"、"記録すると16日に！" |
| 4 | 深夜2時にログイン（grace状態） | "記録は明日でも大丈夫！ まずは休もう" 表示 |
| 5 | 2日間記録なし → リセット | パープルカードに "✨ 新しいスタート！"、"最高15日" バッジ表示 |

---

## パフォーマンス最適化

### データベース

1. **インデックス作成**:
   - `idx_students_last_study_date`: 日付検索の高速化
   - `idx_students_current_streak`: streak順ソートの高速化

2. **トリガー効率化**:
   - SECURITY DEFINER で RLS チェック回避
   - 同日の重複記録は即座にスキップ

### フロントエンド

1. **Server-side 初期レンダリング**:
   - `page.tsx` で全データを並列取得
   - クライアントへ完全なデータを渡す

2. **コンポーネント最適化**:
   - `StreakCard` は Pure Component
   - 不要な再レンダリングを防止

3. **CSS-in-JS 最小化**:
   - inline style は動的値のみ
   - 静的スタイルは Tailwind CSS

---

## セキュリティ考慮事項

### データベース

1. **RLS (Row Level Security)**:
   - `students` テーブルは既存の RLS ポリシーを継承
   - 生徒は自分の streak のみ閲覧可能

2. **トリガー関数**:
   - SECURITY DEFINER で実行
   - SQL インジェクション対策済み

### API

1. **認証チェック**:
   - `getStudyStreak()` は `auth.uid()` で認証確認
   - 未認証ユーザーはエラー返却

2. **データ検証**:
   - streak 値は非負整数のみ
   - date 型は PostgreSQL が保証

---

## 今後の拡張可能性

### Phase 2: アチーブメントシステム

**目標**: streak マイルストーンでバッジ付与

- 7日連続: 🥉 ブロンズバッジ
- 14日連続: 🥈 シルバーバッジ
- 30日連続: 🥇 ゴールドバッジ
- 100日連続: 💎 ダイヤモンドバッジ

**実装案**:

```sql
CREATE TABLE achievements (
  id BIGSERIAL PRIMARY KEY,
  student_id BIGINT REFERENCES students(id),
  achievement_type VARCHAR(50),
  unlocked_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Phase 3: リマインダー通知

**目標**: grace 状態の生徒にプッシュ通知

- 午後6時: "今日の学習記録を忘れずに！"
- 午後9時: "あと少しで○○日連続！"

**実装案**:

- Supabase Edge Functions でスケジュール実行
- Expo Push Notifications または Web Push API

### Phase 4: 週次/月次レポート

**目標**: streak 統計をメールで配信

- 週次: 今週の連続日数、最高記録更新
- 月次: 月間達成率、他の生徒との比較

### Phase 5: ソーシャル機能

**目標**: 友達とstreak競争

- フレンド機能
- リーダーボード
- 応援メッセージ送信

---

## トラブルシューティング

### 問題1: streak がリセットされない

**症状**: 2日間記録なしでも streak=0 にならない

**原因**: `last_study_date` の更新が遅延している可能性

**解決策**:

```sql
-- 手動で streak を再計算
SELECT * FROM students WHERE id = <student_id>;
-- last_study_date を確認
-- 必要に応じて手動更新
```

### 問題2: グレースピリオドが適用されない

**症状**: 昨日記録済みなのに今日すぐリセットされる

**原因**: JST タイムゾーンのずれ

**解決策**:

```typescript
// date-jst.ts のタイムゾーン確認
const getTodayJST = () => {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
  return formatter.format(new Date())
}
```

### 問題3: UI がテーマカラーに適応しない

**症状**: StreakCard が常にデフォルトカラー

**原因**: `themeColor` プロップが未渡し

**解決策**:

```tsx
// dashboard-client.tsx で確認
<StreakCard
  ...
  themeColor={themeColor}  // ← 必須
/>
```

---

## 変更履歴

| 日付 | バージョン | 変更内容 | 担当 |
|------|----------|---------|-----|
| 2025-11-09 | 1.0.0 | 初版リリース | AI開発チーム |
| 2025-11-09 | 1.0.1 | バッジカラー調整（ハーモニー統一） | AI開発チーム |

---

## 参考資料

### 関連ドキュメント

- [03-Requirements-Student.md](./03-Requirements-Student.md) - 生徒機能要件定義
- [01-Concept.md](./01-Concept.md) - セルフコンパッションの思想

### 外部リンク

- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Radix UI Primitives](https://www.radix-ui.com/primitives)
- [PostgreSQL Trigger Functions](https://www.postgresql.org/docs/current/plpgsql-trigger.html)

---

## ライセンス

このドキュメントは StudySpark プロジェクトの一部であり、プロジェクトのライセンスに従います。

---

**Document Version**: 1.0.1
**Last Updated**: 2025-11-09
**Maintainer**: AI Development Team
