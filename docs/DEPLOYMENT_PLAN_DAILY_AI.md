# 毎日のAI機能 本番デプロイ手順書

## 📋 概要

保護者向け「今日の様子」機能の本番環境へのデプロイ手順書です。

**実装内容:**
- 毎日午前3時（JST）に保護者向けメッセージを自動生成（Vercel Cron）
- RLS（Row Level Security）による安全なキャッシュ読み取り
- Langfuseによるトレース記録とモニタリング
- 学習記録後のリアルタイム生成

**デプロイ日**: 2025年11月XX日（予定）

---

## ⚠️ 重要な注意事項

### 1. マイグレーション適用の注意
```bash
# ❌ 危険: すべての差分を一括適用
npx supabase db push --linked

# ✅ 安全: 対象マイグレーションのみ適用
npx supabase migration up --db-url "postgresql://..." \
  --file supabase/migrations/20251114000001_create_parent_students_view.sql
```

**理由**: `db push --linked`はローカルとの差分をすべて適用するため、本番側のマイグレーション履歴と一致しているか事前確認が必須。

### 2. CRON_SECRETの再生成
```bash
# ローカルと本番で異なる値を使用
openssl rand -base64 32
```

**理由**: セキュリティ向上とテスト時の区別のため。

### 3. Langfuseプロジェクトの分離
- **ローカル**: `StudySpark-Local`（既存）
- **本番**: `StudySpark-Production`（新規作成）

**理由**: テストデータと本番データを明確に分離。

---

## 🎯 デプロイフロー

### フェーズ1: 準備（所要時間: 2-3時間）

#### 1.1 Langfuse本番プロジェクト作成

1. https://us.cloud.langfuse.com にアクセス
2. 新しいプロジェクト「StudySpark-Production」を作成
3. Settings → API Keys から以下を取得:
   - `LANGFUSE_PUBLIC_KEY`
   - `LANGFUSE_SECRET_KEY`
4. 手元にメモ（後でVercelに設定）

#### 1.2 CRON_SECRETの生成

```bash
# 新しいシークレットを生成
openssl rand -base64 32
```

出力例: `xY9mK3pQ7vN2jL5dF8gH1wR4sT6uI0oP2cV7bN9mX5kL3jH8fD4gS6aQ1wE3rT5y=`

#### 1.3 Vercel環境変数の設定

Vercelプロジェクト → Settings → Environment Variables で以下を追加:

| Variable | Value | Environment |
|----------|-------|-------------|
| `LANGFUSE_PUBLIC_KEY` | pk-lf-xxxxx（本番用） | Production |
| `LANGFUSE_SECRET_KEY` | sk-lf-xxxxx（本番用） | Production |
| `LANGFUSE_HOST` | https://us.cloud.langfuse.com | Production |
| `NEXT_PUBLIC_LANGFUSE_ENABLED` | true | Production |
| `CRON_SECRET` | （1.2で生成した値） | Production |
| `SLACK_WEBHOOK_URL` | https://hooks.slack.com/services/... | Production |

**注意**: `OPENAI_API_KEY`などの既存変数は変更不要。

#### 1.4 vercel.jsonの作成

```json
{
  "crons": [
    {
      "path": "/api/cron/generate-parent-status",
      "schedule": "0 3 * * *"
    }
  ]
}
```

**schedule説明**: `0 3 * * *` = 毎日午前3時（UTC）→ JST午後12時
※修正が必要な場合: `0 18 * * *` = UTC 18時 = JST 午前3時

#### 1.5 本番Supabaseのマイグレーション履歴確認

```bash
# ローカルのマイグレーション一覧
ls -la supabase/migrations/

# 本番の適用済みマイグレーション確認
npx supabase migration list --linked
```

**必要なマイグレーション**:
- `20251114000001_create_parent_students_view.sql`
- `20251114000002_add_student_id_to_ai_cache.sql`

---

### フェーズ2: デプロイ（所要時間: 1-2時間）

#### 2.1 feature/fix-goal-setting-end-datesブランチのマージ

```bash
# 現在のブランチを確認
git branch

# mainブランチに切り替え
git checkout main

# 最新を取得
git pull origin main

# feature/fix-goal-setting-end-datesをマージ
git merge feature/fix-goal-setting-end-dates

# コンフリクトがあれば解決

# mainにプッシュ
git push origin main
```

**注意**: マージ前にレビューを実施（後述のチェックリスト参照）。

#### 2.2 Vercel自動デプロイの確認

1. Vercelダッシュボードで自動デプロイ開始を確認
2. デプロイログをチェック（エラーがないか）
3. デプロイ完了後、本番URLにアクセス

#### 2.3 本番Supabaseでマイグレーション適用

**方法A: 個別適用（推奨）**

```bash
# Supabase Management APIで実行
# または Supabase Dashboard → SQL Editor で直接実行

-- 1. parent_students VIEW作成
-- supabase/migrations/20251114000001_create_parent_students_view.sql の内容をコピペ

-- 2. ai_cache.student_id追加
-- supabase/migrations/20251114000002_add_student_id_to_ai_cache.sql の内容をコピペ
```

**方法B: CLI使用（要注意）**

```bash
# 本番データベースURLを環境変数にセット
export SUPABASE_DB_URL="postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres"

# 特定マイグレーションのみ適用
npx supabase migration up --db-url "$SUPABASE_DB_URL"
```

#### 2.4 デモユーザー2家族の投入

```bash
# .env.localを一時的に本番環境変数に切り替え
# または環境変数を直接指定して実行

NEXT_PUBLIC_SUPABASE_URL=https://zlipaeanhcslhintxpej.supabase.co \
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc... \
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc... \
npx tsx scripts/seed-2families-data.ts
```

**投入されるユーザー**:
- 保護者: 星野一朗（demo-parent2@example.com）
- 保護者: 青空太郎（demo-parent1@example.com）
- 生徒: 星野明、星野光、青空花

---

### フェーズ3: 動作確認（所要時間: 2-3時間）

#### 3.1 デモユーザーでログインテスト

1. **保護者ログイン**
   - Email: `demo-parent2@example.com`
   - Password: `<社内管理>`

2. **表示確認**
   - [ ] 保護者名が「星野一朗」と正しく表示
   - [ ] 子ども選択で「星野明」「星野光」が表示
   - [ ] 「今日の様子」が表示（フォールバック or 昨日のメッセージ）

3. **生徒ログイン**
   - Login ID: `akira5`
   - Password: `<社内管理>`
   - [ ] 生徒名が「星野明」と表示
   - [ ] スパーク機能で学習記録入力可能

#### 3.2 Cronジョブの手動実行テスト

```bash
# Vercel CLI経由で手動実行
vercel env pull .env.production
curl -X GET "https://your-app.vercel.app/api/cron/generate-parent-status" \
  -H "Authorization: Bearer [CRON_SECRET]"
```

**期待される結果**:
```json
{
  "success": true,
  "totalParents": 17,
  "successCount": 20,
  "failureCount": 0,
  "generatedAt": "2025-11-XX...",
  "targetDate": "2025-11-XX"
}
```

**確認項目**:
- [ ] `totalParents`が17（本番15家族 + デモ2家族）
- [ ] `failureCount`が0
- [ ] Slackに成功通知が届く

#### 3.3 Langfuseトレース確認

1. https://us.cloud.langfuse.com にアクセス
2. プロジェクト「StudySpark-Production」を選択
3. Traces画面で以下を確認:
   - [ ] Cronジョブ実行後、トレースが増加
   - [ ] トレース詳細でプロンプト・応答内容を確認
   - [ ] エラートレースがないか確認

#### 3.4 既存15家族での動作確認

**無作為に3-5家族を選んで確認**:
- [ ] ログイン可能
- [ ] 「今日の様子」が表示
- [ ] 保護者・生徒名が正しく表示
- [ ] 応援メッセージ送信可能

---

### フェーズ4: 本番運用開始（所要時間: 継続監視）

#### 4.1 初回Cron自動実行の監視

**実行日時**: デプロイ翌日の午前3時（JST）

**監視項目**:
1. **Vercel Logs**（2:55 AM - 3:10 AM）
   - [ ] Cron起動ログ確認
   - [ ] エラーログがないか確認
   - [ ] 実行時間が10分以内か確認

2. **Slack通知**
   - [ ] 成功通知受信
   - [ ] 生成件数が予想通りか確認

3. **Langfuse**
   - [ ] トレース数が増加（全生徒分）
   - [ ] 平均レイテンシが許容範囲内（<5秒）

#### 4.2 ユーザーフィードバック収集

**初日（午前9時以降）**:
- [ ] 保護者ダッシュボードで「昨日の様子です」が表示されているか確認
- [ ] 数名の保護者にヒアリング（任意）
- [ ] エラー報告がないか確認

**初週（1週間）**:
- [ ] 毎日のCron実行を監視
- [ ] Langfuseで異常なトレースがないか確認
- [ ] コスト（OpenAI API）が予想範囲内か確認

#### 4.3 パフォーマンス分析

**Langfuseダッシュボードで以下を週次確認**:
- Total Trace Count（トレース総数）
- Average Latency（平均レイテンシ）
- Token Usage（トークン使用量）
- Cost（コスト）

**目標値**:
- レイテンシ: < 5秒
- 1日あたりコスト: < $X（予算に応じて設定）

---

## ✅ デプロイ前チェックリスト

### コード品質

- [ ] TypeScriptエラーがない（`npm run build`成功）
- [ ] ESLintエラーがない（`npm run lint`成功）
- [ ] デバッグログ（console.log）を削除または条件分岐

### セキュリティ

- [ ] CRON_SECRETが本番用に再生成されている
- [ ] Langfuse APIキーが本番用に切り替わっている
- [ ] .env.localが.gitignoreに含まれている
- [ ] シークレットがコードにハードコードされていない

### データベース

- [ ] マイグレーションが本番に適用済み
- [ ] RLSポリシーが正しく設定されている
- [ ] ai_cache.student_idカラムが存在
- [ ] parent_students VIEWが作成済み

### 機能

- [ ] ローカルでCronジョブテスト成功
- [ ] 「昨日の様子です」プレフィックス表示確認
- [ ] リアルタイム生成（学習記録後）動作確認
- [ ] Langfuseトレース送信確認

### ドキュメント

- [ ] DEPLOYMENT_PLAN_DAILY_AI.md作成
- [ ] CHANGELOG.mdに変更内容記載
- [ ] README.mdに新機能を追加（必要に応じて）

---

## 🔄 ロールバック手順

万が一、本番環境で問題が発生した場合の対処法。

### 緊急停止（Cronジョブ）

**方法1: Vercel Cron無効化**
```bash
# vercel.jsonからcrons設定を削除して再デプロイ
# または Vercel Dashboard → Cron Jobs → Disable
```

**方法2: CRON_SECRET変更**
```bash
# Vercel環境変数のCRON_SECRETを別の値に変更
# → Cronジョブは401 Unauthorizedで失敗
```

### データベースロールバック

```sql
-- ai_cache.student_idカラムを削除
ALTER TABLE public.ai_cache DROP COLUMN IF EXISTS student_id;

-- parent_students VIEWを削除
DROP VIEW IF EXISTS public.parent_students;

-- RLSポリシーを削除
DROP POLICY IF EXISTS "Parents can read their children's daily status cache" ON public.ai_cache;
DROP POLICY IF EXISTS "Students can read their own daily coach cache" ON public.ai_cache;
```

### 前バージョンへのロールバック

```bash
# Vercel Dashboard → Deployments → 前回のデプロイを選択 → Promote to Production
```

---

## 📊 運用後の改善ポイント

### 1週間後レビュー

- [ ] Cronジョブの安定稼働確認
- [ ] Langfuseトレースの分析
- [ ] ユーザーフィードバックの収集
- [ ] コスト分析（OpenAI API使用量）

### 改善候補

1. **パフォーマンス改善**
   - バッチ処理の並列化
   - キャッシュ戦略の最適化

2. **機能拡張**
   - 生徒向け日次コーチメッセージ
   - 週次トレンド分析の精度向上

3. **モニタリング強化**
   - Datadogなどの導入検討
   - カスタムアラート設定

---

## 📝 変更履歴

| 日付 | バージョン | 変更内容 | 担当 |
|------|-----------|---------|------|
| 2025-11-14 | 1.0.0 | 初版作成 | - |

---

## 🆘 トラブルシューティング

### Q1. Cronジョブが実行されない

**確認項目**:
1. Vercel Dashboard → Cron Jobs で有効化されているか
2. CRON_SECRETが正しく設定されているか
3. vercel.jsonがデプロイされているか
4. タイムゾーン設定が正しいか（UTC vs JST）

**解決策**:
```bash
# 手動実行でテスト
curl -X GET "https://your-app.vercel.app/api/cron/generate-parent-status" \
  -H "Authorization: Bearer [CRON_SECRET]"
```

### Q2. 「昨日の様子です」が表示されない

**確認項目**:
1. ai_cache.student_idカラムが存在するか
2. RLSポリシーが正しく設定されているか
3. Cronジョブが成功しているか（Langfuse確認）
4. 今日の学習ログが存在しないか

**デバッグ**:
```sql
-- キャッシュ確認
SELECT * FROM ai_cache
WHERE cache_key LIKE 'daily_status_yesterday_%'
ORDER BY created_at DESC
LIMIT 5;
```

### Q3. Langfuseにトレースが送信されない

**確認項目**:
1. 環境変数が本番用に切り替わっているか
2. LANGFUSE_HOSTが正しいか（us.cloud.langfuse.com）
3. ネットワークエラーがないか

**デバッグ**:
```typescript
// lib/langfuse/client.ts でログ追加
console.log('[Langfuse] Client initialized:', !!langfuseClient)
```

---

## 📞 サポート連絡先

**問題発生時の連絡先**:
- Slackチャンネル: #studyspark-dev
- 緊急連絡先: [設定してください]

**外部サービスサポート**:
- Vercel: https://vercel.com/support
- Supabase: https://supabase.com/support
- Langfuse: https://langfuse.com/docs
