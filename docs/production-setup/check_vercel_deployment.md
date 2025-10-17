# Vercel デプロイメント確認手順

## 1. 最新のデプロイメント時刻を確認

1. **Vercel Dashboard** を開く
2. **Deployments** タブをクリック
3. **一番上のデプロイメント**の時刻を確認

**質問：**
- 環境変数を変更した時刻は何時ですか？
- 一番上のデプロイメントの時刻は何時ですか？

**環境変数変更時刻 < デプロイメント時刻** でないと、変更が反映されていません。

---

## 2. デプロイメントの詳細を確認

1. **一番上のデプロイメント**をクリック（時刻の部分）
2. **Building** セクションを確認
3. **「View Build Logs」**をクリック
4. ビルドログの中で `NEXT_PUBLIC_SUPABASE_URL` を検索（Cmd+F / Ctrl+F）

---

## 3. 環境変数の確認

1. Vercel Dashboard > **Settings** > **Environment Variables**
2. 以下の値になっているか確認：

### NEXT_PUBLIC_SUPABASE_URL
```
https://zlipaeanhcslhintxpej.supabase.co
```
- Environment: Production ✓, Preview ✓, Development ✓

### NEXT_PUBLIC_SUPABASE_ANON_KEY
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsaXBhZWFuaGNzbGhpbnR4cGVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MDg0MjcsImV4cCI6MjA3NDk4NDQyN30.MhwWJSJEP4ipGWV9OWfn3RUxC2u23i-5CAGUYWDOTKg
```
- Environment: Production ✓, Preview ✓, Development ✓

### SUPABASE_SERVICE_ROLE_KEY
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsaXBhZWFuaGNzbGhpbnR4cGVqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTQwODQyNywiZXhwIjoyMDc0OTg0NDI3fQ.vHLWUSK8UURjH1_W-vIImz5f7QU1J9tEKGhsfKHDs1Y
```
- Environment: Production ✓, Preview ✓, Development ✓

---

## 4. もし環境変数が正しいのにログインできない場合

Supabase Admin APIでhana6のパスワードを再設定してみましょう。

SQLで作成したユーザーのパスワードハッシュに問題がある可能性があります。
