# デモ環境デプロイ手順書

このドキュメントは、ピッチプレゼン用のデモ環境をデプロイする手順を説明します。

## 前提条件

- GitHub アカウント
- Supabase アカウント
- Vercel アカウント
- OpenAI API キー

---

## Phase 1: Supabase デモプロジェクト作成

### 1-1. プロジェクト作成

1. https://supabase.com にアクセスしてログイン
2. 「New Project」をクリック
3. 以下の情報を入力:
   - **Organization**: 既存の組織を選択（なければ作成）
   - **Project Name**: `StudySpark Demo`
   - **Database Password**: 強力なパスワードを生成して保存
   - **Region**: `Northeast Asia (Tokyo)` (ap-northeast-1)
   - **Pricing Plan**: `Free`
4. 「Create new project」をクリック
5. プロジェクト作成完了を待つ（2-3分）

### 1-2. API キーの取得

1. 左サイドバーの「Settings」→「API」を開く
2. 以下の情報をコピーして安全な場所に保存:
   ```
   Project URL: https://xxxxx.supabase.co
   anon public key: eyJhbGci...
   service_role key: eyJhbGci...
   ```

### 1-3. データベースセットアップ

#### Step A: マイグレーション実行

1. Supabase Dashboard の左サイドバー「SQL Editor」を開く
2. 「New query」をクリック
3. このリポジトリの `supabase/migrations/` 内の各ファイルを**日付順に**実行:
   - `20241201000000_initial_schema.sql`
   - `20241201000001_add_rls_policies.sql`
   - `20241202000000_add_encouragement_system.sql`
   - その他のマイグレーションファイルすべて
4. 各ファイルの内容をコピーして SQL Editor に貼り付け、「Run」をクリック
5. エラーが出た場合は内容を確認（"already exists" は無視してOK）

#### Step B: シードデータ投入

1. SQL Editor で新しいクエリを開く
2. `supabase/seed.sql` の内容をコピーして貼り付け
3. 「Run」をクリック
4. マスタデータ（科目、セッション、学習内容タイプなど）が作成される

#### Step C: デモユーザー・データ作成

1. ローカル環境で `.env.demo.local` ファイルを作成:
   ```bash
   cp .env.demo .env.demo.local
   ```

2. `.env.demo.local` に Supabase の情報を記入:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
   OPENAI_API_KEY=sk-...
   ```

3. デモデータ作成スクリプトを実行:
   ```bash
   # 環境変数を読み込んで実行
   export $(cat .env.demo.local | xargs) && npx tsx scripts/setup-demo-db.ts
   ```

4. 以下のデモアカウントが作成されます:
   - 生徒（小5）: `demo-student5` / `demo2025`
   - 生徒（小6）: `demo-student6` / `demo2025`
   - 保護者: `demo-parent@example.com` / `demo2025`

---

## Phase 2: Vercel デプロイ

### 2-1. GitHub リポジトリ確認

1. `demo/pitch-presentation` ブランチが GitHub にプッシュされていることを確認:
   ```bash
   git checkout demo/pitch-presentation
   git push origin demo/pitch-presentation
   ```

### 2-2. Vercel プロジェクト作成

1. https://vercel.com にアクセスしてログイン
2. 「Add New...」→「Project」をクリック
3. GitHub リポジトリ `StudySpark-2025Fall` を選択
4. 以下の設定を行う:
   - **Project Name**: `studyspark-demo`
   - **Framework Preset**: `Next.js` (自動検出されるはず)
   - **Root Directory**: `.` (デフォルト)
   - **Build Command**: `npm run build` (デフォルト)
   - **Output Directory**: `.next` (デフォルト)

### 2-3. Git設定

1. 「Git」セクションで:
   - **Production Branch**: `demo/pitch-presentation` に変更
   - これにより、このブランチへの push が自動デプロイされる

### 2-4. 環境変数設定

1. 「Environment Variables」セクションで以下を追加:

   | Name | Value | Environment |
   |------|-------|-------------|
   | `NEXT_PUBLIC_SUPABASE_URL` | [Supabase Project URL] | Production |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | [Supabase anon key] | Production |
   | `SUPABASE_SERVICE_ROLE_KEY` | [Supabase service_role key] | Production |
   | `OPENAI_API_KEY` | [OpenAI API key] | Production |

2. 「Deploy」をクリック

### 2-5. デプロイ完了

1. デプロイが完了するまで待つ（2-3分）
2. 「Visit」をクリックしてデプロイされたサイトを確認
3. デモアカウントでログインテスト

---

## Phase 3: 動作確認

### 3-1. ログインテスト

1. デプロイされたURL（例: `https://studyspark-demo.vercel.app`）にアクセス
2. 以下のアカウントでログイン:
   - 生徒（小5）: `demo-student5` / `demo2025`
   - 生徒（小6）: `demo-student6` / `demo2025`
   - 保護者: `demo-parent@example.com` / `demo2025`

### 3-2. 機能確認

**生徒画面:**
- [ ] ダッシュボード表示
- [ ] 学習記録（スパーク）入力
- [ ] 目標設定（ゴールナビ）表示
- [ ] 振り返り（リフレクト）表示

**保護者画面:**
- [ ] ダッシュボード表示
- [ ] 生徒の目標閲覧
- [ ] 応援メッセージ送信

---

## Phase 4: 主催者への提出

### 4-1. 提出情報

主催者に以下の情報を提供:

```
【StudySpark デモサイト】

URL: https://studyspark-demo.vercel.app

【デモアカウント】

■ 生徒（小学5年生）
ID: demo-student5
パスワード: demo2025

■ 生徒（小学6年生）
ID: demo-student6
パスワード: demo2025

■ 保護者
メール: demo-parent@example.com
パスワード: demo2025

※ 保護者アカウントでログインすると、上記2名の生徒の学習状況を確認できます
```

---

## Phase 5: デモ版の更新（提出後）

### 5-1. 修正・改善

1. `demo/pitch-presentation` ブランチで作業:
   ```bash
   git checkout demo/pitch-presentation
   ```

2. 修正を実施:
   ```bash
   # ファイルを編集
   git add .
   git commit -m "improve: デモ版の改善"
   git push origin demo/pitch-presentation
   ```

3. Vercel が自動的に再デプロイ（URLは変わらない）

### 5-2. main からの変更を取り込む場合

```bash
git checkout demo/pitch-presentation
git cherry-pick <commit-hash>  # 特定のコミットのみ
# または
git merge main  # main の変更をすべて取り込む
git push origin demo/pitch-presentation
```

---

## Phase 6: 並行開発（main ブランチ）

### 6-1. 通常開発

```bash
git checkout main
# 開発作業
npm run dev  # Local Supabase を使用
```

### 6-2. main ブランチでの開発は Demo に影響しない

- `main` ブランチでの commit/push は Demo 環境に影響しません
- Local Supabase を使用するため、データも完全に分離されます

---

## トラブルシューティング

### デプロイエラーが出る

1. Vercel のログを確認
2. 環境変数が正しく設定されているか確認
3. `demo/pitch-presentation` ブランチが最新か確認

### ログインできない

1. Supabase Dashboard で Auth > Users を確認
2. デモユーザーが作成されているか確認
3. パスワードが正しいか確認（demo2025）

### データが表示されない

1. Supabase Dashboard で Table Editor を確認
2. 学習ログなどのデータが存在するか確認
3. RLS ポリシーが正しく設定されているか確認

---

## 連絡先

問題が発生した場合は、開発チームに連絡してください。
