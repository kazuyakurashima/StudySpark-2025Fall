# 応援メッセージ パーソナライズ生成 実装計画

## 概要

### 解決する痛み
指導者・保護者がAI生成した応援メッセージを使えない（自分の言葉と合わない）ため、結局自分で全部書くか、スタンプに逃げている。複数記録がある日は1件だけメッセージ、残りはスタンプになり、応援の質が下がる。

### 誰の痛み → 誰が払うか
- **痛みの主体**: 指導者・保護者（メッセージを送る側）
- **受益者**: 生徒（より自然で個性的な応援を受け取れる）
- **課金**: 現時点はPoC（無料枠）。効果実証後に指導者/塾向け課金を検討

### 解決アプローチ
```
【Before】
AI生成(3パターン) → 自分の言葉と違う → 結局自分で書く / スタンプに逃げる

【After】
(任意) 一言コンテキスト入力 → AI生成(1パターン, 過去メッセージのスタイル反映) → 微修正で送信
```

## 設計方針（PoC向け）

### フィードバック反映事項

1. **スタイル要約テーブルなし（Phase 1）**: 生成時に送信者の直近10件をそのままプロンプトへ注入。別テーブル＋バックグラウンド再分析はPhase 2で効果実証後に導入
2. **メタデータ追加**: `ai_draft_message`（AI下書き原文）を保存し、送信メッセージとの差分で「編集されたか」を判定可能にする。学習データ抽出の正確性を担保
3. **1パターン生成**: トークン削減＋UXシンプル化。「再生成」ボタンでハズレ救済
4. **キャッシュキー更新**: `sender_id` + `styleSnapshotHash` + `context` + `学習状況バケット` + `prompt_version` でパーソナライズの混線を防止。`styleSnapshotHash` により送信者の新しい文体が即座にキャッシュを無効化
5. **AI文体の自己増幅防止**: 学習対象は `custom` と `ai かつ編集済み（message != ai_draft_message）` に限定。未編集AI文が学習データに混入してAI文体を自己増幅するループを防ぐ
6. **ai_cacheのRLS**: Phase 1はキャッシュ失敗時のLLMフォールバック前提で運用。encouragement用RLSポリシー追加はPhase 2で必要に応じて対応
7. **指標計測先行**: AI利用率 / 編集率 / スタンプ逃げ率を計測し、効果が出たらPhase 2（`sender_message_styles`テーブル化）に進む

### Phase構成

| Phase | 内容 | トリガー |
|-------|------|---------|
| **Phase 1（本PR）** | 直近メッセージ注入 + 1パターン + コンテキスト入力 + メタデータ + 計測 | 即時実装 |
| **Phase 2（将来）** | `sender_message_styles` テーブル + バックグラウンド再分析 | Phase 1で効果確認後 |

---

## 変更ファイル一覧

### 1. `supabase/migrations/xxx_add_encouragement_metadata.sql`（新規）

`encouragement_messages` テーブルにカラム追加:

```sql
-- AI下書き原文（送信メッセージとの差分で編集判定）
ALTER TABLE encouragement_messages
  ADD COLUMN ai_draft_message TEXT;

-- コンテキスト入力（生成時にユーザーが入力した一言）
ALTER TABLE encouragement_messages
  ADD COLUMN user_context TEXT;
```

**設計判断**:
- `is_ai_edited` は保存しない。`ai_draft_message IS NOT NULL AND message != ai_draft_message` で算出可能
- `user_context` は分析用に保存（どんなコンテキストが効果的かの検証に使う）
- 既存データへの影響なし（NULL許容のADD COLUMNのみ）
- `is_ai_generated` は既存カラムだが未使用。今回は触れず、Phase 2で整理

### 2. `types/supabase.ts`（再生成）

マイグレーション適用後に `npx supabase gen types typescript --local > types/supabase.ts`

### 3. `lib/openai/prompts.ts`（修正）

**変更内容**:
- `getEncouragementSystemPrompt()`: スタイル反映指示を追加
- `getEncouragementUserPrompt()`: 1パターン出力に変更、コンテキスト・過去メッセージ注入

**プロンプト構造（新）**:
```
【システムプロンプト】
あなたは学習応援メッセージの作成者です。
以下の送信者の過去メッセージを参考に、同じ人が書いたような自然なメッセージを1つ生成してください。
- 語尾のパターン、絵文字の使い方、褒め方の特徴を踏襲する
- 過去メッセージがない場合は、温かく具体的な応援メッセージを生成する
（既存のセルフコンパッション・成長マインドセット指示は維持）

【ユーザープロンプト】
## 送信者の過去メッセージ（スタイル参考）
1. "算数よく頑張ったね！年齢算は考え方が大事だから、解けるようになったのすごいよ"
2. "理科と社会まとめて記録えらい！コツコツ続けよう"
...（最大10件）

## 学習データ
- 生徒名: ゆいちゃん
- 科目: 算数  正答率: 82%  問題数: 15問
（既存のバッチ対応も維持）

## 送信者からの一言（任意）
"苦手だった年齢算が解けるようになった"

## 出力
1つのメッセージを生成してください（200文字以内）
```

**出力フォーマット変更**:
```json
// Before
{ "messages": ["msg1", "msg2", "msg3"] }

// After
{ "message": "生成されたメッセージ" }
```

### 4. `lib/openai/encouragement.ts`（修正）

**主な変更**:

#### a. 新関数 `getSenderRecentMessages(senderId: string, limit: number)`
```typescript
// 送信者の直近メッセージを取得（スタイル学習用）
// 対象: support_type = 'custom'
//       OR (support_type = 'ai' AND ai_draft_message IS NOT NULL AND message <> ai_draft_message)
//       → quickスタンプ除外、かつ未編集AI文も除外（AI文体の自己増幅を防止）
// ソート: sent_at DESC
// 返却: { id: number, message: string, sent_at: string }[]
```

**設計判断: AI文体の自己増幅防止**
- `support_type IN ('custom', 'ai')` だけだと、AIそのまま送信した文が学習データに混入する
- AI文をそのまま送信→次回その文体を学習→さらにAI寄りの文が生成、という自己増幅ループが発生
- 学習対象は「人間が書いた文（custom）」と「人間が編集したAI文（ai かつ ai_draft != message）」に限定

#### b. `generateEncouragementMessages()` → `generateEncouragementMessage()` に改名
- 引数追加: `senderMessages: string[]`（過去メッセージ）、`userContext?: string`（任意コンテキスト）
- 出力: `{ success: boolean, message: string }` （1パターン）
- 最大トークン: 1500 → 500 に削減

#### c. キャッシュキー更新
```typescript
// Before
const cacheKey = SHA256(JSON.stringify({
  accuracyBucket, questionBucket, subject, ...
}))

// After
const cacheKey = SHA256(JSON.stringify({
  senderId,              // 送信者ID（個性の分離）
  styleSnapshotHash,     // 直近N件の (id, sent_at) のハッシュ（スタイル更新の反映）
  userContext,           // コンテキスト入力（あれば）
  accuracyBucket,       // 正答率バケット（10%刻み）
  questionBucket,       // 問題数バケット（10問刻み）
  subject,              // 科目
  promptVersion: 2,     // プロンプトバージョン（更新時にキャッシュ無効化）
}))
```

**styleSnapshotHash の算出**:
```typescript
// getSenderRecentMessages() の結果から算出
const styleSnapshotHash = SHA256(
  senderMessages.map(m => `${m.id}:${m.sent_at}`).join(',')
)
```
- 送信者が新しいメッセージを書くと `id` / `sent_at` が変わり、キャッシュが自動無効化される
- メッセージを書いていなければ同一ハッシュ → キャッシュヒット

**注意**: `userContext` が入るとほぼ毎回ユニークになるため、コンテキスト付きの場合は実質キャッシュ無効。これはPoCでは許容する（コンテキスト付き = 個別メッセージなのでキャッシュの意味が薄い）。

#### d. 後方互換
- 旧関数 `generateEncouragementMessages()` はラッパーとして残し、内部で新関数を呼ぶ
- 既存の呼び出し元が壊れないようにする
- Phase 2完了後に削除

### 5. `app/actions/encouragement.ts`（修正）

**変更箇所（保護者向け）**:

#### a. `generateAIEncouragement()`
```typescript
// Before
export async function generateAIEncouragement(studentId: string, studyLogId: string)

// After
export async function generateAIEncouragement(
  studentId: string,
  studyLogId: string,
  userContext?: string  // 任意コンテキスト追加
)
```
- 送信者の直近10件メッセージを取得（`getSenderRecentMessages()`）
- 新生成関数に渡す
- 戻り値: `{ success, message }` （1パターン）

#### b. `sendCustomEncouragement()`
```typescript
// Before
export async function sendCustomEncouragement(
  studentId: string, studyLogId: string | null,
  message: string, supportType: string, meta?: object
)

// After
export async function sendCustomEncouragement(
  studentId: string, studyLogId: string | null,
  message: string, supportType: string,
  meta?: { aiDraftMessage?: string, userContext?: string, ...existing }
)
```
- `ai_draft_message`: AI生成の下書き原文を保存
- `user_context`: 生成時のコンテキスト入力を保存

#### c. 指導者向け関数も同様の変更
- `generateCoachAIEncouragement()`: コンテキスト引数追加
- `sendCoachCustomEncouragement()`: メタデータ引数追加

### 6. `app/parent/dashboard-client.tsx`（修正）

**UI変更**:

#### a. コンテキスト入力欄の追加
- AI応援ダイアログ内、生成ボタンの上に1行テキスト入力を追加
- プレースホルダー: `例：苦手だった年齢算が解けた`
- 入力は任意（空でも生成可能）

#### b. 3パターン選択 → 1パターン表示
```
Before:
┌─────────────────────────────────┐
│ ✨ 3つの応援メッセージから選んで │
│ ┌───────────────┐               │
│ │ ○ メッセージ1  │               │
│ ├───────────────┤               │
│ │ ○ メッセージ2  │               │
│ ├───────────────┤               │
│ │ ○ メッセージ3  │               │
│ └───────────────┘               │
│ [編集テキストエリア]             │
│ [送信]                          │
└─────────────────────────────────┘

After:
┌─────────────────────────────────┐
│ ✨ AI応援メッセージ              │
│ ┌───────────────────────────┐   │
│ │ 一言メモ（任意）           │   │
│ │ [________________]         │   │
│ └───────────────────────────┘   │
│ [生成] ← コンテキスト入力後     │
│                                 │
│ ┌───────────────────────────┐   │
│ │ 生成されたメッセージ       │   │
│ │ (編集可能テキストエリア)   │   │
│ └───────────────────────────┘   │
│ [再生成🔄]         [送信]       │
└─────────────────────────────────┘
```

#### c. State変更
```typescript
// 削除
const [aiMessages, setAiMessages] = useState<string[]>([])

// 追加
const [aiMessage, setAiMessage] = useState<string>("")
const [aiDraftMessage, setAiDraftMessage] = useState<string>("")  // 下書き保持
const [userContext, setUserContext] = useState<string>("")
```

#### d. フロー変更
1. ダイアログ表示 → コンテキスト入力欄が表示される
2. （任意）一言入力
3. 「生成」ボタン押下 → `generateAIEncouragement(studentId, logId, context)`
4. 1メッセージが編集可能テキストエリアに表示
5. 「再生成」で別パターン取得可能
6. 「送信」で `sendCustomEncouragement(..., { aiDraftMessage, userContext })`

### 7. `app/parent/encouragement/page.tsx`（修正）

dashboard-client.tsx と同様の変更:
- 3パターン選択UI → 1パターン＋コンテキスト入力＋再生成
- `generateAIEncouragement()` にコンテキスト引数追加
- `sendCustomEncouragement()` にメタデータ追加

### 8. `app/coach/encouragement/page.tsx`（修正）

指導者版も同様の変更:
- 3パターン選択UI → 1パターン＋コンテキスト入力＋再生成
- `generateCoachAIEncouragement()` にコンテキスト引数追加
- `sendCoachCustomEncouragement()` にメタデータ追加

### 9. `.env.example`（修正）

変更なし（既存の `AI_PROVIDER` でカバー。応援メッセージ専用のプロバイダ分岐は不要）

### 10. テスト（新規・修正）

#### a. `lib/openai/__tests__/encouragement.test.ts`（新規）
- スタイル注入ありの生成テスト（過去メッセージがプロンプトに含まれること）
- スタイル注入なしの生成テスト（過去メッセージ0件でも動作すること）
- コンテキスト付き生成テスト
- キャッシュキーに `senderId` と `styleSnapshotHash` が含まれることの検証
- styleSnapshotHash がメッセージ追加で変化することの検証
- 1パターン出力のパーステスト
- 後方互換ラッパーのテスト
- キャッシュ失敗時のフォールバック動作テスト

#### b. `app/actions/__tests__/encouragement.test.ts`（新規）
- `generateAIEncouragement()` のコンテキスト引数伝播テスト
- `sendCustomEncouragement()` の `ai_draft_message`・`user_context` 保存テスト
- 直近メッセージ取得: quick除外 + 未編集AI文除外の検証
- 学習対象フィルタ: `custom` + `ai かつ message != ai_draft_message` のみ取得されることの検証

#### c. 既存テスト回帰確認
- `pnpm test` で全テストパス確認

### 11. 計測イベント追加

`lib/utils/event-tracking.ts` の `recordEncouragementSent()` を拡張:

```typescript
// 追加メタデータ
{
  ...existing,
  hasUserContext: boolean,        // コンテキスト入力があったか
  isAiEdited: boolean,            // AI下書きを編集したか
  editDistance: number,            // 編集距離（文字数差分）
  senderMessageCount: number,     // 送信者の累計メッセージ数
  generationMode: "ai_personalized" | "ai_standard" | "custom" | "quick",
}
```

**分析用クエリ例**（将来の効果測定用）:
```sql
-- AI利用率の変化
SELECT DATE(created_at),
  COUNT(*) FILTER (WHERE metadata->>'generationMode' LIKE 'ai%') * 100.0 / COUNT(*) as ai_usage_rate
FROM user_events WHERE event_type = 'encouragement_sent'
GROUP BY 1 ORDER BY 1;

-- 編集率（AI生成をそのまま送った vs 編集した）
SELECT
  COUNT(*) FILTER (WHERE metadata->>'isAiEdited' = 'true') as edited,
  COUNT(*) FILTER (WHERE metadata->>'isAiEdited' = 'false') as as_is
FROM user_events WHERE event_type = 'encouragement_sent' AND metadata->>'generationMode' = 'ai_personalized';

-- スタンプ逃げ率の変化
SELECT DATE(created_at),
  COUNT(*) FILTER (WHERE metadata->>'generationMode' = 'quick') * 100.0 / COUNT(*) as stamp_rate
FROM user_events WHERE event_type = 'encouragement_sent'
GROUP BY 1 ORDER BY 1;
```

---

## 実装順序

| # | タスク | 依存 | 見込み |
|---|--------|------|--------|
| 1 | マイグレーションSQL作成（メタデータカラム追加） | - | 小 |
| 2 | `types/supabase.ts` 型再生成 | #1適用後 | 小 |
| 3 | `lib/openai/prompts.ts` プロンプト改修 | - | 中 |
| 4 | `lib/openai/encouragement.ts` 生成ロジック改修 | #3 | 中 |
| 5 | `app/actions/encouragement.ts` サーバーアクション改修 | #2, #4 | 中 |
| 6 | `app/parent/dashboard-client.tsx` UI改修 | #5 | 大 |
| 7 | `app/parent/encouragement/page.tsx` UI改修 | #5 | 中 |
| 8 | `app/coach/encouragement/page.tsx` UI改修 | #5 | 中 |
| 9 | 計測イベント拡張 | #5 | 小 |
| 10 | テスト作成 | #4, #5 | 中 |
| 11 | `pnpm build` + `pnpm test` 確認 | all | 小 |

---

## DB変更 確認事項

**変更の目的**: 応援メッセージのAI生成パーソナライズに必要なメタデータカラム追加
**影響を受けるテーブル**: `encouragement_messages`（既存テーブル、カラム追加のみ）
**既存データ削除**: なし（NULL許容のADD COLUMNのみ）
**環境**: ローカル（本番はVercelデプロイ後にSupabaseで適用）
**ロールバック手順**:
1. アプリ側: コンテキスト入力UIを非表示にするだけで機能的に無害
2. DB側: `ALTER TABLE encouragement_messages DROP COLUMN ai_draft_message, DROP COLUMN user_context;`
3. 型: `types/supabase.ts` を再生成

---

## 参照すべき既存パターン

- AI応援生成: `lib/openai/encouragement.ts`
- プロンプト: `lib/openai/prompts.ts` の `getEncouragementSystemPrompt()`, `getEncouragementUserPrompt()`
- サーバーアクション: `app/actions/encouragement.ts`
- イベント計測: `lib/utils/event-tracking.ts` の `recordEncouragementSent()`
- キャッシュ: `lib/openai/encouragement.ts` のSHA256キャッシュ機構
- キャッシュRLS: `supabase/migrations/20251004000006_create_coaching.sql` (L265), `20251114000002_add_student_id_to_ai_cache.sql` (L24)
- バッチコンテキスト: `lib/utils/batch-context.ts`

### ai_cache の RLS に関する注意

現行の `ai_cache` テーブルのRLSポリシーは `coaching_sessions` 向けに設計されており、`encouragement` 用の `cache_type` に対するSELECT/INSERTポリシーが明示されていない。

**Phase 1 の方針**: キャッシュ失敗時はフォールバックでLLM再生成する前提とする。
- `encouragement.ts` の既存実装はキャッシュミス時にLLM呼び出しにフォールバックしており、この動作を維持
- キャッシュINSERT失敗もサイレントに処理（ログ出力のみ、ユーザー影響なし）
- Phase 2でキャッシュ効率が問題になった場合に、`encouragement` 用RLSポリシーを追加

---

## 成功指標（PoC）

| 指標 | Before（現状） | 目標 |
|------|----------------|------|
| AI応援利用率 | ほぼ0%（自作が大半） | 50%以上 |
| スタンプ逃げ率 | 複数記録時に2/3 | 1/3以下 |
| AI生成→編集なし送信率 | 計測不可 | 30%以上（スタイル一致の証拠） |
| 生成→送信までの時間 | - | 現状の3パターン選択より短縮 |

---

## Phase 2 への移行条件

以下が確認できたらPhase 2（`sender_message_styles`テーブル + バックグラウンド再分析）に移行:

1. AI応援利用率が30%以上に改善
2. 累計送信メッセージが20件以上蓄積（スタイル分析に十分なデータ量）
3. 直近メッセージ注入のプロンプトサイズが問題になる（10件超で品質低下 or レイテンシ増）
