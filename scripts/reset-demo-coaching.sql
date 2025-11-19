-- ========================================
-- デモアカウントのコーチング履歴リセット
-- ========================================
-- 対象: akira5, hikaru6, hana6
-- 削除対象: coaching_sessions のみ
-- 保持: 学習ログ、応援メッセージ、アカウント情報
-- ========================================

-- 1. 削除前の確認（実行推奨）
SELECT
  '削除前の確認' as status,
  s.login_id,
  cs.session_type,
  cs.week_start_date,
  cs.completed_at,
  LENGTH(cs.summary_text) as summary_length
FROM coaching_sessions cs
INNER JOIN students s ON s.id = cs.student_id
WHERE s.login_id IN ('akira5', 'hikaru6', 'hana6')
ORDER BY s.login_id, cs.week_start_date DESC;

-- 2. 削除実行（慎重に！）
DELETE FROM coaching_sessions
WHERE student_id IN (
  SELECT id FROM students WHERE login_id IN ('akira5', 'hikaru6', 'hana6')
);

-- 3. 削除結果確認
SELECT
  '削除後の確認' as status,
  s.login_id,
  COUNT(cs.id) as remaining_sessions
FROM students s
LEFT JOIN coaching_sessions cs ON cs.student_id = s.id
WHERE s.login_id IN ('akira5', 'hikaru6', 'hana6')
GROUP BY s.login_id
ORDER BY s.login_id;

-- 4. 他のデータが保持されているか確認
SELECT
  '学習ログの確認' as status,
  s.login_id,
  COUNT(sl.id) as study_log_count
FROM students s
LEFT JOIN study_logs sl ON sl.student_id = s.id
WHERE s.login_id IN ('akira5', 'hikaru6', 'hana6')
GROUP BY s.login_id
ORDER BY s.login_id;

SELECT
  '応援メッセージの確認' as status,
  s.login_id,
  COUNT(em.id) as message_count
FROM students s
LEFT JOIN encouragement_messages em ON em.student_id = s.id
WHERE s.login_id IN ('akira5', 'hikaru6', 'hana6')
GROUP BY s.login_id
ORDER BY s.login_id;
