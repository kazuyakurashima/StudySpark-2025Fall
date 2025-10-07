# 開発フロー図

このドキュメントは、デモ環境と開発環境の並行運用フローを説明します。

## 全体構成図

```
┌─────────────────────────────────────────────────────────────────┐
│                        GitHub Repository                         │
│                   StudySpark-2025Fall                           │
│                                                                  │
│  ┌──────────────────┐              ┌──────────────────┐        │
│  │  main ブランチ    │              │ demo/pitch-      │        │
│  │  (本格開発)       │              │ presentation     │        │
│  │                  │              │ (デモ版)         │        │
│  │ ・全機能開発      │◄─ cherry- ──│                  │        │
│  │ ・指導者機能含む  │   pick      │ ・生徒・保護者    │        │
│  │ ・Local Supabase │              │   機能のみ       │        │
│  │                  │              │ ・デモデータ込み  │        │
│  └──────────────────┘              └──────────────────┘        │
│           │                                  │                  │
└───────────┼──────────────────────────────────┼──────────────────┘
            │                                  │
            │                                  │ Auto Deploy
            │                                  ▼
            │                    ┌──────────────────────────┐
            │                    │   Vercel (Production)    │
            │                    │                          │
            │                    │  studyspark-demo         │
            │                    │  .vercel.app             │
            │                    │                          │
            │                    │  Branch: demo/pitch-     │
            │                    │          presentation    │
            │                    └──────────────────────────┘
            │                                  │
            │                                  │ Connect
            │                                  ▼
            │                    ┌──────────────────────────┐
            │                    │  Supabase (Production)   │
            │                    │                          │
            │                    │  StudySpark Demo         │
            │                    │  Region: Tokyo           │
            │                    │                          │
            │                    │  ・デモユーザー           │
            │                    │  ・デモ学習データ         │
            │                    │  ・マスタデータ           │
            │                    └──────────────────────────┘
            │
            │ npm run dev
            ▼
   ┌────────────────────────┐
   │  Local Development     │
   │                        │
   │  localhost:3000        │
   │                        │
   └────────────────────────┘
            │
            │ Connect
            ▼
   ┌────────────────────────┐
   │  Local Supabase        │
   │                        │
   │  npx supabase start    │
   │  localhost:54321       │
   │                        │
   │  ・開発用データ         │
   │  ・テストデータ         │
   └────────────────────────┘
```

---

## ワークフロー

### 🎯 デモ版の改善・修正（セレクションまでの2週間）

```bash
# 1. デモブランチに切り替え
git checkout demo/pitch-presentation

# 2. 修正・改善作業
# ファイルを編集...

# 3. コミット & プッシュ
git add .
git commit -m "improve: UIの改善"
git push origin demo/pitch-presentation

# 4. Vercel が自動的に再デプロイ（約2-3分）
# → https://studyspark-demo.vercel.app が更新される（URL変わらず）

# 5. デプロイ確認
# Vercel Dashboard でログ確認、実際のサイトで動作確認
```

**特徴:**
- URL は固定（主催者に一度送ればOK）
- push するだけで自動デプロイ
- 本番 Supabase を使用（デモデータ固定）

---

### 💻 本格開発（並行作業）

```bash
# 1. main ブランチに切り替え
git checkout main

# 2. Local Supabase 起動
npx supabase start

# 3. 開発サーバー起動
npm run dev

# 4. 開発作業
# ・指導者機能の実装
# ・新機能追加
# ・リファクタリング
# など

# 5. コミット & プッシュ
git add .
git commit -m "feat: 指導者ダッシュボード実装"
git push origin main

# 6. デモ版には影響しない
# main ブランチの変更は Demo 環境に影響しません
```

**特徴:**
- Local Supabase でデータ完全分離
- デモ環境と独立して開発可能
- 指導者機能など未公開機能も自由に開発

---

### 🔄 main の良い変更を demo に反映

#### パターン A: 特定のコミットのみ取り込む（推奨）

```bash
# 1. main で開発した良い機能のコミットハッシュをコピー
git log main
# 例: abc1234 "improve: ボタンのデザイン改善"

# 2. demo ブランチに切り替え
git checkout demo/pitch-presentation

# 3. 特定のコミットのみ取り込む
git cherry-pick abc1234

# 4. プッシュ
git push origin demo/pitch-presentation
# → Vercel が自動再デプロイ
```

#### パターン B: main の変更をすべて取り込む（慎重に）

```bash
# 1. demo ブランチに切り替え
git checkout demo/pitch-presentation

# 2. main の変更をマージ
git merge main

# 3. コンフリクトがあれば解決
# ファイルを編集...
git add .
git commit -m "merge: main ブランチの変更を取り込み"

# 4. プッシュ
git push origin demo/pitch-presentation
```

**注意:**
- パターン B は main の未完成機能も含まれる可能性があるため注意
- デモ版に影響する変更は慎重に

---

## ブランチ戦略まとめ

| ブランチ | 用途 | デプロイ先 | データベース |
|---------|------|-----------|------------|
| `main` | 本格開発（全機能） | なし（Local） | Local Supabase |
| `demo/pitch-presentation` | デモ版（生徒・保護者のみ） | Vercel Production | Supabase Production |

---

## 環境変数の管理

### Local 開発（main ブランチ）

```bash
# .env.local (Git 管理外)
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci... (Local)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci... (Local)
OPENAI_API_KEY=sk-...
```

### Demo 環境（demo/pitch-presentation ブランチ）

```bash
# Vercel Environment Variables
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci... (Production)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci... (Production)
OPENAI_API_KEY=sk-...
```

---

## データベース管理

### Local Supabase（開発用）

```bash
# マイグレーション適用
npx supabase db reset

# シードデータ投入
npx supabase db seed

# テストユーザー作成
NEXT_PUBLIC_SUPABASE_URL="http://127.0.0.1:54321" \
SUPABASE_SERVICE_ROLE_KEY="..." \
npx tsx scripts/create-test-users.ts
```

### Production Supabase（デモ用）

```bash
# 初回セットアップのみ（DEPLOY_DEMO.md 参照）
# 1. Supabase Dashboard でマイグレーション実行
# 2. seed.sql を実行
# 3. デモユーザー作成スクリプト実行

# .env.demo.local を作成
cp .env.demo .env.demo.local
# 環境変数を記入...

# デモデータ作成
export $(cat .env.demo.local | xargs) && npx tsx scripts/setup-demo-db.ts
```

**注意:**
- Production Supabase は一度セットアップしたら基本的に変更しない
- デモ期間中はデータ固定

---

## セレクション後の本番環境準備

セレクション後、実際のユーザーに提供する本番環境を作成する場合:

### 新規 Supabase プロジェクト作成

1. 新規プロジェクト: `StudySpark Production`
2. マイグレーション実行（Demo と同じ）
3. シードデータのみ投入（デモユーザーは作成しない）

### Vercel 設定変更

- Demo 環境は保持したまま、新しい Vercel プロジェクトを作成
- または、既存プロジェクトの環境変数を本番 Supabase に変更

---

## トラブルシューティング

### デモ版で問題が発生した場合

1. **Vercel ログを確認**
   - Vercel Dashboard > Deployments > 最新デプロイ > Logs

2. **Supabase データを確認**
   - Supabase Dashboard > Table Editor
   - デモユーザーが存在するか確認

3. **環境変数を確認**
   - Vercel Dashboard > Settings > Environment Variables

4. **ロールバック**
   ```bash
   # 前のコミットに戻す
   git revert HEAD
   git push origin demo/pitch-presentation
   ```

### 開発環境で問題が発生した場合

1. **Local Supabase をリセット**
   ```bash
   npx supabase db reset
   ```

2. **Next.js キャッシュをクリア**
   ```bash
   rm -rf .next
   npm run dev
   ```

---

## よくある質問

### Q1: main で開発した機能を即座に demo に反映したい

```bash
git checkout demo/pitch-presentation
git cherry-pick <commit-hash>
git push origin demo/pitch-presentation
```

### Q2: demo での修正を main にも反映したい

```bash
git checkout main
git cherry-pick <demo-commit-hash>
git push origin main
```

### Q3: デモ版のURLを変更したくない

- `demo/pitch-presentation` ブランチの変更のみ push すれば OK
- Vercel の Production Branch が `demo/pitch-presentation` に設定されているため

### Q4: 開発環境とデモ環境でデータが混ざらない？

- 完全に分離されています
- 開発: Local Supabase (localhost:54321)
- デモ: Production Supabase (xxxxx.supabase.co)

---

## まとめ

✅ **デモ版**: `demo/pitch-presentation` ブランチで管理、Vercel 自動デプロイ
✅ **開発版**: `main` ブランチで管理、Local 環境で開発
✅ **データ分離**: Local Supabase と Production Supabase で完全分離
✅ **柔軟な反映**: cherry-pick で選択的に変更を反映可能

この構成により、デモ版を安定運用しながら、並行して本格開発を進められます。
