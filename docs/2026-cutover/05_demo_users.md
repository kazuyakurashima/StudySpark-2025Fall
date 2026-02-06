# デモユーザー実装計画（2026年度）

## 1. 概要

2026年度の開発・テスト・デモンストレーション用に、専用のデモユーザーを作成する。
本番ユーザーと明確に区別するため、統一された命名規則を採用する。

## 2. デモユーザー一覧

### 2.1 生徒アカウント（3名）

| login_id | パスワード | 名前 | ふりがな | 学年 | コース | メール |
|----------|------------|------|----------|------|--------|--------|
| `demo_yui5` | `Demo2026!` | 山田 結衣 | やまだ ゆい | 5 | B | demo_yui5@studyspark.local |
| `demo_sora6` | `Demo2026!` | 鈴木 空 | すずき そら | 6 | A | demo_sora6@studyspark.local |
| `demo_umi6` | `Demo2026!` | 鈴木 海 | すずき うみ | 6 | B | demo_umi6@studyspark.local |

### 2.2 保護者アカウント（2名）

| メール | パスワード | 名前 | ふりがな | 子ども |
|--------|------------|------|----------|--------|
| `demo_yamada@studyspark.local` | `Demo2026!` | 山田 太郎 | やまだ たろう | demo_yui5 |
| `demo_suzuki@studyspark.local` | `Demo2026!` | 鈴木 花子 | すずき はなこ | demo_sora6, demo_umi6 |

### 2.3 家族構成

```
山田家
├── 保護者: 山田 太郎
└── 子ども: 山田 結衣（小5・Bコース）

鈴木家
├── 保護者: 鈴木 花子
├── 子ども: 鈴木 空（小6・Aコース）【双子】
└── 子ども: 鈴木 海（小6・Bコース）【双子】
```

### 2.4 クイックリファレンス

**生徒ログイン**
```
demo_yui5 / Demo2026!   ← 小5テスト用
demo_sora6 / Demo2026!  ← 小6テスト用（Aコース）
demo_umi6 / Demo2026!   ← 小6テスト用（Bコース）
```

**保護者ログイン**
```
demo_yamada@studyspark.local / Demo2026!  ← 子ども1人
demo_suzuki@studyspark.local / Demo2026!  ← 子ども2人（双子）
```

## 3. 命名規則

### 3.1 プレフィックス

すべてのデモユーザーに `demo_` プレフィックスを付与し、本番ユーザーと明確に区別する。

| 種別 | パターン | 例 |
|------|----------|-----|
| 生徒 login_id | `demo_{名前}{学年}` | demo_yui5 |
| 生徒メール | `demo_{login_id}@studyspark.local` | demo_yui5@studyspark.local |
| 保護者メール | `demo_{姓}@studyspark.local` | demo_yamada@studyspark.local |

### 3.2 コース割り当てルール

| 学年 | コース | 理由 |
|------|--------|------|
| 小5 | B | 標準的な成長段階（Flame）でのUIテスト |
| 小6（1人目） | A | 初心者向けUI（Spark）のテスト |
| 小6（2人目） | B | 成長段階UI（Flame）のテスト |

※ C/Sコースは実際の上位生徒のみ想定のためデモでは使用しない

## 4. 実装仕様

### 4.1 スクリプト

**ファイル**: `scripts/register-demo-users.ts`

**実行方法**:
```bash
npx tsx scripts/register-demo-users.ts
```

**オプション**:
| オプション | 説明 |
|------------|------|
| `--dry-run` | 実際には作成せず、処理内容を表示 |
| `--force` | 確認プロンプトをスキップ |

### 4.2 再実行時の挙動

**方針**: Delete → Recreate（冪等性確保）

```
1. 既存デモユーザーの検索（demo_ prefix でフィルタ）
2. 存在する場合:
   a. parent_child_relations を削除
   b. students / parents を削除
   c. profiles を削除
   d. auth.users を削除（Admin API）
3. 新規作成
```

**理由**:
- Upsertより確実（auth.users のパスワード更新が複雑）
- テスト環境のリセットが簡単
- `demo_` prefix により誤削除を防止

### 4.3 作成順序

```
Phase 1: 認証ユーザー作成
  1-1. 保護者 auth.users 作成（2件）
  1-2. 生徒 auth.users 作成（3件）

Phase 2: プロフィール確認
  ※ トリガーで自動作成されるため確認のみ
  2-1. profiles の role が正しいか確認

Phase 3: ロール別テーブル作成
  3-1. parents テーブルに保護者を挿入（2件）
  3-2. students テーブルに生徒を挿入（3件）

Phase 4: 関係テーブル作成
  4-1. parent_child_relations を挿入（3件）
       - 山田太郎 → demo_yui5
       - 鈴木花子 → demo_sora6
       - 鈴木花子 → demo_umi6

Phase 5: シーケンス更新
  5-1. students_id_seq
  5-2. parents_id_seq
  5-3. parent_child_relations_id_seq
```

### 4.4 出力例

```
=== デモユーザー登録 ===

既存デモユーザーを検索中...
  - 既存: 0件

登録内容:
  保護者: 2名
  生徒:   3名
  関係:   3件

続行しますか？ (y/N): y

[1/5] 保護者認証ユーザー作成...
  ✓ demo_yamada@studyspark.local
  ✓ demo_suzuki@studyspark.local

[2/5] 生徒認証ユーザー作成...
  ✓ demo_yui5
  ✓ demo_sora6
  ✓ demo_umi6

[3/5] parentsテーブル作成...
  ✓ 山田 太郎 (id: 11)
  ✓ 鈴木 花子 (id: 12)

[4/5] studentsテーブル作成...
  ✓ 山田 結衣 (id: 6)
  ✓ 鈴木 空 (id: 7)
  ✓ 鈴木 海 (id: 8)

[5/5] 親子関係作成...
  ✓ 山田太郎 → 山田結衣
  ✓ 鈴木花子 → 鈴木空
  ✓ 鈴木花子 → 鈴木海

=== 完了 ===

シーケンス更新SQL（Supabase SQL Editorで実行）:
  SELECT setval('students_id_seq', COALESCE((SELECT MAX(id) FROM students), 0), true);
  SELECT setval('parents_id_seq', COALESCE((SELECT MAX(id) FROM parents), 0), true);
  SELECT setval('parent_child_relations_id_seq', COALESCE((SELECT MAX(id) FROM parent_child_relations), 0), true);
```

## 5. エラーハンドリング

| エラー | 対応 |
|--------|------|
| 認証ユーザー作成失敗 | 処理中断、作成済みをロールバック |
| profiles未作成 | 手動作成を試行 |
| 重複エラー（非demo_） | 警告表示、スキップ |
| DB接続エラー | 即時中断 |

## 6. 用途別テストシナリオ

### 6.1 生徒機能テスト

| シナリオ | 使用アカウント | 確認ポイント |
|----------|----------------|--------------|
| 小5ダッシュボード | demo_yui5 | 小5向けUIが正しく表示されるか |
| 小6ダッシュボード（Aコース） | demo_sora6 | Sparkコース用UIが表示されるか |
| 小6ダッシュボード（Bコース） | demo_umi6 | Flameコース用UIが表示されるか |
| 学習記録入力 | demo_yui5 | Spark機能の動作確認 |
| 目標設定 | demo_sora6 | ゴールナビの動作確認 |
| 振り返り | demo_umi6 | リフレクト機能の動作確認 |

### 6.2 保護者機能テスト

| シナリオ | 使用アカウント | 確認ポイント |
|----------|----------------|--------------|
| 子ども1人の表示 | demo_yamada | 単一子どもの学習状況表示 |
| 子ども複数の表示 | demo_suzuki | 複数子どもの切り替え・表示 |
| 応援メッセージ送信 | demo_yamada | メッセージ機能の動作確認 |

## 7. 注意事項

1. **本番環境への投入禁止**: デモユーザーは開発・テスト環境専用
2. **パスワード変更禁止**: 共通パスワードを維持（チーム共有のため）
3. **データ削除時の注意**: `demo_` prefix でフィルタして削除すること
4. **年度更新時**: 学年繰り上げ対象外とし、固定の学年を維持

## 8. 更新履歴

| 日付 | 更新者 | 内容 |
|------|--------|------|
| 2026-02-04 | Claude Code | 初版作成 |
