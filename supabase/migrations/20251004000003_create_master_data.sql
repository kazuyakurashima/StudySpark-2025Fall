-- ============================================================================
-- 03: マスタデータテーブル (学習回・科目・学習内容・問題数)
-- ============================================================================
-- 作成日: 2025-10-04
-- 説明: 学習回、科目、学習内容、問題数のマスタテーブル

-- ----------------------------------------------------------------------------
-- study_sessions: 学習回マスタ
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.study_sessions (
  id BIGSERIAL PRIMARY KEY,
  grade SMALLINT NOT NULL CHECK (grade IN (5, 6)),
  session_number SMALLINT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 学年×回数の組み合わせは一意
  UNIQUE (grade, session_number)
);

-- インデックス
CREATE INDEX idx_study_sessions_grade ON public.study_sessions(grade);

-- RLS有効化 (全ユーザー閲覧可能)
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view study sessions"
  ON public.study_sessions FOR SELECT TO authenticated
  USING (true);

-- 管理者のみ編集可能
CREATE POLICY "Admins can manage study sessions"
  ON public.study_sessions FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

COMMENT ON TABLE public.study_sessions IS '学習回マスタ (小5: 19回, 小6: 15回)';

-- ----------------------------------------------------------------------------
-- subjects: 科目マスタ
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subjects (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  display_order SMALLINT NOT NULL,
  color_code VARCHAR(7), -- カレンダー表示用カラー (#RRGGBB)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS有効化 (全ユーザー閲覧可能)
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view subjects"
  ON public.subjects FOR SELECT TO authenticated
  USING (true);

-- 管理者のみ編集可能
CREATE POLICY "Admins can manage subjects"
  ON public.subjects FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

COMMENT ON TABLE public.subjects IS '科目マスタ (算数、国語、理科、社会)';
COMMENT ON COLUMN public.subjects.color_code IS 'カレンダー表示用カラーコード';

-- ----------------------------------------------------------------------------
-- study_content_types: 学習内容タイプマスタ
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.study_content_types (
  id BIGSERIAL PRIMARY KEY,
  grade SMALLINT NOT NULL CHECK (grade IN (5, 6)),
  subject_id BIGINT NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  course course_level NOT NULL,
  content_name VARCHAR(100) NOT NULL,
  display_order SMALLINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 学年×科目×コース×内容名は一意
  UNIQUE (grade, subject_id, course, content_name)
);

-- インデックス
CREATE INDEX idx_study_content_grade_subject_course ON public.study_content_types(grade, subject_id, course);

-- RLS有効化 (全ユーザー閲覧可能)
ALTER TABLE public.study_content_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view study content types"
  ON public.study_content_types FOR SELECT TO authenticated
  USING (true);

-- 管理者のみ編集可能
CREATE POLICY "Admins can manage study content types"
  ON public.study_content_types FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

COMMENT ON TABLE public.study_content_types IS '学習内容タイプマスタ (学年・科目・コース別)';
COMMENT ON COLUMN public.study_content_types.content_name IS '例: 類題、基本問題、１行問題など';

-- ----------------------------------------------------------------------------
-- problem_counts: 問題数マスタ
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.problem_counts (
  id BIGSERIAL PRIMARY KEY,
  study_content_type_id BIGINT NOT NULL REFERENCES public.study_content_types(id) ON DELETE CASCADE,
  session_id BIGINT NOT NULL REFERENCES public.study_sessions(id) ON DELETE CASCADE,
  total_problems SMALLINT NOT NULL CHECK (total_problems > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 学習内容×学習回の組み合わせは一意
  UNIQUE (study_content_type_id, session_id)
);

-- インデックス
CREATE INDEX idx_problem_counts_content_type ON public.problem_counts(study_content_type_id);
CREATE INDEX idx_problem_counts_session ON public.problem_counts(session_id);

-- RLS有効化 (全ユーザー閲覧可能)
ALTER TABLE public.problem_counts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view problem counts"
  ON public.problem_counts FOR SELECT TO authenticated
  USING (true);

-- 管理者のみ編集可能
CREATE POLICY "Admins can manage problem counts"
  ON public.problem_counts FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

COMMENT ON TABLE public.problem_counts IS '問題数マスタ (学習内容×学習回ごとの問題数)';
COMMENT ON COLUMN public.problem_counts.total_problems IS '該当学習回における問題数';
