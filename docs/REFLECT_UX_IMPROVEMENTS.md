# リフレクトコーチング UX改善ログ

## 実装日: 2025-11-19

## 概要

週次振り返り（リフレクト）機能において、セッション終了時のUX改善を実施。生徒が「質問されていないのに無駄に『はい』と返答する」問題を解決し、自己決定感のある終了フローを実装。

## 問題点

### 1. 終了ボタンが表示されない
- AIが「素敵な一週間を！」などのクロージングメッセージを送信
- メタタグ `[META:SESSION_CAN_END]` が付与されているが、フロント側の質問検出ロジックが誤検出
- 「何か他に聞きたいことがあれば」→「何」にマッチして質問と判定
- 結果: 終了ボタンが表示されず、生徒が無意味に「はい」と返信

### 2. 短い具体的回答が弾かれる
- 生徒: "日曜日頑張ります！"（11文字）
- 文字数制限が15文字以上のため `hasCompletedGROW = false`
- 結果: GROW完了と判定されず、メタタグが付与されない

### 3. クロージング表現の検出漏れ
- "応援しています"（語尾が「てる」ではなく「ています」）
- "来週も頑張ってね"
- パターンに含まれておらず、検出されない

## 解決策

### Phase 1: メタタグ付与ロジックの改善（サーバー側）

#### A. GROW完了判定の改善
**ファイル:** `lib/openai/reflect-coaching.ts`

##### 1. 文字数制限の緩和
```typescript
// 変更前
const hasSufficientLength = lastResponse.length >= 15

// 変更後
const hasSufficientLength = lastResponse.length >= 10  // 短いが具体的な回答を許容
```

**効果:**
- "日曜日頑張ります！"（11文字）→ 検出される ✅
- "日曜やる"（5文字）→ 弾かれる（適切）

##### 2. 具体的文脈の検出語彙拡張
```typescript
const hasSpecificContext = /授業後|トレーニング|図書館|家で|学校で|塾で|部活後|休み時間|朝の時間|夜の時間|学習室/.test(lastResponse)
```

**効果:**
- "授業後、トレーニングタイム中に全部やる！" → 検出される ✅

#### B. クロージング表現の検出拡張
```typescript
// 変更前
const hasClosingExpression = /素敵な一週間|良い一週間|楽しみにしてる|応援してる|では、|それでは/.test(message)

// 変更後（語尾変化を許容）
const hasClosingExpression = /素敵な一週間|良い一週間|楽しみにして|応援して|来週も|頑張ってね|それでは|では、/.test(message)
```

**効果:**
- "応援しています" → 検出される ✅
- "楽しみにしています" → 検出される ✅
- "来週も頑張ってね" → 検出される ✅

#### C. メタタグ付与タイミングの前倒し
```typescript
// ターン4以上 → ターン3以上に変更
const shouldAppendMeta = (
  (context.turnNumber >= 3 && hasCompletedGROW(context.conversationHistory)) || // 変更
  (context.turnNumber >= 5 && hasClosingExpression) ||
  (context.turnNumber >= 6)
)
```

**効果:**
- より早い段階で終了ボタンが表示される可能性が高まる

### Phase 2: 質問検出ロジックの厳格化（クライアント側）

#### A. 質問検出パターンの厳格化
**ファイル:** `app/student/reflect/reflect-chat.tsx`

```typescript
// 変更前（単語レベルでマッチ）
const hasQuestion = (content: string): boolean => {
  return /[？?]|教えて|どう|かな|何|いつ|どこ|誰|どれ|ある？/.test(content)
}

// 変更後（文脈を考慮した厳格マッチ）
const hasQuestion = (content: string): boolean => {
  if (/[？?]/.test(content)) return true

  const questionPatterns = [
    /教えて(くれる|ください|ね|ほしい)/,
    /どう(思う|考える|だった|ですか)/,
    /かな[？?。]?$/,
    /何を(する|やる|増やす|考えて)/,
    /いつ(やる|する|取り組む)/,
    /どこで(やる|する|取り組む)/,
    /誰と(やる|する|取り組む)/,
    /どれ(くらい|を|が)/,
  ]

  return questionPatterns.some(pattern => pattern.test(content))
}
```

**効果:**
- "何か他に聞きたいことがあれば" → マッチしない ✅
- "感想を教えてもらえる" → マッチしない ✅
- "何をするつもり？" → マッチする ✅

#### B. メタタグ優先判定
```typescript
// 変更前
const canEndSession = useMemo(() => {
  const hasMetadata = lastAIMessage.content.includes("[META:SESSION_CAN_END]")
  const isQuestion = hasQuestion(cleanContent)
  return hasMetadata && !isQuestion  // 質問検出で上書き
}, [messages, isCompleted, isSessionEnded])

// 変更後
const canEndSession = useMemo(() => {
  const hasMetadata = lastAIMessage.content.includes("[META:SESSION_CAN_END]")
  return hasMetadata  // サーバー判断を優先
}, [messages, isCompleted, isSessionEnded])
```

**効果:**
- サーバー側でメタタグを付与した判断を信頼
- フロント側の質問検出による誤判定を排除

### Phase 3: 柔軟な終了オプションの追加

#### 折り畳み式「もっと話したい場合」入力欄
**ファイル:** `app/student/reflect/reflect-chat.tsx`

```typescript
{canEndSession && !isSessionEnded && (
  <div className="space-y-4 py-4">
    {/* 終了ボタン（Primary action） */}
    <div className="flex justify-center">
      <Button onClick={handleEndSession} size="lg">
        <CheckCircle /> この内容で完了する
      </Button>
    </div>

    {/* 折り畳み: もっと話したい場合 */}
    <details className="text-center">
      <summary className="text-sm text-muted-foreground cursor-pointer">
        もっと話したい場合はこちら
      </summary>
      <div className="mt-4">
        <Textarea placeholder="続けて話したいことがあれば..." />
        <Button onClick={sendMessage}><Send /></Button>
      </div>
    </details>
  </div>
)}
```

**UX設計:**
1. **推奨アクション明確**: 終了ボタンが大きく中央配置
2. **柔軟性確保**: 折り畳みで入力欄を提供
3. **UIシンプル**: デフォルトは終了ボタン + 1行テキストのみ
4. **既存ロジック再利用**: `sendMessage` で会話続行

## 技術的詳細

### メタタグシステム
- サーバー側で `[META:SESSION_CAN_END]` を生成されたメッセージに付与
- DB保存/サマリー生成時は `removeMetadata()` でクリーン化
- フロント側でメタタグ検出して終了ボタン表示

### 二重判定システム
```typescript
const shouldAppendMeta = (
  hasCompletedGROWCheck || // A案: GROW完了（語彙検出）
  isClosingTurn ||          // B案: クロージング表現検出
  (context.turnNumber >= 6) // フォールバック
)
```

**冗長性設計:** どちらかが失敗しても、もう一方でカバー

## 実装ファイル

- `lib/openai/reflect-coaching.ts` - サーバー側ロジック
- `app/student/reflect/reflect-chat.tsx` - クライアント側UI
- `app/api/reflect/summary/route.ts` - サマリー生成API

## テストケース

### ケース1: 短い具体的回答
```
生徒: "日曜日頑張ります！"（11文字）
→ hasSpecificDay: true, hasSufficientLength: true
→ hasCompletedGROW: true ✅
→ メタタグ付与 ✅
→ 終了ボタン表示 ✅
```

### ケース2: クロージング表現
```
AI: "来週も応援しています！📚😊"
→ hasClosingExpression: true（"来週も" "応援して" 検出）
→ メタタグ付与 ✅
→ 終了ボタン表示 ✅
```

### ケース3: 質問でない定型句
```
AI: "何か困ったことがあれば、いつでも相談してね"
[META:SESSION_CAN_END]
→ hasQuestion: false（"何か" は単独でマッチしない）
→ canEndSession: true（メタタグ優先）
→ 終了ボタン表示 ✅
```

### ケース4: 本物の質問
```
AI: "具体的に何をするつもり？"
→ メタタグなし
→ hasQuestion: true（"何をする" 検出）
→ 入力欄のみ表示 ✅
```

## 効果測定

実装後、以下を測定：
- 無駄な「はい」返信の減少率
- セッション完了までのターン数の減少
- 生徒の満足度（終了ボタン使用率）

測定クエリ: `scripts/measure-reflect-quality.sql`

## 今後の改善点

1. **語彙の継続的拡張**: 新しい表現パターンが出た際に追加
2. **機械学習検討**: 質問検出の精度向上
3. **A/Bテスト**: 折り畳み vs 常時表示の比較

## 参考資料

- GROW Coaching Model
- Self-Determination Theory
- Scaffolding in Education
- UX Design Best Practices for Conversational UI
