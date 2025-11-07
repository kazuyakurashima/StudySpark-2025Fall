# 本番環境デプロイログ

## 2025-11-07: ハートバッジ機能デプロイ + 緊急修正

### 対応内容

#### Phase 1: ハートバッジ機能の本番デプロイ
- **ブランチ**: `feature/parent-dashboard-improvements` → `main`
- **機能**: 保護者から生徒へのハートバッジ送信機能
- **コミット**: `16fda56`

#### Phase 2: Next.js 15 ビルドエラー対応
- **問題**: `cookies()` が async になり、ビルド失敗
- **対応**:
  - `lib/supabase/server.ts` を async 化
  - 全 Server Actions で `await createClient()` に修正
  - Sentry 一時無効化（`<Html>` タグ競合）

#### Phase 3: 本番環境で子供が表示されない問題
- **症状**: 保護者ダッシュボードで子供が0件表示
- **原因**: SECURITY DEFINER 関数と RLS ポリシーが本番環境に未適用
- **対応**: 手動 SQL 実行
  - SECURITY DEFINER 関数 7個作成
  - RLS ポリシー追加（profiles, students, parent_child_relations）
- **参考ドキュメント**: [PRODUCTION_RECOVERY_GUIDE.md](PRODUCTION_RECOVERY_GUIDE.md)

#### Phase 4: 生徒の学習記録で500エラー
- **症状**: `/student/spark` で "Cannot read properties of undefined (reading 'getUser')"
- **原因**: `app/student/spark/page.tsx:10` で `await` 漏れ
- **対応**: `const supabase = await createClient()` に修正
- **コミット**: `6402e9c`

---

### 本番環境に手動適用した SQL

以下の SQL を Supabase Dashboard → SQL Editor から実行済み：

1. **SECURITY DEFINER 関数（7個）**
   - `current_student_id()`
   - `current_parent_id()`
   - `current_coach_id()`
   - `get_children_user_ids()`
   - `get_children_student_ids()`
   - `get_assigned_students_user_ids()`
   - `get_assigned_student_ids()`

2. **RLS ポリシー**
   - profiles テーブル: 保護者/指導者が子供/担当生徒を閲覧可能
   - students テーブル: 保護者/指導者が子供/担当生徒を閲覧可能
   - parent_child_relations テーブル: 保護者が自分の親子関係を閲覧可能

詳細な SQL は [PRODUCTION_RECOVERY_GUIDE.md](PRODUCTION_RECOVERY_GUIDE.md) を参照。

---

### 教訓

1. **Next.js 15 対応時は全ファイルで `await createClient()` を徹底**
   - Server Component では必須
   - Client Component では不要（同期関数として動作）

2. **本番環境はマイグレーション管理外**
   - `supabase_migrations` テーブルが存在しない
   - スキーマ変更は全て手動 SQL 実行が必要
   - マイグレーションファイルを参考に手動適用

3. **デプロイ前に本番環境の診断クエリを実行**
   - SECURITY DEFINER 関数の存在確認
   - RLS ポリシーの存在確認
   - テストデータの存在確認

4. **Vercel ログは詳細な行数まで特定可能**
   - `app/student/spark/page.js:24:8282` のように具体的
   - Runtime Logs タブを活用

---

### 次回への TODO

- [ ] Sentry を v8 に移行して再有効化
- [ ] 本番環境のマイグレーション管理方法を確立
- [ ] デプロイ前チェックリストの自動化検討
