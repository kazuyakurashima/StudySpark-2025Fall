-- ============================================================================
-- 小学6年生の学習回期間を修正
-- ============================================================================
UPDATE public.study_sessions SET start_date = '2025-08-25', end_date = '2025-09-07' WHERE grade = 6 AND session_number = 1;
UPDATE public.study_sessions SET start_date = '2025-09-08', end_date = '2025-09-14' WHERE grade = 6 AND session_number = 2;
UPDATE public.study_sessions SET start_date = '2025-09-15', end_date = '2025-09-21' WHERE grade = 6 AND session_number = 3;
UPDATE public.study_sessions SET start_date = '2025-09-22', end_date = '2025-10-05' WHERE grade = 6 AND session_number = 4;
UPDATE public.study_sessions SET start_date = '2025-10-06', end_date = '2025-10-12' WHERE grade = 6 AND session_number = 5;
UPDATE public.study_sessions SET start_date = '2025-10-13', end_date = '2025-10-19' WHERE grade = 6 AND session_number = 6;
UPDATE public.study_sessions SET start_date = '2025-10-20', end_date = '2025-10-26' WHERE grade = 6 AND session_number = 7;
UPDATE public.study_sessions SET start_date = '2025-10-27', end_date = '2025-11-02' WHERE grade = 6 AND session_number = 8;
UPDATE public.study_sessions SET start_date = '2025-11-03', end_date = '2025-11-16' WHERE grade = 6 AND session_number = 9;
UPDATE public.study_sessions SET start_date = '2025-11-17', end_date = '2025-11-23' WHERE grade = 6 AND session_number = 10;
UPDATE public.study_sessions SET start_date = '2025-11-24', end_date = '2025-11-30' WHERE grade = 6 AND session_number = 11;
UPDATE public.study_sessions SET start_date = '2025-12-01', end_date = '2025-12-14' WHERE grade = 6 AND session_number = 12;
UPDATE public.study_sessions SET start_date = '2025-12-15', end_date = '2025-12-21' WHERE grade = 6 AND session_number = 13;
UPDATE public.study_sessions SET start_date = '2025-12-22', end_date = '2026-01-11' WHERE grade = 6 AND session_number = 14;
UPDATE public.study_sessions SET start_date = '2026-01-12', end_date = '2026-01-18' WHERE grade = 6 AND session_number = 15;
