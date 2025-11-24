-- ============================================================================
-- 20251124000001_create_past_exam_results.sql
-- 説明: 過去問演習結果テーブルの作成
-- 対象: 小学6年生のみ
-- 学校: 日立第一高校附属中学校
-- ============================================================================

-- ----------------------------------------------------------------------------
-- past_exam_results: 過去問演習結果
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.past_exam_results (
  id BIGSERIAL PRIMARY KEY,
  student_id BIGINT NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,

  -- 年度・科目
  exam_year SMALLINT NOT NULL CHECK (exam_year BETWEEN 2016 AND 2025),
  exam_type VARCHAR(20) NOT NULL CHECK (exam_type IN ('tekisei_1', 'tekisei_2')),

  -- 回数（1〜3回目）
  attempt_number SMALLINT NOT NULL CHECK (attempt_number BETWEEN 1 AND 3),

  -- 結果
  score SMALLINT NOT NULL CHECK (score BETWEEN 0 AND 100),
  reflection TEXT,  -- 振り返り（任意）

  -- メタデータ
  taken_at DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 同じ生徒×年度×科目×回数は一意
  UNIQUE (student_id, exam_year, exam_type, attempt_number)
);

-- コメント
COMMENT ON TABLE public.past_exam_results IS '過去問演習結果（日立第一高校附属中学校）';
COMMENT ON COLUMN public.past_exam_results.exam_year IS '過去問の年度（2016〜2025）';
COMMENT ON COLUMN public.past_exam_results.exam_type IS '科目: tekisei_1=適性検査I, tekisei_2=適性検査II';
COMMENT ON COLUMN public.past_exam_results.attempt_number IS '何回目の挑戦か（1〜3）';
COMMENT ON COLUMN public.past_exam_results.score IS '得点（0〜100点）';
COMMENT ON COLUMN public.past_exam_results.reflection IS '振り返りコメント（任意）';
COMMENT ON COLUMN public.past_exam_results.taken_at IS '受験日';

-- インデックス
CREATE INDEX idx_past_exam_results_student ON public.past_exam_results(student_id);
CREATE INDEX idx_past_exam_results_year ON public.past_exam_results(exam_year DESC);
CREATE INDEX idx_past_exam_results_student_year ON public.past_exam_results(student_id, exam_year DESC);

-- RLS有効化
ALTER TABLE public.past_exam_results ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- RLSポリシー
-- ----------------------------------------------------------------------------

-- 生徒は自分のデータのみ閲覧・編集
CREATE POLICY "Students can manage own past exam results"
  ON public.past_exam_results
  FOR ALL
  TO authenticated
  USING (
    student_id IN (
      SELECT id FROM public.students WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    student_id IN (
      SELECT id FROM public.students WHERE user_id = auth.uid()
    )
  );

-- 保護者は子供の過去問結果を閲覧
CREATE POLICY "Parents can view children past exam results"
  ON public.past_exam_results
  FOR SELECT
  TO authenticated
  USING (
    student_id IN (SELECT public.get_children_student_ids())
  );

-- 指導者は担当生徒の過去問結果を閲覧
CREATE POLICY "Coaches can view assigned students past exam results"
  ON public.past_exam_results
  FOR SELECT
  TO authenticated
  USING (
    student_id IN (SELECT public.get_assigned_student_ids())
  );

-- 管理者は全て閲覧・操作可能
CREATE POLICY "Admins can manage all past exam results"
  ON public.past_exam_results
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- updated_atトリガー
CREATE TRIGGER update_past_exam_results_updated_at
  BEFORE UPDATE ON public.past_exam_results
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ロールバック用 (down migration)
-- ============================================================================
-- DROP TRIGGER IF EXISTS update_past_exam_results_updated_at ON public.past_exam_results;
-- DROP POLICY IF EXISTS "Students can manage own past exam results" ON public.past_exam_results;
-- DROP POLICY IF EXISTS "Parents can view children past exam results" ON public.past_exam_results;
-- DROP POLICY IF EXISTS "Coaches can view assigned students past exam results" ON public.past_exam_results;
-- DROP POLICY IF EXISTS "Admins can manage all past exam results" ON public.past_exam_results;
-- DROP INDEX IF EXISTS idx_past_exam_results_student;
-- DROP INDEX IF EXISTS idx_past_exam_results_year;
-- DROP INDEX IF EXISTS idx_past_exam_results_student_year;
-- DROP TABLE IF EXISTS public.past_exam_results;
