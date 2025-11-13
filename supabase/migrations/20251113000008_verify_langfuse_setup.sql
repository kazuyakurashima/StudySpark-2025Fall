-- Langfuseセットアップの検証
-- Phase 1 Day 6: マイグレーション3

-- 1. ai_cacheテーブルの確認
DO $$
DECLARE
  v_has_entity_id BOOLEAN;
  v_has_trace_id BOOLEAN;
BEGIN
  -- entity_idカラムの存在確認
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_cache' AND column_name = 'entity_id'
  ) INTO v_has_entity_id;

  -- langfuse_trace_idカラムの存在確認
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_cache' AND column_name = 'langfuse_trace_id'
  ) INTO v_has_trace_id;

  IF NOT v_has_entity_id THEN
    RAISE EXCEPTION 'ai_cache.entity_id column not found';
  END IF;

  IF NOT v_has_trace_id THEN
    RAISE EXCEPTION 'ai_cache.langfuse_trace_id column not found';
  END IF;

  RAISE NOTICE '✅ ai_cache has entity_id and langfuse_trace_id columns';
END $$;

-- 2. langfuse_tracesテーブルのCHECK制約確認
DO $$
DECLARE
  v_constraint_def TEXT;
BEGIN
  SELECT pg_get_constraintdef(oid) INTO v_constraint_def
  FROM pg_constraint
  WHERE conname = 'langfuse_traces_entity_type_check';

  IF v_constraint_def NOT LIKE '%daily_coach_message%' THEN
    RAISE EXCEPTION 'langfuse_traces entity_type constraint does not include daily_coach_message';
  END IF;

  IF v_constraint_def NOT LIKE '%daily_status%' THEN
    RAISE EXCEPTION 'langfuse_traces entity_type constraint does not include daily_status';
  END IF;

  RAISE NOTICE '✅ langfuse_traces.entity_type includes daily AI types';
END $$;

-- 3. インデックスの確認
DO $$
DECLARE
  v_has_entity_idx BOOLEAN;
  v_has_trace_idx BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'ai_cache' AND indexname = 'idx_ai_cache_entity_id'
  ) INTO v_has_entity_idx;

  SELECT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'ai_cache' AND indexname = 'idx_ai_cache_langfuse_trace_id'
  ) INTO v_has_trace_idx;

  IF NOT v_has_entity_idx THEN
    RAISE EXCEPTION 'Index idx_ai_cache_entity_id not found';
  END IF;

  IF NOT v_has_trace_idx THEN
    RAISE EXCEPTION 'Index idx_ai_cache_langfuse_trace_id not found';
  END IF;

  RAISE NOTICE '✅ ai_cache indexes created successfully';
END $$;

-- 4. 全体サマリー
DO $$
DECLARE
  v_ai_cache_count INTEGER;
  v_langfuse_traces_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_ai_cache_count FROM ai_cache;
  SELECT COUNT(*) INTO v_langfuse_traces_count FROM langfuse_traces;

  RAISE NOTICE '==========================================';
  RAISE NOTICE 'Langfuse Setup Verification Complete';
  RAISE NOTICE '==========================================';
  RAISE NOTICE 'ai_cache records: %', v_ai_cache_count;
  RAISE NOTICE 'langfuse_traces records: %', v_langfuse_traces_count;
  RAISE NOTICE '==========================================';
END $$;
