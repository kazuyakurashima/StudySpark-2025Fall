-- ============================================================================
-- 20251126000002_update_sender_profiles_rpc_add_custom_avatar.sql
-- 説明: get_sender_profiles RPC関数にcustom_avatar_urlを追加
-- ============================================================================

-- 既存の関数を削除（戻り値の型を変更するため）
DROP FUNCTION IF EXISTS public.get_sender_profiles(UUID[]);
DROP FUNCTION IF EXISTS public.get_sender_profile(UUID);

-- ============================================================================
-- RPC: 応援メッセージの送信者プロフィールを取得（custom_avatar_url対応版）
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_sender_profiles(sender_ids UUID[])
RETURNS TABLE (
  id UUID,
  display_name TEXT,
  avatar_url TEXT,
  avatar_id TEXT,
  nickname TEXT,
  custom_avatar_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.display_name::TEXT,
    p.avatar_url,
    p.avatar_id,
    p.nickname,
    p.custom_avatar_url
  FROM public.profiles p
  WHERE p.id = ANY(sender_ids);
END;
$$;

-- 関数の実行権限を認証済みユーザーに付与（既存の場合は再付与）
GRANT EXECUTE ON FUNCTION public.get_sender_profiles(UUID[]) TO authenticated;

-- ============================================================================
-- RPC: 単一の送信者プロフィールを取得（custom_avatar_url対応版）
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_sender_profile(sender_id UUID)
RETURNS TABLE (
  id UUID,
  display_name TEXT,
  avatar_url TEXT,
  avatar_id TEXT,
  nickname TEXT,
  custom_avatar_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.display_name::TEXT,
    p.avatar_url,
    p.avatar_id,
    p.nickname,
    p.custom_avatar_url
  FROM public.profiles p
  WHERE p.id = sender_id;
END;
$$;

-- 関数の実行権限を認証済みユーザーに付与（既存の場合は再付与）
GRANT EXECUTE ON FUNCTION public.get_sender_profile(UUID) TO authenticated;

-- ============================================================================
-- コメント更新
-- ============================================================================
COMMENT ON FUNCTION public.get_sender_profiles(UUID[]) IS
'応援メッセージ送信者の公開プロフィール情報（display_name, avatar_url, avatar_id, nickname, custom_avatar_url）を安全に取得する。SECURITY DEFINER により RLS をバイパス。';

COMMENT ON FUNCTION public.get_sender_profile(UUID) IS
'単一の応援メッセージ送信者の公開プロフィール情報を取得する。SECURITY DEFINER により RLS をバイパス。';
