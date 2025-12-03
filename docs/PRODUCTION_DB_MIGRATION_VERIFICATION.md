# 本番DBマイグレーション確認・COMMENT適用手順

## 方針
- `scripts/apply-production-migrations.ts` は一時的な確認用だったためリポジトリから削除し、`.gitignore` に追加してローカル専用とする。運用上は Supabase Dashboard の SQL Editor で手動適用する。
- 本番DB操作はサービスロール権限のセッションに限定し、実行したSQLはSQL Editorの履歴か `PRODUCTION_DEPLOYMENT_LOG.md` にメモしておく。
- 対象マイグレーション:
  - `supabase/migrations/20251201000001_add_coach_feedbacks.sql`（`coach_feedbacks` テーブル作成）
  - `supabase/migrations/20251201000002_add_batch_id.sql`（`batch_id` カラム追加）

## 事前準備
- Supabase Dashboard > SQL Editor（プロジェクト: zlipaeanhcslhintxpej）。
- サービスロールキーを使った接続で実行する。

## 確認クエリ
SQL Editor で実行し、結果を確認する。

```sql
-- coach_feedbacks テーブルの有無
SELECT to_regclass('public.coach_feedbacks') AS coach_feedbacks_table;

-- batch_id カラムの有無（study_logs / coach_feedbacks）
SELECT table_name, column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('study_logs', 'coach_feedbacks')
  AND column_name = 'batch_id';
```

必要に応じて RLS/ポリシーも確認する場合:

```sql
SELECT polname, permissive, roles, cmd
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'coach_feedbacks';
```

## 未適用だった場合のSQL
### 1) coach_feedbacks テーブル作成（存在しない場合のみ）
```sql
-- coach_feedbacks テーブル作成
CREATE TABLE IF NOT EXISTS public.coach_feedbacks (
  id BIGSERIAL PRIMARY KEY,
  study_log_id BIGINT NOT NULL REFERENCES public.study_logs(id) ON DELETE CASCADE,
  student_id BIGINT NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  session_id BIGINT NOT NULL REFERENCES public.study_sessions(id) ON DELETE CASCADE,
  feedback_text TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  prompt_hash TEXT,
  langfuse_trace_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_feedback_per_log UNIQUE (study_log_id)
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_coach_feedbacks_student_id ON public.coach_feedbacks(student_id);
CREATE INDEX IF NOT EXISTS idx_coach_feedbacks_session_id ON public.coach_feedbacks(session_id);
CREATE INDEX IF NOT EXISTS idx_coach_feedbacks_study_log_id ON public.coach_feedbacks(study_log_id);

-- RLS有効化
ALTER TABLE public.coach_feedbacks ENABLE ROW LEVEL SECURITY;

-- RLSポリシー: 生徒
DROP POLICY IF EXISTS "Students can SELECT own feedbacks" ON public.coach_feedbacks;
CREATE POLICY "Students can SELECT own feedbacks" ON public.coach_feedbacks
  FOR SELECT TO authenticated
  USING (student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid()));

-- RLSポリシー: 保護者
DROP POLICY IF EXISTS "Parents can SELECT children feedbacks" ON public.coach_feedbacks;
CREATE POLICY "Parents can SELECT children feedbacks" ON public.coach_feedbacks
  FOR SELECT TO authenticated
  USING (student_id IN (
    SELECT student_id FROM public.parent_child_relations
    WHERE parent_id IN (SELECT id FROM public.parents WHERE user_id = auth.uid())
  ));

-- RLSポリシー: 指導者
DROP POLICY IF EXISTS "Coaches can SELECT assigned student feedbacks" ON public.coach_feedbacks;
CREATE POLICY "Coaches can SELECT assigned student feedbacks" ON public.coach_feedbacks
  FOR SELECT TO authenticated
  USING (student_id IN (
    SELECT student_id FROM public.coach_student_relations
    WHERE coach_id IN (SELECT id FROM public.coaches WHERE user_id = auth.uid())
  ));

-- RLSポリシー: 管理者
DROP POLICY IF EXISTS "Admins can SELECT all feedbacks" ON public.coach_feedbacks;
CREATE POLICY "Admins can SELECT all feedbacks" ON public.coach_feedbacks
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
```

### 2) batch_id 追加（存在しない場合のみ）
```sql
-- study_logs に batch_id 追加
ALTER TABLE public.study_logs ADD COLUMN IF NOT EXISTS batch_id UUID;
CREATE INDEX IF NOT EXISTS idx_study_logs_batch_id ON public.study_logs(batch_id);

-- coach_feedbacks に batch_id 追加
ALTER TABLE public.coach_feedbacks ADD COLUMN IF NOT EXISTS batch_id UUID;
CREATE INDEX IF NOT EXISTS idx_coach_feedbacks_batch_id ON public.coach_feedbacks(batch_id);

-- 既存制約を削除（存在する場合）
ALTER TABLE public.coach_feedbacks DROP CONSTRAINT IF EXISTS unique_feedback_per_log;

-- 新規制約: batch_id 単位で1フィードバック
DROP INDEX IF EXISTS unique_feedback_per_batch;
CREATE UNIQUE INDEX IF NOT EXISTS unique_feedback_per_batch
  ON public.coach_feedbacks(batch_id) WHERE batch_id IS NOT NULL;

-- レガシー制約: batch_id=NULL の場合は study_log_id 単位
DROP INDEX IF EXISTS unique_feedback_per_log_legacy;
CREATE UNIQUE INDEX IF NOT EXISTS unique_feedback_per_log_legacy
  ON public.coach_feedbacks(study_log_id) WHERE batch_id IS NULL;
```

### 3) COMMENT（任意・ドキュメント用）
```sql
COMMENT ON TABLE public.coach_feedbacks IS 'スパーク機能のコーチフィードバック。INSERT/UPDATE/DELETEはServer Action経由でサービスロールが実行';
COMMENT ON COLUMN public.coach_feedbacks.study_log_id IS '関連する学習ログID';
COMMENT ON COLUMN public.coach_feedbacks.student_id IS '生徒ID（高速検索用に非正規化）';
COMMENT ON COLUMN public.coach_feedbacks.session_id IS 'セッションID（高速検索用に非正規化）';
COMMENT ON COLUMN public.coach_feedbacks.feedback_text IS 'AIコーチが生成したフィードバック本文';
COMMENT ON COLUMN public.coach_feedbacks.prompt_version IS 'プロンプトバージョン（効果測定用）';
COMMENT ON COLUMN public.coach_feedbacks.prompt_hash IS 'プロンプトハッシュ（監査用）';
COMMENT ON COLUMN public.coach_feedbacks.langfuse_trace_id IS 'Langfuseトレース連携用ID';
```

## 実行後の確認
1. 上記「確認クエリ」を再実行し、テーブル・カラム・インデックス/制約が期待どおり存在することを確認する。
2. COMMENT を入れた場合、Supabase Dashboard のテーブル定義画面で説明が表示されることを確認する。
