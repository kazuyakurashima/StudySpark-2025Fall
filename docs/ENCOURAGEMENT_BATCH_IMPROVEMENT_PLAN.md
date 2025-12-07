# 応援機能バッチ対応改善計画

## 概要

### 背景・課題

現在の応援機能には以下の設計上の不整合がある:

1. **UIとデータの乖離**: 保護者/指導者画面ではバッチ（複数科目まとめ記録）を1行で表示するが、応援は「代表ログ（1科目）」にのみ紐付く
2. **AI生成の文脈不足**: AI応援メッセージは代表ログ1件の情報のみで生成され、4科目まとめ記録でも単科目の応援文になる
3. **計測の曖昧さ**: バッチ応援と単科目応援を区別して効果測定できない

### ゴール

- 応援がバッチ全体に対するものか、特定科目に対するものかを明確化
- AI生成がバッチ全体のコンテキストを考慮
- 将来の効果測定・フィルタが容易なデータ構造

---

## 設計方針

### 応援タイプの定義

| パターン | related_batch_id | related_study_log_id | 用途 |
|----------|------------------|---------------------|------|
| A: バッチ応援 | ✅ 設定 | NULL | 複数科目まとめ記録への応援 |
| B: 単科目応援 | NULL | ✅ 設定 | 特定科目への応援（従来互換） |

> **Note**: 「バッチ内の特定科目を強調」したい場合は、パターンAを使用し、AI生成の文言で強調する。パターンCは実装しない（シンプルさ優先）。

### バックフィル方針

- **全期間**を対象に既存データを埋める
- `related_study_log_id` → `study_logs.batch_id` を取得して `related_batch_id` に設定
- 単一ログ（batch_id = NULL）の場合は `related_batch_id` も NULL のまま

---

## Phase 1: AI生成ロジック改善（スキーマ変更なし）

### 目的

現在のスキーマのまま、AI応援メッセージの品質を向上させる。

### 実装内容

#### 1-1. バッチコンテキスト取得関数の作成

**ファイル**: `lib/utils/batch-context.ts`（新規）

```typescript
interface BatchContext {
  isBatch: boolean
  subjects: string[]
  totalProblems: number
  totalCorrect: number
  averageAccuracy: number
  bestSubject?: { name: string; accuracy: number }
  challengeSubject?: { name: string; accuracy: number }
  studyDate: string
  sessionNumber: number
}

/**
 * バッチ（または単一ログ）のコンテキストを取得
 * @param batchId - batch_id（ない場合は単一ログ扱い）
 * @param representativeLogId - 代表ログID
 */
export async function getBatchContext(
  batchId: string | null,
  representativeLogId: number
): Promise<BatchContext>
```

#### 1-2. AI生成関数の修正

**対象ファイル**:
- `lib/openai/encouragement.ts` - 保護者用
- `app/actions/encouragement.ts` - `generateCoachAIEncouragement`

**修正内容**:
```typescript
// Before: 代表ログのみ
const context = {
  subject: log.subject_name,
  accuracy: log.correct_count / log.total_problems,
  ...
}

// After: バッチ全体
const batchContext = await getBatchContext(log.batch_id, log.id)
const context = {
  isBatch: batchContext.isBatch,
  subjects: batchContext.subjects,
  totalProblems: batchContext.totalProblems,
  averageAccuracy: batchContext.averageAccuracy,
  bestSubject: batchContext.bestSubject,
  challengeSubject: batchContext.challengeSubject,
  ...
}
```

#### 1-3. プロンプトの改善

**ファイル**: `lib/openai/prompts.ts`

```markdown
# バッチ記録の場合の追加ルール

## 複数科目への応援
- 科目数に言及する（「4科目も記録したね！」）
- 特に頑張った科目（正答率高/問題数多）に触れる
- 挑戦した科目（正答率低でも取り組んだ科目）を称える

## 例
- 「今日は算数・国語・理科・社会の4科目も記録したね！特に算数は85%正解ですごいよ」
- 「苦手な理科にも挑戦できたね。その姿勢が大事だよ」
```

### 完了基準

- [x] `getBatchContext` 関数が実装されている ✅ 2025-12-05
- [x] 保護者AI生成がバッチコンテキストを使用 ✅ 2025-12-05
- [x] 指導者AI生成がバッチコンテキストを使用 ✅ 2025-12-05
- [x] プロンプトにバッチ対応ルールが追加されている ✅ 2025-12-05
- [ ] 4科目まとめ記録でも適切な応援文が生成される（要動作確認）

---

## Phase 2: スキーマ改善（related_batch_id追加）

### 目的

応援データの整合性を確保し、バッチ応援と単科目応援を明確に区別する。

### 実装内容

#### 2-1. マイグレーション作成

**ファイル**: `supabase/migrations/YYYYMMDD_add_related_batch_id.sql`

```sql
-- related_batch_id カラム追加
ALTER TABLE public.encouragement_messages
ADD COLUMN related_batch_id UUID;

-- インデックス追加
CREATE INDEX idx_encouragement_batch_id
ON public.encouragement_messages(related_batch_id)
WHERE related_batch_id IS NOT NULL;

-- コメント
COMMENT ON COLUMN public.encouragement_messages.related_batch_id
IS 'バッチ応援の場合のbatch_id。単科目応援の場合はNULL';
```

#### 2-2. バックフィル

**全期間**の既存データを埋める:

```sql
-- 既存の応援にbatch_idを埋める
UPDATE public.encouragement_messages em
SET related_batch_id = sl.batch_id
FROM public.study_logs sl
WHERE em.related_study_log_id = sl.id
  AND sl.batch_id IS NOT NULL
  AND em.related_batch_id IS NULL;
```

#### 2-3. Server Actions修正

**対象ファイル**: `app/actions/encouragement.ts`

```typescript
// 応援送信時にbatch_idも保存
await supabase.from("encouragement_messages").insert({
  student_id: studentId,
  sender_id: user.id,
  sender_role: senderRole,
  support_type: supportType,
  message: message,
  related_study_log_id: isBatchEncouragement ? null : studyLogId,
  related_batch_id: isBatchEncouragement ? batchId : null,
})
```

#### 2-4. UI修正（任意）

保護者/指導者の応援履歴画面で、バッチ応援と単科目応援を視覚的に区別:

```tsx
{encouragement.related_batch_id && (
  <Badge variant="secondary">バッチ応援</Badge>
)}
{encouragement.related_study_log_id && !encouragement.related_batch_id && (
  <Badge variant="outline">科目応援</Badge>
)}
```

### 完了基準

- [ ] マイグレーションが作成・適用されている
- [ ] 全期間のバックフィルが完了している
- [ ] 新規応援で `related_batch_id` が正しく設定される
- [ ] UIでバッチ応援/単科目応援が区別できる（任意）

---

## Phase 3: イベント計測強化

### 目的

バッチ応援と単科目応援の利用状況・効果を分析可能にする。

### 実装内容

#### 3-1. 応援送信イベントの拡張

**対象イベント**: `encouragement_sent`

```typescript
await recordEvent(userId, userRole, 'encouragement_sent', {
  recipient_student_id: studentId,
  message_length: message.length,
  support_type: supportType,  // 'quick' | 'ai' | 'custom'
  // 追加フィールド
  is_batch: !!batchId,
  subjects: batchContext?.subjects || [singleSubject],
  subject_count: batchContext?.subjects.length || 1,
})
```

#### 3-2. 分析用SQLクエリ

```sql
-- バッチ応援 vs 単科目応援の利用比率
SELECT
  CASE WHEN (event_data->>'is_batch')::BOOLEAN THEN 'batch' ELSE 'single' END AS type,
  COUNT(*) AS count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 1) AS percentage
FROM user_events
WHERE event_type = 'encouragement_sent'
GROUP BY 1;

-- 科目数別の応援送信数
SELECT
  (event_data->>'subject_count')::INT AS subject_count,
  COUNT(*) AS count
FROM user_events
WHERE event_type = 'encouragement_sent'
GROUP BY 1
ORDER BY 1;
```

### 完了基準

- [ ] `encouragement_sent` イベントに `is_batch`, `subjects`, `subject_count` が含まれる
- [ ] 分析SQLが実行可能

---

## Phase 4: ミッション連携（オプション）

### 目的

今日のミッション科目を達成した場合にハイライトし、応援の納得感を高める。

### 実装内容

#### 4-1. UI: ミッション達成バッジ

**対象**: 保護者/指導者の応援画面

```tsx
const todayMissionSubjects = await getTodayMissionSubjects()
const achievedMission = batchSubjects.some(s => todayMissionSubjects.includes(s))

{achievedMission && (
  <Badge className="bg-amber-100 text-amber-800">
    ✨ 今日のミッション達成
  </Badge>
)}
```

#### 4-2. AI生成プロンプトへの反映

```typescript
const context = {
  ...batchContext,
  todayMissionSubjects: ["算数", "国語", "社会"],
  achievedMission: true,
}
```

**プロンプト追加**:
```markdown
# ミッション達成の場合
- 今日のミッション科目を達成していることに言及
- 「今日のミッションの算数、クリアしたね！」
```

### 完了基準

- [ ] 応援画面でミッション達成バッジが表示される
- [ ] AI生成がミッション達成を考慮したメッセージを生成する

---

## タスク一覧

### Phase 1: AI生成ロジック改善

| ID | タスク | 担当 | 状態 | 備考 |
|----|--------|------|------|------|
| 1-1 | `getBatchContext` 関数作成 | - | ✅完了 | `lib/utils/batch-context.ts` |
| 1-2 | 保護者AI生成にバッチコンテキスト適用 | - | ✅完了 | `app/actions/encouragement.ts` |
| 1-3 | 指導者AI生成にバッチコンテキスト適用 | - | ✅完了 | `generateCoachAIEncouragement` |
| 1-4 | プロンプトにバッチ対応ルール追加 | - | ✅完了 | `lib/openai/prompts.ts` |
| 1-5 | 動作確認（4科目まとめ記録で適切な応援文） | - | 未着手 | 要実機テスト |

### Phase 2: スキーマ改善

| ID | タスク | 担当 | 状態 | 備考 |
|----|--------|------|------|------|
| 2-1 | マイグレーション作成 | - | 未着手 | `related_batch_id` 追加 |
| 2-2 | ローカルDB適用・確認 | - | 未着手 | - |
| 2-3 | バックフィルSQL実行 | - | 未着手 | 全期間対象 |
| 2-4 | Server Actions修正（保護者） | - | 未着手 | - |
| 2-5 | Server Actions修正（指導者） | - | 未着手 | - |
| 2-6 | 本番DB適用 | - | 未着手 | ユーザー承認後 |

### Phase 3: イベント計測強化

| ID | タスク | 担当 | 状態 | 備考 |
|----|--------|------|------|------|
| 3-1 | `encouragement_sent` イベント拡張 | - | ✅完了 | is_batch, subjects, subject_count, support_type追加 |
| 3-2 | 分析SQLクエリ作成 | - | 未着手 | - |

### Phase 4: ミッション連携（オプション）

| ID | タスク | 担当 | 状態 | 備考 |
|----|--------|------|------|------|
| 4-1 | ミッション達成バッジUI | - | 未着手 | 保護者/指導者画面 |
| 4-2 | AI生成へのミッション情報追加 | - | 未着手 | - |

---

## 優先度と依存関係

```
Phase 1 (AI改善) ─────────────────────────┐
     ↓                                    │
Phase 2 (スキーマ) ──→ Phase 3 (計測) ────┤
     ↓                                    │
Phase 4 (ミッション連携) ←────────────────┘
```

- **Phase 1** は独立して実施可能（即効性あり）
- **Phase 2** は Phase 1 完了後に実施
- **Phase 3** は Phase 2 のスキーマ変更後に実施
- **Phase 4** は余力があれば実施

---

## リスクと対策

| リスク | 影響 | 対策 |
|--------|------|------|
| バックフィルで既存データ破損 | 応援履歴が不整合に | UPDATE前にSELECTで確認、本番適用前にバックアップ |
| AI生成のコスト増加 | API費用増 | バッチコンテキストはキャッシュ活用 |
| プロンプト変更で品質低下 | 不自然な応援文 | 複数パターンでテスト後にリリース |

---

**作成日**: 2025-12-05
**最終更新**: 2025-12-07
**ステータス**: Phase 1 (AI生成改善) ✅完了、Phase 3 (イベント計測) 部分完了、Phase 2 (スキーマ) 未着手

---

## 全体進捗サマリー

| Phase | 状態 | 次のアクション |
|-------|------|--------------|
| Phase 1 | ✅ 4/5完了 | 動作確認（実機テスト待ち） |
| Phase 2 | 🔲 未着手 | スキーマ変更・バックフィル |
| Phase 3 | 🔶 1/2完了 | 分析SQLクエリ作成 |
| Phase 4 | 🔲 未着手 | オプション（余力次第） |
