# マイグレーション 実行ログ

本番環境へのマイグレーション適用記録。

## #1: 20260216000001_math_master_coach_view.sql

| 項目 | 内容 |
|------|------|
| 日時 | 2026-02-16 JST |
| マイグレーション | `20260216000001_math_master_coach_view.sql` |
| 接続先 | `maklmjcaweneykwagqbv.supabase.co` (StudySpark-2026, production) |
| 適用方法 | Supabase Dashboard SQL Editor（手動実行） |
| 実行者 | Claude Code + ユーザー |

### 適用内容

1. `question_sets.assessment_master_id` カラム追加 (UUID, FK → assessment_masters)
2. 既存算数セット 16件のバックフィル（session_number + attempt_number で紐付け）
3. `chk_math_assessment_master_id` CHECK制約（算数セットは assessment_master_id NOT NULL 必須）
4. `uq_question_sets_assessment_master` UNIQUE INDEX
5. `admin_select_answer_sessions` / `admin_select_student_answers` RLS ポリシー (SELECT)
6. `idx_student_answers_session_correct` インデックス
7. `get_math_master_summary(SMALLINT)` RPC (SECURITY DEFINER)
8. `get_math_master_detail(BIGINT)` RPC (SECURITY DEFINER)

### プリチェック結果

- 算数 question_sets: 16件
- assessment_masters (math_print): 68件 (G5: 32, G6: 36)
- 紐付け候補: 16/16 マッチ、0件不一致
- CHECK制約追加: 安全

### ポストチェック結果

```
backfilled_count: 16 ✓
chk_math_assessment_master_id: 存在 ✓
get_math_master_summary: 存在 ✓
get_math_master_detail: 存在 ✓
admin_select_answer_sessions: 存在 ✓
admin_select_student_answers: 存在 ✓
```

### 備考

- `supabase db push` は先行マイグレーション (20260206000002) が `study_logs` 71件の安全チェックで中断したため使用不可。本マイグレーションのみ SQL Editor で個別適用。
- マイグレーション履歴テーブル (`supabase_migrations.schema_migrations`) には未登録。次回 `db push` 時に再適用されるが、全ステートメントが冪等のため問題なし。
- UPDATE文の PostgreSQL `UPDATE ... FROM` 構文で `JOIN ... ON qs.*` が使用不可のバグを修正（カンマ結合 + WHERE に変更）。
