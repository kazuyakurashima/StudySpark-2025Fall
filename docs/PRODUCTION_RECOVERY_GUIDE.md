# 本番環境復旧ガイド

## 現状の問題

**症状**: 保護者ログインで子供が表示されない

**診断結果** (2025-11-06):
- ✅ 親子関係データ: 3件存在
- ❌ SECURITY DEFINER関数: 0件（不足）
- ❌ profiles用保護者RLSポリシー: 0件（不足）
- ❌ students用保護者RLSポリシー: 0件（不足）

**根本原因**: 本番環境にマイグレーション管理システム（`supabase_migrations`テーブル）が存在せず、RLS関連の関数とポリシーが未適用。

---

## 復旧手順

### 前提条件
- Supabase本番プロジェクトへのアクセス権限
- SQL Editorの使用権限
- バックアップ作成権限

### 所要時間
- 約20-30分（各ステップの確認含む）

---

## STEP 0: 事前準備

### ☐ バックアップ作成（必須）

1. Supabase Dashboard → Database → Backups
2. "Create backup" をクリック
3. バックアップ完了を確認

**または** コマンドライン:
```bash
pg_dump "$PRODUCTION_DB_URL" > backup_$(date +%Y%m%d_%H%M%S).sql
```

### ☐ 作業環境確認

- [ ] Supabase Dashboard にログイン済み
- [ ] SQL Editor を開ける
- [ ] 本番プロジェクトを選択済み

---

## STEP 1: current_*_id() 関数の作成

### 目的
ログイン中のユーザーのID（student_id, parent_id, coach_id）を返す関数を作成。

### SQL実行

```sql
-- ============================================================================
-- 1. current_*_id() 関数の作成
-- ============================================================================

-- 現在ログイン中のユーザーが生徒の場合、その student_id を返す
CREATE OR REPLACE FUNCTION public.current_student_id()
RETURNS BIGINT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT id
  FROM public.students
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.current_student_id() TO authenticated;

COMMENT ON FUNCTION public.current_student_id() IS
'現在のユーザーのstudent_idを返す（RLSバイパス）。生徒でない場合はNULLを返す。';

-- 現在ログイン中のユーザーが保護者の場合、その parent_id を返す
CREATE OR REPLACE FUNCTION public.current_parent_id()
RETURNS BIGINT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT id
  FROM public.parents
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.current_parent_id() TO authenticated;

COMMENT ON FUNCTION public.current_parent_id() IS
'現在のユーザーのparent_idを返す（RLSバイパス）。保護者でない場合はNULLを返す。';

-- 現在ログイン中のユーザーが指導者の場合、その coach_id を返す
CREATE OR REPLACE FUNCTION public.current_coach_id()
RETURNS BIGINT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT id
  FROM public.coaches
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.current_coach_id() TO authenticated;

COMMENT ON FUNCTION public.current_coach_id() IS
'現在のユーザーのcoach_idを返す（RLSバイパス）。指導者でない場合はNULLを返す。';
```

### 確認

```sql
-- 関数が作成されたか確認
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE 'current_%_id'
ORDER BY routine_name;
```

**期待値**: 3件（current_coach_id, current_parent_id, current_student_id）

### ☐ チェック
- [ ] SQL実行完了
- [ ] 確認クエリで3件表示された
- [ ] エラーなし

---

## STEP 2: get_*_ids() 関数の作成

### 目的
保護者・指導者が閲覧可能な子供・担当生徒のIDリストを返す関数を作成。

### SQL実行

```sql
-- ============================================================================
-- 2. get_*_ids() 関数の作成
-- ============================================================================

-- 子供の user_id を返す
CREATE OR REPLACE FUNCTION public.get_children_user_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT s.user_id
  FROM public.parent_child_relations pcr
  JOIN public.students s ON s.id = pcr.student_id
  JOIN public.parents p ON p.id = pcr.parent_id
  WHERE p.user_id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.get_children_user_ids() TO authenticated;

COMMENT ON FUNCTION public.get_children_user_ids() IS
'現在の保護者の子供のuser_idリストを返す（RLSバイパス、profiles/students用）。';

-- 指導者の担当生徒の user_id を返す
CREATE OR REPLACE FUNCTION public.get_assigned_students_user_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT s.user_id
  FROM public.coach_student_relations csr
  JOIN public.students s ON s.id = csr.student_id
  JOIN public.coaches c ON c.id = csr.coach_id
  WHERE c.user_id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.get_assigned_students_user_ids() TO authenticated;

COMMENT ON FUNCTION public.get_assigned_students_user_ids() IS
'現在の指導者の担当生徒のuser_idリストを返す（RLSバイパス、profiles/students用）。';

-- 子供の student_id を返す
CREATE OR REPLACE FUNCTION public.get_children_student_ids()
RETURNS SETOF BIGINT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT pcr.student_id
  FROM public.parent_child_relations pcr
  JOIN public.parents p ON p.id = pcr.parent_id
  WHERE p.user_id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.get_children_student_ids() TO authenticated;

COMMENT ON FUNCTION public.get_children_student_ids() IS
'現在の保護者の子供のstudent_idリストを返す（RLSバイパス、students RLS用）。';

-- 指導者の担当生徒の student_id を返す
CREATE OR REPLACE FUNCTION public.get_assigned_student_ids()
RETURNS SETOF BIGINT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT csr.student_id
  FROM public.coach_student_relations csr
  JOIN public.coaches c ON c.id = csr.coach_id
  WHERE c.user_id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.get_assigned_student_ids() TO authenticated;

COMMENT ON FUNCTION public.get_assigned_student_ids() IS
'現在の指導者の担当生徒のstudent_idリストを返す（RLSバイパス、students RLS用）。';
```

### 確認

```sql
-- 関数が作成されたか確認
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE 'get_%_ids'
ORDER BY routine_name;
```

**期待値**: 4件（get_assigned_student_ids, get_assigned_students_user_ids, get_children_student_ids, get_children_user_ids）

### ☐ チェック
- [ ] SQL実行完了
- [ ] 確認クエリで4件表示された
- [ ] エラーなし

---

## STEP 3: parent_child_relations ポリシーの更新

### 目的
親子関係テーブルのRLSポリシーをSECURITY DEFINER関数を使用する形式に更新。

### SQL実行

```sql
-- ============================================================================
-- 3. parent_child_relations のポリシー更新
-- ============================================================================

DROP POLICY IF EXISTS "Students can view own parent relations" ON public.parent_child_relations;
DROP POLICY IF EXISTS "Parents can view own children relations" ON public.parent_child_relations;

CREATE POLICY "Students can view own parent relations"
  ON public.parent_child_relations
  FOR SELECT
  TO authenticated
  USING (
    student_id = public.current_student_id()
  );

CREATE POLICY "Parents can view own children relations"
  ON public.parent_child_relations
  FOR SELECT
  TO authenticated
  USING (
    parent_id = public.current_parent_id()
  );
```

### 確認

```sql
-- ポリシーが更新されたか確認
SELECT policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'parent_child_relations'
ORDER BY policyname;
```

**期待値**: 2件（生徒用、保護者用）

### ☐ チェック
- [ ] SQL実行完了
- [ ] 確認クエリで2件表示された
- [ ] エラーなし

---

## STEP 4: profiles / students ポリシーの作成

### 目的
保護者・指導者が子供・担当生徒のprofiles/studentsテーブルを閲覧できるようにする。

### SQL実行

```sql
-- ============================================================================
-- 4. profiles / students のポリシー作成
-- ============================================================================

-- profiles
DROP POLICY IF EXISTS "Parents can view children profiles" ON public.profiles;
DROP POLICY IF EXISTS "Coaches can view assigned students profiles" ON public.profiles;

CREATE POLICY "Parents can view children profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    id IN (SELECT public.get_children_user_ids())
  );

CREATE POLICY "Coaches can view assigned students profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    id IN (SELECT public.get_assigned_students_user_ids())
  );

-- students
DROP POLICY IF EXISTS "Parents can view children profiles" ON public.students;
DROP POLICY IF EXISTS "Coaches can view assigned students profiles" ON public.students;

CREATE POLICY "Parents can view children profiles"
  ON public.students
  FOR SELECT
  TO authenticated
  USING (
    id IN (SELECT public.get_children_student_ids())
  );

CREATE POLICY "Coaches can view assigned students profiles"
  ON public.students
  FOR SELECT
  TO authenticated
  USING (
    id IN (SELECT public.get_assigned_student_ids())
  );
```

### 確認

```sql
-- ポリシーが作成されたか確認
SELECT tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'students')
  AND policyname LIKE '%Parents%'
ORDER BY tablename, policyname;
```

**期待値**: 2件（profiles 1件 + students 1件）

### ☐ チェック
- [ ] SQL実行完了
- [ ] 確認クエリで2件表示された
- [ ] エラーなし

---

## STEP 5: 総合診断

### 目的
すべての関数とポリシーが正しく作成されたことを確認。

### SQL実行

```sql
-- 総合診断クエリ
SELECT
  'チェック項目' as category,
  name,
  status,
  CASE
    WHEN name = '親子関係データ' AND status = '3件' THEN '✓'
    WHEN name = 'current_*_id()関数' AND status = '3件' THEN '✓'
    WHEN name = 'get_*_ids()関数' AND status = '4件' THEN '✓'
    WHEN name LIKE '%ポリシー' AND status::int >= 1 THEN '✓'
    ELSE '✗'
  END as result
FROM (
  SELECT 1 as sort_order, '親子関係データ' as name, COUNT(*) || '件' as status
  FROM parent_child_relations

  UNION ALL

  SELECT 2, 'current_*_id()関数', COUNT(*) || '件'
  FROM information_schema.routines
  WHERE routine_schema = 'public' AND routine_name LIKE 'current_%_id'

  UNION ALL

  SELECT 3, 'get_*_ids()関数', COUNT(*) || '件'
  FROM information_schema.routines
  WHERE routine_schema = 'public' AND routine_name LIKE 'get_%_ids'

  UNION ALL

  SELECT 4, 'profiles用保護者ポリシー', COUNT(*) || '件'
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname LIKE '%Parents%'

  UNION ALL

  SELECT 5, 'students用保護者ポリシー', COUNT(*) || '件'
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'students' AND policyname LIKE '%Parents%'
) diagnostic
ORDER BY sort_order;
```

### 期待結果

| category | name | status | result |
|----------|------|--------|--------|
| チェック項目 | 親子関係データ | 3件 | ✓ |
| チェック項目 | current_*_id()関数 | 3件 | ✓ |
| チェック項目 | get_*_ids()関数 | 4件 | ✓ |
| チェック項目 | profiles用保護者ポリシー | 1件 | ✓ |
| チェック項目 | students用保護者ポリシー | 1件 | ✓ |

### ☐ チェック
- [ ] すべての項目が「✓」
- [ ] 件数が期待値と一致

---

## STEP 6: 動作確認

### 保護者アカウント1

**ログイン情報**:
- Email: `demo-parent1@example.com`
- Password: `<社内管理>`

**確認項目**:
- [ ] ログイン成功
- [ ] ダッシュボードに「青空 花」が表示される
- [ ] 子供のニックネーム、アバター、学年が正しく表示
- [ ] ハートバッジが正しく表示される
- [ ] 応援メッセージ送信が機能する
- [ ] 送信後、ハートバッジが即座に更新される

### 保護者アカウント2

**ログイン情報**:
- Email: `demo-parent2@example.com`
- Password: `<社内管理>`

**確認項目**:
- [ ] ログイン成功
- [ ] ダッシュボードに「星野 光」「星野 明」の2名が表示される
- [ ] 子供の切り替えが機能する
- [ ] 各子供の学習データが正しく表示される
- [ ] ハートバッジが各子供ごとに正しく表示される
- [ ] 応援メッセージ送信が機能する

---

## トラブルシューティング

### エラーが発生した場合

1. **エラーメッセージをコピー**
2. **該当ステップを中断**
3. **以下を確認**:
   - 既存の関数/ポリシーとの名前衝突
   - 権限不足
   - 構文エラー

### ロールバック手順

問題が発生した場合、以下のSQLで作成した要素を削除できます：

```sql
-- 関数の削除
DROP FUNCTION IF EXISTS public.current_student_id();
DROP FUNCTION IF EXISTS public.current_parent_id();
DROP FUNCTION IF EXISTS public.current_coach_id();
DROP FUNCTION IF EXISTS public.get_children_user_ids();
DROP FUNCTION IF EXISTS public.get_assigned_students_user_ids();
DROP FUNCTION IF EXISTS public.get_children_student_ids();
DROP FUNCTION IF EXISTS public.get_assigned_student_ids();

-- ポリシーの削除
DROP POLICY IF EXISTS "Parents can view children profiles" ON public.profiles;
DROP POLICY IF EXISTS "Coaches can view assigned students profiles" ON public.profiles;
DROP POLICY IF EXISTS "Parents can view children profiles" ON public.students;
DROP POLICY IF EXISTS "Coaches can view assigned students profiles" ON public.students;

-- parent_child_relationsのポリシーは既存のものを維持
```

その後、バックアップから復元します。

---

## 完了後の対応

### ドキュメント更新

- [ ] `DEPLOYMENT_CHECKLIST.md` に今回の手順を追記
- [ ] `PRODUCTION_TROUBLESHOOTING.md` に診断クエリを追記

### 今後の運用

本番環境はマイグレーション管理されていないため：
1. スキーマ変更は手動SQL実行
2. 変更履歴はGitで管理（マイグレーションファイル参照）
3. 本番適用時は必ずバックアップ取得

### 将来的な改善

Supabase CLIによるマイグレーション管理への移行を検討：
```bash
# 初期化（慎重に実施）
npx supabase init
npx supabase link --project-ref [PROJECT_ID]
npx supabase db pull
```

---

## 参考資料

- マイグレーションファイル: `supabase/migrations/20251105000003_complete_rls_fix.sql`
- ローカル環境: 同じ関数・ポリシーが適用済み
- RLS設計: SECURITY DEFINER関数で循環参照を回避