-- langfuse_tracesテーブルのentity_type拡張
-- Phase 1 Day 6: マイグレーション2

-- entity_typeの制約を拡張（日次AI機能を追加）
ALTER TABLE langfuse_traces DROP CONSTRAINT IF EXISTS langfuse_traces_entity_type_check;
ALTER TABLE langfuse_traces ADD CONSTRAINT langfuse_traces_entity_type_check
  CHECK (entity_type IN (
    'coaching_message',        -- 週次振り返りコーチングメッセージ
    'encouragement_message',   -- 応援メッセージ
    'weekly_analysis',         -- 週次分析（指導者向け）
    'daily_coach_message',     -- 毎日のAIコーチメッセージ
    'daily_status'             -- 保護者の今日の様子
  ));

COMMENT ON CONSTRAINT langfuse_traces_entity_type_check ON langfuse_traces IS
  '許可されるエンティティタイプ: 週次振り返り、応援、週次分析、日次コーチ、日次状況';
