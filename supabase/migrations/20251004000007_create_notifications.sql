-- ============================================================================
-- 07: 通知テーブル
-- ============================================================================
-- 作成日: 2025-10-04
-- 説明: アプリ内通知のテーブル

-- ----------------------------------------------------------------------------
-- notifications: 通知
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 通知タイプ
  notification_type VARCHAR(50) NOT NULL CHECK (
    notification_type IN (
      'new_encouragement',
      'goal_reminder',
      'reflection_available',
      'test_reminder',
      'achievement_unlocked'
    )
  ),

  -- 通知内容
  title VARCHAR(200) NOT NULL,
  body TEXT,

  -- 関連データ参照 (オプション)
  related_entity_type VARCHAR(50),
  related_entity_id BIGINT,

  -- 既読状態
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,

  -- メタデータ
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_notifications_user ON public.notifications(user_id);
CREATE INDEX idx_notifications_sent_at ON public.notifications(sent_at DESC);
CREATE INDEX idx_notifications_is_read ON public.notifications(user_id, is_read);

-- RLS有効化
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLSポリシー: ユーザーは自分の通知のみ閲覧・更新
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- RLSポリシー: システム (Service Role) が通知作成
-- Note: Service Role Keyでの実行時はRLSバイパス可能

-- RLSポリシー: 管理者は全て閲覧・操作可能
CREATE POLICY "Admins can manage all notifications"
  ON public.notifications FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

COMMENT ON TABLE public.notifications IS 'アプリ内通知';
COMMENT ON COLUMN public.notifications.related_entity_type IS '関連エンティティタイプ (例: encouragement_message, test_goal)';
COMMENT ON COLUMN public.notifications.related_entity_id IS '関連エンティティID';
COMMENT ON COLUMN public.notifications.expires_at IS '通知の有効期限 (過ぎたら非表示)';

-- ----------------------------------------------------------------------------
-- Helper function: 通知作成
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_notification_type VARCHAR,
  p_title VARCHAR,
  p_body TEXT DEFAULT NULL,
  p_related_entity_type VARCHAR DEFAULT NULL,
  p_related_entity_id BIGINT DEFAULT NULL,
  p_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS BIGINT AS $$
DECLARE
  v_notification_id BIGINT;
BEGIN
  INSERT INTO public.notifications (
    user_id,
    notification_type,
    title,
    body,
    related_entity_type,
    related_entity_id,
    expires_at
  ) VALUES (
    p_user_id,
    p_notification_type,
    p_title,
    p_body,
    p_related_entity_type,
    p_related_entity_id,
    p_expires_at
  )
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_notification IS '通知作成ヘルパー関数 (Server Actionから呼び出し)';

-- ----------------------------------------------------------------------------
-- Trigger: 応援メッセージ受信時に通知作成
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION notify_new_encouragement()
RETURNS TRIGGER AS $$
DECLARE
  v_student_user_id UUID;
BEGIN
  -- 生徒のuser_idを取得
  SELECT user_id INTO v_student_user_id
  FROM public.students
  WHERE id = NEW.student_id;

  -- 通知作成
  PERFORM create_notification(
    v_student_user_id,
    'new_encouragement',
    '新しい応援メッセージが届きました',
    NULL,
    'encouragement_message',
    NEW.id,
    NOW() + INTERVAL '30 days'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notify_new_encouragement
  AFTER INSERT ON public.encouragement_messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_encouragement();

COMMENT ON FUNCTION notify_new_encouragement IS '応援メッセージ受信時に通知を自動作成するトリガー関数';
