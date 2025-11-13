-- ai_cacheテーブルのLangfuse対応
-- Phase 1 Day 6: マイグレーション1

-- 1. cache_typeの制約を拡張（coach_message / daily_status を追加）
ALTER TABLE ai_cache DROP CONSTRAINT IF EXISTS ai_cache_cache_type_check;
ALTER TABLE ai_cache ADD CONSTRAINT ai_cache_cache_type_check
  CHECK (cache_type IN (
    'encouragement',
    'goal_commitment',
    'reflection',
    'weekly_analysis',
    'coach_message',    -- 毎日のAIコーチメッセージ
    'daily_status'      -- 保護者の今日の様子
  ));

COMMENT ON CONSTRAINT ai_cache_cache_type_check ON ai_cache IS
  '許可されるキャッシュタイプ: 応援、目標、振り返り、週次分析、日次コーチ、日次状況';

-- 2. entity_id追加（永続的な参照用UUID）
ALTER TABLE ai_cache
ADD COLUMN entity_id UUID DEFAULT gen_random_uuid() NOT NULL;

COMMENT ON COLUMN ai_cache.entity_id IS '永続的なエンティティID（Langfuseトレース用、キャッシュ削除後も保持）';

-- 3. langfuse_trace_id追加
ALTER TABLE ai_cache
ADD COLUMN langfuse_trace_id UUID REFERENCES langfuse_traces(trace_id) ON DELETE SET NULL;

COMMENT ON COLUMN ai_cache.langfuse_trace_id IS 'Langfuseトレースへの参照（AI生成の品質追跡用）';

-- 4. インデックス作成
CREATE UNIQUE INDEX idx_ai_cache_entity_id ON ai_cache(entity_id);
CREATE INDEX idx_ai_cache_langfuse_trace_id ON ai_cache(langfuse_trace_id);

-- 5. 既存レコードの検証
DO $$
DECLARE
  v_record_count INTEGER;
  v_null_entity_count INTEGER;
BEGIN
  -- 既存レコード数を確認
  SELECT COUNT(*) INTO v_record_count FROM ai_cache;
  RAISE NOTICE 'Existing ai_cache records: %', v_record_count;

  -- entity_idがNULLのレコードを確認
  SELECT COUNT(*) INTO v_null_entity_count FROM ai_cache WHERE entity_id IS NULL;

  IF v_null_entity_count > 0 THEN
    RAISE EXCEPTION 'Found % NULL entity_id in ai_cache', v_null_entity_count;
  END IF;

  RAISE NOTICE 'All ai_cache records have valid entity_id';
END $$;
