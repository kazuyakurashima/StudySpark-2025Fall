-- 既存テーブルへの非正規化カラム追加
-- Phase 1 Day 5: マイグレーション2

-- coaching_messages に langfuse_trace_id カラム追加（週次振り返り）
ALTER TABLE coaching_messages
ADD COLUMN langfuse_trace_id UUID REFERENCES langfuse_traces(trace_id) ON DELETE SET NULL;

CREATE INDEX idx_coaching_messages_langfuse_trace_id ON coaching_messages(langfuse_trace_id);

COMMENT ON COLUMN coaching_messages.langfuse_trace_id IS 'Langfuseトレースへの参照（非正規化）';

-- encouragement_messages に langfuse_trace_id カラム追加（応援メッセージ）
ALTER TABLE encouragement_messages
ADD COLUMN langfuse_trace_id UUID REFERENCES langfuse_traces(trace_id) ON DELETE SET NULL;

CREATE INDEX idx_encouragement_messages_langfuse_trace_id ON encouragement_messages(langfuse_trace_id);

COMMENT ON COLUMN encouragement_messages.langfuse_trace_id IS 'Langfuseトレースへの参照（非正規化）';

-- weekly_analysis に langfuse_trace_id カラム追加（週次分析）
ALTER TABLE weekly_analysis
ADD COLUMN langfuse_trace_id UUID REFERENCES langfuse_traces(trace_id) ON DELETE SET NULL;

CREATE INDEX idx_weekly_analysis_langfuse_trace_id ON weekly_analysis(langfuse_trace_id);

COMMENT ON COLUMN weekly_analysis.langfuse_trace_id IS 'Langfuseトレースへの参照（非正規化）';
