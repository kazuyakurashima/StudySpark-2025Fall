-- coaching_messages の冪等性保証: 同一セッション・ターン・ロールの重複INSERT防止
--
-- 事前チェック: 既存の重複データがあれば古い方を削除してからUNIQUE制約を追加
-- （最新のレコード=idが大きい方を残す）

DELETE FROM public.coaching_messages
WHERE id NOT IN (
  SELECT MAX(id)
  FROM public.coaching_messages
  GROUP BY session_id, turn_number, role
);

ALTER TABLE public.coaching_messages
  ADD CONSTRAINT coaching_messages_session_turn_role_unique
  UNIQUE (session_id, turn_number, role);

COMMENT ON CONSTRAINT coaching_messages_session_turn_role_unique ON public.coaching_messages IS
  'ストリーミングリトライ時の重複保存防止（冪等性保証）';
