# AIコーチング改善 実装計画（v4）

> **ステータス**: Phase 1 完了、Phase 1.5 計画確定
> **最終更新**: 2026-03-04

## Context

StudySparkの振り返り（Reflect）AI対話のストリーミング化が完了（Phase 1）。次のステップとして、LLMプロバイダをOpenAIからGeminiへ移行し、ゴールナビ対話のストリーミング化を行う（Phase 1.5）。その後、計測基盤→長期メモリ→文脈分離の順に段階的に改善する。

---

## 進捗トラッカー

| Phase | タスク | ステータス |
|-------|-------|-----------|
| **1** | ストリーミング生成関数 (`generateReflectMessageStream`) | ✅ 完了 |
| **1** | SSEエンドポイント (`message-stream/route.ts`) | ✅ 完了 |
| **1** | クライアントUI (`reflect-chat.tsx`) | ✅ 完了 |
| **1** | 冪等性 (UNIQUE制約 + role別upsert) | ✅ 完了 |
| **1** | zodバリデーション + フォールバックルート統一 | ✅ 完了 |
| **1** | 動作検証 + 本番デプロイ | ✅ 完了 |
| **1.5a-1** | プロバイダ抽象化 (`lib/llm/`) | ⬜ 未着手 |
| **1.5a-2** | ReflectのみGemini化 (feature flag) | ⬜ 未着手 |
| **1.5a-3** | 他モジュール段階移行 | ⬜ 未着手 |
| **1.5b** | ゴールナビSSE化 (Full flow Step 1-2) | ⬜ 未着手 |
| **2** | PerfTimerユーティリティ | ⬜ 未着手 |
| **2** | 計測ポイント埋め込み | ⬜ 未着手 |
| **2** | Langfuse連携 | ⬜ 未着手 |
| **3** | DBマイグレーション | ⬜ 未着手 |
| **3** | メモリ生成ロジック (SQL集計→LLM) | ⬜ 未着手 |
| **3** | メモリ取得関数 | ⬜ 未着手 |
| **3** | 週次Cron + 日次差分更新 | ⬜ 未着手 |
| **4** | 日次コーチにcompact_memory注入 | ⬜ 未着手 |
| **4** | Reflectにdetailed_memory注入 | ⬜ 未着手 |
| **4** | 動作検証 + ビルド確認 | ⬜ 未着手 |

---

## フィードバック反映履歴

### v2 (FB1)
1. **Phase 1でサーバー側コンテキスト再構築を前倒し** — `requireAuth` 後にDBから生徒情報を補完
2. **SSE Abort連携** — `request.signal` をOpenAI呼び出しに接続
3. **メモリ更新はcron専任** — fire-and-forget廃止
4. **deltaバッチ更新** — 50msバッファリングで再レンダー過多防止

### v3 (FB2)
5. **[FB3] メモリ更新頻度の強化** — 週次のみ→週次フル更新+日次差分更新の2層構成
6. **[FB3] SSE Heartbeat** — 15秒間隔で `:\n\n` を送信し、長い無通信区間での切断を防止
7. **[FB3] runtime = "nodejs" 明示** — Route Segmentで実行環境を固定
8. **[FB3] 冪等性 (requestId)** — リトライ時の二重保存対策

### v4 (FB3: Phase 1完了後レビュー + Gemini移行計画)
9. **Phase 1.5追加** — Gemini移行 + ゴールナビSSEを計画に正式統合
10. **SDK選定**: `@google/genai`（旧 `@google/generative-ai` は非推奨）
11. **モデル戦略**: 用途別3層（2.5 Flash Lite / 2.5 Flash / 2.5 Pro）、A/Bテストで品質検証
12. **段階移行**: 一括ではなく Reflect先行 → 他機能段階移行（障害切り分け容易）
13. **運用安全網**: feature flag、OpenAIフォールバック、ログルール定義
14. **3系移行計画**: 2.5系停止に備えた移行トリガー日を事前設定
15. **JSON非ストリーム判断**: 技術的制約ではなくUX判断として明記

---

## Phase 1: Reflectストリーミング化 + サーバー側エンリッチメント

### 変更対象ファイル

| ファイル | 操作 | 内容 |
|---------|------|------|
| `lib/openai/reflect-coaching.ts` | 修正 | `generateReflectMessageStream()` 追加。`signal` パラメータ対応 |
| `app/api/reflect/message-stream/route.ts` | **新規** | SSE + サーバー側補完 + Abort + Heartbeat + runtime明示 |
| `app/student/reflect/reflect-chat.tsx` | 修正 | ストリーム消費 + deltaバッチ更新 + AbortController + requestId |

### 1-1. バックエンド: ストリーミング生成関数

`lib/openai/reflect-coaching.ts` に `generateReflectMessageStream()` を追加。
既存の `generateReflectMessage()` は後方互換のため残す。

```typescript
export async function* generateReflectMessageStream(
  context: ReflectContext,
  signal?: AbortSignal
): AsyncGenerator<{ type: 'delta' | 'done' | 'meta' | 'error'; content: string }> {
  const openai = getOpenAIClient()
  const model = getDefaultModel()
  const systemPrompt = getReflectSystemPrompt()
  const userPrompt = getReflectUserPrompt(context)

  const stream = await openai.chat.completions.create({
    model,
    messages: [
      { role: "system", content: systemPrompt },
      ...context.conversationHistory.map(msg => ({
        role: msg.role as "assistant" | "user",
        content: msg.content,
      })),
      { role: "user", content: userPrompt },
    ],
    max_completion_tokens: 800,
    stream: true,
  }, {
    signal,  // OpenAI SDK v6: 第2引数でAbortSignalを渡す
  })

  let fullContent = ""
  for await (const chunk of stream) {
    if (signal?.aborted) break
    const delta = chunk.choices[0]?.delta?.content
    if (delta) {
      fullContent += delta
      yield { type: 'delta', content: delta }
    }
  }

  if (signal?.aborted) return

  // META判定（全文完成後に評価。既存L59-69のロジックを流用）
  const hasCompletedGROWCheck =
    context.turnNumber >= 3 && hasCompletedGROW(context.conversationHistory)
  const hasClosingExpression =
    /素敵な一週間|良い一週間|楽しみにして|応援して|来週も|頑張ってね|それでは|では、/.test(fullContent)
  const isClosingTurn = context.turnNumber >= 5 && hasClosingExpression
  const shouldAppendMeta =
    hasCompletedGROWCheck || isClosingTurn || context.turnNumber >= 6

  if (shouldAppendMeta) {
    yield { type: 'meta', content: 'SESSION_CAN_END' }
  }

  yield { type: 'done', content: fullContent }
}
```

### 1-2. APIルート: SSEエンドポイント

新規作成: `app/api/reflect/message-stream/route.ts`

```typescript
import { NextRequest } from "next/server"
import { z } from "zod"
import { generateReflectMessageStream, type ReflectContext } from "@/lib/openai/reflect-coaching"
import { requireAuth } from "@/lib/api/auth"
import { createClient } from "@/lib/supabase/route"

// [FB3] 実行環境を明示的に固定
export const runtime = "nodejs"

// zodバリデーションスキーマ
const requestSchema = z.object({
  weekType: z.enum(["growth", "stable", "challenge", "special"]),
  thisWeekAccuracy: z.number().min(0).max(100).default(0),
  lastWeekAccuracy: z.number().min(0).max(100).default(0),
  accuracyDiff: z.number().default(0),
  upcomingTest: z.object({
    test_types: z.object({ name: z.string() }),
    test_date: z.string(),
  }).nullable().optional(),
  conversationHistory: z.array(z.object({
    role: z.enum(["assistant", "user"]),
    content: z.string().max(5000),        // 1メッセージ5000文字上限
  })).max(20).default([]),                // 最大20件（10ターン×2ロール）
  turnNumber: z.number().int().min(1).max(10).default(1),
  requestId: z.string().max(64).optional(), // ログ用トレーサビリティID
})

export async function POST(request: NextRequest) {
  const auth = await requireAuth(["student"])
  if ("error" in auth) return auth.error

  // zodバリデーション
  const rawBody = await request.json()
  const parsed = requestSchema.safeParse(rawBody)
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: "不正なリクエストです", details: parsed.error.flatten() }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    )
  }
  const body = parsed.data
  const requestId = body.requestId || "unknown"

  // [FB1] サーバー側コンテキスト再構築
  const supabase = await createClient()
  const { data: student } = await supabase
    .from("students")
    .select("id, full_name, grade, course")
    .eq("user_id", auth.user.id)
    .single()

  if (!student) {
    return new Response(
      JSON.stringify({ error: "生徒情報が見つかりません" }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    )
  }

  const context: ReflectContext = {
    studentName: student.full_name,        // DBから取得（クライアント値は無視）
    weekType: body.weekType,
    thisWeekAccuracy: body.thisWeekAccuracy,
    lastWeekAccuracy: body.lastWeekAccuracy,
    accuracyDiff: body.accuracyDiff,
    upcomingTest: body.upcomingTest ?? null,
    conversationHistory: body.conversationHistory,
    turnNumber: body.turnNumber,
  }

  // ... SSEストリーム構築（Heartbeat + Abort連携）...
}
```

**注意**: フォールバック先の `/api/reflect/message/route.ts` にも同一のzodスキーマ・サーバー側再構築を適用済み。

**設計ポイント:**
- `runtime = "nodejs"` で実行環境を固定（Edge Runtimeとの差異を回避）
- Heartbeat `:\n\n` はSSE仕様上のコメント行で、クライアントは無視する
- `request.signal` → OpenAI SDK `signal` → ループ内チェックの三段Abort構え
- 既存の `/api/reflect/message` はフォールバック用に残す

### 1-3. クライアント: ストリーム消費UI

`app/student/reflect/reflect-chat.tsx` の変更:

**A) [FB3] requestId付きストリーム消費 + deltaバッチ更新:**

```typescript
import { v4 as uuidv4 } from "uuid"  // または crypto.randomUUID()

async function fetchStreamingMessage(
  body: object,
  onChunk: (accumulated: string) => void,
  signal: AbortSignal
): Promise<{ fullContent: string; canEndSession: boolean }> {
  // [FB3] 冪等性: requestIdを付与
  const bodyWithId = { ...body, requestId: crypto.randomUUID() }

  const res = await fetch("/api/reflect/message-stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(bodyWithId),
    signal,
  })

  if (!res.ok || !res.body) {
    throw new Error("ストリーム接続に失敗しました")
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let fullContent = ""
  let canEndSession = false
  let sseBuffer = ""

  // [FB1] 50msバッチ更新
  let pendingText = ""
  const flushInterval = setInterval(() => {
    if (pendingText) {
      onChunk(fullContent)
      pendingText = ""
    }
  }, 50)

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      sseBuffer += decoder.decode(value, { stream: true })

      const lines = sseBuffer.split("\n\n")
      sseBuffer = lines.pop() || ""

      for (const line of lines) {
        // [FB3] Heartbeatコメント行をスキップ
        if (line === ":" || line.trim() === "") continue
        if (!line.startsWith("data: ")) continue

        const event = JSON.parse(line.slice(6))
        if (event.type === "delta") {
          fullContent += event.content
          pendingText += event.content
        } else if (event.type === "meta") {
          canEndSession = true
        } else if (event.type === "done") {
          fullContent = event.content
        } else if (event.type === "error") {
          throw new Error(event.content)
        }
      }
    }
  } finally {
    clearInterval(flushInterval)
    if (pendingText) onChunk(fullContent)
  }

  return { fullContent, canEndSession }
}
```

**B) UI変更:**

```typescript
const abortControllerRef = useRef<AbortController | null>(null)
const [isStreaming, setIsStreaming] = useState(false)
const [streamCanEndSession, setStreamCanEndSession] = useState(false)

const sendWithStreaming = async (requestBody: object, nextTurn: number) => {
  const placeholderId = Date.now()
  setMessages(prev => [...prev, { id: placeholderId, role: 'assistant', content: '' }])
  setIsStreaming(true)

  const controller = new AbortController()
  abortControllerRef.current = controller

  try {
    const { fullContent, canEndSession: sessionCanEnd } = await fetchStreamingMessage(
      requestBody,
      (accumulated) => {
        setMessages(prev => prev.map(m =>
          m.id === placeholderId ? { ...m, content: accumulated } : m
        ))
      },
      controller.signal
    )

    setIsStreaming(false)
    setStreamCanEndSession(sessionCanEnd)

    // [FB3] requestIdでDB側の重複チェック（saveCoachingMessage側で対応）
    await saveCoachingMessage(sessionId, "assistant", fullContent, nextTurn)
    setTurnNumber(nextTurn)
  } catch (error) {
    setIsStreaming(false)
    if (controller.signal.aborted) return
    setMessages(prev => prev.map(m =>
      m.id === placeholderId
        ? { ...m, content: m.content + "\n\n⚠️ エラーが発生しました" }
        : m
    ))
  } finally {
    abortControllerRef.current = null
  }
}

// ページ離脱時にAbort
useEffect(() => {
  return () => { abortControllerRef.current?.abort() }
}, [])
```

**C) META処理の変更:**
- 現在: `message.content.includes("[META:SESSION_CAN_END]")` でチェック
- 変更後: `streamCanEndSession` stateで管理。`removeMetadata()` は不要に

**D) ストリーム中のカーソル表示:**
- `isStreaming && message.content` が空でない場合、末尾にCSSカーソル点滅を表示

**E) フォールバック:**
- ストリーム途中失敗 → 部分テキスト＋エラー表示
- リトライ → 既存の非ストリーム `/api/reflect/message` で再試行

### 1-4. [FB3] 冪等性: coaching_messages の重複排除

**DB制約**: `UNIQUE(session_id, turn_number, role)` を追加（マイグレーション: `20260228000001_add_coaching_messages_idempotency.sql`）

`app/actions/reflect.ts` の `saveCoachingMessage()` を修正:

```typescript
export async function saveCoachingMessage(
  sessionId: string,
  role: "assistant" | "user",
  content: string,
  turnNumber: number
) {
  // 冪等性: UNIQUE(session_id, turn_number, role) によるDB制約
  // - assistant: ON CONFLICT DO NOTHING（ストリーミングリトライ時の重複防止）
  // - user: ON CONFLICT DO UPDATE（再送時に最新入力で上書き、UI/DB整合性を維持）
  const row = {
    session_id: Number(sessionId),
    role, content, turn_number: turnNumber,
    sent_at: new Date().toISOString(),
  }

  const { error } = await supabase
    .from("coaching_messages")
    .upsert(row, {
      onConflict: "session_id,turn_number,role",
      ignoreDuplicates: role === "assistant", // assistantのみDO NOTHING
    })

  if (error) {
    // UNIQUE制約未適用環境: upsert失敗時は通常insertにフォールバック
    const { error: insertError } = await supabase
      .from("coaching_messages")
      .insert(row)
    if (insertError) return { error: insertError.message }
  }

  return { success: true }
}
```

### 1-5. サマリー生成は変更なし

`generateReflectSummary()` は非ストリーミングのまま（出力が短く、体感メリットが小さい）。

---

## Phase 1.5: Gemini移行 + ゴールナビSSE化

### 背景・目的

- OpenAI GPT-4o-miniからGoogle Geminiへ移行し、コスト削減と速度向上を実現
- ゴールナビ対話にもSSEストリーミングを適用し、Reflectと同等のUXを提供
- 月額$10のGemini予算内で、用途別に最適なモデルを選定

### SDK

**`@google/genai`**（[googleapis/js-genai](https://github.com/googleapis/js-genai)）

- 旧SDK `@google/generative-ai` は非推奨。`@google/genai` がGemini 2.0+向け推奨ライブラリ
- AbortSignalは `GenerateContentConfig.abortSignal` でネイティブサポート（実装前提）
- Structured Output（JSON mode）のストリーミングもSDKレベルでサポート済み

参考:
- [Gemini SDK Libraries](https://ai.google.dev/gemini-api/docs/libraries)
- [JS SDK abortSignal](https://googleapis.github.io/js-genai/release_docs/interfaces/types.GenerateContentConfig.html)
- [Structured Output](https://ai.google.dev/gemini-api/docs/structured-output)

### モデル戦略: 用途別3層

| 用途 | モデル | 環境変数 | 理由 |
|------|--------|---------|------|
| **リアルタイム対話** | gemini-2.5-flash-lite | `AI_MODEL_REALTIME` | 最速・最安。ストリーミング体験を最大化 |
| **構造化出力（JSON）** | gemini-2.5-flash | `AI_MODEL_STRUCTURED` | JSON mode安定性。Lite/Proの中間 |
| **夜間バッチ生成** | gemini-2.5-flash（初期） | `AI_MODEL_BATCH` | A/Bテスト後にPro昇格を判断 |

**モデルID管理ルール:**
- コード内にモデルID文字列を直書きしない
- 環境変数（`.env`）を唯一の設定源とし、未定義時は `throw Error`
- 3系移行時は環境変数の変更のみで対応可能な構造にする

```typescript
// lib/llm/client.ts — モデルID直書き禁止
export function getRealtimeModel(): string {
  const model = process.env.AI_MODEL_REALTIME
  if (!model) throw new Error("AI_MODEL_REALTIME is not defined")
  return model
}
export function getBatchModel(): string {
  const model = process.env.AI_MODEL_BATCH
  if (!model) throw new Error("AI_MODEL_BATCH is not defined")
  return model
}
export function getStructuredModel(): string {
  const model = process.env.AI_MODEL_STRUCTURED
  if (!model) throw new Error("AI_MODEL_STRUCTURED is not defined")
  return model
}
```

**各モジュールのモデル割り当て:**

| ファイル | 用途 | モデル関数 |
|---------|------|-----------|
| reflect-coaching.ts（対話） | リアルタイム | `getRealtimeModel()` |
| goal-coaching.ts（Step 1-2対話） | リアルタイム | `getRealtimeModel()` |
| goal-coaching.ts（Step 3/思い生成） | 構造化JSON | `getStructuredModel()` |
| encouragement.ts（提案） | 構造化JSON | `getStructuredModel()` |
| coach-message.ts | 夜間バッチ | `getBatchModel()` |
| daily-status.ts | 夜間バッチ | `getBatchModel()` |
| weekly-analysis.ts | バッチ | `getBatchModel()` |
| coach-feedback.ts | バッチ | `getBatchModel()` |

**A/Bテスト計画（バッチモデル）:**
1. まず `weekly-analysis` と `coach-feedback` でFlash/Proを並行生成
2. 品質差が有意 → `coach-message`, `daily-status` にもPro適用
3. 差が小さい → Flash維持（月額 $2.81 → $0.38 の節約）

### モデルライフサイクル管理

| モデル | 最短停止日 | 後継 |
|--------|----------|------|
| gemini-2.5-flash-lite | 2026/7/22 | gemini-3.1-flash-lite-preview |
| gemini-2.5-flash | 2026/6/17 | gemini-3-flash-preview |
| gemini-2.5-pro | 未定 | gemini-3-pro（予想） |

参考: [Gemini Deprecations](https://ai.google.dev/gemini-api/docs/deprecations)

**移行トリガー:**

| 時期 | アクション |
|------|-----------|
| 2026/5末 | 3系 preview モデルの品質評価開始 |
| 3系 stable リリース時 | A/Bテスト実施（Reflect + 日次コーチ） |
| 2.5系停止2週間前 | 環境変数を3系に切替、動作確認 |

**注意:** Gemini 2.0系（2.0 Flash等）は2026/6/1停止予定のため新規採用しない。

### 月額コスト試算（15名運用）

| モデル | 月間コール | 入力トークン | 出力トークン | 月額 |
|--------|-----------|-------------|-------------|------|
| 2.5 Flash Lite（リアルタイム） | ~400回 | 400K | 200K | $0.12 |
| 2.5 Flash（構造化 + バッチ初期） | ~450回 | 450K | 225K | $0.70 |
| **合計** | | | | **$0.82/月** |

※ A/BテストでPro採用時は $2.93/月程度。いずれも$10予算内。

### API差異マッピング

```
OpenAI                              → Gemini (@google/genai)
──────────────────────────────────────────────────────────────
openai.chat.completions.create()    → model.generateContent()
stream: true + for await           → model.generateContentStream()
messages: [{role:"system",...}]     → systemInstruction + contents
role: "assistant"                   → role: "model"
response_format:{type:"json_object"} → generationConfig:{responseMimeType:"application/json"}
max_completion_tokens: 800          → generationConfig:{maxOutputTokens:800}
signal (第2引数options)              → GenerateContentConfig.abortSignal
```

### 運用安全網

#### Feature Flag

```env
# .env.local / .env.production.local
AI_PROVIDER=gemini          # "gemini" | "openai"
AI_MODEL_REALTIME=gemini-2.5-flash-lite
AI_MODEL_STRUCTURED=gemini-2.5-flash
AI_MODEL_BATCH=gemini-2.5-flash
GOOGLE_AI_API_KEY=...
OPENAI_API_KEY=...          # フォールバック用に残す
```

```typescript
// lib/llm/client.ts
export function getProvider(): "gemini" | "openai" {
  return (process.env.AI_PROVIDER as "gemini" | "openai") || "openai"
}
```

#### OpenAI即時フォールバック手順

1. Vercelダッシュボードで `AI_PROVIDER=openai` に変更
2. 再デプロイ（環境変数変更のみ、コード変更不要）
3. 全LLM呼び出しがOpenAI経由に復帰

#### ログルール

| 項目 | ログ可否 | 備考 |
|------|---------|------|
| requestId | ✅ 可 | トレーサビリティ |
| provider, model | ✅ 可 | メトリクス |
| TTFT, TTLB, エラー率 | ✅ 可 | パフォーマンス |
| turnNumber, weekType | ✅ 可 | コンテキスト |
| studentName, content | ❌ 不可 | **個人情報** |
| プロンプト全文 | ❌ 不可 | 開発時のみdebugレベル |
| エラーメッセージ | ✅ 可 | スタックトレースは本番マスク |

#### プロバイダ別メトリクス（Phase 2連携）

Langfuseトレースに以下を追加:
- `provider`: "gemini" | "openai"
- `model`: 実際のモデルID
- `perf_llm_ttft_ms`, `perf_llm_ttlb_ms`
- `token_count_input`, `token_count_output`
- `error_type`: タイムアウト / レート制限 / その他

### Phase 1.5a-1: プロバイダ抽象化

#### 変更対象ファイル

| ファイル | 操作 | 内容 |
|---------|------|------|
| `package.json` | 修正 | `@google/genai` 追加 |
| `lib/llm/client.ts` | **新規** | Gemini/OpenAI切替クライアント |
| `lib/llm/types.ts` | **新規** | プロバイダ共通型定義 |

#### 設計

```typescript
// lib/llm/types.ts
export interface LLMMessage {
  role: "system" | "user" | "assistant"
  content: string
}

export interface LLMGenerateOptions {
  model: string
  messages: LLMMessage[]
  maxOutputTokens?: number
  signal?: AbortSignal
  responseFormat?: "text" | "json"
}

export interface LLMStreamEvent {
  type: "delta" | "done" | "error"
  content: string
}
```

```typescript
// lib/llm/client.ts
import { GoogleGenAI } from "@google/genai"

let geminiClient: GoogleGenAI | null = null

export function getGeminiClient(): GoogleGenAI {
  if (!geminiClient) {
    const apiKey = process.env.GOOGLE_AI_API_KEY
    if (!apiKey) throw new Error("GOOGLE_AI_API_KEY is not defined")
    geminiClient = new GoogleGenAI({ apiKey })
  }
  return geminiClient
}

// 既存の getOpenAIClient() も残す（フォールバック用）
```

**注意:** `lib/openai/` は即座にリネームしない。`lib/llm/` にクライアント層を新設し、各モジュールが段階的に移行する。旧パスは全移行完了後に削除。

### Phase 1.5a-2: ReflectのみGemini化（feature flag）

#### 変更対象ファイル

| ファイル | 操作 | 内容 |
|---------|------|------|
| `lib/openai/reflect-coaching.ts` | 修正 | `getProvider()` で分岐、Gemini版ストリーム実装 |
| `app/api/reflect/message-stream/route.ts` | 軽微修正 | ログに `provider`, `model` 追加 |
| `app/api/reflect/message/route.ts` | 軽微修正 | 同上 |

#### 設計

```typescript
// lib/openai/reflect-coaching.ts
export async function* generateReflectMessageStream(
  context: ReflectContext,
  signal?: AbortSignal
): AsyncGenerator<StreamEvent> {
  const provider = getProvider()

  if (provider === "gemini") {
    yield* generateReflectMessageStreamGemini(context, signal)
  } else {
    yield* generateReflectMessageStreamOpenAI(context, signal)
  }
}

// Gemini版
async function* generateReflectMessageStreamGemini(
  context: ReflectContext,
  signal?: AbortSignal
): AsyncGenerator<StreamEvent> {
  const client = getGeminiClient()
  const model = getRealtimeModel()

  const response = await client.models.generateContentStream({
    model,
    config: {
      systemInstruction: getReflectSystemPrompt(),
      maxOutputTokens: 800,
      abortSignal: signal,
    },
    contents: [
      ...context.conversationHistory.map(msg => ({
        role: msg.role === "assistant" ? "model" : "user" as const,
        parts: [{ text: msg.content }],
      })),
      { role: "user", parts: [{ text: getReflectUserPrompt(context) }] },
    ],
  })

  let fullContent = ""
  for await (const chunk of response) {
    if (signal?.aborted) break
    const delta = chunk.text
    if (delta) {
      fullContent += delta
      yield { type: "delta", content: delta }
    }
  }

  if (signal?.aborted) return

  // META判定（既存ロジック流用）
  // ... 省略（Phase 1と同一）
  yield { type: "done", content: fullContent }
}
```

#### 検証

- `AI_PROVIDER=gemini` でReflect対話が動作すること
- `AI_PROVIDER=openai` で既存動作が維持されること（回帰テスト）
- 応答品質の比較（同一入力で両プロバイダの出力を目視確認）

### Phase 1.5a-3: 他モジュール段階移行

#### 変更対象ファイル

| ファイル | 操作 | 内容 |
|---------|------|------|
| `lib/openai/coach-message.ts` | 修正 | Gemini対応 + `getBatchModel()` |
| `lib/openai/daily-status.ts` | 修正 | Gemini対応 + `getBatchModel()` |
| `lib/openai/encouragement.ts` | 修正 | Gemini対応 + `getStructuredModel()` |
| `lib/openai/goal-coaching.ts` | 修正 | Gemini対応 + `getRealtimeModel()` / `getStructuredModel()` |
| `app/api/goal/simple-navigation/route.ts` | 修正 | 直接インスタンス化 → `lib/llm/client.ts` 集約 |
| `app/api/goal/simple-thoughts/route.ts` | 修正 | 同上 |
| `app/actions/weekly-analysis.ts` | 修正 | Gemini対応 + `getBatchModel()` |
| `app/actions/coach-feedback.ts` | 修正 | Gemini対応 + `getBatchModel()` |

#### 移行順序（リスク低→高）

1. **encouragement.ts** — 利用頻度低、JSON出力のテストケースとして最適
2. **goal-coaching.ts** — ゴールナビSSE（1.5b）の前提
3. **coach-message.ts** — 夜間cron、影響範囲が広いため最後寄り
4. **daily-status.ts** — 同上
5. **weekly-analysis.ts / coach-feedback.ts** — バッチ処理、A/Bテスト対象

#### JSON出力（Structured Output）の移行

ゴールナビStep 3（`generateGoalThoughts`）等のJSON出力は**非ストリーム固定**。

判断根拠（技術的制約ではなくUX判断）:
- **技術的**: GeminiはStructured Outputのストリーミングをサポートしている
- **UX的**: Step 3は「今回の思い」を一括生成→編集可能テキストエリアに転記する流れ。部分表示のUXメリットが薄い
- **実装複雑度**: JSON断片の結合・パース処理が追加負荷

```typescript
// JSON出力の例（非ストリーム）
const response = await client.models.generateContent({
  model: getStructuredModel(),
  config: {
    responseMimeType: "application/json",
    maxOutputTokens: 800,
  },
  contents: [...],
})
const parsed = JSON.parse(response.text)
// + zodバリデーション
```

### Phase 1.5b: ゴールナビSSE化（Full flow Step 1-2のみ）

#### 変更対象ファイル

| ファイル | 操作 | 内容 |
|---------|------|------|
| `lib/openai/goal-coaching.ts` | 修正 | `generateGoalNavigationMessageStream()` 追加 |
| `app/api/goal/navigation-stream/route.ts` | **新規** | SSEエンドポイント |
| `app/student/goal/goal-navigation-chat.tsx` | 修正 | ストリーム消費UI |

#### スコープ

| ステップ | Full flow | Simple flow | ストリーミング |
|---------|-----------|-------------|:------------:|
| Step 1（感情探索） | LLM生成 | LLM生成 | **Full のみ対応** |
| Step 2（予祝質問） | LLM生成 | 固定文 | **Full のみ対応** |
| Step 3（まとめ） | JSON出力 | 固定文 | 非対応（UX判断） |

**Simple flow は次PR（Phase 1.5c）へ分離。** 理由:
- Simple flowのStep 2-3は固定文（LLM不使用）でストリーミングの恩恵が薄い
- Step 1のみのストリーミングは投資対効果が低い
- Full flowで実績を積んでから適用範囲を拡大

#### 設計

Reflect版のSSEパターン（Heartbeat + AbortSignal + deltaバッチ更新）をそのまま流用:

```typescript
// lib/openai/goal-coaching.ts
export async function* generateGoalNavigationMessageStream(
  context: GoalNavigationContext,
  signal?: AbortSignal
): AsyncGenerator<StreamEvent> {
  // Reflectと同じプロバイダ分岐パターン
  // systemInstruction: getGoalNavigationSystemPrompt()
  // contents: conversationHistory + getGoalNavigationStepPrompt(context)
}
```

```typescript
// app/api/goal/navigation-stream/route.ts
// Reflect版 message-stream/route.ts と同構造:
// - zodバリデーション
// - サーバー側DB再構築（studentName）
// - SSE + Heartbeat + AbortSignal
// - requestIdログ
```

### Phase 1.5 完了条件

| 指標 | 成功基準 |
|------|---------|
| Reflect対話 | Geminiで既存と同等以上のUX（ストリーミング動作） |
| ゴールナビ対話 | Full flow Step 1-2でストリーミング動作 |
| 日次コーチ生成 | 生成成功率 > 99%、生成時間 < 30秒 |
| フォールバック | `AI_PROVIDER=openai` で全機能が即時復旧 |
| エラー率 | 切替後1週間でエラー率 < 1% |
| ビルド | `npm run build` 成功 |

#### ロールバック条件

- エラー率 > 5% が1時間継続 → 即時 `AI_PROVIDER=openai` に切替
- 生成品質への苦情が複数件 → A/Bテスト実施、結果次第で切替
- 特定モジュールのみ問題 → そのモジュールのみOpenAIに戻し、他は維持

---

## Phase 2: パフォーマンス計測

### 変更対象ファイル

| ファイル | 操作 | 内容 |
|---------|------|------|
| `lib/utils/perf-timer.ts` | **新規** | 計測ユーティリティ |
| `app/api/reflect/message-stream/route.ts` | 修正 | 計測ポイント追加 |
| `lib/langfuse/trace-helpers.ts` | 修正 | `performanceMetrics` パラメータ追加 |
| `lib/langfuse/constants.ts` | 修正 | パフォーマンスメタデータキー追加 |

### 2-1. PerfTimerユーティリティ

```typescript
// lib/utils/perf-timer.ts
export class PerfTimer {
  private marks = new Map<string, number>()
  private durations = new Map<string, number>()

  mark(name: string) { this.marks.set(name, performance.now()) }

  measure(name: string, startMark: string): number {
    const start = this.marks.get(startMark)!
    const duration = performance.now() - start
    this.durations.set(name, duration)
    return duration
  }

  toMetadata(): Record<string, number> {
    const result: Record<string, number> = {}
    this.durations.forEach((v, k) => { result[`perf_${k}_ms`] = Math.round(v) })
    return result
  }
}
```

### 2-2. 計測ポイント

```
[request_start]
  → auth + DB student fetch
[db_done] → perf_db_ms
  → prompt build
[prompt_done] → perf_prompt_build_ms
  → LLM generateContentStream()
[first_token] → perf_llm_ttft_ms
  → ... streaming ...
[last_token] → perf_llm_ttlb_ms
  → META判定 + done送信
[response_done] → perf_total_ms
```

閾値は固定値ではなくP50/P95分布で管理。まず実測データを蓄積してからアラートを設定。

### 2-3. Langfuse連携

`lib/langfuse/trace-helpers.ts`:
```typescript
export async function createCoachingMessageTrace(
  messageId: string,
  userId: string,
  input: string,
  output: string,
  cacheHit: boolean = false,
  performanceMetrics?: Record<string, number>  // 追加
): Promise<string | null> {
  // metadata: { cache_hit: cacheHit, ...performanceMetrics }
}
```

`lib/langfuse/constants.ts`:
```typescript
export const METADATA_KEYS = {
  // 既存...
  PERF_DB_MS: "perf_db_ms",
  PERF_PROMPT_BUILD_MS: "perf_prompt_build_ms",
  PERF_LLM_TTFT_MS: "perf_llm_ttft_ms",
  PERF_LLM_TTLB_MS: "perf_llm_ttlb_ms",
  PERF_TOTAL_MS: "perf_total_ms",
} as const
```

---

## Phase 3: 長期メモリ要約テーブル

### 変更対象ファイル

| ファイル | 操作 | 内容 |
|---------|------|------|
| `supabase/migrations/YYYYMMDD_create_student_memory_summaries.sql` | **新規** | テーブル作成 |
| `lib/llm/memory-generator.ts` | **新規** | SQL集計→LLM要約の2段パイプライン |
| `lib/memory/student-memory.ts` | **新規** | メモリ取得関数 |
| `app/api/cron/update-student-memory/route.ts` | **新規** | 週次フル更新Cron |
| `app/api/cron/update-student-memory-daily/route.ts` | **新規** | [FB3] 日次差分更新Cron |

### 3-1. DBスキーマ（ユーザー承認後に実行）

```sql
CREATE TABLE IF NOT EXISTS public.student_memory_summaries (
  id BIGSERIAL PRIMARY KEY,
  student_id BIGINT NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,

  -- 構造化メモリ（JSONB）
  subject_trends JSONB,           -- 科目別トレンド（8週分）
  stumbling_patterns JSONB,       -- つまずきパターン
  effective_encouragements JSONB, -- 効果的な励まし方
  recent_successes JSONB,         -- 最近の成功体験
  emotional_tendencies JSONB,     -- テスト前の感情傾向

  -- テキスト要約
  compact_summary TEXT,           -- 日次コーチ用（200-500トークン）
  detailed_summary TEXT,          -- Reflect用（500-1000トークン）

  -- [FB3] 日次差分用
  last_study_log_id BIGINT,      -- 最後に処理したstudy_logsのID（差分検知用）

  -- メタデータ
  data_window_start DATE,
  data_window_end DATE,
  weeks_covered INTEGER DEFAULT 0,
  last_generated_at TIMESTAMPTZ,
  last_delta_at TIMESTAMPTZ,     -- [FB3] 最後の差分更新日時
  generation_version INTEGER DEFAULT 1,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (student_id)
);

-- RLS略（生徒=自分のみ、指導者=担当生徒、管理者=全て）
```

### 3-2. メモリ生成: SQL集計→LLM要約の2段パイプライン

`lib/llm/memory-generator.ts`（Phase 1.5a完了後のパス）:

```
Step 1: SQL集計（DBレイヤーで圧縮）
  ├─ 科目×週の正答率集計（8週分 → 4科目×8行 = 32行）
  ├─ coaching_sessions.summary_text 直近8件
  ├─ weekly_analysis の strengths/challenges 直近8件
  └─ 合計: 約1000-2000トークンの構造化テキスト

Step 2: LLM要約（圧縮済み素材 → 要約テキスト）
  ├─ compact_summary: 日次コーチ用（200-500トークン）
  ├─ detailed_summary: Reflect用（500-1000トークン）
  └─ 各JSONBフィールド
```

### 3-3. メモリ取得関数

`lib/memory/student-memory.ts`:
```typescript
export async function getCompactMemory(studentId: number): Promise<string | null>
export async function getDetailedMemory(studentId: number): Promise<string | null>
export async function getStructuredMemory(studentId: number): Promise<StudentMemory | null>
```

### 3-4. [FB3] 更新トリガー: 週次フル + 日次差分の2層構成

**週次フル更新** (`app/api/cron/update-student-memory/route.ts`):
- 月曜 2:00 AM JST
- 全アクティブ生徒の `student_memory_summaries` をフル再生成（8週分のSQL集計→LLM要約）
- `generation_version` をインクリメント

**[FB3] 日次差分更新** (`app/api/cron/update-student-memory-daily/route.ts`):
- 毎日 3:30 AM JST（日次コーチメッセージ生成Cronの後）
- `last_study_log_id` 以降の新規学習ログがある生徒のみ対象
- **compact_summary のみ更新**（detailed_summaryは週次で十分）
- LLMは呼ばず、SQL集計の差分を既存compact_summaryに追記するルールベース更新
  - 例: 「[2/27] 算数82% 国語75%」のような1行追記
  - compact_summaryが500トークンを超えたら古い差分行を削除

```
更新頻度の設計:

週次フル (月曜2:00AM)     日次差分 (毎日3:30AM)
─────────────────────    ─────────────────────
compact_summary: ○        compact_summary: ○ (追記のみ)
detailed_summary: ○       detailed_summary: × (変更なし)
JSONB fields: ○           JSONB fields: × (変更なし)
LLM呼び出し: ○           LLM呼び出し: × (ルールベース)
```

**この設計の利点:**
- 「分かってる感」が日次で最新化される（昨日の学習が今日のコーチに反映）
- 日次更新はLLM不要でコストゼロ
- Serverlessでの途中落ちリスクなし（cronのみ）

---

## Phase 4: 日次とReflectのメモリ分離

### 変更対象ファイル

| ファイル | 操作 | 内容 |
|---------|------|------|
| `lib/openai/coach-message.ts` | 修正 | `CoachMessageContext`に`longTermMemory`追加 |
| `lib/openai/reflect-coaching.ts` | 修正 | `ReflectContext`に`longTermMemory`+`structuredMemory`追加 |
| `app/actions/dashboard.ts` | 修正 | メモリ取得をPromise.allに追加 |
| `app/api/reflect/message-stream/route.ts` | 修正 | メモリ注入追加 |
| `app/api/cron/generate-coach-messages/route.ts` | 修正 | メモリ取得追加 |

### 4-1. メモリ文脈の使い分け

| 文脈 | 日次コーチ | Reflect |
|------|-----------|---------|
| 直近3日の学習記録 | Yes (主要) | Yes (参考) |
| 今週の累積進捗 | Yes | Yes |
| 最新目標/Will | Yes | Yes |
| 今日のミッション | Yes | No |
| **compact_summary (〜300トークン)** | **Yes** | No |
| **detailed_summary (〜750トークン)** | No | **Yes** |
| **構造化メモリ (JSONB)** | No | **Yes** |
| 2週間の科目別推移 | No | **Yes** |
| 会話履歴 | N/A | Yes |

### 4-2. プロンプト注入

**日次コーチ** (`coach-message.ts` のシステムプロンプトに追加):
```
【長期的な学習傾向】
{compact_summary}
```

**Reflect** (`reflect-coaching.ts` のシステムプロンプトに追加):
```
【生徒の長期的な学習プロフィール】
{detailed_summary}

この情報を踏まえて、過去の経験を参照した個別具体的な質問・励ましを行ってください。
```

### 4-3. Reflectルートのメモリ注入

Phase 1でサーバー側エンリッチメント構造は構築済み。Phase 4では `Promise.all` にメモリ取得を追加:

```typescript
const [student, detailedMemory] = await Promise.all([
  supabase.from("students").select("id, name, grade, course").eq("user_id", auth.userId).single(),
  getDetailedMemory(studentId),
])
```

---

## 依存関係と実装順序

```
Phase 1 ✅ (Reflectストリーミング)
  ↓
Phase 1.5a-1 (プロバイダ抽象化)
  ↓
Phase 1.5a-2 (ReflectのみGemini化)
  ↓
Phase 1.5a-3 (他モジュール段階移行)
  ↓
Phase 1.5b (ゴールナビSSE化) ← 1.5a-3のgoal-coaching.ts移行が前提
  ↓
Phase 2 (計測) ← プロバイダ別メトリクスを含む
  ↓ (独立)
Phase 3 (メモリテーブル + Cron) → Phase 4 (文脈分離)
```

**実行順**: Phase 1 ✅ → 1.5a-1 → 1.5a-2 → 1.5a-3 → 1.5b → Phase 2 → Phase 3 → Phase 4

---

## 検証方法

### Phase 1
- [ ] Reflect画面でトークンが逐次表示される
- [ ] 50msバッチ更新でちらつきがない
- [ ] ブラウザバック/ページ遷移でストリームが停止（DevTools Network確認）
- [ ] Heartbeatで長時間接続が切断されない
- [ ] クライアントからstudentNameを改竄してもDB値が使われる
- [ ] `runtime = "nodejs"` で実行環境が固定されている
- [ ] 「この内容で完了する」ボタンがストリーム完了後に表示
- [ ] ストリーム途中エラーで部分メッセージ＋エラー表示
- [ ] `coaching_messages` に完全なメッセージが保存される
- [ ] リトライ時に同一turnの二重保存が発生しない
- [ ] turnNumberが正しくインクリメント

### Phase 1.5a（Gemini移行）
- [ ] `AI_PROVIDER=gemini` でReflect対話がストリーミング動作する
- [ ] `AI_PROVIDER=openai` で既存動作が維持される（回帰テスト）
- [ ] 日次コーチメッセージがGeminiで正常生成される（cron実行確認）
- [ ] JSON出力（ゴールナビStep 3、応援提案）が正常パースされる
- [ ] AbortSignalでクライアント離脱時にストリームが停止する
- [ ] ログに `provider`, `model` が記録される（個人情報は含まない）
- [ ] `simple-navigation/route.ts` の直接インスタンス化が `lib/llm/client.ts` に集約されている
- [ ] 環境変数未定義時に明確なエラーメッセージが出る
- [ ] `npm run build` 成功

### Phase 1.5b（ゴールナビSSE）
- [ ] Full flow Step 1-2でトークンが逐次表示される
- [ ] Step 3（JSON出力）は非ストリームで正常動作する
- [ ] 50msバッチ更新でちらつきがない
- [ ] zodバリデーション + サーバー側DB再構築が適用されている
- [ ] Simple flowは変更なし（既存動作を維持）

### Phase 2
- [ ] Langfuseダッシュボードで `perf_*` メタデータが確認できる
- [ ] P50/P95分布で実測値を確認
- [ ] プロバイダ別（gemini/openai）のTTFT/TTLBが比較できる

### Phase 3
- [ ] マイグレーション適用成功
- [ ] テスト生徒でメモリ生成が動作
- [ ] SQL集計が適切に圧縮されている
- [ ] compact_summary ≤ 500トークン、detailed_summary ≤ 1000トークン
- [ ] 同じ生徒で再実行するとupsert
- [ ] 日次差分更新が新規ログのある生徒のみ対象
- [ ] `completeCoachingSession()` にメモリ更新コードがないこと

### Phase 4
- [ ] 日次コーチメッセージにcompact_summaryが反映
- [ ] Reflect対話にdetailed_summaryが反映
- [ ] メモリなし生徒でも正常動作
- [ ] `npm run build` が成功
