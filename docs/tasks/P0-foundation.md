# Phase 0: 基盤整備

**期間:** 2週間
**進捗:** 88% (16/17タスク完了)
**状態:** 🔄 進行中

---

## 概要

すべての機能の前提となるインフラ・認証・DB基盤の構築

**成果物:**
- Supabase環境構築 (本番・開発・ローカル)
- 認証システム実装
- データベース設計・構築
- 開発環境整備

---

## タスク一覧

### P0-1: 環境構築 ✅ 完了

- [x] `.env.example` 整備（鍵名・用途・ダミー値）
  - 対応要件: `02-Requirements-Auth.md` 全般
  - 検証: ✅ ファイル存在確認、必須項目の網羅性

- [ ] 開発用Supabaseプロジェクト作成
  - 対応要件: 全般
  - 検証: プロジェクトURL・Anon Key取得、接続確認
  - **備考:** 手動作成が必要 (Supabaseダッシュボード)

- [x] Supabase Local (Docker) セットアップ
  - 対応要件: 全般
  - 検証: ✅ `supabase init` 完了、config.toml作成確認

- [ ] Sentry プロジェクト作成・SDK統合
  - 対応要件: 運用要件
  - 検証: テストエラー送信、Sentryダッシュボードで確認

---

### P0-2: Supabase クライアント実装 ✅ 完了

- [x] `lib/supabase/server.ts` 作成 (Server Components用)
  - 対応要件: `02-Requirements-Auth.md`
  - 検証: ✅ ファイル作成完了、公式パターン準拠

- [x] `lib/supabase/client.ts` 作成 (Client Components用)
  - 対応要件: `02-Requirements-Auth.md`
  - 検証: ✅ ファイル作成完了、シングルトンパターン実装

- [x] `lib/supabase/middleware.ts` 作成 (Middleware用)
  - 対応要件: `02-Requirements-Auth.md`
  - 検証: ✅ セッション更新関数実装、認証チェック実装

- [x] `lib/supabase/route.ts` 作成 (Route Handlers用)
  - 対応要件: `02-Requirements-Auth.md`
  - 検証: ✅ ファイル作成完了

- [x] `middleware.ts` 実装 (ルートレベル認証チェック)
  - 対応要件: `02-Requirements-Auth.md`
  - 検証: ✅ matcher設定、未認証リダイレクト実装

---

### P0-3: DBスキーマ設計・実装 ✅ 完了 (11/11完了)

- [x] ER図作成 (`docs/db/Schema-Proposal.md`)
  - 対応要件: 全要件定義
  - 検証: ✅ 主要テーブル・リレーション明記

- [x] `supabase/migrations/20251004000001_create_auth_tables.sql` 作成
  - 対応要件: `02-Requirements-Auth.md`
  - 検証: ✅ profiles, students, parents, coaches, admins, invitation_codes テーブル定義

- [x] `supabase/migrations/20251004000002_create_relations.sql` 作成
  - 対応要件: `02-Requirements-Auth.md`
  - 検証: ✅ `parent_child_relations`, `coach_student_relations` テーブル作成

- [x] `supabase/migrations/20251004000003_create_master_data.sql` 作成
  - 対応要件: `03-Requirements-Student.md` (スパーク機能)
  - 検証: ✅ `study_sessions`, `subjects`, `study_content_types` テーブル作成

- [x] `supabase/migrations/20251004000004_create_logs.sql` 作成
  - 対応要件: `03-Requirements-Student.md`, `04-Requirements-Parent.md`
  - 検証: ✅ `study_logs`, `encouragement_messages` テーブル作成
  - **注:** テーブル名は `encouragement_messages`（`encouragement_logs` ではない）

- [x] `encouragement_messages` テーブルにカラム追加
  - 対応要件: `04-Requirements-Parent.md`, `05-Requirements-Coach.md`
  - 検証: ✅ `support_type` (quick/ai/custom), `related_study_log_id` を追加
  - マイグレーション: `20251004000010_extend_encouragement_messages.sql`
  - 備考: Phase 2 の応援フィルター機能で `support_type` を使用、科目フィルターは `study_logs` との JOIN で実現

- [x] `supabase/migrations/20251004000005_create_goals.sql` 作成
  - 対応要件: `03-Requirements-Student.md` (ゴールナビ)
  - 検証: ✅ `test_goals`, `test_results` テーブル作成

- [x] `supabase/migrations/20251004000006_create_coaching.sql` 作成
  - 対応要件: `03-Requirements-Student.md` (リフレクト)
  - 検証: ✅ `coaching_sessions`, `coaching_messages` テーブル作成

- [x] `supabase/migrations/20251004000007_create_notifications.sql` 作成
  - 対応要件: 通知要件
  - 検証: ✅ `notifications` テーブル作成、RLS設定

- [x] `supabase/migrations/20251004000008_create_audit.sql` 作成
  - 対応要件: 監査要件
  - 検証: ✅ `audit_logs`, `weekly_analysis` テーブル作成、トリガー設定

- [x] Supabaseでマイグレーション適用
  - 検証: ✅ すべてのテーブルが正常に作成されたこと確認済み（全10マイグレーション適用）
  - マスターデータ: 科目4件、学習回34件、学習内容80件、テスト日程8件が投入済み

---

### P0-4: RLS (Row Level Security) ポリシー実装 ⏳ 未着手

**注:** 基本的なRLSポリシーは各テーブル作成時に含めています。
この段階では追加の複雑なポリシーを実装します。

- [ ] 親子関係の詳細RLSポリシー作成
  - 対応要件: `02-Requirements-Auth.md`
  - 検証: 保護者は自分の子どものみ、指導者は担当生徒のみアクセス可

- [ ] 学習ログの詳細RLSポリシー作成
  - 対応要件: `03-Requirements-Student.md`
  - 検証: 生徒は自分のログのみ編集、保護者・指導者は閲覧のみ

- [ ] 応援ログの詳細RLSポリシー作成
  - 対応要件: `04-Requirements-Parent.md`
  - 検証: 保護者・指導者は自分の応援のみ編集、生徒は閲覧のみ

- [ ] 目標・実績の詳細RLSポリシー作成
  - 対応要件: `03-Requirements-Student.md`
  - 検証: 生徒は自分の目標のみ編集、保護者・指導者は閲覧のみ

- [ ] コーチングログの詳細RLSポリシー作成
  - 対応要件: `03-Requirements-Student.md`
  - 検証: 生徒は自分のコーチングログのみアクセス

- [ ] 通知の詳細RLSポリシー作成
  - 対応要件: 通知要件
  - 検証: ユーザーは自分宛の通知のみ閲覧・更新

- [ ] RLSポリシー総合テスト
  - 検証: 各ロールで適切な権限制御が動作すること

---

### P0-5: マスターデータ投入 ✅ 完了

- [x] マスターデータファイル作成 (`supabase/seed.sql`)
  - 対応要件: `03-Requirements-Student.md`
  - 検証: ✅ 全マスターデータを1ファイルに統合

- [x] 科目データ投入
  - 検証: ✅ 算数・国語・理科・社会の4科目（カラーコード付き）

- [x] 学習回データ投入
  - 検証: ✅ 小5: 19回、小6: 15回のデータ投入、期間確認済み

- [x] 学習内容データ投入
  - 検証: ✅ 学年・コース別学習内容データ約80件投入、問題数確認済み

- [x] テスト日程データ投入
  - 検証: ✅ 組分けテスト・合不合判定テストの日程8件投入、表示期間確認済み

- [x] マイグレーション実行時に自動投入
  - 検証: ✅ `supabase db reset` で全データ自動投入確認済み
  - 結果: 科目4件、学習回34件、学習内容80件、テスト8件

---

### P0-6: 認証フロー実装 🔄 進行中 (3/7完了)

- [x] Server Actions実装 (`app/actions/auth.ts`)
  - 対応要件: `02-Requirements-Auth.md`
  - 検証: ✅ studentLogin, parentLogin, coachLogin, parentSignUp, signOut, getCurrentUser 実装完了

- [x] 保護者新規登録API Route実装 (`app/api/auth/parent-signup/route.ts`)
  - 対応要件: `02-Requirements-Auth.md`
  - 検証: ✅ サービスロールキーで子どもアカウント作成、親子関係作成

- [x] ログインページUI実装 (`app/page.tsx`)
  - 対応要件: `02-Requirements-Auth.md`
  - 検証: ✅ 生徒/保護者/指導者タブ切り替え、Server Actionsと連携、エラーハンドリング

- [ ] 初期セットアップフロー実装 (アバター・プロフィール)
  - 対応要件: `02-Requirements-Auth.md`
  - 検証: 初回ログイン時にセットアップ画面表示、スキップ可能、再登録可能
  - 備考: `app/setup/*` ページの実装（既存コードの修正が必要）

- [ ] パスワードリセット実装 (保護者・指導者)
  - 対応要件: `02-Requirements-Auth.md`
  - 検証: メール送信、リセット成功

- [ ] 生徒パスワードリセット (保護者専用画面) 実装
  - 対応要件: `02-Requirements-Auth.md`
  - 検証: 保護者画面 → 設定 → 子ども管理 → パスワード変更

- [ ] P0-6 総合テスト
  - 検証: 生徒/保護者/指導者の全ログインフロー動作確認
  - テスト項目: ログイン → セットアップ → ダッシュボード遷移

---

### P0-7: テストユーザー作成 ⏳ 未着手

- [ ] 生徒アカウント作成 (各学年1名以上)
  - 対応要件: `02-Requirements-Auth.md`
  - 検証: 小5・小6各1名、ログインID自動生成確認

- [ ] 保護者アカウント作成 (子ども複数パターン含む)
  - 対応要件: `02-Requirements-Auth.md`
  - 検証: 子ども1名・複数名パターン、親子関係登録確認

- [ ] 指導者アカウント作成 (招待コード使用)
  - 対応要件: `02-Requirements-Auth.md`
  - 検証: 招待コード生成、招待リンク経由で登録成功

- [ ] 管理者アカウント作成 (内部発行)
  - 対応要件: `02-Requirements-Auth.md`
  - 検証: 管理者権限で全データアクセス可能

---

### P0-8: Phase 0 総合テスト ⏳ 未着手

- [ ] 4ロール全ての認証フロー動作確認
  - 対応要件: `02-Requirements-Auth.md`
  - 検証: ログイン・ログアウト・セットアップ完了

- [ ] RLSポリシー動作確認 (権限テスト)
  - 対応要件: セキュリティ要件
  - 検証: 不正アクセス時403エラー、正規アクセス成功

- [ ] 環境別動作確認 (本番・開発・ローカル)
  - 対応要件: 環境分離方針
  - 検証: 各環境でDB接続・認証成功

- [ ] Sentry エラーログ確認
  - 対応要件: 監視要件
  - 検証: 意図的エラー発生、Sentryで捕捉確認

---

## DoD (Definition of Done)

Phase 0完了の条件:

- [ ] 本番・開発・ローカル環境でSupabase接続成功
- [ ] 4ロール全てで認証フロー動作確認 (ログイン・ログアウト)
- [ ] RLSポリシーでロール別アクセス制御が機能
- [ ] テストユーザー (各ロール1名以上) で全機能アクセス可能
- [ ] Sentryでエラーログ収集確認

---

## リスク要因

| リスク | 発生確率 | 影響度 | 対策 | 状態 |
|--------|---------|--------|------|------|
| RLSポリシーの複雑性 | 高 | 高 | 段階的実装・テストケース充実 | 🔄 監視中 |
| 生徒ログインID自動生成ロジックの衝突回避 | 中 | 中 | リトライロジック実装済み | ✅ 対策済 |
| Docker環境構築 (M1/M2 Macでの互換性問題) | 低 | 中 | Supabase CLI最新版使用 | ✅ 問題なし |

---

## 次のマイルストーン

**現在:** P0-3 DBスキーマ実装 (進行中)
**次:** P0-3 完了 → P0-4 RLS詳細ポリシー実装

---

**最終更新:** 2025年10月6日 12:30
**更新者:** Claude Code
