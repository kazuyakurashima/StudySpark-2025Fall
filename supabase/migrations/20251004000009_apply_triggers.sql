-- ============================================================================
-- 09: トリガー適用
-- ============================================================================
-- 作成日: 2025-10-04
-- 説明: 全テーブル作成後にトリガーを適用

-- ----------------------------------------------------------------------------
-- 応援メッセージ受信時の通知トリガー
-- ----------------------------------------------------------------------------
-- encouragement_messages テーブルへのトリガー適用
CREATE TRIGGER trigger_notify_new_encouragement
  AFTER INSERT ON public.encouragement_messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_encouragement();

COMMENT ON TRIGGER trigger_notify_new_encouragement ON public.encouragement_messages
  IS '応援メッセージ受信時に自動的に通知を作成';

-- ----------------------------------------------------------------------------
-- 完了メッセージ
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  RAISE NOTICE 'トリガー適用完了';
  RAISE NOTICE '- trigger_notify_new_encouragement (encouragement_messages)';
END $$;
