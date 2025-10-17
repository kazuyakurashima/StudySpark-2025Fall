# hana6を正しく再作成する手順

SQLで作成したユーザーのパスワード認証に問題があるため、Supabase Dashboard UIから作り直します。

## STEP 1: 既存のhana6を完全削除

Supabase Dashboard > SQL Editorで以下を実行：

```sql
-- hana6関連のデータを全て削除
DELETE FROM public.parent_child_relations
WHERE student_id IN (SELECT id FROM public.students WHERE login_id = 'hana6');

DELETE FROM public.students WHERE login_id = 'hana6';
DELETE FROM public.profiles WHERE id = '1f01a511-3045-4a5c-9c1c-115913c630d9';
DELETE FROM auth.users WHERE email = 'hana6@studyspark.local';

-- 確認（0件になるはず）
SELECT COUNT(*) FROM auth.users WHERE email = 'hana6@studyspark.local';
```

## STEP 2: Supabase Dashboard UIからhana6を作成

1. **Supabase Dashboard** > **Authentication** > **Users**
2. **"Add user"** ボタンをクリック
3. **以下を入力：**
   - Email: `hana6@studyspark.local`
   - Password: `demo2025`
   - Auto Confirm User: ✅ チェック
   - User Metadata:
   ```json
   {"role":"student","login_id":"hana6","full_name":"青空 花","email_verified":true}
   ```
4. **"Create user"** をクリック

## STEP 3: UUIDを取得

SQL Editorで実行：

```sql
SELECT id, email FROM auth.users WHERE email = 'hana6@studyspark.local';
```

新しいUUIDをメモしてください。

## STEP 4: profileとstudentレコードを作成

**以下のSQLの `NEW_UUID_HERE` を、STEP 3で取得したUUIDに置き換えて実行：**

```sql
-- profileレコード作成（トリガーで自動作成されているはずだが、念のため確認）
-- もし既に存在する場合はスキップ
INSERT INTO public.profiles (id, role, display_name, nickname, avatar_id, theme_color, created_at, updated_at)
VALUES (
  'NEW_UUID_HERE',
  'student',
  '青空 花',
  'ユーザー1234',
  'student1',
  '#3B82F6',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- studentレコード作成
INSERT INTO public.students (user_id, full_name, furigana, login_id, grade, course, created_at, updated_at)
VALUES (
  'NEW_UUID_HERE',
  '青空 花',
  'あおぞら はな',
  'hana6',
  6,
  'B',
  NOW(),
  NOW()
);

-- 確認
SELECT * FROM public.students WHERE login_id = 'hana6';
```

## STEP 5: 親子関係を再作成

```sql
-- 青空太郎とhana6の親子関係
INSERT INTO public.parent_child_relations (parent_id, student_id, created_at)
SELECT p.id, s.id, NOW()
FROM public.parents p
CROSS JOIN public.students s
WHERE p.full_name = '青空 太郎'
  AND s.login_id = 'hana6';

-- 確認
SELECT p.full_name, s.full_name, s.login_id
FROM public.parent_child_relations pcr
JOIN public.parents p ON pcr.parent_id = p.id
JOIN public.students s ON pcr.student_id = s.id
WHERE s.login_id = 'hana6';
```

## STEP 6: ログインテスト

https://study-spark-2025-fall.vercel.app で：
- ID: `hana6`
- パスワード: `demo2025`

でログインを試してください。

---

**重要:** Dashboard UIから作成したユーザーは、Supabaseが正しくパスワードハッシュを生成するため、認証が確実に動作します。
