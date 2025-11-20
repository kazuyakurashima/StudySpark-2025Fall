# Phase 2 ローカル動作確認チェックリスト

## 前提条件

- ✅ Supabaseローカル環境起動済み
- ✅ デモデータ投入済み
- ⏳ 開発サーバー起動
- ⏳ ブラウザでの動作確認

## 環境確認

### 1. Supabase起動確認

```bash
npx supabase status
```

**確認項目**:
- API URL: http://127.0.0.1:54321
- Database URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
- Studio URL: http://127.0.0.1:54323

### 2. デモデータ確認

```bash
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 \
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU \
npx tsx scripts/verify-demo-data.ts
```

**期待される出力**:
```
✅ Success: 3 students
✅ Success: 2 parents
✅ Success: 3 parent-child relations
```

### 3. 開発サーバー起動

```bash
pnpm run dev
```

**アクセスURL**: http://localhost:3000

## テストシナリオ

### シナリオ1: 保護者ログイン（星野一朗）

#### 1-1. ログイン
- [ ] URLにアクセス: http://localhost:3000
- [ ] ログイン画面が表示される
- [ ] 以下の情報でログイン:
  - メールアドレス: `demo-parent2@example.com`
  - パスワード: `<社内管理>`
- [ ] ログイン成功

#### 1-2. ダッシュボード表示
- [ ] 保護者ダッシュボードにリダイレクト（/parent）
- [ ] エラーが表示されない
- [ ] 以下の要素が表示される:
  - [ ] ヘッダー（ユーザー名: 星野 一朗）
  - [ ] 子供選択ドロップダウン（星野 明、星野 光）
  - [ ] AIコーチからのメッセージ
  - [ ] 今日のミッション
  - [ ] 学習カレンダー
  - [ ] 今週の科目別進捗
  - [ ] 最近の学習履歴
  - [ ] 最近の応援メッセージ

#### 1-3. 子供切り替え
- [ ] 子供選択ドロップダウンをクリック
- [ ] 「星野 光」を選択
- [ ] ダッシュボードが更新される
- [ ] エラーが表示されない

#### 1-4. ブラウザコンソール確認
- [ ] F12でデベロッパーツールを開く
- [ ] Consoleタブを確認
- [ ] 以下のエラーがないこと:
  - ❌ "infinite recursion detected"
  - ❌ "RLS policy violation"
  - ❌ "Access denied"
  - ❌ その他のSupabaseエラー

#### 1-5. Networkタブ確認
- [ ] Networkタブを開く
- [ ] ページをリロード
- [ ] Supabase APIへのリクエストを確認:
  - [ ] `/rest/v1/students` - 200 OK
  - [ ] `/rest/v1/profiles` - 200 OK
  - [ ] `/rest/v1/parent_child_relations` - 200 OK
  - [ ] エラーレスポンス（4xx, 5xx）がないこと

### シナリオ2: 保護者ログイン（青空太郎）

#### 2-1. ログアウト
- [ ] ヘッダーのユーザーメニューをクリック
- [ ] 「ログアウト」をクリック
- [ ] ログイン画面にリダイレクト

#### 2-2. 別の保護者でログイン
- [ ] 以下の情報でログイン:
  - メールアドレス: `demo-parent1@example.com`
  - パスワード: `<社内管理>`
- [ ] ログイン成功

#### 2-3. ダッシュボード表示
- [ ] 保護者ダッシュボードが表示される
- [ ] 子供選択に「青空 花」のみ表示される（星野兄弟は表示されない）
- [ ] エラーが表示されない

### シナリオ3: 生徒ログイン

#### 3-1. ログアウトして生徒でログイン
- [ ] ログアウト
- [ ] 以下の情報でログイン:
  - ログインID: `akira5`
  - パスワード: `<社内管理>`
- [ ] ログイン成功

#### 3-2. 生徒ダッシュボード表示
- [ ] 生徒ダッシュボードが表示される（/student）
- [ ] エラーが表示されない
- [ ] 自分のデータのみ表示される

### シナリオ4: RLS動作確認（重要）

#### 4-1. Supabase Studioで直接確認

```bash
# ブラウザで開く
open http://127.0.0.1:54323
```

- [ ] Table Editorで以下を確認:
  - [ ] `students` テーブル: 3件のレコード
  - [ ] `parents` テーブル: 2件のレコード
  - [ ] `parent_child_relations` テーブル: 3件のレコード
  - [ ] `profiles` テーブル: 5件のレコード（students 3 + parents 2）

#### 4-2. SQL Editorで関数確認

```sql
-- 関数の存在確認
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name LIKE '%children%' OR routine_name LIKE '%student%';
```

**期待される結果**:
- current_student_id
- current_parent_id
- current_coach_id
- get_children_user_ids
- get_assigned_students_user_ids
- get_children_student_ids
- get_assigned_student_ids

#### 4-3. RLSポリシー確認

```sql
-- studentsテーブルのポリシー
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'students';
```

**期待されるポリシー**:
- Students can view and update own profile
- Parents can view children profiles
- Coaches can view assigned students profiles
- Admins can manage all students

### シナリオ5: パフォーマンス確認

#### 5-1. ページロード時間
- [ ] ブラウザのNetworkタブで計測
- [ ] 保護者ダッシュボードの初回ロード: **< 2秒**
- [ ] 子供切り替え時のデータ取得: **< 1秒**

#### 5-2. メモリ使用量
- [ ] Chromeのタスクマネージャーで確認（Shift+Esc）
- [ ] メモリリークがないこと
- [ ] ページ遷移後にメモリが解放されること

## トラブルシューティング

### 問題1: ダッシュボードが表示されない

**症状**: 白い画面またはエラーメッセージ

**確認事項**:
1. ブラウザコンソールのエラーメッセージ
2. Supabaseローカル環境が起動しているか（`npx supabase status`）
3. デモデータが投入されているか（`scripts/verify-demo-data.ts`）

**解決策**:
```bash
# Supabase再起動
npx supabase stop
npx supabase start

# デモデータ再投入
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 \
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU \
npx tsx scripts/seed-demo-data.ts
```

### 問題2: "infinite recursion detected"エラー

**症状**: コンソールに無限再帰エラー

**原因**: RLSポリシーの循環参照

**解決策**:
```bash
# マイグレーションを最新に
npx supabase db reset
```

### 問題3: 子供のデータが表示されない

**症状**: ダッシュボードは表示されるが、データが空

**確認事項**:
1. parent_child_relationsにデータがあるか
2. RLSポリシーが正しく適用されているか

**解決策**:
```bash
# RLSポリシー確認
npx supabase db diff

# デモデータ確認
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 \
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU \
npx tsx scripts/verify-demo-data.ts
```

## 完了基準

以下のすべてにチェックが入ったらローカル動作確認完了:

- [ ] シナリオ1: 保護者ログイン（星野一朗）- すべて✅
- [ ] シナリオ2: 保護者ログイン（青空太郎）- すべて✅
- [ ] シナリオ3: 生徒ログイン - すべて✅
- [ ] シナリオ4: RLS動作確認 - すべて✅
- [ ] シナリオ5: パフォーマンス確認 - すべて✅
- [ ] エラーログなし
- [ ] パフォーマンス基準達成

## 次のステップ

ローカル動作確認完了後:
1. [ ] ステージング環境での確認（該当する場合）
2. [ ] 本番環境への適用（DEPLOYMENT_PHASE2.md参照）
