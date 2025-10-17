# ブラウザでログインエラーを詳しく確認する方法

## 手順

1. **https://study-spark-2025-fall.vercel.app を開く**

2. **開発者ツールを開く**
   - Chrome/Edge: F12 または Cmd+Option+I (Mac)
   - **Console タブを選択**

3. **ログイン情報を入力**
   - ID: `hana6`
   - パスワード: `demo2025`

4. **ログインボタンをクリック**

5. **Console に表示されるエラーメッセージを確認**

---

## 📋 確認するポイント

### A. エラーメッセージ
Console に赤字でエラーが表示されますか？
- 表示される場合: そのエラーメッセージをコピーしてください
- 表示されない場合: 次のステップへ

### B. Network タブで認証リクエストを確認

1. **Network タブをクリック**
2. **ログインボタンをクリック**
3. **リクエスト一覧から探す:**
   - `token` で始まるリクエスト
   - または `signInWithPassword` を含むリクエスト

4. **そのリクエストをクリックして確認:**
   - **Headers タブ:** Status Code が何か？（200? 400? 401?）
   - **Response タブ:** エラーメッセージが含まれていますか？

---

## 📊 Status Code の意味

- **200 OK:** 認証成功 → ログイン後の処理でエラーが起きている
- **400 Bad Request:** リクエストの形式が間違っている
- **401 Unauthorized:** パスワードが間違っている
- **422 Unprocessable Entity:** メールアドレス形式が不正など

---

## 💡 もっと簡単な方法

Console タブで、以下のコマンドを貼り付けて Enter:

```javascript
// ログイン処理をキャプチャ
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  console.log('🔍 Fetch Request:', args[0]);
  const response = await originalFetch(...args);
  const clone = response.clone();
  if (args[0].includes('auth')) {
    console.log('🔐 Auth Response Status:', response.status);
    const body = await clone.json();
    console.log('🔐 Auth Response Body:', body);
  }
  return response;
};
console.log('✅ Fetch interceptor installed. Now try logging in.');
```

このコードを実行してから、ログインボタンを押してください。
Console に認証リクエストの詳細が表示されます。
