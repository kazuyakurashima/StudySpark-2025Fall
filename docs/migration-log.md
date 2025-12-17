# マイグレーション適用履歴

本番環境へのデータベースマイグレーション適用記録

---

## 2025-12-17: 小学 6 年生の学習回期間修正

### 基本情報

- **マイグレーションファイル**: `supabase/migrations/20251217000001_fix_grade6_study_sessions_periods.sql`
- **マイグレーション ID**: `20251217000001`
- **適用日時**: 2025-12-17 20:50 JST
- **適用方法**: Supabase Dashboard SQL Editor（手動実行）
- **適用者**: 倉島
- **影響範囲**: `study_sessions` テーブル（grade=6 の 15 レコード）
- **変更内容**: 小学 6 年生の学習回の期間を要件ドキュメント（docs/03-Requirements-Student.md）通りに修正

---

### 修正前の状態（ロールバック用）

**実行日時**: 2025-12-17 20:50 JST
**対象件数**: 15

```sql
-- ============================================================================
-- ロールバック用UPDATE（修正前の期間に戻す）
-- ============================================================================
-- 以下のSQLは、Supabase Dashboard「実行1回目」のrollback_sql結果をコピペしてください

UPDATE public.study_sessions SET start_date = '2025-08-25', end_date = '2025-08-31' WHERE grade = 6 AND session_number = 1;
UPDATE public.study_sessions SET start_date = '2025-09-01', end_date = '2025-09-07' WHERE grade = 6 AND session_number = 2;
UPDATE public.study_sessions SET start_date = '2025-09-08', end_date = '2025-09-14' WHERE grade = 6 AND session_number = 3;
UPDATE public.study_sessions SET start_date = '2025-09-15', end_date = '2025-09-21' WHERE grade = 6 AND session_number = 4;
UPDATE public.study_sessions SET start_date = '2025-09-22', end_date = '2025-09-28' WHERE grade = 6 AND session_number = 5;
UPDATE public.study_sessions SET start_date = '2025-09-29', end_date = '2025-10-05' WHERE grade = 6 AND session_number = 6;
UPDATE public.study_sessions SET start_date = '2025-10-06', end_date = '2025-10-12' WHERE grade = 6 AND session_number = 7;
UPDATE public.study_sessions SET start_date = '2025-10-13', end_date = '2025-10-19' WHERE grade = 6 AND session_number = 8;
UPDATE public.study_sessions SET start_date = '2025-10-20', end_date = '2025-10-26' WHERE grade = 6 AND session_number = 9;
UPDATE public.study_sessions SET start_date = '2025-10-27', end_date = '2025-11-02' WHERE grade = 6 AND session_number = 10;
UPDATE public.study_sessions SET start_date = '2025-11-03', end_date = '2025-11-09' WHERE grade = 6 AND session_number = 11;
UPDATE public.study_sessions SET start_date = '2025-11-10', end_date = '2025-11-16' WHERE grade = 6 AND session_number = 12;
UPDATE public.study_sessions SET start_date = '2025-11-17', end_date = '2025-11-23' WHERE grade = 6 AND session_number = 13;
UPDATE public.study_sessions SET start_date = '2025-12-01', end_date = '2025-12-07' WHERE grade = 6 AND session_number = 14;
UPDATE public.study_sessions SET start_date = '2026-01-12', end_date = '2026-01-18' WHERE grade = 6 AND session_number = 15;

-- 例:
-- UPDATE public.study_sessions SET start_date = '2025-08-25', end_date = '2025-08-31' WHERE grade = 6 AND session_number = 1;
-- UPDATE public.study_sessions SET start_date = '2025-09-01', end_date = '2025-09-07' WHERE grade = 6 AND session_number = 2;
-- ...
```

---

### 適用結果

**ステータス**: ✅ 成功

**実行ログ**:

- 対象件数（修正前）: 15
- UPDATE 実行件数: 15
- 対象件数（修正後）: 15

**検証結果**:

````
| 回  | 開始日        | 終了日        | 表示          |
| -- | ---------- | ---------- | ----------- |
| 1  | 2025-08-25 | 2025-09-07 | 08/25〜09/07 |
| 2  | 2025-09-08 | 2025-09-14 | 09/08〜09/14 |
| 3  | 2025-09-15 | 2025-09-21 | 09/15〜09/21 |
| 4  | 2025-09-22 | 2025-10-05 | 09/22〜10/05 |
| 5  | 2025-10-06 | 2025-10-12 | 10/06〜10/12 |
| 6  | 2025-10-13 | 2025-10-19 | 10/13〜10/19 |
| 7  | 2025-10-20 | 2025-10-26 | 10/20〜10/26 |
| 8  | 2025-10-27 | 2025-11-02 | 10/27〜11/02 |
| 9  | 2025-11-03 | 2025-11-16 | 11/03〜11/16 |
| 10 | 2025-11-17 | 2025-11-23 | 11/17〜11/23 |
| 11 | 2025-11-24 | 2025-11-30 | 11/24〜11/30 |
| 12 | 2025-12-01 | 2025-12-14 | 12/01〜12/14 |
| 13 | 2025-12-15 | 2025-12-21 | 12/15〜12/21 |
| 14 | 2025-12-22 | 2026-01-11 | 12/22〜01/11 |
| 15 | 2026-01-12 | 2026-01-18 | 01/12〜01/18 |

---

### マイグレーション履歴同期

**supabase migration repair 実行**: [✅ 完了 / ⏸️ 保留 / ❌ スキップ]

```bash
# 実行したコマンド（実行した場合のみ）
npx supabase migration repair --status applied 20251217000001 --linked

# 確認
npx supabase migration list --linked
````

---

### 動作確認

**本番サイト確認日時**: 2025-12-17 20:50 JST

**確認内容**:

- ✅ 生徒ログイン → スパーク（学習記録入力）→ 学習回プルダウン
- ✅ 期間表示が要件ドキュメント通りになっている

**確認者**: 倉島

---

### 備考

[その他の注意事項や特記事項があれば記入]

---
