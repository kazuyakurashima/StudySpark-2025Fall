# AI チャット UI 改善計画

## 概要

生徒向けチャット UI を LINE ライクに統一し、UX を改善する。
現在の PR #21（GoalSimpleChat 導線実装）とは別 PR で実施。

---

## 0. 全ロール横断調査（完了）

### チャット UI（双方向対話）— 改善対象

| コンポーネント | ロール | チャットエリア高さ | 吹き出し角丸 | アバター | スクロール | 完了ボタン |
|---------------|--------|------------------|------------|---------|-----------|-----------|
| `goal-navigation-chat.tsx` | 生徒 | `max-h-96` (384px) | `rounded-lg` (8px) | `w-8 h-8` | なし | なし（即遷移） |
| `goal-simple-chat.tsx` | 生徒 | `h-[400px]` | `rounded-2xl` (16px) | `w-10 h-10` | `scrollIntoView` 常時 | 「この内容で保存」ボタン |
| `reflect-chat.tsx` | 生徒 | `max-h-96` (384px) | `rounded-lg` (8px) | `w-8 h-8` | `scrollTo` 常時 | 混在（下記注参照） |
| `ai-coach-chat.tsx` | (未使用) | `flex-1` | `rounded-3xl` 非対称 | `h-16 w-16` | 常時 | なし（最大ターンで終了） |

### 表示カード / 選択ダイアログ / モーダル — 改善対象外

| コンポーネント | ロール | UI 種別 | 備考 |
|---------------|--------|---------|------|
| `student/dashboard-client.tsx` | 生徒 | AIコーチメッセージ表示カード | 一方向表示（双方向対話なし） |
| `student/spark/spark-client.tsx` | 生徒 | AIコーチフィードバックモーダル | 学習記録保存後のAI応答表示（対話なし） |
| `parent/dashboard-client.tsx` | 保護者 | 応援メッセージ選択ダイアログ | チャットUIではない |
| `parent/reflect/page.tsx` | 保護者 | 振り返りサマリー表示カード | 読み取り専用 |
| `parent/encouragement/page.tsx` | 保護者 | 応援メッセージ選択+送信 | チャットUIではない |
| `coach/components/coach-home-client.tsx` | 指導者 | 学習記録一覧 + 応援アイコン | チャットUIではない |
| `coach/encouragement/page.tsx` | 指導者 | 応援メッセージ選択+送信 | チャットUIではない |
| `coach/student/[id]/tabs/encouragement-tab.tsx` | 指導者 | 応援メッセージ送信フォーム | 一方向送信のみ |

**結論**: 保護者・指導者は「表示カード」「選択ダイアログ」が中心。生徒側にもダッシュボードの AI コーチカード（一方向表示）と Spark のフィードバックモーダル（対話なし）があるが、いずれも LINE 風チャット改善の対象外。今回の改善スコープは **生徒の双方向チャット UI 3コンポーネント** に限定する。

> `ai-coach-chat.tsx` は現在どの画面からも呼ばれていない（未使用）。比較基準として参照するが改善対象外。実稼働の `reflect-chat.tsx` を正しい比較対象とする。

> **ReflectChat の完了パターン（注意）**: 完了には2経路がある。
> 1. **ボタン経路**: AIの応答にクロージングパターンが検出されると `streamCanEndSession=true` → 「この内容で完了する」ボタンが表示 → ユーザークリックで `handleEndSession` → サマリー生成 → `onComplete`
> 2. **自動完了経路**: 最大ターン数（6回）到達時 → サマリー生成 → `setTimeout(() => onComplete(summary), 2000)` で2秒後に自動遷移。フォールバック時のクロージング検出でも同様に `setTimeout` で自動遷移。
>
> つまり ReflectChat は「常に確認ボタンで完了」ではなく、**ターン上限到達時とフォールバック時は自動完了を許容**する設計。この仕様は意図的（振り返り対話の自然な終了を優先）だが、UI 改善時に統一するか要判断。

---

## 1. LINE ライク UI 統一

### 現状の比較（実稼働コンポーネントのみ）

| 項目 | GoalNavigationChat | GoalSimpleChat | ReflectChat |
|------|-------------------|----------------|-------------|
| 角丸 | `rounded-lg` (8px) | `rounded-2xl` (16px) | `rounded-lg` (8px) |
| アバターサイズ | `w-8 h-8` | `w-10 h-10` | `w-8 h-8` |
| メッセージ幅 | `max-w-[80%]` | `max-w-[80%]` | `max-w-[80%]` |
| チャットエリア高さ | `max-h-96` (384px) | `h-[400px]` | `max-h-96` (384px) |
| ローディング | テキスト「考え中...」 | ドットアニメーション | ストリーミングカーソル |
| スクロール | なし | `scrollIntoView` 常時 | `scrollTo` 常時 |
| 完了ボタン | なし（即 `onComplete`） | 「この内容で保存」（常時） | 混在（ボタン経路+自動完了経路） |

### 統一仕様

```
- 角丸: rounded-2xl（自分）/ rounded-2xl + rounded-tl-sm（コーチ）
- アバター: w-10 h-10（モバイル最適）
- メッセージ幅: max-w-[85%]
- チャットエリア: flex + min-h-[60dvh] + sticky input（固定高さ廃止）
  - h-[400px] / max-h-96 等の固定高は端末ごとの表示崩れを招くため不採用
  - dvh (dynamic viewport height) でモバイルアドレスバーにも追従
- ローディング: ドットアニメーション（3つ bounce）
- スクロール: 条件付き自動スクロール（最下部付近にいるときのみ）
  - しきい値: scrollTop + clientHeight >= scrollHeight - 100px
  - 読書中のスクロール位置を保護する
- 吹き出しの尻尾: CSS で三角形を付ける（optional）
```

### 変更対象ファイル

| ファイル | 変更内容 |
|---------|---------|
| `app/student/goal/goal-navigation-chat.tsx` | UI テンプレート全面書き換え |
| `app/student/goal/goal-simple-chat.tsx` | 微調整（固定高さ廃止・スクロール条件化） |
| `app/student/reflect/reflect-chat.tsx` | UI テンプレート書き換え（Goal と同等の統一） |

### GoalNavigationChat 具体的変更

1. **チャットエリア**: `max-h-96 overflow-y-auto` → `flex + min-h-[60dvh] + sticky input`
2. **角丸**: `rounded-lg` → `rounded-2xl`
3. **アバター**: `w-8 h-8` → `w-10 h-10`
4. **ローディング**: テキスト「考え中...」→ ドットアニメーション
5. **スクロール**: 条件付き自動スクロール（最下部付近時のみ `scrollToBottom`）
6. **gap**: `gap-2` → `gap-3`

### GoalSimpleChat 微調整

1. **メッセージ幅**: `max-w-[80%]` → `max-w-[85%]`（任意）
2. **チャットエリア**: `h-[400px]` → `flex + min-h-[60dvh]`（固定高さ廃止）
3. **スクロール**: 条件付き自動スクロールに変更
4. その他は現状で十分 LINE ライク

### ReflectChat 具体的変更

1. **チャットエリア**: `max-h-96 overflow-y-auto` → `flex + min-h-[60dvh] + sticky input`
2. **角丸**: `rounded-lg` → `rounded-2xl`
3. **アバター**: `w-8 h-8` → `w-10 h-10`
4. **スクロール**: `scrollTo` 常時 → 条件付き自動スクロールに変更
5. **gap**: `gap-2` → `gap-3`

---

## 2. 完了ボタン UX 改善

### 現状の問題

GoalNavigationChat の Step 3 完了時:
- `simulateTyping` でまとめテキストを表示後、即座に `onComplete()` が呼ばれる
- ユーザーがまとめを読む前に画面遷移してしまう

> GoalSimpleChat は Step 4 で確認ボタンあり（常にボタン経由）。ReflectChat はボタン経路あり（クロージング検出時）だが、ターン上限到達時は2秒後に自動遷移する経路も残存。GoalNavigationChat は完全に即時遷移で確認ステップなし。

### 改善案

GoalSimpleChat の Step 4 パターンを踏襲:

1. `simulateTyping` 完了後に完了ステートに移行
2. 「この内容で目標を確定」ボタンを表示
3. ユーザーがボタンを押して初めて `onComplete()` を呼ぶ

### GoalNavigationChat の具体的変更

```tsx
// state 追加
const [isComplete, setIsComplete] = useState(false)
const [finalThoughts, setFinalThoughts] = useState("")

// Step 3 の simulateTyping 完了後（sendMessage 内）
// 変更前:
onComplete(data.goalThoughts)

// 変更後:
setFinalThoughts(data.goalThoughts)
setIsComplete(true)

// JSX に完了ボタン追加
{isComplete && (
  <div className="p-4 border-t">
    <Button onClick={() => onComplete(finalThoughts)} className="w-full">
      <Sparkles className="h-5 w-5 mr-2" />
      この内容で目標を確定
    </Button>
  </div>
)}

// onCancel / onBack / 画面離脱時のクリーンアップ（既存だが明示的に確認）
useEffect(() => {
  return () => {
    abortRef.current?.abort()
    typingCancelRef.current?.()
  }
}, [])
```

### 入力エリアの表示条件変更

```tsx
// 変更前:
{currentStep <= 3 && !isLoading && (

// 変更後:
{currentStep <= 3 && !isLoading && !isComplete && (
```

---

## 3. 改善済み/未改善チェックリスト（ロール別）

### 生徒

| 機能 | コンポーネント | LINE風UI | 固定高さ廃止 | 条件付きスクロール | 完了ボタン | ステータス |
|------|--------------|----------|------------|------------------|-----------|-----------|
| ゴールナビ（じっくり） | `goal-navigation-chat.tsx` | 未 | 未 | 未 | 未 | **要改善** |
| ゴールナビ（かんたん） | `goal-simple-chat.tsx` | 済（ほぼ） | 未 | 未 | 済 | **微調整** |
| 週次振り返り | `reflect-chat.tsx` | 未 | 未 | 未 | 一部済（自動完了経路残存） | **要改善** |
| (デモ) | `ai-coach-chat.tsx` | 済 | 済 | 未 | - | **未使用・対象外** |
| ダッシュボードAIカード | `student/dashboard-client.tsx` | - | - | - | - | **対象外（一方向表示）** |
| Sparkフィードバック | `student/spark/spark-client.tsx` | - | - | - | - | **対象外（モーダル表示）** |

### 保護者

| 機能 | コンポーネント | ステータス |
|------|--------------|-----------|
| ダッシュボード応援 | `parent/dashboard-client.tsx` | 対象外（選択ダイアログ） |
| 振り返り閲覧 | `parent/reflect/page.tsx` | 対象外（読み取り専用カード） |
| 応援送信 | `parent/encouragement/page.tsx` | 対象外（選択ダイアログ） |

### 指導者

| 機能 | コンポーネント | ステータス |
|------|--------------|-----------|
| ホーム | `coach/components/coach-home-client.tsx` | 対象外（一覧表示） |
| 応援送信 | `coach/encouragement/page.tsx` | 対象外（選択ダイアログ） |
| 個別応援 | `coach/student/[id]/tabs/encouragement-tab.tsx` | 対象外（一方向送信フォーム） |

---

## 4. 実装順序

1. **PR-A**: GoalNavigationChat 完了ボタン UX 改善（ロジック変更、小規模）
2. **PR-B**: LINE ライク UI 統一（GoalNavigationChat + ReflectChat 書き換え、GoalSimpleChat 微調整）
3. **PR-C（optional）**: `ai-coach-chat.tsx` の扱い判断（削除 or リファクタ）

---

## 5. テスト観点

- じっくりコース: Step 3 まとめ表示後「この内容で目標を確定」ボタンが出るか
- かんたんコース: 既存の Step 4 保存フローが壊れていないか
- 週次振り返り: UI 変更後もセッション完了まで正常動作するか
- 戻るボタン: 各ステップから入力方法選択に戻れるか
- スクロール: メッセージ追加時に自動スクロールするか
- 条件付きスクロール: 上部メッセージを読んでいるときにスクロールが飛ばないか
- モバイル: アバター・吹き出しのレイアウトが崩れないか（dvh 対応確認）
- クリーンアップ: 戻るボタン・画面離脱時に typing cancel + abort が実行されるか
