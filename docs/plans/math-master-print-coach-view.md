# 算数マスタープリント 指導者閲覧機能 — 実装案

## 1. 概要

指導者が担当生徒の算数マスタープリント結果を、学年・各回単位で把握できる機能。
設問ごとの○/×一覧と正答率を表示し、個別指導の判断材料を提供する。

### 1.1 既存機能（P6）との関係

既存の `class_assessments`（P6-class-assessment）は**指導者が回単位の合計点を手入力**する仕組み。
本機能は**生徒が設問単位で回答し自動採点**する仕組み（auto-grading テーブル）を一次ソースとする。

| 項目 | P6（既存） | 本機能（新規） |
|------|-----------|---------------|
| 入力者 | 指導者（手入力） | 生徒（自動採点） |
| データ粒度 | 回単位の合計点 | 設問単位の正誤 |
| テーブル | `class_assessments` | `answer_sessions` / `student_answers` |
| 用途 | 点数記録・成績把握 | 設問別正誤分析・個別指導判断 |

**共存方針**: P6 は廃止せず並行運用。指導者は従来通り `class_assessments` に合計点を手入力可能。
本機能は auto-grading テーブルのみを参照し、`class_assessments` は**参照しない**。
設問マスタ未登録の回は「未登録」と表示し、フォールバックは行わない（データソースの一元性を維持）。

---

## 2. 現状のデータ資産

### 2.1 question_sets（設問マスタ）

| 学年 | 登録済み回 | 設問数 | 備考 |
|------|-----------|--------|------|
| 小5 | 第1回〜第4回（①②） | 28〜40問/セット | session_id 1〜4 |
| 小6 | 第1回〜第4回（①②） | 6〜41問/セット | session_id 21〜24 |

- 全16セット、計446問が `questions` テーブルに登録済み
- 小5: 第5回以降は未登録（全20回中4回のみ）
- 小6: 第5回以降は未登録（全18回中4回のみ）
- `study_content_type_id` は全て NULL（紐付け未設定）

### 2.2 assessment_masters（回単位の点数マスタ）

| 学年 | 登録済み回 | 備考 |
|------|-----------|------|
| 小5 | 第1〜4, 6〜9, 11〜14, 16〜18, 20回 | max_score が回ごとに異なる（14〜100点） |
| 小6 | 第1〜18回 | max_score は全て100点 |

- `class_assessments` には回単位の合計点が入る（指導者が手入力）
- `answer_sessions` は22件存在（生徒の設問回答実績あり）

### 2.3 データソース

| 用途 | テーブル | 備考 |
|------|---------|------|
| 各回の平均点 | `answer_sessions.total_score` / `assessment_masters.max_score` | 満点の正式ソースは `assessment_masters.max_score` |
| 設問別 ○/× | `student_answers.is_correct` | auto-grading のみ |
| 設問別正答率 | `student_answers` 集計 | auto-grading のみ |

> **設計判断**: データソースは `answer_sessions` / `student_answers` に**完全一元化**する。
> `class_assessments` からのフォールバックは行わない。
> 設問マスタ未登録の回は「設問未登録」と表示し、データなしとして扱う。

---

## 3. データ設計

### 3.1 スキーマ変更: `question_sets.assessment_master_id` 追加

`session_id` + `display_order` の暗黙対応は運用で破綻しやすいため、
初期段階から明示的な紐付けカラムを追加する。

```sql
-- 1. カラム追加（NULLABLE で追加 → データ投入後に制約追加）
ALTER TABLE question_sets
  ADD COLUMN assessment_master_id UUID REFERENCES assessment_masters(id);

-- 2. 既存データの紐付け（session_id + display_order → session_number + attempt_number）
UPDATE question_sets qs
SET assessment_master_id = am.id
FROM assessment_masters am
JOIN study_sessions ss ON ss.id = qs.session_id
WHERE am.assessment_type = 'math_print'
  AND am.grade = CASE WHEN qs.grade = 5 THEN '5年' ELSE '6年' END
  AND am.session_number = ss.session_number
  AND am.attempt_number = qs.display_order
  AND qs.subject_id = 1;  -- 算数のみ

-- 3. 算数セットの NOT NULL 制約（部分 CHECK で算数のみに適用）
ALTER TABLE question_sets
  ADD CONSTRAINT chk_math_assessment_master_id
  CHECK (subject_id != 1 OR assessment_master_id IS NOT NULL);

-- 4. 1マスタ : 1セットの UNIQUE 制約（同一 assessment_master に複数セット紐付けを防止）
CREATE UNIQUE INDEX IF NOT EXISTS uq_question_sets_assessment_master
  ON question_sets (assessment_master_id) WHERE assessment_master_id IS NOT NULL;
```

> **制約設計**:
> - `subject_id = 1`（算数）の場合のみ `assessment_master_id IS NOT NULL` を強制（部分 CHECK）
> - 他教科は NULL 許容（将来の拡張余地）
> - UNIQUE 部分インデックスで 1マスタ : 1セットを保証

### 3.2 RLS ポリシー追加: admin 向け SELECT

auto-grading テーブルに admin 向け SELECT ポリシーが不足している。

```sql
-- answer_sessions
CREATE POLICY "admin_select_answer_sessions" ON answer_sessions
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- student_answers（admin は全件参照可。answer_sessions JOIN は不要 — admin は無条件アクセス）
CREATE POLICY "admin_select_student_answers" ON student_answers
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
```

### 3.3 追加インデックス

既存の UNIQUE 制約 `(student_id, question_set_id, attempt_number)` と
`idx_answer_sessions_latest` がカバーしているため、`answer_sessions` への追加は不要。

```sql
-- student_answers の集計高速化（既存インデックスではカバーされない）
CREATE INDEX IF NOT EXISTS idx_student_answers_session_correct
  ON student_answers (answer_session_id, is_correct);
```

> 追加前に `EXPLAIN ANALYZE` で効果を検証し、不要なら見送る。

### 3.4 設問マスタの不足分

第5回以降の `question_sets` + `questions` が未登録。
段階的に投入する（CSV or スクリプト）。投入順序:

1. 直近の授業進度に合わせて優先度を決定
2. question_sets レコード作成 → questions レコード作成（正答含む）
3. status = 'approved' にして生徒が回答可能に

設問マスタ未登録の回は「設問未登録」として UI に明示する（フォールバックなし）。

---

## 4. API 設計

### 4.1 学年パラメータとキー設計

**正規キー**: `question_sets.assessment_master_id` （UUID FK）を唯一の紐付けキーとする。
RPC 内部では `assessment_master_id` JOIN で回情報を取得し、`grade` 文字列変換（`5 → '5年'`）は
**サマリー API の WHERE フィルタのみ**に使用する（紐付けには使わない）。

```
正規紐付け: question_sets.assessment_master_id → assessment_masters.id
学年フィルタ: assessment_masters.grade = CASE p_grade WHEN 5 THEN '5年' WHEN 6 THEN '6年' END
```

> **設計判断**: `session_id` + `display_order` の暗黙マッピングは廃止。
> `assessment_master_id` が NULL の `question_sets` は本機能の集計対象外。

### 4.2 サマリー API

```
GET /api/coach/math-master/summary?grade=5|6
```

**レスポンス例:**
```json
{
  "grade": 5,
  "sessions": [
    {
      "session_number": 1,
      "title": "倍数と約数の利用",
      "sets": [
        {
          "display_order": 1,
          "question_set_id": 1,
          "total_questions": 40,
          "submitted_count": 12,
          "total_students": 15,
          "avg_score": 32.5,
          "max_score": 44,
          "avg_rate": 0.739
        },
        { "display_order": 2, "..." : "..." }
      ]
    }
  ]
}
```

**集計ロジック:**
- `coach_student_relations` で担当生徒に限定
- `answer_sessions` の `is_latest = true` かつ `status = 'graded'` のみ集計
- 平均点 = `AVG(total_score)` （提出済みのみ、未提出は分母に入れない）
- 設問マスタ未登録の回は一覧に表示するが「設問未登録」としグレーアウト（クリック不可、集計値は全て `-`）

### 4.3 詳細 API

```
GET /api/coach/math-master/detail?question_set_id=1
```

**レスポンス形式:**
```json
{
  "question_set": {
    "id": 1,
    "title": "第1回① 倍数と約数の利用",
    "grade": 5,
    "session_number": 1,
    "display_order": 1
  },
  "questions": [
    { "id": 1, "question_number": "(1)", "section_name": "類題1", "points": 1 },
    { "id": 2, "question_number": "(2)", "section_name": "類題1", "points": 1 }
  ],
  "students": [
    {
      "student_id": 1,
      "full_name": "山田花子",
      "login_id": "hanako5",
      "total_score": 35,
      "max_score": 44,
      "results": { "1": true, "2": false, "3": null }
    }
  ],
  "question_stats": [
    { "question_id": 1, "correct_count": 10, "answered_count": 12, "rate": 0.833 }
  ]
}
```

> **レスポンス最適化**: `students[].results` は `answers[]` 配列ではなく
> `{ question_id: is_correct }` のオブジェクト形式で返す（転送量削減）。
> 生徒数 × 設問数が大きい場合（例: 30人 × 40問 = 1200エントリ）でも
> JSON オブジェクトなら十分軽量。

### 4.4 権限制御

両 API とも:
1. `auth.uid()` → `profiles.role` を確認（`'coach'` or `'admin'`）
2. coach の場合: `coaches.id` → `coach_student_relations.student_id` で担当生徒のみ
3. admin の場合: 全生徒閲覧可（auto-grading RLS に admin ポリシー追加済み）

---

## 5. 集計用 RPC（SQL 側で実施）

フロントでの重いループ集計を避けるため、SQL RPC で集計する。

### 5.1 権限モデル

RPC は **SECURITY DEFINER** で定義し、内部で `auth.uid()` からロール・coach_id を解決する。
外部から `p_coach_id` を受け取らない（権限事故防止）。

**service_role 呼び出し時の挙動**:
`service_role` キーで RPC を呼ぶと `auth.uid()` は NULL を返す。
この場合、`v_role` が NULL となり `RAISE EXCEPTION` で即座に拒否される（安全側に倒れる）。
サーバーサイドの管理スクリプトから呼ぶ場合は、RPC を経由せず直接 SQL を実行すること。

```sql
CREATE OR REPLACE FUNCTION get_math_master_summary(p_grade SMALLINT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_role TEXT;
  v_coach_id BIGINT;
  v_result JSONB;
BEGIN
  -- auth.uid() が NULL の場合は即拒否（service_role 経由の呼び出しを防止）
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: no authenticated user (service_role calls are not supported)';
  END IF;

  -- ロール検証
  SELECT role INTO v_role FROM profiles WHERE id = v_user_id;
  IF v_role IS NULL OR v_role NOT IN ('coach', 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: role=% is not allowed', COALESCE(v_role, 'none');
  END IF;

  -- coach の場合は coach_id を解決
  IF v_role = 'coach' THEN
    SELECT id INTO v_coach_id FROM coaches WHERE user_id = v_user_id;
    IF v_coach_id IS NULL THEN
      RAISE EXCEPTION 'Coach record not found for user %', v_user_id;
    END IF;
  END IF;

  -- 集計クエリ（v_coach_id が NULL なら全生徒 = admin）
  -- ... 実装詳細は Step 2 で確定
  RETURN v_result;
END;
$$;

-- 実行権限の明示管理
REVOKE ALL ON FUNCTION get_math_master_summary(SMALLINT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_math_master_summary(SMALLINT) TO authenticated;
```

> **REVOKE/GRANT**: `get_math_master_detail` にも同様に適用する。
> `anon` ロールからの呼び出しを REVOKE で遮断し、`authenticated` のみに限定。

### 5.2 `get_math_master_summary(p_grade)`

- `auth.uid()` → coach_id 内部解決
- 各回・各セットの平均点・提出者数を返す
- `coach_student_relations` で担当生徒にフィルタ（admin は全件）

### 5.3 `get_math_master_detail(p_question_set_id)`

- `auth.uid()` → coach_id 内部解決
- 指定セットの全設問 × 担当全生徒の is_correct マトリクスを返す
- 設問別正答率も同時に計算
- JSONB 形式で返却し、1クエリで完結させる

---

## 6. UI 設計

### 6.1 新規ページ

```
app/coach/math-master/page.tsx          — メインページ（クライアント）
app/coach/math-master/components/
  session-summary-table.tsx             — 各回サマリーテーブル
  detail-matrix.tsx                     — 設問×生徒の ○/× マトリクス
```

### 6.2 サマリー画面（デフォルト表示）

```
┌─────────────────────────────────────────────────┐
│ 算数マスタープリント                    [小5 ▼]  │
├─────┬──────────┬───────┬───────┬────────┬────────┤
│ 回  │ タイトル  │ 提出  │ 平均点 │ 満点  │ 平均率  │
├─────┼──────────┼───────┼───────┼────────┼────────┤
│ 1①  │ 倍数と…  │ 12/15 │ 32.5  │ 44    │ 73.9%  │
│ 1②  │ 倍数と…  │ 11/15 │ 18.2  │ 22    │ 82.7%  │
│ 2①  │ 図形の…  │ 10/15 │ 24.1  │ 32    │ 75.3%  │
│ ...  │          │       │       │        │        │
│ 5①  │ (未登録)  │  -    │  -    │  -     │  -     │
└─────┴──────────┴───────┴───────┴────────┴────────┘
```

- 学年セレクタ（小5/小6）
- 各行クリックで詳細画面に遷移
- 設問マスタ未登録回はグレーアウト（クリック不可）

### 6.3 詳細画面（○/× マトリクス）

```
┌──────────────────────────────────────────────────────────┐
│ 第1回① 倍数と約数の利用 (小5)               [← 戻る]    │
├──────────┬────┬────┬────┬────┬─···─┬──────┬────────┤
│ 生徒      │ Q1 │ Q2 │ Q3 │ Q4 │     │ 合計 │ 正答率  │
├──────────┼────┼────┼────┼────┼─···─┼──────┼────────┤
│ 山田花子  │ ○ │ × │ ○ │ -  │     │ 35   │ 79.5%  │
│ 鈴木太郎  │ ○ │ ○ │ × │ ○ │     │ 38   │ 86.4%  │
│ (未提出)  │ -  │ -  │ -  │ -  │     │ -    │ -      │
├──────────┼────┼────┼────┼────┼─···─┼──────┼────────┤
│ 正答率    │83% │42% │67% │75% │     │      │ 73.9%  │
└──────────┴────┴────┴────┴────┴─···─┴──────┴────────┘
```

- ○ = 正解（緑）、× = 不正解（赤）、- = 未回答（グレー）
- フッターに設問別正答率
- 横スクロール対応（設問数が多い場合）
- section_name でグルーピングヘッダを表示（類題1, 計算練習, …）

### 6.4 ナビゲーション

コーチ画面のボトムナビから直接リンク、または既存の分析ページからリンク。
（ボトムナビのタブ追加 or 既存タブ内のサブメニューかは UI 検討事項）

---

## 7. 集計ルール（確定）

| ルール | 定義 |
|--------|------|
| 各回平均点 | `AVG(total_score)` 提出済み (`status='graded'`) のみ。未提出は分母に入れない |
| 設問正答率 | `SUM(is_correct=true) / COUNT(is_correct IS NOT NULL)`。未回答 (`is_correct IS NULL`) は除外 |
| 提出済み判定 | `answer_sessions.status = 'graded' AND is_latest = true` |
| リトライ | `is_latest = true` の最新試行のみ集計対象 |
| 未提出生徒 | 一覧に表示するが、全設問 `-` で合計も `-` |

---

## 8. 実装ステップ

| # | 内容 | ファイル | 依存 |
|---|------|---------|------|
| 1 | `question_sets.assessment_master_id` 追加 + 既存データ紐付け | `supabase/migrations/` | なし |
| 2 | admin RLS ポリシー追加 + インデックス追加 | `supabase/migrations/` | なし |
| 3 | 集計 RPC 実装（SECURITY DEFINER、auth.uid() 内部解決） | `supabase/migrations/` | #1, #2 |
| 4 | API ルート実装 | `app/api/coach/math-master/` | #3 |
| 5 | SWR フック実装 | `lib/hooks/use-math-master.ts` | #4 |
| 6 | サマリー画面実装 | `app/coach/math-master/page.tsx` | #5 |
| 7 | 詳細マトリクス画面実装 | `app/coach/math-master/components/` | #5 |
| 8 | ナビゲーション追加 | `components/coach-bottom-navigation.tsx` or リンク | #6 |
| 9 | 不足設問マスタの段階的投入 | `scripts/` or SQL | 別途 |

---

## 9. 受け入れ基準

- [ ] 学年別に各回の平均点が表示される
- [ ] 学年+回指定で、全担当生徒の設問別 ○/× が1画面で見える
- [ ] 設問ごとの正答率が SQL 手計算と一致する（集計一致テスト）
- [ ] 非担当生徒のデータは取得不可（RLS + API レベル）
- [ ] 設問マスタ未登録の回は明示的に「未登録」と表示（フォールバックなし）
- [ ] 横スクロールで40問以上の設問も閲覧可能
- [ ] 権限 E2E: coach は担当生徒のみ、admin は全生徒、非担当 coach はアクセス不可
- [ ] API レスポンス契約テスト: detail API の `students[].results` が `{ [question_id: string]: boolean | null }` 形式であること（将来の破壊的変更防止）

---

## 10. 未決事項・検討事項

1. **設問マスタの残り投入**: 第5回以降の question_sets + questions の登録方法（手動 SQL / CSV インポートスクリプト / 管理画面）
2. **ナビゲーション配置**: ボトムナビに新タブ追加 vs 既存分析ページ内サブメニュー
3. **印刷対応**: マトリクスの印刷用 CSS が必要かどうか
4. **大規模データ対応**: 生徒数が増えた場合のページ分割検討（現状 PoC では不要）
