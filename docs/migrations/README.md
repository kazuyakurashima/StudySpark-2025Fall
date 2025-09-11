# Database Migration Guide

このディレクトリには、StudySparkアプリケーションのSupabaseデータベースセットアップに必要なSQLマイグレーションファイルが含まれています。

## マイグレーション実行順序

以下の順序でSupabaseダッシュボードのSQL Editorからマイグレーションを実行してください：

### 1. 基本テーブル作成
\`\`\`sql
-- 001_create_profiles_table.sql
-- プロフィールテーブルとRLSポリシーの作成
\`\`\`

### 2. クラス管理テーブル
\`\`\`sql
-- 002_create_classes_and_memberships.sql
-- クラスとクラス所属テーブルの作成
\`\`\`

### 3. 学習記録テーブル
\`\`\`sql
-- 003_create_learning_records.sql
-- 学習記録テーブルとRLSポリシーの作成
\`\`\`

### 4. 目標・テストスケジュール
\`\`\`sql
-- 004_create_test_schedules_and_goals.sql
-- テストスケジュールと目標設定テーブルの作成
\`\`\`

### 5. メッセージ機能
\`\`\`sql
-- 005_create_messages.sql
-- メッセージとAIコーチメッセージテーブルの作成
\`\`\`

### 6. 学習連続記録
\`\`\`sql
-- 006_create_learning_streaks.sql
-- 連続学習日数追跡テーブルとトリガー関数の作成
\`\`\`

### 7. 初期データ投入
\`\`\`sql
-- 007_insert_test_data.sql
-- テストスケジュールの初期データ投入
\`\`\`

### 8. パフォーマンス最適化
\`\`\`sql
-- 008_add_additional_indexes.sql
-- 追加インデックスの作成
\`\`\`

### 9. 依存関係のあるRLSポリシー追加
\`\`\`sql
-- 009_add_coach_policies.sql
-- クラステーブル作成後に実行するコーチ関連ポリシー
\`\`\`

### 10. ユーザー登録用Functions作成
\`\`\`sql
-- 010_create_user_registration_functions.sql
-- 新規ユーザー登録時のプロフィール自動作成関数
\`\`\`

### 11. ユーザー管理Triggers作成
\`\`\`sql
-- 011_create_user_triggers.sql
-- auth.users テーブルの変更時に自動実行されるトリガー
\`\`\`

### 12. テスト用クエリ（オプション）
\`\`\`sql
-- 012_test_user_registration.sql
-- トリガーとファンクションの動作確認用クエリ
\`\`\`

## 実行後の確認事項

### 1. テーブル作成確認
\`\`\`sql
-- テーブル一覧確認
\dt

-- 各テーブルの構造確認
\d profiles
\d learning_records
-- など
\`\`\`

### 2. RLSポリシー確認
\`\`\`sql
-- RLS有効化確認
SELECT tablename, rowsecurity FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = true;

-- ポリシー一覧確認
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies WHERE schemaname = 'public';
\`\`\`

### 3. インデックス確認
\`\`\`sql
-- インデックス一覧確認
SELECT indexname, tablename, indexdef 
FROM pg_indexes 
WHERE schemaname = 'public' 
ORDER BY tablename, indexname;
\`\`\`

## 追加設定が必要な項目

### 1. 学習記録の自動ストリーク更新
`006_create_learning_streaks.sql`の最後にコメントアウトされているトリガーを有効化：

\`\`\`sql
CREATE TRIGGER update_streak_on_learning_record
  AFTER INSERT OR UPDATE ON learning_records
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_learning_streak();
\`\`\`

### 2. 環境変数設定
`.env.local`に以下を設定：
\`\`\`bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
\`\`\`

### 3. 認証設定
Supabase認証の設定：
- Email認証を有効化
- 必要に応じてソーシャルログイン設定

## トラブルシューティング

### エラー: relation "auth.users" does not exist
- Supabaseの認証が有効化されていない場合に発生
- Dashboard > Authentication > Settingsで認証を有効化

### エラー: permission denied for schema auth
- RLSポリシーでauth.uid()を使用する前にauth extensionが必要
- 通常はSupabaseで自動的に有効化されます

### パフォーマンスが遅い
- `008_add_additional_indexes.sql`のインデックスが適用されているか確認
- `ANALYZE`コマンドで統計情報を更新

## バックアップとロールバック

### バックアップ
\`\`\`bash
# テーブル構造のバックアップ
pg_dump -h your-host -U postgres -d your-db --schema-only > backup_schema.sql

# データのバックアップ
pg_dump -h your-host -U postgres -d your-db --data-only > backup_data.sql
\`\`\`

### ロールバック
各テーブルを削除する場合（注意：データも削除されます）：
\`\`\`sql
-- 依存関係の順序で削除
DROP TABLE IF EXISTS learning_streaks CASCADE;
DROP TABLE IF EXISTS ai_coach_messages CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS goals CASCADE;
DROP TABLE IF EXISTS test_schedules CASCADE;
DROP TABLE IF EXISTS learning_records CASCADE;
DROP TABLE IF EXISTS class_memberships CASCADE;
DROP TABLE IF EXISTS classes CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- 関数の削除
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS update_learning_streak(uuid, date) CASCADE;
DROP FUNCTION IF EXISTS trigger_update_learning_streak() CASCADE;
DROP FUNCTION IF EXISTS validate_coach_code(text) CASCADE;
\`\`\`
