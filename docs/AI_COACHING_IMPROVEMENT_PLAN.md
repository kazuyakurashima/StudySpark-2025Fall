# AIコーチング改善 4フェーズ実装計画（v3 Final）

> **ステータス**: 実装準備完了
> **ブランチ**: `feature/ai-coaching-streaming`
> **最終更新**: 2026-02-27

## Context

StudySparkの振り返り（Reflect）AI対話は現在非ストリーミングで、ユーザーが2-5秒間「考え中...」を見続ける。また、AIコーチには長期的な生徒理解がなく、毎回短期データのみで応答している。本計画では、体感速度の改善→計測基盤→長期メモリ→文脈分離の順に段階的に改善する。

---

## 進捗トラッカー

| Phase | タスク | ステータス |
|-------|-------|-----------|
| **1** | ストリーミング生成関数 (`generateReflectMessageStream`) | ⬜ 未着手 |
| **1** | SSEエンドポイント (`message-stream/route.ts`) | ⬜ 未着手 |
| **1** | クライアントUI (`reflect-chat.tsx`) | ⬜ 未着手 |
| **1** | 動作検証 | ⬜ 未着手 |
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
import { generateReflectMessageStream } from "@/lib/openai/reflect-coaching"
import { requireAuth } from "@/lib/api/auth"
import { createClient } from "@/lib/supabase/server"

// [FB3] 実行環境を明示的に固定
export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  const auth = await requireAuth(["student"])
  if ("error" in auth) return auth.error

  const body = await request.json()

  // [FB3] requestId による冪等性チェック（任意）
  const requestId = body.requestId as string | undefined

  // [FB1] サーバー側コンテキスト再構築
  const supabase = await createClient()
  const { data: student } = await supabase
    .from("students")
    .select("id, name, grade, course")
    .eq("user_id", auth.userId)
    .single()

  if (!student) {
    return new Response(
      JSON.stringify({ error: "生徒情報が見つかりません" }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    )
  }

  const context = {
    studentName: student.name,             // DBから取得（クライアント値は無視）
    weekType: body.weekType,
    thisWeekAccuracy: body.thisWeekAccuracy,
    lastWeekAccuracy: body.lastWeekAccuracy,
    accuracyDiff: body.accuracyDiff,
    upcomingTest: body.upcomingTest,
    conversationHistory: body.conversationHistory || [],
    turnNumber: body.turnNumber || 1,
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      // [FB3] Heartbeat: 15秒間隔でSSEコメント送信（切断防止）
      const heartbeat = setInterval(() => {
        if (!request.signal.aborted) {
          controller.enqueue(encoder.encode(":\n\n"))
        }
      }, 15_000)

      try {
        for await (const event of generateReflectMessageStream(context, request.signal)) {
          if (request.signal.aborted) break
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
        }
      } catch (error) {
        if (!request.signal.aborted) {
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({ type: 'error', content: 'AI対話でエラーが発生しました' })}\n\n`
          ))
        }
      } finally {
        clearInterval(heartbeat)
        controller.close()
      }
    },
    cancel() {
      // クライアント切断時: request.signalが自動abortされる
    }
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  })
}
```

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

`app/actions/reflect.ts` の `saveCoachingMessage()` を修正:

```typescript
export async function saveCoachingMessage(
  sessionId: string,
  role: "assistant" | "user",
  content: string,
  turnNumber: number,
  requestId?: string  // [FB3] オプショナル
) {
  // requestId がある場合、同じ session_id + turn_number + role の組で既存レコードを確認
  // 既存があればスキップ（冪等）
  if (requestId) {
    const { data: existing } = await supabase
      .from("coaching_messages")
      .select("id")
      .eq("session_id", sessionId)
      .eq("turn_number", turnNumber)
      .eq("role", role)
      .maybeSingle()

    if (existing) return existing  // 既に保存済み → スキップ
  }

  // 通常のINSERT
  return await supabase.from("coaching_messages").insert({
    session_id: sessionId,
    role,
    content,
    turn_number: turnNumber,
  })
}
```

### 1-5. サマリー生成は変更なし

`generateReflectSummary()` は非ストリーミングのまま（出力が短く、体感メリットが小さい）。

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
  → openai.create(stream: true)
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
| `lib/openai/memory-generator.ts` | **新規** | SQL集計→LLM要約の2段パイプライン |
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

`lib/openai/memory-generator.ts`:

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
Phase 1 (ストリーミング + サーバー側エンリッチ) → Phase 2 (計測)
                    ↓ (独立)
Phase 3 (メモリテーブル + Cron) → Phase 4 (文脈分離)
```

**実行順**: Phase 1 → Phase 2 → Phase 3 → Phase 4

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

### Phase 2
- [ ] Langfuseダッシュボードで `perf_*` メタデータが確認できる
- [ ] P50/P95分布で実測値を確認

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
