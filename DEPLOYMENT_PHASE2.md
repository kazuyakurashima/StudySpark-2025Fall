# Phase 2 本番環境適用手順書

## 概要

保護者ダッシュボードのService Role完全排除とRLS実装を本番環境に適用します。

## 前提条件

- ✅ ローカル環境でテスト完了
- ✅ RLS無限再帰問題の解決確認済み
- ⚠️ 本番環境のバックアップ取得必須

## 適用マイグレーション

以下の5つのマイグレーションを**この順序で**適用します：

1. `20251102000001_add_parent_students_rls.sql` - students/マスタデータRLS追加
2. `20251102000002_add_profiles_rls_for_parents_coaches.sql` - profiles RLS追加
3. `20251105000001_fix_rls_infinite_recursion.sql` - parent_child_relations修正
4. `20251105000002_fix_profiles_rls_recursion.sql` - profiles修正（中間版）
5. `20251105000003_complete_rls_fix.sql` - 完全修正版

## 事前準備

### 1. バックアップ取得

```bash
# 本番環境のデータベースバックアップ
npx supabase db dump --linked -f backup_before_phase2_$(date +%Y%m%d_%H%M%S).sql

# または、Supabase Dashboard から手動バックアップ
```

### 2. マイグレーション適用確認

```bash
# ローカルでマイグレーション一覧確認
ls -1 supabase/migrations/*.sql | grep 202511

# 出力例（この順序で適用される）:
# supabase/migrations/20251102000001_add_parent_students_rls.sql
# supabase/migrations/20251102000002_add_profiles_rls_for_parents_coaches.sql
# supabase/migrations/20251105000001_fix_rls_infinite_recursion.sql
# supabase/migrations/20251105000002_fix_profiles_rls_recursion.sql
# supabase/migrations/20251105000003_complete_rls_fix.sql
```

## 適用手順

### ステージング環境（推奨）

ステージング環境がある場合、先にこちらで動作確認を行います。

```bash
# 1. ステージング環境にリンク
npx supabase link --project-ref <staging-project-ref>

# 2. マイグレーション適用
npx supabase db push

# 3. 動作確認（後述の「動作確認手順」参照）
```

### 本番環境

```bash
# 1. 本番環境にリンク
npx supabase link --project-ref <production-project-ref>

# 2. 現在のマイグレーション状態確認
npx supabase migration list

# 3. マイグレーション適用
npx supabase db push

# ⚠️ 注意: db reset は使用しない！
# npx supabase db reset は全データ削除なので本番では絶対に実行しない
```

## 動作確認手順

### 1. 保護者ログインテスト

```bash
# 本番環境のURL
https://your-production-url.com

# テストアカウント（本番環境に存在する保護者アカウント）
# 例: parent@example.com
```

**確認項目**:
- ✅ ログイン成功
- ✅ ダッシュボード表示（エラーなし）
- ✅ 子供のデータ表示
  - 名前、学年、コース
  - 学習カレンダー
  - 今週の進捗
  - 最近の学習履歴
- ✅ 子供の詳細データアクセス
  - 学習ログ
  - 目標設定
  - 振り返り

### 2. 指導者ログインテスト（該当する場合）

**確認項目**:
- ✅ ログイン成功
- ✅ 担当生徒一覧表示
- ✅ 生徒詳細データアクセス

### 3. エラーログ確認

```bash
# Supabase Dashboard で以下を確認
# - Database > Logs
# - 「infinite recursion」エラーがないこと
# - RLSポリシー関連のエラーがないこと
```

### 4. パフォーマンス確認

- ダッシュボードの読み込み速度
- クエリ実行時間（Supabase Dashboard > Database > Query Performance）

## ロールバック手順

問題が発生した場合の戻し方：

### 方法1: マイグレーションの取り消し（推奨）

各マイグレーションファイルの末尾にロールバック用SQLコメントがあります。

```sql
-- 20251105000003_complete_rls_fix.sql のロールバック例
DROP FUNCTION IF EXISTS public.get_children_user_ids();
DROP FUNCTION IF EXISTS public.get_assigned_students_user_ids();
DROP FUNCTION IF EXISTS public.get_children_student_ids();
DROP FUNCTION IF EXISTS public.get_assigned_student_ids();
DROP POLICY IF EXISTS "Parents can view children profiles" ON public.students;
-- ...
```

### 方法2: バックアップからのリストア

```bash
# 事前に取得したバックアップからリストア
psql <connection-string> < backup_before_phase2_YYYYMMDD_HHMMSS.sql
```

## トラブルシューティング

### 問題1: 「infinite recursion detected」エラー

**原因**: RLSポリシーの循環参照
**対処**: `20251105000003_complete_rls_fix.sql`が正しく適用されているか確認

```bash
# 関数の存在確認
npx supabase db diff --schema public --use-migrated-schemas

# 期待される関数:
# - get_children_user_ids()
# - get_assigned_students_user_ids()
# - get_children_student_ids()
# - get_assigned_student_ids()
```

### 問題2: 保護者が子供のデータを見られない

**原因**: RLSポリシーが正しく適用されていない
**対処**: 各テーブルのRLS状態確認

```sql
-- profiles テーブルのポリシー確認
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'profiles';

-- 期待されるポリシー:
-- - "Parents can view children profiles"
-- - "Coaches can view assigned students profiles"
```

### 問題3: パフォーマンス低下

**原因**: SECURITY DEFINER関数の実行コスト
**対処**:
1. インデックスの確認
2. 必要に応じてクエリ最適化

```sql
-- 必要なインデックスが存在するか確認
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename IN ('parent_child_relations', 'parents', 'students')
AND indexname LIKE 'idx_%';

-- 期待されるインデックス:
-- - idx_parent_child_relations_parent_id
-- - idx_parent_child_relations_student_id
-- - idx_parents_user_id
-- - idx_students_user_id
```

## 重要な注意事項

### ❌ やってはいけないこと

1. **本番環境で `npx supabase db reset` を実行しない**
   - 全データが削除されます
   - CLAUDE.md line 263 参照

2. **マイグレーションの順序を変更しない**
   - タイムスタンプ順に適用される必要があります

3. **ロールバック時に中途半端な状態で放置しない**
   - 完全にロールバックするか、完全に適用するか、どちらかにする

### ✅ 必ず行うこと

1. **バックアップ取得**
   - マイグレーション適用前に必ず取得

2. **ステージング環境での事前確認**
   - 可能であれば必ず実施

3. **動作確認の徹底**
   - 保護者、指導者の両方でテスト

## 参考資料

- Phase 2実装詳細: `TODO_SERVICE_ROLE_MIGRATION.md`
- インシデント記録: `INCIDENT_REPORT.md`
- プロジェクトルール: `CLAUDE.md`

## チェックリスト

適用前:
- [ ] バックアップ取得完了
- [ ] マイグレーション順序確認
- [ ] ステージング環境での動作確認（該当する場合）
- [ ] チーム/関係者への通知

適用中:
- [ ] マイグレーション適用完了
- [ ] エラーログ確認

適用後:
- [ ] 保護者ログインテスト完了
- [ ] 指導者ログインテスト完了（該当する場合）
- [ ] パフォーマンス確認
- [ ] 24時間の監視体制

---

## 補足: ローカル検証専用スクリプト

以下のスクリプトは**本番環境では使用しません**（ローカル開発・テスト専用）:

- `scripts/seed-demo-data.ts` - デモデータ作成
- `scripts/test-parent-rls.ts` - RLSテスト
- `scripts/test-simple-rls.ts` - シンプルRLSテスト
- `scripts/verify-demo-data.ts` - データ検証

これらは `.gitignore` に追加する必要はありませんが、本番適用時には実行不要です。
