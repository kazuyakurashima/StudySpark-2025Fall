-- ============================================================================
-- 演習問題集 振り返りテーブル
-- ============================================================================
-- セクション採点直後に任意入力される振り返りテキストを保存
-- 再挑戦時は attempt_number をインクリメントして履歴保持
-- ============================================================================

CREATE TABLE public.exercise_reflections (
  id BIGSERIAL PRIMARY KEY,
  answer_session_id BIGINT NOT NULL REFERENCES public.answer_sessions(id) ON DELETE CASCADE,
  section_name VARCHAR(50) NOT NULL,
  reflection_text TEXT NOT NULL,
  attempt_number SMALLINT NOT NULL DEFAULT 1 CHECK (attempt_number > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 同一セッション×セクション×試行回数でユニーク
CREATE UNIQUE INDEX idx_exercise_reflections_unique
  ON public.exercise_reflections (answer_session_id, section_name, attempt_number);

-- パフォーマンス: answer_session_id で検索
CREATE INDEX idx_exercise_reflections_session
  ON public.exercise_reflections (answer_session_id);

COMMENT ON TABLE public.exercise_reflections IS '演習問題集のセクション単位振り返り';
COMMENT ON COLUMN public.exercise_reflections.section_name IS 'セクション名（反復問題（基本）等）';
COMMENT ON COLUMN public.exercise_reflections.attempt_number IS '振り返りの試行回数（再挑戦時にインクリメント）';

-- ============================================================================
-- RLS（answer_sessions 経由で student_id を参照）
-- ============================================================================
ALTER TABLE public.exercise_reflections ENABLE ROW LEVEL SECURITY;

-- 生徒: 自分のセッションの振り返りのみ
CREATE POLICY "students_manage_own_reflections"
  ON public.exercise_reflections FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.answer_sessions ans
      WHERE ans.id = exercise_reflections.answer_session_id
        AND ans.student_id = current_student_id()
    )
  );

-- 指導者: 担当生徒の振り返りを閲覧
CREATE POLICY "coaches_read_student_reflections"
  ON public.exercise_reflections FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.answer_sessions ans
      JOIN public.coach_student_relations csr
        ON csr.student_id = ans.student_id
      WHERE ans.id = exercise_reflections.answer_session_id
        AND csr.coach_id = current_coach_id()
    )
  );

-- 保護者: 子どもの振り返りを閲覧
CREATE POLICY "parents_read_child_reflections"
  ON public.exercise_reflections FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.answer_sessions ans
      JOIN public.parent_child_relations pcr
        ON pcr.student_id = ans.student_id
      WHERE ans.id = exercise_reflections.answer_session_id
        AND pcr.parent_id = current_parent_id()
    )
  );

-- 管理者: 全件
CREATE POLICY "admin_all_reflections"
  ON public.exercise_reflections FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
