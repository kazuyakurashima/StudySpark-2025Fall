-- ============================================================================
-- question_sets: 重複防止の一意制約
-- ============================================================================
-- 同一セッション×科目×表示順で question_set が重複しないことを保証
-- seed スクリプトの3分岐ロジックと併せて、競合実行時のデータ整合性を担保
--
-- 適用前チェック（既存環境に重複データがある場合は先に解消すること）:
--   SELECT session_id, subject_id, display_order, COUNT(*)
--   FROM public.question_sets
--   GROUP BY session_id, subject_id, display_order
--   HAVING COUNT(*) > 1;

CREATE UNIQUE INDEX idx_question_sets_session_subject_order
  ON public.question_sets (session_id, subject_id, display_order);
