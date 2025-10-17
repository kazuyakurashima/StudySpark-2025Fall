# 本番環境デモユーザー作成ガイド

このガイドに従って、本番環境（Supabase）にデモユーザーを作成します。

---

## 現状確認

✅ **完了済み:**
- データベーススキーマの適用（3,316行のSQL）
- 全テーブルが作成済み
- RLSが無効化済み（セットアップ作業のため）

⚠️ **部分的に完了:**
- hana6のauth.userは作成済み（ID: 1f01a511-3045-4a5c-9c1c-115913c630d9）
- ただし、profileとstudentレコードは未作成

❌ **未完了:**
- 残り4ユーザー（hikaru6, akira5, parent1, parent2）
- 親子関係レコード
- RLSの再有効化

---

## セットアップ手順

### STEP 1: hana6を完成させる

**ファイル:** `/tmp/step1_complete_hana6.sql`

Supabase Dashboard > SQL Editor で実行してください。

このSQLは以下を実行します：
- hana6のprofileレコードを作成
- hana6のstudentレコードを作成

**実行後の確認:**
```sql
SELECT * FROM public.profiles WHERE id = '1f01a511-3045-4a5c-9c1c-115913c630d9';
SELECT * FROM public.students WHERE user_id = '1f01a511-3045-4a5c-9c1c-115913c630d9';
```

両方のクエリで1行ずつ返ってくればOKです。

---

### STEP 2: 残りのauth.usersを作成

**ファイル:** `/tmp/step2_create_remaining_auth_users.md`

Supabase Dashboard > Authentication > Users > "Add user" から以下の4ユーザーを手動作成してください：

| ユーザー | Email | Password | User Metadata |
|---------|-------|----------|---------------|
| hikaru6 | hikaru6@studyspark.local | demo2025 | `{"role":"student","login_id":"hikaru6","full_name":"星野 光","email_verified":true}` |
| akira5 | akira5@studyspark.local | demo2025 | `{"role":"student","login_id":"akira5","full_name":"星野 明","email_verified":true}` |
| parent1 | toshin.hitachi+test001@gmail.com | Testdemo2025 | `{"role":"parent","full_name":"青空 太郎","email_verified":true}` |
| parent2 | toshin.hitachi+test002@gmail.com | Testdemo2025 | `{"role":"parent","full_name":"星野 一朗","email_verified":true}` |

**重要:** "Auto Confirm User" にチェックを入れてください。

**実行後の確認:**
```sql
SELECT id, email, raw_user_meta_data->>'role' as role, raw_user_meta_data->>'full_name' as full_name
FROM auth.users
ORDER BY email;
```

5ユーザー（hana6, hikaru6, akira5, parent1, parent2）が表示されることを確認してください。

**次のステップのために、各ユーザーのUUID（id列）をメモしてください。**

---

### STEP 3: profiles, students, parentsレコードを作成

**ファイル:** `/tmp/step3_complete_profiles_students_parents.sql`

このファイルを開き、以下のプレースホルダーを STEP 2 で取得したUUIDに置き換えてください：

- `HIKARU6_UUID_HERE` → hikaru6のauth.users.id
- `AKIRA5_UUID_HERE` → akira5のauth.users.id
- `PARENT1_UUID_HERE` → parent1のauth.users.id
- `PARENT2_UUID_HERE` → parent2のauth.users.id

置き換え後、Supabase Dashboard > SQL Editor で実行してください。

**実行後の確認:**

ファイルの最後にある確認クエリが自動的に実行され、以下が表示されます：
- Profiles: 5行（全ユーザー）
- Students: 3行（hana6, hikaru6, akira5）
- Parents: 2行（青空太郎、星野一朗）

---

### STEP 4: 親子関係を作成

**ファイル:** `/tmp/step4_create_parent_child_relations.sql`

Supabase Dashboard > SQL Editor で実行してください。

このSQLは以下の親子関係を作成します：
- 青空太郎 → 青空花（hana6）
- 星野一朗 → 星野光（hikaru6）
- 星野一朗 → 星野明（akira5）

**実行後の確認:**

ファイルの確認クエリで3行の親子関係が表示されればOKです。

---

### STEP 5: RLSを再有効化

**ファイル:** `/tmp/step5_re_enable_rls.sql`

Supabase Dashboard > SQL Editor で実行してください。

セキュリティのため、RLSを再有効化します。

**実行後の確認:**

確認クエリで全てのテーブルの `rls_enabled` が `true` になっていることを確認してください。

---

## 最終確認とテスト

### 1. データの完全性確認

```sql
-- 全ユーザーの確認
SELECT
  au.email,
  p.role,
  p.display_name,
  p.nickname,
  CASE
    WHEN p.role = 'student' THEN s.login_id
    ELSE NULL
  END as login_id,
  CASE
    WHEN p.role = 'student' THEN s.grade::text
    ELSE NULL
  END as grade
FROM auth.users au
JOIN public.profiles p ON au.id = p.id
LEFT JOIN public.students s ON p.id = s.user_id
ORDER BY p.role, au.email;
```

期待される結果: 5行（3 students, 2 parents）

### 2. ログインテスト

以下のアカウントで本番環境（https://study-spark-2025-fall.vercel.app）にログインできることを確認してください：

**生徒アカウント:**
- hana6 / demo2025
- hikaru6 / demo2025
- akira5 / demo2025

**保護者アカウント:**
- toshin.hitachi+test001@gmail.com / Testdemo2025
- toshin.hitachi+test002@gmail.com / Testdemo2025

### 3. ダッシュボード表示確認

各ロールのダッシュボードが正しく表示されることを確認してください：
- 生徒: 学習記録、目標、カレンダーなど
- 保護者: 子どもの学習状況、応援機能など

---

## トラブルシューティング

### ログインできない場合

1. **メールアドレス／IDまたはパスワードが違います**
   - パスワードを再確認（生徒: `demo2025`, 保護者: `Testdemo2025`）
   - Supabase Dashboard > Authentication > Users で "Email confirmed" が true か確認

2. **プロフィールが見つかりません**
   - `SELECT * FROM profiles WHERE id = 'USER_UUID';` でprofileが存在するか確認
   - 存在しない場合は STEP 3 を再実行

3. **親子関係が表示されない**
   - `SELECT * FROM parent_child_relations;` で関係が作成されているか確認
   - 存在しない場合は STEP 4 を再実行

### RLSエラーが発生する場合

```sql
-- RLSポリシーの確認
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

ポリシーが正しく設定されているか確認してください。

---

## 完了チェックリスト

- [ ] STEP 1: hana6のprofile/student作成完了
- [ ] STEP 2: 4ユーザーのauth.users作成完了
- [ ] STEP 3: 4ユーザーのprofile/student/parent作成完了
- [ ] STEP 4: 親子関係3件作成完了
- [ ] STEP 5: RLS再有効化完了
- [ ] 生徒3アカウントでログイン成功
- [ ] 保護者2アカウントでログイン成功
- [ ] ダッシュボード表示正常

全てチェックが入ったら、デモユーザーセットアップ完了です！🎉
