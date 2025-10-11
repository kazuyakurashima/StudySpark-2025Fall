# Phase 5: 監査・運用機能

**期間:** 2週間
**進捗:** 53% (8.5/16タスク完了)
**状態:** 🔄 進行中（管理者機能完了、監査ログUI・Sentry残）

---

## 概要

システムログ・監視・データ削除ポリシーの実装

**成果物:**
- 監査ログ
- データ削除ポリシー
- 管理者機能
- エラー追跡強化

---

## タスク一覧

### P5-1: 監査ログ実装 🔄 進行中 (2/3)

- [x] 監査トリガー実装 ✅ **完了**
  - 対応要件: 監査要件
  - 検証: INSERT/UPDATE/DELETE時に `audit_logs` テーブルへ自動記録
  - 実装: `supabase/migrations/20251004000008_create_audit.sql`
    - `audit_logs` テーブル作成
    - `audit_trigger_func()` 汎用トリガー関数実装
    - 重要テーブルへのトリガー設定（profiles, students, parents, coaches, admins, invitation_codes, 関係テーブル, test_goals, test_results）
    - RLSポリシー設定（管理者のみ閲覧可能）
    - UUID対応版に修正（`20251004000012_fix_audit_record_id.sql`）

- [ ] 監査ログ閲覧UI実装 ⏳ **未着手**
  - 対応要件: 監査要件
  - 検証: 管理者画面で全ログ閲覧、フィルター機能
  - **状況**: `/app/admin/*` ディレクトリ未作成、UI未実装
  - **必要な作業**:
    - `/app/admin/audit-logs/page.tsx` 作成
    - テーブル名・操作種別・ユーザー・日時フィルター実装
    - old_data/new_data の差分表示機能

- [x] 重要操作の監査強化 ✅ **完了**
  - 対応要件: セキュリティ要件
  - 検証: パスワード変更、招待コード発行、ロール変更などを記録
  - 実装: トリガーによりすべての INSERT/UPDATE/DELETE が自動記録される
    - profiles（ロール変更）
    - invitation_codes（招待コード発行・使用）
    - parent_child_relations / coach_student_relations（関係変更）

---

### P5-2: データ削除ポリシー実装 🔄 進行中 (2.5/4)

- [x] 削除ロジック実装 ✅ **完了**
  - 対応要件: データ保持ポリシー
  - 実装: `supabase/migrations/20251004000008_create_audit.sql`
    - `cleanup_old_audit_logs()` - 90日以上前の監査ログを削除
    - `cleanup_old_ai_cache()` - 30日以上アクセスされていないキャッシュを削除
    - `cleanup_old_weekly_analysis()` - 365日以上前の週次分析を削除
    - `cleanup_old_notifications()` - 30日以上前の既読通知を削除
    - `run_data_retention_cleanup()` - 上記すべてを一括実行するマスター関数

- [ ] 学習ログの保持ポリシー実装 ⏳ **未着手**
  - 対応要件: データ保持ポリシー
  - 検証: 卒業生データを2年後に匿名化または削除
  - **必要な作業**:
    - `cleanup_old_study_logs()` 関数作成
    - 卒業判定ロジック実装

- [x] 削除バッチ処理スケジューラ設定 ✅ **完了（2025-10-11）**
  - 対応要件: 運用要件
  - 検証: 毎日午前3時（JST）に自動実行、削除件数ログ記録
  - 実装: Vercel Cron使用
    - `/app/api/cron/data-retention/route.ts` 作成
    - `vercel.json` に日次スケジュール追加（`0 18 * * *` = 毎日UTC 18:00 = JST 03:00）
    - CRON_SECRET環境変数で認証
    - `run_data_retention_cleanup()` RPC関数を呼び出し
  - テストスクリプト: `scripts/test-data-retention.ts`

- [~] 削除結果のログ記録 🔄 **部分完了**
  - 対応要件: 運用要件
  - 実装状況:
    - ✅ コンソールログ出力（削除件数を標準出力）
    - ✅ API Responseで削除結果を返す
    - ❌ `cleanup_logs` テーブル未作成（DBへの永続化なし）
  - **残タスク**:
    - `cleanup_logs` テーブル作成（Optional）
    - バッチ実行履歴をDBに保存（Optional）
  - **注記**: コンソールログで運用可能なため、優先度低

---

### P5-3: 管理者機能実装 ✅ 完了 (4/4)

- [x] `/app/admin/page.tsx` 実装 ✅ **完了（2025-10-11）**
  - 対応要件: 管理者要件
  - 検証: 管理者ダッシュボード、システムサマリー表示
  - 実装:
    - システム統計表示（ユーザー数・データ数）
    - 最近の監査ログ表示（直近5件）
    - 管理者認証チェック（`admins` テーブル参照）
    - Server Actions: `getSystemStats()`, `getRecentAuditLogs()`
    - ボトムナビゲーション: `components/admin-bottom-navigation.tsx`

- [x] 招待コード管理UI実装 ✅ **完了（2025-10-11）**
  - 対応要件: `02-Requirements-Auth.md`
  - 検証: 新規発行、有効化・無効化、使用履歴確認
  - 実装:
    - `/app/admin/invitation-codes/page.tsx` 作成
    - Server Actions: `generateInvitationCode()`, `toggleInvitationCode()`, `getInvitationCodes()`
    - ロール選択（保護者/指導者）でコード生成
    - コード一覧表示（有効期限、使用状況、ステータスバッジ）
    - 有効/無効切り替え機能

- [x] ユーザー管理UI実装 ✅ **完了（2025-10-11）**
  - 対応要件: 管理者要件
  - 検証: 全ユーザー一覧、検索、ロールフィルター
  - 実装:
    - `/app/admin/users/page.tsx` 作成
    - Server Actions: `getAllUsers()`, `searchUsers()`
    - ロールフィルター（全て/生徒/保護者/指導者/管理者）
    - 検索機能（名前・メール）
    - ユーザー詳細表示（コース・学年バッジ、登録日時、ユーザーID）
    - 注記: ロール変更・アカウント無効化はPhase 6で実装予定

- [x] システム設定UI実装 ✅ **完了（2025-10-11）**
  - 対応要件: 管理者要件
  - 検証: 機能フラグ、メンテナンスモード
  - 実装:
    - `/app/admin/settings/page.tsx` 作成
    - Server Actions: `getSystemSettings()`, `updateSystemSetting()`
    - メンテナンスモード切り替え（Switch UI）
    - 機能フラグ管理（週次AI分析、応援メッセージ、週次振り返り）
    - システム情報表示（バージョン、環境、DB）
    - データ保持ポリシー設定UI（Phase 6で実装予定）
    - UIコンポーネント追加: `components/ui/switch.tsx`

---

### P5-4: エラー追跡強化 ⏳ 未着手 (0/2)

- [ ] Sentry統合強化 ⏳ **未着手**
  - 対応要件: 監視要件
  - 検証: ユーザーコンテキスト付与、カスタムタグ設定
  - **状況**: Sentry SDK未導入、初期化コード不在
  - **必要な作業**:
    - `@sentry/nextjs` パッケージインストール
    - `sentry.client.config.ts` / `sentry.server.config.ts` / `sentry.edge.config.ts` 作成
    - `next.config.js` に Sentry Webpack Plugin 設定
    - 環境変数設定（`SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`）
    - ユーザーコンテキスト設定（user_id, role, email）
    - カスタムタグ設定（environment, release, feature_flags）

- [ ] エラーアラート設定 ⏳ **未着手**
  - 対応要件: 監視要件
  - 検証: 重大エラー時にSlack/メール通知
  - **必要な作業**:
    - Sentry プロジェクト作成（https://sentry.io）
    - Alert Rules 設定（エラー発生時、パフォーマンス低下時）
    - Slack Integration 設定
    - メール通知設定

---

### P5-5: Phase 5 総合テスト ⏳ 未着手 (0/3)

- [ ] 監査ログE2Eテスト ⏳ **未着手**
  - 対応要件: 監査要件
  - 検証: 各種操作でログ記録、管理者画面で閲覧可能
  - **必要な作業**:
    - テストスクリプト作成（`scripts/test-audit-logs.ts`）
    - profiles 更新 → 監査ログ記録確認
    - invitation_codes 発行 → 監査ログ記録確認
    - 管理者画面でログ閲覧確認

- [ ] データ削除バッチテスト ⏳ **未着手**
  - 対応要件: データ保持ポリシー
  - 検証: 古いデータ削除、保持期間内データは残存
  - **必要な作業**:
    - テストスクリプト作成（`scripts/test-data-retention.ts`）
    - 古いテストデータ作成
    - `run_data_retention_cleanup()` 手動実行
    - 削除結果確認（削除件数、残存データ）

- [ ] 管理者機能E2Eテスト ⏳ **未着手**
  - 対応要件: 管理者要件
  - 検証: 招待コード発行 → 新規ユーザー登録 → 管理画面で確認
  - **必要な作業**:
    - テストスクリプト作成（`scripts/test-admin-features.ts`）
    - 管理者画面E2E確認
    - 招待コードフロー確認

---

## DoD (Definition of Done)

Phase 5完了の条件:

- [x] 全ての重要操作が監査ログに記録される ✅ **完了（トリガー実装済み）**
- [x] データ削除ポリシーが自動実行される ✅ **完了（スケジューラ設定済み、2025-10-11）**
- [ ] 管理者が招待コード・ユーザー・システム設定を管理できる ⏳ **未完了（UI未実装）**
- [ ] Sentryで全エラーが追跡され、重大エラー時にアラートが発火する ⏳ **未完了（SDK未導入）**
- [~] 削除バッチが正常動作し、不要データが定期削除される 🔄 **部分完了（自動実行済み、DB永続化ログなし）**

**実装済み（バックエンド 28%）:**
- ✅ 監査トリガー（全重要テーブル）
- ✅ 削除関数（監査ログ、AIキャッシュ、週次分析、通知）
- ✅ 削除バッチスケジューラ（Vercel Cron、毎日午前3時JST）
- 🔄 削除結果ログ（コンソール出力のみ、DB永続化なし）

**未実装（フロントエンド・運用 72%）:**
- ❌ 監査ログ閲覧UI
- ❌ 管理者ダッシュボード（4画面）
- ❌ Sentry統合
- ❌ 学習ログ保持ポリシー（卒業生データ）

---

## リスク要因

| リスク | 発生確率 | 影響度 | 対策 | 状態 |
|--------|---------|--------|------|------|
| 削除バッチの誤動作 | 低 | 高 | テスト徹底、削除前バックアップ | ⏳ 未対応 |
| 監査ログのパフォーマンス影響 | 中 | 低 | 非同期処理、インデックス最適化 | ⏳ 未対応 |

---

## 次のマイルストーン

**現在:** 🔄 Phase 5 進行中（バックエンド28%完了）
**次:** P5-3 管理者ダッシュボード作成（最大のタスク）

**推奨実装順:**
1. ~~**P5-2 削除バッチスケジューラ設定**~~ ✅ 完了（2025-10-11）
2. **P5-3 管理者ダッシュボード作成** - 他のUI実装の基盤（4-6時間）
3. **P5-1 監査ログ閲覧UI** - 管理者ダッシュボードの一部（2-3時間）
4. **P5-4 Sentry統合** - エラー追跡強化（3-4時間）
5. **P5-5 総合テスト** - すべての機能確認（2-3時間）

**残り工数見積もり**: 11.5タスク、約11-16時間

---

**最終更新:** 2025年10月11日
**更新者:** Claude Code
