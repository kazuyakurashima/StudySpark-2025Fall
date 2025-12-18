# ローカル検証用ユーザー作成（PIIを残さない）

目的: ローカルSupabaseでログイン検証できる状態を、**本番データを触らず**に作る。

## 方針

- 個人情報・パスワード等は `scripts/.seed-data.local.json` に置き、Git管理しない
- シード実行はデフォルトで **ローカルSupabase URL のみ許可**

## 手順

1) `scripts/.seed-data.local.example.json` をコピーして `scripts/.seed-data.local.json` を作成し、必要なユーザーを入力
2) ローカルSupabaseのURLとService Role Keyを用意
   - `npx supabase status` で `Project URL` と `Secret` を確認
3) 実行:

```bash
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 \
SUPABASE_SERVICE_ROLE_KEY=sb_secret_xxx \
node scripts/seed-local-users.mjs
```

任意: サンプルの学習ログも少し入れる場合は `SEED_SAMPLE_LOGS=1` を付ける:

```bash
SEED_SAMPLE_LOGS=1 \
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 \
SUPABASE_SERVICE_ROLE_KEY=sb_secret_xxx \
node scripts/seed-local-users.mjs
```

## 安全装置

- `NEXT_PUBLIC_SUPABASE_URL` が `http://127.0.0.1:54321` / `http://localhost:54321` 以外だと停止します
