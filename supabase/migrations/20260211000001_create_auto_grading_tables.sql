-- ============================================================================
-- 算数自動採点テーブル
-- ============================================================================
-- 作成日: 2026-02-11
-- 計画書: docs/poc-auto-grading/01_Math-AutoGrading-Plan.md
-- 概要: 算数プリントの自動採点に必要な4テーブル + ヘルパー関数 + RLS を作成
--
-- テーブル:
--   question_sets    — 問題セット（プリント単位）
--   questions        — 個別の問題（numeric/fraction/multi_part/selection）
--   answer_sessions  — 生徒の解答セッション（マルチアテンプト対応）
--   student_answers  — 個別の解答レコード
--
-- 関数:
--   current_student_id() — auth.uid() → students.id 変換
--   current_parent_id()  — auth.uid() → parents.id 変換
--   current_coach_id()   — auth.uid() → coaches.id 変換
--   lock_answer_session() — 排他制御用 SELECT FOR UPDATE
--
-- 注意:
--   question_options は理科実装時に追加（本計画のスコープ外）

-- ============================================================
-- 1. question_sets: 問題セット（プリント単位）
-- ============================================================
-- 00計画 Section 1-1 準拠 + display_order 追加

CREATE TABLE public.question_sets (
  id                    BIGSERIAL PRIMARY KEY,
  session_id            BIGINT NOT NULL REFERENCES public.study_sessions(id),
  subject_id            BIGINT NOT NULL REFERENCES public.subjects(id),
  study_content_type_id BIGINT REFERENCES public.study_content_types(id),
  grade                 SMALLINT NOT NULL CHECK (grade IN (5, 6)),
  title                 VARCHAR(255),
  display_order         SMALLINT NOT NULL DEFAULT 1,  -- ①=1, ②=2（セッション内の表示順）
  status                VARCHAR(20) NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft', 'approved')),
  created_by            UUID REFERENCES auth.users(id),  -- seed データ投入時は NULL 許容
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.question_sets IS '問題セット（プリント単位: ①②で1セット）';
COMMENT ON COLUMN public.question_sets.display_order IS 'セッション内の表示順（①=1, ②=2）';

-- ============================================================
-- 2. questions: 個別の問題（算数拡張）
-- ============================================================
-- 00計画 Section 1-1 + 01計画 Section 2-2 の算数拡張カラム

CREATE TABLE public.questions (
  id              BIGSERIAL PRIMARY KEY,
  question_set_id BIGINT NOT NULL REFERENCES public.question_sets(id) ON DELETE CASCADE,
  question_number VARCHAR(20) NOT NULL,     -- "(1)", "(2)" 等（セクション内番号）
  section_name    VARCHAR(50) NOT NULL,     -- "類題1", "計算練習" 等（UI区切り表示用）
  answer_type     VARCHAR(20) NOT NULL
                  CHECK (answer_type IN (
                    'numeric',      -- 単一数値
                    'fraction',     -- 分数
                    'multi_part',   -- 複数スロット
                    'selection'     -- 選択式
                    -- 'choice' は理科実装時に ALTER TABLE で追加
                  )),
  correct_answer  VARCHAR(255),             -- numeric/fraction 用の正答値
                                            -- multi_part/selection は NULL（answer_config に格納）
  unit_label      VARCHAR(50),              -- 表示単位 ("cm²", "個", "枚" 等)。NULL=単位なし
  answer_config   JSONB,                    -- multi_part/selection 用の設定。他タイプは NULL
  points          SMALLINT NOT NULL DEFAULT 1 CHECK (points > 0),
  display_order   SMALLINT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (question_set_id, display_order),

  -- 整合性チェック: タイプに応じた必須フィールド
  CHECK (
    (answer_type IN ('numeric', 'fraction') AND correct_answer IS NOT NULL)
    OR
    (answer_type IN ('multi_part', 'selection') AND answer_config IS NOT NULL)
  ),

  -- answer_config の最低限の構造検証
  CHECK (
    answer_config IS NULL
    OR (
      jsonb_typeof(answer_config) = 'object'
      AND (
        -- multi_part: slots 配列 + correct_values オブジェクト + template 文字列が必須
        (answer_type = 'multi_part'
          AND answer_config ? 'slots'
          AND answer_config ? 'correct_values'
          AND answer_config ? 'template'
          AND jsonb_typeof(answer_config -> 'slots') = 'array'
          AND jsonb_typeof(answer_config -> 'correct_values') = 'object'
          AND jsonb_typeof(answer_config -> 'template') = 'string')
        OR
        -- selection: correct_values 配列 + dummy_values 配列が必須
        (answer_type = 'selection'
          AND answer_config ? 'correct_values'
          AND answer_config ? 'dummy_values'
          AND jsonb_typeof(answer_config -> 'correct_values') = 'array'
          AND jsonb_typeof(answer_config -> 'dummy_values') = 'array')
        OR
        -- その他の answer_type では answer_config の構造を問わない
        (answer_type NOT IN ('multi_part', 'selection'))
      )
    )
  )
);

COMMENT ON TABLE public.questions IS '個別の問題（算数: numeric/fraction/multi_part/selection）';
COMMENT ON COLUMN public.questions.section_name IS 'UI区切り表示用セクション名（類題1, 計算練習 等）';
COMMENT ON COLUMN public.questions.answer_config IS 'multi_part/selection 用の設定JSON。他タイプは NULL';

-- ============================================================
-- 3. answer_sessions: 解答セッション（マルチアテンプト対応）
-- ============================================================
-- 00計画 Section 1-1 + 01計画 Section 2-5 拡張

CREATE TABLE public.answer_sessions (
  id               BIGSERIAL PRIMARY KEY,
  student_id       BIGINT NOT NULL REFERENCES public.students(id),
  question_set_id  BIGINT NOT NULL REFERENCES public.question_sets(id),
  attempt_number   SMALLINT NOT NULL DEFAULT 1 CHECK (attempt_number > 0),
  is_latest        BOOLEAN NOT NULL DEFAULT true,
  status           VARCHAR(20) NOT NULL DEFAULT 'in_progress'
                   CHECK (status IN ('in_progress', 'graded')),
  total_score      SMALLINT,
  max_score        SMALLINT,
  answers_revealed BOOLEAN NOT NULL DEFAULT false,
  started_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- 同一生徒×問題セット×試行番号で一意
  UNIQUE (student_id, question_set_id, attempt_number),

  -- 整合性保証: graded 時は completed_at/total_score/max_score が必須
  CHECK (
    status != 'graded'
    OR (completed_at IS NOT NULL AND total_score IS NOT NULL AND max_score IS NOT NULL)
  )
);

-- is_latest の整合性: 同一 (student_id, question_set_id) で is_latest=true は最大1行
CREATE UNIQUE INDEX idx_answer_sessions_latest
  ON public.answer_sessions (student_id, question_set_id)
  WHERE is_latest = true;

COMMENT ON TABLE public.answer_sessions IS '解答セッション（マルチアテンプト: attempt_number で履歴管理）';
COMMENT ON COLUMN public.answer_sessions.is_latest IS '最新アテンプトフラグ（同一 student×question_set で1行のみ true）';
COMMENT ON COLUMN public.answer_sessions.answers_revealed IS '正答開示済みフラグ（true の場合リトライ不可）';

-- ============================================================
-- 4. student_answers: 個別の解答レコード
-- ============================================================

CREATE TABLE public.student_answers (
  id                BIGSERIAL PRIMARY KEY,
  answer_session_id BIGINT NOT NULL REFERENCES public.answer_sessions(id) ON DELETE CASCADE,
  question_id       BIGINT NOT NULL REFERENCES public.questions(id),
  raw_input         VARCHAR(500),           -- 生徒の入力値そのまま（拡張: 255→500）
  answer_value      VARCHAR(500),           -- 正規化済み値（拡張: 255→500）
  is_correct        BOOLEAN,                -- true=正解, false=不正解, NULL=未採点/未回答
  scored_at         TIMESTAMPTZ,
  answered_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (answer_session_id, question_id)
);

COMMENT ON TABLE public.student_answers IS '個別の解答レコード（is_correct: true/false/NULL の3状態）';

-- ============================================================
-- 5. パフォーマンスインデックス
-- ============================================================

CREATE INDEX idx_questions_question_set_id
  ON public.questions(question_set_id);

CREATE INDEX idx_answer_sessions_student_id
  ON public.answer_sessions(student_id);

CREATE INDEX idx_answer_sessions_question_set_id
  ON public.answer_sessions(question_set_id);

CREATE INDEX idx_student_answers_session_id
  ON public.student_answers(answer_session_id);

-- ============================================================
-- 6. ヘルパー SQL 関数（UUID → 内部 BIGINT 変換）
-- ============================================================
-- RLS ポリシーおよび Server Actions 内で使用
-- SECURITY DEFINER: RLS 内からテーブル参照が必要なため
-- STABLE: 同一トランザクション内でキャッシュ可能

CREATE OR REPLACE FUNCTION public.current_student_id()
RETURNS BIGINT AS $$
  SELECT id FROM public.students WHERE user_id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.current_parent_id()
RETURNS BIGINT AS $$
  SELECT id FROM public.parents WHERE user_id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.current_coach_id()
RETURNS BIGINT AS $$
  SELECT id FROM public.coaches WHERE user_id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.current_student_id IS 'auth.uid() → students.id 変換（RLS/Server Actions 用）';
COMMENT ON FUNCTION public.current_parent_id IS 'auth.uid() → parents.id 変換（RLS 用）';
COMMENT ON FUNCTION public.current_coach_id IS 'auth.uid() → coaches.id 変換（RLS 用）';

-- ============================================================
-- 7. lock_answer_session RPC（排他制御用）
-- ============================================================
-- Server Actions 内で SELECT ... FOR UPDATE を実行
-- 所有者チェック（student_id）を同時に行う

CREATE OR REPLACE FUNCTION public.lock_answer_session(
  p_session_id BIGINT,
  p_student_id BIGINT
)
RETURNS public.answer_sessions AS $$
  SELECT *
  FROM public.answer_sessions
  WHERE id = p_session_id
    AND student_id = p_student_id
  FOR UPDATE
$$ LANGUAGE sql;

COMMENT ON FUNCTION public.lock_answer_session IS '排他制御: 行ロック + 所有者チェック（Server Actions 用）';

-- ============================================================
-- 8. RLS ポリシー
-- ============================================================

-- ------------------------------------------------------------
-- 8-1. question_sets（読み取り専用 + 管理者フル）
-- ------------------------------------------------------------
ALTER TABLE public.question_sets ENABLE ROW LEVEL SECURITY;

-- 全認証ユーザー: approved のみ SELECT
CREATE POLICY "read_approved_question_sets"
  ON public.question_sets FOR SELECT TO authenticated
  USING (status = 'approved');

-- 管理者: 全操作
CREATE POLICY "admins_manage_question_sets"
  ON public.question_sets FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ------------------------------------------------------------
-- 8-2. questions（読み取り専用 + 管理者フル）
-- ------------------------------------------------------------
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

-- 全認証ユーザー: approved なセットの問題のみ SELECT
-- 注意: correct_answer は RLS では制御不可 → Server Action で SELECT カラムを制限
CREATE POLICY "read_approved_questions"
  ON public.questions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.question_sets qs
      WHERE qs.id = question_set_id AND qs.status = 'approved'
    )
  );

-- 管理者: 全操作
CREATE POLICY "admins_manage_questions"
  ON public.questions FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ------------------------------------------------------------
-- 8-3. answer_sessions（SELECT のみ RLS、INSERT/UPDATE は admin client 経由）
-- ------------------------------------------------------------
ALTER TABLE public.answer_sessions ENABLE ROW LEVEL SECURITY;

-- 生徒: 自分のセッションのみ SELECT
CREATE POLICY "students_read_own_sessions"
  ON public.answer_sessions FOR SELECT TO authenticated
  USING (student_id = public.current_student_id());

-- 保護者: 紐づけられた子どものセッションを SELECT
CREATE POLICY "parents_read_child_sessions"
  ON public.answer_sessions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.parent_child_relations pcr
      WHERE pcr.parent_id = public.current_parent_id()
        AND pcr.student_id = answer_sessions.student_id
    )
  );

-- 指導者: 担当生徒のセッションを SELECT
CREATE POLICY "coaches_read_student_sessions"
  ON public.answer_sessions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_student_relations csr
      WHERE csr.coach_id = public.current_coach_id()
        AND csr.student_id = answer_sessions.student_id
    )
  );

-- INSERT/UPDATE ポリシーなし（Server Actions 内で createAdminClient() を使用）

-- ------------------------------------------------------------
-- 8-4. student_answers（SELECT のみ RLS、INSERT/UPDATE は admin client 経由）
-- ------------------------------------------------------------
ALTER TABLE public.student_answers ENABLE ROW LEVEL SECURITY;

-- 生徒: 自分のセッションに紐づく解答のみ SELECT
CREATE POLICY "students_read_own_answers"
  ON public.student_answers FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.answer_sessions ase
      WHERE ase.id = answer_session_id
        AND ase.student_id = public.current_student_id()
    )
  );

-- 保護者: 紐づけられた子どもの解答を SELECT
CREATE POLICY "parents_read_child_answers"
  ON public.student_answers FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.answer_sessions ase
      JOIN public.parent_child_relations pcr ON pcr.student_id = ase.student_id
      WHERE ase.id = student_answers.answer_session_id
        AND pcr.parent_id = public.current_parent_id()
    )
  );

-- 指導者: 担当生徒の解答を SELECT
CREATE POLICY "coaches_read_student_answers"
  ON public.student_answers FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.answer_sessions ase
      JOIN public.coach_student_relations csr ON csr.student_id = ase.student_id
      WHERE ase.id = student_answers.answer_session_id
        AND csr.coach_id = public.current_coach_id()
    )
  );

-- INSERT/UPDATE ポリシーなし（Server Actions 内で createAdminClient() を使用）
