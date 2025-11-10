-- ============================================================================
-- 生徒が応援メッセージの送信者プロフィールを閲覧できるようにする
-- ============================================================================
-- 作成日: 2025-11-10
-- 説明: 生徒リフレクト画面の応援履歴で保護者アバター表示のため、
--       生徒が応援メッセージ送信者（保護者・指導者）のプロフィールを閲覧可能にする

-- 既存ポリシーと関数を削除（もしあれば）
DROP POLICY IF EXISTS "Students can view encouragement sender profiles" ON public.profiles;
DROP FUNCTION IF EXISTS public.is_encouragement_sender_for_current_user(UUID);

-- ヘルパー関数: 現在のユーザー(生徒)が特定のプロフィールの送信者から応援メッセージを受け取っているか
-- SECURITY DEFINER: RLS ポリシー内で profiles テーブルにアクセスすると無限再帰が発生するため、
--                   この関数を経由して encouragement_messages と students のみを参照する
CREATE OR REPLACE FUNCTION public.is_encouragement_sender_for_current_user(profile_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path TO public, pg_temp
STABLE
AS $$
  -- 現在のユーザーが生徒であり、かつ指定されたプロフィールの所有者が
  -- その生徒宛に応援メッセージを送ったことがあるかチェック
  SELECT EXISTS (
    SELECT 1
    FROM public.encouragement_messages em
    JOIN public.students s ON s.id = em.student_id
    WHERE s.user_id = auth.uid()
      AND em.sender_id = profile_id
  );
$$;

-- 関数へのアクセス権限を明示的に設定
REVOKE ALL ON FUNCTION public.is_encouragement_sender_for_current_user(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_encouragement_sender_for_current_user(UUID) TO authenticated;

-- 生徒: 自分宛の応援メッセージ送信者のプロフィールを閲覧
CREATE POLICY "Students can view encouragement sender profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    public.is_encouragement_sender_for_current_user(id)
  );

-- ============================================================================
-- テスト手順
-- ============================================================================
--
-- 1. 生徒ユーザーでログイン後、以下のクエリを実行：
--    SELECT id, display_name, nickname, avatar_id, role FROM profiles;
--
--    期待結果: 自分宛に応援メッセージを送った保護者・指導者のプロフィールのみ返る
--              （自分自身のプロフィールは別のポリシーで閲覧可能）
--
-- 2. 保護者ユーザーでログイン後、同じクエリを実行：
--    期待結果: 自分の子供のプロフィールのみ返る（応援送信者のプロフィールは返らない）
--
-- 3. 指導者ユーザーでログイン後、同じクエリを実行：
--    期待結果: 担当生徒のプロフィールのみ返る（応援送信者のプロフィールは返らない）
--
-- 4. 関数の動作確認（生徒ユーザーで実行）：
--    SELECT public.is_encouragement_sender_for_current_user('保護者のUUID');
--
--    期待結果: その保護者が自分に応援メッセージを送っている場合は true、
--              送っていない場合は false
--
-- ============================================================================
-- ロールバック用 (down migration)
-- ============================================================================
--
-- このマイグレーションをロールバックする場合は以下を実行：
--
-- DROP POLICY IF EXISTS "Students can view encouragement sender profiles" ON public.profiles;
-- DROP FUNCTION IF EXISTS public.is_encouragement_sender_for_current_user(UUID);
