-- ============================================================================
-- 05: 目標・実績テーブル (ゴールナビ)
-- ============================================================================
-- 作成日: 2025-10-04
-- 説明: テスト目標、実績、達成マップのテーブル

-- ----------------------------------------------------------------------------
-- test_types: テストタイプマスタ
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.test_types (
  id BIGSERIAL PRIMARY KEY,
  grade SMALLINT NOT NULL CHECK (grade IN (5, 6)),
  name VARCHAR(100) NOT NULL,
  display_order SMALLINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 学年×テスト名は一意
  UNIQUE (grade, name)
);

-- RLS有効化 (全ユーザー閲覧可能)
ALTER TABLE public.test_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view test types"
  ON public.test_types FOR SELECT TO authenticated
  USING (true);

-- 管理者のみ編集可能
CREATE POLICY "Admins can manage test types"
  ON public.test_types FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

COMMENT ON TABLE public.test_types IS 'テストタイプマスタ (組分けテスト、合不合判定テスト)';

-- ----------------------------------------------------------------------------
-- test_schedules: テスト日程マスタ
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.test_schedules (
  id BIGSERIAL PRIMARY KEY,
  test_type_id BIGINT NOT NULL REFERENCES public.test_types(id) ON DELETE CASCADE,
  test_date DATE NOT NULL,
  test_number SMALLINT NOT NULL,

  -- 目標設定可能期間
  goal_setting_start_date DATE NOT NULL,
  goal_setting_end_date DATE NOT NULL,

  -- 実績入力可能期間
  result_entry_start_date DATE,
  result_entry_end_date DATE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- テストタイプ×回数は一意
  UNIQUE (test_type_id, test_number),

  -- 日程の妥当性チェック
  CHECK (goal_setting_start_date <= goal_setting_end_date),
  CHECK (result_entry_start_date IS NULL OR result_entry_start_date <= result_entry_end_date)
);

-- インデックス
CREATE INDEX idx_test_schedules_test_type ON public.test_schedules(test_type_id);
CREATE INDEX idx_test_schedules_test_date ON public.test_schedules(test_date);

-- RLS有効化 (全ユーザー閲覧可能)
ALTER TABLE public.test_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view test schedules"
  ON public.test_schedules FOR SELECT TO authenticated
  USING (true);

-- 管理者のみ編集可能
CREATE POLICY "Admins can manage test schedules"
  ON public.test_schedules FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

COMMENT ON TABLE public.test_schedules IS 'テスト日程マスタ';
COMMENT ON COLUMN public.test_schedules.goal_setting_start_date IS '目標設定開始日';
COMMENT ON COLUMN public.test_schedules.goal_setting_end_date IS '目標設定終了日';

-- ----------------------------------------------------------------------------
-- test_goals: テスト目標
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.test_goals (
  id BIGSERIAL PRIMARY KEY,
  student_id BIGINT NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  test_schedule_id BIGINT NOT NULL REFERENCES public.test_schedules(id) ON DELETE CASCADE,

  -- 4科目別目標点数
  math_target SMALLINT CHECK (math_target >= 0),
  japanese_target SMALLINT CHECK (japanese_target >= 0),
  science_target SMALLINT CHECK (science_target >= 0),
  social_target SMALLINT CHECK (social_target >= 0),
  total_target SMALLINT CHECK (total_target >= 0),

  -- AI対話から生成された「今回の思い」
  commitment_text TEXT,

  -- AI対話ログ参照 (オプション)
  ai_session_id BIGINT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 同じ生徒×テストの組み合わせは一意
  UNIQUE (student_id, test_schedule_id)
);

-- インデックス
CREATE INDEX idx_test_goals_student ON public.test_goals(student_id);
CREATE INDEX idx_test_goals_schedule ON public.test_goals(test_schedule_id);

-- RLS有効化
ALTER TABLE public.test_goals ENABLE ROW LEVEL SECURITY;

-- RLSポリシー: 生徒は自分の目標のみ閲覧・編集
CREATE POLICY "Students can manage own test goals"
  ON public.test_goals FOR ALL TO authenticated
  USING (
    student_id IN (
      SELECT id FROM public.students WHERE user_id = auth.uid()
    )
  );

-- RLSポリシー: 保護者は子どもの目標を閲覧のみ
CREATE POLICY "Parents can view children test goals"
  ON public.test_goals FOR SELECT TO authenticated
  USING (
    student_id IN (
      SELECT pcr.student_id
      FROM public.parent_child_relations pcr
      JOIN public.parents p ON p.id = pcr.parent_id
      WHERE p.user_id = auth.uid()
    )
  );

-- RLSポリシー: 指導者は担当生徒の目標を閲覧のみ
CREATE POLICY "Coaches can view assigned students test goals"
  ON public.test_goals FOR SELECT TO authenticated
  USING (
    student_id IN (
      SELECT csr.student_id
      FROM public.coach_student_relations csr
      JOIN public.coaches c ON c.id = csr.coach_id
      WHERE c.user_id = auth.uid()
    )
  );

-- RLSポリシー: 管理者は全て閲覧・操作可能
CREATE POLICY "Admins can manage all test goals"
  ON public.test_goals FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- updated_atトリガー
CREATE TRIGGER update_test_goals_updated_at
  BEFORE UPDATE ON public.test_goals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE public.test_goals IS 'テスト目標 (ゴールナビで設定)';
COMMENT ON COLUMN public.test_goals.commitment_text IS 'AI対話から生成された「今回の思い」';

-- ----------------------------------------------------------------------------
-- test_results: テスト実績
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.test_results (
  id BIGSERIAL PRIMARY KEY,
  student_id BIGINT NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  test_schedule_id BIGINT NOT NULL REFERENCES public.test_schedules(id) ON DELETE CASCADE,

  -- 4科目別実績点数
  math_score SMALLINT CHECK (math_score >= 0),
  japanese_score SMALLINT CHECK (japanese_score >= 0),
  science_score SMALLINT CHECK (science_score >= 0),
  social_score SMALLINT CHECK (social_score >= 0),
  total_score SMALLINT CHECK (total_score >= 0),

  -- 偏差値 (オプション)
  math_deviation DECIMAL(4, 1),
  japanese_deviation DECIMAL(4, 1),
  science_deviation DECIMAL(4, 1),
  social_deviation DECIMAL(4, 1),
  total_deviation DECIMAL(4, 1),

  result_entered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 同じ生徒×テストの組み合わせは一意
  UNIQUE (student_id, test_schedule_id)
);

-- インデックス
CREATE INDEX idx_test_results_student ON public.test_results(student_id);
CREATE INDEX idx_test_results_schedule ON public.test_results(test_schedule_id);

-- RLS有効化
ALTER TABLE public.test_results ENABLE ROW LEVEL SECURITY;

-- RLSポリシー: 生徒は自分の実績のみ閲覧・編集
CREATE POLICY "Students can manage own test results"
  ON public.test_results FOR ALL TO authenticated
  USING (
    student_id IN (
      SELECT id FROM public.students WHERE user_id = auth.uid()
    )
  );

-- RLSポリシー: 保護者は子どもの実績を閲覧のみ
CREATE POLICY "Parents can view children test results"
  ON public.test_results FOR SELECT TO authenticated
  USING (
    student_id IN (
      SELECT pcr.student_id
      FROM public.parent_child_relations pcr
      JOIN public.parents p ON p.id = pcr.parent_id
      WHERE p.user_id = auth.uid()
    )
  );

-- RLSポリシー: 指導者は担当生徒の実績を閲覧のみ
CREATE POLICY "Coaches can view assigned students test results"
  ON public.test_results FOR SELECT TO authenticated
  USING (
    student_id IN (
      SELECT csr.student_id
      FROM public.coach_student_relations csr
      JOIN public.coaches c ON c.id = csr.coach_id
      WHERE c.user_id = auth.uid()
    )
  );

-- RLSポリシー: 管理者は全て閲覧・操作可能
CREATE POLICY "Admins can manage all test results"
  ON public.test_results FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- updated_atトリガー
CREATE TRIGGER update_test_results_updated_at
  BEFORE UPDATE ON public.test_results
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE public.test_results IS 'テスト実績 (達成マップで表示)';
COMMENT ON COLUMN public.test_results.total_deviation IS '4科目合計の偏差値';
