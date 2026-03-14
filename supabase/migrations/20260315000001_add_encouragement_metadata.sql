-- 応援メッセージ パーソナライズ生成に必要なメタデータカラムを追加
-- 参照: docs/ENCOURAGEMENT_PERSONALIZATION_PLAN.md

-- AI下書き原文（送信メッセージとの差分で編集判定に使用）
-- ai_draft_message IS NOT NULL AND message != ai_draft_message → 編集済み
ALTER TABLE public.encouragement_messages
  ADD COLUMN IF NOT EXISTS ai_draft_message TEXT;

-- 生成時にユーザーが入力した一言コンテキスト（分析用）
ALTER TABLE public.encouragement_messages
  ADD COLUMN IF NOT EXISTS user_context TEXT;

-- コメント追加
COMMENT ON COLUMN public.encouragement_messages.ai_draft_message IS 'AI生成時の下書き原文。message と比較して編集有無を判定';
COMMENT ON COLUMN public.encouragement_messages.user_context IS '応援メッセージ生成時にユーザーが入力した一言コンテキスト';

-- ai_cache の cache_type 制約を拡張（encouragement_v2 を追加）
ALTER TABLE public.ai_cache DROP CONSTRAINT IF EXISTS ai_cache_cache_type_check;
ALTER TABLE public.ai_cache ADD CONSTRAINT ai_cache_cache_type_check
  CHECK (cache_type IN (
    'encouragement',
    'encouragement_v2',
    'goal_commitment',
    'reflection',
    'weekly_analysis',
    'coach_message',
    'daily_status'
  ));

COMMENT ON CONSTRAINT ai_cache_cache_type_check ON ai_cache IS
  '許可されるキャッシュタイプ: 応援(v1/v2)、目標、振り返り、週次分析、日次コーチ、日次状況';
