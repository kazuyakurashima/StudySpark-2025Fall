-- ============================================================================
-- 応援機能用の学習記録取得RPC関数
-- ============================================================================
-- 作成日: 2025-11-11
-- 説明: 保護者・指導者が応援機能で使用する学習記録一覧を取得する
--       ページネーション、フィルター、ソートを全てDB側で処理し、
--       hasEncouragement（応援済み/未応援）判定もDB側で完結させる

-- 既存関数を削除（もしあれば）
DROP FUNCTION IF EXISTS public.get_study_logs_for_encouragement(
  BIGINT, TEXT, BIGINT, TEXT, TEXT, INTEGER, INTEGER
);

-- RPC関数: 学習記録一覧を取得（応援機能用）
CREATE OR REPLACE FUNCTION public.get_study_logs_for_encouragement(
  p_student_id BIGINT,
  p_has_encouragement TEXT DEFAULT 'all',  -- 'all' | 'sent' | 'not_sent'
  p_subject_id BIGINT DEFAULT NULL,
  p_sort_by TEXT DEFAULT 'date',          -- 'date' | 'session'
  p_sort_order TEXT DEFAULT 'desc',       -- 'asc' | 'desc'
  p_limit INTEGER DEFAULT 10,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id BIGINT,
  student_id BIGINT,
  study_date DATE,
  session_id BIGINT,
  subject_id BIGINT,
  study_content_type_id BIGINT,
  total_problems SMALLINT,
  correct_count SMALLINT,
  reflection_text TEXT,
  created_at TIMESTAMPTZ,
  session_number SMALLINT,
  session_grade SMALLINT,
  subject_name VARCHAR(50),
  content_name VARCHAR(255),
  total_count BIGINT,  -- フィルター適用後の総件数
  has_encouragement BOOLEAN  -- この学習記録に応援メッセージがあるか
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, pg_temp
STABLE
AS $$
DECLARE
  v_query TEXT;
  v_count_query TEXT;
  v_total_count BIGINT;
  v_where_clause TEXT := '';
  v_order_clause TEXT := '';
BEGIN
  -- WHERE句の構築
  v_where_clause := format('WHERE sl.student_id = %L', p_student_id);

  -- 科目フィルター
  IF p_subject_id IS NOT NULL THEN
    v_where_clause := v_where_clause || format(' AND sl.subject_id = %L', p_subject_id);
  END IF;

  -- 応援済み/未応援フィルター
  IF p_has_encouragement = 'sent' THEN
    v_where_clause := v_where_clause || ' AND EXISTS (
      SELECT 1 FROM public.encouragement_messages em
      WHERE em.related_study_log_id = sl.id
    )';
  ELSIF p_has_encouragement = 'not_sent' THEN
    v_where_clause := v_where_clause || ' AND NOT EXISTS (
      SELECT 1 FROM public.encouragement_messages em
      WHERE em.related_study_log_id = sl.id
    )';
  END IF;

  -- ORDER BY句の構築
  IF p_sort_by = 'date' THEN
    IF p_sort_order = 'asc' THEN
      v_order_clause := 'ORDER BY sl.study_date ASC, sl.id ASC';
    ELSE
      v_order_clause := 'ORDER BY sl.study_date DESC, sl.id DESC';
    END IF;
  ELSIF p_sort_by = 'session' THEN
    IF p_sort_order = 'asc' THEN
      v_order_clause := 'ORDER BY sl.session_id ASC, sl.id ASC';
    ELSE
      v_order_clause := 'ORDER BY sl.session_id DESC, sl.id DESC';
    END IF;
  ELSE
    -- デフォルトは日付降順
    v_order_clause := 'ORDER BY sl.study_date DESC, sl.id DESC';
  END IF;

  -- 総件数を取得（フィルター適用後）
  v_count_query := format(
    'SELECT COUNT(*) FROM public.study_logs sl %s',
    v_where_clause
  );
  EXECUTE v_count_query INTO v_total_count;

  -- メインクエリを構築して実行
  RETURN QUERY EXECUTE format('
    SELECT
      sl.id,
      sl.student_id,
      sl.study_date,
      sl.session_id,
      sl.subject_id,
      sl.study_content_type_id,
      sl.total_problems,
      sl.correct_count,
      sl.reflection_text,
      sl.created_at,
      ss.session_number,
      ss.grade,
      subj.name,
      sct.content_name,
      %L::BIGINT AS total_count,
      EXISTS (
        SELECT 1 FROM public.encouragement_messages em
        WHERE em.related_study_log_id = sl.id
      ) AS has_encouragement
    FROM public.study_logs sl
    INNER JOIN public.study_sessions ss ON ss.id = sl.session_id
    INNER JOIN public.subjects subj ON subj.id = sl.subject_id
    INNER JOIN public.study_content_types sct ON sct.id = sl.study_content_type_id
    %s
    %s
    LIMIT %L OFFSET %L
  ',
    v_total_count,
    v_where_clause,
    v_order_clause,
    p_limit,
    p_offset
  );
END;
$$;

-- 関数へのアクセス権限を設定
REVOKE ALL ON FUNCTION public.get_study_logs_for_encouragement(
  BIGINT, TEXT, BIGINT, TEXT, TEXT, INTEGER, INTEGER
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_study_logs_for_encouragement(
  BIGINT, TEXT, BIGINT, TEXT, TEXT, INTEGER, INTEGER
) TO authenticated;

COMMENT ON FUNCTION public.get_study_logs_for_encouragement IS '応援機能用の学習記録一覧取得（ページネーション・フィルター・ソート対応）';

-- ============================================================================
-- テスト手順
-- ============================================================================
--
-- 1. 保護者ユーザーでログイン後、以下のクエリを実行：
--    SELECT * FROM public.get_study_logs_for_encouragement(
--      p_student_id := 1,
--      p_has_encouragement := 'not_sent',
--      p_limit := 10,
--      p_offset := 0
--    );
--
--    期待結果: 未応援の学習記録が最大10件、total_count に総件数が入る
--
-- 2. ページネーションのテスト：
--    SELECT * FROM public.get_study_logs_for_encouragement(
--      p_student_id := 1,
--      p_has_encouragement := 'all',
--      p_limit := 10,
--      p_offset := 10
--    );
--
--    期待結果: 11件目から20件目の学習記録が返る
--
-- 3. 科目フィルターのテスト：
--    SELECT * FROM public.get_study_logs_for_encouragement(
--      p_student_id := 1,
--      p_subject_id := 1,  -- 算数
--      p_limit := 10,
--      p_offset := 0
--    );
--
--    期待結果: 算数の学習記録のみが返る
--
-- ============================================================================
-- ロールバック用 (down migration)
-- ============================================================================
--
-- このマイグレーションをロールバックする場合は以下を実行：
--
-- DROP FUNCTION IF EXISTS public.get_study_logs_for_encouragement(
--   BIGINT, TEXT, BIGINT, TEXT, TEXT, INTEGER, INTEGER
-- );
