# Phase 2 完了サマリー

## 実装完了日
2025-11-05

## 目的
保護者ダッシュボードからService Role（createAdminClient）を完全排除し、RLSベースのセキュアなデータアクセスを実現

## 実装内容

### 1. Service Role削除
- **対象ファイル**: `app/actions/parent-dashboard.ts`
- **削除箇所**: 11箇所のcreateAdminClient()呼び出し
- **置き換え**: 通常のcreateClient()とRLSポリシー

### 2. RLSポリシー実装

#### テーブル別ポリシー

| テーブル | ポリシー名 | 対象ロール | 内容 |
|---------|-----------|-----------|------|
| students | Students can view and update own profile | student | 自分のレコードのみ閲覧・更新 |
| students | Parents can view children profiles | parent | 関数経由で子供のレコード閲覧 |
| students | Coaches can view assigned students profiles | coach | 関数経由で担当生徒のレコード閲覧 |
| students | Admins can manage all students | admin | 全レコード管理 |
| profiles | Users can view own profile | authenticated | 自分のプロフィール閲覧 |
| profiles | Parents can view children profiles | parent | 関数経由で子供のプロフィール閲覧 |
| profiles | Coaches can view assigned students profiles | coach | 関数経由で担当生徒のプロフィール閲覧 |
| parent_child_relations | Parents can view own children relations | parent | 関数経由で自分の子供との関係閲覧 |
| parent_child_relations | Students can view own parent relations | student | 関数経由で自分の親との関係閲覧 |
| study_sessions | Anyone authenticated can view | authenticated | 全ユーザーが閲覧可能 |
| subjects | Anyone authenticated can view | authenticated | 全ユーザーが閲覧可能 |
| study_content_types | Anyone authenticated can view | authenticated | 全ユーザーが閲覧可能 |
| problem_counts | Anyone authenticated can view | authenticated | 全ユーザーが閲覧可能 |

### 3. SECURITY DEFINER関数（RLS無限再帰対策）

| 関数名 | 戻り値 | 用途 |
|-------|--------|------|
| current_student_id() | BIGINT | 現在のユーザーのstudent_id返却 |
| current_parent_id() | BIGINT | 現在のユーザーのparent_id返却 |
| current_coach_id() | BIGINT | 現在のユーザーのcoach_id返却 |
| get_children_user_ids() | SETOF UUID | 保護者の子供のuser_idリスト |
| get_assigned_students_user_ids() | SETOF UUID | 指導者の担当生徒のuser_idリスト |
| get_children_student_ids() | SETOF BIGINT | 保護者の子供のstudent_idリスト |
| get_assigned_student_ids() | SETOF BIGINT | 指導者の担当生徒のstudent_idリスト |

**重要**: これらの関数は`SECURITY DEFINER`属性を持ち、RLSをバイパスして実行されます。これにより循環参照が発生しません。

### 4. RLS無限再帰問題の解決

#### 問題
```
profiles RLS → students (JOIN) → students RLS → parent_child_relations (JOIN)
→ parent_child_relations RLS → profiles (再評価) → 無限ループ
```

#### 解決策
すべてのJOIN処理をSECURITY DEFINER関数内に封じ込め、RLSポリシーは関数呼び出しのみを行う

```sql
-- 修正前（循環参照発生）
CREATE POLICY "Parents can view children profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    id IN (
      SELECT s.user_id
      FROM public.students s  -- ← studentsのRLSが発動
      JOIN public.parent_child_relations pcr ON pcr.student_id = s.id  -- ← 循環開始
      JOIN public.parents p ON p.id = pcr.parent_id
      WHERE p.user_id = auth.uid()
    )
  );

-- 修正後（循環参照なし）
CREATE POLICY "Parents can view children profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    id IN (SELECT public.get_children_user_ids())  -- ← 関数のみ、RLSバイパス
  );
```

## マイグレーション

### Phase 2マイグレーション一覧

1. **20251102000001_add_parent_students_rls.sql** (2025-11-02)
   - students テーブルRLS追加
   - マスタデータテーブルRLS追加
   - インデックス追加

2. **20251102000002_add_profiles_rls_for_parents_coaches.sql** (2025-11-02)
   - profiles テーブルRLS追加（初版、後に修正）

3. **20251105000001_fix_rls_infinite_recursion.sql** (2025-11-05)
   - current_student_id(), current_parent_id(), current_coach_id()関数追加
   - parent_child_relations RLS修正

4. **20251105000002_fix_profiles_rls_recursion.sql** (2025-11-05)
   - profiles RLS修正（中間版）
   - JOINを関数内に移動

5. **20251105000003_complete_rls_fix.sql** (2025-11-05)
   - 4つの新関数追加（get_children_user_ids等）
   - students, profiles RLS完全修正
   - 循環参照の完全解消

### マイグレーション適用方法

```bash
# ローカル環境
npx supabase db reset

# 本番環境（リセット不可！）
npx supabase db push
```

## テスト結果

### ローカル環境テスト

✅ **テスト項目**:
1. 保護者ログイン → ダッシュボード表示
2. 子供のデータ取得（students, profiles）
3. parent_child_relations経由のJOINクエリ
4. 無限再帰エラーの不在確認
5. マスターデータアクセス

✅ **テストスクリプト**:
- `scripts/test-parent-rls.ts` - 詳細RLSテスト
- `scripts/test-simple-rls.ts` - シンプルRLSテスト
- `scripts/verify-demo-data.ts` - データ検証

### デモデータ

```bash
# デモデータ作成
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 \
SUPABASE_SERVICE_ROLE_KEY=<key> \
npx tsx scripts/seed-demo-data.ts
```

**作成されるデータ**:
- 生徒3名（akira5, hikaru6, hana6）
- 保護者2名（星野一朗、青空太郎）
- 親子関係3件

## パフォーマンス考慮

### インデックス追加

| テーブル | インデックス | カラム |
|---------|------------|--------|
| parent_child_relations | idx_parent_child_relations_parent_id | parent_id |
| parent_child_relations | idx_parent_child_relations_student_id | student_id |
| parents | idx_parents_user_id | user_id |
| students | idx_students_user_id | user_id |

### SECURITY DEFINER関数の最適化

- `SETOF`型を使用してPostgreSQLの最適化を活用
- `STABLE`属性で同一トランザクション内での結果キャッシュ
- `SET search_path = public`でスキーマ検索を最適化

## セキュリティ向上

### Before (Phase 1)
- Service Roleキーをサーバー側で使用
- RLSをバイパスして全データアクセス可能
- セキュリティリスク: サーバー側の脆弱性で全データ漏洩の可能性

### After (Phase 2)
- 通常の認証済みユーザーとしてアクセス
- RLSポリシーで行レベルの厳密なアクセス制御
- セキュリティ向上: ユーザーが見るべきデータのみアクセス可能

## 残課題（Phase 3以降）

以下のファイルはまだService Roleを使用しています：

1. **app/actions/encouragement.ts**
   - 優先度: 中
   - 内容: 応援メッセージ送信機能

2. **app/actions/parent.ts**
   - 優先度: 中
   - 内容: 保護者関連の各種機能

3. **lib/utils/daily-spark.ts**
   - 優先度: 低
   - 内容: 日次バッチ処理（ユーザーコンテキスト不要）

## コミット履歴

### Phase 1
- `164f827` - 保護者ダッシュボードのサーバーコンポーネント化 (Phase 1完全版)

### Phase 2
- `998f912` - Service Role完全排除（Phase 2初版）
- `ec21c03` - profiles RLS追加（Phase 2修正版）
- `664e635` - RLS無限再帰問題の完全解決（Phase 2完了）

## 学んだ教訓

### 1. RLSポリシー内でのJOIN/サブクエリは慎重に
- RLSポリシー内で他のテーブルを参照すると、そのテーブルのRLSも評価される
- 複数テーブルにまたがるポリシーは循環参照のリスクがある

### 2. SECURITY DEFINER関数パターンの有用性
- JOINを関数内に封じ込めることで循環参照を回避
- ポリシーはシンプルに保ち、複雑なロジックは関数に委譲

### 3. CLAUDE.mdルールの重要性
- `npx supabase db reset`は事前承認必須
- ローカル環境でもユーザーデータを尊重する

## 次のアクション

1. [ ] ステージング環境での動作確認
2. [ ] 本番環境へのマイグレーション適用
3. [ ] 本番環境での動作確認
4. [ ] 24時間の監視
5. [ ] Phase 3の計画（encouragement.ts, parent.tsのRLS化）

## 参考資料

- 実装詳細: `TODO_SERVICE_ROLE_MIGRATION.md`
- 本番適用手順: `DEPLOYMENT_PHASE2.md`
- インシデント記録: `INCIDENT_REPORT.md`
- プロジェクトルール: `CLAUDE.md`
