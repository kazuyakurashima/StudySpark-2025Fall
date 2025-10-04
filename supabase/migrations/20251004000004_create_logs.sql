-- ============================================================================
-- 04: ログテーブル (学習ログ・応援ログ)
-- ============================================================================
-- 作成日: 2025-10-04
-- 説明: 学習記録、応援メッセージのログテーブル

-- ----------------------------------------------------------------------------
-- study_logs: 学習ログ
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.study_logs (
  id BIGSERIAL PRIMARY KEY,
  student_id BIGINT NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  session_id BIGINT NOT NULL REFERENCES public.study_sessions(id) ON DELETE CASCADE,
  subject_id BIGINT NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  study_content_type_id BIGINT NOT NULL REFERENCES public.study_content_types(id) ON DELETE CASCADE,

  correct_count SMALLINT NOT NULL CHECK (correct_count >= 0),
  total_problems SMALLINT NOT NULL CHECK (total_problems > 0),

  logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  version INTEGER NOT NULL DEFAULT 1, -- 楽観的ロック用

  -- 同じ生徒×学習回×科目×学習内容の組み合わせは一意
  UNIQUE (student_id, session_id, subject_id, study_content_type_id),

  -- 正答数は問題数以下
  CHECK (correct_count <= total_problems)
);

-- インデックス
CREATE INDEX idx_study_logs_student ON public.study_logs(student_id);
CREATE INDEX idx_study_logs_logged_at ON public.study_logs(logged_at DESC);
CREATE INDEX idx_study_logs_student_session ON public.study_logs(student_id, session_id);

-- RLS有効化
ALTER TABLE public.study_logs ENABLE ROW LEVEL SECURITY;

-- RLSポリシー: 生徒は自分のログのみ閲覧・編集
CREATE POLICY "Students can manage own study logs"
  ON public.study_logs FOR ALL TO authenticated
  USING (
    student_id IN (
      SELECT id FROM public.students WHERE user_id = auth.uid()
    )
  );

-- RLSポリシー: 保護者は子どものログを閲覧のみ
CREATE POLICY "Parents can view children study logs"
  ON public.study_logs FOR SELECT TO authenticated
  USING (
    student_id IN (
      SELECT pcr.student_id
      FROM public.parent_child_relations pcr
      JOIN public.parents p ON p.id = pcr.parent_id
      WHERE p.user_id = auth.uid()
    )
  );

-- RLSポリシー: 指導者は担当生徒のログを閲覧のみ
CREATE POLICY "Coaches can view assigned students study logs"
  ON public.study_logs FOR SELECT TO authenticated
  USING (
    student_id IN (
      SELECT csr.student_id
      FROM public.coach_student_relations csr
      JOIN public.coaches c ON c.id = csr.coach_id
      WHERE c.user_id = auth.uid()
    )
  );

-- RLSポリシー: 管理者は全て閲覧・操作可能
CREATE POLICY "Admins can manage all study logs"
  ON public.study_logs FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- updated_atトリガー
CREATE TRIGGER update_study_logs_updated_at
  BEFORE UPDATE ON public.study_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE public.study_logs IS '生徒の学習記録ログ';
COMMENT ON COLUMN public.study_logs.version IS '楽観的ロック用バージョン番号';

-- ----------------------------------------------------------------------------
-- encouragement_messages: 応援メッセージ
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.encouragement_messages (
  id BIGSERIAL PRIMARY KEY,
  student_id BIGINT NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_role user_role NOT NULL CHECK (sender_role IN ('parent', 'coach')),

  message TEXT NOT NULL,
  is_ai_generated BOOLEAN NOT NULL DEFAULT false,
  ai_cache_key VARCHAR(255), -- AIキャッシュ参照用

  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_encouragement_student ON public.encouragement_messages(student_id);
CREATE INDEX idx_encouragement_sent_at ON public.encouragement_messages(sent_at DESC);
CREATE INDEX idx_encouragement_sender ON public.encouragement_messages(sender_id);

-- RLS有効化
ALTER TABLE public.encouragement_messages ENABLE ROW LEVEL SECURITY;

-- RLSポリシー: 生徒は自分宛のメッセージのみ閲覧・既読更新
CREATE POLICY "Students can view and mark read own messages"
  ON public.encouragement_messages FOR SELECT TO authenticated
  USING (
    student_id IN (
      SELECT id FROM public.students WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Students can update read status on own messages"
  ON public.encouragement_messages FOR UPDATE TO authenticated
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

-- RLSポリシー: 保護者は子ども宛のメッセージ閲覧・送信
CREATE POLICY "Parents can view children messages"
  ON public.encouragement_messages FOR SELECT TO authenticated
  USING (
    student_id IN (
      SELECT pcr.student_id
      FROM public.parent_child_relations pcr
      JOIN public.parents p ON p.id = pcr.parent_id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "Parents can send messages to children"
  ON public.encouragement_messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND
    sender_role = 'parent' AND
    student_id IN (
      SELECT pcr.student_id
      FROM public.parent_child_relations pcr
      JOIN public.parents p ON p.id = pcr.parent_id
      WHERE p.user_id = auth.uid()
    )
  );

-- RLSポリシー: 指導者は担当生徒宛のメッセージ閲覧・送信
CREATE POLICY "Coaches can view assigned students messages"
  ON public.encouragement_messages FOR SELECT TO authenticated
  USING (
    student_id IN (
      SELECT csr.student_id
      FROM public.coach_student_relations csr
      JOIN public.coaches c ON c.id = csr.coach_id
      WHERE c.user_id = auth.uid()
    )
  );

CREATE POLICY "Coaches can send messages to assigned students"
  ON public.encouragement_messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND
    sender_role = 'coach' AND
    student_id IN (
      SELECT csr.student_id
      FROM public.coach_student_relations csr
      JOIN public.coaches c ON c.id = csr.coach_id
      WHERE c.user_id = auth.uid()
    )
  );

-- RLSポリシー: 管理者は全て閲覧・操作可能
CREATE POLICY "Admins can manage all encouragement messages"
  ON public.encouragement_messages FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

COMMENT ON TABLE public.encouragement_messages IS '保護者・指導者から生徒への応援メッセージ';
COMMENT ON COLUMN public.encouragement_messages.ai_cache_key IS 'AIキャッシュテーブル参照用キー';
