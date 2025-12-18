-- =============================================================================
-- Phase 6補足: 算数プリント・漢字テスト満点修正 + タイトル追加
-- 作成日: 2025-12-19
--
-- 変更内容:
-- 1. assessment_masters テーブルに title カラム追加
-- 2. 漢字テストの満点を 50点 → 10点 に修正
-- 3. 5年生算数プリントの満点を実際の問題数に合わせて修正
-- 4. 5年生の欠落回（第5, 10, 15, 19回）のレコード削除
-- 5. 5年生算数プリントにタイトル設定
--
-- 参考ドキュメント: docs/data/assessment-masters-correct-scores.md
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. title カラム追加（NULL許可、後で必須化）
-- -----------------------------------------------------------------------------
ALTER TABLE assessment_masters
ADD COLUMN IF NOT EXISTS title VARCHAR(100);

COMMENT ON COLUMN assessment_masters.title IS 'テスト名称（例: マスタープリント小5下第1回①比の利用）';

-- -----------------------------------------------------------------------------
-- 2. 漢字テストの満点を 50 → 10 に修正（5年・6年共通）
-- -----------------------------------------------------------------------------
UPDATE assessment_masters
SET max_score = 10
WHERE assessment_type = 'kanji_test';

-- -----------------------------------------------------------------------------
-- 3. 5年生の欠落回を削除（第5, 10, 15, 19回）
-- -----------------------------------------------------------------------------
-- ★ 安全策: 既に class_assessments で参照されているマスタは削除しない（FKエラー回避）
DELETE FROM assessment_masters am
WHERE am.assessment_type = 'math_print'
  AND am.grade = '5年'
  AND am.session_number IN (5, 10, 15, 19)
  AND NOT EXISTS (
    SELECT 1 FROM class_assessments ca
    WHERE ca.master_id = am.id
  );

-- -----------------------------------------------------------------------------
-- 4. 5年生算数プリントの満点を実際の問題数に修正
-- -----------------------------------------------------------------------------

-- 第1回
UPDATE assessment_masters SET max_score = 44, title = 'マスタープリント小5下第1回①比の利用'
WHERE assessment_type = 'math_print' AND grade = '5年' AND session_number = 1 AND attempt_number = 1;

UPDATE assessment_masters SET max_score = 22, title = 'マスタープリント小5下第1回②比の利用'
WHERE assessment_type = 'math_print' AND grade = '5年' AND session_number = 1 AND attempt_number = 2;

-- 第2回
UPDATE assessment_masters SET max_score = 32, title = 'マスタープリント小5下第2回①平面図形と比'
WHERE assessment_type = 'math_print' AND grade = '5年' AND session_number = 2 AND attempt_number = 1;

UPDATE assessment_masters SET max_score = 41, title = 'マスタープリント小5下第2回②平面図形と比'
WHERE assessment_type = 'math_print' AND grade = '5年' AND session_number = 2 AND attempt_number = 2;

-- 第3回
UPDATE assessment_masters SET max_score = 22, title = 'マスタープリント小5下第3回①平面図形と比'
WHERE assessment_type = 'math_print' AND grade = '5年' AND session_number = 3 AND attempt_number = 1;

UPDATE assessment_masters SET max_score = 23, title = 'マスタープリント小5下第3回②平面図形と比'
WHERE assessment_type = 'math_print' AND grade = '5年' AND session_number = 3 AND attempt_number = 2;

-- 第4回
UPDATE assessment_masters SET max_score = 30, title = 'マスタープリント小5下第4回①つるかめ算の応用'
WHERE assessment_type = 'math_print' AND grade = '5年' AND session_number = 4 AND attempt_number = 1;

UPDATE assessment_masters SET max_score = 40, title = 'マスタープリント小5下第4回②つるかめ算の応用・年齢算'
WHERE assessment_type = 'math_print' AND grade = '5年' AND session_number = 4 AND attempt_number = 2;

-- 第6回
UPDATE assessment_masters SET max_score = 21, title = 'マスタープリント小5下第6回①速さと比'
WHERE assessment_type = 'math_print' AND grade = '5年' AND session_number = 6 AND attempt_number = 1;

UPDATE assessment_masters SET max_score = 37, title = 'マスタープリント小5下第6回②速さと比'
WHERE assessment_type = 'math_print' AND grade = '5年' AND session_number = 6 AND attempt_number = 2;

-- 第7回
UPDATE assessment_masters SET max_score = 30, title = 'マスタープリント小5下第7回①旅人算と比'
WHERE assessment_type = 'math_print' AND grade = '5年' AND session_number = 7 AND attempt_number = 1;

UPDATE assessment_masters SET max_score = 17, title = 'マスタープリント小5下第7回②旅人算と比'
WHERE assessment_type = 'math_print' AND grade = '5年' AND session_number = 7 AND attempt_number = 2;

-- 第8回
UPDATE assessment_masters SET max_score = 24, title = 'マスタープリント小5下第8回①平面図形と比'
WHERE assessment_type = 'math_print' AND grade = '5年' AND session_number = 8 AND attempt_number = 1;

UPDATE assessment_masters SET max_score = 24, title = 'マスタープリント小5下第8回②平面図形と比'
WHERE assessment_type = 'math_print' AND grade = '5年' AND session_number = 8 AND attempt_number = 2;

-- 第9回
UPDATE assessment_masters SET max_score = 14, title = 'マスタープリント小5下第9回①図形の移動'
WHERE assessment_type = 'math_print' AND grade = '5年' AND session_number = 9 AND attempt_number = 1;

UPDATE assessment_masters SET max_score = 17, title = 'マスタープリント小5下第9回②図形の移動'
WHERE assessment_type = 'math_print' AND grade = '5年' AND session_number = 9 AND attempt_number = 2;

-- 第11回
UPDATE assessment_masters SET max_score = 29, title = 'マスタープリント小5下第11回①仕事に関する問題'
WHERE assessment_type = 'math_print' AND grade = '5年' AND session_number = 11 AND attempt_number = 1;

UPDATE assessment_masters SET max_score = 37, title = 'マスタープリント小5下第11回②仕事に関する問題'
WHERE assessment_type = 'math_print' AND grade = '5年' AND session_number = 11 AND attempt_number = 2;

-- 第12回
UPDATE assessment_masters SET max_score = 30, title = 'マスタープリント小5下第12回①水深の変化と比'
WHERE assessment_type = 'math_print' AND grade = '5年' AND session_number = 12 AND attempt_number = 1;

UPDATE assessment_masters SET max_score = 23, title = 'マスタープリント小5下第12回②水深の変化と比'
WHERE assessment_type = 'math_print' AND grade = '5年' AND session_number = 12 AND attempt_number = 2;

-- 第13回
UPDATE assessment_masters SET max_score = 48, title = 'マスタープリント小5下第13回①整数の分解と構成'
WHERE assessment_type = 'math_print' AND grade = '5年' AND session_number = 13 AND attempt_number = 1;

UPDATE assessment_masters SET max_score = 29, title = 'マスタープリント小5下第13回②整数の分解と構成'
WHERE assessment_type = 'math_print' AND grade = '5年' AND session_number = 13 AND attempt_number = 2;

-- 第14回
UPDATE assessment_masters SET max_score = 23, title = 'マスタープリント小5下第14回①直方体・立方体の切断'
WHERE assessment_type = 'math_print' AND grade = '5年' AND session_number = 14 AND attempt_number = 1;

UPDATE assessment_masters SET max_score = 17, title = 'マスタープリント小5下第14回②直方体・立方体の切断'
WHERE assessment_type = 'math_print' AND grade = '5年' AND session_number = 14 AND attempt_number = 2;

-- 第16回
UPDATE assessment_masters SET max_score = 28, title = 'マスタープリント小5下第16回①濃さと比'
WHERE assessment_type = 'math_print' AND grade = '5年' AND session_number = 16 AND attempt_number = 1;

UPDATE assessment_masters SET max_score = 26, title = 'マスタープリント小5下第16回②濃さと比'
WHERE assessment_type = 'math_print' AND grade = '5年' AND session_number = 16 AND attempt_number = 2;

-- 第17回
UPDATE assessment_masters SET max_score = 15, title = 'マスタープリント小5下第17回①いろいろな立体の求積'
WHERE assessment_type = 'math_print' AND grade = '5年' AND session_number = 17 AND attempt_number = 1;

UPDATE assessment_masters SET max_score = 16, title = 'マスタープリント小5下第17回②いろいろな立体の求積'
WHERE assessment_type = 'math_print' AND grade = '5年' AND session_number = 17 AND attempt_number = 2;

-- 第18回
UPDATE assessment_masters SET max_score = 40, title = 'マスタープリント小5下第18回①いろいろな速さの問題'
WHERE assessment_type = 'math_print' AND grade = '5年' AND session_number = 18 AND attempt_number = 1;

UPDATE assessment_masters SET max_score = 28, title = 'マスタープリント小5下第18回②いろいろな速さの問題'
WHERE assessment_type = 'math_print' AND grade = '5年' AND session_number = 18 AND attempt_number = 2;

-- -----------------------------------------------------------------------------
-- 5. 漢字テストにタイトル設定（簡易版）
-- -----------------------------------------------------------------------------

-- 5年生漢字テスト
UPDATE assessment_masters
SET title = '漢字テスト 第' || session_number || '回'
WHERE assessment_type = 'kanji_test' AND grade = '5年';

-- 6年生漢字テスト
UPDATE assessment_masters
SET title = '漢字テスト 第' || session_number || '回'
WHERE assessment_type = 'kanji_test' AND grade = '6年';

-- -----------------------------------------------------------------------------
-- 6. 6年生算数プリントにタイトル設定（暫定版）
-- -----------------------------------------------------------------------------
-- TODO: 6年生の正確なタイトルが提供され次第、個別に UPDATE すること

UPDATE assessment_masters
SET title = 'マスタープリント小6第' || session_number || '回' ||
            CASE WHEN attempt_number = 1 THEN '①' ELSE '②' END
WHERE assessment_type = 'math_print' AND grade = '6年';

COMMIT;

-- =============================================================================
-- 検証クエリ
-- =============================================================================

-- 1. 漢字テストの満点確認（期待値: 全て10点）
-- SELECT grade, session_number, max_score
-- FROM assessment_masters
-- WHERE assessment_type = 'kanji_test'
-- ORDER BY grade, session_number;

-- 2. 5年生算数プリントの満点確認（期待値: 様々な値）
-- SELECT session_number, attempt_number, max_score, title
-- FROM assessment_masters
-- WHERE assessment_type = 'math_print' AND grade = '5年'
-- ORDER BY session_number, attempt_number;

-- 3. 5年生の欠落回が削除されたか確認（期待値: 0件）
-- SELECT session_number, attempt_number
-- FROM assessment_masters
-- WHERE assessment_type = 'math_print' AND grade = '5年'
--   AND session_number IN (5, 10, 15, 19);

-- 4. タイトルが設定されているか確認
-- SELECT assessment_type, grade, COUNT(*) as total, COUNT(title) as with_title
-- FROM assessment_masters
-- GROUP BY assessment_type, grade
-- ORDER BY assessment_type, grade;
