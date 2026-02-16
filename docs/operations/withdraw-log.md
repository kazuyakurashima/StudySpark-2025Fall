# 退塾処理 実行ログ

退塾処理（`withdraw-student.ts`）の実行記録。

| # | 日時 | 対象 login_id | 氏名 | 学年 | 接続先 | バックアップ | 結果 | 実行者 |
|---|------|--------------|------|------|--------|-------------|------|--------|
| 1 | 2026-02-15 23:05 JST | yuito5 | 寺門惟智 | 小6 | `maklmjcaweneykwagqbv.supabase.co` (production) | `scripts/backups/withdrawn_yuito5_20260215_2305.json` | CSR 8件削除, PCR 1件削除, BAN完了 (banned_until: 2126-01-22) | Claude Code |

## 事後確認結果

### #1 yuito5 (2026-02-15)

```
coach_student_relations (student_id=6): 0 件 ✓
parent_child_relations (student_id=6): 0 件 ✓
auth.users.banned_until: 2126-01-22T14:05:46.573372Z ✓
```
