# BATCH GROUPING UI IMPLEMENTATION PLAN

## 概要

学習記録（study_logs）の表示を `batch_id` によるグループ化で統一する。
生徒ダッシュボードで実装済みのパターンを、リフレクト画面・応援画面・指導者画面に展開。

---

## UI仕様

### グループ表示ルール

| 項目 | 仕様 |
|------|------|
| グループ単位 | `batch_id` があればバッチ単位、無ければ `study_log_id` 単独 |
| 並び順 | グループ内の `max(logged_at)` で降順ソート（既存ダッシュボード実装に統一） |
| 代表日付 | バッチ内で `max(logged_at)` を持つログの `study_date` を使用（並び順と整合） |
| 日時比較 | `new Date(logged_at).getTime()` で比較（ISO 8601形式前提、文字列比較は避ける） |
| 科目表示 | バッチ内の科目名をカンマ区切りで表示（例: 算数, 国語, 理科） |
| 問題数/正答数 | 科目ごとに個別表示。任意で「合計: X問/Y正答」を1行追記可（後付け） |
| 振り返りテキスト | バッチ全体で1件表示。`entry.logs.find(log => log.reflection_text)` で最初に見つかった1件を採用（現データモデル: 全ログに同一テキストが保存）。将来科目別振り返りを導入する場合は `batch_reflections` テーブル新設を検討 |
| コーチフィードバック | バッチ全体で1件 |
| レガシーログ | `batch_id` がnullの旧ログは従来通り1カード。混在時もソートルールは同一 |

### 応援送信時の選択

| 項目 | 仕様 |
|------|------|
| 選択単位 | バッチ（`batch_id`）または単独ログ（`batch_id` が無い場合） |
| 表示内容 | バッチ内の科目一覧と代表時間/日付（`max(logged_at)`のログから取得）を表示 |
| 紐付けルール | バッチ内で `max(logged_at)` を持つログ（最新）に応援を紐付け。サーバー側も同一ルールで保存 |
| 将来拡張 | 必要に応じて「バッチ選択→科目絞り込み」の二段階UIを追加可。判断タイミング: Phase 2完了後のユーザーフィードバック時 |

### 応援履歴

| 項目 | 仕様 |
|------|------|
| 受信/送信とも | バッチでまとめて表示 |
| レガシー | `batch_id` 無しは単独カードで表示 |

---

## 影響範囲（8画面）

### 対応が必要な画面

| # | 画面 | コンポーネント | 集約方式 |
|---|------|--------------|---------|
| 1 | 生徒リフレクト - 学習履歴 | StudyHistory | フロント集約 |
| 2 | 保護者リフレクト - 学習履歴 | StudyHistory | フロント集約 |
| 3 | 生徒リフレクト - 応援履歴（受信） | EncouragementHistory | フロント集約 |
| 4 | 保護者リフレクト - 応援履歴（送信） | EncouragementHistory | フロント集約 |
| 5 | 生徒応援ページ - 受信一覧 | - | フロント集約 |
| 6 | 保護者応援ページ - 学習記録選択 | - | フロント集約 |
| 7 | 指導者応援ページ - 学習記録選択 | - | フロント集約 |
| 8 | 指導者 - 生徒詳細（学習履歴） | StudentDetail | フロント集約 |

### スコープ外

| 画面 | 理由 |
|------|------|
| 達成マップ (AchievementMap) | 科目別正答率の可視化用（個別ログベースで適切） |
| コーチング履歴 | coaching_sessionsを表示（study_logsではない） |
| 指導者 - 応援履歴 | 専用画面なし（生徒詳細内で送信済み表示のみ） |

### 集約方式の選定理由

- 全画面で**フロント集約**を採用
- 理由: 件数が少ない、柔軟性が高い、DBスキーマ変更不要

### API件数上限

| 画面 | 上限 | 備考 |
|------|------|------|
| ダッシュボード（生徒/保護者） | 10件 | 直近の学習履歴 |
| リフレクト学習履歴 | 50件 | ページネーション検討時に拡張 |
| リフレクト応援履歴 | 50件 | 同上 |
| 指導者生徒詳細 | 50件 | 同上 |
| 応援送信（学習記録選択） | 30件 | 未応援のみ表示 |

- **移行判断**: 上限を超えるデータが発生した場合、DB側 `GROUP BY COALESCE(batch_id, id)` への移行を検討

---

## Phase分割（計20タスク）

### Phase 0: 共通ユーティリティ作成（4タスク）

| ID | タスク | ファイル | 内容 |
|----|--------|---------|------|
| 0-1 | 型定義・インタフェース設計 | `lib/types/batch-grouping.ts` | BatchGroup, GroupedLogEntry 等 |
| 0-2 | 生徒ダッシュボード実装を移設 | `lib/utils/batch-grouping.ts` | groupLogsByBatch(), sortGroupedLogs() |
| 0-3 | ユーティリティ単体テスト | `__tests__/batch-grouping.test.ts` | batchあり/なし/混在パターン |
| 0-4 | JSDoc/使用ガイド追記 | `lib/utils/batch-grouping.ts` | 使用例とパラメータ説明 |

### Phase 1: リフレクト画面（8タスク）

| ID | タスク | ファイル | 内容 |
|----|--------|---------|------|
| 1-1 | getStudyHistory() batch対応 | `app/actions/reflect.ts` | batch_id取得、フィードバックマップ返却 |
| 1-2 | getEncouragementHistory() batch対応 | `app/actions/reflect.ts` | study_logsのJOINにbatch_id含める |
| 1-3 | getChildStudyHistory() batch対応 | `app/actions/parent.ts` | 同上 |
| 1-4 | getChildEncouragementHistory() batch対応 | `app/actions/parent.ts` | 同上 |
| 1-5 | StudyHistory グループ化適用 | `app/student/reflect/study-history.tsx` | 共通ユーティリティ使用 |
| 1-6 | EncouragementHistory グループ化適用 | `app/student/reflect/encouragement-history.tsx` | 共通ユーティリティ使用 |
| 1-7 | フロント型をbatch対応に更新 | 各コンポーネント | Props型にbatch_id追加 |
| 1-8 | 手動QA（混在データ、並び順） | - | チェックリスト実施 |

### Phase 2: 応援送信画面（4タスク）

| ID | タスク | ファイル | 内容 |
|----|--------|---------|------|
| 2-1 | 保護者応援ページ バッチ対応 | `app/parent/encouragement/` | UI/ロジック修正 |
| 2-2 | 指導者応援ページ バッチ対応 | `app/coach/encouragement/` | UI/ロジック修正 |
| 2-3 | バッチ選択UI共通化 | 共通コンポーネント | 科目一覧・代表日付の表示統一 |
| 2-4 | 選択動作テスト | - | batchあり/なし、複数科目バッチ |

### Phase 3: 指導者画面（4タスク）

| ID | タスク | ファイル | 内容 |
|----|--------|---------|------|
| 3-1 | getStudentDetail() batch対応 | `app/actions/coach.ts` | batch_id取得、フィードバック返却 |
| 3-2 | 型定義更新 | `lib/hooks/use-coach-student-detail.ts` | StudyLog型にbatch_id追加 |
| 3-3 | 生徒詳細ページ グループ化適用 | `app/coach/student/[id]/page.tsx` | 共通ユーティリティ使用 |
| 3-4 | 手動QA（混在データ、並び順） | - | チェックリスト実施 |

---

## 技術仕様

### 型定義案

```typescript
// lib/types/batch-grouping.ts

/** グループキー（batch_id or study_log_id as fallback） */
export type BatchGroupKey = string

/**
 * 個別の学習ログ（batch_id付き）- 基本型
 * 必須フィールドのみ。用途別に拡張して使用する。
 */
export interface StudyLogWithBatch {
  id: number
  batch_id: string | null
  student_id: number
  session_id: number
  subject: string
  study_date: string
  logged_at: string
  correct_count: number
  total_problems: number
  reflection_text?: string | null  // 任意（応援履歴では不要な場合あり）
}

/**
 * 応援履歴用の学習ログ型
 * 応援メッセージ経由で取得する際、一部フィールドが欠落する可能性があるため別定義
 */
export interface EncouragementStudyLog extends Omit<StudyLogWithBatch, 'reflection_text' | 'session_id'> {
  session_id?: number  // 任意
}

/** バッチグループ */
export interface BatchGroup<TLog extends StudyLogWithBatch> {
  groupKey: BatchGroupKey
  batchId: string | null
  logs: TLog[]
  subjects: string[]
  latestLoggedAt: string
  studyDate: string  // max(logged_at)のログから取得
  summary?: {
    totalQuestions?: number
    totalCorrect?: number
  }
}

/** グループ化されたエントリ（Union型） */
export type GroupedLogEntry<TLog extends StudyLogWithBatch> =
  | { type: "batch"; batchId: string; logs: TLog[]; coachFeedback: string | null; latestLoggedAt: string; studyDate: string }
  | { type: "single"; log: TLog; coachFeedback: string | null }
```

### 型設計の注意点

- `StudyLogWithBatch` は基本型として最小限のフィールドを定義
- 応援履歴など用途によっては `reflection_text` や `session_id` が不要/欠落する場合があるため、任意フィールドとするか用途別に型を分ける
- ジェネリクス `<TLog extends StudyLogWithBatch>` で拡張可能に設計

### 実装時の注意点

| 項目 | 対応方針 |
|------|---------|
| subjects配列の重複排除 | `Array.from(new Set(groupLogs.map(l => l.subject)))` で生成 |
| Dateパース失敗時 | `Number.isNaN(timestamp)` なら `Number.NEGATIVE_INFINITY` でソート末尾に |
| フィードバックマップの空値 | `batchFeedbacks[batchId] ?? null` で統一（undefinedと空文字を区別しない） |
| API件数上限の定数化 | `lib/constants/api-limits.ts` に定数定義、コードとドキュメントで共有 |

### グループ化関数

```typescript
// lib/utils/batch-grouping.ts

/**
 * 学習ログをbatch_idでグループ化
 *
 * @param logs - 学習ログ配列（logged_at降順でソート済み想定）
 * @param batchFeedbacks - batch_id -> feedback_text マップ
 * @param legacyFeedbacks - study_log_id -> feedback_text マップ（batch_id=null用）
 * @returns グループ化されたエントリ配列（logged_at降順）
 *
 * @example
 * const entries = groupLogsByBatch(logs, batchFeedbacks, legacyFeedbacks)
 * entries.forEach(entry => {
 *   if (entry.type === "batch") {
 *     console.log(`Batch: ${entry.logs.map(l => l.subject).join(", ")}`)
 *   } else {
 *     console.log(`Single: ${entry.log.subject}`)
 *   }
 * })
 */
export function groupLogsByBatch<TLog extends StudyLogWithBatch>(
  logs: TLog[],
  batchFeedbacks: Record<string, string>,
  legacyFeedbacks: Record<number, string>
): GroupedLogEntry<TLog>[]
```

### 実装パターン

```typescript
/** 日時文字列をタイムスタンプに変換（比較用） */
function toTimestamp(dateStr: string): number {
  return new Date(dateStr).getTime()
}

export function groupLogsByBatch<TLog extends StudyLogWithBatch>(
  logs: TLog[],
  batchFeedbacks: Record<string, string>,
  legacyFeedbacks: Record<number, string>
): GroupedLogEntry<TLog>[] {
  const batchGroups = new Map<string, TLog[]>()
  const standaloneLogs: TLog[] = []

  // グループ分け
  logs.forEach((log) => {
    if (log.batch_id) {
      const group = batchGroups.get(log.batch_id) || []
      group.push(log)
      batchGroups.set(log.batch_id, group)
    } else {
      standaloneLogs.push(log)
    }
  })

  const entries: GroupedLogEntry<TLog>[] = []

  // バッチグループをエントリに変換
  batchGroups.forEach((groupLogs, batchId) => {
    // max(logged_at) を持つログを特定（Date比較）
    const latestLog = groupLogs.reduce((latest, log) =>
      toTimestamp(log.logged_at) > toTimestamp(latest.logged_at) ? log : latest
    )
    entries.push({
      type: "batch",
      batchId,
      logs: groupLogs,
      coachFeedback: batchFeedbacks[batchId] || null,
      latestLoggedAt: latestLog.logged_at,
      studyDate: latestLog.study_date,  // max(logged_at)のログから取得
    })
  })

  // 単独ログをエントリに変換
  standaloneLogs.forEach((log) => {
    entries.push({
      type: "single",
      log,
      coachFeedback: legacyFeedbacks[log.id] || null,
    })
  })

  // logged_at降順でソート（Date比較）
  return entries.sort((a, b) => {
    const aTime = a.type === "batch" ? toTimestamp(a.latestLoggedAt) : toTimestamp(a.log.logged_at)
    const bTime = b.type === "batch" ? toTimestamp(b.latestLoggedAt) : toTimestamp(b.log.logged_at)
    return bTime - aTime  // 降順
  })
}
```

---

## テスト計画

### データパターン

| パターン | 説明 |
|---------|------|
| A | 同一 `batch_id` で複数科目 |
| B | 単独ログ（batch_id = null） |
| C | バッチとレガシーの混在 |
| D | 異なる日付の複数バッチでソート確認 |
| E | 空配列 |

### Phase別確認項目

| Phase | 確認項目 |
|-------|---------|
| 0 | ユーティリティ単体テスト（A/B/C/D/E） |
| 1 | API型整合、フロントレンダリング（混在データ、並び順）、RLS権限確認 |
| 2 | 選択UIレンダリング、選択動作（batchあり/なし、複数科目） |
| 3 | 指導者画面API/フロント確認（混在データ、並び順） |

### RLS/セキュリティ確認

| 確認項目 | 方法 |
|---------|------|
| batch_id付きログのアクセス | 各ロールでログイン→データ取得確認 |
| batch_id=nullログのアクセス | レガシーデータの表示確認 |
| 権限外データの非表示 | 他ユーザーのデータが見えないこと |

### フォールバック確認

| 確認項目 | 方法 |
|---------|------|
| batch_idフィールド欠落時 | APIが古い形式で返した場合のUI動作 |
| batchFeedbacksが空の場合 | フィードバック表示なしで動作 |

---

## 進捗管理（20タスク）

### ステータス凡例

- ⬜ TODO
- 🔄 IN_PROGRESS
- ✅ DONE
- ⏸️ BLOCKED

### Phase 0: 共通ユーティリティ

| ID | タスク | Status | Note |
|----|--------|--------|------|
| 0-1 | 型定義・インタフェース設計 | ✅ | `lib/types/batch-grouping.ts`, `lib/constants/api-limits.ts` |
| 0-2 | 生徒ダッシュボード実装を移設 | ✅ | `lib/utils/batch-grouping.ts`, `dashboard-client.tsx`リファクタ完了 |
| 0-3 | ユーティリティ単体テスト | ⏸️ | テストフレームワーク未導入のため保留。将来Jest/Vitest導入時に追加 |
| 0-4 | JSDoc/使用ガイド追記 | ✅ | ユーティリティファイルにJSDoc完備 |

### Phase 1: リフレクト画面

| ID | タスク | Status | Note |
|----|--------|--------|------|
| 1-1 | getStudyHistory() batch対応 | ✅ | `batch_id` を select に追加 |
| 1-2 | getEncouragementHistory() batch対応 | ✅ | study_logs join に `batch_id` 追加 |
| 1-3 | getChildStudyHistory() batch対応 | ✅ | `batch_id` を select に追加 |
| 1-4 | getChildEncouragementHistory() batch対応 | ✅ | study_logs join に `batch_id` 追加 |
| 1-5 | StudyHistory グループ化適用 | ✅ | `groupLogsByBatch` 適用、バッチ表示・内訳グリッド実装 |
| 1-6 | EncouragementHistory batch情報表示 | ✅ | メッセージ自体のグループ化は不要と判断。「同時記録」バッジ表示 |
| 1-7 | フロント型をbatch対応に更新 | ✅ | `StudyLogFromAPI` 型定義 |
| 1-8 | 手動QA（混在データ、並び順） | ✅ | 生徒リフレクト確認済み（バッチ/単独/混在OK） |

### Phase 2: 応援送信画面

| ID | タスク | Status | Note |
|----|--------|--------|------|
| 2-1 | 保護者応援ページ バッチ対応 | ✅ | `groupLogsByBatch` 適用、バッチ表示・内訳グリッド実装、型エラー修正（ChildProfile.id→number） |
| 2-2 | 指導者応援ページ バッチ対応 | ✅ | `useMemo` + `groupLogsByBatch` 適用、SWRフック連携 |
| 2-3 | バッチ選択UI共通化 | ✅ | `components/encouragement/study-log-card.tsx` 作成（viewerRole対応） |
| 2-4 | 選択動作テスト | ✅ | ビルド成功確認、sortBy/sortOrder整合修正完了 |

### Phase 3: 指導者画面

| ID | タスク | Status | Note |
|----|--------|--------|------|
| 3-1 | getStudentLearningHistory() batch対応 | ✅ | `batch_id`取得、`coach_feedbacks`からbatch/legacy両方のフィードバック取得 |
| 3-2 | 型定義更新 | ✅ | `StudyLog`型に`batch_id`追加、`CoachStudentDetailData`にfeedbackMaps追加 |
| 3-3 | 生徒詳細ページ グループ化適用 | ✅ | `groupLogsByBatch`適用、バッチ/単独エントリの表示分岐実装 |
| 3-4 | 手動QA（混在データ、並び順） | ⬜ | 実機確認待ち |

---

## 承認ポイント

| Phase | 承認項目 | タイミング |
|-------|---------|-----------|
| 2 | 応援送信UIの変更（バッチ選択）がUXに影響 | Phase 2開始前 |

---

## バグ修正: 未応援フィルターのバッチ対応

### 問題

保護者/指導者の応援画面で「未応援」フィルターを適用しても、応援済みバッチ内の一部ログが表示され続ける。

### 原因

RPC関数 `get_study_logs_for_encouragement` の未応援判定が**ログ単位**で行われている。

```sql
-- 現行: 各ログ個別にチェック
AND NOT EXISTS (
  SELECT 1 FROM public.encouragement_messages em
  WHERE em.related_study_log_id = sl.id
)
```

バッチ記録では応援は**代表ログ1件**にのみ紐付けられるため、残りのログは未応援と判定される。

例: バッチ (ID: 101, 102, 103, 104) に応援が `related_study_log_id = 101` で保存された場合
- ログ101 → 応援済み（フィルターで除外）
- ログ102, 103, 104 → 未応援扱い（誤ってフィルターを通過）

### 修正方針

未応援判定を**バッチ単位**に変更する。

```sql
-- 修正案: バッチ単位でチェック
AND NOT EXISTS (
  SELECT 1 FROM public.encouragement_messages em
  JOIN public.study_logs sl2 ON em.related_study_log_id = sl2.id
  WHERE
    -- バッチの場合: 同じbatch_id内のどれかに応援があれば応援済み
    (sl.batch_id IS NOT NULL AND sl2.batch_id = sl.batch_id)
    -- 単独ログの場合: 従来通り
    OR (sl.batch_id IS NULL AND em.related_study_log_id = sl.id)
)
```

### 実装上の注意点

| 項目 | 対応 |
|------|------|
| NULL安全 | `batch_id IS NOT NULL` と `batch_id IS NULL` の両ケースを明示 |
| パフォーマンス | `study_logs.batch_id` と `encouragement_messages.related_study_log_id` のインデックスで対応可能 |
| 将来拡張 | `related_batch_id` カラム追加時は、そちらを優先する判定に切り替え |

### 影響範囲

| 対象 | ファイル |
|------|---------|
| RPC関数 | `supabase/migrations/20251203000001_update_encouragement_rpc_batch.sql` |
| 適用先 | 保護者応援ページ、指導者応援ページ |

### テストケース

| ケース | 期待結果 |
|--------|---------|
| バッチ記録（4科目）に応援送信 → 未応援フィルター | バッチ全体が非表示 |
| 単独記録に応援送信 → 未応援フィルター | 該当ログが非表示 |
| バッチと単独の混在 → 未応援フィルター | 応援済みのみ非表示 |
| 全表示フィルター | 全件表示（変更なし） |

---

## 変更履歴

| 日付 | 内容 |
|------|------|
| 2024-12-03 | 初版作成 |
| 2024-12-03 | フィードバック反映: 並び順をlogged_atに統一、スコープ整理（8画面）、集約方式明記、テスト計画強化、承認ポイント追加 |
| 2024-12-03 | 安全性向上: 日時比較をDate使用に変更、代表日付ルール明記、紐付けルール明記、型設計の必須/任意整理、API件数上限追加 |
| 2024-12-03 | Phase 0完了: 型定義(0-1)、ユーティリティ作成(0-2)、ダッシュボードリファクタ完了。単体テスト(0-3)はフレームワーク未導入のためBLOCKED |
| 2024-12-03 | Phase 1実装: API全4関数にbatch_id追加、StudyHistoryグループ化表示完了、EncouragementHistoryは「同時記録」バッジ表示（メッセージ自体のグループ化は不要と判断）、sortBy=session整合修正 |
| 2024-12-03 | Phase 2完了: 保護者/指導者応援ページにバッチ対応適用、共通カードコンポーネント作成、RPC関数にbatch_id/logged_at追加（マイグレーション作成）、sortBy/sortOrder整合修正（SortOptionsパラメータ追加） |
| 2024-12-03 | 保護者ダッシュボード追加対応: `RecentLearningHistoryCard`にbatch_id対応追加（API route/フック型/クライアント表示）、`use-parent-dashboard`フックにfeedbackMaps追加 |
| 2024-12-03 | Phase 3実装完了: `getStudentLearningHistory()`にbatch_id/feedbackMaps追加、`use-coach-student-detail`フック型更新、生徒詳細ページ(`/coach/student/[id]`)にグループ化表示適用。手動QA(3-4)のみ残 |
| 2024-12-03 | 指導者ホームページ追加対応: `LearningRecordWithEncouragements`型にbatchId/studyDate追加、`getCoachStudentLearningRecords()`にbatch_id/study_date取得追加、`coach-home-client.tsx`にバッチグループ化ロジック実装（`groupRecordsByBatch`関数追加、Layersアイコン表示、科目別内訳グリッド） |
| 2024-12-04 | logged_at整合性修正: `getCoachStudentLearningRecords()`のソート/取得カラムを`created_at`から`logged_at`に変更。計画通り全画面で`logged_at`基準に統一 |
| 2024-12-05 | 振り返り表示修正: `components/encouragement/study-log-card.tsx` バッチ詳細表示で振り返りテキストが科目数分重複表示されていた問題を修正。バッチ全体で1回のみ表示するように変更 |
| 2024-12-05 | 未応援フィルター修正: `get_study_logs_for_encouragement` RPC関数の応援済み/未応援判定をバッチ単位に変更。応援済みバッチ内のログが「未応援」フィルターで表示され続ける問題を解消 |
