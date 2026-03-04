# AIコーチング改善 実装計画（v6.1）

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
| **1.5a-1** | プロバイダ抽象化 (`lib/llm/`) | ✅ 完了 |
| **1.5a-2** | ReflectのみGemini化 (feature flag) | ✅ 完了（P0/P1修正込み） |
| **1.5a-3** | 他モジュール段階移行 | ✅ 完了 |
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
11. **モデル戦略**: 用途別3層（2.5 Flash Lite / 2.5 Flash / 2.5 Pro）~~、A/Bテストで品質検証~~ → v6でKPI週次監視に変更
12. **段階移行**: 一括ではなく Reflect先行 → 他機能段階移行（障害切り分け容易）
13. **運用安全網**: feature flag、OpenAIフォールバック、ログルール定義
14. **3系移行計画**: 2.5系停止に備えた移行トリガー日を事前設定
15. **JSON非ストリーム判断**: 技術的制約ではなくUX判断として明記

### v5 (FB4: 技術監査第4回)
16. **gemini-2.5-pro停止日修正**: 「未定」→ 2026/6/17（公式ドキュメント確認済み）
17. **モジュール単位ロールバック**: `AI_PROVIDER` グローバル + `AI_PROVIDER_<MODULE>` オーバーライドの2層構造に変更。矛盾を解消
18. **Phase 4パス整合性**: `lib/openai/*` → `lib/llm/*` への移行注記を追加
19. **PIIマスキングのコード強制**: `sanitizeForLog()` ユーティリティの設計を追加（ドキュメントルールだけでなくコードで防止）
20. **AbortSignalコスト影響**: コスト試算にAbort時のトークン節約効果を追記
21. ~~**A/Bテスト昇格基準の定量化**~~: → v6でA/Bテスト自体を廃止

### v6 (FB5: 運用方針変更)
22. **A/Bテスト廃止 → Pro即時採用**: 20名規模でA/Bの投資対効果が見合わない。夜間バッチ（自然文）は初期からPro
23. **JSON出力はFlash維持**: 構造化出力はパース安定性が重要。Proの自然文品質向上は活きない
24. **月次トークン上限アラート**: $8（80%）で警告、$9.50（95%）で自動Flash切替
25. **品質KPI（週次）**: 再生成率・手動修正率・苦情件数・生成成功率の4指標で運用監視
26. **コスト試算を20名・Pro込みに更新**: $3.34/月（$10予算の33%）

### v6.1 (FB6: 技術監査第6回)
27. **A/B残存文言の一掃**: ロールバック条件・v4履歴のA/B言及をKPIベースに統一
28. **モデル停止日を「earliest」形式に統一**: 一次情報（Google公式）の表記に準拠。日付確定まで月単位管理
29. **コストガードのヒステリシス追加**: ダウングレード$9.50/復帰$7.00、月内再復帰なし（フラッピング防止）
30. **sanitizeForLog()を再帰対応に**: ネスト・配列を再帰走査、MAX_DEPTH=5で無限再帰防止
31. **Phase 1.5運用時の手動運用を明記**: Phase 2実装前は自動切替なし、週次目視確認

### Phase 1.5a-2 技術監査修正 (P0/P1)
32. **sanitizeForLog()適用拡大**: reflect-coaching.ts全console.error + Route Handler側console.errorにも適用
33. **getModelForModule() try-catch**: Route Handlerで例外を捕捉し、LLM設定不備時にも制御されたエラーを返却
34. **Gemini連続userロール回避**: `buildGeminiContents()` ヘルパーでstream/non-stream統一。末尾がuserの場合はpartsを結合
35. **chunk.text delta検証**: E2Eテスト時に `GOOGLE_AI_API_KEY` を設定し、Geminiストリーミングで `chunk.text` が期待通り空文字列/nullを返すケースがないか手動確認すること（自動テスト化はPhase 2以降）

### Phase 1.5a-3 全モジュールGemini段階移行
36. **gemini-utils.ts共有化**: `toGeminiContents()` (基盤) + `buildGeminiContents()` (末尾追加) を `lib/llm/gemini-utils.ts` に抽出。goal-coaching含む全モジュールで共有
37. **coach-message.ts**: dispatcher + OpenAI/Gemini private関数パターン。module=coach, tier=batch
38. **daily-status.ts**: インラインprovider分岐（キャッシュ後）。handleOpenAIError → generic置換
39. **weekly-analysis.ts**: `generateAnalysisContent()` 共通ヘルパー抽出。2関数で共用
40. **goal-coaching.ts**: 多ターン対話（`toGeminiContents()` 使用）+ JSON出力（responseMimeType）
41. **encouragement.ts**: JSON出力 + キャッシュ。2関数（messages/suggestions）のprovider分岐
42. **coach-feedback.ts**: `callLLM()` ヘルパー方式。module=coach, tier=**realtime**（AbortController タイムアウト5-8秒のユーザー待機型のため。batch tierは不適切）。Langfuse metadata に provider 追加
43. **simple-navigation/simple-thoughts route**: `new OpenAI()` 直接使用を `getOpenAIClient()`/`getGeminiClient()` に置換
44. **sanitizeForLog()**: 全変更ファイルの console.error に漏れなく適用（認証/DB/バリデーションエラー含む）
45. **getDefaultModel() 廃止**: 全変更モジュールで `getModelForModule()` の戻り値 `model` に統一。モデル選択の単一責務を確保

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
- 月額$10のGemini予算内（20名運用）で、用途別に最適なモデルを選定

### SDK

**`@google/genai`**（[googleapis/js-genai](https://github.com/googleapis/js-genai)）

- 旧SDK `@google/generative-ai` は非推奨。`@google/genai` がGemini 2.0+向け推奨ライブラリ
- AbortSignalは `GenerateContentConfig.abortSignal` でネイティブサポート（実装前提）
- Structured Output（JSON mode）のストリーミングもSDKレベルでサポート済み

参考:
- [Gemini SDK Libraries](https://ai.google.dev/gemini-api/docs/libraries)
- [JS SDK abortSignal](https://googleapis.github.io/js-genai/release_docs/interfaces/types.GenerateContentConfig.html)
- [Structured Output](https://ai.google.dev/gemini-api/docs/structured-output)

### モデル戦略: 用途別3層（Pro即時採用方針）

| 用途 | モデル | 環境変数 | 理由 |
|------|--------|---------|------|
| **リアルタイム対話** | gemini-2.5-flash-lite | `AI_MODEL_REALTIME` | 最速・最安。ストリーミング体験を最大化 |
| **構造化出力（JSON）** | gemini-2.5-flash | `AI_MODEL_STRUCTURED` | JSON厳格出力はFlash維持。パース安定性優先 |
| **夜間バッチ生成（自然文）** | gemini-2.5-pro | `AI_MODEL_BATCH` | 初期からPro採用。自然文の品質を最大化 |

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

| ファイル | 用途 | 出力形式 | モデル関数 |
|---------|------|---------|-----------|
| reflect-coaching.ts（対話） | リアルタイム | 自然文 | `getRealtimeModel()` |
| goal-coaching.ts（Step 1-2対話） | リアルタイム | 自然文 | `getRealtimeModel()` |
| goal-coaching.ts（Step 3/思い生成） | 構造化JSON | JSON | `getStructuredModel()` |
| encouragement.ts（提案） | 構造化JSON | JSON | `getStructuredModel()` |
| coach-message.ts | 夜間バッチ | **自然文** | `getBatchModel()` → **Pro** |
| daily-status.ts | 夜間バッチ | **自然文** | `getBatchModel()` → **Pro** |
| weekly-analysis.ts | バッチ | **自然文** | `getBatchModel()` → **Pro** |
| coach-feedback.ts | バッチ | **自然文** | `getBatchModel()` → **Pro** |

**モデル選定方針（A/Bテスト不要）:**

20名規模・月額$10固定のため、A/Bテストの投資対効果が見合わない。以下の方針で即時運用開始:

- **自然文生成 → Pro**: コーチメッセージ・分析・フィードバックは品質が直接UXに影響。初期からPro
- **JSON厳格出力 → Flash維持**: パース安定性が重要であり、Proの自然文品質向上は活きない
- **緊急時フォールバック**: `AI_MODEL_BATCH` の環境変数を `gemini-2.5-flash` に変更するだけでFlashに即時切替可能

**品質KPI（週次モニタリング）:**

A/Bテストの代わりに、運用中の品質を週次で確認:

| 指標 | 測定方法 | 警告閾値 |
|------|---------|---------|
| **再生成率** | cron再実行の発生頻度（エラーによるリトライ） | > 5%/週 |
| **手動修正率** | 指導者がコーチメッセージを手動で書き換えた件数 | > 20%/週 |
| **苦情件数** | 生徒・保護者からの「コーチの言葉が変」等の報告 | ≥ 2件/週 |
| **生成成功率** | LLM呼び出しの正常完了率 | < 98% |

**品質劣化時のアクション:**
1. 警告閾値を超えた場合 → 生成ログを確認し原因特定
2. Pro固有の問題と判断 → `AI_MODEL_BATCH=gemini-2.5-flash` に一時切替
3. 2週間以内に改善しない場合 → Flash固定に方針変更

**月次トークン上限アラート:**

| 項目 | 設定値 |
|------|-------|
| **月次予算上限** | $10（API全体） |
| **警告閾値（80%）** | $8/月到達時にSlack/メール通知 |
| **緊急閾値（95%）** | $9.50/月到達時にバッチモデルをFlashにダウングレード |
| **復帰タイミング** | **翌月1日にPro復帰**（月内復帰なし） |
| **確認方法** | Google AI Studio の Usage ダッシュボード（週次確認） |

**フラッピング防止（ヒステリシス）:**
- ダウングレード: 月額 ≥ $9.50 → Flash切替
- 復帰: **翌月1日に自動でPro復帰**（月内復帰は一切行わない）
- これにより、月末の$9前後での頻繁なFlash⇔Pro切替（フラッピング）を完全に防止

##### Phase 1.5運用時（手動）

Phase 2実装前はコストガード自動化なし。以下の手動運用で対応:

- Google AI Studioを**週次**で目視確認
- $8超過時は手動で `AI_MODEL_BATCH=gemini-2.5-flash` に変更（Vercel環境変数）
- 翌月1日に `AI_MODEL_BATCH=gemini-2.5-pro` に手動で戻す

##### Phase 2以降（自動化）

Phase 2のパフォーマンス計測基盤と合わせて自動化:

```typescript
// lib/llm/cost-guard.ts（Phase 2で実装）
// Langfuseのトークンカウントを月次集計し、上限に近づいたら
// getBatchModel() の返却値を自動的にFlashに切り替える
// ルール: downgrade=$9.50, 月内復帰なし, 翌月1日にPro復帰
```

### モデルライフサイクル管理

| モデル | 最短停止時期 | 後継 |
|--------|------------|------|
| gemini-2.5-flash-lite | earliest 2026年7月 | gemini-3.1-flash-lite-preview |
| gemini-2.5-flash | earliest 2026年6月 | gemini-3-flash-preview |
| gemini-2.5-pro | earliest 2026年6月 | gemini-3-pro（予想） |

※ 「earliest」はGoogleの公式表記。実際の停止日はGoogleが別途告知する。日付が確定するまでは月単位で管理し、確定次第この表を更新する。

参考: [Gemini Deprecations](https://ai.google.dev/gemini-api/docs/deprecations)（一次情報）

**移行トリガー:**

| 時期 | アクション |
|------|-----------|
| 2026/5末 | 3系 preview モデルの品質評価開始（少数生徒で目視確認） |
| 3系 stable リリース時 | 環境変数を3系に切替、1週間モニタリング |
| 2.5系停止2週間前 | 全モジュールを3系に切替完了、動作確認 |

**注意:** Gemini 2.0系（2.0 Flash等）は2026/6/1停止予定のため新規採用しない。

### 月額コスト試算（20名運用・Pro即時採用）

| モデル | 用途 | 月間コール | 入力トークン | 出力トークン | 月額 |
|--------|------|-----------|-------------|-------------|------|
| 2.5 Flash Lite | リアルタイム対話 | ~530回 | 530K | 265K | $0.16 |
| 2.5 Flash | 構造化JSON出力 | ~200回 | 200K | 100K | $0.18 |
| 2.5 Pro | 夜間バッチ（自然文） | ~400回 | 400K | 200K | $3.00 |
| **合計** | | | | | **$3.34/月** |

※ $10予算の33%。余裕あり。緊急時にバッチをFlashに切替えると$0.52/月まで低下。

**AbortSignalによるコスト節約効果:**
- クライアント離脱（ブラウザバック・ページ遷移）時にLLM生成を即停止
- ストリーミングの場合、Abort後の未生成トークンは課金されない
- リアルタイム対話（Reflect/ゴールナビ）で推定5-10%のトークン節約
  - 20名×月40回の対話のうち、途中離脱率を10%、平均残存50%と仮定 → 月約$0.01-0.05の節約
- 金額は小さいが、レスポンス未使用分のAPIコスト漏れを構造的に防止する意義がある

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

#### Feature Flag（グローバル + モジュール単位オーバーライド）

```env
# .env.local / .env.production.local

# グローバルプロバイダ（デフォルト）
AI_PROVIDER=gemini          # "gemini" | "openai"

# モジュール単位オーバーライド（省略時はAI_PROVIDERを使用）
# 特定モジュールのみOpenAIにロールバックしたい場合に設定
# AI_PROVIDER_REFLECT=openai
# AI_PROVIDER_GOAL=openai
# AI_PROVIDER_COACH=openai
# AI_PROVIDER_BATCH=openai

AI_MODEL_REALTIME=gemini-2.5-flash-lite
AI_MODEL_STRUCTURED=gemini-2.5-flash
AI_MODEL_BATCH=gemini-2.5-pro           # 自然文品質優先。緊急時は gemini-2.5-flash に変更
GOOGLE_AI_API_KEY=...
OPENAI_API_KEY=...          # フォールバック用に残す
```

```typescript
// lib/llm/client.ts（実装版: Phase 1.5a-1 技術監査反映済み）
import type { LLMProvider, LLMModule } from "./types"

export function getProvider(module?: LLMModule): LLMProvider {
  if (module) {
    const envKey = `AI_PROVIDER_${module.toUpperCase()}`
    const raw = process.env[envKey]
    if (raw !== undefined) {
      const trimmed = raw.trim().toLowerCase()
      if (trimmed === "gemini" || trimmed === "openai") return trimmed
      throw new Error(`${envKey}="${raw}" is invalid. Expected "gemini" or "openai"`)
    }
  }
  const raw = process.env.AI_PROVIDER
  if (raw !== undefined) {
    const trimmed = raw.trim().toLowerCase()
    if (trimmed === "gemini" || trimmed === "openai") return trimmed
    throw new Error(`AI_PROVIDER="${raw}" is invalid. Expected "gemini" or "openai"`)
  }
  return "openai"  // 未設定時のみフォールバック
}
```

**設計意図:**
- `AI_PROVIDER` は全モジュール共通のデフォルト
- `AI_PROVIDER_REFLECT` 等のモジュール別変数で、障害発生モジュールのみOpenAIに戻せる
- 通常運用ではモジュール別変数は未設定（グローバルに従う）
- 各呼び出し箇所で `getProvider("reflect")` のようにモジュール名を渡す

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
| エラーメッセージ | ⚠️ 条件付き | `sanitizeForLog()` 経由でマスク（プロンプトエコー防止）。`name`, `status`, `code` は保持 |

#### PIIマスキング（コード強制）

ドキュメント上のルールに加え、コードレベルでPII漏洩を防止:

```typescript
// lib/llm/logger.ts
const PII_FIELDS = new Set(["studentName", "content", "full_name", "email"])
const MAX_DEPTH = 5  // 深さ制限

export function sanitizeForLog(obj: unknown): unknown {
  const seen = new WeakSet()  // サイクル参照検出

  function walk(value: unknown, depth: number): unknown {
    if (depth > MAX_DEPTH || value === null || value === undefined) return value
    if (typeof value !== "object") return value

    // サイクル参照を検出したら "[Circular]" で打ち切り
    if (seen.has(value as object)) return "[Circular]"
    seen.add(value as object)

    // 配列: 各要素を再帰的にサニタイズ
    if (Array.isArray(value)) {
      return value.map(item => walk(item, depth + 1))
    }

    // オブジェクト: PIIフィールドをマスク + ネストを再帰
    const sanitized: Record<string, unknown> = {}
    for (const [key, v] of Object.entries(value)) {
      if (PII_FIELDS.has(key)) {
        sanitized[key] = "[REDACTED]"
      } else {
        sanitized[key] = walk(v, depth + 1)
      }
    }
    return sanitized
  }

  return walk(obj, 0)
}
```

**仕様:**
- ネストされたオブジェクト・配列を再帰的に走査し、全階層のPIIフィールドをマスク
- `WeakSet` でサイクル参照を検出し `"[Circular]"` で安全に打ち切り
- `MAX_DEPTH = 5` で深いネストも制限（通常のコンテキストは3階層以内）
- 全LLM呼び出しのログ出力箇所で `sanitizeForLog()` を経由（Phase 1.5a-2以降で段階適用。Phase 1.5a-1では関数定義+テストのみ）
- `console.error` に渡す前にコンテキスト情報をサニタイズ
- 開発環境（`NODE_ENV=development`）では生データ表示可能にするオプション付き
- Phase 2のLangfuseトレースにも同じサニタイズを適用

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
| `package.json` | 修正 | `@google/genai`, `server-only` 追加 + `engines: >=20` |
| `lib/llm/types.ts` | **新規** | プロバイダ共通型定義（`LLMMessage`, `LLMGenerateOptions`, `LLMStreamEvent`） |
| `lib/llm/client.ts` | **新規** | Gemini/OpenAI切替クライアント（`import "server-only"` ガード付き） |
| `lib/llm/logger.ts` | **新規** | PIIマスキング（`sanitizeForLog`）。呼び出し元はPhase 1.5a-2以降で追加 |
| `.env.example` | 修正 | Gemini関連環境変数セクション追加 |
| `.nvmrc` | **新規** | Node 22指定（`@google/genai` が Node>=20 を要求） |
| `lib/llm/__tests__/` | **新規** | `getProvider`, `getModel`, `sanitizeForLog` ユニットテスト |

#### 設計

```typescript
// lib/llm/types.ts
export type LLMProvider = "gemini" | "openai"
export type LLMModule = "reflect" | "goal" | "coach" | "batch"
export type ModelTier = "realtime" | "structured" | "batch"

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

// "meta" はSSEセッション制御用（Phase 1のSESSION_CAN_ENDなど）
export interface LLMStreamEvent {
  type: "delta" | "done" | "meta" | "error"
  content: string
}
```

```typescript
// lib/llm/client.ts
import "server-only"
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

// getProvider(): 不正値はthrow（サイレントフォールバック防止）
// getModel(provider, tier): プロバイダ連動でモデルID取得
// getModelForModule(module, tier): モジュール→プロバイダ→モデルの一括解決

// 既存の getOpenAIClient() も残す（フォールバック用）
```

```typescript
// lib/llm/logger.ts — PIIマスキング
// 再帰スタック方式でサイクル検出（共有参照は正常にコピー）
// MAX_DEPTH超過時は "[MAX_DEPTH]" に安全打ち切り
// 呼び出し元: Phase 1.5a-2以降で各モジュールのLLMログ出力箇所に追加
export function sanitizeForLog(obj: unknown): unknown { /* ... */ }
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
  const provider = getProvider("reflect")  // モジュール単位オーバーライド対応

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
5. **weekly-analysis.ts / coach-feedback.ts** — バッチ処理（Pro使用）

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

- **全面ロールバック**: エラー率 > 5% が1時間継続 → `AI_PROVIDER=openai` で全モジュールをOpenAIに切替
- **品質問題**: 週次KPI（再生成率 > 5%、手動修正率 > 20%、苦情 ≥ 2件のいずれか）が2週連続で超過 → 該当モジュールをOpenAIに切替し原因調査
- **モジュール単位ロールバック**: 特定モジュールのみ問題 → `AI_PROVIDER_REFLECT=openai` 等でそのモジュールのみOpenAIに戻し、他はGemini維持（グローバル `AI_PROVIDER` は変更しない）

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

> **注意:** 以下のファイルパス `lib/openai/*` はPhase 1.5a完了後に `lib/llm/` 配下に移行済みの想定。実装時点での実際のパスに読み替えること。Phase 1.5aの移行順序（1.5a-1で抽象化層作成→1.5a-2/3で各モジュール移行）により、Phase 4実装時には `lib/openai/` はもう存在しない。

### 変更対象ファイル

| ファイル | 操作 | 内容 |
|---------|------|------|
| `lib/openai/coach-message.ts` → `lib/llm/coach-message.ts` | 修正 | `CoachMessageContext`に`longTermMemory`追加 |
| `lib/openai/reflect-coaching.ts` → `lib/llm/reflect-coaching.ts` | 修正 | `ReflectContext`に`longTermMemory`+`structuredMemory`追加 |
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
- [ ] `AI_PROVIDER_REFLECT=openai` でReflectのみOpenAIに戻せる（モジュール単位ロールバック）
- [ ] 日次コーチメッセージがGemini Pro（`AI_MODEL_BATCH`）で正常生成される
- [ ] JSON出力（ゴールナビStep 3、応援提案）がFlash（`AI_MODEL_STRUCTURED`）で正常パースされる
- [ ] AbortSignalでクライアント離脱時にストリームが停止する
- [ ] ログに `provider`, `model` が記録される（`sanitizeForLog()` でPII除外）
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
- [ ] 月次トークン上限アラートが$8到達時に通知される
- [ ] 品質KPI（再生成率・手動修正率・苦情件数・生成成功率）が週次で確認可能

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
