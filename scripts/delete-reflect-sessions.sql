-- リフレクトセッション削除（16名の生徒、第1回〜第6回）
--
-- 実行方法: Supabase Dashboard の SQL Editor で実行
--
-- ⚠️ デモユーザー（hana6, akira5, hikaru6）のデータは保持

-- 1. 削除対象の生徒IDを確認
SELECT
  s.id,
  s.login_id,
  s.full_name
FROM students s
WHERE s.login_id NOT IN ('hana6', 'akira5', 'hikaru6')
ORDER BY s.login_id;

-- 2. 削除対象のリフレクトセッションを確認（第1回〜第6回）
SELECT
  cs.id,
  cs.student_id,
  cs.session_id,
  ss.session_number,
  s.login_id,
  s.full_name
FROM coaching_sessions cs
INNER JOIN study_sessions ss ON ss.id = cs.session_id
INNER JOIN students s ON s.id = cs.student_id
WHERE cs.session_type = 'reflect'
  AND ss.session_number BETWEEN 1 AND 6
  AND s.login_id NOT IN ('hana6', 'akira5', 'hikaru6')
ORDER BY s.login_id, ss.session_number;

-- 3. コーチングメッセージ削除
DELETE FROM coaching_messages
WHERE session_id IN (
  SELECT cs.id
  FROM coaching_sessions cs
  INNER JOIN study_sessions ss ON ss.id = cs.session_id
  INNER JOIN students s ON s.id = cs.student_id
  WHERE cs.session_type = 'reflect'
    AND ss.session_number BETWEEN 1 AND 6
    AND s.login_id NOT IN ('hana6', 'akira5', 'hikaru6')
);

-- 4. コーチングセッション削除
DELETE FROM coaching_sessions
WHERE id IN (
  SELECT cs.id
  FROM coaching_sessions cs
  INNER JOIN study_sessions ss ON ss.id = cs.session_id
  INNER JOIN students s ON s.id = cs.student_id
  WHERE cs.session_type = 'reflect'
    AND ss.session_number BETWEEN 1 AND 6
    AND s.login_id NOT IN ('hana6', 'akira5', 'hikaru6')
);

-- 5. 削除結果確認
SELECT
  '削除後の確認' as status,
  COUNT(*) as remaining_sessions
FROM coaching_sessions cs
INNER JOIN study_sessions ss ON ss.id = cs.session_id
INNER JOIN students s ON s.id = cs.student_id
WHERE cs.session_type = 'reflect'
  AND ss.session_number BETWEEN 1 AND 6
  AND s.login_id NOT IN ('hana6', 'akira5', 'hikaru6');
