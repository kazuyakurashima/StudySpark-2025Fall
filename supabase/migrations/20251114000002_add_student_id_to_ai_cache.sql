-- ai_cacheテーブルにstudent_idカラムを追加してRLSポリシーを設定
-- 保護者が自分の子どものキャッシュを読めるようにする

-- ============================================================================
-- 1. student_idカラムを追加
-- ============================================================================
ALTER TABLE public.ai_cache
ADD COLUMN IF NOT EXISTS student_id BIGINT REFERENCES public.students(id) ON DELETE CASCADE;

-- インデックスを追加（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_ai_cache_student_id ON public.ai_cache(student_id);
CREATE INDEX IF NOT EXISTS idx_ai_cache_cache_key_student ON public.ai_cache(cache_key, student_id);

-- ============================================================================
-- 2. RLSポリシーを追加
-- ============================================================================

-- 既存のポリシーを削除（もしあれば）
DROP POLICY IF EXISTS "Parents can read their children's daily status cache" ON public.ai_cache;
DROP POLICY IF EXISTS "Students can read their own daily coach cache" ON public.ai_cache;

-- 保護者が自分の子どものdaily_statusキャッシュを読めるポリシー
CREATE POLICY "Parents can read their children's daily status cache"
ON public.ai_cache
FOR SELECT
TO authenticated
USING (
  cache_type = 'daily_status'
  AND student_id IN (
    SELECT pcr.student_id
    FROM parent_child_relations pcr
    JOIN parents p ON p.id = pcr.parent_id
    WHERE p.user_id = auth.uid()
  )
);

-- 生徒が自分のdaily_coachキャッシュを読めるポリシー
CREATE POLICY "Students can read their own daily coach cache"
ON public.ai_cache
FOR SELECT
TO authenticated
USING (
  cache_type = 'daily_coach'
  AND student_id IN (
    SELECT s.id
    FROM students s
    WHERE s.user_id = auth.uid()
  )
);

-- ============================================================================
-- 3. コメント追加
-- ============================================================================
COMMENT ON COLUMN public.ai_cache.student_id IS '生徒ID（daily_statusとdaily_coachキャッシュ用）';
