# 保護者アバター表示問題のデバッグガイド

## 問題概要

**症状**: 生徒のリフレクト画面の応援履歴において、応援メッセージのテキストは表示されるが、保護者のアバター画像が表示されない

**影響範囲**: `/app/student/reflect/encouragement-history.tsx`

## 実装済みの対策

### 1. コード修正（コミット: a0d413b）

`encouragement-history.tsx` の `getAvatarUrl` 関数に保護者アバターマッピングを追加：

```typescript
const parentAvatarMap: Record<string, string> = {
  "parent1": "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/parent1-HbhESuJlC27LuGOGupullRXyEUzFLy.png",
  "parent2": "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/parent2-zluk4uVJLfzP8dBe0I7v5fVGSn5QfU.png",
  "parent3": "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/parent3-EzBDrjsFP5USAgnSPTXjcdNeq1bzSm.png",
  "parent4": "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/parent4-YHYTNRnNQ7bRb6aAfTNEFMozjGRlZq.png",
  "parent5": "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/parent5-dGCLocpgcZw4lXWRiPmTHkXURBXXoH.png",
  "parent6": "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/parent6-gKoeUywhHoKWJ4BPEk69iW6idztaLl.png",
}
```

### 2. デバッグログ追加

2箇所にログを追加：

**A. データ取得時（lines 40-44）**:
```typescript
if (!result.error) {
  setMessages(result.messages || [])
  if (result.messages && result.messages.length > 0) {
    console.log('[DEBUG] First message sender_profile:', result.messages[0].sender_profile)
    console.log('[DEBUG] First message avatar_id:', result.messages[0].sender_profile?.avatar_id)
  }
}
```

**B. URL生成時（lines 67-96）**:
```typescript
const getAvatarUrl = (avatar: string | null) => {
  console.log('[DEBUG] getAvatarUrl called with:', avatar)

  if (!avatar) {
    console.log('[DEBUG] No avatar, returning default')
    return "/avatars/default.png"
  }

  if (avatar.startsWith("http")) {
    console.log('[DEBUG] Avatar is HTTP URL, returning as-is')
    return avatar
  }

  if (parentAvatarMap[avatar]) {
    console.log('[DEBUG] Found parent avatar mapping:', parentAvatarMap[avatar])
    return parentAvatarMap[avatar]
  }

  console.log('[DEBUG] Student avatar, returning local path')
  return `/avatars/${avatar}.png`
}
```

### 3. フォールバック動作の仕様

| 入力値 | 処理 | 戻り値 |
|--------|------|--------|
| `null` または `undefined` | デフォルトアバター | `/avatars/default.png` |
| `"http..."` で始まる文字列 | そのまま返す | 入力値そのまま |
| `"parent1"` 〜 `"parent6"` | マッピング辞書から取得 | Vercel Blob Storage URL |
| その他の文字列 | 生徒アバターと判定 | `/avatars/${avatar}.png` |

## デバッグ手順（詳細版）

### フェーズ1: ブラウザコンソール確認

1. **準備**
   - Chrome DevTools を開く（F12 または Cmd+Option+I）
   - Console タブに移動
   - 既存のログをクリア

2. **ページ操作**
   - 生徒アカウントでログイン
   - `/student/reflect` ページに移動
   - 応援履歴セクションまでスクロール

3. **ログ確認**

   **期待されるログ出力（正常時）**:
   ```
   [DEBUG] First message sender_profile: {id: "xxx", display_name: "...", nickname: "...", avatar_id: "parent1", role: "parent"}
   [DEBUG] First message avatar_id: parent1
   [DEBUG] getAvatarUrl called with: parent1
   [DEBUG] Found parent avatar mapping: https://hebbkx1anhila5yf.public.blob.vercel-storage.com/parent1-HbhESuJlC27LuGOGupullRXyEUzFLy.png
   ```

   **ケース A: avatar_id が null の場合**:
   ```
   [DEBUG] First message sender_profile: {id: "xxx", ..., avatar_id: null, ...}
   [DEBUG] First message avatar_id: null
   [DEBUG] getAvatarUrl called with: null
   [DEBUG] No avatar, returning default
   ```
   → **原因**: データベースに avatar_id が保存されていない
   → **次のステップ**: フェーズ3（データベース確認）へ

   **ケース B: avatar_id が既にフルURLの場合**:
   ```
   [DEBUG] First message avatar_id: https://hebbkx1anhila5yf.public.blob.vercel-storage.com/parent1-...
   [DEBUG] getAvatarUrl called with: https://hebbkx1anhila5yf.public.blob.vercel-storage.com/parent1-...
   [DEBUG] Avatar is HTTP URL, returning as-is
   ```
   → **原因**: avatar_id の保存形式が想定と異なる（ID形式ではなくURL形式）
   → **対策**: マッピング処理が不要（コードは正しく動作している）

   **ケース C: avatar_id が想定外の値の場合**:
   ```
   [DEBUG] First message avatar_id: "parent-avatar-1"
   [DEBUG] getAvatarUrl called with: parent-avatar-1
   [DEBUG] Student avatar, returning local path
   ```
   → **原因**: avatar_id の命名規則が想定と異なる
   → **対策**: parentAvatarMap に新しいキーを追加

### フェーズ2: Network タブ確認

1. **準備**
   - DevTools で Network タブに移動
   - Filter を "Img" に設定
   - "Preserve log" をチェック
   - ページをリロード

2. **画像リクエストの確認**

   **確認項目チェックリスト**:

   | 項目 | 確認内容 | 正常値 | 異常値と意味 |
   |------|----------|--------|------------|
   | **Status Code** | リクエストの成否 | `200 OK` | `404 Not Found` → ファイルが存在しない<br>`403 Forbidden` → アクセス権限なし<br>`0` → CORS エラー |
   | **Request URL** | 実際にリクエストされたURL | Vercel Blob Storage URL | `/avatars/parent1.png` → マッピング失敗 |
   | **Type** | リソースタイプ | `png` または `image/png` | `document` → リダイレクト発生 |
   | **Initiator** | リクエスト元 | `encouragement-history.tsx:212` | - |
   | **Response Headers** | サーバーからのヘッダー | `access-control-allow-origin: *` | CORS ヘッダーがない → クロスオリジン失敗 |
   | **Referrer-Policy** | リファラーポリシー | `strict-origin-when-cross-origin` または `no-referrer` | - |

3. **異常パターンと対策**

   **パターン A: 404 エラー**
   ```
   Request URL: https://hebbkx1anhila5yf.public.blob.vercel-storage.com/parent1-HbhESuJlC27LuGOGupullRXyEUzFLy.png
   Status: 404 Not Found
   ```
   → **原因**: Vercel Blob Storage のファイルが削除された、またはURL が古い
   → **対策**: `/app/setup/parent-avatar/page.tsx` の URL と一致しているか確認

   **パターン B: CORS エラー**
   ```
   Console: Access to image at 'https://...' from origin 'http://localhost:3000' has been blocked by CORS policy
   Status: (failed) net::ERR_FAILED
   ```
   → **原因**: Vercel Blob Storage の CORS 設定が不正
   → **対策**: Vercel ダッシュボードで Blob Storage の CORS 設定を確認

   **パターン C: ローカルパスへのリクエスト**
   ```
   Request URL: http://localhost:3000/avatars/parent1.png
   Status: 404 Not Found
   ```
   → **原因**: getAvatarUrl がマッピングに失敗し、ローカルパスを返している
   → **対策**: フェーズ1 のコンソールログで avatar_id の実際の値を確認

### フェーズ3: データベース確認

**SQL クエリ**:
```sql
SELECT
  p.id,
  p.display_name,
  p.nickname,
  p.avatar_id,
  p.role
FROM profiles p
WHERE p.role = 'parent'
ORDER BY p.created_at DESC
LIMIT 10;
```

**期待される結果**:
```
| id   | display_name | nickname | avatar_id | role   |
|------|--------------|----------|-----------|--------|
| xxx  | 田中花子      | ママ      | parent1   | parent |
| yyy  | 山田太郎      | パパ      | parent2   | parent |
```

**異常パターン**:

| avatar_id の値 | 問題 | 対策 |
|----------------|------|------|
| `NULL` | アバターが設定されていない | セットアップフロー完了状況を確認 |
| `"https://..."` | フルURL形式で保存されている | コード側では `startsWith("http")` で正しく処理される |
| `""` （空文字） | 空文字で保存されている | null チェックに空文字チェックも追加 |
| `"default"` | デフォルト値で保存されている | parentAvatarMap に `"default"` キーを追加 |

### フェーズ4: コードパス検証

1. **React DevTools でコンポーネント State を確認**
   - React DevTools をインストール
   - EncouragementHistory コンポーネントを選択
   - `messages` state を確認
   - 各メッセージの `sender_profile.avatar_id` を確認

2. **imgタグの src 属性を直接確認**
   - Elements タブで応援履歴のアバター画像要素を選択
   - `src` 属性の実際の値を確認
   - 期待値: `https://hebbkx1anhila5yf.public.blob.vercel-storage.com/parent1-...`
   - 異常値: `/avatars/parent1.png` または `/avatars/default.png`

## デバッグログの管理ガイドライン

### ログ削除のタイミング

**以下の条件を満たした時点で削除**:
1. 問題の原因が特定された
2. 修正が適用され、動作確認が完了した
3. 本番環境にデプロイする直前

### ログ削除手順

**削除対象箇所**:

1. `app/student/reflect/encouragement-history.tsx:40-44`
   ```typescript
   // 以下を削除
   if (result.messages && result.messages.length > 0) {
     console.log('[DEBUG] First message sender_profile:', result.messages[0].sender_profile)
     console.log('[DEBUG] First message avatar_id:', result.messages[0].sender_profile?.avatar_id)
   }
   ```

2. `app/student/reflect/encouragement-history.tsx:67-96` の各 `console.log` 行
   ```typescript
   // 以下のすべての console.log を削除
   console.log('[DEBUG] getAvatarUrl called with:', avatar)
   console.log('[DEBUG] No avatar, returning default')
   console.log('[DEBUG] Avatar is HTTP URL, returning as-is')
   console.log('[DEBUG] Found parent avatar mapping:', parentAvatarMap[avatar])
   console.log('[DEBUG] Student avatar, returning local path')
   ```

### 条件付きログとして残す場合

開発環境でのみログを出力したい場合：

```typescript
const getAvatarUrl = (avatar: string | null) => {
  if (process.env.NODE_ENV === 'development') {
    console.log('[DEBUG] getAvatarUrl called with:', avatar)
  }

  if (!avatar) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[DEBUG] No avatar, returning default')
    }
    return "/avatars/default.png"
  }

  // ... 以下同様
}
```

### コメントによるドキュメント化

ログを削除する際は、デバッグの知見をコメントとして残す：

```typescript
/**
 * アバターIDからURLを生成する
 *
 * 処理ロジック:
 * 1. null/undefined → デフォルトアバター
 * 2. "http" で始まる → そのまま返す（既にフルURL）
 * 3. "parent1"〜"parent6" → Vercel Blob Storage URL にマッピング
 * 4. その他 → 生徒アバターのローカルパス
 *
 * 注意: 保護者アバターは外部ホスティング（Vercel Blob Storage）、
 *       生徒アバターは /public/avatars/ に配置
 */
const getAvatarUrl = (avatar: string | null) => {
  // ... 実装
}
```

## トラブルシューティングフローチャート

```
問題発生: 保護者アバターが表示されない
    ↓
フェーズ1: Console ログ確認
    ├─ ログが出ない → React コンポーネントが正しくレンダリングされているか確認
    ├─ avatar_id が null → フェーズ3（DB確認）へ
    ├─ avatar_id が URL形式 → コードは正しい、フェーズ2（Network）へ
    └─ avatar_id が "parent1" 形式 → 期待通り、フェーズ2（Network）へ
    ↓
フェーズ2: Network タブ確認
    ├─ Status 404 → URL が間違っている → parent-avatar/page.tsx と照合
    ├─ Status 403 → Vercel Blob Storage のアクセス権限を確認
    ├─ CORS エラー → Vercel ダッシュボードで CORS 設定を確認
    ├─ ローカルパスにリクエスト → マッピング失敗 → フェーズ1 に戻る
    └─ Status 200 → 画像は正常に取得できている → CSS の問題（display: none 等）
    ↓
フェーズ3: データベース確認
    ├─ avatar_id が NULL → セットアップフロー未完了 → ユーザーに再設定を促す
    ├─ avatar_id が空文字 → null チェックに空文字チェックを追加
    └─ avatar_id が想定外の値 → マッピング辞書を更新
    ↓
フェーズ4: コードパス検証
    └─ React DevTools、Elements タブで実際の DOM と State を確認
```

## 次のアクション

**ユーザーに実施いただきたいこと**:

1. 生徒アカウントでログイン
2. `/student/reflect` ページに移動
3. ブラウザの DevTools（Console タブ）を開く
4. 表示されたログをすべてコピー
5. Network タブに移動し、画像リクエストの Status Code と Request URL を確認
6. これらの情報を共有

**この情報から判明すること**:
- データベースから正しく avatar_id が取得できているか
- getAvatarUrl が正しいマッピングを返しているか
- 実際にどの URL にリクエストが飛んでいるか
- リクエストが失敗している原因（404、CORS、etc.）

---

**作成日**: 2025-11-10
**最終更新**: 2025-11-10
