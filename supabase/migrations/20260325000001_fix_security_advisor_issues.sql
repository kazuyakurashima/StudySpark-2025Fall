-- ============================================================================
-- 20260325000001_fix_security_advisor_issues.sql
-- Supabase Security Advisor 指摘3件の修正
--
-- 1. public.public_sender_profiles: 不要な SECURITY DEFINER view を削除
--    → アプリは get_sender_profiles() RPC を使用しており、ビューは未使用
-- 2. public._backup_graduated_csr: RLS未設定 → private スキーマへ移動
-- 3. public._backup_graduated_pcr: RLS未設定 → private スキーマへ移動
-- ============================================================================

-- 1) 不要な SECURITY DEFINER view を削除
DROP VIEW IF EXISTS public.public_sender_profiles;

-- 2) バックアップテーブルを private スキーマへ退避
--    復元不要が確認されるまで削除せず、非公開スキーマに移動して保護
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM anon, authenticated;

ALTER TABLE IF EXISTS public._backup_graduated_csr SET SCHEMA private;
ALTER TABLE IF EXISTS public._backup_graduated_pcr SET SCHEMA private;
