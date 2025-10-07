-- ============================================================================
-- Add type_category column to test_types table
-- ============================================================================
-- 作成日: 2025-10-07
-- 説明: test_typesテーブルにtype_categoryカラムを追加し、既存データを更新

-- type_categoryカラムを追加
ALTER TABLE public.test_types
ADD COLUMN IF NOT EXISTS type_category VARCHAR(50);

-- 既存データに対してtype_categoryを設定
-- 小5の組分けテスト
UPDATE public.test_types
SET type_category = 'kumibun'
WHERE grade = 5 AND name LIKE '%組分け%';

-- 小6の合不合判定テスト
UPDATE public.test_types
SET type_category = 'goufugou'
WHERE grade = 6 AND name LIKE '%合不合%';

-- 今後の挿入に対してNOT NULL制約を追加（既存データ更新後）
-- まずは nullable で追加し、データ移行後に NOT NULL 制約を適用
ALTER TABLE public.test_types
ALTER COLUMN type_category SET NOT NULL;

-- コメント追加
COMMENT ON COLUMN public.test_types.type_category IS 'テストカテゴリ (kumibun: 組分けテスト, goufugou: 合不合判定テスト)';
