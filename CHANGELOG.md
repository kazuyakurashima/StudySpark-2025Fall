# Changelog

All notable changes to this project will be documented in this file.

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
  - デモ生徒のパスワード: `demo2025`
  - デモ保護者のパスワード: `Testdemo2025`

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
