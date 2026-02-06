-- =============================================================================
-- 2026年度対応: assessment_masters の制約緩和とデータ追加
-- 作成日: 2026-02-06
--
-- 変更内容:
-- 1. session_number の CHECK 制約を緩和（BETWEEN 1 AND 19 → >= 1）
-- 2. 5年生: 第20回のマスタデータ追加（算数プリント×2 + 漢字テスト×1）
-- 3. 6年生: 第16〜18回のマスタデータ追加（算数プリント×2 + 漢字テスト×1 × 3回分）
--
-- 背景:
-- - 2025年度: 5年19回、6年15回
-- - 2026年度: 5年20回、6年18回
-- - CHECK (session_number BETWEEN 1 AND 19) が上限を制限していたため緩和
--
-- 影響範囲:
-- - テーブル: assessment_masters
-- - 既存データへの影響: なし（制約緩和+追加のみ）
--
-- 注記:
-- - 本マイグレーションは増分変更（新規セッション追加）であり、
--   03_data_strategy.md 8.2 の「seed.sql 全面置換」とは別工程
-- - 全マスタデータの一括刷新は後続フェーズで実施予定
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. session_number の CHECK 制約を緩和
--    BETWEEN 1 AND 19 → >= 1（上限撤廃）
--    理由: 年度ごとに学習回数が変動するため、DB側で上限を固定しない
-- -----------------------------------------------------------------------------

-- 既存の CHECK 制約を削除
ALTER TABLE assessment_masters
DROP CONSTRAINT IF EXISTS assessment_masters_session_number_check;

-- 新しい CHECK 制約を追加（下限のみ）
ALTER TABLE assessment_masters
ADD CONSTRAINT assessment_masters_session_number_check
CHECK (session_number >= 1);

-- -----------------------------------------------------------------------------
-- 2. 5年生: 第20回のマスタデータ追加
-- -----------------------------------------------------------------------------

-- 算数プリント: 第20回、2回分
INSERT INTO assessment_masters (assessment_type, grade, session_number, attempt_number, max_score)
VALUES
  ('math_print', '5年', 20, 1, 100),
  ('math_print', '5年', 20, 2, 100)
ON CONFLICT (assessment_type, grade, session_number, attempt_number) DO NOTHING;

-- 漢字テスト: 第20回、1回分
INSERT INTO assessment_masters (assessment_type, grade, session_number, attempt_number, max_score)
VALUES
  ('kanji_test', '5年', 20, 1, 10)
ON CONFLICT (assessment_type, grade, session_number, attempt_number) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 3. 6年生: 第16〜18回のマスタデータ追加
-- -----------------------------------------------------------------------------

-- 算数プリント: 第16〜18回、各2回分
INSERT INTO assessment_masters (assessment_type, grade, session_number, attempt_number, max_score)
SELECT
  'math_print',
  '6年',
  s.session_number,
  a.attempt_number,
  100
FROM
  generate_series(16, 18) AS s(session_number),
  generate_series(1, 2) AS a(attempt_number)
ON CONFLICT (assessment_type, grade, session_number, attempt_number) DO NOTHING;

-- 漢字テスト: 第16〜18回、各1回分
INSERT INTO assessment_masters (assessment_type, grade, session_number, attempt_number, max_score)
SELECT
  'kanji_test',
  '6年',
  s.session_number,
  1,
  10
FROM generate_series(16, 18) AS s(session_number)
ON CONFLICT (assessment_type, grade, session_number, attempt_number) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 検証クエリ（マイグレーション後に実行して確認）
-- -----------------------------------------------------------------------------

-- 制約確認
-- SELECT conname, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conrelid = 'assessment_masters'::regclass
-- AND conname LIKE '%session_number%';
-- → assessment_masters_session_number_check: CHECK (session_number >= 1)

-- データ件数確認
-- SELECT grade, assessment_type, COUNT(*), MAX(session_number) as max_session
-- FROM assessment_masters
-- GROUP BY grade, assessment_type
-- ORDER BY grade, assessment_type;
-- 期待値:
--   5年 kanji_test:  最大20回（ただし欠落回あり）
--   5年 math_print:  最大20回（ただし欠落回あり）
--   6年 kanji_test:  最大18回
--   6年 math_print:  最大18回

COMMIT;
