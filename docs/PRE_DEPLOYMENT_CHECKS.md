# デプロイ前最終確認事項

**作成日**: 2025-11-09
**対象**: 連続学習日数機能デプロイ前の詳細チェック

---

## ✅ 1. マイグレーション依存関係の確認

### 未適用マイグレーションの確認

**本番環境で実行する前に、以下を確認:**

```bash
# ローカルで現在のマイグレーション状態確認
npx supabase migration list

# 出力例:
# ✔ 20251105000001_fix_rls_infinite_recursion.sql (applied)
# ✔ 20251105000002_fix_profiles_rls_recursion.sql (applied)
# ✔ 20251105000003_complete_rls_fix.sql (applied)
# ✔ 20251108000001_update_sender_profiles_rpc_add_nickname.sql (applied)  ← これが未適用かチェック
# ✔ 20251109000001_add_streak_tracking.sql (applied)
```

### 🚨 重要: 20251108000001 の確認

**マイグレーション:** `20251108000001_update_sender_profiles_rpc_add_nickname.sql`

**内容:**
- `get_sender_profiles()` RPC関数を再作成
- `get_sender_profile()` RPC関数を再作成
- `nickname` フィールドを返り値に追加

**本番に適用済みか確認:**

```sql
-- Supabase SQL Editor で実行
SELECT
  proname AS function_name,
  pg_get_function_result(oid) AS return_type
FROM pg_proc
WHERE proname IN ('get_sender_profiles', 'get_sender_profile')
  AND pronamespace = 'public'::regnamespace;

-- 期待結果:
-- return_type に "nickname" が含まれていれば適用済み
-- 含まれていなければ未適用
```

**判定:**
- ✅ **適用済み**: `20251109000001` のみ適用される
- ⚠️ **未適用**: `20251108000001` と `20251109000001` の両方が適用される

### 依存関係の確認結果

**20251109000001_add_streak_tracking.sql の依存:**

```sql
-- 依存テーブル: students ← 既存テーブル（依存なし）
-- 依存テーブル: study_logs ← 既存テーブル（依存なし）
-- 依存関数: なし
-- 依存トリガー: なし（新規作成）
```

**✅ 結論: 他のマイグレーションに依存していない（独立適用可能）**

---

## ✅ 2. コードとDBの依存関係確認

### データベースカラムの使用箇所

**新規カラムを参照しているコード:**

1. **app/actions/dashboard.ts:523**
   ```typescript
   .select("id, last_study_date, current_streak, max_streak")
   ```

2. **app/actions/dashboard.ts:536-538**
   ```typescript
   const lastStudyDate = student.last_study_date
   const currentStreak = student.current_streak || 0
   const maxStreak = student.max_streak || 0
   ```

**⚠️ 重要:**
- これらのコードは **マイグレーション適用後** でないとエラーになる
- Supabaseクライアントが `students` テーブルから存在しないカラムを読もうとして失敗

### デプロイ順序の厳守

```
❌ 間違った順序（エラーになる）
1. Vercel/Netlifyにコードデプロイ
2. Supabaseにマイグレーション適用
→ 1の時点でカラムが存在せずエラー

✅ 正しい順序
1. Supabaseにマイグレーション適用
2. マイグレーション成功確認
3. Vercel/Netlifyにコードデプロイ
→ カラムが存在するのでエラーなし
```

---

## ✅ 3. 既存データへの更新時間の見積もり

### 本番レコード数の確認

**本番環境のSupabase SQL Editorで実行:**

```sql
-- 1. 生徒の総数
SELECT COUNT(*) as total_students FROM students;

-- 2. 学習ログの総数
SELECT COUNT(*) as total_logs FROM study_logs;

-- 3. 生徒あたりの平均ログ数
SELECT
  AVG(log_count) as avg_logs_per_student,
  MAX(log_count) as max_logs_per_student
FROM (
  SELECT student_id, COUNT(*) as log_count
  FROM study_logs
  GROUP BY student_id
) as log_counts;
```

### 更新時間の見積もり

**マイグレーションの DO $$ ブロックは全生徒を1件ずつ処理:**

| 生徒数 | 平均ログ数/生徒 | 見積もり時間 |
|-------|--------------|------------|
| 10人 | 50ログ | 1〜2秒 |
| 50人 | 100ログ | 3〜5秒 |
| 100人 | 150ログ | 5〜10秒 |
| 500人 | 200ログ | 20〜30秒 |
| 1000人 | 300ログ | 40〜60秒 |

**🚨 注意:**
- **500人以上の場合**: マイグレーション実行中（30秒〜1分）はDBへの書き込みが遅延する可能性
- **推奨**: ピークタイム外（深夜・早朝）に実行
- **監視**: Supabase Dashboard → Logs → Postgres Logs でリアルタイム確認

### 実行中の確認方法

```sql
-- マイグレーション実行中に別のセッションで確認
SELECT
  COUNT(*) as updated_count,
  COUNT(*) FILTER (WHERE streak_updated_at IS NOT NULL) as processed_count
FROM students;

-- 全生徒のstreak_updated_atが設定されたら完了
```

---

## ✅ 4. ロールバック手順の事前確認

### シナリオ1: マイグレーション実行中にエラー

**症状:**
```
Error: column "last_study_date" of relation "students" already exists
```

**原因:** マイグレーションが一部適用済み

**対処:**
```sql
-- 適用状態を確認
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'students'
  AND column_name IN ('last_study_date', 'current_streak', 'max_streak', 'streak_updated_at');

-- 既にカラムが存在する場合、マイグレーションスクリプトは IF NOT EXISTS で保護されているため
-- 再実行してOK（冪等性あり）
```

### シナリオ2: マイグレーション成功、アプリでエラー

**症状:**
- ダッシュボード表示時に500エラー
- コンソールに "Cannot read property 'current_streak' of undefined"

**原因:** データ型の不一致やnull値

**診断:**
```sql
-- streak値にnullや異常値がないか確認
SELECT
  id,
  last_study_date,
  current_streak,
  max_streak,
  streak_updated_at
FROM students
WHERE current_streak IS NULL
   OR max_streak IS NULL
   OR current_streak < 0
   OR max_streak < current_streak;

-- 期待: 0件（異常なし）
```

**ロールバック（最終手段）:**

```sql
-- ⚠️ 注意: 以下を実行するとstreak情報が失われます
-- 本当に必要な場合のみ実行

-- 1. トリガーを無効化（削除はしない）
ALTER TABLE study_logs DISABLE TRIGGER trigger_update_student_streak;

-- 2. アプリを前バージョンにロールバック（Vercel/Netlify）
vercel rollback  # または Netlify の UI から

-- 3. 落ち着いたら原因調査し、トリガーを再有効化
ALTER TABLE study_logs ENABLE TRIGGER trigger_update_student_streak;
```

### シナリオ3: 完全ロールバック（カラム削除）

**⚠️ データ消失を伴うため、緊急時のみ**

```sql
-- 1. トリガー削除
DROP TRIGGER IF EXISTS trigger_update_student_streak ON study_logs;

-- 2. 関数削除
DROP FUNCTION IF EXISTS public.update_student_streak();

-- 3. インデックス削除
DROP INDEX IF EXISTS idx_students_last_study_date;
DROP INDEX IF EXISTS idx_students_current_streak;

-- 4. カラム削除（データ消失）
ALTER TABLE students DROP COLUMN IF EXISTS last_study_date;
ALTER TABLE students DROP COLUMN IF EXISTS current_streak;
ALTER TABLE students DROP COLUMN IF EXISTS max_streak;
ALTER TABLE students DROP COLUMN IF EXISTS streak_updated_at;

-- 5. アプリを前バージョンにロールバック
```

**✅ 推奨: カラム削除はせず、トリガー無効化で対処**

---

## ✅ 5. デプロイ時の実行チェックリスト

### Phase 1: 本番DB状態確認（実行前）

- [ ] 生徒レコード数確認: `SELECT COUNT(*) FROM students;`
- [ ] 学習ログレコード数確認: `SELECT COUNT(*) FROM study_logs;`
- [ ] 既存マイグレーション状態確認: `npx supabase migration list`
- [ ] Supabase自動バックアップ確認: Dashboard → Settings → Backups

### Phase 2: マイグレーション適用

```bash
# 1. 本番環境にリンク
npx supabase link --project-ref <YOUR_PROJECT_REF>

# 2. マイグレーション適用（Dry Run）
npx supabase db push --dry-run

# 3. 問題なければ本番適用
npx supabase db push

# 4. 実行ログを監視
# Supabase Dashboard → Logs → Postgres Logs
# "migration 20251109000001_add_streak_tracking.sql" の成功メッセージを確認
```

**タイムアウト設定:**
- デフォルト: 60秒
- 生徒数が多い場合は延長: `--timeout 120`

### Phase 3: マイグレーション成功確認

```sql
-- 1. カラム追加確認
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'students'
  AND column_name IN ('last_study_date', 'current_streak', 'max_streak', 'streak_updated_at')
ORDER BY column_name;

-- 期待: 4行返却

-- 2. インデックス作成確認
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'students'
  AND indexname IN ('idx_students_last_study_date', 'idx_students_current_streak');

-- 期待: 2行返却

-- 3. トリガー作成確認
SELECT tgname, tgrelid::regclass, tgfoid::regproc, tgenabled
FROM pg_trigger
WHERE tgname = 'trigger_update_student_streak';

-- 期待: 1行返却、tgenabled = 'O' (enabled)

-- 4. データ更新確認（全生徒処理完了）
SELECT
  COUNT(*) as total_students,
  COUNT(*) FILTER (WHERE streak_updated_at IS NOT NULL) as processed_students,
  COUNT(*) FILTER (WHERE last_study_date IS NOT NULL) as has_logs_students
FROM students;

-- 期待: total_students = processed_students
```

### Phase 4: テスト実行（本番環境）

```sql
-- テストユーザーでログインし、学習記録を1件入力
-- その後、以下で確認

SELECT
  s.id,
  s.last_study_date,
  s.current_streak,
  s.max_streak,
  s.streak_updated_at
FROM students s
WHERE s.id = <テスト生徒ID>;

-- 期待:
-- - last_study_date が今日の日付
-- - current_streak が +1 されている
-- - streak_updated_at が更新されている
```

### Phase 5: アプリケーションデプロイ

```bash
# Git コミット
git add components/streak-card.tsx \
        supabase/migrations/20251109000001_add_streak_tracking.sql \
        app/actions/dashboard.ts \
        app/student/page.tsx \
        app/student/dashboard-client.tsx \
        docs/

git commit -m "feat: 連続学習日数追跡システム実装

- グレースピリオド機能（1日猶予期間）
- 4状態別デザイン（active/grace/reset/default）
- 時間帯別健康配慮メッセージ
- セルフコンパッション要素（最高記録表示）
- DBトリガーによる自動streak計算

Database Migration: 20251109000001_add_streak_tracking.sql
BREAKING: Requires DB migration before deployment

🔥 Generated with Claude Code
"

# プッシュ
git push origin feature/parent-ui-enhancement

# デプロイ監視
# Vercel/Netlifyのダッシュボードでビルドログ確認
```

### Phase 6: 本番動作確認

- [ ] ログイン成功
- [ ] ダッシュボード表示成功
- [ ] StreakCard表示確認
- [ ] 連続日数が正しく表示される
- [ ] 学習記録入力後、streak更新確認
- [ ] エラーログ確認（Vercel/Netlify Logs）
- [ ] Supabaseログ確認（Postgres Logs）

---

## ✅ 6. 想定されるエラーと対処法

### エラー1: "column does not exist"

**完全なエラーメッセージ:**
```
Error: column "current_streak" does not exist
```

**原因:** マイグレーション未適用、またはアプリが先行デプロイされた

**対処:**
1. Supabaseダッシュボードでマイグレーション状態確認
2. 未適用なら `npx supabase db push` 実行
3. アプリを再デプロイ（キャッシュクリア）

### エラー2: "relation already exists"

**完全なエラーメッセージ:**
```
Error: index "idx_students_current_streak" already exists
```

**原因:** マイグレーションが一部実行済み

**対処:**
- `CREATE INDEX IF NOT EXISTS` なので通常は発生しない
- 発生した場合は手動で重複を削除

```sql
DROP INDEX IF EXISTS idx_students_current_streak;
-- その後、マイグレーション再実行
```

### エラー3: トリガーが実行されない

**症状:** 学習記録入力後もstreakが更新されない

**診断:**
```sql
-- トリガーが有効か確認
SELECT tgname, tgenabled
FROM pg_trigger
WHERE tgname = 'trigger_update_student_streak';

-- tgenabled = 'O' なら有効
-- tgenabled = 'D' なら無効
```

**対処:**
```sql
-- トリガーを有効化
ALTER TABLE study_logs ENABLE TRIGGER trigger_update_student_streak;
```

### エラー4: パフォーマンス低下

**症状:** ダッシュボードが3秒以上かかる

**診断:**
```sql
-- スロークエリをチェック
SELECT
  query,
  calls,
  total_exec_time,
  mean_exec_time,
  max_exec_time
FROM pg_stat_statements
WHERE query LIKE '%students%'
  AND query LIKE '%streak%'
ORDER BY mean_exec_time DESC
LIMIT 5;
```

**対処:**
- インデックスが作成されているか確認
- クエリの実行計画を確認（EXPLAIN ANALYZE）

---

## 📝 デプロイ実施記録テンプレート

```markdown
# デプロイ実施記録

**日時**: 2025-11-XX XX:XX (JST)
**担当者**: [名前]
**環境**: Production

## 事前確認

- [ ] 生徒レコード数: XXX件
- [ ] 学習ログレコード数: XXX件
- [ ] 既存マイグレーション状態: 全て適用済み
- [ ] バックアップ確認: 最新 YYYY-MM-DD

## マイグレーション実行

- 開始時刻: XX:XX
- 終了時刻: XX:XX
- 実行時間: XX秒
- エラー: なし / あり（詳細）

## マイグレーション確認

- [ ] カラム追加: 4件確認
- [ ] インデックス作成: 2件確認
- [ ] トリガー作成: 1件確認
- [ ] データ更新: XXX/XXX件完了

## アプリデプロイ

- Git Commit: [コミットハッシュ]
- Vercel/Netlify URL: [URL]
- ビルド時間: XX秒
- ビルド結果: 成功 / 失敗

## 動作確認

- [ ] ダッシュボード表示: OK
- [ ] StreakCard表示: OK
- [ ] 学習記録入力 → streak更新: OK
- [ ] エラーログ: なし / あり（詳細）

## 問題点・備考

（あれば記載）
```

---

**Document Version**: 1.0.0
**Last Updated**: 2025-11-09
