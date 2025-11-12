-- ============================================================================
-- 既存ユーザーのsetup_completedフラグを更新
-- ============================================================================
-- 作成日: 2025-11-12
-- 目的: 既存の登録済みユーザー（デモアカウント、テストユーザー）のsetup_completedをtrueに設定
--       ログイン後、セットアップ画面をスキップしてホーム画面に直接遷移させる

-- ============================================================================
-- 1. プロフィール作成済みユーザーのsetup_completedをtrueに更新
-- ============================================================================

-- 全ユーザーのsetup_completedをtrueに更新
-- （profiles.avatar_id が NULL でない = アバター設定済み = セットアップ完了と判断）
UPDATE profiles
SET setup_completed = true
WHERE avatar_id IS NOT NULL
  AND setup_completed = false;

-- コメント追加
COMMENT ON COLUMN profiles.setup_completed IS '初期セットアップ完了フラグ。trueの場合、ログイン後ダッシュボードに直行';

-- ============================================================================
-- 2. 確認用クエリ（マイグレーション適用後に実行して確認）
-- ============================================================================

-- マイグレーション適用後、以下のクエリで確認できます：
--
-- SELECT
--   p.id,
--   p.role,
--   p.setup_completed,
--   p.avatar_id,
--   CASE
--     WHEN s.login_id IS NOT NULL THEN s.login_id
--     WHEN pa.full_name IS NOT NULL THEN pa.full_name
--     ELSE 'unknown'
--   END as identifier
-- FROM profiles p
-- LEFT JOIN students s ON s.user_id = p.id
-- LEFT JOIN parents pa ON pa.user_id = p.id
-- ORDER BY p.created_at DESC;
