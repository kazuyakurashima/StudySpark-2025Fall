# 本番環境デプロイ手順書（改訂版）

**作成日**: 2025-11-12
**対象**: StudySpark 本番環境への安全なデプロイ手順

---

## 📋 目次

1. [事前準備](#事前準備)
2. [デプロイ手順](#デプロイ手順)
3. [動作確認](#動作確認)
4. [トラブルシューティング](#トラブルシューティング)
5. [ロールバック手順](#ロールバック手順)

---

## 事前準備

### 1. 必要な情報の準備

以下の情報を準備してください：

```bash
# Supabase情報
SUPABASE_PROJECT_ID="your_project_id"
SUPABASE_DB_PASSWORD="your_db_password"
SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"

# OpenAI
OPENAI_API_KEY="your_openai_key"
```

### 2. 環境変数ファイルの作成

**セキュリティのため、接続情報を環境変数ファイルに保存します。**

```bash
# .env.production を作成（Gitに含めない）
cat > .env.production <<EOF
PRODUCTION_DB_URL="postgresql://postgres:${SUPABASE_DB_PASSWORD}@db.${SUPABASE_PROJECT_ID}.supabase.co:5432/postgres"
SUPABASE_SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY}"
EOF

# .gitignoreに追加されているか確認
grep -q ".env.production" .gitignore || echo ".env.production" >> .gitignore
```

### 3. ローカル環境でのビルドテスト

```bash
# 依存関係のインストール
pnpm install

# TypeScriptの型チェック
pnpm run type-check || npx tsc --noEmit

# ビルドテスト
pnpm run build
```

**ビルドが成功することを確認してから次へ進んでください。**

---

## デプロイ手順

### ステップ1: データベースマイグレーションの適用

#### 1-1. 環境変数の読み込み

```bash
# 環境変数を読み込む（シェル履歴に残さない）
export $(cat .env.production | xargs)
```

#### 1-2. 本番環境のマイグレーション状態を確認

```bash
# 現在適用されているマイグレーションを確認
npx supabase migration list --db-url "$PRODUCTION_DB_URL"
```

**期待される出力:**
```
✔ 20251105000001_fix_rls_infinite_recursion.sql (applied)
✔ 20251105000002_fix_profiles_rls_recursion.sql (applied)
✔ 20251105000003_complete_rls_fix.sql (applied)
○ 20251108000001_update_sender_profiles_rpc_add_nickname.sql (pending)
○ 20251109000001_add_streak_tracking.sql (pending)
○ 20251110000001_fix_theme_color_constraint.sql (pending)
○ 20251110000002_add_student_view_encouragement_sender_profiles.sql (pending)
○ 20251111000001_add_get_study_logs_for_encouragement_rpc.sql (pending)
```

#### 1-3. マイグレーションの適用（migration up を使用）

⚠️ **重要**: `db push` ではなく `migration up` を使用します。

```bash
# 未適用のマイグレーションを順番に適用
npx supabase migration up --db-url "$PRODUCTION_DB_URL"
```

**実行結果の確認:**
```
Applying migration 20251108000001_update_sender_profiles_rpc_add_nickname.sql...
Applying migration 20251109000001_add_streak_tracking.sql...
Applying migration 20251110000001_fix_theme_color_constraint.sql...
Applying migration 20251110000002_add_student_view_encouragement_sender_profiles.sql...
Applying migration 20251111000001_add_get_study_logs_for_encouragement_rpc.sql...
✅ All migrations applied successfully
```

#### 1-4. マイグレーション適用後の状態確認

```bash
# 再度確認して、すべて applied になっているか確認
npx supabase migration list --db-url "$PRODUCTION_DB_URL"
```

---

### ステップ2: データベース変更の検証

Supabase Dashboard → SQL Editor で以下のSQLを実行し、マイグレーションが正しく適用されたことを確認します。

#### 2-1. 新規カラムの確認

```sql
-- students テーブルの新しいカラムを確認
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'students'
  AND column_name IN ('last_study_date', 'current_streak', 'max_streak')
ORDER BY ordinal_position;
```

**期待される結果:** 3行返る

```
column_name       | data_type | is_nullable | column_default
------------------+-----------+-------------+---------------
last_study_date   | date      | YES         | NULL
current_streak    | integer   | YES         | 0
max_streak        | integer   | YES         | 0
```

#### 2-2. RPC関数の確認

```sql
-- 新しいRPC関数が作成されているか確認
SELECT
  routine_name,
  routine_type,
  security_type,
  data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'get_sender_profiles',
    'get_sender_profile',
    'get_study_logs_for_encouragement'
  )
ORDER BY routine_name;
```

**期待される結果:** 3行返る

#### 2-3. RLSポリシーの確認

```sql
-- students テーブルのRLSポリシーを確認
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual IS NOT NULL as has_using_clause,
  with_check IS NOT NULL as has_check_clause
FROM pg_policies
WHERE tablename = 'students'
ORDER BY policyname;
```

#### 2-4. トリガーの確認

```sql
-- students テーブルのトリガーを確認
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table = 'students'
ORDER BY trigger_name;
```

**期待される結果:** `update_student_streak` トリガーが存在する

---

### ステップ3: Vercel環境変数の確認

Vercel Dashboard → Settings → Environment Variables で以下を確認：

#### 3-1. 必須環境変数の確認

| 変数名 | スコープ | 設定値 |
|--------|---------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Production, Preview | `https://[PROJECT_ID].supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production, Preview | Supabase Anon Key |
| `SUPABASE_SERVICE_ROLE_KEY` | Production のみ | Supabase Service Role Key（本番用） |
| `OPENAI_API_KEY` | Production, Preview | OpenAI API Key |

⚠️ **セキュリティポイント:**
- `SUPABASE_SERVICE_ROLE_KEY` は **Production スコープのみ** に設定
- Preview環境には開発用Supabaseプロジェクトのキーを使用（本番と分離）

#### 3-2. オプション環境変数（テスト用）

| 変数名 | 用途 | 設定値例 |
|--------|------|---------|
| `NEXT_PUBLIC_TIME_OVERRIDE` | 時間依存機能のテスト | `2025-11-16T14:00:00+09:00` (土曜14時) |
| `NEXT_PUBLIC_ALLOW_REFLECT_ANYTIME` | 振り返り機能の時間制限解除 | `true` |

**注意:** 本番環境では設定しない（テスト・Preview環境のみ）

---

### ステップ4: コードのデプロイ

#### 4-1. mainブランチの確認

```bash
# 現在のブランチを確認
git branch

# mainブランチに切り替え（まだの場合）
git checkout main

# 最新の状態を確認
git log --oneline -5
```

#### 4-2. Vercelでの自動デプロイ

GitHubの `main` ブランチにプッシュ済みなので、Vercelが自動的にデプロイを開始します。

```bash
# Vercel Dashboard → Deployments で確認
# または Vercel CLI を使用
npx vercel --prod
```

#### 4-3. ビルドログの確認

1. [Vercel Dashboard](https://vercel.com/) にアクセス
2. プロジェクトを選択
3. **Deployments** タブで最新のデプロイを確認
4. ビルドログをクリックして詳細を確認

**確認ポイント:**
- ✅ ビルドが成功している
- ✅ エラーや警告がない（または許容範囲内）
- ✅ デプロイ完了メッセージが表示されている

---

## 動作確認

### ステップ5: 基本機能の動作確認

#### 5-1. ログインテスト

**生徒アカウント:**
```
ログインID: hikaru6
パスワード: demo2025
```

**保護者アカウント:**
```
メールアドレス: toshin.hitachi+test002@gmail.com
パスワード: Testdemo2025
```

#### 5-2. 主要機能のチェックリスト

- [ ] **ダッシュボード表示**
  - ダッシュボードが正常に表示される
  - AIコーチからのメッセージが表示される
  - 今日のミッションが表示される

- [ ] **学習記録（スパーク）**
  - 学習記録入力フォームが表示される
  - 記録を保存できる
  - 保存後、ダッシュボードに反映される

- [ ] **連続学習日数機能（新機能）**
  - ダッシュボードに連続学習日数カードが表示される
  - 学習記録入力後、連続日数が更新される
  - `current_streak` と `max_streak` が正しく表示される

- [ ] **応援メッセージ**
  - 保護者が子供に応援メッセージを送信できる
  - 生徒が応援履歴を確認できる
  - 送信者のプロフィール（nickname）が表示される

- [ ] **振り返り機能（土曜12:00以降のみ）**
  - 土曜12:00〜水曜23:59の間に「振り返りを始める」ボタンが表示される
  - AIコーチとの対話が開始できる
  - クロージングメッセージで自動終了する
  - 振り返り完了後、コーチング履歴に即座に表示される

- [ ] **コーチング履歴（新機能）**
  - 過去の振り返りセッションが表示される
  - 「対話の詳細を見る」ボタンで実際の会話が表示される
  - ユーザーとAIコーチのアバターが正しく表示される
  - 振り返り完了後、自動的に履歴が更新される（リロード不要）

#### 5-3. エラーログの確認

**Vercel Functions Logs:**
1. Vercel Dashboard → プロジェクト選択
2. **Logs** タブをクリック
3. 以下のエラーがないか確認:
   - `column "current_streak" does not exist`
   - `function get_sender_profiles() does not exist`
   - `relation "parent_child_relations" does not exist`
   - RLS policy errors

**Supabase Logs:**
1. Supabase Dashboard → Logs
2. **Database Logs** で SQL エラーを確認
3. **API Logs** で REST API エラーを確認
4. **Auth Logs** で認証エラーを確認

特に確認すべきエラー:
- `insufficient_privilege` (RLS違反)
- `permission denied` (権限エラー)
- `relation does not exist` (テーブル/カラム不足)

---

### ステップ6: 時間依存機能のテスト（オプション）

振り返り機能は土曜12:00以降しか利用できないため、通常は週末まで待つ必要があります。
すぐにテストしたい場合は、以下のいずれかの方法を使用します。

#### 方法1: 環境変数で時間をオーバーライド（推奨）

Vercel → Settings → Environment Variables で以下を設定:

```bash
# Preview環境のみ
NEXT_PUBLIC_TIME_OVERRIDE=2025-11-16T14:00:00+09:00  # 土曜14時
```

または

```bash
# Preview環境のみ（時間制限を完全に解除）
NEXT_PUBLIC_ALLOW_REFLECT_ANYTIME=true
```

#### 方法2: データベースで日付を書き換え

Supabase SQL Editor で以下を実行:

```sql
-- 今週の開始日を土曜日に変更（テスト用）
UPDATE coaching_sessions
SET week_start_date = CURRENT_DATE - EXTRACT(DOW FROM CURRENT_DATE)::INTEGER + 6,
    week_end_date = CURRENT_DATE - EXTRACT(DOW FROM CURRENT_DATE)::INTEGER + 12
WHERE student_id = (SELECT id FROM students WHERE login_id = 'hikaru6')
  AND status = 'in_progress';
```

---

## トラブルシューティング

### エラー: カラムが見つからない

```
column "current_streak" does not exist
```

**原因:** マイグレーションが適用されていない

**対応:**
```bash
# マイグレーション状態を確認
npx supabase migration list --db-url "$PRODUCTION_DB_URL"

# 未適用の場合、再度実行
npx supabase migration up --db-url "$PRODUCTION_DB_URL"
```

---

### エラー: RPC関数が見つからない

```
function get_sender_profiles() does not exist
```

**原因:** マイグレーション `20251108000001` が未適用

**対応:**
```bash
# 特定のマイグレーションが適用されているか確認
npx supabase migration list --db-url "$PRODUCTION_DB_URL" | grep 20251108000001

# 未適用の場合、再度実行
npx supabase migration up --db-url "$PRODUCTION_DB_URL"
```

---

### エラー: RLS policy違反

```
new row violates row-level security policy
```

**原因:** RLSポリシーが正しく設定されていない、または未適用

**対応:**

1. **RLSポリシーの確認:**
```sql
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'students';
```

2. **マイグレーション状態の確認:**
```bash
npx supabase migration list --db-url "$PRODUCTION_DB_URL"
```

3. **RLSポリシーの再適用が必要な場合:**
   - 該当するマイグレーションファイルを確認
   - 必要に応じて、SQL Editorで手動実行

---

### エラー: マイグレーションが途中で失敗

```
Error applying migration: ...
```

**対応手順:**

1. **適用状態を確認:**
```bash
npx supabase migration list --db-url "$PRODUCTION_DB_URL"
```

2. **どこまで適用されたか確認:**
```sql
-- Supabaseのマイグレーション履歴テーブルを確認
SELECT * FROM supabase_migrations.schema_migrations
ORDER BY version DESC
LIMIT 10;
```

3. **失敗したマイグレーションのロールバック:**
   - Supabaseは自動ロールバック非対応
   - 手動で該当する変更をREVERTする必要がある
   - 例: カラムを追加したマイグレーションが失敗した場合
     ```sql
     ALTER TABLE students DROP COLUMN IF EXISTS current_streak;
     ```

4. **問題を修正後、再度適用:**
```bash
npx supabase migration up --db-url "$PRODUCTION_DB_URL"
```

---

### ビルドエラー

```
Type error: Property 'current_streak' does not exist on type 'Student'
```

**原因:** TypeScript型定義とデータベーススキーマの不一致

**対応:**
```bash
# ローカルでビルドテスト
pnpm run build

# エラーがあれば修正してコミット
git add .
git commit -m "fix: 型定義を修正"
git push origin main
```

---

## ロールバック手順

デプロイ後に重大な問題が発生した場合のロールバック手順です。

### 1. Vercelデプロイのロールバック

#### オプション1: Vercel Dashboard経由

1. Vercel Dashboard → Deployments
2. 前回の安定版デプロイメントを選択
3. **"Promote to Production"** をクリック

#### オプション2: Git経由

```bash
# 前のコミットに戻す
git revert HEAD
git push origin main

# または特定のコミットに戻す
git reset --hard <前の安定版のコミットハッシュ>
git push origin main --force
```

### 2. データベースマイグレーションのロールバック

⚠️ **注意:** Supabaseは自動ロールバック機能がありません。手動で戻す必要があります。

#### 2-1. バックアップからの復元

```bash
# Supabase Dashboard → Database → Backups
# 最新の安定版バックアップを選択して復元
```

#### 2-2. 手動ロールバック（特定のマイグレーションのみ）

各マイグレーションに対応するREVERT SQLを実行:

**例: 20251109000001_add_streak_tracking.sql のロールバック**
```sql
-- トリガーを削除
DROP TRIGGER IF EXISTS update_student_streak_trigger ON study_logs;
DROP FUNCTION IF EXISTS update_student_streak();

-- カラムを削除
ALTER TABLE students
  DROP COLUMN IF EXISTS last_study_date,
  DROP COLUMN IF EXISTS current_streak,
  DROP COLUMN IF EXISTS max_streak;
```

---

## ✅ デプロイ完了チェックリスト

最終確認として、以下をすべてチェックしてください：

### データベース
- [ ] マイグレーションがすべて適用された (`migration list` で確認)
- [ ] 新しいカラムが存在する (`students` テーブル確認)
- [ ] RPC関数が作成された (3つの関数を確認)
- [ ] RLSポリシーが正しく設定された
- [ ] トリガーが動作している

### Vercel
- [ ] ビルドが成功した
- [ ] 環境変数が正しく設定された
- [ ] Production環境にデプロイされた

### 動作確認
- [ ] デモアカウントでログインできる
- [ ] ダッシュボードが正常に表示される
- [ ] 学習記録が入力・保存できる
- [ ] 連続学習日数が表示・更新される
- [ ] 応援メッセージが送受信できる
- [ ] 振り返り機能が動作する（時間帯に注意）
- [ ] コーチング履歴が表示される

### ログ確認
- [ ] Vercel Functions Logsにエラーなし
- [ ] Supabase Database Logsにエラーなし
- [ ] Supabase API Logsにエラーなし
- [ ] ブラウザコンソールにエラーなし

---

## 📚 参考資料

- [Supabase CLI - migration up](https://supabase.com/docs/reference/cli/supabase-migration-up)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- プロジェクト内ドキュメント:
  - `docs/PRE_DEPLOYMENT_CHECKS.md` - デプロイ前チェック
  - `docs/DEPLOYMENT_CHECKLIST.md` - 旧チェックリスト
  - `docs/PRODUCTION_TROUBLESHOOTING.md` - トラブルシューティング詳細
  - `CHANGELOG.md` - 変更履歴

---

## 📝 変更履歴

| 日付 | 変更内容 | 担当者 |
|------|---------|--------|
| 2025-11-12 | 初版作成（改訂版） | Claude |

---

**重要な教訓:**

1. **マイグレーション → データ投入 → コードデプロイ** の順番を守る
2. **`migration up` を使用**して、バージョン管理されたマイグレーションのみを適用
3. **接続情報は環境変数ファイルに保存**し、シェル履歴に残さない
4. **RLSポリシーとトリガーも確認**する
5. **Supabase側のログも必ず確認**する
6. **時間依存機能のテスト手順を準備**しておく
