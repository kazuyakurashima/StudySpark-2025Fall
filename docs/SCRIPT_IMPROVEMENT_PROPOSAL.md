# デモユーザー作成スクリプト改善提案

## 現状の問題点

### 1. 削除ロジックの脆弱性
**現状:**
- `auth_users_view`ビューや`get_users_by_emails`関数に依存
- 本番環境にこれらが存在しない場合、削除が機能しない
- 結果として既存ユーザーとの衝突でエラーになる

### 2. エラーハンドリングの不足
- 既存ユーザーが存在する場合の処理が不完全
- 部分的な成功/失敗時の状態が不明確

## 改善案

### 方法1: Supabase Admin APIの活用（推奨）

```typescript
// scripts/create-demo-users-api-v2.ts

import { createClient } from '@supabase/supabase-js'

async function deleteExistingDemoUsers(supabase: any) {
  console.log("🗑️ 既存デモユーザーの削除中...")

  // Admin APIのlistUsersを使用
  const { data: { users }, error } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000
  })

  if (error) {
    console.error("ユーザー一覧取得エラー:", error)
    return
  }

  // デモユーザーのメールパターン
  const demoEmails = [
    'hana6@studyspark.local',
    'hikaru6@studyspark.local',
    'akira5@studyspark.local',
    'demo-parent1@example.com',
    'demo-parent2@example.com'
  ]

  // 削除対象をフィルタリング
  const usersToDelete = users?.filter(user =>
    demoEmails.includes(user.email || '')
  ) || []

  console.log(`  削除対象ユーザー数: ${usersToDelete.length}`)

  // 各ユーザーを削除
  for (const user of usersToDelete) {
    try {
      await supabase.auth.admin.deleteUser(user.id)
      console.log(`  ✓ 削除: ${user.email}`)
    } catch (err) {
      console.error(`  ✗ 削除失敗: ${user.email}`, err)
    }
  }

  // データベースからも削除（カスケード削除が設定されていない場合）
  await supabase.from('students').delete().in('login_id', ['hana6', 'hikaru6', 'akira5'])
  await supabase.from('parents').delete().in('id', [1, 2]) // または適切な条件
}
```

### 方法2: Upsert戦略（既存を更新）

```typescript
async function upsertDemoUsers(supabase: any) {
  // INSERTの代わりにUPSERTを使用
  const { data, error } = await supabase
    .from('students')
    .upsert(
      {
        login_id: 'hana6',
        full_name: '青空 花',
        grade: 6,
        // ... その他のフィールド
      },
      {
        onConflict: 'login_id',
        ignoreDuplicates: false  // 既存レコードを更新
      }
    )
}
```

### 方法3: トランザクション処理

```typescript
async function createDemoUsersWithTransaction(supabase: any) {
  // Supabase RPCを使用したトランザクション
  const { data, error } = await supabase.rpc('create_demo_users_transaction', {
    // パラメータ
  })

  if (error) {
    console.error('トランザクション失敗:', error)
    // 自動的にロールバック
  }
}
```

## 実装優先度

1. **短期（今回）**: 直接SQLで親子関係を追加 ✅
2. **中期**: Admin API listUsers/deleteUserを使った確実な削除
3. **長期**: トランザクション処理による原子性保証

## テスト環境での検証

改善したスクリプトは必ず以下の順序でテスト：

1. ローカル環境で新規実行
2. ローカル環境で再実行（冪等性の確認）
3. ステージング環境で実行
4. 本番環境で実行

## 付録：必要なSupabase設定

### Admin APIを使用する場合の権限
- Service Role Keyが必須
- 環境変数: `SUPABASE_SERVICE_ROLE_KEY`

### RPC関数を使用する場合
```sql
-- Supabase SQL Editorで実行
CREATE OR REPLACE FUNCTION create_demo_users_transaction()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  -- トランザクション内での処理
  -- 1. 既存削除
  -- 2. 新規作成
  -- 3. 親子関係作成

  RETURN json_build_object('success', true);
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Transaction failed: %', SQLERRM;
END;
$$;
```