# Supabase Dashboardでパスワードをリセットする手順

SQLでのパスワード設定がうまくいかないので、Supabase DashboardのUIから直接リセットします。

## 手順

1. **Supabase Dashboard** を開く
   - https://supabase.com/dashboard
   - プロジェクト `zlipaeanhcslhintxpej` を選択

2. **Authentication** > **Users** をクリック

3. **hana6@studyspark.local** のユーザーをクリック

4. **右側の詳細パネルで以下を探す：**
   - "Send password recovery" ボタン、または
   - "Update user" ボタン、または
   - パスワードフィールド

5. **パスワードを `<社内管理>` に設定**
   - もし "Send password recovery" しかない場合は、一度削除して再作成します

---

## もしUIでパスワード変更ができない場合：

### プランB: hana6を削除して、Supabase Admin APIで再作成

以下のSQLを実行してhana6を完全に削除：

```sql
-- 関連データを削除
DELETE FROM public.parent_child_relations WHERE student_id IN (SELECT id FROM public.students WHERE login_id = 'hana6');
DELETE FROM public.students WHERE login_id = 'hana6';
DELETE FROM public.profiles WHERE id = '1f01a511-3045-4a5c-9c1c-115913c630d9';
DELETE FROM auth.users WHERE email = 'hana6@studyspark.local';
```

その後、Supabase Dashboard > Authentication > Users > "Add user" から手動で作成：
- Email: `hana6@studyspark.local`
- Password: `<社内管理>`
- Auto Confirm User: ✓
- User Metadata:
```json
{"role":"student","login_id":"hana6","full_name":"青空 花","email_verified":true}
```

作成後、profileとstudentレコードを再作成します。
