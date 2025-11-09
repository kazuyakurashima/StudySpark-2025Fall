# デプロイメントチェックリスト

## 本番環境へのデプロイ前確認事項

### 1. データベース変更の確認
- [ ] ローカルでマイグレーションファイルを作成したか確認
  ```bash
  ls -la supabase/migrations/
  ```
- [ ] 環境変数を設定
  ```bash
  export PRODUCTION_DB_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT_ID].supabase.co:5432/postgres"
  ```
- [ ] 未適用のマイグレーションを確認（特に20251105000001,2,3に注意）
  ```bash
  npx supabase migration list --db-url "$PRODUCTION_DB_URL"
  ```
- [ ] マイグレーションを本番に適用
  ```bash
  npx supabase db push --db-url "$PRODUCTION_DB_URL"
  ```
- [ ] SECURITY DEFINER関数が作成されているか確認
  ```sql
  SELECT routine_name FROM information_schema.routines
  WHERE routine_name LIKE 'get_%_ids' OR routine_name LIKE 'current_%_id';
  ```

### 2. RLSポリシーの確認
- [ ] 新しいテーブルにRLSが有効化されているか
- [ ] 必要なロール（student/parent/coach）用のポリシーが追加されているか
- [ ] 特に重要：親子関係・指導者関係で他ユーザーのデータを参照する場合
  - parent_child_relations
  - students（保護者が子供のデータを見る）
  - profiles（保護者が子供のプロフィールを見る）

### 3. サンプルデータの確認
- [ ] 親子関係データが存在するか確認
  ```sql
  SELECT COUNT(*) FROM parent_child_relations;
  ```
- [ ] デモユーザーが正しく作成されているか
  ```sql
  SELECT p.full_name, s.full_name, s.grade
  FROM parent_child_relations pcr
  JOIN parents p ON p.id = pcr.parent_id
  JOIN students s ON s.id = pcr.student_id;
  ```

### 4. コードのデプロイ
- [ ] ビルドエラーがないか確認
  ```bash
  pnpm run build
  ```
- [ ] mainブランチにマージ
  ```bash
  git checkout main
  git merge feature/your-branch
  git push origin main
  ```

### 5. デプロイ後の動作確認
- [ ] Vercelのビルドログを確認
- [ ] 保護者アカウントでログインして子供が表示されるか
- [ ] ハートバッジ等の機能が動作するか
- [ ] エラーログを確認（Vercel Functions → Logs）

## トラブルシューティング

### 子供が表示されない場合
1. parent_child_relationsにデータがあるか確認
2. RLSポリシーが正しく設定されているか確認（特にprofiles）
3. コードのJOIN構文が正しいか確認

### マイグレーションエラーの場合
1. 本番環境の接続情報が正しいか確認
2. Service Roleキーを使用しているか確認
3. 既存のポリシーとの競合がないか確認

## 重要な教訓

**マイグレーション → データ投入 → コードデプロイの順番を守る**

この順番を守らないと：
- ローカルでは動くが本番では動かない
- データはあるのに表示されない
- RLSポリシーの不整合が発生する