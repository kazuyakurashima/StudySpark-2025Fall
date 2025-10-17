# ブラウザで環境変数を確認する方法

本番環境が正しいSupabaseに接続されているか、ブラウザのコンソールで確認できます。

## 手順

1. **https://study-spark-2025-fall.vercel.app を開く**

2. **ブラウザの開発者ツールを開く**
   - Chrome/Edge: `F12` または `Cmd+Option+I` (Mac) / `Ctrl+Shift+I` (Windows)
   - Safari: `Cmd+Option+C`

3. **Consoleタブを選択**

4. **以下のコードを貼り付けて Enter**

```javascript
console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
```

5. **結果を確認**

### 期待される結果:
```
Supabase URL: https://zlipaeanhcslhintxpej.supabase.co
```

### もし違うURLが表示されたら:
- Redeployが完了していない
- または、ブラウザキャッシュが残っている

その場合：
1. ブラウザで `Cmd+Shift+R` (Mac) / `Ctrl+Shift+R` (Windows) でスーパーリロード
2. それでもダメなら、ブラウザのキャッシュをクリア
3. 再度確認

---

## 簡易確認方法

ログイン画面で、ブラウザの開発者ツール > **Network** タブを開いて：

1. **ログインボタンを押す**
2. **signInWithPassword** というリクエストを探す
3. **Headers** タブで **Request URL** を確認

**期待される結果:**
```
https://zlipaeanhcslhintxpej.supabase.co/auth/v1/token?grant_type=password
```

**もし `atisebehvsbewrctgdot` が含まれていたら:**
- Redeployが必要、または完了していない
