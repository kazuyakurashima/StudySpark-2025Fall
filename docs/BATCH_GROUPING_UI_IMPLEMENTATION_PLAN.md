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
| 科目表示 | バッチ内の科目名をカンマ区切りで表示（例: 算数, 国語, 理科） |
| 問題数/正答数 | 科目ごとに個別表示。任意で「合計: X問/Y正答」を1行追記可（後付け） |
| コーチフィードバック | バッチ全体で1件 |
| レガシーログ | `batch_id` がnullの旧ログは従来通り1カード。混在時もソートルールは同一 |

### 応援送信時の選択

| 項目 | 仕様 |
|------|------|
| 選択単位 | バッチ（`batch_id`）または単独ログ（`batch_id` が無い場合） |
| 表示内容 | バッチ内の科目一覧と代表時間/日付を表示 |
| 紐付け | バッチ内の代表1件（最初のログ）に応援を紐付け |
| 将来拡張 | 必要に応じて「バッチ選択→科目絞り込み」の二段階UIを追加可 |

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
- 理由: 件数が少ない（最大50件程度）、柔軟性が高い、DBスキーマ変更不要
- 将来: 大量データが発生した場合はDB側 `GROUP BY COALESCE(batch_id, id)` への移行を検討

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

/** 個別の学習ログ（batch_id付き） */
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
  reflection_text: string | null
}

/** バッチグループ */
export interface BatchGroup<TLog extends StudyLogWithBatch> {
  groupKey: BatchGroupKey
  batchId: string | null
  logs: TLog[]
  subjects: string[]
  latestLoggedAt: string
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
    const latestLoggedAt = groupLogs.reduce(
      (max, log) => (log.logged_at > max ? log.logged_at : max),
      groupLogs[0].logged_at
    )
    entries.push({
      type: "batch",
      batchId,
      logs: groupLogs,
      coachFeedback: batchFeedbacks[batchId] || null,
      latestLoggedAt,
      studyDate: groupLogs[0].study_date,
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

  // logged_at降順でソート
  return entries.sort((a, b) => {
    const aTime = a.type === "batch" ? a.latestLoggedAt : a.log.logged_at
    const bTime = b.type === "batch" ? b.latestLoggedAt : b.log.logged_at
    return bTime.localeCompare(aTime)
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
| 0-1 | 型定義・インタフェース設計 | ⬜ | |
| 0-2 | 生徒ダッシュボード実装を移設 | ⬜ | |
| 0-3 | ユーティリティ単体テスト | ⬜ | |
| 0-4 | JSDoc/使用ガイド追記 | ⬜ | |

### Phase 1: リフレクト画面

| ID | タスク | Status | Note |
|----|--------|--------|------|
| 1-1 | getStudyHistory() batch対応 | ⬜ | |
| 1-2 | getEncouragementHistory() batch対応 | ⬜ | |
| 1-3 | getChildStudyHistory() batch対応 | ⬜ | |
| 1-4 | getChildEncouragementHistory() batch対応 | ⬜ | |
| 1-5 | StudyHistory グループ化適用 | ⬜ | |
| 1-6 | EncouragementHistory グループ化適用 | ⬜ | |
| 1-7 | フロント型をbatch対応に更新 | ⬜ | |
| 1-8 | 手動QA（混在データ、並び順） | ⬜ | |

### Phase 2: 応援送信画面

| ID | タスク | Status | Note |
|----|--------|--------|------|
| 2-1 | 保護者応援ページ バッチ対応 | ⬜ | |
| 2-2 | 指導者応援ページ バッチ対応 | ⬜ | |
| 2-3 | バッチ選択UI共通化 | ⬜ | |
| 2-4 | 選択動作テスト | ⬜ | |

### Phase 3: 指導者画面

| ID | タスク | Status | Note |
|----|--------|--------|------|
| 3-1 | getStudentDetail() batch対応 | ⬜ | |
| 3-2 | 型定義更新 | ⬜ | |
| 3-3 | 生徒詳細ページ グループ化適用 | ⬜ | |
| 3-4 | 手動QA（混在データ、並び順） | ⬜ | |

---

## 承認ポイント

| Phase | 承認項目 | タイミング |
|-------|---------|-----------|
| 2 | 応援送信UIの変更（バッチ選択）がUXに影響 | Phase 2開始前 |

---

## 変更履歴

| 日付 | 内容 |
|------|------|
| 2024-12-03 | 初版作成 |
| 2024-12-03 | フィードバック反映: 並び順をlogged_atに統一、スコープ整理（8画面）、集約方式明記、テスト計画強化、承認ポイント追加 |
