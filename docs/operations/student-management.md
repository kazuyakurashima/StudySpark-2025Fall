# 生徒管理 運用手順書

退塾処理・新入塾生登録・指導者割当の運用手順。

## 前提条件

### 環境変数

```bash
# .env.local に以下が設定されていること
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...
```

### 依存関係

```bash
pnpm add csv-parse iconv-lite
pnpm add -D @types/node tsx
```

### 環境変数の読み込み

```bash
set -a && source .env.local && set +a
```

---

## 1. 退塾処理

### 概要

退塾する生徒のリレーションを削除し、auth を BAN する（ソフト退塾）。
学習履歴等のデータは保持される。

### 実行手順

```bash
# 1. dry-run で対象を確認
npx tsx scripts/withdraw-student.ts <login_id> --dry-run

# 2. 実行（確認プロンプトあり）
npx tsx scripts/withdraw-student.ts <login_id>

# 3. --force で確認プロンプトをスキップ
npx tsx scripts/withdraw-student.ts <login_id> --force
```

### 事後確認

SQL Editor（service role）で以下を実行:

```sql
-- relation 残存確認（0件であること）
SELECT csr.student_id, s.full_name
FROM coach_student_relations csr
JOIN students s ON s.id = csr.student_id
WHERE s.login_id = '<login_id>';

-- BAN 状態確認（banned_until が設定済みであること）
SELECT au.email, au.banned_until
FROM students s
JOIN auth.users au ON au.id = s.user_id
WHERE s.login_id = '<login_id>';
```

### 復元手順（誤って退塾処理した場合）

1. スクリプト実行時に出力された INSERT 文で relation を復元
2. Supabase Dashboard > Auth > Users > 対象ユーザー > **Unban**

---

## 2. 新入塾生登録

### 概要

CSV から新入塾生（生徒 + 保護者）を一括登録する。
保護者メールが既存の場合（兄弟追加）は自動的に既存保護者を再利用する。

### CSV 準備

ファイル形式: **Shift-JIS**（Excel からそのまま保存で OK）

| カラム名 | 説明 | 例 |
|---------|------|-----|
| 学年 | 5 のみ処理される | 5 |
| 保護者氏名 | 保護者のフルネーム | 山田太郎 |
| ログインID (メールアドレス) | 保護者のメールアドレス | yamada@example.com |
| パスワード | 保護者のパスワード | Pass1234 |
| 表示名 | 保護者のふりがな | ヤマダ |
| ニックネーム | 生徒のふりがな | ハナコ |
| 子ども氏名一覧 | 生徒のフルネーム | 山田花子 |
| 子どもID一覧 | 生徒のログインID | hanako5 |
| 生徒パスワード | 生徒のパスワード | hanako2026 |

### 実行手順

```bash
# 1. CSV を準備（上記カラム形式）

# 2. スクリプト実行
npx tsx scripts/register-grade5-students.ts ~/Downloads/生徒保護者情報アカウント.csv

# 3. シーケンスの手動更新（スクリプト終了時に表示される SQL を SQL Editor で実行）
SELECT setval('students_id_seq', COALESCE((SELECT MAX(id) FROM students), 0), true);
SELECT setval('parents_id_seq', COALESCE((SELECT MAX(id) FROM parents), 0), true);
SELECT setval('parent_child_relations_id_seq', COALESCE((SELECT MAX(id) FROM parent_child_relations), 0), true);
```

### 兄弟追加の場合

保護者メールが既存の場合、スクリプトは以下のように動作:
1. 保護者の auth 作成をスキップ（既存ユーザーを再利用）
2. `parents` テーブルから既存の `parent_id` を取得
3. 生徒アカウントを新規作成
4. `parent_child_relations` に新しい親子関係を追加

ログに `ℹ️ 保護者メール既存: xxx → 既存保護者を再利用します` と表示される。

---

## 3. 指導者への担当割当

新入塾生を指導者に割り当てる。

### SQL テンプレート

SQL Editor で以下を実行:

```sql
-- 特定の指導者に特定の生徒を割当
INSERT INTO coach_student_relations (coach_id, student_id)
SELECT c.id, s.id
FROM coaches c, students s
WHERE c.full_name = '指導者名'
  AND s.login_id = '生徒のlogin_id'
ON CONFLICT (coach_id, student_id) DO NOTHING;

-- 特定の指導者に全生徒を割当（非推奨: 明示リストを使うこと）
-- INSERT INTO coach_student_relations (coach_id, student_id)
-- SELECT c.id, s.id
-- FROM coaches c
-- CROSS JOIN students s
-- WHERE c.full_name = '指導者名'
-- ON CONFLICT (coach_id, student_id) DO NOTHING;
```

### 割当確認

```sql
SELECT c.full_name AS coach, s.full_name AS student, s.login_id, s.grade
FROM coach_student_relations csr
JOIN coaches c ON c.id = csr.coach_id
JOIN students s ON s.id = csr.student_id
ORDER BY c.full_name, s.grade, s.full_name;
```

---

## 4. 事後確認チェックリスト

退塾・新規登録の後に必ず確認:

- [ ] **relation 整合性**: 対象生徒の `coach_student_relations` / `parent_child_relations` が期待通りか
- [ ] **BAN 状態**（退塾の場合）: `auth.users.banned_until` が設定済みか
- [ ] **ログイン確認**（新規の場合）: 生徒・保護者ともにログインできるか
- [ ] **指導者画面**: 指導者ダッシュボードで正しい生徒一覧が表示されるか
- [ ] **保護者画面**（兄弟追加の場合）: 保護者ダッシュボードに新しい子が表示されるか

---

## 5. トラブルシューティング

### auth 不整合（ログインできない）

**症状**: `students` / `profiles` にレコードはあるが、ログインできない

**原因**: `auth.users` に直接 INSERT した場合に発生する（GoTrue の内部整合性が壊れる）

**対処**:
1. `auth.admin.deleteUser()` で該当ユーザーを削除
2. `auth.admin.createUser()` で再作成
3. `profiles` / `students` を再紐付け

### シーケンス不整合

**症状**: 新規レコード INSERT 時に `duplicate key value violates unique constraint` エラー

**原因**: `register-grade5-students.ts` 実行後にシーケンス更新を忘れた

**対処**:
```sql
SELECT setval('students_id_seq', COALESCE((SELECT MAX(id) FROM students), 0), true);
SELECT setval('parents_id_seq', COALESCE((SELECT MAX(id) FROM parents), 0), true);
SELECT setval('parent_child_relations_id_seq', COALESCE((SELECT MAX(id) FROM parent_child_relations), 0), true);
SELECT setval('coach_student_relations_id_seq', COALESCE((SELECT MAX(id) FROM coach_student_relations), 0), true);
```

### BAN 解除が必要

Supabase Dashboard > Auth > Users > 対象ユーザー > **Unban** ボタンをクリック。

API 経由（未検証）:
```typescript
await supabase.auth.admin.updateUserById(userId, { ban_duration: 'none' })
```
