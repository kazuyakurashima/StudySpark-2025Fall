-- 目標設定期間の終了日をテスト実施日に修正
-- テスト終了後に目標設定することはないため、goal_setting_end_date = test_date とする

-- 説明:
-- テスト実施日以降は目標設定ができないようにするため、
-- goal_setting_end_date をテスト実施日（test_date）に合わせる。
-- これにより、テスト終了後は目標設定画面から該当テストが非表示になる。

UPDATE test_schedules
SET goal_setting_end_date = test_date
WHERE goal_setting_end_date != test_date;

-- 確認用コメント
COMMENT ON COLUMN test_schedules.goal_setting_end_date IS '目標設定期間の終了日（テスト実施日まで）';
