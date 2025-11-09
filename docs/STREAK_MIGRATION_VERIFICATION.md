# Streak機能マイグレーション検証チェックリスト

**実施日時**: 2025-11-10
**マイグレーション**: 20251109000001_add_streak_tracking.sql (他6件含む)

---

## ✅ 検証SQL

以下のSQLをSupabase SQL Editorで実行し、結果を確認してください。

### 1. カラム追加確認

```sql
-- studentsテーブルに4つの新規カラムが追加されたか確認
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'students'
  AND column_name IN ('last_study_date', 'current_streak', 'max_streak', 'streak_updated_at')
ORDER BY column_name;
```

**期待結果**: 4行返却
- `current_streak` - integer, NO, 0
- `last_study_date` - date, YES, NULL
- `max_streak` - integer, NO, 0
- `streak_updated_at` - timestamp with time zone, YES, now()

---

### 2. インデックス作成確認

```sql
-- 2つのインデックスが作成されたか確認
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'students'
  AND indexname IN ('idx_students_last_study_date', 'idx_students_current_streak');
```

**期待結果**: 2行返却
- `idx_students_last_study_date`
- `idx_students_current_streak`

---

### 3. トリガー作成確認

```sql
-- トリガーが作成され、有効になっているか確認
SELECT
  tgname,
  tgrelid::regclass AS table_name,
  tgfoid::regproc AS function_name,
  tgenabled,
  CASE tgenabled
    WHEN 'O' THEN 'Enabled'
    WHEN 'D' THEN 'Disabled'
    ELSE 'Unknown'
  END AS status
FROM pg_trigger
WHERE tgname = 'trigger_update_student_streak';
```

**期待結果**: 1行返却
- tgname: `trigger_update_student_streak`
- table_name: `study_logs`
- function_name: `update_student_streak()`
- tgenabled: `O` (Enabled)

---

### 4. トリガー関数の存在確認

```sql
-- トリガー関数が作成されているか確認
SELECT
  proname AS function_name,
  pg_get_function_result(oid) AS return_type,
  prosecdef AS is_security_definer
FROM pg_proc
WHERE proname = 'update_student_streak'
  AND pronamespace = 'public'::regnamespace;
```

**期待結果**: 1行返却
- function_name: `update_student_streak`
- return_type: `trigger`
- is_security_definer: `t` (true)

---

### 5. データ更新確認（全生徒処理完了）

```sql
-- 全生徒のstreak情報が設定されたか確認
SELECT
  COUNT(*) as total_students,
  COUNT(*) FILTER (WHERE streak_updated_at IS NOT NULL) as processed_students,
  COUNT(*) FILTER (WHERE last_study_date IS NOT NULL) as has_logs_students,
  COUNT(*) FILTER (WHERE current_streak > 0) as active_streak_students,
  MAX(current_streak) as max_current_streak,
  MAX(max_streak) as highest_max_streak
FROM students;
```

**期待結果**:
- `total_students` = `processed_students` (全員処理済み)
- `has_logs_students` ≧ 0 (過去に記録がある生徒数)
- `active_streak_students` ≧ 0 (現在継続中の生徒数)
- `max_current_streak` と `highest_max_streak` が妥当な値

---

### 6. サンプルデータ確認

```sql
-- 実際のstreak値を確認（上位5名）
SELECT
  id,
  last_study_date,
  current_streak,
  max_streak,
  streak_updated_at,
  created_at
FROM students
ORDER BY current_streak DESC
LIMIT 5;
```

**期待結果**:
- `last_study_date` が最近の日付（または NULL）
- `current_streak` と `max_streak` が論理的に整合（current ≦ max）
- `streak_updated_at` がマイグレーション実行時刻付近

---

### 7. RPC関数の確認（20251108000001）

```sql
-- get_sender_profiles関数がnickname対応になっているか確認
SELECT
  proname AS function_name,
  pg_get_function_result(oid) AS return_type
FROM pg_proc
WHERE proname IN ('get_sender_profiles', 'get_sender_profile')
  AND pronamespace = 'public'::regnamespace;
```

**期待結果**: 2行返却
- return_type に `nickname text` が含まれている

---

## 📊 本番環境で上記SQLを実行してください

Supabase Dashboard → SQL Editor で上記のSQLを順番に実行し、すべて期待結果と一致することを確認してください。

確認が完了したら、次のステップ（Gitコミット＆アプリデプロイ）に進みます。
