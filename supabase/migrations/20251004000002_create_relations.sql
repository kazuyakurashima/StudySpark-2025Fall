-- ============================================================================
-- 02: 関係テーブル (親子関係・指導者-生徒関係)
-- ============================================================================
-- 作成日: 2025-10-04
-- 説明: 保護者-生徒、指導者-生徒の関係を管理するテーブル

-- ----------------------------------------------------------------------------
-- parent_child_relations: 保護者-生徒関係
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.parent_child_relations (
  id BIGSERIAL PRIMARY KEY,
  parent_id BIGINT NOT NULL REFERENCES public.parents(id) ON DELETE CASCADE,
  student_id BIGINT NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  relation_type VARCHAR(20) CHECK (relation_type IN ('father', 'mother', 'guardian')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 同じ親子ペアは1回のみ
  UNIQUE (parent_id, student_id)
);

-- インデックス
CREATE INDEX idx_parent_child_parent ON public.parent_child_relations(parent_id);
CREATE INDEX idx_parent_child_student ON public.parent_child_relations(student_id);

-- RLS有効化
ALTER TABLE public.parent_child_relations ENABLE ROW LEVEL SECURITY;

-- RLSポリシー: 保護者は自分の子どもとの関係のみ閲覧
CREATE POLICY "Parents can view own children relations"
  ON public.parent_child_relations FOR SELECT TO authenticated
  USING (
    parent_id IN (
      SELECT id FROM public.parents WHERE user_id = auth.uid()
    )
  );

-- RLSポリシー: 生徒は自分の親との関係のみ閲覧
CREATE POLICY "Students can view own parent relations"
  ON public.parent_child_relations FOR SELECT TO authenticated
  USING (
    student_id IN (
      SELECT id FROM public.students WHERE user_id = auth.uid()
    )
  );

-- RLSポリシー: 管理者は全て閲覧・操作可能
CREATE POLICY "Admins can manage all parent-child relations"
  ON public.parent_child_relations FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- コメント
COMMENT ON TABLE public.parent_child_relations IS '保護者-生徒の関係テーブル';
COMMENT ON COLUMN public.parent_child_relations.relation_type IS '関係タイプ: father, mother, guardian';

-- ----------------------------------------------------------------------------
-- coach_student_relations: 指導者-生徒関係
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.coach_student_relations (
  id BIGSERIAL PRIMARY KEY,
  coach_id BIGINT NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
  student_id BIGINT NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assigned_by UUID REFERENCES auth.users(id),

  -- 同じ指導者-生徒ペアは1回のみ
  UNIQUE (coach_id, student_id)
);

-- インデックス
CREATE INDEX idx_coach_student_coach ON public.coach_student_relations(coach_id);
CREATE INDEX idx_coach_student_student ON public.coach_student_relations(student_id);

-- RLS有効化
ALTER TABLE public.coach_student_relations ENABLE ROW LEVEL SECURITY;

-- RLSポリシー: 指導者は自分の担当生徒のみ閲覧
CREATE POLICY "Coaches can view own students relations"
  ON public.coach_student_relations FOR SELECT TO authenticated
  USING (
    coach_id IN (
      SELECT id FROM public.coaches WHERE user_id = auth.uid()
    )
  );

-- RLSポリシー: 生徒は自分の担当指導者のみ閲覧
CREATE POLICY "Students can view own coaches relations"
  ON public.coach_student_relations FOR SELECT TO authenticated
  USING (
    student_id IN (
      SELECT id FROM public.students WHERE user_id = auth.uid()
    )
  );

-- RLSポリシー: 管理者は全て閲覧・操作可能
CREATE POLICY "Admins can manage all coach-student relations"
  ON public.coach_student_relations FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- コメント
COMMENT ON TABLE public.coach_student_relations IS '指導者-生徒の関係テーブル';
COMMENT ON COLUMN public.coach_student_relations.assigned_by IS 'アサインを実行した管理者のUUID';
