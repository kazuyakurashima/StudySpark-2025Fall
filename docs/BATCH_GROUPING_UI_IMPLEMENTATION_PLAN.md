# batch_id グループ化UI統一 実装計画

## 概要

学習記録（study_logs）の表示を、`batch_id` によるグループ化で統一する。
生徒ダッシュボードで実装済みのパターンを、リフレクト画面・応援画面・指導者画面に展開する。

## 背景

- スパーク機能で複数科目を同時保存すると、同一の `batch_id` が付与される
- 生徒ダッシュボードでは既にバッチ単位でグループ表示を実装済み
- 他の画面では個別ログ表示のままで、UXの一貫性がない

## 目標

1. 全画面で `batch_id` によるグループ化表示を統一
2. 共通ユーティリティを作成し、実装の重複を排除
3. 既存データ（`batch_id` がnullのレガシーログ）との互換性を維持

---

## UI仕様

### グループ表示ルール

| 項目 | 仕様 |
|------|------|
| タイトル | 科目名をカンマ区切りで表示（例：「算数, 国語, 理科」） |
| 問題数/正答数 | 科目ごとに個別表示 |
| コーチフィードバック | バッチ全体で1つ |
| 並び順 | グループ内の `max(created_at)` で降順ソート |
| レガシーログ | `batch_id` がnullの場合は `study_log_id` を疑似キーとして単独表示 |

### 応援送信時の選択

| 項目 | 仕様 |
|------|------|
| 選択単位 | バッチ全体を選択 |
| 紐付け | バッチ内の代表1件（最初のログ）に応援を紐付け |
| 将来拡張 | 必要に応じてバッチ内の個別科目選択を追加 |

---

## 影響範囲

### 対応が必要な画面

| # | 画面 | コンポーネント | データ取得元 | 現状 |
|---|------|--------------|-------------|------|
| 1 | 生徒ダッシュボード | RecentLearningHistoryCard | getRecentStudyLogs() | ✅ 対応済み |
| 2 | 保護者ダッシュボード | RecentLearningHistoryCard | getStudentRecentLogs() | ✅ 対応済み |
| 3 | 生徒リフレクト - 学習履歴 | StudyHistory | getStudyHistory() | ❌ 未対応 |
| 4 | 保護者リフレクト - 学習履歴 | StudyHistory | getChildStudyHistory() | ❌ 未対応 |
| 5 | 生徒リフレクト - 応援履歴 | EncouragementHistory | getEncouragementHistory() | ❌ 未対応 |
| 6 | 保護者リフレクト - 応援履歴 | EncouragementHistory | getChildEncouragementHistory() | ❌ 未対応 |
| 7 | 保護者応援ページ | - | - | ❌ 未対応 |
| 8 | 指導者生徒詳細 | StudentDetailPage | getStudentDetail() | ❌ 未対応 |
| 9 | 指導者応援ページ | - | - | ❌ 未対応 |

### 対応不要な画面

| 画面 | 理由 |
|------|------|
| 達成マップ (AchievementMap) | 科目別正答率の可視化用（個別ログベースで適切） |
| コーチング履歴 | coaching_sessionsを表示（study_logsではない） |

---

## Phase分割

### Phase 0: 共通ユーティリティ作成

**目的**: グループ化ロジックを一元化し、全画面で再利用可能にする

#### タスク

| ID | タスク | ファイル | 内容 |
|----|--------|---------|------|
| 0-1 | 型定義作成 | `lib/types/batch-grouping.ts` | GroupedLogEntry, BatchGroup 等の型定義 |
| 0-2 | グループ化関数作成 | `lib/utils/batch-grouping.ts` | groupLogsByBatch(), sortGroupedLogs() |
| 0-3 | 既存実装リファクタ | `app/student/dashboard-client.tsx` | 共通ユーティリティを使用するよう変更 |
| 0-4 | 動作確認 | - | 生徒ダッシュボードが正常に動作することを確認 |

#### 型定義（案）

```typescript
// lib/types/batch-grouping.ts

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
  // ... 他のフィールド
}

/** バッチグループエントリ */
export interface BatchGroupEntry {
  type: "batch"
  batchId: string
  logs: StudyLogWithBatch[]
  coachFeedback: string | null
  latestLoggedAt: string
  studyDate: string
}

/** 単独ログエントリ（batch_idがnull） */
export interface SingleLogEntry {
  type: "single"
  log: StudyLogWithBatch
  coachFeedback: string | null
}

/** グループ化されたエントリ（Union型） */
export type GroupedLogEntry = BatchGroupEntry | SingleLogEntry
```

#### グループ化関数（案）

```typescript
// lib/utils/batch-grouping.ts

/**
 * 学習ログをbatch_idでグループ化
 * @param logs 学習ログ配列
 * @param batchFeedbacks batch_id -> feedback_text マップ
 * @param legacyFeedbacks study_log_id -> feedback_text マップ
 * @returns グループ化されたエントリ配列（日時降順）
 */
export function groupLogsByBatch(
  logs: StudyLogWithBatch[],
  batchFeedbacks: Record<string, string>,
  legacyFeedbacks: Record<number, string>
): GroupedLogEntry[]
```

---

### Phase 1: リフレクト画面（学習履歴＋応援履歴）

**目的**: 生徒・保護者のリフレクト画面でバッチグループ化を適用

#### タスク

| ID | タスク | ファイル | 内容 |
|----|--------|---------|------|
| 1-1 | getStudyHistory()拡張 | `app/actions/reflect.ts` | batch_id取得、フィードバックマップ返却 |
| 1-2 | getChildStudyHistory()拡張 | `app/actions/parent.ts` | batch_id取得、フィードバックマップ返却 |
| 1-3 | StudyHistory更新 | `app/student/reflect/study-history.tsx` | 共通ユーティリティでグループ化表示 |
| 1-4 | getEncouragementHistory()拡張 | `app/actions/reflect.ts` | study_logsにbatch_id含める |
| 1-5 | getChildEncouragementHistory()拡張 | `app/actions/parent.ts` | study_logsにbatch_id含める |
| 1-6 | EncouragementHistory更新 | `app/student/reflect/encouragement-history.tsx` | グループ化対応 |
| 1-7 | 動作確認 | - | 生徒・保護者のリフレクト画面で動作確認 |

#### API変更（例）

```typescript
// Before
interface StudyHistoryResponse {
  logs: StudyLog[]
}

// After
interface StudyHistoryResponse {
  logs: StudyLogWithBatch[]
  batchFeedbacks: Record<string, string>
  legacyFeedbacks: Record<number, string>
}
```

---

### Phase 2: 応援送信画面

**目的**: 保護者・指導者の応援送信時にバッチ単位で学習記録を選択

#### タスク

| ID | タスク | ファイル | 内容 |
|----|--------|---------|------|
| 2-1 | 保護者応援ページ調査 | `app/parent/encouragement/` | 現状の実装を確認 |
| 2-2 | 保護者応援ページ修正 | `app/parent/encouragement/` | バッチグループ化表示、選択時は代表ログを使用 |
| 2-3 | 指導者応援ページ調査 | `app/coach/encouragement/` | 現状の実装を確認 |
| 2-4 | 指導者応援ページ修正 | `app/coach/encouragement/` | バッチグループ化表示、選択時は代表ログを使用 |
| 2-5 | 動作確認 | - | 応援送信が正常に動作することを確認 |

---

### Phase 3: 指導者画面

**目的**: 指導者の生徒詳細画面でバッチグループ化を適用

#### タスク

| ID | タスク | ファイル | 内容 |
|----|--------|---------|------|
| 3-1 | getStudentDetail()拡張 | `app/actions/coach.ts` | batch_id取得、フィードバックマップ返却 |
| 3-2 | 型定義更新 | `lib/hooks/use-coach-student-detail.ts` | StudyLog型にbatch_id追加 |
| 3-3 | APIレスポンス更新 | `app/api/coach/student/[id]/route.ts` | batchFeedbacks, legacyFeedbacks追加 |
| 3-4 | 生徒詳細ページ更新 | `app/coach/student/[id]/page.tsx` | 共通ユーティリティでグループ化表示 |
| 3-5 | 動作確認 | - | 指導者画面で動作確認 |

---

## 技術的考慮事項

### グループ化の実装パターン

```typescript
// 推奨パターン: フロントエンド集約
// 理由: 件数が少ない（最大50件程度）、柔軟性が高い

function groupLogsByBatch(logs, batchFeedbacks, legacyFeedbacks) {
  const batchGroups = new Map<string, StudyLogWithBatch[]>()
  const standaloneLogs: StudyLogWithBatch[] = []

  logs.forEach((log) => {
    if (log.batch_id) {
      const group = batchGroups.get(log.batch_id) || []
      group.push(log)
      batchGroups.set(log.batch_id, group)
    } else {
      standaloneLogs.push(log)
    }
  })

  const entries: GroupedLogEntry[] = []

  // バッチグループをエントリに変換
  batchGroups.forEach((groupLogs, batchId) => {
    entries.push({
      type: "batch",
      batchId,
      logs: groupLogs,
      coachFeedback: batchFeedbacks[batchId] || null,
      latestLoggedAt: Math.max(...groupLogs.map(l => new Date(l.logged_at).getTime())),
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

  // 日時降順でソート
  return entries.sort((a, b) => {
    const aTime = a.type === "batch" ? a.latestLoggedAt : new Date(a.log.logged_at).getTime()
    const bTime = b.type === "batch" ? b.latestLoggedAt : new Date(b.log.logged_at).getTime()
    return bTime - aTime
  })
}
```

### パフォーマンス考慮

| 件数 | 推奨アプローチ |
|------|--------------|
| ~100件 | フロントエンド集約（現行方式） |
| 100件~ | DB側でGROUP BY集約を検討 |

現状の使用ケースでは最大50件程度のため、フロントエンド集約で問題なし。

### RLS/セキュリティ

- `batch_id` カラムは既に追加済み
- 既存のRLSポリシーは `student_id` ベースのため、`batch_id` 追加による変更は不要
- JOINやSELECTで `batch_id` を追加しても、既存のRLSが適用される

---

## テスト計画

### 各Phaseの確認項目

| Phase | 確認項目 |
|-------|---------|
| 0 | 生徒ダッシュボードが正常に動作する |
| 1 | リフレクト画面でバッチ/単独ログが混在表示される |
| 2 | 応援送信でバッチ選択→代表ログに紐付けされる |
| 3 | 指導者画面でバッチグループ化が表示される |

### テストデータパターン

| パターン | 説明 |
|---------|------|
| バッチのみ | 全ログがbatch_id付き |
| 単独のみ | 全ログがbatch_id=null（レガシー） |
| 混在 | バッチと単独が混在 |
| 空 | ログなし |

---

## 進捗管理

### ステータス凡例

- ⬜ 未着手
- 🔄 進行中
- ✅ 完了
- ⏸️ 保留

### Phase 0: 共通ユーティリティ作成

| ID | タスク | ステータス | 備考 |
|----|--------|----------|------|
| 0-1 | 型定義作成 | ⬜ | |
| 0-2 | グループ化関数作成 | ⬜ | |
| 0-3 | 既存実装リファクタ | ⬜ | |
| 0-4 | 動作確認 | ⬜ | |

### Phase 1: リフレクト画面

| ID | タスク | ステータス | 備考 |
|----|--------|----------|------|
| 1-1 | getStudyHistory()拡張 | ⬜ | |
| 1-2 | getChildStudyHistory()拡張 | ⬜ | |
| 1-3 | StudyHistory更新 | ⬜ | |
| 1-4 | getEncouragementHistory()拡張 | ⬜ | |
| 1-5 | getChildEncouragementHistory()拡張 | ⬜ | |
| 1-6 | EncouragementHistory更新 | ⬜ | |
| 1-7 | 動作確認 | ⬜ | |

### Phase 2: 応援送信画面

| ID | タスク | ステータス | 備考 |
|----|--------|----------|------|
| 2-1 | 保護者応援ページ調査 | ⬜ | |
| 2-2 | 保護者応援ページ修正 | ⬜ | |
| 2-3 | 指導者応援ページ調査 | ⬜ | |
| 2-4 | 指導者応援ページ修正 | ⬜ | |
| 2-5 | 動作確認 | ⬜ | |

### Phase 3: 指導者画面

| ID | タスク | ステータス | 備考 |
|----|--------|----------|------|
| 3-1 | getStudentDetail()拡張 | ⬜ | |
| 3-2 | 型定義更新 | ⬜ | |
| 3-3 | APIレスポンス更新 | ⬜ | |
| 3-4 | 生徒詳細ページ更新 | ⬜ | |
| 3-5 | 動作確認 | ⬜ | |

---

## 変更履歴

| 日付 | 内容 |
|------|------|
| 2024-12-03 | 初版作成 |
