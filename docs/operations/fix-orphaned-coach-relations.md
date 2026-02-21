# 修正手順: 旧小6 指導者リレーション残存の解消

## 1. 事象

`kazuya@studyspark.jp` でログインすると旧小6が表示されないが、他の指導者アカウントでは旧小6が表示される。

## 2. 原因

2つの層の問題が重なっている:

1. **運用層**: 2026-02-07 の卒業処理で `coach_student_relations` の削除が一部の指導者にしか適用されなかった（`04_cutover_runbook.md` Phase 2 卒業処理の DELETE が不完全実行）
2. **設計層**: `getCoachStudents()` に卒業生を除外するフィルタがなく、relation が残存すると必ず表示される（アプリ層防御がゼロ）

## 3. 修正手順（DB 運用修正）

### 3.1 テーブル探索（卒業対象IDソースの特定）

```sql
-- _graduating_ids_* が優先度1（03_data_strategy.md Section 7.3）
-- _backup_graduated_* が優先度2
-- ⚠️ LIKE の _ はワイルドカードのためエスケープ必須
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND (
    tablename LIKE '\_graduating\_ids\_%' ESCAPE '\'
    OR tablename LIKE '\_backup\_graduated\_%' ESCAPE '\'
  )
ORDER BY tablename DESC;
```

以下、`_graduating_ids_YYYYMMDD_HHMM` が見つかった前提で記述する。
**⚠️ SQL 内の `YYYYMMDD_HHMM` はすべて、3.1 で特定した実際のタイムスタンプに置換すること。**

### 3.2 残存リレーションの確認

```sql
-- 卒業対象IDソースは _graduating_ids_* を一次ソースとする
-- （03_data_strategy.md Section 7.3, 04_cutover_runbook.md:304）
SELECT
  csr.coach_id,
  c.full_name AS coach_name,
  csr.student_id,
  s.full_name AS student_name,
  s.grade
FROM coach_student_relations csr
JOIN students s ON s.id = csr.student_id
JOIN coaches c ON c.id = csr.coach_id
WHERE csr.student_id IN (
  SELECT id FROM _graduating_ids_YYYYMMDD_HHMM
)
ORDER BY c.full_name, s.full_name;
```

**確認ポイント:**
- 結果が 0 件なら問題なし（別の原因を調査）
- 結果が出れば、それが残存リレーション → 3.3 で削除

### 3.3 削除実行

```sql
BEGIN;

-- RETURNING で削除件数と内容を記録
DELETE FROM coach_student_relations
WHERE student_id IN (
  SELECT id FROM _graduating_ids_YYYYMMDD_HHMM
)
RETURNING coach_id, student_id;

-- ⚠️ 削除件数を確認してから COMMIT
-- 想定外の件数なら ROLLBACK
COMMIT;
```

**記録事項:**
- 削除件数: ___ 件
- 対象 coach_id 一覧: ___

### 3.4 `graduated_at` の設定

卒業生にアプリ層防御用の `graduated_at` を設定する。
**⚠️ 事前に `students` テーブルに `graduated_at` カラムが存在することを確認すること。**
（マイグレーション未適用の場合は先にデプロイが必要）

```sql
-- 再実行安全（COALESCE で既存値を保持）
UPDATE students SET graduated_at = COALESCE(graduated_at, NOW())
WHERE id IN (
  SELECT id FROM _graduating_ids_YYYYMMDD_HHMM
)
RETURNING id, full_name, graduated_at;
```

**注意**: `graduated_at` を設定しただけでは防御にならない。アプリコード（`WHERE graduated_at IS NULL`）のデプロイ後に初めて有効化される。効力発生の順序:
1. DB マイグレーション（`graduated_at` カラム追加）
2. アプリコードのデプロイ（フィルタ追加）
3. `graduated_at` の設定（本ステップ）
4. 事後確認（3.5）

### 3.5 事後確認

`04_cutover_runbook.md` の事後確認クエリを実行:

```sql
WITH target_ids AS (
  SELECT id FROM _graduating_ids_YYYYMMDD_HHMM
)
-- (1) relation 残存確認
SELECT 'relation_残存' AS check_type, csr.student_id, s.full_name, NULL AS detail
FROM coach_student_relations csr
JOIN students s ON s.id = csr.student_id
WHERE csr.student_id IN (SELECT id FROM target_ids)

UNION ALL

-- (2) graduated_at 未設定確認
SELECT 'graduated_at_未設定', s.id, s.full_name, NULL
FROM students s
WHERE s.id IN (SELECT id FROM target_ids)
  AND s.graduated_at IS NULL

UNION ALL

-- (3) BAN 状態確認（SQL Editor / service role でのみ実行可）
SELECT 'BAN_未設定', s.id, s.full_name, au.banned_until::TEXT
FROM students s
JOIN auth.users au ON au.id = s.user_id
WHERE s.id IN (SELECT id FROM target_ids)
  AND au.banned_until IS NULL

ORDER BY check_type, full_name;
```

**完了条件:**
- [ ] 結果が 0 件であること
- [ ] `relation_残存` が出た場合 → 3.3 を再実行
- [ ] `graduated_at_未設定` が出た場合 → 3.4 を再実行
- [ ] `BAN_未設定` が出た場合 → `scripts/ban-graduated-users.ts` を再実行

### 3.6 UI 確認

- [ ] 全指導者アカウントでログインし、旧小6 が表示されないことを確認
  - `kazuya@studyspark.jp`（修正前から正常）
  - `nakatani@studyspark.jp`
  - `demo@studyspark.jp`

## 4. フォールバック: _graduating_ids_* テーブルが存在しない場合

テーブルが削除されていた場合、以下の優先順で卒業対象を特定する:

| 優先度 | ソース | 方法 |
|--------|--------|------|
| 2 | `_backup_graduated_csr_*` / `_backup_graduated_pcr_*` | `SELECT DISTINCT student_id FROM _backup_graduated_csr_YYYYMMDD_HHMM UNION SELECT DISTINCT student_id FROM _backup_graduated_pcr_YYYYMMDD_HHMM` |
| 3 | `graduating_students_*.csv` | CSV を `_graduating_ids` テーブルに再投入 |
| 4 | `auth.users.banned_until` | `SELECT s.id FROM students s JOIN auth.users au ON s.user_id = au.id WHERE au.banned_until IS NOT NULL` |

**注意:** `students.grade` は卒業生判定に使用してはならない（繰り上げ後は現役小6と区別不可）。
（`03_data_strategy.md` Section 7.3）

## 5. 再発防止

### 5.1 即時対応: `graduated_at` + アプリフィルタ（今回実施）

`03_data_strategy.md` Section 7.1 で定義:

- `students` テーブルに `graduated_at TIMESTAMPTZ` カラム追加
- `getCoachStudents()` 等で `.is("students.graduated_at", null)` フィルタ追加
- relation 削除漏れがあっても、アプリ層で卒業生を弾ける防御層を確立

### 5.2 中長期: `is_active` カラム（次回年次切替前）

`03_data_strategy.md` Section 7.4 で定義:

- `coach_student_relations` に `is_active` + `unassigned_at` カラム追加
- 卒業処理を物理削除から論理削除に変更
- 16 箇所に `.eq("is_active", true)` フィルタ追加

## 6. 参照ドキュメント

- `docs/2026-cutover/03_data_strategy.md` Section 7.1（方針 + `graduated_at` 設計）
- `docs/2026-cutover/03_data_strategy.md` Section 7.3（卒業生判定基準）
- `docs/2026-cutover/04_cutover_runbook.md` Phase 2 Step 2-3（`graduated_at` 設定 + リレーション削除）
- `docs/2026-cutover/04_cutover_runbook.md` 事後確認（relation 残存 + `graduated_at` + BAN 確認）
