# Changelog

All notable changes to this project will be documented in this file.

## [2025-11-14] - Daily AI Features with Langfuse Integration

### Added

#### 保護者向け「今日の様子」機能
- **Cronジョブによる毎日自動生成**
  - 毎日午前3時（JST）に全生徒の前日分メッセージを自動生成
  - Vercel Cronで実行（`vercel.json`設定済み）
  - 実装ファイル: `app/api/cron/generate-parent-status/route.ts`

- **キャッシュ戦略とメタデータ分離**
  - 「昨日の様子です」プレフィックスをメタデータとして保存
  - 3段階キャッシュロジック: 今日のキャッシュ → 今日のログ → 昨日のキャッシュ
  - 実装ファイル: `app/actions/parent-dashboard.ts` (`getTodayStatusMessageAI`)

- **Langfuse統合**
  - LLM呼び出しのトレース記録機能
  - ローカル環境用プロジェクト「StudySpark-Local」
  - 本番環境用プロジェクト「StudySpark-Production」（要作成）
  - 実装ファイル:
    - `lib/langfuse/client.ts`
    - `lib/langfuse/daily-status.ts`

#### セキュリティとアクセス制御
- **ai_cacheテーブルにstudent_idカラム追加**
  - RLS（Row Level Security）ポリシーで保護者が自分の子どものキャッシュのみ読取可能
  - マイグレーション: `supabase/migrations/20251114000002_add_student_id_to_ai_cache.sql`

- **parent_students VIEWの作成**
  - PostgREST JOINクエリ用のビュー
  - parent_child_relationsとstudentsテーブルを結合
  - マイグレーション: `supabase/migrations/20251114000001_create_parent_students_view.sql`

#### テストデータ
- **2家族分のシードスクリプト**
  - 星野家と青空家の合計3生徒
  - 過去7日分の学習ログ自動生成
  - 実装ファイル: `scripts/seed-2families-data.ts`

### Changed

#### プロフィール作成トリガー改善
- `user_metadata.full_name`から`display_name`を自動設定
- `nickname`は後からUPDATEで正しい名前に上書き
- シードスクリプトで`role`と`full_name`を設定

#### Cron認証強化
- `CRON_SECRET`環境変数による認証
- 未認証リクエストは401 Unauthorizedを返却

### Fixed
- 生徒・保護者名が「ユーザーXXXX」と表示される問題を修正
- RLSによりキャッシュが読めず常にフォールバックメッセージが表示される問題を修正

### Documentation
- **本番デプロイ手順書**: `docs/DEPLOYMENT_PLAN_DAILY_AI.md`
  - 段階的デプロイフロー
  - 環境変数設定手順
  - マイグレーション適用方法
  - トラブルシューティング

---

## [2025-11-12] - Reflect Coaching Improvements & Test Data Setup

### Added

#### 振り返りコーチング機能の改善
- **クロージングメッセージ検出による自動終了**
  - AIコーチのクロージングメッセージを検出し、自動的に振り返りセッションを終了
  - ユーザーが「はい」と答えても対話が継続しない仕様に変更
  - 実装ファイル: `app/student/reflect/reflect-chat.tsx`

- **コーチング履歴の実対話表示**
  - 従来の偽のGROWモデルサマリーを削除
  - 実際の対話履歴（1問1答形式）を折りたたみ式で表示
  - デフォルトで非表示、「対話の詳細を見る」ボタンで展開可能
  - 実装ファイル: `app/student/reflect/coaching-history.tsx`

- **コーチング履歴の自動更新機能**
  - 振り返り完了後、ページをリロードせずに自動的にコーチング履歴を更新
  - `refreshTrigger` プロップによる親子間通信で実装
  - 実装ファイル:
    - `app/student/reflect/page.tsx` (親コンポーネント)
    - `app/student/reflect/coaching-history.tsx` (子コンポーネント)

#### テストデータ管理
- **テストユーザーシードスクリプト**
  - 15組の保護者アカウント（デモ2組 + テスト13組）
  - 19人の生徒アカウント（デモ3人 + テスト16人）
  - ランダムアバター割り当て機能
  - 全生徒をコースAに設定
  - 実装ファイル: `scripts/seed-test-users.ts`

- **デモアカウント**
  - 星野家: 保護者（星野一朗）と生徒2名（明・光）
  - 青空家: 保護者（青空太郎）と生徒1名（花）
  - デモ生徒のパスワード: `<社内管理>`
  - デモ保護者のパスワード: `<社内管理>`

### Changed

#### UIコンポーネント
- Radix UI Collapsible コンポーネントの追加
  - 実装ファイル: `components/ui/collapsible.tsx`
  - コーチング履歴の対話詳細表示に使用

### Fixed

- クロージングメッセージ後も対話が継続してしまう問題を修正
- コーチング履歴が振り返り完了後に自動更新されない問題を修正
- GROWサマリーと実際の対話内容が一致しない問題を修正

### Technical Details

#### 実装パターン

1. **クロージングメッセージ検出**
```typescript
const isClosingMessage = (content: string): boolean => {
  const closingPatterns = [
    /振り返りはこれで完了/,
    /また.*土曜日.*一緒に振り返ろう/,
    /また来週も.*楽しみにしてる/,
    /決めた行動を忘れずに.*来週も/,
  ]
  return closingPatterns.some(pattern => pattern.test(content))
}
```

2. **自動更新トリガーパターン**
```typescript
// 親コンポーネント
const [coachingHistoryRefresh, setCoachingHistoryRefresh] = useState(0)
const handleComplete = () => {
  setCoachingHistoryRefresh(prev => prev + 1)
}

// 子コンポーネント
useEffect(() => {
  loadHistory()
}, [periodFilter, refreshTrigger])
```

#### データベーススキーマの確認事項

- `profiles` テーブルは `handle_new_user()` トリガーで自動作成
- `parent_child_relations` テーブル（旧名 `parent_student_relations` ではない）
- `furigana` カラム（旧名 `full_name_kana` ではない）

### Migration Notes

シードスクリプト実行時の注意:
- 既存のauth.usersレコードは保護者・生徒ともに削除される
- 学習記録、応援メッセージ、テスト目標/結果、コーチングセッションも全削除
- `npx tsx scripts/seed-test-users.ts` で実行

---

## How to Use This Changelog

このCHANGELOGは [Keep a Changelog](https://keepachangelog.com/ja/1.0.0/) フォーマットに準拠しています。

### カテゴリ
- **Added**: 新機能
- **Changed**: 既存機能の変更
- **Deprecated**: 今後削除予定の機能
- **Removed**: 削除された機能
- **Fixed**: バグ修正
- **Security**: セキュリティ関連
