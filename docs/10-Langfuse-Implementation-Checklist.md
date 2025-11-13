# Langfuse実装チェックリスト

このドキュメントは、Langfuse実装の各フェーズで確認すべき項目をまとめたチェックリストです。

---

## Phase 0: 事前準備

### ドキュメント確認
- [x] [07-Langfuse-Specification.md](./07-Langfuse-Specification.md) を読んだ
- [x] [08-Technical-Debt-Management.md](./08-Technical-Debt-Management.md) を読んだ
- [x] [09-Langfuse-Security-Guidelines.md](./09-Langfuse-Security-Guidelines.md) を読んだ

### 環境準備
- [ ] Langfuseプロジェクト作成（https://cloud.langfuse.com）
- [ ] Langfuse Public Keyを取得
- [ ] Langfuse Secret Keyを取得
- [ ] `.env.local`に環境変数を追加
  - [ ] `LANGFUSE_PUBLIC_KEY`
  - [ ] `LANGFUSE_SECRET_KEY`
  - [ ] `LANGFUSE_HOST=https://cloud.langfuse.com`
  - [ ] `NEXT_PUBLIC_LANGFUSE_ENABLED=true`
  - [ ] `CRON_SECRET`（ランダム生成）
  - [ ] `SLACK_WEBHOOK_URL`（オプション）
- [ ] Vercel環境変数に本番キーを設定

### パッケージインストール
- [ ] `pnpm add langfuse`
- [ ] `pnpm install`（依存関係解決）

---

## Phase 1: 基盤構築（Week 1）

### Day 1-2: サービスクライアント

#### ファイル作成
- [ ] `lib/supabase/service-client.ts`
- [ ] `lib/env.ts`

#### テスト
- [ ] `createServiceClient()`が正常に動作
- [ ] RLSをバイパスして書き込める
- [ ] 環境変数が正しく読み込まれる

#### セキュリティチェック
- [ ] サービスクライアントがAI生成関数のみで使われている
- [ ] Server ActionsやユーザーAPI Routeで使われていない
- [ ] コメントで使用理由が明記されている

---

### Day 3-4: Langfuseコア実装

#### ファイル作成
- [ ] `lib/langfuse/constants.ts`
- [ ] `lib/langfuse/validators.ts`
- [ ] `lib/langfuse/client.ts`
- [ ] `lib/langfuse/types.ts`
- [ ] `lib/langfuse/trace-manager.ts`（v3.1版）
- [ ] `lib/langfuse/trace-helpers.ts`
- [ ] `lib/langfuse/score-helpers.ts`
- [ ] `lib/langfuse/batch-helpers.ts`
- [ ] `lib/monitoring/notify.ts`

#### テスト
- [ ] `getLangfuseClient()`が正常に動作
- [ ] `saveTrace()`でトレース保存成功
- [ ] 非正規化カラム更新失敗時のログが出力される
- [ ] `getTraceByEntity()`でトレース取得成功

---

### Day 5: DB構築

#### マイグレーション実行
- [ ] `supabase/migrations/20251113000001_add_langfuse_core.sql`作成
- [ ] `supabase/migrations/20251113000002_add_langfuse_batch.sql`作成
- [ ] ローカル環境で`npx supabase db reset`
- [ ] マイグレーション適用確認
- [ ] テーブル作成確認
  - [ ] `langfuse_traces`
  - [ ] `langfuse_scores`
  - [ ] `rate_limit_logs`
  - [ ] `langfuse_batch_runs`
- [ ] 既存テーブルに`langfuse_trace_id`カラム追加確認
  - [ ] `ai_coach_messages`
  - [ ] `encouragement_messages`
  - [ ] `reflections`

#### 本番環境デプロイ
- [ ] `npx supabase migration up`（本番）
- [ ] エラーなく完了
- [ ] テーブル確認

---

### Day 6: AI機能統合

#### ファイル修正
- [ ] `lib/openai/coach-message.ts`にトレース追加
- [ ] `lib/openai/daily-status.ts`にトレース追加
- [ ] `lib/openai/encouragement.ts`にトレース追加
- [ ] `lib/openai/reflect-coaching.ts`にトレース追加

#### テスト
- [ ] AIコーチメッセージ生成時にトレース作成される
- [ ] キャッシュヒット時もトレース作成される
- [ ] Langfuseダッシュボードでトレース確認
- [ ] メタデータが正しく記録されている
- [ ] `cache_hit`フラグが正しい

---

### Day 7: ドキュメント・スクリプト

#### ファイル作成
- [ ] `scripts/repair-denormalized-trace-ids.ts`
- [ ] `scripts/README-repair-denormalized-trace-ids.md`

#### テスト
- [ ] 復旧スクリプトが正常に動作
- [ ] null状態の`langfuse_trace_id`が復旧される

#### ドキュメント確認
- [ ] README更新（Langfuse実装について追記）
- [ ] チームへの共有

---

## Phase 2: リアルタイムスコア（Week 2）

### Day 1-2: レート制限・スコアAPI

#### ファイル作成
- [ ] `lib/rate-limit/supabase-limiter.ts`（v3.1版）
- [ ] `app/api/langfuse/score/route.ts`（v3.1版）

#### テスト
- [ ] レート制限が正常に動作（10req/分）
- [ ] レート制限超過時に429エラー
- [ ] RPC失敗時に503エラー（フェイルセキュア）
- [ ] 認証エラー時に401エラー
- [ ] トレース所有権チェックが動作（403エラー）
- [ ] スコア送信成功

---

### Day 3-5: フィードバックUI

#### ファイル修正
- [ ] `components/langfuse-feedback.tsx`（v3.1版）
- [ ] `lib/env.ts`を使用して環境変数取得

#### 統合
- [ ] 生徒AIコーチページに配置
  - [ ] `app/student/page.tsx`
- [ ] 保護者「今日の様子」ページに配置
  - [ ] `app/parent/page.tsx`

#### テスト
- [ ] 👍ボタンが正常に動作
- [ ] 👎ボタンが正常に動作
- [ ] Toast通知が表示される（エラー時）
- [ ] Langfuse無効時は非表示
- [ ] traceIdがnullの時は非表示
- [ ] 二重送信防止が動作

---

### Day 6-7: E2Eテスト

#### シナリオテスト
- [ ] 生徒がAIコーチメッセージにフィードバック
- [ ] 保護者が「今日の様子」にフィードバック
- [ ] レート制限（連続10回押す）
- [ ] 他人のtraceIdでスコア送信（403確認）
- [ ] ネットワークエラー時のToast

#### Langfuseダッシュボード確認
- [ ] スコアが記録されている
- [ ] トレースとスコアが紐付いている

---

## Phase 3: バッチスコア（Week 3）

### Day 1-3: バッチAPI実装

#### ファイル作成
- [ ] `app/api/langfuse/batch/mission-completed/route.ts`
- [ ] `app/api/langfuse/batch/next-day-activity/route.ts`
- [ ] `app/api/langfuse/batch/weekly-completion/route.ts`
- [ ] `app/api/langfuse/batch/monitor-pending/route.ts`

#### テスト
- [ ] ミッション完了スコアが正しく計算される
- [ ] 翌日学習スコアが正しく計算される
- [ ] 週次実行率スコアが正しく計算される
- [ ] Pending滞留監視が動作
- [ ] Slack通知が届く（大量滞留時のダイジェスト）

---

### Day 4: Vercel Cron設定

#### vercel.jsonに追加
```json
{
  "crons": [
    {
      "path": "/api/langfuse/batch/mission-completed",
      "schedule": "0 2 * * *"
    },
    {
      "path": "/api/langfuse/batch/next-day-activity",
      "schedule": "0 2 * * *"
    },
    {
      "path": "/api/langfuse/batch/monitor-pending",
      "schedule": "0 3 * * *"
    },
    {
      "path": "/api/langfuse/batch/weekly-completion",
      "schedule": "0 3 * * 1"
    }
  ]
}
```

#### テスト
- [ ] Cron設定がVercelダッシュボードで確認できる
- [ ] Cron Secret認証が動作
- [ ] 手動トリガーで実行成功

---

### Day 5-7: 運用テスト

#### 監視設定
- [ ] Vercel Logsで構造化ログ確認
- [ ] Slack通知テスト
- [ ] エラー時の通知テスト

#### ダッシュボード作成
- [ ] Langfuseでカスタムダッシュボード作成
- [ ] 機能別トレース数
- [ ] キャッシュヒット率
- [ ] スコア平均値

#### チーム引き継ぎ
- [ ] 運用手順書作成
- [ ] トラブルシューティング共有
- [ ] 定期レビューの日程決定

---

## 最終チェック

### セキュリティ
- [ ] サービスロールクライアントの使用箇所レビュー
- [ ] RLSポリシーの確認
- [ ] 環境変数の棚卸し

### パフォーマンス
- [ ] トレース保存の遅延確認（100ms以内）
- [ ] スコア送信の遅延確認（500ms以内）
- [ ] バッチ処理の実行時間確認

### ドキュメント
- [ ] 全ドキュメントの最終確認
- [ ] READMEの更新
- [ ] チームへの共有完了

---

## トラブルシューティング

問題が発生した場合の対応フロー：

1. **ログ確認**: Vercel Logs、Supabaseログ
2. **Langfuseダッシュボード確認**: トレース・スコアの状態
3. **復旧スクリプト実行**: `repair-denormalized-trace-ids.ts`
4. **チームへ報告**: Slackで共有
5. **ドキュメント更新**: トラブル事例を追記

---

## 完了基準

Phase 3完了後、以下がすべて達成されていること：

- [ ] 4つのAI機能すべてでトレースが記録されている
- [ ] リアルタイムスコアが正常に動作している
- [ ] バッチスコアが毎日実行されている
- [ ] 監視・通知が機能している
- [ ] ドキュメントがすべて整備されている
- [ ] チームメンバー全員が運用方法を理解している

---

## 参考資料

- [Langfuse実装仕様書](./07-Langfuse-Specification.md)
- [技術的負債管理](./08-Technical-Debt-Management.md)
- [セキュリティガイドライン](./09-Langfuse-Security-Guidelines.md)
- [復旧スクリプトREADME](../scripts/README-repair-denormalized-trace-ids.md)
