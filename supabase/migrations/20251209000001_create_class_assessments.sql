-- =============================================================================
-- Phase 6: クラス内テスト機能（算数プリント・漢字テスト）
-- マイグレーション: assessment_masters, class_assessments テーブル作成
--
-- 設計ドキュメント: docs/tasks/P6-class-assessment.md (v6)
-- =============================================================================

-- ★ マスタデータテーブル（class_assessmentsがFKで参照）
CREATE TABLE assessment_masters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- テスト種別
  assessment_type VARCHAR(20) NOT NULL CHECK (assessment_type IN ('math_print', 'kanji_test')),

  -- 対象学年
  grade VARCHAR(10) NOT NULL CHECK (grade IN ('5年', '6年')),

  -- 学習回（第1回〜第19回）
  session_number INTEGER NOT NULL CHECK (session_number BETWEEN 1 AND 19),

  -- 回数（算数プリント:1-2回、漢字テスト:1回のみ）
  attempt_number INTEGER NOT NULL CHECK (attempt_number BETWEEN 1 AND 2),

  -- 満点（算数プリント:100点、漢字テスト:50点が標準）
  max_score INTEGER NOT NULL CHECK (max_score > 0),

  -- メタ情報
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- ユニーク制約（同一テスト種別・学年・学習回・回数の組み合わせは一意）
  UNIQUE (assessment_type, grade, session_number, attempt_number)
);

-- 検索用インデックス
CREATE INDEX idx_assessment_masters_type_grade ON assessment_masters(assessment_type, grade);

-- コメント
COMMENT ON TABLE assessment_masters IS 'クラス内テストのマスタデータ（算数プリント・漢字テスト）';
COMMENT ON COLUMN assessment_masters.assessment_type IS 'テスト種別: math_print=算数プリント, kanji_test=漢字テスト';
COMMENT ON COLUMN assessment_masters.grade IS '対象学年: 5年 or 6年';
COMMENT ON COLUMN assessment_masters.session_number IS '学習回（第N回）';
COMMENT ON COLUMN assessment_masters.attempt_number IS '回数（算数:1-2, 漢字:1のみ）';
COMMENT ON COLUMN assessment_masters.max_score IS '満点（算数:100, 漢字:50が標準）';

-- ★ ステータスENUM型
CREATE TYPE assessment_status AS ENUM ('completed', 'absent', 'not_submitted');

-- ★ テスト結果テーブル
CREATE TABLE class_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 対象生徒
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,

  -- ★ マスタ参照（FK制約で厳密に紐付け）
  master_id UUID NOT NULL REFERENCES assessment_masters(id),

  -- ★ ステータス（完了/欠席/未提出）
  -- completed: 得点入力済み
  -- absent: 欠席（補習対象）
  -- not_submitted: 未提出（指導者がまだ入力していない）
  status assessment_status NOT NULL DEFAULT 'not_submitted',

  -- 得点（status='completed'のときのみ有効値、それ以外はNULL）
  score INTEGER CHECK (score >= 0),

  -- ★ statusとscoreの整合性チェック
  CONSTRAINT score_status_consistency CHECK (
    (status = 'completed' AND score IS NOT NULL) OR
    (status IN ('absent', 'not_submitted') AND score IS NULL)
  ),

  -- ★ 入力時点の値を固定（将来のマスタ変更で過去データの%が変わらないように）
  max_score_at_submission INTEGER NOT NULL CHECK (max_score_at_submission > 0),
  grade_at_submission VARCHAR(10) NOT NULL CHECK (grade_at_submission IN ('5年', '6年')),

  -- 実施日（テスト実施予定日）
  -- ★ status='not_submitted'の場合も必須（予定日を記録）
  -- ★ status='absent'の場合は欠席した日を記録
  -- ★ status='completed'の場合は実際に受験した日を記録
  assessment_date DATE NOT NULL,

  -- 再提出フラグ（通常提出:false、再提出:true）
  -- ★ 再提出は1回のみ許可（下記ユニーク制約で担保）
  -- ★ 初回欠席→補習は通常提出扱い（is_resubmission=false）
  is_resubmission BOOLEAN NOT NULL DEFAULT false,

  -- ★ is_resubmissionとstatusの組み合わせ制約
  -- 再提出は必ずcompleted（欠席/未提出の再提出は論理的に不整合）
  CONSTRAINT resubmission_must_be_completed CHECK (
    is_resubmission = false OR status = 'completed'
  ),

  -- 監査情報
  grader_id UUID NOT NULL REFERENCES auth.users(id), -- 入力した指導者
  modified_by UUID REFERENCES auth.users(id),        -- ★ 管理者が修正した場合に記録
  source VARCHAR(20) NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'import')),

  -- タイムスタンプ
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- ★ ユニーク制約: 同一生徒 × 同一マスタ × 再提出フラグで一意
  -- これにより再提出は1回のみ許可される
  UNIQUE (student_id, master_id, is_resubmission)
);

-- インデックス
CREATE INDEX idx_class_assessments_student_date ON class_assessments(student_id, assessment_date DESC);
CREATE INDEX idx_class_assessments_master ON class_assessments(master_id);
CREATE INDEX idx_class_assessments_grader ON class_assessments(grader_id);

-- コメント
COMMENT ON TABLE class_assessments IS 'クラス内テスト結果（算数プリント・漢字テスト）';
COMMENT ON COLUMN class_assessments.status IS 'ステータス: completed=完了, absent=欠席, not_submitted=未提出';
COMMENT ON COLUMN class_assessments.max_score_at_submission IS '入力時点の満点（マスタからコピー、不変）';
COMMENT ON COLUMN class_assessments.grade_at_submission IS '入力時点の学年（マスタからコピー、不変）';
COMMENT ON COLUMN class_assessments.is_resubmission IS '再提出フラグ（true=再提出、初回欠席→補習はfalse）';
COMMENT ON COLUMN class_assessments.modified_by IS '管理者が修正した場合のユーザーID';

-- =============================================================================
-- トリガー関数: 入力値設定 + バリデーション（統合）
-- =============================================================================

-- ★ 統合トリガー: 入力値設定 + バリデーションを1つの関数で実行
-- （トリガー実行順序問題を回避するため統合）
--
-- 処理順序:
-- INSERT時:
--   1. マスタからmax_score, gradeを取得してコピー（自動設定）
--   2. scoreがmax_score_at_submissionを超えていないかチェック
-- UPDATE時:
--   1. master_id / max_score_at_submission / grade_at_submission 不変チェック
--   2. scoreがmax_score_at_submissionを超えていないかチェック
--
CREATE OR REPLACE FUNCTION process_assessment_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_max_score INTEGER;
  v_master_grade VARCHAR(10);
BEGIN
  -- ★ UPDATE時: 不変フィールドのチェック
  IF TG_OP = 'UPDATE' THEN
    -- master_id変更禁止
    IF OLD.master_id != NEW.master_id THEN
      RAISE EXCEPTION 'master_id cannot be changed after insert. Create a new record instead.';
    END IF;

    -- ★ max_score_at_submission 変更禁止（入力時点の値を保持）
    IF OLD.max_score_at_submission != NEW.max_score_at_submission THEN
      RAISE EXCEPTION 'max_score_at_submission cannot be changed after insert.';
    END IF;

    -- ★ grade_at_submission 変更禁止（入力時点の値を保持）
    IF OLD.grade_at_submission != NEW.grade_at_submission THEN
      RAISE EXCEPTION 'grade_at_submission cannot be changed after insert.';
    END IF;
  END IF;

  -- INSERT時のみ: マスタから値を取得してコピー
  IF TG_OP = 'INSERT' THEN
    SELECT max_score, grade INTO v_max_score, v_master_grade
    FROM assessment_masters WHERE id = NEW.master_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Master not found: %', NEW.master_id;
    END IF;

    -- 入力時点の値を固定（マスタからコピー）
    -- ★ これによりマスタの将来の変更が過去データに影響しない
    NEW.max_score_at_submission := v_max_score;
    NEW.grade_at_submission := v_master_grade;
  END IF;

  -- 得点チェック（status='completed'の場合のみ、INSERT/UPDATE共通）
  IF NEW.status = 'completed' THEN
    IF NEW.score IS NULL THEN
      RAISE EXCEPTION 'Score is required when status is completed';
    END IF;
    IF NEW.score > NEW.max_score_at_submission THEN
      RAISE EXCEPTION 'Score (%) exceeds max_score_at_submission (%)',
        NEW.score, NEW.max_score_at_submission;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ★ 単一のトリガーで全処理を実行（順序問題を回避）
CREATE TRIGGER trg_process_assessment
BEFORE INSERT OR UPDATE ON class_assessments
FOR EACH ROW EXECUTE FUNCTION process_assessment_insert();

-- =============================================================================
-- トリガー関数: 管理者修正時のmodified_by自動設定
-- =============================================================================

CREATE OR REPLACE FUNCTION set_modified_by_on_admin_update()
RETURNS TRIGGER AS $$
DECLARE
  v_is_admin BOOLEAN;
BEGIN
  -- 現在のユーザーがadminロールか確認
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  ) INTO v_is_admin;

  -- ★ adminロールでのUPDATEは常にmodified_byを設定
  -- （grader_idを自分に変更した場合も監査漏れを防止）
  IF v_is_admin THEN
    NEW.modified_by := auth.uid();
  -- 非adminの場合は、grader_id以外のユーザーが更新した場合のみ記録
  ELSIF auth.uid() != OLD.grader_id THEN
    NEW.modified_by := auth.uid();
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_modified_by
BEFORE UPDATE ON class_assessments
FOR EACH ROW EXECUTE FUNCTION set_modified_by_on_admin_update();

-- =============================================================================
-- RLSポリシー
-- =============================================================================

-- RLS有効化
ALTER TABLE class_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_masters ENABLE ROW LEVEL SECURITY;

-- ===== assessment_masters（マスタデータ） =====

-- 全ユーザー閲覧可
CREATE POLICY "masters_select_all" ON assessment_masters
  FOR SELECT TO authenticated
  USING (true);

-- ★ マスタ登録は管理者のみ（運用時にシード投入）
CREATE POLICY "masters_insert_admin_only" ON assessment_masters
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ★ マスタ更新は禁止（RLSポリシーなし = 更新不可）
-- 理由: 既存のclass_assessmentsレコードのmax_score_at_submission/grade_at_submissionと
--       整合性が取れなくなるため
-- 修正が必要な場合は、新しいマスタレコードを作成し、既存レコードは維持する

-- ★ マスタ削除も禁止（参照整合性のため）
-- class_assessmentsからFKで参照されているため、DELETEは自動的に失敗する

-- ===== class_assessments =====

-- 生徒: 自分のデータのみ閲覧（SELECT only）
CREATE POLICY "students_select_own" ON class_assessments
  FOR SELECT TO authenticated
  USING (
    student_id IN (
      SELECT id FROM students WHERE user_id = auth.uid()
    )
  );

-- 指導者: 担当生徒のデータを閲覧・作成・更新
CREATE POLICY "coaches_select_assigned" ON class_assessments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM coach_student_relations csr
      JOIN coaches c ON csr.coach_id = c.id
      WHERE csr.student_id = class_assessments.student_id
      AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "coaches_insert_assigned" ON class_assessments
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM coach_student_relations csr
      JOIN coaches c ON csr.coach_id = c.id
      WHERE csr.student_id = class_assessments.student_id
      AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "coaches_update_own" ON class_assessments
  FOR UPDATE TO authenticated
  USING (
    grader_id = auth.uid()
  );

-- 保護者: 子どものデータを閲覧（SELECT only）
CREATE POLICY "parents_select_children" ON class_assessments
  FOR SELECT TO authenticated
  USING (
    student_id IN (
      SELECT pcr.student_id FROM parent_child_relations pcr
      JOIN parents p ON pcr.parent_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

-- 管理者: 全データの閲覧・更新
CREATE POLICY "admin_select_all" ON class_assessments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "admin_update_all" ON class_assessments
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =============================================================================
-- 初期マスタデータ（5年生・6年生共通）
-- =============================================================================

-- ★ 5年生用マスタデータ
-- 算数プリント: 第1回〜第19回、各2回
INSERT INTO assessment_masters (assessment_type, grade, session_number, attempt_number, max_score)
SELECT
  'math_print',
  '5年',
  s.session_number,
  a.attempt_number,
  100
FROM
  generate_series(1, 19) AS s(session_number),
  generate_series(1, 2) AS a(attempt_number);

-- 漢字テスト: 第1回〜第19回、各1回
INSERT INTO assessment_masters (assessment_type, grade, session_number, attempt_number, max_score)
SELECT
  'kanji_test',
  '5年',
  s.session_number,
  1,
  50
FROM generate_series(1, 19) AS s(session_number);

-- ★ 6年生用マスタデータ
-- 算数プリント: 第1回〜第15回、各2回
INSERT INTO assessment_masters (assessment_type, grade, session_number, attempt_number, max_score)
SELECT
  'math_print',
  '6年',
  s.session_number,
  a.attempt_number,
  100
FROM
  generate_series(1, 15) AS s(session_number),
  generate_series(1, 2) AS a(attempt_number);

-- 漢字テスト: 第1回〜第15回、各1回
INSERT INTO assessment_masters (assessment_type, grade, session_number, attempt_number, max_score)
SELECT
  'kanji_test',
  '6年',
  s.session_number,
  1,
  50
FROM generate_series(1, 15) AS s(session_number);

-- =============================================================================
-- 確認クエリ（マイグレーション後の検証用）
-- =============================================================================

-- マスタデータ件数確認（期待値: 5年=57件、6年=45件、合計102件）
-- SELECT grade, assessment_type, COUNT(*)
-- FROM assessment_masters
-- GROUP BY grade, assessment_type
-- ORDER BY grade, assessment_type;
