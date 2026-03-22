# adminアカウント修正手順

## 問題の概要

`admin@studyspark.jp` でログインできるが、管理者画面にアクセスできない。

**根本原因**: `scripts/create-coach-admin-accounts.ts` で `auth.users` と `profiles` へのレコード作成は行われているが、`admins` テーブルへのINSERTが欠落しているため、RLSポリシーの admin 判定に失敗する。

## 確認クエリ

Supabase SQL Editorで以下を実行して状態を確認:

```sql
SELECT
  u.id,
  u.email,
  p.role,
  p.setup_completed,
  a.full_name AS admin_name,
  a.invitation_code
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
LEFT JOIN public.admins a ON a.user_id = u.id
WHERE u.email = 'admin@studyspark.jp';
```

`admin_name` が NULL なら `admins` テーブルにレコードが未作成。

## 修正SQL

```sql
INSERT INTO public.admins (user_id, full_name, invitation_code)
SELECT
  u.id,
  '管理者',
  gen_random_uuid()
FROM auth.users u
WHERE u.email = 'admin@studyspark.jp'
ON CONFLICT (user_id) DO NOTHING;
```

## スクリプトの修正

`scripts/create-coach-admin-accounts.ts` の admin 作成部分に admins テーブルへのINSERTを追加する必要がある。

参照: `supabase/migrations/20251004000001_create_auth_tables.sql` line 154-176

```typescript
// adminsテーブルへのINSERT（現在欠落している）
await supabase.from('admins').insert({
  user_id: userId,
  full_name: account.fullName,
  invitation_code: crypto.randomUUID(),
})
```

## ステータス

- [ ] 本番DBへの修正SQL実行
- [ ] `create-coach-admin-accounts.ts` スクリプト修正
- [ ] 動作確認（admin@studyspark.jp でログイン → 管理者画面表示）
