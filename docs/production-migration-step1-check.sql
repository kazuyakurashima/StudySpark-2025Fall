-- ============================================================================
-- 本番DB実行用SQL【ステップ1: 現状確認のみ】
-- ============================================================================
-- 実行環境: Supabase Dashboard SQL Editor (本番環境)
-- 実行タイミング: マイグレーション適用前
-- 目的: 修正前の状態を確認し、ロールバック用SQLを生成
--
-- 📝 実行後の作業:
--   1. この結果をdocs/migration-log.mdにコピペしてください
--   2. 特にrollback_sqlカラムの内容は必ず保存してください
-- ============================================================================

-- 対象件数確認（15件であることを確認）
SELECT count(*) AS "対象件数"
FROM public.study_sessions
WHERE grade = 6;

-- 現状確認 + ロールバック用SQL生成
SELECT
  session_number AS "回",
  start_date AS "開始日",
  end_date AS "終了日",
  CONCAT(TO_CHAR(start_date, 'MM/DD'), '〜', TO_CHAR(end_date, 'MM/DD')) AS "表示",
  CONCAT(
    'UPDATE public.study_sessions SET start_date = ''',
    to_char(start_date, 'YYYY-MM-DD'),
    ''', end_date = ''',
    to_char(end_date, 'YYYY-MM-DD'),
    ''' WHERE grade = 6 AND session_number = ',
    session_number,
    ';'
  ) AS rollback_sql
FROM public.study_sessions
WHERE grade = 6
ORDER BY session_number;

-- ============================================================================
-- ✅ 次のステップ:
-- 1. 上記のrollback_sqlカラムの内容をdocs/migration-log.mdにコピペ
-- 2. production-migration-step2-apply.sqlを実行
-- ============================================================================
