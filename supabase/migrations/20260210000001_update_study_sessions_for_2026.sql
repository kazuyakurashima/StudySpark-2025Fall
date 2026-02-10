-- ============================================================================
-- 2026年度対応: study_sessions の日付更新 + 新規回追加
-- 作成日: 2026-02-10
--
-- 変更内容:
-- 1. 小学5年生: 既存19回の日付を2026年度(2/9〜7/12)に更新 + 第20回を追加
-- 2. 小学6年生: 既存15回の日付を2026年度(2/9〜6/28)に更新 + 第16〜18回を追加
--
-- 背景:
-- - 2025年度のseedデータ（9月始まり）が本番DBに残っている
-- - seed.sql は ON CONFLICT DO NOTHING のため既存行を更新しない
-- - コード側は a10c339 で DB参照に移行済みだが、DB側の日付が古いまま
--
-- 影響範囲:
-- - テーブル: study_sessions のみ
-- - 既存データへの影響: start_date/end_date の更新（行の追加・削除なし、既存19+15回分）
-- - 新規データ: 5年第20回、6年第16〜18回を追加
-- - study_logs 等への影響: なし（study_sessions の日付変更のみ、FK制約に影響しない）
--
-- ロールバック:
-- - 20251217000001_fix_grade6_study_sessions_periods.sql の値に戻す（6年）
-- - 5年生は元の seed 値に戻す
-- ============================================================================

BEGIN;

-- ==========================================================================
-- 1. 小学5年生: 20回（2026-02-09 〜 2026-07-19）
--    既存の第1〜19回を更新 + 第20回を新規追加
-- ==========================================================================

-- 既存回の日付更新
UPDATE public.study_sessions SET start_date = '2026-02-09', end_date = '2026-02-15' WHERE grade = 5 AND session_number = 1;
UPDATE public.study_sessions SET start_date = '2026-02-16', end_date = '2026-02-22' WHERE grade = 5 AND session_number = 2;
UPDATE public.study_sessions SET start_date = '2026-02-23', end_date = '2026-03-01' WHERE grade = 5 AND session_number = 3;
UPDATE public.study_sessions SET start_date = '2026-03-02', end_date = '2026-03-08' WHERE grade = 5 AND session_number = 4;
UPDATE public.study_sessions SET start_date = '2026-03-09', end_date = '2026-03-15' WHERE grade = 5 AND session_number = 5;
UPDATE public.study_sessions SET start_date = '2026-03-16', end_date = '2026-03-22' WHERE grade = 5 AND session_number = 6;
UPDATE public.study_sessions SET start_date = '2026-04-06', end_date = '2026-04-12' WHERE grade = 5 AND session_number = 7;
UPDATE public.study_sessions SET start_date = '2026-04-13', end_date = '2026-04-19' WHERE grade = 5 AND session_number = 8;
UPDATE public.study_sessions SET start_date = '2026-04-20', end_date = '2026-04-26' WHERE grade = 5 AND session_number = 9;
UPDATE public.study_sessions SET start_date = '2026-05-04', end_date = '2026-05-10' WHERE grade = 5 AND session_number = 10;
UPDATE public.study_sessions SET start_date = '2026-05-11', end_date = '2026-05-17' WHERE grade = 5 AND session_number = 11;
UPDATE public.study_sessions SET start_date = '2026-05-18', end_date = '2026-05-24' WHERE grade = 5 AND session_number = 12;
UPDATE public.study_sessions SET start_date = '2026-05-25', end_date = '2026-05-31' WHERE grade = 5 AND session_number = 13;
UPDATE public.study_sessions SET start_date = '2026-06-01', end_date = '2026-06-07' WHERE grade = 5 AND session_number = 14;
UPDATE public.study_sessions SET start_date = '2026-06-08', end_date = '2026-06-14' WHERE grade = 5 AND session_number = 15;
UPDATE public.study_sessions SET start_date = '2026-06-15', end_date = '2026-06-21' WHERE grade = 5 AND session_number = 16;
UPDATE public.study_sessions SET start_date = '2026-06-22', end_date = '2026-06-28' WHERE grade = 5 AND session_number = 17;
UPDATE public.study_sessions SET start_date = '2026-06-29', end_date = '2026-07-05' WHERE grade = 5 AND session_number = 18;
UPDATE public.study_sessions SET start_date = '2026-07-06', end_date = '2026-07-12' WHERE grade = 5 AND session_number = 19;

-- 新規: 第20回
INSERT INTO public.study_sessions (grade, session_number, start_date, end_date)
VALUES (5, 20, '2026-07-13', '2026-07-19')
ON CONFLICT (grade, session_number) DO UPDATE SET
  start_date = EXCLUDED.start_date,
  end_date = EXCLUDED.end_date;

-- ==========================================================================
-- 2. 小学6年生: 18回（2026-02-09 〜 2026-07-19）
--    既存の第1〜15回を更新 + 第16〜18回を新規追加
-- ==========================================================================

-- 既存回の日付更新
UPDATE public.study_sessions SET start_date = '2026-02-09', end_date = '2026-02-15' WHERE grade = 6 AND session_number = 1;
UPDATE public.study_sessions SET start_date = '2026-02-16', end_date = '2026-02-22' WHERE grade = 6 AND session_number = 2;
UPDATE public.study_sessions SET start_date = '2026-02-23', end_date = '2026-03-01' WHERE grade = 6 AND session_number = 3;
UPDATE public.study_sessions SET start_date = '2026-03-02', end_date = '2026-03-08' WHERE grade = 6 AND session_number = 4;
UPDATE public.study_sessions SET start_date = '2026-03-09', end_date = '2026-03-15' WHERE grade = 6 AND session_number = 5;
UPDATE public.study_sessions SET start_date = '2026-03-16', end_date = '2026-03-22' WHERE grade = 6 AND session_number = 6;
UPDATE public.study_sessions SET start_date = '2026-04-13', end_date = '2026-04-19' WHERE grade = 6 AND session_number = 7;
UPDATE public.study_sessions SET start_date = '2026-04-20', end_date = '2026-04-26' WHERE grade = 6 AND session_number = 8;
UPDATE public.study_sessions SET start_date = '2026-05-04', end_date = '2026-05-10' WHERE grade = 6 AND session_number = 9;
UPDATE public.study_sessions SET start_date = '2026-05-11', end_date = '2026-05-17' WHERE grade = 6 AND session_number = 10;
UPDATE public.study_sessions SET start_date = '2026-05-18', end_date = '2026-05-24' WHERE grade = 6 AND session_number = 11;
UPDATE public.study_sessions SET start_date = '2026-05-25', end_date = '2026-05-31' WHERE grade = 6 AND session_number = 12;
UPDATE public.study_sessions SET start_date = '2026-06-01', end_date = '2026-06-07' WHERE grade = 6 AND session_number = 13;
UPDATE public.study_sessions SET start_date = '2026-06-08', end_date = '2026-06-14' WHERE grade = 6 AND session_number = 14;
UPDATE public.study_sessions SET start_date = '2026-06-15', end_date = '2026-06-21' WHERE grade = 6 AND session_number = 15;

-- 新規: 第16〜18回
INSERT INTO public.study_sessions (grade, session_number, start_date, end_date)
VALUES
  (6, 16, '2026-06-22', '2026-06-28'),
  (6, 17, '2026-07-06', '2026-07-12'),
  (6, 18, '2026-07-13', '2026-07-19')
ON CONFLICT (grade, session_number) DO UPDATE SET
  start_date = EXCLUDED.start_date,
  end_date = EXCLUDED.end_date;

-- ==========================================================================
-- 3. 検証: 更新結果の確認
-- ==========================================================================

-- 件数確認
DO $$
DECLARE
  v_g5 INT;
  v_g6 INT;
BEGIN
  SELECT COUNT(*) INTO v_g5 FROM study_sessions WHERE grade = 5;
  SELECT COUNT(*) INTO v_g6 FROM study_sessions WHERE grade = 6;

  IF v_g5 != 20 THEN
    RAISE EXCEPTION '5年生の学習回数が不正: % (期待: 20)', v_g5;
  END IF;
  IF v_g6 != 18 THEN
    RAISE EXCEPTION '6年生の学習回数が不正: % (期待: 18)', v_g6;
  END IF;

  RAISE NOTICE '検証OK: 5年=%回, 6年=%回', v_g5, v_g6;
END $$;

-- テーブルコメント更新
COMMENT ON TABLE public.study_sessions IS '学習回マスタ (小5: 20回, 小6: 18回) - 2026年度';

COMMIT;
