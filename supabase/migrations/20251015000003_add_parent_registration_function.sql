-- ============================================================================
-- 保護者・子ども同時登録関数（トランザクション対応）
-- ============================================================================

-- 保護者登録用の型定義
CREATE TYPE parent_child_registration_result AS (
  parent_id BIGINT,
  student_ids BIGINT[]
);

-- 保護者・子ども同時登録関数
CREATE OR REPLACE FUNCTION register_parent_with_children(
  p_parent_user_id UUID,
  p_parent_full_name VARCHAR(100),
  p_parent_furigana VARCHAR(100),
  p_children JSONB -- [{ user_id, full_name, furigana, login_id, grade }]
)
RETURNS parent_child_registration_result
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_parent_id BIGINT;
  v_student_id BIGINT;
  v_student_ids BIGINT[] := ARRAY[]::BIGINT[];
  v_child JSONB;
  v_result parent_child_registration_result;
BEGIN
  -- 1. プロフィールが存在するか確認（トリガーで作成されているはず）
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_parent_user_id) THEN
    RAISE EXCEPTION 'Profile not found for user_id: %', p_parent_user_id;
  END IF;

  -- 2. 保護者レコード作成
  INSERT INTO public.parents (user_id, full_name, furigana)
  VALUES (p_parent_user_id, p_parent_full_name, p_parent_furigana)
  RETURNING id INTO v_parent_id;

  -- 3. 各子どものレコード作成とリレーション作成
  FOR v_child IN SELECT * FROM jsonb_array_elements(p_children)
  LOOP
    -- 子どものプロフィール確認
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = (v_child->>'user_id')::UUID) THEN
      RAISE EXCEPTION 'Profile not found for child user_id: %', v_child->>'user_id';
    END IF;

    -- login_id重複チェック
    IF EXISTS (SELECT 1 FROM public.students WHERE login_id = v_child->>'login_id') THEN
      RAISE EXCEPTION 'Login ID already exists: %', v_child->>'login_id';
    END IF;

    -- 生徒レコード作成
    INSERT INTO public.students (user_id, full_name, furigana, login_id, grade)
    VALUES (
      (v_child->>'user_id')::UUID,
      v_child->>'full_name',
      v_child->>'furigana',
      v_child->>'login_id',
      (v_child->>'grade')::SMALLINT
    )
    RETURNING id INTO v_student_id;

    -- 配列に追加
    v_student_ids := array_append(v_student_ids, v_student_id);

    -- 親子関係作成
    INSERT INTO public.parent_child_relations (parent_id, student_id)
    VALUES (v_parent_id, v_student_id);
  END LOOP;

  -- 結果を返す
  v_result.parent_id := v_parent_id;
  v_result.student_ids := v_student_ids;
  RETURN v_result;
END;
$$;

-- コメント
COMMENT ON FUNCTION register_parent_with_children IS '保護者と子どもを原子的に登録する関数。エラー時は自動的にロールバックされる。';
