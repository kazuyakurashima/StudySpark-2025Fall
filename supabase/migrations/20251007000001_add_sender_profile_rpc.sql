-- ============================================================================
-- 20251007000001_add_sender_profile_rpc.sql
-- 説明: 応援メッセージ送信者プロフィール取得用のRPC追加
-- ============================================================================

-- ============================================================================
-- 送信者プロフィール公開ビュー (display_name, avatar_url のみ)
-- ============================================================================
CREATE OR REPLACE VIEW public.public_sender_profiles AS
SELECT
  id,
  display_name,
  avatar_url
FROM public.profiles;

-- ============================================================================
-- RPC: 応援メッセージの送信者プロフィールを取得
-- ============================================================================
-- この関数は SECURITY DEFINER で実行され、RLSをバイパスして
-- 送信者の display_name と avatar_url のみを安全に返します
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_sender_profiles(sender_ids UUID[])
RETURNS TABLE (
  id UUID,
  display_name VARCHAR(100),
  avatar_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.display_name,
    p.avatar_url
  FROM public.profiles p
  WHERE p.id = ANY(sender_ids);
END;
$$;

-- 関数の実行権限を認証済みユーザーに付与
GRANT EXECUTE ON FUNCTION public.get_sender_profiles(UUID[]) TO authenticated;

-- ============================================================================
-- RPC: 単一の送信者プロフィールを取得 (簡易版)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_sender_profile(sender_id UUID)
RETURNS TABLE (
  id UUID,
  display_name VARCHAR(100),
  avatar_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.display_name,
    p.avatar_url
  FROM public.profiles p
  WHERE p.id = sender_id;
END;
$$;

-- 関数の実行権限を認証済みユーザーに付与
GRANT EXECUTE ON FUNCTION public.get_sender_profile(UUID) TO authenticated;

-- ============================================================================
-- コメント追加
-- ============================================================================
COMMENT ON FUNCTION public.get_sender_profiles(UUID[]) IS
'応援メッセージ送信者の公開プロフィール情報（display_name, avatar_url）を安全に取得する。SECURITY DEFINER により RLS をバイパス。';

COMMENT ON FUNCTION public.get_sender_profile(UUID) IS
'単一の応援メッセージ送信者の公開プロフィール情報を取得する。SECURITY DEFINER により RLS をバイパス。';
