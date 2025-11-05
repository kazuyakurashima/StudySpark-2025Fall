# Service Role 削除 TODO リスト

## 完了項目 ✅

### Phase 1: クライアント側のService Role排除
- ✅ `lib/hooks/use-user-profile.tsx` - UserProfileProviderへ初期データprops追加
- ✅ `app/parent/page.tsx` - サーバーコンポーネント化
- ✅ `app/parent/dashboard-client.tsx` - クライアントコンポーネント分離

### Phase 2: 保護者ダッシュボードのService Role完全排除
- ✅ `app/actions/parent-dashboard.ts` - createAdminClient()完全削除（11箇所）
- ✅ RLSポリシー追加:
  - ✅ `students` テーブル（保護者が子供のプロフィールを閲覧可能）
  - ✅ `profiles` テーブル（保護者/指導者が子供/担当生徒のprofilesを閲覧可能）
  - ✅ `parent_child_relations` テーブル（保護者/生徒が関係を閲覧可能）
  - ✅ マスタデータ（study_sessions, subjects, study_content_types, problem_counts）
- ✅ RLS無限再帰問題の解決:
  - ✅ SECURITY DEFINER関数を使用した完全修正
  - ✅ 4つの新関数追加（get_children_user_ids, get_assigned_students_user_ids, get_children_student_ids, get_assigned_student_ids）
  - ✅ すべてのJOIN処理を関数内に封じ込め
  - ✅ 循環参照の完全解消
- ✅ テスト完了:
  - ✅ 保護者が子供のデータにアクセス可能（RLS経由）
  - ✅ 無限再帰エラーなし
  - ✅ デモデータ作成・検証済み
- ✅ マイグレーション:
  - ✅ `20251102000001_add_parent_students_rls.sql` - 基本RLS追加
  - ✅ `20251102000002_add_profiles_rls_for_parents_coaches.sql` - profiles RLS追加
  - ✅ `20251105000001_fix_rls_infinite_recursion.sql` - parent_child_relations修正
  - ✅ `20251105000002_fix_profiles_rls_recursion.sql` - profiles修正（中間版）
  - ✅ `20251105000003_complete_rls_fix.sql` - 完全修正版

## 未対応項目（今後のフェーズで対応）

### ファイル: `app/actions/encouragement.ts`
**Service Role使用箇所**:
- 応援メッセージ送信機能
- 保護者/指導者が子供/担当生徒へメッセージを送信

**必要なRLSポリシー**:
- `encouragement_messages` テーブル（既存ポリシーあり、要確認）

**優先度**: 中

---

### ファイル: `app/actions/parent.ts`
**Service Role使用箇所**:
- 保護者関連の各種機能

**必要な対応**:
- 既存RLSポリシーの確認
- 必要に応じてポリシー追加

**優先度**: 中

---

### ファイル: `lib/utils/daily-spark.ts`
**Service Role使用箇所**:
- 日次スパーク処理

**必要な対応**:
- バッチ処理のためService Roleが妥当かどうか検討
- ユーザーコンテキスト不要な処理の可能性あり

**優先度**: 低（バッチ処理のため）

---

## 実装方針

1. **段階的移行**: 機能ごとに順次RLS化
2. **テスト重視**: 各段階でローカル環境での動作確認を徹底
3. **ロールバック準備**: 各マイグレーションにdownスクリプトを用意

## 参考資料

### Phase 1
- コミット: `164f827` - 保護者ダッシュボードのサーバーコンポーネント化 (Phase 1完全版)

### Phase 2
- コミット: `998f912` - Service Role完全排除（Phase 2初版）
- コミット: `ec21c03` - profiles RLS追加（Phase 2修正版）
- マイグレーション一覧:
  - `20251102000001_add_parent_students_rls.sql` - students/マスタデータRLS
  - `20251102000002_add_profiles_rls_for_parents_coaches.sql` - profiles RLS
  - `20251105000001_fix_rls_infinite_recursion.sql` - 無限再帰修正（第1版）
  - `20251105000002_fix_profiles_rls_recursion.sql` - profiles修正（第2版）
  - `20251105000003_complete_rls_fix.sql` - 完全修正版

### RLS設計パターン
- **SECURITY DEFINER関数パターン**: RLS内でのJOIN参照を避け、すべての関連テーブルアクセスを関数内に封じ込める
- **循環参照の回避**: ポリシー内では関数呼び出しのみを行い、関数がRLSをバイパスして実行される
- **パフォーマンス**: SETOF型を使用し、PostgreSQLの最適化を活用
