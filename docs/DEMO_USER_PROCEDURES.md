# デモユーザー作成手順書

## 概要

本ドキュメントは、StudySparkのデモ環境に新規デモユーザーを追加する際の標準手順を定めたものです。

## ⚠️ 重要な注意事項

**必ず Supabase Admin API を使用してユーザーを作成してください。**

- ❌ **SQL で `auth.users` に直接 INSERT/UPDATE しないでください**
- ✅ **`supabase.auth.admin.createUser()` を使用してください**

理由：
- Admin API を使用することで、`auth.identities` テーブルが自動的に生成されます
- 直接 SQL で挿入すると、`auth.identities` が欠落し、ログインが失敗します
- `confirmation_token` などの内部フィールドの不整合を避けられます

## 重要な規約

### メールアドレス形式

**生徒アカウント**: 必ず `<login_id>@studyspark.local` 形式を使用すること

```
例：
- hana6@studyspark.local (ログインID: hana6)
- hikaru6@studyspark.local (ログインID: hikaru6)
- akira5@studyspark.local (ログインID: akira5)
```

**保護者・指導者・管理者アカウント**: 実際のメールアドレスまたはテスト用メールアドレス

```
例：
- demo-parent1@example.com
- coach1@example.com
```

### パスワード

- **生徒**: `<社内管理>`
- **保護者・指導者**: `<社内管理>`

### UUID生成ルール

一貫性のあるUUIDを使用して、データの追跡を容易にします：

```
パターン: [ファミリーID]-[ロール種別]-[ロール種別]-[個人番号]-[個人番号パディング]

例：
- 青空家の花（生徒）: a0000001-0001-0001-0001-000000000001
- 青空家の太郎（保護者）: a0000001-0001-0001-0002-000000000002
- 星野家の光（生徒）: b0000002-0002-0002-0001-000000000001
- 星野家の明（生徒）: b0000002-0002-0002-0002-000000000002
- 星野家の一朗（保護者）: b0000002-0002-0002-0003-000000000003
```

## 推奨: TypeScript スクリプトを使用した作成手順（Admin API 使用）

### 1. スクリプトの実行

`scripts/create-demo-users-api.ts` を使用してデモユーザーを作成します。

```bash
# 環境変数を設定してスクリプトを実行
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 \
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU \
npx tsx scripts/create-demo-users-api.ts
```

### 2. スクリプトのカスタマイズ

`scripts/create-demo-users-api.ts` 内の `DEMO_USERS` オブジェクトを編集してユーザー情報を変更します。

```typescript
const DEMO_USERS = {
  students: [
    {
      id: "a0000001-0001-0001-0001-000000000001",
      loginId: "hana6",
      email: "hana6@studyspark.local",  // ★ <login_id>@studyspark.local 形式
      password: process.env.DEMO_STUDENT_PASSWORD, // 環境変数から取得
      fullName: "青空 花",
      furigana: "あおぞらはな",
      nickname: "はなちゃん🌸",
      avatarId: "student2",
      grade: 6,
      course: "C",
      familyId: "aozora",
    },
    // 他の生徒を追加...
  ],
  parents: [
    {
      id: "a0000001-0001-0001-0002-000000000002",
      email: "demo-parent1@example.com",
      password: process.env.DEMO_PARENT_PASSWORD, // 環境変数から取得
      fullName: "青空 太郎",
      furigana: "あおぞらたろう",
      nickname: "太郎さん",
      avatarId: "parent1",
      familyId: "aozora",  // 生徒と同じ familyId で親子関係を自動作成
    },
    // 他の保護者を追加...
  ],
}
```

### 3. スクリプトの特徴

- ✅ **自動的に auth.identities が生成される**
- ✅ **既存のデモユーザーを自動削除してから作成**
- ✅ **プロフィールトリガーと連携して profiles テーブルを自動生成**
- ✅ **親子関係を familyId で自動作成**
- ✅ **エラーハンドリングと詳細なログ出力**

### 4. 動作確認

スクリプト実行後、以下を確認します：

```bash
# auth.identities が作成されているか確認
docker exec supabase_db_StudySpark-2025Fall psql -U postgres -d postgres -c \
"SELECT user_id, provider, identity_data->>'email' as email FROM auth.identities WHERE identity_data->>'email' LIKE '%studyspark.local';"
```

#### ログイン確認

1. http://localhost:3000 にアクセス
2. 生徒ログイン: `hana6` / `<社内管理>`
3. 保護者ログイン: `demo-parent1@example.com` / `<社内管理>`

## 非推奨: SQL スクリプトを使用した作成手順

**⚠️ この方法は非推奨です。auth.identities の手動作成が必要になり、エラーが発生しやすくなります。**

どうしても SQL で作成する必要がある場合は、以下の手順に従ってください。

### 重要な注意点

SQL で `auth.users` を直接操作する場合：

1. **`auth.identities` にも同じ `user_id` の行を挿入する必要があります**
2. **`identity_data` の `email` と `sub` を正しく設定する必要があります**
3. **`confirmation_token` などの内部フィールドの整合性を保つ必要があります**

Supabase 公式ドキュメントでは、「auth.users を手動で操作しない」ことが推奨されています。

### SQL テンプレート（参考）

```sql
-- 生徒: 山田 太郎（小6）
DO $$
DECLARE
  new_user_id UUID := 'c0000003-0003-0003-0001-000000000001';
  user_email TEXT := 'taro6@studyspark.local';
BEGIN
  -- 1. auth.users に挿入
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role
  ) VALUES (
    new_user_id,
    '00000000-0000-0000-0000-000000000000',
    user_email,
    crypt('<パスワード>', gen_salt('bf')), -- 実際のパスワードは社内管理
    NOW(), NOW(), NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"login_id":"taro6","full_name":"山田 太郎","role":"student"}',
    'authenticated', 'authenticated'
  );

  -- 2. ★ auth.identities にも挿入（重要！）
  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  ) VALUES (
    gen_random_uuid(),
    new_user_id,
    jsonb_build_object('sub', new_user_id::text, 'email', user_email),
    'email',
    NOW(), NOW(), NOW()
  );

  -- 3. profiles 更新（トリガーで自動作成済み）
  UPDATE profiles SET
    nickname = 'たろうくん🎮',
    avatar_id = 'student4',
    display_name = '山田 太郎',
    setup_completed = true
  WHERE id = new_user_id;

  -- 4. students 作成
  INSERT INTO students (user_id, login_id, full_name, furigana, grade, course)
  VALUES (new_user_id, 'taro6', '山田 太郎', 'やまだたろう', 6, 'C');
END $$;
```

## トラブルシューティング

### ログインできない場合

1. **メールアドレスの確認**
```sql
SELECT id, email, raw_user_meta_data->>'login_id' as login_id
FROM auth.users
WHERE email LIKE '%studyspark.local';
```

2. **プロフィール生成の確認**
```sql
SELECT u.email, p.nickname, p.avatar_id, p.theme_color
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
WHERE u.email LIKE '%studyspark.local';
```

3. **生徒データの確認**
```sql
SELECT u.email, s.full_name, s.grade
FROM auth.users u
LEFT JOIN students s ON s.user_id = u.id
WHERE u.email LIKE '%studyspark.local';
```

### プロフィールが生成されていない場合

プロフィールトリガーが正しく動作しているか確認：

```sql
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
```

トリガーが存在しない場合は、マイグレーションを再実行：

```bash
npx supabase db reset
```

## 既存デモユーザー一覧

### 生徒（3名）

| ログインID | メール | パスワード | 氏名 | 学年 |
|-----------|--------|----------|------|------|
| hana6 | hana6@studyspark.local | <社内管理> | 青空 花 | 6 |
| hikaru6 | hikaru6@studyspark.local | <社内管理> | 星野 光 | 6 |
| akira5 | akira5@studyspark.local | <社内管理> | 星野 明 | 5 |

### 保護者（2名）

| メール | パスワード | 氏名 |
|--------|----------|------|
| demo-parent1@example.com | <社内管理> | 青空 太郎 |
| demo-parent2@example.com | <社内管理> | 星野 一朗 |

## チェックリスト

新規デモユーザー作成時は、以下を必ず確認してください：

- [ ] 生徒のメールアドレスが `<login_id>@studyspark.local` 形式になっている
- [ ] `raw_user_meta_data` に `login_id` が含まれている（生徒のみ）
- [ ] パスワードが正しく暗号化されている（`crypt()` 関数使用）
- [ ] UUIDがユニークで規則性がある
- [ ] `profiles`, `students`/`parents` テーブルのデータが一致している
- [ ] ログインテストが成功している
- [ ] 本ドキュメントに新規ユーザー情報を追記している

## 参考資料

- [メインREADME](../README.md)
- [認証要件定義](./02-Requirements-Auth.md)
- [デモユーザー作成SQL](../scripts/create-demo-users-manual.sql)
