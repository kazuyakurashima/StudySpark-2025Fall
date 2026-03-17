-- ============================================================================
-- 演習問題集 AIコーチフィードバックテーブル
-- ============================================================================
-- 振り返り保存時に生成されるAIコーチのフィードバックを保存
-- 1振り返り = 1フィードバック（ユニーク制約）
-- ============================================================================

CREATE TABLE public.exercise_feedbacks (
  id BIGSERIAL PRIMARY KEY,
  exercise_reflection_id BIGINT NOT NULL REFERENCES public.exercise_reflections(id) ON DELETE CASCADE,
  student_id BIGINT NOT NULL REFERENCES public.students(id),
  feedback_text TEXT NOT NULL,
  prompt_version TEXT NOT NULL DEFAULT 'v1.0',
  prompt_hash TEXT,
  langfuse_trace_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1振り返り = 1フィードバック
CREATE UNIQUE INDEX idx_exercise_feedbacks_reflection
  ON public.exercise_feedbacks (exercise_reflection_id);

-- student_id で高速検索
CREATE INDEX idx_exercise_feedbacks_student
  ON public.exercise_feedbacks (student_id);

COMMENT ON TABLE public.exercise_feedbacks IS '演習問題集の振り返りに対するAIコーチフィードバック';

-- ============================================================================
-- RLS（exercise_reflections → answer_sessions 経由で student_id を参照）
-- ============================================================================
ALTER TABLE public.exercise_feedbacks ENABLE ROW LEVEL SECURITY;

-- 生徒: 自分のフィードバックのみ
CREATE POLICY "students_read_own_feedbacks"
  ON public.exercise_feedbacks FOR SELECT TO authenticated
  USING (student_id = current_student_id());

-- INSERT/UPDATE は admin client のみ（Server Action 経由）
-- RLS バイパスで実行

-- 指導者: 担当生徒のフィードバックを閲覧
CREATE POLICY "coaches_read_student_feedbacks"
  ON public.exercise_feedbacks FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_student_relations csr
      WHERE csr.student_id = exercise_feedbacks.student_id
        AND csr.coach_id = current_coach_id()
    )
  );

-- 保護者: 子どものフィードバックを閲覧
CREATE POLICY "parents_read_child_feedbacks"
  ON public.exercise_feedbacks FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.parent_child_relations pcr
      WHERE pcr.student_id = exercise_feedbacks.student_id
        AND pcr.parent_id = current_parent_id()
    )
  );

-- 管理者: 全件
CREATE POLICY "admin_all_feedbacks"
  ON public.exercise_feedbacks FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
