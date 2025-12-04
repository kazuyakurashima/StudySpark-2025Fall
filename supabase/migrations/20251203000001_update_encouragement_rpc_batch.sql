-- ============================================================================
-- 応援機能用RPC関数に batch_id/logged_at を追加
-- ============================================================================
-- 作成日: 2025-12-03
-- 説明: Phase 2 応援送信画面でバッチグループ化を実現するため、
--       get_study_logs_for_encouragement にbatch_idとlogged_atを追加

-- 既存関数を削除
DROP FUNCTION IF EXISTS public.get_study_logs_for_encouragement(
  BIGINT, TEXT, BIGINT, TEXT, TEXT, INTEGER, INTEGER
);

-- RPC関数: 学習記録一覧を取得（応援機能用）- batch_id/logged_at追加版
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
  logged_at TIMESTAMPTZ,           -- 追加
  batch_id UUID,                   -- 追加
  session_number SMALLINT,
  session_grade SMALLINT,
  subject_name VARCHAR(50),
  content_name VARCHAR(255),
  total_count BIGINT,
  has_encouragement BOOLEAN
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
      v_order_clause := 'ORDER BY sl.logged_at ASC, sl.id ASC';
    ELSE
      v_order_clause := 'ORDER BY sl.logged_at DESC, sl.id DESC';
    END IF;
  ELSIF p_sort_by = 'session' THEN
    IF p_sort_order = 'asc' THEN
      v_order_clause := 'ORDER BY sl.session_id ASC, sl.id ASC';
    ELSE
      v_order_clause := 'ORDER BY sl.session_id DESC, sl.id DESC';
    END IF;
  ELSE
    -- デフォルトはlogged_at降順
    v_order_clause := 'ORDER BY sl.logged_at DESC, sl.id DESC';
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
      sl.logged_at,
      sl.batch_id,
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

COMMENT ON FUNCTION public.get_study_logs_for_encouragement IS '応援機能用の学習記録一覧取得（batch_id/logged_at追加版）';
