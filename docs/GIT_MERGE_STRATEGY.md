# Git マージ戦略 - mainブランチへの統合について

## 📋 現状

現在、以下の2つのfeatureブランチがあります：

1. **`feature/fix-goal-setting-end-dates`**
   - 最新コミット: `2be59a6 docs: Langfuse実装前ドキュメント整備`
   - 内容: 目標設定期間の修正、既存ユーザー対応

2. **`feature/langfuse-implementation`**（新規）
   - 最新コミット: `97f2ef4 feat: 保護者向け「今日の様子」Cronジョブ実装とLangfuse統合`
   - 内容: Cronジョブ、Langfuse統合、RLS設定

## 🤔 マージ戦略の推奨

### ✅ 推奨: 段階的マージ（2段階）

**理由:**
- リスク分散: 各featureブランチの影響を個別に確認可能
- ロールバックが容易: 問題があれば該当ブランチのみ切り戻し
- レビューしやすい: 変更内容が明確で追跡可能

**手順:**

#### ステップ1: `feature/fix-goal-setting-end-dates` を先にマージ

```bash
# mainブランチに切り替え
git checkout main
git pull origin main

# feature/fix-goal-setting-end-datesをマージ
git merge feature/fix-goal-setting-end-dates

# コンフリクトがあれば解決

# テスト実行
npm run build
npm run lint

# mainにプッシュ
git push origin main
```

**理由:**
- このブランチは既存の機能修正で、Langfuse実装とは独立
- 本番デプロイ前に先行して適用すべき修正が含まれる

#### ステップ2: `feature/langfuse-implementation` をマージ

```bash
# mainブランチを最新化
git checkout main
git pull origin main

# feature/langfuse-implementationをマージ
git merge feature/langfuse-implementation

# コンフリクトがあれば解決

# テスト実行
npm run build
npm run lint

# mainにプッシュ
git push origin main
```

**理由:**
- Langfuse実装は新機能なので、既存修正の後に適用
- main に最新の修正が反映された状態でマージすることでコンフリクトを最小化

---

### ⚠️ 非推奨: 直接mainへの一括マージ

**理由:**
- リスクが高い: 2つのブランチの変更を一度に適用すると、問題の切り分けが困難
- ロールバックが複雑: どちらの変更が原因か特定しづらい
- レビューが難しい: 大量の変更を一度に確認する必要がある

---

## 🔍 マージ前チェックリスト

### `feature/fix-goal-setting-end-dates` マージ前

- [ ] ローカルで`npm run build`成功
- [ ] ローカルで`npm run lint`成功
- [ ] 目標設定画面で終了日が正しく表示されることを確認
- [ ] 既存ユーザーの`setup_completed`フラグが更新されていることを確認（本番DB）

### `feature/langfuse-implementation` マージ前

- [ ] ローカルで`npm run build`成功
- [ ] ローカルで`npm run lint`成功
- [ ] ローカルでCronジョブテスト成功
- [ ] Langfuseトレースが記録されることを確認
- [ ] 「昨日の様子です」プレフィックスが表示されることを確認
- [ ] RLSポリシーが正しく動作することを確認

---

## 📝 マージ後の確認事項

### Vercel自動デプロイ後

1. **デプロイログ確認**
   - [ ] ビルドエラーがないか
   - [ ] 警告（Warning）の内容を確認

2. **本番環境動作確認**
   - [ ] 既存機能が正常動作（ログイン、ダッシュボード）
   - [ ] 新機能が動作（Cronジョブ手動実行）
   - [ ] Langfuseトレースが記録される

3. **ロールバック準備**
   - [ ] 前回のデプロイをVercel Dashboardでピン留め
   - [ ] 問題発生時の連絡先確認

---

## 🚀 マージ実施タイミング

### 推奨タイミング

**平日の日中（9:00 - 17:00）**

**理由:**
- 問題発生時に即座に対応可能
- チームメンバーがサポート可能
- ユーザーへの影響を最小化（夜間より昼間のほうが利用者が少ない可能性）

### 避けるべきタイミング

- ❌ 金曜日の夕方以降（週末に問題が持ち越される）
- ❌ 深夜・早朝（対応できる人員が限られる）
- ❌ 祝日前日・大型連休前

---

## 📊 マージ後のモニタリング計画

### 初日（マージ当日）

- [ ] Vercelデプロイログを監視
- [ ] Supabase Logsでエラー確認
- [ ] Langfuseトレース数の推移確認
- [ ] ユーザーからの問い合わせ確認

### 初週（1週間）

- [ ] 毎日のCron実行状況確認（午前3時以降）
- [ ] Langfuseで異常なレイテンシ確認
- [ ] OpenAI APIコスト確認
- [ ] ユーザーフィードバック収集

---

## 🔄 ロールバック手順（緊急時）

### Vercel経由でロールバック

```bash
# Vercel Dashboard → Deployments → 前回のデプロイ → Promote to Production
```

### Git経由でロールバック

```bash
# mainブランチで直前のコミットに戻す
git checkout main
git revert HEAD
git push origin main

# または特定のコミットまで戻す
git reset --hard <commit-hash>
git push origin main --force  # 注意: force pushは慎重に
```

---

## ✅ 結論: 推奨マージ戦略

1. **`feature/fix-goal-setting-end-dates` を先にmainにマージ**
2. **Vercel自動デプロイ完了後、動作確認**
3. **問題なければ `feature/langfuse-implementation` をmainにマージ**
4. **再度Vercel自動デプロイ完了後、動作確認**
5. **Cronジョブ手動実行テスト**
6. **翌朝3時のCron自動実行を監視**

**メリット:**
- リスク分散
- 段階的な検証
- ロールバック容易
- チーム全体で進捗を追跡可能

---

## 📞 質問・相談

マージ戦略について疑問があれば、以下を確認してください：

1. このドキュメント（GIT_MERGE_STRATEGY.md）
2. デプロイ手順書（DEPLOYMENT_PLAN_DAILY_AI.md）
3. CHANGELOG.md

それでも不明な場合は、チームリーダーに相談してください。
