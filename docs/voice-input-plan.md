# 音声入力機能 — 実装計画

## 1. 概要

Groq API の Whisper large-v3-turbo を利用し、アプリ内のテキスト入力箇所に音声入力オプションを追加する。
小学生が文字入力に時間がかかる問題を解消し、振り返りや応援メッセージの入力UXを向上させる。

### 技術選定

| 項目 | 値 |
|------|-----|
| プラットフォーム | Groq API |
| 音声認識モデル | `whisper-large-v3-turbo`（多言語対応、日本語OK） |
| 認識エンドポイント | `https://api.groq.com/openai/v1/audio/transcriptions` |
| コスト | Whisper: $0.04/時間（秒単位課金） |
| Free tier | Whisper: 2,000回/日・20RPM |
| Groq対応音声形式 | WebM, MP3, WAV, OGG, FLAC, MP4, M4A, MPEG, MPGA |
| 本実装で生成する形式 | WebM（Chrome/Edge）, MP4（Safari）, ブラウザデフォルト（フォールバック） |
| APIキー | `GROQ_API_KEY` |

## 2. 実装フェーズ

### Phase 1: Whisper-only（UX検証）

Whisper の生テキストをそのまま返す。最小構成で音声入力のUXを検証する。

**対象**: `app/student/spark/exercise-input.tsx` の振り返り Textarea

### Phase 1.5: Llama 校正（オプション）

Phase 1 の UX 確認後、必要に応じて Llama 4 Scout による後処理を追加。
句読点補完・フィラー除去を行う。**意味を変える校正は行わない**（生徒の表現をそのまま尊重）。

- モデル: `meta-llama/llama-4-scout-17b-16e-instruct`（Groq で利用可能）
- feature flag で ON/OFF 切替（`VOICE_CORRECTION_ENABLED=true`）
- **意味を変える校正は行わない**（生徒の表現をそのまま尊重）
- Whisper 生テキストと校正テキストの両方を返し、UI側で選択可能にする案も検討

### Phase 2: 全テキスト入力への展開

Phase 1（+ 1.5）の確認後、全入力箇所に `<VoiceInputButton>` を適用。

## 3. アーキテクチャ（Phase 1）

```
ブラウザ                        サーバー                           外部API (Groq)
┌─────────────┐           ┌──────────────────────┐          ┌──────────────────┐
│ マイクボタン  │──録音──→ │                      │          │                  │
│ (MediaRecorder)│         │ /api/voice/transcribe │          │                  │
│              │──blob──→ │                      │──音声──→ │ Whisper v3-turbo │
│              │          │  認証チェック          │←─text──  │                  │
│              │←─text──  │  サイズチェック        │          │                  │
│ Textarea     │          │                      │          │                  │
│ に挿入       │           └──────────────────────┘          └──────────────────┘
└─────────────┘
```

### なぜサーバー経由か

- APIキーをブラウザに露出させない（セキュリティ）
- リクエストログ・使用量の監視が可能
- 将来的にレート制限やフィルタリングを追加可能
- Phase 1.5 の Llama 校正追加時にクライアント変更不要

## 4. 実装内容

### 4-1. 環境変数

```env
GROQ_API_KEY=your-groq-api-key-here
```

### 4-2. APIルート: `app/api/voice/transcribe/route.ts`（新規）

```typescript
// POST: 音声ファイルを受け取り、Whisper で認識してテキストを返す
// - Content-Type: multipart/form-data
// - リクエスト: file（audio blob）+ クエリパラメータ:
//     ?provider=groq|openai  （デフォルト: VOICE_PROVIDER env or "groq"）
//     ?postprocess=none|llama|openai  （デフォルト: none）
//     ?polishModel=<model>  （postprocess モデルの上書き）
// - レスポンス（成功）:
//   {
//     text: string,                  // 最終テキスト（postprocess後 or rawText）
//     rawText: string,               // Whisper 生テキスト
//     provider: "groq" | "openai",
//     latencyMs: number,             // 総所要時間（ms）
//     transcriptionLatencyMs: number,// Whisper のみの所要時間（ms）
//     postprocessModel: string | null,
//     postprocessLatencyMs: number | null,
//     postprocessError: string | null // Llama 失敗時のエラー（text は rawText にフォールバック済み）
//   }
// - 認証: Supabase Auth（ログインユーザーのみ）
// - エラー: 413（ファイルサイズ上限 5MB）、401（未認証）、502（API障害）、429（Rate limit）
//
// 実装前提:
// - export const runtime = "nodejs"（FormData/File 操作に Node.js ランタイムが必要）
// - 認証は requireAuth(["student", "parent", "coach"]) を使用
//   （lib/api/auth.ts の既存ヘルパー。goal/stream 等と同じパターン）
```

#### Whisper リクエスト

```typescript
const formData = new FormData()
formData.append('file', audioFile, filename)  // 拡張子は実際の形式に合わせる
formData.append('model', 'whisper-large-v3-turbo')
formData.append('language', 'ja')
formData.append('response_format', 'verbose_json')

const whisperRes = await fetch(
  'https://api.groq.com/openai/v1/audio/transcriptions',
  {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
    body: formData,
  }
)
const { text } = await whisperRes.json()
```

#### 無音判定

```typescript
// 主判定: テキストが空かどうか
if (!text || !text.trim()) {
  return NextResponse.json({ text: '' })
}
// 補助: no_speech_prob は verbose_json のメタデータとして参考値に留める
// 固定閾値による自動判定は Phase 1 では行わない
```

### 4-3. Toaster のマウント

現在 `app/layout.tsx` に `<Toaster />` が未マウント。Phase 1 の前提として追加が必要。

```tsx
// app/layout.tsx に追加
import { Toaster } from '@/components/ui/toaster'
// ...
<body>
  {children}
  <Toaster />
</body>
```

既に別のトースト機構（sonner 等）がある場合はそちらを利用する。

### 4-4. 共通コンポーネント: `components/ui/voice-input-button.tsx`（新規）

```typescript
interface VoiceInputButtonProps {
  onTranscribed: (text: string) => void  // テキスト受信時のコールバック
  disabled?: boolean                      // 入力不可状態
  className?: string
}
```

**状態遷移**:
```
idle（マイクアイコン）
  → recording（赤い点滅 + 録音時間表示）
    → processing（スピナー、API通信中）
      → idle（テキスト挿入完了）
```

**UI仕様**:
- **idle**: マイクアイコンボタン（小さめ、Textarea の右下または横に配置）
- **recording**: ボタンが赤く点滅 + 「録音中... 0:03」のようなタイマー表示。タップで録音停止
- **processing**: スピナーアイコン + 「変換中...」
- **error**: トースト通知で「音声の変換に失敗しました」

**録音仕様**:
- `MediaRecorder` API を使用
- 形式: `MediaRecorder.isTypeSupported()` で動的に選択
  - 優先順: `audio/webm;codecs=opus` → `audio/webm` → `audio/mp4`
  - どの mimeType も未対応の場合: `mimeType` 未指定で MediaRecorder を生成（ブラウザデフォルト）
  - サーバー送信時のファイル名拡張子は `blob.type` から決定（例: `audio/webm` → `audio.webm`）
  - iPhone/Safari は WebM 非対応のため `audio/mp4` にフォールバック
- 最大録音時間: 60秒（小学生の振り返り入力に十分）
- マイク権限: `navigator.mediaDevices.getUserMedia({ audio: true })`

**テキスト挿入動作**:
- 既存テキストがある場合: 末尾に追記（スペース区切り）
- 空の場合: そのまま挿入
- `onTranscribed` コールバックで親コンポーネントの state を更新

### 4-5. Phase 1 適用: `exercise-input.tsx`

現在の Textarea の横に `<VoiceInputButton>` を配置:

```tsx
<div className="relative">
  <Textarea
    value={section.reflectionText}
    onChange={(e) => handleReflectionChange(idx, e.target.value)}
    placeholder="例：倍数の問題は解けたけど、公約数の応用がまだ不安..."
    className="min-h-[80px] text-sm ... pr-12"
    maxLength={200}
  />
  <VoiceInputButton
    onTranscribed={(text) => {
      const current = section.reflectionText
      const newText = current ? `${current} ${text}` : text
      handleReflectionChange(idx, newText.slice(0, 200))
    }}
    disabled={isPending}
    className="absolute right-2 bottom-2"
  />
</div>
```

**注意**: `disabled` に渡す state は実際のコード上の変数名（`isPending` 等）に合わせる。

## 5. 全テキスト入力箇所（Phase 2 対象）

| # | ロール | 画面 | ファイル | 入力箇所 | 用途 |
|---|--------|------|---------|---------|------|
| 1 | 生徒 | スパーク | app/student/spark/exercise-input.tsx | L472 Textarea | 演習振り返り（**Phase 1**） |
| 2 | 生徒 | リフレクト | app/student/reflect/reflect-chat.tsx | L571 Textarea（スマホ用） | AI週次振り返りチャット |
| 3 | 生徒 | リフレクト | app/student/reflect/reflect-chat.tsx | L596 Textarea（PC用） | 同上（レスポンシブ別要素） |
| 4 | 生徒 | ゴールナビ | app/student/goal/goal-direct-input.tsx | L53 Textarea | 目標自由記述 |
| 5 | 生徒 | ゴールナビ | app/student/goal/goal-simple-chat.tsx | Textarea | AI目標設定チャット |
| 6 | 生徒 | ゴールナビ | app/student/goal/goal-navigation-chat.tsx | Textarea | AIナビチャット |
| 7 | 保護者 | 応援 | app/parent/encouragement/page.tsx | Textarea | 応援メッセージ |
| 8a | 指導者 | 応援 | app/coach/encouragement/page.tsx | L608 Textarea | AI生成メッセージ編集欄 |
| 8b | 指導者 | 応援 | app/coach/encouragement/page.tsx | L653 Textarea | カスタム応援メッセージ入力 |
| 9 | 指導者 | 生徒詳細 | app/coach/student/[id]/tabs/learning-tab.tsx | Textarea | 学習タブ応援 |
| 10 | 指導者 | 生徒詳細 | app/coach/student/[id]/tabs/encouragement-tab.tsx | L92 Textarea | 応援タブメッセージ |

**注意**:
- reflect-chat.tsx はスマホ用・PC用で Textarea が2箇所あるため、両方に適用が必要
- coach/encouragement/page.tsx はAI生成編集欄とカスタム入力欄の2箇所
- **合計: 9ファイル、11箇所**

## 6. DB変更

**なし** — アプリ層のみの変更。

## 7. セキュリティ考慮

- APIキーはサーバー側でのみ使用（`process.env`）、クライアントに露出しない
- APIルートは Supabase Auth で認証済みユーザーのみ許可
- **サーバー側ファイルサイズ上限: 5MB**（60秒録音に十分。Groq の 25MB 上限よりも厳しく設定し abuse 対策）
- 録音時間上限: 60秒（クライアント側で制限）
- 音声データはサーバーに保存しない（Groq API に転送して即破棄）
- Groq は inference requests のデータをデフォルトで保持しない（DPA 前提）

## 8. エッジケース

| ケース | 対応 |
|--------|------|
| マイク権限拒否 | トースト通知「マイクの使用を許可してください」 |
| ブラウザ非対応（MediaRecorder なし） | マイクボタン自体を非表示 |
| iPhone/Safari（WebM非対応） | `MediaRecorder.isTypeSupported()` で mp4 にフォールバック |
| Groq API 通信失敗 | トースト通知 + ボタンを idle に戻す |
| Rate limit 超過（429） | トースト「しばらく待ってからお試しください」 |
| 録音中にページ遷移 | 録音を自動停止、リソース解放 |
| maxLength 超過 | slice で切り詰め（既存ロジックと同じ） |
| 空の音声（無音） | `text.trim() === ''` で検出 → 何もしない |

## 9. テスト観点

- `VoiceInputButton`: idle → recording → processing → idle の状態遷移
- `VoiceInputButton`: マイク権限拒否時のエラーハンドリング
- `VoiceInputButton`: MediaRecorder 非対応時の非表示
- `VoiceInputButton`: Safari フォールバック（mp4 選択）
- `/api/voice/transcribe`: 認証なしで 401
- `/api/voice/transcribe`: 5MB超で 413
- `/api/voice/transcribe`: Groq API 障害時に 502
- `/api/voice/transcribe`: Rate limit（429）ハンドリング
- `/api/voice/transcribe`: 空テキスト返却時の処理
- `exercise-input.tsx`: 音声テキストが既存テキストに追記されること
- `exercise-input.tsx`: maxLength(200) を超えないこと

## 10. 影響範囲

### Phase 1（新規ファイル + 既存2箇所の小変更）

| ファイル | 変更内容 |
|---------|---------|
| `app/api/voice/transcribe/route.ts` | **新規** — Groq Whisper API プロキシ |
| `components/ui/voice-input-button.tsx` | **新規** — 共通音声入力ボタン |
| `app/student/spark/exercise-input.tsx` | Textarea 横に VoiceInputButton 追加 |
| `app/layout.tsx` | Toaster マウント追加（未マウントの場合） |
| `.env.local` | `GROQ_API_KEY` 追加 |

### Phase 1.5（Llama 4 Scout 校正追加）

| ファイル | 変更内容 |
|---------|---------|
| `app/api/voice/transcribe/route.ts` | Llama 4 Scout による後処理を追加（実装済み） |

**校正処理の詳細**:
- モデル: `meta-llama/llama-4-scout-17b-16e-instruct`（Groq API 経由）
- **有効化方法（推奨）**: サーバー env に `VOICE_CORRECTION_ENABLED=true` を設定
  - これにより `VoiceInputButton` の通常音声入力が全て Llama 校正付きになる
  - `NEXT_PUBLIC_*` は使わない（Next.js のビルド時埋め込みによる反映遅れを避けるため）
- **クエリパラメータによる個別制御**（dev 比較・テスト用）:
  - `?postprocess=none` → env が `true` でも強制スキップ
  - `?postprocess=llama` → env が `false` でも強制実行
  - `?postprocess=openai` → OpenAI モデルで後処理（OpenAI provider 時）
- Whisper の生テキストを入力として、句読点補完・フィラー除去を行う
- **意味を変える修正は行わない**（プロンプトで明示制御）
- Llama 失敗時は Whisper 生テキストにフォールバック（校正失敗でも入力は成功）
- クライアントには `postprocessError` が返る（ユーザーには簡略メッセージ、詳細はブラウザコンソール）
- レスポンスに `rawText`（生）と `text`（校正後 or 生）の両方を含める
- 校正モデルは `?polishModel=<model>` で上書き可能（dev 比較用）

### Phase 2（全画面展開）

上記テーブル #2-#11 の各ファイルに `<VoiceInputButton>` を追加（9ファイル、11箇所）。
コンポーネントは共通だが、各画面で disabled 条件や maxLength、テキスト挿入ロジックが異なるため、
画面ごとに `onTranscribed` コールバックの調整が必要。1ファイルあたり10-15行程度の変更。
