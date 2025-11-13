# Langfuse実装セキュリティガイドライン

## 概要

このドキュメントは、Langfuse実装における重要なセキュリティ原則とレビュー指針を定義します。

---

## サービスロールクライアントの使用原則

### ✅ 使用して良い場所

**1. AI生成関数（`lib/openai/*`）**
```typescript
// ✅ OK: AI生成時のトレース保存
import { createServiceClient } from "@/lib/supabase/service-client"

export async function generateCoachMessage(context) {
  // ... AI生成処理

  const supabase = createServiceClient()  // ✅ OK
  await supabase.from("langfuse_traces").insert(...)
}
```

**2. バッチ処理（`app/api/langfuse/batch/*`）**
```typescript
// ✅ OK: Cronジョブでの集計処理
import { createServiceClient } from "@/lib/supabase/service-client"

export async function POST(request: Request) {
  // Cron認証後
  const supabase = createServiceClient()  // ✅ OK
  await supabase.from("langfuse_traces").select(...)
}
```

**3. システム自動処理**
- データマイグレーション
- メンテナンススクリプト
- 定期クリーンアップ

---

### ❌ 使用してはいけない場所

**1. ユーザーリクエスト処理（Server Actions）**
```typescript
// ❌ NG: ユーザーがトリガーする処理
"use server"

import { createServiceClient } from "@/lib/supabase/service-client"

export async function deleteUserData(userId: string) {
  const supabase = createServiceClient()  // ❌ NG: RLSをバイパスしてしまう
  await supabase.from("users").delete().eq("id", userId)
}
```

**正しい実装**:
```typescript
// ✅ OK: ユーザーセッションベースのクライアント
"use server"

import { createClient } from "@/lib/supabase/server"

export async function deleteUserData(userId: string) {
  const supabase = await createClient()  // ✅ OK: RLSが効く
  await supabase.from("users").delete().eq("id", userId)
}
```

**2. API Routes（ユーザー認証が必要な場合）**
```typescript
// ❌ NG: ユーザーデータの読み書き
export async function GET(request: Request) {
  const supabase = createServiceClient()  // ❌ NG
  const { data } = await supabase.from("learning_logs").select()
  return NextResponse.json(data)
}
```

**正しい実装**:
```typescript
// ✅ OK: 認証トークンベースのクライアント
export async function GET(request: Request) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "")
  const supabase = createClient(URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  })  // ✅ OK: RLSが効く

  const { data } = await supabase.from("learning_logs").select()
  return NextResponse.json(data)
}
```

---

## レビューチェックリスト

### Pull Request時のセキュリティチェック

#### ✅ サービスロールクライアント使用箇所の確認

```bash
# サービスロールクライアント使用箇所を検索
grep -r "createServiceClient" app/ lib/
```

**チェック項目**:
- [ ] 使用箇所はすべて「AI生成」「バッチ処理」「システム自動処理」か？
- [ ] Server ActionsやユーザーAPI Routeで使われていないか？
- [ ] コードレビューで他の開発者が確認したか？

#### ✅ RLSバイパスの影響範囲確認

サービスロールクライアントを使う場合、以下を確認：

- [ ] どのテーブルに書き込むか明記されているか？
- [ ] ユーザーデータを直接操作していないか？
- [ ] コメントで「なぜサービスロールが必要か」説明されているか？

**推奨コメント例**:
```typescript
// サービスロールクライアントを使用（理由: AI生成時にユーザーセッションがないため）
const supabase = createServiceClient()
```

---

## Lint設定（推奨）

### ESLint カスタムルール

`.eslintrc.json`に追加:

```json
{
  "rules": {
    "no-restricted-imports": ["error", {
      "patterns": [{
        "group": ["**/supabase/service-client"],
        "message": "⚠️ createServiceClient()はAI生成・バッチ処理のみで使用してください。ユーザーリクエスト処理ではcreateClient()を使用してください。"
      }]
    }]
  }
}
```

**例外設定**: `lib/openai/*`と`app/api/langfuse/batch/*`のみ許可

---

## 環境変数の管理

### サービスロールキーの取り扱い

**重要**: `SUPABASE_SERVICE_ROLE_KEY`は**絶対に公開しない**

**チェック項目**:
- [ ] `.env.example`にはダミー値のみ記載
- [ ] `.gitignore`に`.env.local`が含まれている
- [ ] Vercel環境変数に本番キーが設定されている
- [ ] ローカル環境のみで使用（クライアント側では使わない）

---

## トラブルシューティング

### 問題: RLSエラーが発生する

**症状**:
```
Error: new row violates row-level security policy for table "langfuse_traces"
```

**原因**: ユーザーセッションベースのクライアントを使っている

**解決策**:
- AI生成・バッチ処理の場合 → `createServiceClient()`に変更
- ユーザーリクエストの場合 → RLSポリシーを確認

---

### 問題: 意図しないデータが見える

**症状**: ユーザーAが本来見えないユーザーBのデータにアクセスできる

**原因**: サービスロールクライアントを誤用している

**解決策**:
- Server ActionsやAPI Routeで`createServiceClient()`を使っていないか確認
- `createClient()`に変更してRLSを有効化

---

## セキュリティインシデント対応

### サービスロールキーが漏洩した場合

1. **即座にキーをローテーション**（Supabaseダッシュボード）
2. **影響範囲の調査**（アクセスログ確認）
3. **チームへの通知**
4. **再発防止策の検討**

---

## 定期レビュー

### 四半期ごとのセキュリティチェック

- [ ] サービスロールクライアント使用箇所のレビュー
- [ ] RLSポリシーの妥当性確認
- [ ] 環境変数の棚卸し
- [ ] インシデント有無の確認

---

## 参考資料

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [Service Role vs Anon Key](https://supabase.com/docs/guides/api/api-keys)
