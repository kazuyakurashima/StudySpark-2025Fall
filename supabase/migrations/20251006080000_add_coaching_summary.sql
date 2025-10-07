-- ============================================================================
-- P3-2: リフレクト用にcoaching_sessionsテーブルを拡張
-- ============================================================================
-- 作成日: 2025-10-06 08:00
-- 説明: 週次振り返りのサマリー保存カラムを追加

-- coaching_sessionsにサマリーカラムを追加
ALTER TABLE public.coaching_sessions
  ADD COLUMN IF NOT EXISTS summary_text TEXT;

COMMENT ON COLUMN public.coaching_sessions.summary_text IS 'AI生成された週次振り返りサマリー';
