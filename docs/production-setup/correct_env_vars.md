# 本番環境の正しい環境変数

Vercel Dashboard > Settings > Environment Variables で以下を設定してください。

**重要:** 環境変数を変更したら、必ず **Redeploy (ビルドキャッシュなし)** が必要です。

---

## ✅ 正しい値（本番Supabase: zlipaeanhcslhintxpej）

### NEXT_PUBLIC_SUPABASE_URL
```
https://zlipaeanhcslhintxpej.supabase.co
```
- Environment: ✅ Production, ✅ Preview, ✅ Development

### NEXT_PUBLIC_SUPABASE_ANON_KEY
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsaXBhZWFuaGNzbGhpbnR4cGVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MDg0MjcsImV4cCI6MjA3NDk4NDQyN30.MhwWJSJEP4ipGWV9OWfn3RUxC2u23i-5CAGUYWDOTKg
```
- Environment: ✅ Production, ✅ Preview, ✅ Development

### SUPABASE_SERVICE_ROLE_KEY
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsaXBhZWFuaGNzbGhpbnR4cGVqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTQwODQyNywiZXhwIjoyMDc0OTg0NDI3fQ.vHLWUSK8UURjH1_W-vIImz5f7QU1J9tEKGhsfKHDs1Y
```
- Environment: ✅ Production, ✅ Preview, ✅ Development

---

## ❌ 古い値（絶対に使わない）

### 古いSupabase (atisebehvsbewrctgdot) - 削除してください
```
NEXT_PUBLIC_SUPABASE_URL=https://atisebehvsbewrctgdot.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci... (古いキー)
```

---

## 🔧 設定手順

1. **Vercel Dashboard > Settings > Environment Variables**

2. **NEXT_PUBLIC_SUPABASE_ANON_KEY を確認:**
   - 現在の値をコピー
   - 上記の正しい値と比較
   - 違っていたら、**Edit** で正しい値に置き換え

3. **SUPABASE_SERVICE_ROLE_KEY も確認:**
   - 同様に正しい値と比較

4. **保存後、Redeploy:**
   - Deployments タブ
   - 最新デプロイの「...」メニュー > Redeploy
   - ⚠️ **"Use existing Build Cache" のチェックを外す**
   - Redeploy 実行

5. **1-2分待ってから、もう一度新規登録/ログインを試す**

---

## 📝 確認のコツ

Vercel環境変数画面で、各キーの値をクリックすると **Show/Hide** できます。
最初の20文字くらいを比較すれば、正しいキーかどうかわかります：

✅ 正しいANON_KEY: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsaXBhZWFu...`

❌ 間違ったANON_KEY: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0aXNlYmVo...`
                                                                       ↑ ここが違う
