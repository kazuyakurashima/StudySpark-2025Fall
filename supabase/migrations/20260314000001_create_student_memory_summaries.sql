-- ============================================================================
-- 20260314000001_create_student_memory_summaries.sql
-- 説明: AI長期メモリ要約テーブルの作成
-- 目的: 8週間の学習データをLLMで要約し、日次コーチ/週次振り返りに
--       生徒の長期的傾向を注入可能にする (Phase 3)
-- ============================================================================

-- ============================================================================
-- student_memory_summaries テーブル
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.student_memory_summaries (
  id BIGSERIAL PRIMARY KEY,
  student_id BIGINT NOT NULL UNIQUE REFERENCES public.students(id) ON DELETE CASCADE,

  -- テキスト要約（LLM生成）
  compact_summary TEXT NOT NULL DEFAULT '',      -- 日次コーチ用 (~200-500トークン)
  detailed_summary TEXT NOT NULL DEFAULT '',     -- Reflect用 (~500-1000トークン)

  -- 構造化データ（LLM生成 JSONB）
  subject_trends JSONB DEFAULT '{}',             -- 科目別傾向 {"算数": "上昇傾向", ...}
  stumbling_patterns JSONB DEFAULT '{}',         -- つまずきパターン
  effective_encouragements JSONB DEFAULT '{}',   -- 効果的だった励まし方
  recent_successes JSONB DEFAULT '{}',           -- 直近の成功体験
  emotional_tendencies JSONB DEFAULT '{}',       -- 感情的傾向

  -- 差分検知カーソル
  last_study_log_id BIGINT DEFAULT 0,            -- 最後に処理した study_logs.id
  last_delta_at TIMESTAMPTZ DEFAULT NOW(),       -- 日次差分の最終処理時刻（UPDATE検出用）

  -- データウィンドウ
  data_window_start DATE,                        -- 集計対象の開始日
  data_window_end DATE,                          -- 集計対象の終了日
  weeks_covered SMALLINT DEFAULT 0,              -- カバーした週数

  -- メタデータ
  last_generated_at TIMESTAMPTZ,                 -- 週次フル生成の最終実行時刻
  generation_version INTEGER NOT NULL DEFAULT 0, -- 週次フル生成のバージョン番号

  -- タイムスタンプ
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_student_memory_summaries_student_id
  ON public.student_memory_summaries(student_id);

CREATE INDEX idx_student_memory_summaries_last_generated
  ON public.student_memory_summaries(last_generated_at DESC);

-- ============================================================================
-- upsert_student_memory: 原子的な INSERT/UPDATE 関数
-- generation_version を原子的にインクリメントするため、
-- 単純な upsert ではなく SQL 関数で実装
-- ============================================================================
CREATE OR REPLACE FUNCTION public.upsert_student_memory(
  p_student_id BIGINT,
  p_compact_summary TEXT,
  p_detailed_summary TEXT,
  p_subject_trends JSONB,
  p_stumbling_patterns JSONB,
  p_effective_encouragements JSONB,
  p_recent_successes JSONB,
  p_emotional_tendencies JSONB,
  p_last_study_log_id BIGINT,
  p_data_window_start DATE,
  p_data_window_end DATE,
  p_weeks_covered SMALLINT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.student_memory_summaries (
    student_id,
    compact_summary,
    detailed_summary,
    subject_trends,
    stumbling_patterns,
    effective_encouragements,
    recent_successes,
    emotional_tendencies,
    last_study_log_id,
    last_delta_at,
    data_window_start,
    data_window_end,
    weeks_covered,
    last_generated_at,
    generation_version
  ) VALUES (
    p_student_id,
    p_compact_summary,
    p_detailed_summary,
    p_subject_trends,
    p_stumbling_patterns,
    p_effective_encouragements,
    p_recent_successes,
    p_emotional_tendencies,
    p_last_study_log_id,
    NOW(),
    p_data_window_start,
    p_data_window_end,
    p_weeks_covered,
    NOW(),
    1  -- 初回は 1
  )
  ON CONFLICT (student_id) DO UPDATE SET
    compact_summary = EXCLUDED.compact_summary,
    detailed_summary = EXCLUDED.detailed_summary,
    subject_trends = EXCLUDED.subject_trends,
    stumbling_patterns = EXCLUDED.stumbling_patterns,
    effective_encouragements = EXCLUDED.effective_encouragements,
    recent_successes = EXCLUDED.recent_successes,
    emotional_tendencies = EXCLUDED.emotional_tendencies,
    last_study_log_id = EXCLUDED.last_study_log_id,
    last_delta_at = NOW(),
    data_window_start = EXCLUDED.data_window_start,
    data_window_end = EXCLUDED.data_window_end,
    weeks_covered = EXCLUDED.weeks_covered,
    last_generated_at = NOW(),
    generation_version = COALESCE(student_memory_summaries.generation_version, 0) + 1;
END;
$$;

-- セキュリティ: service_role のみ実行可能にする
-- SECURITY DEFINER のため、PUBLIC 実行可能だと認証ユーザーが任意 student_id で呼べてしまう
REVOKE EXECUTE ON FUNCTION public.upsert_student_memory FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.upsert_student_memory FROM authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_student_memory TO service_role;

COMMENT ON FUNCTION public.upsert_student_memory IS
'student_memory_summaries の原子的 upsert。INSERT時は generation_version=1、UPDATE時は COALESCE+1 インクリメント。service_role のみ実行可能';

-- ============================================================================
-- RLS 設定
-- ============================================================================
ALTER TABLE public.student_memory_summaries ENABLE ROW LEVEL SECURITY;

-- 生徒: 自分のメモリのみ閲覧
CREATE POLICY "Students can view own memory summary"
  ON public.student_memory_summaries
  FOR SELECT
  TO authenticated
  USING (
    student_id IN (
      SELECT id FROM public.students WHERE user_id = auth.uid()
    )
  );

-- コーチ: 担当生徒のメモリを閲覧（get_assigned_student_ids() で無限再帰回避）
CREATE POLICY "Coaches can view assigned students memory summary"
  ON public.student_memory_summaries
  FOR SELECT
  TO authenticated
  USING (
    student_id IN (SELECT public.get_assigned_student_ids())
  );

-- 保護者: 子どものメモリを閲覧
CREATE POLICY "Parents can view children memory summary"
  ON public.student_memory_summaries
  FOR SELECT
  TO authenticated
  USING (
    student_id IN (SELECT public.get_children_student_ids())
  );

-- 管理者: 全操作
CREATE POLICY "Admins can manage all memory summaries"
  ON public.student_memory_summaries
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- INSERT/UPDATE はサービスクライアント（RLSバイパス）経由のみ
-- 一般ユーザーには INSERT/UPDATE ポリシーを設定しない

-- ============================================================================
-- updated_at トリガー
-- ============================================================================
CREATE TRIGGER update_student_memory_summaries_updated_at
  BEFORE UPDATE ON public.student_memory_summaries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- コメント
-- ============================================================================
COMMENT ON TABLE public.student_memory_summaries IS
'AI長期メモリ要約テーブル。8週間の学習データをLLM要約し、日次コーチ/週次振り返りに注入 (Phase 3)';

COMMENT ON COLUMN public.student_memory_summaries.compact_summary IS
'日次コーチメッセージ用の簡潔な要約 (~200-500トークン)';

COMMENT ON COLUMN public.student_memory_summaries.detailed_summary IS
'週次振り返り(Reflect)用の詳細な要約 (~500-1000トークン)';

COMMENT ON COLUMN public.student_memory_summaries.last_study_log_id IS
'最後に処理した study_logs.id（日次差分の新規ログ検出用）';

COMMENT ON COLUMN public.student_memory_summaries.last_delta_at IS
'日次差分の最終処理時刻（study_logsのUPDATE検出用。logged_at > last_delta_at で更新分を検出）';

COMMENT ON COLUMN public.student_memory_summaries.generation_version IS
'週次フル生成のバージョン番号。upsert_student_memory() で原子的にインクリメント';

-- ============================================================================
-- ロールバック用 (down migration)
-- ============================================================================
-- このマイグレーションをロールバックする場合は以下を実行：
--
-- DROP TRIGGER IF EXISTS update_student_memory_summaries_updated_at ON public.student_memory_summaries;
-- DROP POLICY IF EXISTS "Students can view own memory summary" ON public.student_memory_summaries;
-- DROP POLICY IF EXISTS "Coaches can view assigned students memory summary" ON public.student_memory_summaries;
-- DROP POLICY IF EXISTS "Parents can view children memory summary" ON public.student_memory_summaries;
-- DROP POLICY IF EXISTS "Admins can manage all memory summaries" ON public.student_memory_summaries;
-- DROP FUNCTION IF EXISTS public.upsert_student_memory;
-- DROP TABLE IF EXISTS public.student_memory_summaries;
