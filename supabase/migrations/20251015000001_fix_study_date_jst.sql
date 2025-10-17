-- Fix study_date to use JST timezone instead of UTC
-- This ensures that logs created after midnight JST are correctly dated

-- Update the default value for study_date column to use JST
ALTER TABLE study_logs
  ALTER COLUMN study_date
  SET DEFAULT (CURRENT_DATE AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Tokyo')::date;

-- Update existing records where logged_at (JST) and study_date are mismatched
-- For example, if logged_at is 2025-10-15 00:36 JST but study_date is 2025-10-14
UPDATE study_logs
SET study_date = (logged_at AT TIME ZONE 'Asia/Tokyo')::date
WHERE study_date != (logged_at AT TIME ZONE 'Asia/Tokyo')::date;

-- Add comment explaining the column
COMMENT ON COLUMN study_logs.study_date IS 'Study date in JST timezone (Asia/Tokyo). Automatically set based on logged_at timestamp converted to JST.';
