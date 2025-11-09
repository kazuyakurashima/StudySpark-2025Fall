# 本番環境トラブルシューティングガイド

## 問題: 保護者ログインで子供が表示されない

### 原因の切り分け手順

1. **データ層の確認**
   ```sql
   SELECT COUNT(*) FROM parent_child_relations;
   ```
   - 0件 → データ投入が必要
   - 3件以上 → データは存在、次へ

2. **関数層の確認**
   ```sql
   SELECT routine_name FROM information_schema.routines
   WHERE routine_name LIKE 'get_%_ids';
   ```
   - 0件 → マイグレーション未適用
   - 4件 → 関数は存在、次へ

3. **ポリシー層の確認**
   ```sql
   SELECT tablename, policyname FROM pg_policies
   WHERE tablename IN ('profiles', 'students')
   AND policyname LIKE '%Parents%';
   ```
   - 0件 → ポリシー作成が必要
   - 2件以上 → ポリシーは存在

### 対応マトリクス

| データ | 関数 | ポリシー | 対応 |
|--------|------|----------|------|
| ❌ | ❌ | ❌ | フル対応: マイグレーション＋データ |
| ❌ | ✅ | ✅ | データ投入のみ |
| ✅ | ❌ | ❌ | マイグレーション適用 |
| ✅ | ✅ | ❌ | ポリシー手動作成 |
| ✅ | ✅ | ✅ | 別の問題（コード、キャッシュ等） |

### 安全な実行手順

#### 1. バックアップ（必須）
```bash
# Supabaseダッシュボードから、または
pg_dump "$PRODUCTION_DB_URL" > backup_$(date +%Y%m%d_%H%M%S).sql
```

#### 2. ドライラン（可能な限り）
```bash
# マイグレーションの場合
npx supabase db push --db-url "$PRODUCTION_DB_URL" --dry-run

# スクリプトの場合
DRY_RUN=true npx tsx scripts/create-demo-users-api-improved.ts
```

#### 3. 段階的実行
- 1件だけ試してエラーがないか確認
- 問題なければ残りを実行

#### 4. ロールバック準備
```sql
-- 親子関係を削除する場合
DELETE FROM parent_child_relations
WHERE created_at > NOW() - INTERVAL '1 hour';

-- ポリシーを削除する場合
DROP POLICY IF EXISTS "Parents can view children profiles" ON profiles;
```

### よくあるミス

1. **全角スペースの見落とし**
   - ❌ `'青空太郎'`
   - ✅ `'青空 太郎'`

2. **マイグレーション順序の無視**
   - 20251105000001 → 002 → 003の順番を守る

3. **RLSポリシーの循環参照**
   - SECURITY DEFINER関数を使わずに直接JOINすると無限ループ

4. **環境変数の設定ミス**
   - Service Role Keyが必要（Anon Keyでは不可）

### デバッグ用SQL

```sql
-- 包括的な状態確認
WITH checks AS (
  SELECT
    'parent_child_relations' as name,
    COUNT(*)::text as value
  FROM parent_child_relations
  UNION ALL
  SELECT
    'get_children_user_ids()',
    CASE WHEN COUNT(*) > 0 THEN '存在' ELSE '不在' END
  FROM information_schema.routines
  WHERE routine_name = 'get_children_user_ids'
  UNION ALL
  SELECT
    'profiles RLS for parents',
    CASE WHEN COUNT(*) > 0 THEN '存在' ELSE '不在' END
  FROM pg_policies
  WHERE tablename = 'profiles'
    AND policyname LIKE '%Parents%'
)
SELECT * FROM checks;
```