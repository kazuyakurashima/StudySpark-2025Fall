-- ============================================================================
-- 06: コーチングテーブル (週次振り返り・週次分析)
-- ============================================================================
-- 作成日: 2025-10-04
-- 説明: 週次振り返り、週次分析、AIキャッシュのテーブル

-- ----------------------------------------------------------------------------
-- coaching_sessions: コーチングセッション (週次振り返り)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.coaching_sessions (
  id BIGSERIAL PRIMARY KEY,
  student_id BIGINT NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,

  -- 週の識別
  week_start_date DATE NOT NULL,
  week_end_date DATE NOT NULL,

  -- 週タイプ
  week_type VARCHAR(20) CHECK (week_type IN ('growth', 'stable', 'challenge', 'special')),

  -- セッション状態
  status VARCHAR(20) NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),

  -- メタデータ
  total_turns SMALLINT DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 同じ生徒×週の組み合わせは一意
  UNIQUE (student_id, week_start_date),

  -- 週の日付妥当性
  CHECK (week_start_date <= week_end_date)
);

-- インデックス
CREATE INDEX idx_coaching_sessions_student ON public.coaching_sessions(student_id);
CREATE INDEX idx_coaching_sessions_week ON public.coaching_sessions(week_start_date DESC);

-- RLS有効化
ALTER TABLE public.coaching_sessions ENABLE ROW LEVEL SECURITY;

-- RLSポリシー: 生徒は自分のセッションのみ閲覧・編集
CREATE POLICY "Students can manage own coaching sessions"
  ON public.coaching_sessions FOR ALL TO authenticated
  USING (
    student_id IN (
      SELECT id FROM public.students WHERE user_id = auth.uid()
    )
  );

-- RLSポリシー: 保護者は子どものセッションを閲覧のみ
CREATE POLICY "Parents can view children coaching sessions"
  ON public.coaching_sessions FOR SELECT TO authenticated
  USING (
    student_id IN (
      SELECT pcr.student_id
      FROM public.parent_child_relations pcr
      JOIN public.parents p ON p.id = pcr.parent_id
      WHERE p.user_id = auth.uid()
    )
  );

-- RLSポリシー: 指導者は担当生徒のセッションを閲覧のみ
CREATE POLICY "Coaches can view assigned students coaching sessions"
  ON public.coaching_sessions FOR SELECT TO authenticated
  USING (
    student_id IN (
      SELECT csr.student_id
      FROM public.coach_student_relations csr
      JOIN public.coaches c ON c.id = csr.coach_id
      WHERE c.user_id = auth.uid()
    )
  );

-- RLSポリシー: 管理者は全て閲覧・操作可能
CREATE POLICY "Admins can manage all coaching sessions"
  ON public.coaching_sessions FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- updated_atトリガー
CREATE TRIGGER update_coaching_sessions_updated_at
  BEFORE UPDATE ON public.coaching_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE public.coaching_sessions IS '週次振り返りコーチングセッション';
COMMENT ON COLUMN public.coaching_sessions.week_type IS '週タイプ: growth, stable, challenge, special';

-- ----------------------------------------------------------------------------
-- coaching_messages: コーチングメッセージ
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.coaching_messages (
  id BIGSERIAL PRIMARY KEY,
  session_id BIGINT NOT NULL REFERENCES public.coaching_sessions(id) ON DELETE CASCADE,

  -- メッセージ内容
  role VARCHAR(20) NOT NULL CHECK (role IN ('assistant', 'user')),
  content TEXT NOT NULL,

  -- メタデータ
  turn_number SMALLINT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_coaching_messages_session ON public.coaching_messages(session_id);
CREATE INDEX idx_coaching_messages_turn ON public.coaching_messages(session_id, turn_number);

-- RLS有効化
ALTER TABLE public.coaching_messages ENABLE ROW LEVEL SECURITY;

-- RLSポリシー: セッションの所有者と同じRLSルールを継承
CREATE POLICY "Students can manage own coaching messages"
  ON public.coaching_messages FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.coaching_sessions cs
      JOIN public.students s ON s.id = cs.student_id
      WHERE cs.id = session_id AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Parents can view children coaching messages"
  ON public.coaching_messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.coaching_sessions cs
      JOIN public.parent_child_relations pcr ON pcr.student_id = cs.student_id
      JOIN public.parents p ON p.id = pcr.parent_id
      WHERE cs.id = session_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Coaches can view assigned students coaching messages"
  ON public.coaching_messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.coaching_sessions cs
      JOIN public.coach_student_relations csr ON csr.student_id = cs.student_id
      JOIN public.coaches c ON c.id = csr.coach_id
      WHERE cs.id = session_id AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all coaching messages"
  ON public.coaching_messages FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

COMMENT ON TABLE public.coaching_messages IS 'コーチングセッション内のメッセージ (LINEライク対話)';
COMMENT ON COLUMN public.coaching_messages.role IS 'メッセージ送信者: assistant (AI), user (生徒)';

-- ----------------------------------------------------------------------------
-- weekly_analysis: 週次分析 (指導者向け)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.weekly_analysis (
  id BIGSERIAL PRIMARY KEY,
  student_id BIGINT NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,

  -- 週の識別
  week_start_date DATE NOT NULL,
  week_end_date DATE NOT NULL,

  -- AI生成分析内容
  strengths TEXT, -- 強み
  challenges TEXT, -- 課題
  advice TEXT, -- 具体的アドバイス

  -- メタデータ
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  generated_by_batch BOOLEAN NOT NULL DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 同じ生徒×週の組み合わせは一意
  UNIQUE (student_id, week_start_date),

  -- 週の日付妥当性
  CHECK (week_start_date <= week_end_date)
);

-- インデックス
CREATE INDEX idx_weekly_analysis_student ON public.weekly_analysis(student_id);
CREATE INDEX idx_weekly_analysis_week ON public.weekly_analysis(week_start_date DESC);

-- RLS有効化
ALTER TABLE public.weekly_analysis ENABLE ROW LEVEL SECURITY;

-- RLSポリシー: 指導者は担当生徒の分析のみ閲覧
CREATE POLICY "Coaches can view assigned students weekly analysis"
  ON public.weekly_analysis FOR SELECT TO authenticated
  USING (
    student_id IN (
      SELECT csr.student_id
      FROM public.coach_student_relations csr
      JOIN public.coaches c ON c.id = csr.coach_id
      WHERE c.user_id = auth.uid()
    )
  );

-- RLSポリシー: バッチ処理用 (Service Role Key使用)
-- Note: Service Role Keyでの実行時はRLSバイパス可能

-- RLSポリシー: 管理者は全て閲覧・操作可能
CREATE POLICY "Admins can manage all weekly analysis"
  ON public.weekly_analysis FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

COMMENT ON TABLE public.weekly_analysis IS '週次AI分析 (指導者向け)';
COMMENT ON COLUMN public.weekly_analysis.generated_by_batch IS 'バッチ処理で自動生成されたか';

-- ----------------------------------------------------------------------------
-- ai_cache: AIキャッシュ (コスト最適化)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_cache (
  id BIGSERIAL PRIMARY KEY,

  -- キャッシュキー (状況のハッシュ)
  cache_key VARCHAR(255) NOT NULL UNIQUE,

  -- キャッシュタイプ
  cache_type VARCHAR(50) NOT NULL CHECK (cache_type IN ('encouragement', 'goal_commitment', 'reflection', 'weekly_analysis')),

  -- キャッシュ内容
  cached_content TEXT NOT NULL,

  -- メタデータ
  hit_count INTEGER NOT NULL DEFAULT 0,
  first_generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_accessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_ai_cache_key ON public.ai_cache(cache_key);
CREATE INDEX idx_ai_cache_type ON public.ai_cache(cache_type);
CREATE INDEX idx_ai_cache_last_accessed ON public.ai_cache(last_accessed_at DESC);

-- RLS有効化 (管理者とバッチ処理のみアクセス)
ALTER TABLE public.ai_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all ai cache"
  ON public.ai_cache FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

COMMENT ON TABLE public.ai_cache IS 'AI生成コンテンツのキャッシュテーブル (コスト最適化)';
COMMENT ON COLUMN public.ai_cache.cache_key IS '状況のハッシュ値 (同一状況で再利用)';
COMMENT ON COLUMN public.ai_cache.hit_count IS 'キャッシュヒット回数';
