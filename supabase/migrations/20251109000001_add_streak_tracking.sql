-- ============================================================================
-- Add Streak Tracking Fields to Students Table
-- ============================================================================
-- 作成日: 2025-11-09
-- 説明: 連続学習日数の詳細追跡フィールドを追加（グレースピリオド対応）

-- 連続学習日数追跡フィールドを追加
ALTER TABLE public.students
ADD COLUMN IF NOT EXISTS last_study_date DATE,
ADD COLUMN IF NOT EXISTS current_streak INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS max_streak INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS streak_updated_at TIMESTAMPTZ DEFAULT NOW();

-- インデックスを追加（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_students_last_study_date ON public.students(last_study_date);
CREATE INDEX IF NOT EXISTS idx_students_current_streak ON public.students(current_streak);

-- コメント
COMMENT ON COLUMN public.students.last_study_date IS '最後に学習記録を入力した日付（JST基準のDATE）';
COMMENT ON COLUMN public.students.current_streak IS '現在の連続学習日数';
COMMENT ON COLUMN public.students.max_streak IS 'これまでの最高連続学習日数';
COMMENT ON COLUMN public.students.streak_updated_at IS 'streak情報が最後に更新された日時';

-- ============================================================================
-- Streak Update Function
-- ============================================================================
-- 学習ログ挿入時に自動的にstreak情報を更新する関数

CREATE OR REPLACE FUNCTION public.update_student_streak()
RETURNS TRIGGER AS $$
DECLARE
  v_student_id BIGINT;
  v_study_date DATE;
  v_last_study_date DATE;
  v_current_streak INTEGER;
  v_max_streak INTEGER;
  v_new_streak INTEGER;
BEGIN
  -- NEW.student_idとNEW.study_dateを取得
  v_student_id := NEW.student_id;
  v_study_date := NEW.study_date;

  -- 生徒の現在のstreak情報を取得
  SELECT last_study_date, current_streak, max_streak
  INTO v_last_study_date, v_current_streak, v_max_streak
  FROM public.students
  WHERE id = v_student_id;

  -- 初回記録の場合
  IF v_last_study_date IS NULL THEN
    v_new_streak := 1;

    UPDATE public.students
    SET
      last_study_date = v_study_date,
      current_streak = v_new_streak,
      max_streak = GREATEST(v_max_streak, v_new_streak),
      streak_updated_at = NOW()
    WHERE id = v_student_id;

    RETURN NEW;
  END IF;

  -- 同じ日の記録の場合（streak変更なし）
  IF v_study_date = v_last_study_date THEN
    RETURN NEW;
  END IF;

  -- 連続している場合（yesterday or today）
  IF v_study_date = v_last_study_date + INTERVAL '1 day' THEN
    v_new_streak := v_current_streak + 1;

    UPDATE public.students
    SET
      last_study_date = v_study_date,
      current_streak = v_new_streak,
      max_streak = GREATEST(v_max_streak, v_new_streak),
      streak_updated_at = NOW()
    WHERE id = v_student_id;

  -- 途切れた場合（2日以上空いた）
  ELSE
    v_new_streak := 1;

    UPDATE public.students
    SET
      last_study_date = v_study_date,
      current_streak = v_new_streak,
      -- max_streakは変更しない（過去の記録を保持）
      streak_updated_at = NOW()
    WHERE id = v_student_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- トリガーを作成（学習ログ挿入時に自動実行）
DROP TRIGGER IF EXISTS trigger_update_student_streak ON public.study_logs;
CREATE TRIGGER trigger_update_student_streak
  AFTER INSERT ON public.study_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_student_streak();

COMMENT ON FUNCTION public.update_student_streak() IS '学習ログ挿入時に生徒のstreak情報を自動更新';

-- ============================================================================
-- Existing Data Migration
-- ============================================================================
-- 既存の学習ログデータから各生徒のstreak情報を計算して設定

DO $$
DECLARE
  student_record RECORD;
  log_dates DATE[];
  sorted_dates DATE[];
  current_date_val DATE;
  streak_count INTEGER;
  max_streak_val INTEGER;
  temp_streak INTEGER;
  i INTEGER;
  prev_date DATE;
BEGIN
  -- 全生徒をループ
  FOR student_record IN
    SELECT id FROM public.students
  LOOP
    -- その生徒の全学習日を取得（重複なし、降順）
    SELECT ARRAY_AGG(DISTINCT study_date ORDER BY study_date DESC)
    INTO log_dates
    FROM public.study_logs
    WHERE student_id = student_record.id;

    -- 学習ログがない場合はスキップ
    IF log_dates IS NULL OR array_length(log_dates, 1) = 0 THEN
      CONTINUE;
    END IF;

    -- 最新の学習日
    current_date_val := log_dates[1];

    -- 今日と昨日の日付を取得（JST基準）
    -- PostgreSQLのタイムゾーンをAsia/Tokyoとして計算
    DECLARE
      today_jst DATE;
      yesterday_jst DATE;
    BEGIN
      today_jst := (NOW() AT TIME ZONE 'Asia/Tokyo')::DATE;
      yesterday_jst := today_jst - INTERVAL '1 day';

      -- 最新の学習日が今日でも昨日でもない場合、streak = 0
      IF current_date_val <> today_jst AND current_date_val <> yesterday_jst THEN
        streak_count := 0;
      ELSE
        -- 連続日数を計算（今日 or 昨日から遡る）
        streak_count := 1;
        prev_date := current_date_val;

        FOR i IN 2..array_length(log_dates, 1) LOOP
          IF log_dates[i] = prev_date - INTERVAL '1 day' THEN
            streak_count := streak_count + 1;
            prev_date := log_dates[i];
          ELSE
            EXIT;
          END IF;
        END LOOP;
      END IF;
    END;

    -- 最大streak計算（全期間から）
    max_streak_val := 0;
    temp_streak := 1;
    prev_date := log_dates[1];

    FOR i IN 2..array_length(log_dates, 1) LOOP
      IF log_dates[i] = prev_date - INTERVAL '1 day' THEN
        temp_streak := temp_streak + 1;
        max_streak_val := GREATEST(max_streak_val, temp_streak);
      ELSE
        temp_streak := 1;
      END IF;
      prev_date := log_dates[i];
    END LOOP;
    max_streak_val := GREATEST(max_streak_val, temp_streak);

    -- 生徒テーブルを更新
    UPDATE public.students
    SET
      last_study_date = current_date_val,
      current_streak = streak_count,
      max_streak = max_streak_val,
      streak_updated_at = NOW()
    WHERE id = student_record.id;

  END LOOP;
END $$;
