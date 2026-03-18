# 演習問題集 指導者・保護者向け閲覧機能 実装計画書

## 1. 概要

### 1.1 目的
演習問題集の採点結果・振り返り・AIフィードバックを、指導者・保護者が閲覧できるようにする。
マスタープリント指導者ビュー（`math-master`）の設計パターンを流用し、効率的に実装する。

### 1.2 背景
- 現状、演習問題集の**問題別正誤・振り返り内容・AIフィードバック**は生徒本人のみが閲覧可能
- 指導者は到達マップで正答率概要は見えるが、問題単位の正誤や振り返り内容が確認できない
- 保護者は到達マップの演習タブで正答率概要は見えるが、セクション別詳細・振り返り・AIフィードバックが確認できない

### 1.3 ゴール
- 指導者: 「誰がどの問題を間違えたか」を一問一問把握でき、全体平均で傾向を掴める
- 保護者: 子どもの演習成績・振り返り・AIフィードバックをセクション単位で確認できる

---

## 2. 仕様

### 2.1 平均指標の定義

コースによって対象問題数（max_score）が異なるため、**正答率（%）ベースの平均**を主指標とする。

| 指標 | 定義 | 用途 |
|------|------|------|
| 生徒別正答率 | `correct / total × 100`（コース対象問題数ベース） | 個人進捗 |
| 全体平均正答率 | **同学年全生徒**の正答率の算術平均 | 一覧・グラフ |
| セクション別正答率 | セクション内の `correct / total × 100` | 弱点分析 |

**avg_rate 分母仕様**: 未提出（graded セッションなし）の生徒は平均から**除外**する。0%として含めると実態より低く歪むため、提出済み生徒のみで算術平均を取る。一覧の「提出人数 / 全生徒数」で未提出者数は別途把握可能。

生点（スコア）は参考値として表示するが、比較・グラフの主軸は正答率。
「クラス平均」の母集団は**同学年全体**とする。

### 2.2 ロール別表示粒度

| 表示要素 | 指導者 | 保護者 |
|---------|:------:|:------:|
| 生徒×問題 正誤マトリクス | ○ | × |
| 設問別正解率（クラス全体） | ○ | × |
| セクション別正答率 | ○ | ○ |
| 全体正答率・スコア | ○ | ○ |
| 振り返りテキスト | ○ | ○ |
| AIフィードバック | ○ | ○ |
| クラス平均との比較 | ○ | ○（自分の子のみ） |

### 2.3 指導者画面の構成

**配置先**: 生徒詳細ページの「ふりかえり履歴」タブ（現在未実装）を「演習・ふりかえり」タブとしてリニューアル

#### タブ内の構成

```
[演習・ふりかえり]タブ
├── セッション選択（第1回〜第N回）
├── サマリーカード
│   ├── 正答率（%）
│   ├── スコア（参考値）
│   └── セクション別正答率バー
├── 正誤マトリクス（問題別 ○/×）
│   ├── セクション区切りヘッダ（ステップ①②③）
│   └── 設問別正解率フッター
├── 振り返り・AIフィードバック
│   ├── セクション別の振り返りテキスト
│   └── AIコーチフィードバック
└── （将来）セッション間比較グラフ
```

#### 一覧ビュー（`math-master` 相当）

**配置先**: 指導者メニューに「演習問題集」ページを新設（`/coach/exercise-master`）

```
[演習問題集]ページ
├── 学年タブ（小5 / 小6）
├── セッション一覧
│   ├── セッション名
│   ├── 提出人数 / 全生徒数
│   ├── 平均正答率
│   └── 詳細ボタン → 正誤マトリクス展開
└── 正誤マトリクス（展開時）
    ├── 行: 生徒名
    ├── 列: 問題番号（セクション区切り）
    ├── セル: ○/× （色付き）
    ├── フッター: 設問別正解率
    └── 全体平均正答率
```

### 2.4 保護者画面の構成

**配置先**: 既存の `app/parent/reflect/page.tsx` の演習タブを拡張

```
[演習タブ]（既存の到達マップを拡張）
├── セッション選択（第1回〜第N回）
├── サマリー
│   ├── 正答率（%）+ クラス平均（同学年全体）との比較
│   └── セクション別正答率バー
├── 振り返り・AIフィードバック（セクション別）
└── （将来）推移グラフ
```

---

## 3. 技術設計

### 3.1 DB変更

**新規テーブル: なし**（既存テーブルで対応可能）

**RLSポリシー: 追加不要**
`exercise_reflections` / `exercise_feedbacks` には既にcoach/parentのSELECTポリシーが設定済み:
- `20260316000002_create_exercise_reflections.sql` (line 45)
- `20260316000003_create_exercise_feedbacks.sql` (line 43)

### 3.2 RPC（DB関数）

**新規RPC 2件**（マスタープリントの `get_math_master_summary` / `get_math_master_detail` と同構造）

**重要**: RPC引数に `p_coach_id` は渡さない。既存 `math-master` 同様に `auth.uid()` から内部解決する（なりすまし防止）。
参考: `20260216000001_math_master_coach_view.sql` (line 138)

#### `get_exercise_master_summary(p_grade)`

```sql
-- 認証: auth.uid() → coaches.id で内部解決
-- 返り値:
-- sessions[]: {
--   session_number, title, question_set_id,
--   total_questions,
--   submitted_count,    -- graded セッション数
--   total_students,     -- 同学年全生徒数
--   avg_rate,           -- 同学年全体の平均正答率
-- }
```

#### `get_exercise_master_detail(p_question_set_id)`

```sql
-- 認証: auth.uid() → coaches.id で内部解決
-- 返り値:
-- question_set: { id, title, grade, session_number }
-- questions[]: { id, question_number, section_name, min_course, display_order }
-- students[]: {
--   student_id, full_name, login_id, course_level,
--   total_score, max_score, accuracy_rate,
--   results: { [question_id]: true|false|null }
-- }
-- question_stats[]: { question_id, correct_count, answered_count, rate }
-- section_stats[]: { section_name, avg_rate, question_count }
```

### 3.3 Server Action

#### 新規Action

```typescript
// 指導者向け: 演習問題集サマリー
// createAdminClient() 使用（RLSバイパス）、auth.uid() で認可
export async function getExerciseMasterSummary(grade?: number)

// 指導者向け: 演習問題集詳細（正誤マトリクス）
// createAdminClient() 使用（RLSバイパス）、auth.uid() で認可
export async function getExerciseMasterDetail(questionSetId: number)

// 指導者・保護者向け: 生徒の演習振り返り+フィードバック閲覧
// createAdminClient() 使用、checkStudentAccess() で認可
export async function getStudentExerciseReflections(
  studentId: number,
  questionSetId: number
)
```

**注意**: 既存の `getExerciseReflections()` は `createAdminClient()`（service role）を使用しており、
RLSはバイパスされる。そのため新規Actionも同パターンで、アプリ層で `checkStudentAccess()` による認可チェックを行う。
参考: `exercise-reflection.ts` (line 141), `server.ts` (line 44)

#### 既存Action活用

```typescript
// exercise-reflection.ts の getExerciseReflections(answerSessionId, { targetStudentId })
// → targetStudentId による認可チェックは既存。指導者・保護者での呼び出しに対応済み
// 参考: exercise-reflection.ts (line 132)

// exercise-achievement.ts の getExerciseAchievementMapData({ targetStudentId })
// → 保護者の到達マップ表示で既に使用中
// 参考: exercise-achievement.ts (line 43)
```

### 3.4 API Route

```
GET /api/coach/exercise-master/summary?grade=5|6
GET /api/coach/exercise-master/detail?question_set_id=123
GET /api/coach/student/[id]/exercise-reflections?question_set_id=123
```

### 3.5 フロントエンド

#### 新規コンポーネント

| ファイル | 役割 |
|---------|------|
| `app/coach/exercise-master/page.tsx` | 演習問題集一覧（SSR） |
| `app/coach/exercise-master/exercise-master-client.tsx` | クライアント側ロジック |
| `components/exercise-detail-matrix.tsx` | 正誤マトリクス（`detail-matrix.tsx` を参考に新規作成） |
| `components/exercise-section-summary.tsx` | セクション別正答率バー |
| `components/exercise-reflection-viewer.tsx` | 振り返り+AIフィードバック閲覧（読み取り専用） |

#### 既存コンポーネント拡張

| ファイル | 変更内容 |
|---------|---------|
| `app/coach/student/[id]/student-detail-client.tsx` | 「ふりかえり履歴」タブ → 「演習・ふりかえり」タブとして実装 (line 488) |
| `components/coach-bottom-navigation.tsx` | メニューに「演習問題集」追加（既存4タブの拡張 or サブメニュー） |
| `app/parent/reflect/page.tsx` | 演習タブにセクション別正答率・振り返り・フィードバック閲覧を追加 (line 312) |

### 3.6 SWR Hook

```typescript
useExerciseMasterSummary(grade)   // 一覧用
useExerciseMasterDetail(qsId)     // 詳細用
```

---

## 4. 実装フェーズ

### Phase 1: バックエンド基盤（ブランチ: `feature/exercise-coach-view`）

| # | タスク | 工数目安 |
|---|--------|---------|
| 1-1 | `get_exercise_master_summary` RPC（マイグレーション） | 中 |
| 1-2 | `get_exercise_master_detail` RPC（マイグレーション） | 中 |
| 1-3 | Server Action 3関数（exercise-master.ts 新規） | 中 |
| 1-4 | API Route 3エンドポイント | 小 |
| 1-5 | テスト（RPC + Action） | 中 |

### Phase 2: 指導者画面（同ブランチ続行 or `feature/exercise-coach-ui`）

| # | タスク | 工数目安 |
|---|--------|---------|
| 2-1 | 演習問題集一覧ページ（サマリー表） | 中 |
| 2-2 | 正誤マトリクスコンポーネント | 中 |
| 2-3 | セクション別正答率バー | 小 |
| 2-4 | 生徒詳細「演習・ふりかえり」タブ | 中 |
| 2-5 | 振り返り+AIフィードバック閲覧ビュー | 小 |
| 2-6 | ナビゲーション更新 | 小 |

### Phase 3: 保護者画面（ブランチ: `feature/exercise-parent-view`）

| # | タスク | 工数目安 |
|---|--------|---------|
| 3-1 | 保護者向けServer Action（既存拡張） | 小 |
| 3-2 | `app/parent/reflect/page.tsx` 演習タブ拡張 | 中 |
| 3-3 | 振り返り+AIフィードバック閲覧（保護者版） | 小 |
| 3-4 | クラス平均（同学年全体）との比較表示 | 小 |

### Phase 4: グラフ・可視化（ブランチ: `feature/exercise-charts`）

| # | タスク | 工数目安 |
|---|--------|---------|
| 4-1 | セッション間正答率推移グラフ（Recharts） | 中 |
| 4-2 | セクション別レーダーチャート（任意） | 中 |
| 4-3 | クラス分布グラフ | 小 |

---

## 5. 依存関係・順序

```
Phase 1（バックエンド） ← 必須。先行完了が必要
  ↓
Phase 2（指導者UI）  ← Phase 1 完了後
Phase 3（保護者UI）  ← Phase 1 完了後（Phase 2 と並行可能）
  ↓
Phase 4（グラフ）    ← Phase 2, 3 完了後（独立でも可）
```

---

## 6. 流用元・参照ファイル

| 流用元 | 流用先 | 内容 |
|--------|--------|------|
| `20260216000001_math_master_coach_view.sql` (line 138, 270, 354, 366) | RPC 新規作成 | `auth.uid()` 認証, `jsonb_object_agg`, `FILTER` 集計, CTE構造 |
| `app/api/coach/math-master/detail/route.ts` | API Route | 認可チェック、レスポンス構造 |
| `app/api/coach/math-master/summary/route.ts` | API Route | 学年フィルタ、SWR対応 |
| `app/coach/math-master/components/detail-matrix.tsx` | 正誤マトリクス | テーブルレイアウト、○/×表示 |
| `app/actions/exercise-reflection.ts` (line 132) | 振り返り閲覧 | `targetStudentId` + `checkStudentAccess()` パターン |
| `app/actions/exercise-achievement.ts` (line 43) | 認可チェック | `checkStudentAccess()` |
| `app/coach/student/[id]/student-detail-client.tsx` (line 488) | タブ追加 | 「ふりかえり履歴」未実装タブ |
| `app/parent/reflect/page.tsx` (line 312) | 保護者演習タブ | 既存の演習到達マップ表示 |

---

## 7. リスク・注意点

1. **コースフィルタと指導者ビュー**: 指導者ビューでは全問題を表示し、生徒のコース外の問題は「対象外」マークで区別する（到達マップの `excluded` パターンと同様）
2. **パフォーマンス**: 生徒数×問題数のマトリクスが大きくなる場合、RPC内でページネーション or セッション単位で遅延ロードする
3. **認可モデル**: 全Server Actionは `createAdminClient()` でRLSバイパス + アプリ層 `checkStudentAccess()` で認可。RLSポリシーは既存で十分だが、主要な認可はアプリ層で担保する
4. **既存テスト**: 既存の演習テスト（`exercise-actions.test.ts`, `exercise-reflection.test.ts`, `load-exercise-bundle.test.ts`）を参考に、新規Action・RPCに同等のテストカバレッジを確保する。マスタープリント側の専用テストは現状なし

---

## 8. 変更履歴

| 日付 | 内容 |
|------|------|
| 2026-03-18 | 初版作成 |
| 2026-03-18 | レビュー指摘反映: RLS追加不要（既存ポリシー確認）、RPC引数をauth.uid()内部解決に修正、保護者画面をreflect/page.tsxに統合、参照先修正、クラス平均母集団を同学年全体に確定 |
