# STEP 2: 残りのauth.usersを作成

Supabase Dashboard > Authentication > Users > "Add user" から以下のユーザーを手動作成してください。

## hikaru6 (星野 光)
- **Email**: `hikaru6@studyspark.local`
- **Password**: `<社内管理>`
- **Auto Confirm User**: チェックを入れる
- **User Metadata** (JSON):
```json
{
  "role": "student",
  "login_id": "hikaru6",
  "full_name": "星野 光",
  "email_verified": true
}
```

## akira5 (星野 明)
- **Email**: `akira5@studyspark.local`
- **Password**: `<社内管理>`
- **Auto Confirm User**: チェックを入れる
- **User Metadata** (JSON):
```json
{
  "role": "student",
  "login_id": "akira5",
  "full_name": "星野 明",
  "email_verified": true
}
```

## parent1 (青空 太郎)
- **Email**: `demo-parent1@example.com`
- **Password**: `<社内管理>`
- **Auto Confirm User**: チェックを入れる
- **User Metadata** (JSON):
```json
{
  "role": "parent",
  "full_name": "青空 太郎",
  "email_verified": true
}
```

## parent2 (星野 一朗)
- **Email**: `demo-parent2@example.com`
- **Password**: `<社内管理>`
- **Auto Confirm User**: チェックを入れる
- **User Metadata** (JSON):
```json
{
  "role": "parent",
  "full_name": "星野 一朗",
  "email_verified": true
}
```

---

## 作成後の確認

以下のSQLで作成されたユーザーのUUIDを確認してください：

```sql
SELECT id, email, raw_user_meta_data->>'role' as role, raw_user_meta_data->>'full_name' as full_name
FROM auth.users
ORDER BY email;
```

これらのUUIDをメモして、STEP 3で使用します。
