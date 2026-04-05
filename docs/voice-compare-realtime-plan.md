# 音声入力 — 精度比較 + Realtime ストリーミング 実装計画

## 前提

現状の `/api/voice/transcribe` + `VoiceInputButton` は batch 方式（録音停止→blob送信→一括返却）。
これでは精度比較はできてもストリーミング比較はできない。
以下の2系統を**別実装**として追加する。

## Phase 1: dev 精度比較画面（batch 同時送信）

### 目的
同一音声を Groq と OpenAI に同時送信し、精度・速度を並べて比較する。

### 実装内容

#### 1-1. `app/dev/voice-compare/page.tsx`（新規）

- 本番では非公開（`VOICE_COMPARE_ENABLED !== "true"` で `notFound()`）
- UI構成:

```
┌─────────────────────────────────────────────────┐
│ 🎤 [録音ボタン]  録音中... 0:15                    │
├────────────────────┬────────────────────────────┤
│ Groq               │ OpenAI                     │
│ whisper-large-v3   │ gpt-4o-mini-transcribe     │
│ ─────────────────  │ ──────────────────────────  │
│ latency: 342ms     │ latency: 1204ms            │
│ chars: 28          │ chars: 31                   │
│ ─────────────────  │ ──────────────────────────  │
│ 「算数の割合の問題が  │ 「算数の割合の問題が        │
│  まだちょっと不安」   │  まだちょっと不安です」      │
│                    │                            │
│                    │ [モデル切替] mini ▼ / 4o ▼   │
├────────────────────┴────────────────────────────┤
│ ⚠️ Groq: エラー（429 Rate limit）               │
│    → OpenAI 側の結果のみ表示                      │
└─────────────────────────────────────────────────┘
```

- OpenAI モデルは `gpt-4o-mini-transcribe` / `gpt-4o-transcribe` を UI から切替可能

#### 1-2. `app/api/voice/compare/route.ts`（新規）

- 同じ音声ファイルを Groq と OpenAI に**並列送信**
- **片方失敗してももう片方の結果を返す**（Promise.allSettled）
- 各 provider の text, latencyMs, model, error を返す
- 認証: `requireAuth(["student", "parent", "coach"])`
- OpenAI モデルはリクエストパラメータで指定可能

```typescript
// POST: file（audio blob）+ openaiModel（optional）
// レスポンス:
{
  groq: { text, latencyMs, model } | { error, latencyMs },
  openai: { text, latencyMs, model } | { error, latencyMs }
}
```

#### 1-3. 環境変数

```env
# 比較画面・Realtime 画面の有効化（本番では省略 or false）
VOICE_COMPARE_ENABLED=true
```

### 影響範囲

| ファイル | 変更 |
|---------|------|
| `app/dev/voice-compare/page.tsx` | **新規** |
| `app/api/voice/compare/route.ts` | **新規** |

既存の `/api/voice/transcribe` と `VoiceInputButton` は**変更なし**。

---

## Phase 2: Realtime ストリーミング転写（dev 限定）

### 目的
OpenAI Realtime API でマイク音声を逐次送信し、テキストが途中から流れるUXを検証する。

### アーキテクチャ

```
ブラウザ                                          OpenAI
┌──────────────────────┐                   ┌──────────────────┐
│ RealtimeVoiceInput   │                   │                  │
│                      │                   │ Realtime API     │
│ 1. エフェメラルトークン│←─token─┐          │                  │
│    を取得（TTL ~1分）  │        │          │                  │
│                      │  ┌─────┴──────┐   │                  │
│ 2. WebRTC接続         │  │ /api/voice/ │   │                  │
│    (SDP交換)          │  │ realtime-   │   │                  │
│                      │  │ token       │   │                  │
│ 3. マイク音声を        │  └────────────┘   │                  │
│    逐次送信           │──────audio──────→ │ gpt-4o-transcribe│
│                      │                   │                  │
│ 4. delta イベント     │←──delta text────  │                  │
│    でテキスト逐次更新  │                   │                  │
│    (item_id で管理)   │                   │                  │
│                      │                   │                  │
│ 5. completed で確定   │←──final text────  │                  │
└──────────────────────┘                   └──────────────────┘
```

### 通信方式: WebRTC（推奨）

- ブラウザから直接 OpenAI に接続（サーバーを中継しない）
- サーバーはエフェメラルトークンの発行のみ
- 低レイテンシ

### 実装内容

#### 2-1. `app/api/voice/realtime-token/route.ts`（新規）

エフェメラルトークン発行 endpoint。
`POST /v1/realtime/client_secrets` でトークンを取得する。

```typescript
export async function POST(request: NextRequest) {
  const auth = await requireAuth(["student", "parent", "coach"])
  if ("error" in auth) return auth.error

  const body = await request.json().catch(() => ({}))
  const model = body.model || "gpt-4o-mini-transcribe"

  const response = await fetch(
    "https://api.openai.com/v1/realtime/client_secrets",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        session: {
          type: "transcription",
          audio: {
            input: {
              format: "pcm16",
              transcription: {
                model,
                language: "ja",
              },
              noise_reduction: { type: "near_field" },
              turn_detection: {
                type: "server_vad",
                silence_duration_ms: 500,
                threshold: 0.5,
              },
            },
          },
        },
      }),
    }
  )

  if (!response.ok) {
    const err = await response.text().catch(() => "unknown")
    console.error("[realtime-token] OpenAI error:", response.status, err)
    return NextResponse.json({ error: "トークン取得に失敗しました" }, { status: 502 })
  }

  const data = await response.json()
  // client_secret の TTL は約1分（docs 準拠）
  // 接続開始直前に取得する前提で設計する
  return NextResponse.json({
    token: data.client_secret.value,
    expiresAt: data.client_secret.expires_at,
  })
}
```

**注意**: トークン TTL は約1分。UI 側はトークン取得→即座に WebRTC 接続を開始する設計にする。
事前に取得してキャッシュしてはならない。

#### 2-2. `components/ui/realtime-voice-input.tsx`（新規）

既存の `VoiceInputButton` とは**完全に別のコンポーネント**。

```typescript
interface RealtimeVoiceInputProps {
  onPartialText: (text: string) => void   // delta 受信時（途中テキスト）
  onFinalText: (text: string) => void     // completed 受信時（確定テキスト）
  disabled?: boolean
  className?: string
  model?: "gpt-4o-mini-transcribe" | "gpt-4o-transcribe"
}
```

**内部処理**:

1. ボタン押下 → `/api/voice/realtime-token` からトークン取得
2. `RTCPeerConnection` 作成 + マイクトラック追加
3. SDP offer 作成 → OpenAI `https://api.openai.com/v1/realtime/calls` に送信
4. data channel (`oai-events`) でイベント受信:
   - `transcription_session.created` → 接続成功
   - `conversation.item.input_audio_transcription.delta` → `onPartialText(delta.text)`
     - **item_id を保持し、同一 item のテキストを結合して渡す**
   - `conversation.item.input_audio_transcription.completed` → `onFinalText(transcript)`
     - **item_id で対応する delta と紐付け、順序保証する**
5. ボタン再押下 or 60秒 → 接続切断、リソース解放

**item_id による順序管理**:
複数ターン（VAD が発話を区切った場合）では completed イベントの順序が保証されない。
item_id をキーにして delta テキストを蓄積し、completed で確定する。

```typescript
// 内部 state の概念
const transcripts = useRef<Map<string, string>>(new Map())
// delta: transcripts.set(itemId, (transcripts.get(itemId) || '') + delta)
// completed: onFinalText(transcripts.get(itemId))
```

**状態遷移**:
```
idle → connecting → streaming → idle
```

**UI**:
- idle: マイクアイコン（緑系、batch と区別）
- connecting: スピナー（トークン取得 + WebRTC 接続中）
- streaming: 緑の点滅 + 録音時間表示
- テキストは `onPartialText` で途中表示が逐次更新される

**エラー・切断ハンドリング**:
- トークン取得失敗 → トースト + idle に戻す
- WebRTC 接続失敗 → トースト + idle に戻す
- 接続中の切断 → disconnect reason をログ出力 + idle に戻す
- トークン期限切れ（接続中に切断）→ 自動再接続はしない、ユーザーに再録音を促す

#### 2-3. `app/dev/voice-realtime/page.tsx`（新規）

Realtime 専用の dev 検証画面。

```
┌──────────────────────────────────────────┐
│ 🟢 [Realtime 録音]  streaming... 0:08     │
│                                          │
│ モデル: gpt-4o-mini-transcribe ▼          │
│                                          │
│ 途中テキスト:                              │
│ 「算数の割合の問題がまだちょっ|」            │
│                                          │
│ 確定テキスト:                              │
│ 「算数の割合の問題がまだちょっと不安です」    │
│                                          │
│ ── 計測 ──                                │
│ first delta:     312ms                   │
│ final:           1842ms                  │
│ disconnect:      なし                     │
│ model:           gpt-4o-mini-transcribe  │
└──────────────────────────────────────────┘
```

- `VOICE_COMPARE_ENABLED=true` で有効化（Phase 1 と共通フラグ）
- first delta（最初の部分テキストまでの時間）を計測・表示
- disconnect reason を表示

### 影響範囲

| ファイル | 変更 |
|---------|------|
| `app/api/voice/realtime-token/route.ts` | **新規** — エフェメラルトークン発行 |
| `components/ui/realtime-voice-input.tsx` | **新規** — Realtime 転写コンポーネント |
| `app/dev/voice-realtime/page.tsx` | **新規** — dev 検証画面 |

既存ファイルへの変更は**一切なし**。

---

## Phase 3: 最終判断 → 本番採用

Phase 1 + Phase 2 の結果を以下の4軸で評価:

| 軸 | Groq batch | OpenAI batch | OpenAI Realtime |
|----|-----------|-------------|-----------------|
| 速度 | total latency | total latency | first delta + final |
| 精度 | 目視比較 | 目視比較 | 目視比較 |
| UX | 一括表示 | 一括表示 | 逐次表示 |
| コスト | $0.04/時間 | $0.18〜0.36/時間 | Realtime 課金（別体系） |

精度評価の観点:
- 意味保持（元の発話と同じ意味か）
- 固有名詞（算数用語、テスト名等）
- 助詞崩れ（「が」「を」「は」の正確さ）
- 句読点の自然さ

判断後、採用する provider/方式を1つに絞り、`VoiceInputButton` または `RealtimeVoiceInput` を本番の全 Textarea に適用。

---

## 実装順序

```
Phase 1  ← まずここ
  ├── app/api/voice/compare/route.ts
  └── app/dev/voice-compare/page.tsx

Phase 2  ← 次にここ
  ├── app/api/voice/realtime-token/route.ts
  ├── components/ui/realtime-voice-input.tsx
  └── app/dev/voice-realtime/page.tsx

Phase 3  ← 評価・判断（随時）
  └── 本番採用先の決定
```

## DB変更

**なし** — 全フェーズともアプリ層のみ。
