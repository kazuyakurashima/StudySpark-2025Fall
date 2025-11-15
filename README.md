# StudySpark

**中学受験を目指す小学6年生向けの学習支援Webアプリケーション**

[![Built with Next.js](https://img.shields.io/badge/Built%20with-Next.js%2014-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![Powered by Supabase](https://img.shields.io/badge/Powered%20by-Supabase-3ECF8E?style=for-the-badge&logo=supabase)](https://supabase.com/)
[![AI by OpenAI](https://img.shields.io/badge/AI%20by-OpenAI-412991?style=for-the-badge&logo=openai)](https://openai.com/)

---

## 📖 概要

StudySparkは、中学受験を目指す小学5〜6年生のための学習支援アプリです。AIコーチング、学習記録、応援機能を通じて、生徒・保護者・指導者をサポートします。

### 主な特徴

- 🤖 **AIコーチング** - GROWモデルに基づく週次振り返りと目標設定
- 📊 **学習記録** - 日々の学習を簡単に記録・可視化
- 💪 **応援機能** - 保護者・指導者からのメッセージで学習をサポート
- 🎯 **目標管理** - SMART原則に基づく目標設定と進捗管理
- 📈 **可視化** - GitHub風ヒートマップで学習習慣を可視化

---

## 🎯 プロジェクト進捗

**最終更新:** 2025年11月14日

> 🎉 **最新の成果 (Phase 1 Day 6 + 本番デプロイ完了):**
> - **Langfuse統合完了** - AI生成の可観測性とトレーシング実装
> - **日次AI機能実装** - 保護者向け「今日の様子」メッセージ自動生成
> - **Vercel Cron Job実装** - 毎日18時に自動メッセージ生成
> - **本番環境に17家族データ投入** - 19学生のテストデータ完備
> - **全マイグレーション適用完了** - 本番環境とローカル環境の完全同期

### 本番環境ステータス

| 項目 | 状態 |
|------|------|
| **デプロイ環境** | ✅ Vercel (https://www.studyspark.jp) |
| **データベース** | ✅ Supabase本番環境 |
| **Cron Job** | ✅ 17保護者×19学生対応完了 |
| **AI統合** | ✅ OpenAI GPT-4o-mini + Langfuse |
| **テストデータ** | ✅ 17家族、512件の学習ログ |

### ロール別完成度

| ロール | 完成度 | 実用性 | 本番稼働 | 状態 |
|--------|--------|--------|----------|------|
| **生徒** | **95%** | ★★★★★ | ✅ | 即使用可能 |
| **保護者** | **95%** | ★★★★★ | ✅ | 即使用可能 |
| **指導者** | **10%** | ★☆☆☆☆ | ⚠️ | 応援機能のみ |
| **管理者** | **0%** | ☆☆☆☆☆ | ❌ | 未実装 |


---

## 🚀 技術スタック

### フロントエンド
- **Next.js 14.2.18** (App Router)
- **React 18.3.1**
- **TypeScript 5.5.4**
- **Tailwind CSS 4.1.9**

### バックエンド
- **Supabase** (PostgreSQL, Auth, Realtime)
- **Supabase RLS** (Row Level Security)

### AI・可観測性
- **OpenAI GPT-4o-mini** (AIコーチング)
- **Langfuse** (LLM可観測性・トレーシング)

### UI/UX
- **Radix UI** (アクセシブルなUIコンポーネント)
- **React Hook Form + Zod** (フォームバリデーション)
- **Recharts** (データ可視化)
- **Noto Sans JP** (日本語フォント)

---

## 📁 プロジェクト構成

```
StudySpark-2025Fall/
├── app/                      # Next.js App Router
│   ├── student/              # 生徒画面
│   │   ├── page.tsx          # ダッシュボード
│   │   ├── spark/            # 学習記録入力
│   │   ├── goal/             # 目標設定（ゴールナビ）
│   │   └── reflect/          # 週次振り返り（リフレクト）
│   ├── parent/               # 保護者画面
│   │   ├── page.tsx          # ダッシュボード
│   │   ├── encouragement/    # 応援機能
│   │   ├── goal-navi/        # 目標閲覧
│   │   └── reflect/          # 振り返り閲覧
│   ├── coach/                # 指導者画面
│   │   ├── page.tsx          # ダッシュボード
│   │   └── encouragement/    # 応援機能
│   ├── actions/              # Server Actions
│   │   ├── spark.ts          # 学習記録
│   │   ├── goal.ts           # 目標管理
│   │   ├── reflect.ts        # 振り返り
│   │   ├── encouragement.ts  # 応援
│   │   └── parent.ts         # 保護者用
│   └── api/                  # API Routes
│       ├── goal/             # 目標API
│       ├── reflect/          # 振り返りAPI
│       └── cron/             # Cron Jobs (Vercel)
│           ├── generate-coach-messages/  # 生徒向けコーチメッセージ
│           └── generate-parent-status/   # 保護者向け今日の様子
├── lib/                      # ライブラリ
│   ├── supabase/             # Supabaseクライアント
│   └── openai/               # OpenAI統合
│       ├── client.ts         # クライアント設定
│       ├── prompts.ts        # プロンプト定義
│       ├── goal-coaching.ts  # 目標設定AI
│       └── reflect-coaching.ts # 振り返りAI
├── components/               # Reactコンポーネント
│   ├── ui/                   # UIコンポーネント（Radix UI）
│   ├── bottom-navigation.tsx # 生徒用ナビゲーション
│   ├── parent-bottom-navigation.tsx
│   └── coach-bottom-navigation.tsx
├── supabase/                 # Supabaseプロジェクト
│   ├── migrations/           # データベースマイグレーション
│   └── seed.sql              # シードデータ
├── docs/                     # ドキュメント
│   ├── 01-Concept.md         # コンセプト
│   ├── 02-Requirements-Auth.md
│   ├── 03-Requirements-Student.md
│   ├── 04-Requirements-Parent.md
│   ├── 05-Requirements-Coach.md
│   └── tasks/                # タスク管理
│       ├── TASK_MANAGEMENT.md # 全体進捗とタスク一覧
│       └── ROLE-COMPLETION-STATUS.md # ロール別完成度
└── scripts/                  # スクリプト
    ├── seed-2families-data.ts         # 2家族テストデータ投入
    ├── seed-15families-production.ts  # 15家族本番データ投入
    ├── verify-production-parents.ts   # 本番保護者データ確認
    ├── verify-production-schema.ts    # 本番スキーマ検証
    ├── verify-migrations-applied.ts   # マイグレーション適用確認
    ├── check-daily-status-cache.ts    # daily_statusキャッシュ確認
    └── test-parent-query.ts           # parent_studentsクエリテスト
```

---

## 🏃 セットアップ＆起動

### 前提条件

- Node.js 18.x以上
- pnpm (推奨) または npm
- Docker Desktop (Supabaseローカル環境用)

### 1. リポジトリのクローン

```bash
git clone <repository-url>
cd StudySpark-2025Fall
```

### 2. 依存関係のインストール

```bash
pnpm install
# または
npm install
```

### 3. Supabaseローカル環境の起動

```bash
npx supabase start
```

### 4. 環境変数の設定

`.env.local` ファイルを作成（Supabase起動時に表示される値を使用）:

```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
OPENAI_API_KEY=<your-openai-api-key>
```

### 5. テストユーザーの作成

```bash
NEXT_PUBLIC_SUPABASE_URL="http://127.0.0.1:54321" \
SUPABASE_SERVICE_ROLE_KEY="<your-service-role-key>" \
npx tsx scripts/create-test-users.ts
```

### 6. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開きます。

---

## 🧪 テスト

### テストユーザー（本番環境）

本番環境 (https://www.studyspark.jp) で以下のアカウントでログイン可能です:

#### 保護者（17家族）
- **デモアカウント:** `toshin.hitachi+test001@gmail.com` / **パスワード:** `Testdemo2025`（青空太郎）
- **デモアカウント:** `toshin.hitachi+test002@gmail.com` / **パスワード:** `Testdemo2025`（星野一朗）
- **追加テストアカウント:** `toshin.hitachi+test010@gmail.com` ～ `test024@gmail.com`（15家族、パスワードは別途管理）

#### 生徒（19名）
- **デモアカウント:** `hana6` / **パスワード:** `demo2025`（青空花・小6・Bコース）
- **デモアカウント:** `akira5` / **パスワード:** `demo2025`（星野明・小5・Bコース）
- **デモアカウント:** `hikaru6` / **パスワード:** `demo2025`（星野光・小6・Aコース）
- **追加テストアカウント:** その他16名（ログインID: `mao5`, `ことのか5`, `いち5`, `はるき5`, `ななこ5`, `ともき5`, `しゅうへい5`, `たくみ6`, `たいよう6`, `としたか6`, `みやこ6`, `しょうや6`, `まなと6`, `ともえ6`, `みすず6`, `そうま6`）パスワードは別途管理

### 本番環境検証スクリプト

```bash
# 本番環境の保護者データ確認
env NEXT_PUBLIC_SUPABASE_URL='https://zlipaeanhcslhintxpej.supabase.co' \
SUPABASE_SERVICE_ROLE_KEY='<your-service-role-key>' \
npx tsx scripts/verify-production-parents.ts

# 本番環境のスキーマ検証
npx tsx scripts/verify-production-schema.ts

# マイグレーション適用確認
npx tsx scripts/verify-migrations-applied.ts

# daily_statusキャッシュ確認
npx tsx scripts/check-daily-status-cache.ts
```

---

## 📚 主要機能

### 生徒機能（85%完成）

#### ✅ ダッシュボード (95%)
- AIコーチからの個別メッセージ
- 今日のミッション（科目ローテーション）
- 学習カレンダー（GitHub風ヒートマップ）
- 科目別進捗バー
- 応援メッセージ表示
- 学習履歴表示

#### ✅ スパーク/学習記録 (100%)
- 学習回・科目・学習内容選択
- 正答数/問題数入力
- リアルタイム正答率計算
- 今日の振り返り入力
- 復習週対応

#### ✅ ゴールナビ/目標設定 (90%)
- テスト選択（学年別）
- コース・組設定
- **AI対話（6ステップGROWモデル）**
  1. 目標確認
  2. 感情探索
  3. 共同体感覚
  4. 自己認識
  5. 予祝（未来から今へ）
  6. まとめ生成
- 「今回の思い」自動生成（SMART原則）
- 目標保存・更新

#### ✅ リフレクト/週次振り返り (90%)
- 利用可能時間制御（土曜12:00〜水曜23:59）
- **週タイプ判定**
  - 成長週（正答率10%以上UP）
  - 安定週（正答率±10%以内）
  - 挑戦週（正答率10%以上DOWN）
  - 特別週（テスト直前）
- **AI対話（3〜6往復、週タイプ別適応）**
- 振り返りサマリー自動生成
- LINEライクなチャットUI
- 4タブ構成（達成マップ/学習履歴/応援履歴/コーチング履歴）

### 保護者機能（95%完成）

#### ✅ ダッシュボード (95%)
- **「今日の様子」メッセージ** - Cronジョブで毎日18時自動生成
- AIによる学習状況分析と保護者向けメッセージ
- 子ども選択タブ
- 学習カレンダー表示
- 応援メッセージ履歴

#### ✅ 応援機能 (95%)
- クイック応援（3種類のアイコン）
- AI応援メッセージ生成（3パターン）
- カスタムメッセージ送信
- フィルター・ソート機能

#### ✅ ゴールナビ閲覧 (95%)
- 子どもの目標閲覧（読み取り専用）
- 子ども切り替えタブ

#### ✅ リフレクト閲覧 (95%)
- 子どもの振り返り閲覧（AIコーチング除外）
- 4タブ構成

### 指導者機能（5%完成）

#### ✅ 応援機能 (95%)
- 担当生徒への応援メッセージ送信
- AI応援メッセージ生成

#### ⏳ 未実装
- ダッシュボード
- 生徒一覧・詳細
- 分析ツール

---

## 🔑 AIコーチングの特徴

### GROWモデル
**Goal → Reality → Options → Will** の4段階で生徒の自己理解と成長を促します。

### セルフコンパッション
結果ではなく**努力**を称賛し、プレッシャーを与えない対話を実現。

### 成長マインドセット
能力は固定的ではなく、**努力と学習で成長できる**という考え方を基盤とします。

### 適応的対話
週タイプ（成長週/安定週/挑戦週/特別週）に応じて質問を調整し、生徒一人ひとりに最適な対話を提供。

---

## 📊 データベース構成

### 主要テーブル

- **profiles** - ユーザープロファイル
- **students** - 生徒情報
- **parents** - 保護者情報
- **coaches** - 指導者情報
- **parent_child_relations** - 親子関係（多対多）
- **coach_student_relations** - 指導者-生徒関係（多対多）
- **study_logs** - 学習記録
- **test_goals** - テスト目標
- **coaching_sessions** - コーチングセッション
- **coaching_messages** - コーチングメッセージ
- **encouragement_messages** - 応援メッセージ
- **ai_cache** - AIメッセージキャッシュ
- **langfuse_traces** - Langfuseトレーシング
- **parent_students** (VIEW) - 保護者-生徒関係ビュー

### RLS (Row Level Security)

全テーブルでRLSが有効化されており、ユーザーは自分のデータのみアクセス可能です。

---

## 🎯 最新機能

### Vercel Cron Jobs（自動化タスク）

毎日18時（JST）に以下のCronジョブが自動実行されます：

1. **生徒向けコーチメッセージ生成** (`/api/cron/generate-coach-messages`)
   - 全生徒に対して個別最適化されたAIコーチメッセージを生成
   - 学習履歴、トレンド、連続学習日数などを分析

2. **保護者向け「今日の様子」メッセージ生成** (`/api/cron/generate-parent-status`)
   - 全保護者に対して子どもの学習状況をAIで分析
   - 昨日の学習ログ、週次トレンド、振り返りコメントを統合
   - **17保護者×19学生対応完了**

### Langfuse統合

すべてのAI生成（目標設定、振り返り、応援、日次メッセージ）でLangfuseトレーシングを実装：

- プロンプト・レスポンスの記録
- トークン使用量の追跡
- パフォーマンス分析
- キャッシュヒット率の可視化

---

## 📝 ドキュメント

### 開発管理
- [タスク管理・全体進捗](./docs/tasks/TASK_MANAGEMENT.md)
- [ロール別完成度レポート](./docs/tasks/ROLE-COMPLETION-STATUS.md)

### 要件定義
- [コンセプト](./docs/01-Concept.md)
- [認証要件](./docs/02-Requirements-Auth.md)
- [生徒機能要件](./docs/03-Requirements-Student.md)
- [保護者機能要件](./docs/04-Requirements-Parent.md)
- [指導者機能要件](./docs/05-Requirements-Coach.md)

---

## 🤝 コントリビューション

現在このプロジェクトは開発中です。

---

## 📜 ライセンス

このプロジェクトは非公開プロジェクトです。

---

## 📞 お問い合わせ

プロジェクトに関するお問い合わせは、プロジェクトオーナーまでお願いします。

---

**Built with ❤️ by StudySpark Team**

**最終更新:** 2025年11月14日
