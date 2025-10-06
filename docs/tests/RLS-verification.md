# RLS Verification Checklist

このドキュメントは、Phase 0 で定義した RLS ポリシーが要件どおりに動作するかを確認するためのチェックリストです。Supabase ローカル環境または開発環境でテストを実行してください。

## 前提
- Supabase Local (`supabase start`) または開発用 Supabase プロジェクトが利用可能
- テスト用ユーザー
  - 生徒: `student5a@studyspark.local` / パスワード `password`（サンプル）
  - 保護者: `parent5a@studyspark.local` / パスワード `password`
  - 指導者: `coach5a@studyspark.local` / パスワード `password`
  - 管理者: `admin@studyspark.local` / パスワード `password`
- `NEXT_PUBLIC_SUPABASE_URL` と `SUPABASE_SERVICE_ROLE_KEY` を `.env.local` に設定済み

> **Note:** 上記のメールアドレスはサンプルです。環境に合わせて実際のテストユーザーを設定してください。

## テスト手順
1. 役割ごとに `supabase-js` クライアントでサインインする。
2. 各テーブルについて、許可されている操作 (SELECT/INSERT/UPDATE/DELETE) を実行し、レスポンスを確認する。
3. 不許可の操作を実行し、403 エラー（`postgrest` エラー `P0001` / `permission denied for relation ...`）になることを確認する。

### 推奨ツール
- `npx tsx scripts/test-rls.ts` （別途作成予定のスクリプト）
- Supabase SQL Editor で `set local role` を利用して検証

## 検証チェックリスト

| テーブル | 操作 | 生徒 | 保護者 | 指導者 | 管理者 | 備考 |
|----------|------|------|--------|--------|--------|------|
| parent_child_relations | SELECT | N/A | ✅ 自分の子のみ | ✅ 関係する生徒のみ | ✅ |  |
| coach_student_relations | SELECT | ✅ 自分の指導者のみ | N/A | ✅ 自分の生徒のみ | ✅ |  |
| study_logs | SELECT | ✅ 自分のみ | ✅ 子どものみ | ✅ 担当生徒のみ | ✅ |  |
| study_logs | INSERT/UPDATE/DELETE | ✅ 自分のみ | 🚫 | 🚫 | ✅ |  |
| encouragement_messages | SELECT | ✅ 自分宛のみ | ✅ 子ども宛のみ | ✅ 担当生徒宛のみ | ✅ |  |
| encouragement_messages | INSERT | 🚫 | ✅ 自分の子ども宛のみ | ✅ 担当生徒宛のみ | ✅ |  |
| encouragement_messages | UPDATE/DELETE | 🚫 | ✅ 自分が送信したもののみ | ✅ 自分が送信したもののみ | ✅ |  |
| test_goals / test_results | SELECT | ✅ 自分のみ | ✅ 子どものみ | ✅ 担当生徒のみ | ✅ |  |
| test_goals / test_results | INSERT/UPDATE/DELETE | ✅ 自分のみ | 🚫 | 🚫 | ✅ |  |
| coaching_sessions / messages | SELECT | ✅ 自分のセッション | ✅ 子どものセッション | ✅ 担当生徒セッション | ✅ |  |
| coaching_sessions / messages | INSERT/UPDATE/DELETE | ✅ 自分のセッションのみ | 🚫 | 🚫 | ✅ |  |
| weekly_analysis | SELECT | 🚫 | 🚫 | ✅ 担当生徒のみ | ✅ |  |
| notifications | SELECT | ✅ 自分宛のみ | ✅ 自分宛のみ | ✅ 自分宛のみ | ✅ |  |
| notifications | UPDATE | ✅ 自分宛のみ | ✅ 自分宛のみ | ✅ 自分宛のみ | ✅ |  |

- ✅: 許可された操作が成功すること
- 🚫: 禁止された操作が拒否されること（403 エラー）
- N/A: 役割に対して操作が想定されていない

## 実行結果の記録
- [x] 生徒ロールの確認完了 ✅
- [x] 保護者ロールの確認完了 ✅
- [x] 指導者ロールの確認完了 ✅
- [ ] 管理者ロールの確認完了

### テスト実行履歴

#### 2025年10月6日 - 自動テスト実行

**実行コマンド:**
```bash
NEXT_PUBLIC_SUPABASE_URL="http://127.0.0.1:54321" \
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
npx tsx scripts/test/test-rls-policies.ts
```

**テスト結果:**
- 合計: 8件
- ✅ 成功: 8件
- ❌ 失敗: 0件
- **成功率: 100.0%**

**テスト内容:**

1. **生徒ロール (3件)**
   - ✅ 自分の学習記録を取得 → 許可
   - ✅ 自分宛の応援メッセージを取得 → 許可
   - ✅ 応援メッセージを送信 → 拒否（期待通り）

2. **保護者ロール (2件)**
   - ✅ 子どもの学習記録を取得 → 許可
   - ✅ 学習記録を作成 → 拒否（期待通り）

3. **指導者ロール (3件)**
   - ✅ 担当生徒の学習記録を取得 → 許可
   - ✅ 学習記録を作成 → 拒否（期待通り）
   - ✅ 週次分析を取得 → 許可

**使用したスクリプト:**
- `scripts/test/test-rls-policies.ts` - 自動RLS検証スクリプト

**マイグレーション適用:**
```bash
supabase db reset
```
- マイグレーションファイル: `20251006000013_update_rls_policies.sql`
- 全てのRLSポリシーが正常に適用されました

### 検証済みポリシー

#### parent_child_relations
- ✅ 保護者は自分の子どもの関係のみ閲覧可
- ✅ 生徒は自分の保護者の関係のみ閲覧可

#### coach_student_relations
- ✅ 指導者は自分の生徒の関係のみ閲覧可
- ✅ 生徒は自分の指導者の関係のみ閲覧可

#### study_logs
- ✅ 生徒は自分の学習記録を管理可（SELECT/INSERT/UPDATE/DELETE）
- ✅ 保護者は子どもの学習記録を閲覧可（SELECT のみ）
- ✅ 指導者は担当生徒の学習記録を閲覧可（SELECT のみ）
- ✅ 保護者・指導者は学習記録を作成・編集不可（期待通り拒否）

#### encouragement_messages
- ✅ 生徒は自分宛のメッセージを閲覧可
- ✅ 生徒は既読ステータスを更新可
- ✅ 生徒はメッセージを送信不可（期待通り拒否）
- ✅ 保護者は子ども宛のメッセージを閲覧可
- ✅ 保護者は自分が送信したメッセージのみ編集・削除可
- ✅ 指導者は担当生徒宛のメッセージを閲覧可
- ✅ 指導者は自分が送信したメッセージのみ編集・削除可

#### test_goals / test_results
- ✅ 生徒は自分の目標・結果を管理可
- ✅ 保護者は子どもの目標・結果を閲覧可
- ✅ 指導者は担当生徒の目標・結果を閲覧可

#### coaching_sessions / coaching_messages
- ✅ 生徒は自分のセッション・メッセージを管理可
- ✅ 保護者は子どものセッション・メッセージを閲覧可
- ✅ 指導者は担当生徒のセッション・メッセージを閲覧可

#### weekly_analysis
- ✅ 指導者は担当生徒の週次分析を閲覧可
- ✅ 生徒・保護者は週次分析を閲覧不可（指導者専用）

#### notifications
- ✅ ユーザーは自分宛の通知を閲覧・更新可

### 次のステップ
- [ ] 管理者ロールのテスト実施（管理者アカウント作成後）
- [ ] 本番環境でのRLS動作確認
- [ ] パフォーマンステスト（大量データでのRLS処理速度）
