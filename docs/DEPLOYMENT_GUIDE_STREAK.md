# 連続学習日数機能デプロイガイド

**作成日**: 2025-11-09
**対象**: 連続学習日数追跡システム (Streak Tracking)
**重要度**: 🔴 HIGH（データベース変更を含む）

---

## 📋 デプロイ前チェックリスト

### ✅ 1. ローカル環境での最終確認

- [x] `npm run build` が成功すること
- [ ] ローカルで全機能が正常動作すること
  - [ ] 学習記録入力後、streakが更新される
  - [ ] ダッシュボードにStreakCardが表示される
  - [ ] 4つの状態（active/grace/reset/default）が正しく表示される
- [ ] TypeScriptエラーがないこと
- [ ] コンソールエラーがないこと

### ✅ 2. データベースマイグレーション準備

#### 🚨 重要な注意事項

**本番データベースに以下の変更を加えます：**

1. `students` テーブルに4つの新規カラムを追加
2. トリガー関数 `update_student_streak()` を作成
3. トリガー `trigger_update_student_streak` を作成
4. 既存の全生徒データに対して過去のstreak情報を計算・設定

**影響範囲:**
- ✅ 既存データは保持される（DELETE/TRUNCATEなし）
- ✅ ダウンタイムなし（カラム追加のみ）
- ⚠️ 全生徒レコードをUPDATE（約3〜10秒程度）
- ⚠️ トリガーが今後の全 `study_logs` INSERTに自動実行される

#### マイグレーションファイル

**ファイル名**: `supabase/migrations/20251109000001_add_streak_tracking.sql`

**内容サマリ:**
```sql
-- 1. studentsテーブルにカラム追加
ALTER TABLE students ADD COLUMN last_study_date DATE;
ALTER TABLE students ADD COLUMN current_streak INTEGER DEFAULT 0;
ALTER TABLE students ADD COLUMN max_streak INTEGER DEFAULT 0;
ALTER TABLE students ADD COLUMN streak_updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. インデックス作成
CREATE INDEX idx_students_last_study_date ON students(last_study_date);
CREATE INDEX idx_students_current_streak ON students(current_streak);

-- 3. トリガー関数作成
CREATE FUNCTION update_student_streak() ...

-- 4. トリガー登録
CREATE TRIGGER trigger_update_student_streak
  AFTER INSERT ON study_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_student_streak();

-- 5. 既存データのマイグレーション
DO $$ ... 全生徒のstreakを計算・設定 ... $$;
```

### ✅ 3. 本番環境への適用手順

#### Step 1: Supabase Dashboard でマイグレーション実行

**🔴 必須: 本番環境に接続する前にバックアップを取得すること**

```bash
# オプション1: Supabase CLI経由（推奨）
# 本番環境のプロジェクトにリンク
npx supabase link --project-ref <YOUR_PROJECT_REF>

# マイグレーション適用
npx supabase db push

# ✅ 成功メッセージ:
# "Applying migration 20251108000001_update_sender_profiles_rpc_add_nickname.sql..."
# "Applying migration 20251109000001_add_streak_tracking.sql..."
# "Finished supabase db push."
```

```bash
# オプション2: Supabase Dashboard経由
# 1. Supabase Dashboard → Database → Migrations
# 2. "New migration" をクリック
# 3. 20251109000001_add_streak_tracking.sql の内容を貼り付け
# 4. "Run migration" をクリック
```

#### Step 2: マイグレーション成功確認

```sql
-- Supabase SQL Editor で実行

-- 1. カラムが追加されたか確認
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'students'
  AND column_name IN ('last_study_date', 'current_streak', 'max_streak', 'streak_updated_at');

-- 期待結果: 4行返却されること

-- 2. トリガーが作成されたか確認
SELECT tgname, tgrelid::regclass, tgfoid::regproc
FROM pg_trigger
WHERE tgname = 'trigger_update_student_streak';

-- 期待結果: 1行返却されること

-- 3. 既存生徒のstreakデータが設定されたか確認
SELECT
  id,
  last_study_date,
  current_streak,
  max_streak,
  streak_updated_at
FROM students
LIMIT 5;

-- 期待結果:
-- - last_study_date: 過去に記録がある生徒は日付が入っている
-- - current_streak: 0以上の整数
-- - max_streak: 0以上の整数
-- - streak_updated_at: 現在時刻付近のタイムスタンプ
```

#### Step 3: トリガーの動作確認（任意、慎重に）

```sql
-- テストユーザーでログインし、学習記録を1件入力
-- その後、以下のSQLで確認

SELECT
  s.id,
  s.last_study_date,
  s.current_streak,
  s.max_streak,
  (SELECT COUNT(*) FROM study_logs WHERE student_id = s.id) as total_logs
FROM students s
WHERE s.id = <テストユーザーのstudent_id>;

-- 期待結果:
-- - last_study_date が今日の日付に更新されている
-- - current_streak が +1 されている
-- - max_streak が適切に更新されている
```

### ✅ 4. アプリケーションコードのデプロイ

#### 変更ファイル一覧

**新規ファイル:**
- `components/streak-card.tsx` - StreakCardコンポーネント
- `supabase/migrations/20251109000001_add_streak_tracking.sql` - DBマイグレーション
- `docs/STREAK_TRACKING_IMPLEMENTATION.md` - 実装ドキュメント

**変更ファイル:**
- `app/actions/dashboard.ts` - `getStudyStreak()` 関数追加（L509-581）
- `app/student/page.tsx` - streak関連データを initialData に追加（L66-69）
- `app/student/dashboard-client.tsx` - StreakCard統合、インターフェース拡張（L16, L24-27, L1387-1390, L1582-1589, L1703-1710）

#### Git コミット & プッシュ

```bash
# 1. 変更をステージング
git add components/streak-card.tsx
git add supabase/migrations/20251109000001_add_streak_tracking.sql
git add app/actions/dashboard.ts
git add app/student/page.tsx
git add app/student/dashboard-client.tsx
git add docs/STREAK_TRACKING_IMPLEMENTATION.md

# 2. コミット
git commit -m "feat: 連続学習日数追跡システム実装

- グレースピリオド機能追加（1日の猶予期間）
- 4つの状態別デザイン（active/grace/reset/default）
- 時間帯別健康配慮メッセージ
- セルフコンパッション要素（最高記録常時表示）
- DBトリガーによる自動streak計算
- 包括的なドキュメント作成

🔥 Generated with Claude Code
"

# 3. プッシュ
git push origin feature/parent-ui-enhancement
```

#### Vercel / Netlify デプロイ

**自動デプロイの場合:**
- GitHubへのpush後、自動的にビルド・デプロイが開始される
- デプロイログを確認し、エラーがないことを確認

**手動デプロイの場合:**
```bash
# Vercel
vercel --prod

# Netlify
netlify deploy --prod
```

### ✅ 5. 本番環境での動作確認

#### 5.1 基本動作確認

1. **ログイン**
   - 既存の生徒アカウントでログイン
   - ダッシュボードが正常に表示されること

2. **StreakCard 表示確認**
   - ダッシュボードにStreakCardが表示されること
   - 連続日数、最高記録が正しく表示されること
   - 絵文字とカラーが状態に応じて表示されること

3. **学習記録入力**
   - Sparkページで学習記録を入力
   - ダッシュボードに戻る
   - streakが更新されていること（+1日）
   - 状態が "active" になっていること

#### 5.2 状態別確認

**Active状態（🔥）:**
- 今日既に記録済みの生徒
- オレンジ系カラー
- "今日の記録: 完了" メッセージ

**Grace状態（⏳）:**
- 昨日まで継続、今日未記録の生徒
- イエロー系カラー
- "今日の記録: 未完了 → 記録で継続！" メッセージ
- "記録すると X日連続 に！" 追加ボックス

**Reset状態（✨）:**
- 2日以上空いた生徒
- パープル系カラー
- "新しいスタート！" メッセージ
- 最高記録ボックス表示

#### 5.3 エラー監視

```bash
# Vercelの場合
vercel logs --follow

# デプロイログを監視し、以下のエラーがないか確認:
# - Database connection errors
# - SQL syntax errors
# - TypeScript compile errors
# - Runtime errors
```

**Supabase Logs確認:**
- Supabase Dashboard → Logs → Postgres Logs
- トリガー実行エラーがないか確認
- スロークエリがないか確認

### ✅ 6. パフォーマンス確認

```sql
-- Supabase SQL Editorで実行

-- 1. getStudyStreak()のクエリ性能
EXPLAIN ANALYZE
SELECT id, last_study_date, current_streak, max_streak
FROM students
WHERE user_id = '<実際のuser_id>';

-- 期待: Execution Time < 10ms

-- 2. トリガー実行時間の確認
-- 学習記録を1件挿入後、Logsで確認
-- 期待: トリガー実行 < 50ms
```

### ✅ 7. ロールバック手順（問題発生時）

#### 緊急ロールバック（アプリのみ）

```bash
# 前のコミットに戻す
git revert HEAD
git push origin feature/parent-ui-enhancement

# または直前のデプロイに戻す（Vercel）
vercel rollback
```

#### データベースロールバック（慎重に）

**⚠️ 注意: データベースロールバックは既存データに影響する可能性があります**

```sql
-- 1. トリガー削除
DROP TRIGGER IF EXISTS trigger_update_student_streak ON study_logs;

-- 2. 関数削除
DROP FUNCTION IF EXISTS update_student_streak();

-- 3. インデックス削除
DROP INDEX IF EXISTS idx_students_last_study_date;
DROP INDEX IF EXISTS idx_students_current_streak;

-- 4. カラム削除（⚠️ データ消失）
ALTER TABLE students DROP COLUMN IF EXISTS last_study_date;
ALTER TABLE students DROP COLUMN IF EXISTS current_streak;
ALTER TABLE students DROP COLUMN IF EXISTS max_streak;
ALTER TABLE students DROP COLUMN IF EXISTS streak_updated_at;
```

**推奨: カラム削除は行わず、トリガーのみ無効化**
```sql
-- トリガーを無効化（カラムは残す）
ALTER TABLE study_logs DISABLE TRIGGER trigger_update_student_streak;

-- 再有効化する場合
ALTER TABLE study_logs ENABLE TRIGGER trigger_update_student_streak;
```

---

## 🔍 トラブルシューティング

### 問題1: マイグレーション失敗

**症状**: `npx supabase db push` がエラー

**原因候補:**
- 既にマイグレーションが適用済み
- RLS ポリシーの競合
- 権限不足

**解決策:**
```bash
# 現在のマイグレーション状態確認
npx supabase migration list

# 既に適用済みの場合はスキップしてOK
```

### 問題2: StreakCardが表示されない

**症状**: ダッシュボードにカードが表示されない

**診断:**
```typescript
// ブラウザのコンソールでチェック
console.log(initialData)

// streak関連のデータが含まれているか確認
// - studyStreak
// - maxStreak
// - lastStudyDate
// - todayStudied
// - streakState
```

**解決策:**
- `app/student/page.tsx` で `streakResult` を正しく取得しているか確認
- `getStudyStreak()` がエラーを返していないか確認

### 問題3: Streakが更新されない

**症状**: 学習記録入力後もstreakが変わらない

**診断:**
```sql
-- Supabase SQL Editorで実行
SELECT * FROM students WHERE id = <student_id>;

-- last_study_date が更新されているか確認
-- current_streak が増えているか確認
```

**解決策:**
- トリガーが正しく作成されているか確認
- study_logs への INSERT が成功しているか確認
- トリガーのログにエラーがないか確認（Supabase Logs）

### 問題4: パフォーマンス低下

**症状**: ダッシュボードの読み込みが遅い（3秒以上）

**診断:**
```sql
-- スロークエリをチェック
SELECT * FROM pg_stat_statements
WHERE query LIKE '%students%'
ORDER BY mean_exec_time DESC
LIMIT 10;
```

**解決策:**
- インデックスが正しく作成されているか確認
- クエリの実行計画を確認（EXPLAIN ANALYZE）

---

## 📊 デプロイ後の監視項目

### 24時間以内に確認すること

- [ ] エラーレート（< 0.1%）
- [ ] 平均レスポンス時間（ダッシュボード < 1秒）
- [ ] データベースクエリ時間（getStudyStreak < 50ms）
- [ ] トリガー実行成功率（100%）
- [ ] ユーザーからの問い合わせ（0件が理想）

### 1週間後に確認すること

- [ ] 継続率の変化（改善されているか）
- [ ] max_streak の分布（妥当な値か）
- [ ] トリガーのパフォーマンス（劣化していないか）
- [ ] ディスク使用量の増加（インデックス追加の影響）

---

## 📝 デプロイ記録テンプレート

デプロイ実施時は以下のテンプレートを使用して記録を残してください。

```markdown
# デプロイ記録: 連続学習日数機能

**日時**: YYYY-MM-DD HH:MM (JST)
**担当者**: [名前]
**環境**: Production

## 実施内容

- [ ] マイグレーション適用: 20251109000001_add_streak_tracking.sql
- [ ] アプリケーションコードデプロイ
- [ ] 動作確認完了

## マイグレーション結果

- 実行時間: X秒
- 影響レコード数: X件
- エラー: なし / あり（詳細）

## 動作確認結果

- [ ] StreakCard表示: OK
- [ ] 学習記録入力後のstreak更新: OK
- [ ] 全状態の表示確認: OK
- [ ] エラーログ: なし / あり（詳細）

## 備考

（特記事項があれば記載）
```

---

## ✅ 最終チェックリスト

デプロイ前に以下を全て確認してください：

- [ ] ローカルでビルド成功
- [ ] ローカルで全機能動作確認
- [ ] マイグレーションファイルの内容確認
- [ ] 本番データベースのバックアップ取得（Supabase自動バックアップ確認）
- [ ] デプロイ手順の理解
- [ ] ロールバック手順の理解
- [ ] 監視体制の準備
- [ ] チームメンバーへの通知

**全てチェックが完了したら、デプロイを開始してください！** 🚀

---

**Document Version**: 1.0.0
**Last Updated**: 2025-11-09
**Contact**: [担当者連絡先]
