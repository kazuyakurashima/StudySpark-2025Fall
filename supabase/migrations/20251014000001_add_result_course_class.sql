-- test_resultsテーブルにresult_courseとresult_classカラムを追加
-- 簡易的な結果入力（コース・組のみ）に対応

ALTER TABLE public.test_results
ADD COLUMN IF NOT EXISTS result_course TEXT,
ADD COLUMN IF NOT EXISTS result_class SMALLINT CHECK (result_class >= 1 AND result_class <= 40);

-- コメント追加
COMMENT ON COLUMN public.test_results.result_course IS '結果のコース（S/C/B/A）';
COMMENT ON COLUMN public.test_results.result_class IS '結果の組（1-40）';
