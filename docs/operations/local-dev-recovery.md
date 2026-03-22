# ローカル開発環境復旧手順

## 概要

ローカルSupabase DBが空・壊れた状態から復旧する手順です。
`npx supabase db reset` は自動で `seed.sql` のみ実行します。
演習問題データ等は別途手動投入が必要です。

## 手順

### Step 1: Supabase再起動

```bash
npx supabase stop && npx supabase start
```

### Step 2: DB reset（マイグレーション全件適用）

```bash
npx supabase db reset
```

⚠️ `20260311000001` で失敗する場合は Step 3 を先に行う。

**失敗する原因**: `problem_counts` データが未投入のため、国語漢字問題数更新（32件）が0件になる。

### Step 3: problem_counts_2026.sql 手動投入

```bash
docker exec -i supabase_db_StudySpark-2025Fall psql -U postgres < scripts/problem_counts_2026.sql
```

その後、残りのマイグレーションを手動適用:

```bash
npx supabase migration up
```

### Step 4: seed.sql 実行

```bash
docker exec -i supabase_db_StudySpark-2025Fall psql -U postgres < supabase/seed.sql
```

### Step 5: math_questions_2026.sql 手動投入（809問）

```bash
docker exec -i supabase_db_StudySpark-2025Fall psql -U postgres < scripts/math_questions_2026.sql
```

### Step 6: 演習問題集データ投入

```bash
# 小5（第1〜6回）
for f in scripts/seed-exercise-data/math_g5_session_0*.sql; do
  docker exec -i supabase_db_StudySpark-2025Fall psql -U postgres < "$f"
done

# 小6（第6回）
docker exec -i supabase_db_StudySpark-2025Fall psql -U postgres < scripts/seed-exercise-data/math_g6_session_06.sql
```

### Step 7: デモユーザー作成

```bash
npx tsx scripts/register-demo-users.ts
```

作成されるユーザー:
- demo_yui5 / Demo2026!（小5 Aコース）
- demo_sora6 / Demo2026!（小6 Aコース）
- demo_umi6 / Demo2026!（小6 Bコース）
- demo_parent1〜2（保護者）

### Step 8: 動作確認

```bash
# studentsテーブルにデータがあるか確認
docker exec supabase_db_StudySpark-2025Fall psql -U postgres -c "SELECT count(*) FROM public.students;"
```

---

## 注意

- `npx supabase db reset` はローカルDockerのデータを全消去します。本番には影響しません。
- `docker volume ls --filter label=com.supabase.cli.project=StudySpark-2025Fall` でデータボリュームを確認できます。
