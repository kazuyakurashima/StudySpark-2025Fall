-- ============================================================================
-- 振り返り上限トリガー（TOCTOU レースコンディション防止）
-- ============================================================================
-- セクションあたりの振り返りを MAX 2回に制限。
-- advisory lock で同一 student+question_set+section の同時 INSERT を直列化し、
-- COUNT チェック → INSERT の間に別リクエストが割り込む問題を防ぐ。
--
-- 上限値を変更する場合: lib/constants/exercise.ts と合わせて更新すること。
-- ============================================================================

CREATE OR REPLACE FUNCTION check_exercise_reflection_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_student_id BIGINT;
  v_question_set_id BIGINT;
  v_count INT;
  v_max INT := 2;  -- MAX_REFLECTIONS（lib/constants/exercise.ts と一致）
BEGIN
  -- answer_session から student_id, question_set_id を取得
  SELECT student_id, question_set_id
  INTO v_student_id, v_question_set_id
  FROM answer_sessions
  WHERE id = NEW.answer_session_id;

  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'answer_session not found: %', NEW.answer_session_id;
  END IF;

  -- advisory lock で同一 student+question_set+section の同時 INSERT を直列化
  PERFORM pg_advisory_xact_lock(
    v_student_id::int,
    hashtext(v_question_set_id::text || ':' || NEW.section_name)
  );

  -- question_set 横断で同セクションの振り返り数をカウント
  SELECT COUNT(*) INTO v_count
  FROM exercise_reflections er
  JOIN answer_sessions ans ON er.answer_session_id = ans.id
  WHERE ans.student_id = v_student_id
    AND ans.question_set_id = v_question_set_id
    AND er.section_name = NEW.section_name;

  IF v_count >= v_max THEN
    RAISE EXCEPTION 'reflection_limit_exceeded'
      USING ERRCODE = 'P0001',
            HINT = format('Maximum %s reflections per section reached', v_max);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_exercise_reflection_limit
  BEFORE INSERT ON exercise_reflections
  FOR EACH ROW
  EXECUTE FUNCTION check_exercise_reflection_limit();
