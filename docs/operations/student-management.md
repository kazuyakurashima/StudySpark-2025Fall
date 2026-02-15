# 生徒管理 運用手順書

退塾処理・新入塾生登録・指導者割当の運用手順。

## 前提条件

### 環境変数

```bash
# .env.local に以下が設定されていること
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...
```

### 環境の確認（必須・初動で実施）

**スクリプト実行前に、必ず接続先環境を確認すること。**
`.env.local` がローカル Docker（`http://127.0.0.1:54321`）を向いている場合、本番データは操作できない。

```bash
# 1. 現在の接続先を確認
grep NEXT_PUBLIC_SUPABASE_URL .env.local

# 期待値: https://xxxxx.supabase.co（本番）
# NG: http://127.0.0.1:54321 または http://localhost:54321（ローカル）
```

**本番環境変数の取得（Vercel プロジェクトの場合）:**

```bash
# Vercel から本番環境変数をプル（初回 or 環境変数更新時）
vercel env pull .env.production.local --environment=production

# 本番用環境変数を読み込み
set -a && source .env.production.local && set +a

# 2. 読み込み後、実際にシェルに反映された値を確認
echo "$NEXT_PUBLIC_SUPABASE_URL"
# 期待値: https://xxxxx.supabase.co（本番）
```

**ローカル環境変数の読み込み（開発・テスト用）:**

```bash
set -a && source .env.local && set +a
echo "$NEXT_PUBLIC_SUPABASE_URL"
```

> **安全装置**: `withdraw-student.ts` は localhost/127.0.0.1 への接続を検知した場合、`--allow-local` フラグなしでは自動停止します。

### 依存関係

```bash
pnpm add csv-parse iconv-lite
pnpm add -D @types/node tsx
```

---

## 1. 退塾処理

### 概要

退塾する生徒のリレーションを削除し、auth を BAN する（ソフト退塾）。
学習履歴等のデータは保持される。

### 実行手順

```bash
# 1. dry-run で対象を確認（login_id または氏名で検索可能）
npx tsx scripts/withdraw-student.ts <login_id|名前> --dry-run

# 2. 実行（確認プロンプトあり）
npx tsx scripts/withdraw-student.ts <login_id|名前>

# 3. --force で確認プロンプトをスキップ
npx tsx scripts/withdraw-student.ts <login_id> --force

# ローカル環境で実行する場合（開発・テスト用）
npx tsx scripts/withdraw-student.ts <login_id> --allow-local
```

> スクリプト起動時に接続先URL・環境種別（local/production/unknown）が表示されます。想定と異なる場合は CTRL+C で中断してください。

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

### バックアップについて

- 保存先: `scripts/backups/withdrawn_<login_id>_<YYYYMMDD_HHMM>.json`（ローカル端末のみ）
- `.gitignore` で Git 追跡対象外（PII を含むため）
- 実行後、バックアップファイルが作成されたことを確認すること
- 重要な退塾処理の場合、バックアップファイルを安全な場所にコピーしておくことを推奨

**PII管理ルール:**
- バックアップファイルには生徒氏名・ID等の個人情報が含まれる
- **保存期間**: 退塾処理から 90日間（復元が必要ないと確認できた時点で削除可）
- **削除**: `rm scripts/backups/withdrawn_<login_id>_*.json` で対象ファイルを削除
- **アクセス権限**: 管理者のみがアクセスする端末で実行・保管すること
- **共有禁止**: Slack・メール等でバックアップファイルを共有しないこと

### 復元手順（誤って退塾処理した場合）

1. バックアップファイルを確認: `scripts/backups/withdrawn_<login_id>_<YYYYMMDD_HHMM>.json`
2. ファイル内の `restore_sql` の INSERT 文を SQL Editor で実行（`ON CONFLICT DO NOTHING` 付きのため再実行安全）
3. Supabase Dashboard > Auth > Users > 対象ユーザー > **Unban**

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

### 指導者IDの確認

割当前に対象の `coach_id` を確認:

```sql
SELECT id, full_name, user_id FROM coaches ORDER BY id;
```

### SQL テンプレート

SQL Editor で以下を実行（`coach_id` を直接指定して同名リスクを回避）:

```sql
-- 特定の指導者に特定の生徒を割当（coach_id で指定）
INSERT INTO coach_student_relations (coach_id, student_id)
SELECT <coach_id>, s.id
FROM students s
WHERE s.login_id = '生徒のlogin_id'
ON CONFLICT (coach_id, student_id) DO NOTHING;

-- 複数生徒を一括割当
INSERT INTO coach_student_relations (coach_id, student_id)
SELECT <coach_id>, s.id
FROM students s
WHERE s.login_id IN ('login_id_1', 'login_id_2', 'login_id_3')
ON CONFLICT (coach_id, student_id) DO NOTHING;
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

---

## 6. 中長期TODO

- **退塾処理のトランザクション化**: 現在の `withdraw-student.ts` は非原子的（JS Client の個別API呼び出し）。退塾件数が増えた場合、Supabase RPC 関数で「バックアップ・削除・BAN」を1トランザクションに統合し、部分適用リスクを排除する
