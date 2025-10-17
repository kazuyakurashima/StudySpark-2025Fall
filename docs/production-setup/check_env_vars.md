# Vercel 環境変数の確認手順

本番環境でログインできない原因は、Vercelの環境変数が正しく設定されていない可能性があります。

## 確認手順

1. **Vercel Dashboardを開く**
   - https://vercel.com/dashboard
   - プロジェクト「StudySpark-2025Fall」を選択

2. **Settings > Environment Variables に移動**

3. **以下の環境変数が設定されているか確認：**

### 必須の環境変数

```
NEXT_PUBLIC_SUPABASE_URL=https://zlipaeanhcslhintxpej.supabase.co
```

```
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsaXBhZWFuaGNzbGhpbnR4cGVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MDg0MjcsImV4cCI6MjA3NDk4NDQyN30.MhwWJSJEP4ipGWV9OWfn3RUxC2u23i-5CAGUYWDOTKg
```

```
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsaXBhZWFuaGNzbGhpbnR4cGVqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTQwODQyNywiZXhwIjoyMDc0OTg0NDI3fQ.vHLWUSK8UURjH1_W-vIImz5f7QU1J9tEKGhsfKHDs1Y
```

### 重要ポイント

- **Environment**: 全て「Production」「Preview」「Development」にチェックを入れる
- スペースや改行が入っていないことを確認
- 設定後は **Redeploy** が必要

## 設定後のアクション

1. **Deployments タブに移動**
2. **最新のデプロイメントの「...」メニュー > Redeploy**
3. **"Use existing Build Cache" のチェックを外す**
4. **Redeploy ボタンをクリック**

再デプロイが完了したら（通常1-2分）、再度ログインテストを実行してください。
