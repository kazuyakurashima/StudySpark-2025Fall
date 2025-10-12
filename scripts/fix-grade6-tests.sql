-- 小学6年生のテストスケジュール修正

-- 1. 既存の小学6年生のテストスケジュールを削除
DELETE FROM test_schedules
WHERE test_type_id IN (
  SELECT id FROM test_types WHERE grade = 6
);

-- 2. 既存の小学6年生のテストタイプを削除
DELETE FROM test_types WHERE grade = 6;

-- 3. 正しいテストタイプを作成
INSERT INTO test_types (name, grade, display_order, type_category) VALUES
('第3回合不合判定テスト', 6, 3, 'gofugou'),
('第4回合不合判定テスト', 6, 4, 'gofugou'),
('第5回合不合判定テスト', 6, 5, 'gofugou'),
('第6回合不合判定テスト', 6, 6, 'gofugou');

-- 4. 正しいテストスケジュールを作成
INSERT INTO test_schedules (test_type_id, test_number, test_date, goal_setting_start_date, goal_setting_end_date)
SELECT
  tt.id,
  3,
  '2025-09-07'::date,
  '2025-08-01'::date,
  '2025-09-30'::date
FROM test_types tt WHERE tt.name = '第3回合不合判定テスト' AND tt.grade = 6;

INSERT INTO test_schedules (test_type_id, test_number, test_date, goal_setting_start_date, goal_setting_end_date)
SELECT
  tt.id,
  4,
  '2025-10-05'::date,
  '2025-09-01'::date,
  '2025-10-31'::date
FROM test_types tt WHERE tt.name = '第4回合不合判定テスト' AND tt.grade = 6;

INSERT INTO test_schedules (test_type_id, test_number, test_date, goal_setting_start_date, goal_setting_end_date)
SELECT
  tt.id,
  5,
  '2025-11-16'::date,
  '2025-10-01'::date,
  '2025-11-30'::date
FROM test_types tt WHERE tt.name = '第5回合不合判定テスト' AND tt.grade = 6;

INSERT INTO test_schedules (test_type_id, test_number, test_date, goal_setting_start_date, goal_setting_end_date)
SELECT
  tt.id,
  6,
  '2025-12-07'::date,
  '2025-11-01'::date,
  '2025-12-31'::date
FROM test_types tt WHERE tt.name = '第6回合不合判定テスト' AND tt.grade = 6;

-- 5. 結果確認
SELECT
  ts.id,
  tt.name,
  tt.grade,
  ts.test_number,
  ts.test_date,
  ts.goal_setting_start_date,
  ts.goal_setting_end_date
FROM test_schedules ts
JOIN test_types tt ON ts.test_type_id = tt.id
WHERE tt.grade = 6
ORDER BY ts.test_date;
