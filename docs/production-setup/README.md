# 本番環境セットアップ - 現在の状況

## 📍 現在地

**問題:** 本番環境でログインできない
**原因:** SQLで直接作成したauth.usersのパスワードハッシュが認証できない
**解決策:** Supabase Dashboard UIから正式にユーザーを作り直す

---

## 🎯 次にやること

**[recreate_hana6_properly.md](recreate_hana6_properly.md) を開いて、手順に従ってください。**

この手順で：
1. 既存のhana6を削除
2. Supabase Dashboard UIから正しく再作成
3. profile/studentレコードを作成
4. 親子関係を復元
5. ログインテスト

---

## 📁 ファイル一覧

### 🔴 今すぐ使うファイル
- **recreate_hana6_properly.md** ← これを開いてください！

### 📊 確認用SQLファイル
- check_current_status.sql - 全体の状況確認
- check_hana6_status.sql - hana6の状態確認
- check_profiles_only.sql - profilesテーブル確認
- check_students_only.sql - studentsテーブル確認
- debug_production_auth.sql - 認証デバッグ

### 🔧 作成・修正用SQLファイル
- create_remaining_3_users.sql - hikaru6, akira5, parent1, parent2作成
- create_missing_records.sql - 不足レコード作成
- fix_hikaru6_metadata_final.sql - hikaru6のメタデータ修正
- reset_hana6_password.sql - パスワードリセット（効果なし）

### 📖 手順書・ガイド
- PRODUCTION_USER_SETUP_GUIDE.md - 全体の手順書（古い）
- step1_complete_hana6.sql - STEP 1: hana6完成
- step2_create_remaining_auth_users.md - STEP 2: 残りユーザー作成
- step3_create_all_profiles_students_parents.sql - STEP 3: profiles等作成
- step4_create_parent_child_relations.sql - STEP 4: 親子関係作成
- step5_re_enable_rls.sql - STEP 5: RLS再有効化

### 🔍 デバッグ・トラブルシューティング
- check_env_vars.md - Vercel環境変数確認
- check_vercel_deployment.md - デプロイメント確認
- verify_env_in_browser.md - ブラウザで環境変数確認
- reset_password_via_dashboard.md - Dashboardでパスワードリセット

---

## ✅ 完了したこと

1. ✅ データベーススキーマ適用（3,316行のSQL）
2. ✅ auth.users作成（5ユーザー）
3. ✅ profiles作成（5レコード）
4. ✅ students作成（3レコード）
5. ✅ parents作成（2レコード）
6. ✅ 親子関係作成（3件）
7. ✅ RLS再有効化
8. ✅ Vercel環境変数を正しいSupabaseに変更
9. ✅ Redeploy実行

## ❌ 未解決の問題

- SQLで作成したauth.usersがログイン認証できない
- ローカル環境では動作するが、本番環境では認証失敗

## 🔄 次のステップ

**recreate_hana6_properly.md の手順に従って、hana6をDashboard UIから作り直してください。**

成功したら、残り4ユーザーも同じ方法で作り直します。
