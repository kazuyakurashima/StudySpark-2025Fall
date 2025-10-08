# Vercel 環境変数設定手順

## 🚨 保護者ログインできない問題の原因

デプロイ環境で保護者ログインができない場合、Vercelの環境変数が正しく設定されていない可能性があります。

## ✅ 必要な環境変数

Vercelダッシュボードで以下の環境変数を設定してください：

### 1. Supabase URL
```
変数名: NEXT_PUBLIC_SUPABASE_URL
値: https://atisebehvsbewrctgdot.supabase.co
環境: Production, Preview, Development
```

### 2. Supabase Anon Key
```
変数名: NEXT_PUBLIC_SUPABASE_ANON_KEY
値: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0aXNlYmVodnNiZXdyY3RnZG90Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4MjA4MjgsImV4cCI6MjA3NTM5NjgyOH0.mZ0zrqvZC3xrIFqRNXJxNzqYqoMJDxf2Xjs_iPiN8XQ
環境: Production, Preview, Development
```

### 3. OpenAI API Key (AI機能用)
```
変数名: OPENAI_API_KEY
値: （プロジェクトのOpenAI API Keyを設定）
環境: Production, Preview, Development
```

> **注意**: 実際のAPIキーは `.env.local` ファイルまたはプロジェクト管理者から取得してください。

### 4. その他の推奨設定
```
変数名: NODE_ENV
値: production
環境: Production のみ

変数名: TZ
値: Asia/Tokyo
環境: Production, Preview, Development
```

## 📋 設定手順

### Step 1: Vercelダッシュボードにアクセス

1. https://vercel.com にログイン
2. StudySpark プロジェクトを選択
3. 「Settings」タブをクリック
4. 左サイドバーの「Environment Variables」をクリック

### Step 2: 環境変数を追加

各環境変数について：

1. 「Name」に変数名を入力（例: `NEXT_PUBLIC_SUPABASE_URL`）
2. 「Value」に値を入力
3. 「Environment」で適用する環境を選択：
   - ✅ **Production** - 本番環境（必須）
   - ✅ **Preview** - プレビューデプロイ（推奨）
   - ✅ **Development** - 開発環境（オプション）
4. 「Save」をクリック

### Step 3: 再デプロイ

環境変数を設定後、**必ず再デプロイ**が必要です：

#### 方法A: Vercelダッシュボードから
1. 「Deployments」タブに移動
2. 最新のデプロイの右側にある「⋮」（三点リーダー）をクリック
3. 「Redeploy」を選択
4. 確認ダイアログで「Redeploy」をクリック

#### 方法B: GitHubからプッシュ（簡単）
```bash
# 空コミットをプッシュして再デプロイをトリガー
git commit --allow-empty -m "chore: Vercel環境変数設定後の再デプロイ"
git push origin demo/pitch-presentation
```

## 🔍 設定確認方法

デプロイ完了後、以下の手順で動作確認：

### 1. デプロイログの確認
- Vercelの「Deployments」タブ
- 最新デプロイの詳細を開く
- 「Build Logs」でエラーがないか確認

### 2. 環境変数の確認
- ビルドログ内で以下が表示されているか確認：
  ```
  ✓ Environment variables loaded successfully
  ```

### 3. 実際のログインテスト
1. デプロイされたURLにアクセス
2. 保護者アカウントでログイン試行：
   - Email: `demo-parent@example.com`
   - Password: `demo2025`
3. ログイン成功 → 保護者ダッシュボードに遷移

## ⚠️ トラブルシューティング

### 問題1: 環境変数が反映されない
**原因**: 再デプロイを忘れている
**解決策**: 上記「Step 3: 再デプロイ」を実施

### 問題2: "Invalid API Key" エラー
**原因**: Supabase Anon Keyが間違っている
**解決策**:
1. Supabaseダッシュボード → Project Settings → API
2. `anon` `public` キーをコピー
3. Vercelの環境変数を更新
4. 再デプロイ

### 問題3: ログインしても真っ白な画面
**原因**: RLSポリシーまたはデータベース接続の問題
**解決策**:
1. ブラウザの開発者ツール（F12）でコンソールエラーを確認
2. Supabaseダッシュボード → Authentication → Users でユーザーが存在するか確認
3. Database → Tables → profiles でプロフィールが存在するか確認

### 問題4: OpenAI API エラー
**原因**: OpenAI API Keyが設定されていない、または無効
**解決策**:
1. AI機能を一時的に無効化:
   ```
   変数名: NEXT_PUBLIC_AI_ENABLED
   値: false
   ```
2. または正しいAPI Keyを設定して再デプロイ

## 📞 サポート

上記手順でも解決しない場合：

1. Vercel デプロイログの全文を確認
2. ブラウザ開発者ツールのコンソールエラーを確認
3. Supabase ダッシュボード → Logs でエラーログを確認

---

**最終更新**: 2025年10月8日
