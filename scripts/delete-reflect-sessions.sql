-- リフレクトセッション削除（16名の生徒）
--
-- 実行方法: Supabase Dashboard の SQL Editor で実行
--
-- ⚠️ デモユーザー（hana6, akira5, hikaru6）のデータは保持
--
-- 注意: coaching_sessions テーブルには week_start_date/week_end_date で週を識別
--       session_number は存在しないため、日付範囲で削除対象を特定

-- 1. 削除対象の生徒IDを確認
SELECT
  s.id,
  s.login_id,
  s.full_name
FROM students s
WHERE s.login_id NOT IN ('hana6', 'akira5', 'hikaru6')
ORDER BY s.login_id;

-- 2. 削除対象のリフレクトセッションを確認
SELECT
  cs.id,
  cs.student_id,
  cs.week_start_date,
  cs.week_end_date,
  s.login_id,
  s.full_name
FROM coaching_sessions cs
INNER JOIN students s ON s.id = cs.student_id
WHERE s.login_id NOT IN ('hana6', 'akira5', 'hikaru6')
  AND cs.week_start_date < '2025-11-14'  -- 11月14日より前のセッション
ORDER BY s.login_id, cs.week_start_date;

-- 3. コーチングメッセージ削除
DELETE FROM coaching_messages
WHERE session_id IN (
  SELECT cs.id
  FROM coaching_sessions cs
  INNER JOIN students s ON s.id = cs.student_id
  WHERE s.login_id NOT IN ('hana6', 'akira5', 'hikaru6')
    AND cs.week_start_date < '2025-11-14'
);

-- 4. コーチングセッション削除
DELETE FROM coaching_sessions
WHERE id IN (
  SELECT cs.id
  FROM coaching_sessions cs
  INNER JOIN students s ON s.id = cs.student_id
  WHERE s.login_id NOT IN ('hana6', 'akira5', 'hikaru6')
    AND cs.week_start_date < '2025-11-14'
);

-- 5. 削除結果確認
SELECT
  '削除後の確認' as status,
  COUNT(*) as remaining_old_sessions
FROM coaching_sessions cs
INNER JOIN students s ON s.id = cs.student_id
WHERE s.login_id NOT IN ('hana6', 'akira5', 'hikaru6')
  AND cs.week_start_date < '2025-11-14';
