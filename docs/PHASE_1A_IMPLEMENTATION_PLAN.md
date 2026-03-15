# Phase 1A 実装計画: 演習問題集（算数・縦切り）

> 作成日: 2026-03-15
> 最終更新: 2026-03-15
> ステータス: 確定（設計合意済み、レビュー反映済み）
> 親ドキュメント: `docs/EVOLUTION_ROADMAP.md`

## ゴール

小5算数で「演習問題集の問題別入力 → 自動採点 → 到達度マップ → 3ロール（生徒/指導者/保護者）表示」を完成させる。

### 完了条件（Exit Criteria）

1. 小5算数の第1回（通常回）で「入力 → 採点 → 到達度マップ表示」が3ロールで動作する
2. 通常回（反復問題基本/練習 + 実践演習）と総合回（ステップ①②③）の両パターンが動作する
3. コース別フィルタ（min_course）が正しく動作する（Aコース生徒には基本のみ表示等）
4. 既存採点形式4種（numeric / fraction / multi_part / selection）が回帰テストで通過
5. 既存のマスタープリント入力・予習シリーズ入力に影響を与えない（共存）

---

## 設計合意事項

| 項目 | 決定 | 理由 |
|------|------|------|
| ナビゲーション | Spark画面内タブ（`予習シリーズ \| 演習問題集`） | 既存導線を壊さない。移行期の共存が容易 |
| question_sets構造 | 1回 = 1つの `question_set` | クエリ単純化。セクションは `questions.section_name` で表現 |
| 到達度マップ配置 | リフレクト画面内にサブタブ追加 | 将来的にテスト結果タブを置換 |
| 学年対応 | 小5算数から開始 → 小6算数 → 理科・社会 | 投資効果・リスクのバランス |
| 旧データ扱い | DBデータは保持。UIから段階的に非表示化 | PoC生徒の努力を尊重 |

### スコープ外（Phase 1A に含めない）

- ダッシュボード「今日のミッション→今週のミッション」変更
- マスタープリント関連カード削除
- 予習シリーズ入力の非表示化
- トレーニング問題（反復問題の類題。必要に応じて実施するもの）

---

## 演習問題集の構造（算数）

### 小5（上）— Phase 1A 対象

**通常回**: 第1-4, 6-9, 11-14, 16-19回（16回）

| セクション | min_course | 対象コース | 備考 |
|-----------|-----------|-----------|------|
| 反復問題（基本） | `A` | A / B / C / S | 全コース必須 |
| 反復問題（練習） | `B` | B / C / S | |
| ~~トレーニング~~ | — | — | スコープ外 |
| 実践演習 | `C` | C / S | |

**総合回**: 第5, 10, 15, 20回（4回）

| セクション | min_course | 対象コース |
|-----------|-----------|-----------|
| ステップ① | `A` | A / B / C / S |
| ステップ② | `B` | B / C / S |
| ステップ③ | `C` | C / S |

### 小6（上）— Phase 1A' で対応（スキーマ変更不要、データ追加のみ）

**全回共通**: 第1-18回

| セクション | min_course | 対象コース |
|-----------|-----------|-----------|
| ステップ① | `A` | A / B / C / S |
| ステップ② | `B` | B / C / S |
| ステップ③ | `C` | C / S |

### データモデル例（小5 通常回）

```
question_sets:
  id=100, session_id=1, subject_id=1, grade=5,
  set_type='exercise_workbook', edition=NULL,
  title='小5第1回 算数 演習問題集',
  study_content_type_id=NULL, display_order=1, status='approved'

questions:
  -- 反復問題（基本） → min_course='A'
  id=1001, question_set_id=100, section_name='反復問題（基本）',
  question_number='(1)', answer_type='numeric', correct_answer='42',
  min_course='A', display_order=1

  id=1002, question_set_id=100, section_name='反復問題（基本）',
  question_number='(2)', answer_type='fraction', correct_answer='3/4',
  min_course='A', display_order=2

  -- 反復問題（練習） → min_course='B'
  id=1003, question_set_id=100, section_name='反復問題（練習）',
  question_number='(1)', answer_type='numeric', correct_answer='156',
  min_course='B', display_order=10

  -- 実践演習 → min_course='C'
  id=1004, question_set_id=100, section_name='実践演習',
  question_number='(1)', answer_type='multi_part', correct_answer=NULL,
  answer_config='{"slots":[...],"correct_values":{...}}',
  min_course='C', display_order=20
```

### データモデル例（小5 総合回）

```
question_sets:
  id=105, session_id=5, subject_id=1, grade=5,
  set_type='exercise_workbook', edition=NULL,
  title='小5第5回 算数 演習問題集（総合）',
  study_content_type_id=NULL, display_order=1, status='approved'

questions:
  -- ステップ① → min_course='A'
  section_name='ステップ①', min_course='A'

  -- ステップ② → min_course='B'
  section_name='ステップ②', min_course='B'

  -- ステップ③ → min_course='C'
  section_name='ステップ③', min_course='C'
```

---

## 既存インフラ（再利用対象）

| レイヤー | 既存アセット | 状態 |
|---------|------------|------|
| DB | `question_sets`, `questions`, `answer_sessions`, `student_answers` | 本番稼働中 |
| 採点 | `lib/math-grading.ts`（4種: numeric/fraction/multi_part/selection） | 本番稼働中 |
| RPC | `lock_answer_session()`, `get_math_grading_history()` | 本番稼働中 |
| RLS | 生徒=自分、保護者=子供、指導者=担当生徒、管理者=全件 | 本番稼働中 |
| マルチアテンプト | `answer_sessions.attempt_number` + `is_latest` | 本番稼働中 |
| 到達度マップ | `app/student/reflect/achievement-map.tsx` | 本番稼働中 |
| 入力UI基盤 | `app/student/spark/spark-client.tsx`（セッション選択 + 科目トグル） | 本番稼働中 |

### 新規に必要なもの

| 項目 | 内容 |
|------|------|
| `question_sets.set_type` | `'master_print'` / `'exercise_workbook'` 区別カラム |
| `question_sets.edition` | 教材バリアント識別用（小6下の2種教材対応。Phase 1AではNULL） |
| `questions.min_course` | コース別フィルタ用カラム（`course_level` ENUM） |
| `course_rank()` 関数 | ENUM安全比較用（A=1, B=2, C=3, S=4） |
| 一意制約の置換 | 既存 `idx_question_sets_session_subject_order` → `set_type` 込みに再構築 |
| Spark内タブUI | 「予習シリーズ \| 演習問題集」タブ切替 |
| 演習問題集入力コンポーネント | 問題別入力画面（`answer_type` 別フィールド動的生成） |
| 演習問題集到達度マップ | 問題別○×マップ（リフレクト画面内） |
| 問題マスタデータ | 算数 小5（上）の問題定義データ |

---

## WBS（Work Breakdown Structure）

### Sprint 0: DB拡張（1A-1）

#### 1A-1: 既存テーブル拡張 — マイグレーション作成・適用

**工数**: 0.5日
**依存**: なし
**成果物**: マイグレーションSQL + 型再生成

```sql
-- ============================================================
-- 1. question_sets: 問題セットの種別区別
-- ============================================================
ALTER TABLE question_sets ADD COLUMN set_type VARCHAR(20)
  NOT NULL DEFAULT 'master_print'
  CHECK (set_type IN ('master_print', 'exercise_workbook'));

-- ============================================================
-- 2. question_sets: 教材バリアント識別
--    小6（下）は2種類の教材がある。Phase 1AではNULL。
--    将来 'A' / 'B' 等で区別可能にする拡張軸。
-- ============================================================
ALTER TABLE question_sets ADD COLUMN edition VARCHAR(20) DEFAULT NULL;

-- ============================================================
-- 3. questions: コース別フィルタ
-- ============================================================
ALTER TABLE questions ADD COLUMN min_course course_level;
-- 既存master_print問題はNULL（全コース表示）
-- exercise_workbook問題はmin_courseを設定

-- ============================================================
-- 4. コース比較関数（ENUM定義順に依存しない）
-- ============================================================
CREATE OR REPLACE FUNCTION course_rank(c course_level)
RETURNS SMALLINT IMMUTABLE LANGUAGE SQL AS $$
  SELECT CASE c
    WHEN 'A' THEN 1
    WHEN 'B' THEN 2
    WHEN 'C' THEN 3
    WHEN 'S' THEN 4
  END;
$$;

-- ============================================================
-- 5. 一意制約の再構築
--    既存: idx_question_sets_session_subject_order
--          ON (session_id, subject_id, display_order)
--    問題: master_print と exercise_workbook が同一
--          session/subject/display_order=1 で衝突する
--    対策: set_type を含む部分ユニークインデックスに置換
-- ============================================================

-- 5a. 既存インデックスを削除
DROP INDEX IF EXISTS idx_question_sets_session_subject_order;

-- 5b. master_print 用（既存動作を保持）
CREATE UNIQUE INDEX idx_question_sets_master_print_unique
  ON question_sets (session_id, subject_id, display_order)
  WHERE set_type = 'master_print';

-- 5c. exercise_workbook 用（1回 = 1セット）
--     edition を含めることで、将来の教材バリアント同居にも対応
CREATE UNIQUE INDEX idx_question_sets_exercise_unique
  ON question_sets (session_id, subject_id, grade, COALESCE(edition, ''))
  WHERE set_type = 'exercise_workbook';

-- ============================================================
-- 6. パフォーマンス用インデックス
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_question_sets_exercise_lookup
  ON question_sets (session_id, subject_id, grade)
  WHERE set_type = 'exercise_workbook';

CREATE INDEX IF NOT EXISTS idx_questions_min_course
  ON questions (min_course)
  WHERE min_course IS NOT NULL;
```

**既存インデックスへの影響**:
- `idx_question_sets_session_subject_order` を DROP → `set_type` 別の部分ユニークインデックス2本に置換
- `uq_question_sets_assessment_master`（`assessment_master_id` UNIQUE WHERE NOT NULL）は影響なし — そのまま残る
- 既存の `master_print` データは `WHERE set_type = 'master_print'` の部分インデックスでカバーされ、動作は変わらない

**手順**:
1. マイグレーションSQL作成
2. ユーザー承認（CLAUDE.md DB変更ルールに従い影響範囲を提示）
3. ローカルDB適用（`supabase migration up`）
4. 型再生成（`npx supabase gen types typescript --local`）
5. `pnpm build` + `pnpm test` で既存動作確認

**完了条件**:
- ローカルDBに `set_type`, `edition`, `min_course`, `course_rank()` が存在
- 既存マスタープリントが `set_type = 'master_print'` で正常動作
- `pnpm build` + `pnpm test` 成功

---

### Sprint 1: データ整備 + 入力UI（1A-2 + 1A-3）

#### 1A-2: 算数 問題マスタデータ整備・投入（パイロット）

**工数**: 1〜2日（ユーザー協力必須）
**依存**: 1A-1
**成果物**: 小5算数 第1回（通常回）の問題データ（最小MVP）。第5回（総合回）は1A-4着手前に追加。

**ワークフロー**:
1. **ユーザー**: 演習問題集（実物）から第1回の問題を確認
   - 各問題の: 問番号、セクション名、解答形式、正解値
   - `min_course` はセクションから自動決定（反復基本=A、反復練習=B、実践演習=C）
2. **開発者**: 投入用SQLスクリプト作成
   - `scripts/seed-exercise-data/math_g5_session_01.sql`
3. **検証**: 投入後の確認SQL実行
4. **ユーザー**: 正解データの正確性確認

**パイロットで検証する点**:
- `answer_type` の適切な割り当て（実物の問題形式に合うか）
- `min_course` フィルタの動作確認
- データ投入テンプレートの確立

**リスク**: Phase 1A最大のボトルネック。コードが完成してもデータがなければ動かない。
**緩和策**: 第1回のみでMVPデモを先行。残りは並行整備。

**🚩 工数再見積もりゲート**: D-1（第1回データ投入）完了後に以下を判断:
- 1問あたりのデータ整備時間（実績ベース）
- 全20回の投入にかかる見積もりを再計算
- 投入作業の自動化・効率化の必要性

---

#### 1A-3: Spark画面タブ化 + 演習問題集入力UI

**工数**: 3〜4日
**依存**: 1A-2（最低第1回分のデータ）
**成果物**:
- `app/student/spark/spark-client.tsx` にタブ切替追加
- `app/student/spark/exercise-input.tsx` — 演習問題集入力コンポーネント（新規）
- `app/actions/exercise.ts` — Server Actions（新規）

**Spark画面のタブUI**:

```
┌──────────────────────────────────────┐
│  [予習シリーズ]  [演習問題集 ★NEW]      │ ← タブ切替
├──────────────────────────────────────┤
│  第N回 ▾                              │ ← セッション選択（共通）
├──────────────────────────────────────┤

演習問題集タブ選択時:
│                                      │
│ ── 反復問題（基本） ──                  │ ← セクション区切り
│  (1) [    42    ]  ✓                  │
│  (2) [   3/4    ]  ✓                  │
│  (3) [ A:14 B:11 ] ✓                  │
│                                      │
│ ── 反復問題（練習） ──                  │ ← Bコース以上のみ表示
│  (1) [    7     ]  ✗ → 正解: 9        │
│  (2) [  □3 □7   ]  ✓                  │
│                                      │
│ ── 実践演習 ──                         │ ← Cコース以上のみ表示
│  (1) [   156    ]                     │
│                                      │
│        [ 採点して保存する ]              │
└──────────────────────────────────────┘
```

**入力フィールドの動的生成**（`answer_type` 別）:

| answer_type | 入力UI | 既存コード |
|------------|--------|----------|
| `numeric` | 数値入力1フィールド | `gradeAnswer()` そのまま |
| `fraction` | 分子/分母の2フィールド | `gradeAnswer()` そのまま |
| `multi_part` | ラベル付き複数フィールド（`answer_config.slots` から動的生成） | `gradeAnswer()` そのまま |
| `selection` | チェックボックス群（`answer_config` から生成、シャッフル表示） | `gradeAnswer()` + `shuffleWithSeed()` |

**Server Actions** (`app/actions/exercise.ts`):

```typescript
// 演習問題集のquestion_set取得（1回分）
// 認証済みユーザーのstudent情報からgrade/courseを自動解決
// コースフィルタはJS側 filterByCourse() で適用（COURSE_RANK定数で一元管理）
getExerciseQuestionSet(sessionId: number, subjectId: number)
  → { questionSet, questions[] }

// セクション単位採点（段階的にanswer_sessionに蓄積）
gradeExerciseSection({ questionSetId, sectionQuestionIds, answers, isFinal })
  → { results, sectionScore, sectionMaxScore, totalScore?, totalMaxScore?, attemptNumber?, answerSessionId }
  // 内部: 既存in_progressセッション再利用 or create_exercise_session RPC で新規作成
  //       新規作成時は前回gradedセッションの他セクション回答を自動コピー
  //       未回答問題は不正解として記録。isFinal時にセッションをgradedに確定
  // スコアのSoT: 総合スコア表示はクライアント側で全セクションscoreを合算（セッション跨ぎに対応）
  //              attemptNumber はサーバー返却値（DBのanswer_sessions.attempt_number）を使用

// 一括採点（後方互換・再挑戦用）
saveAndGradeExerciseAnswers({ questionSetId, answers, retryMode? })
  → { results, totalScore, maxScore, answerSessionId }

// 既存回答取得（再訪時のプリフィル — graded/in_progress両対応）
getExerciseAnswerHistory(questionSetId: number)
  → { answers, attemptNumber, totalScore, maxScore } | null
```

**既存コード再利用**:
- `create_exercise_session()` RPC → アトミックなセッション作成（advisory lock + is_latest更新 + 採番 + INSERT を1トランザクション）
- `gradeAnswer()` → 採点ロジック（pure function）
- `filterByCourse()` → JS側コースフィルタ（COURSE_RANK定数で一元管理、DB側 `course_rank()` と同一ロジック）
- RLSポリシー → 追加設定不要（`answer_sessions` / `student_answers` の既存RLSが適用）

**完了条件**:
- 生徒が演習問題集の問題に回答を入力し、採点結果が表示される
- 再回答（マルチアテンプト）が動作する
- 予習シリーズタブは既存のまま動作する（回帰テスト）

---

### Sprint 2: 到達度マップ（1A-4 + 1A-5）

#### 1A-4: 演習問題集の到達度マップ

**工数**: 2〜3日
**依存**: 1A-3（入力データが必要）
**成果物**:
- `app/student/reflect/exercise-achievement-map.tsx` — 到達度マップコンポーネント（新規）
- `app/actions/exercise-achievement.ts` — データ取得（新規）

**画面構成**:

```
┌───────────────────────────────────────────────────────────────┐
│ 到達度マップ                                                    │
│ [演習問題集] [予習シリーズ]  ← サブタブ                           │
├───────────────────────────────────────────────────────────────┤
│ 算数   ← Phase 1Aは算数固定                                     │
│                                                               │
│ ── 通常回 ──                                                   │
│          │反復(基)(1)│反復(基)(2)│反復(練)(1)│反復(練)(2)│実践(1)│ │
│ ─────────┼────────┼────────┼────────┼────────┼──────┤ │
│ 第1回     │   ○    │   ○    │   ×    │   ○    │  −   │ │
│ 第2回     │   ○    │   ×    │   ○    │   ○    │  ○   │ │
│ 第3回     │        │        │        │        │      │ │
│ 第4回     │        │        │        │        │      │ │
│                                                               │
│ ── 総合回 ──                                                   │
│          │ ①(1)  │ ①(2)  │ ②(1)  │ ②(2)  │ ③(1) │ │
│ ─────────┼───────┼───────┼───────┼───────┼──────┤ │
│ 第5回     │   ○   │   ○   │   ×   │   −   │  −   │ │
│ 第10回    │       │       │       │       │      │ │
│                                                               │
├───────────────────────────────────────────────────────────────┤
│ ○=正解  ×=不正解  −=未対象（上位コース）  空白=未入力              │
│                                                               │
│ 到達率: 8/10 = 80%  (対象問題数: 10, 正解数: 8)                   │
└───────────────────────────────────────────────────────────────┘
```

**設計ポイント**:
- 既存 `achievement-map.tsx` とは**別コンポーネント**（データソースが異なる）
- 通常回と総合回はセクション名が異なるため、グループ分けして表示
  - 通常回: 反復問題（基本）/ 反復問題（練習）/ 実践演習
  - 総合回: ステップ① / ステップ② / ステップ③
- 列ヘッダー: セクション略称 + `question_number`
- セル状態: ○（正解）/ ×（不正解）/ −（上位コースで未対象）/ 空白（未入力）
- 到達率: `正解数 / 対象問題数`（コースフィルタ適用後の分母）

**データ取得クエリ**:
```sql
SELECT
  qs.session_id,
  ss.session_number,
  q.id, q.section_name, q.question_number, q.min_course, q.display_order,
  sa.is_correct
FROM questions q
JOIN question_sets qs ON q.question_set_id = qs.id
JOIN study_sessions ss ON qs.session_id = ss.id
LEFT JOIN student_answers sa ON q.id = sa.question_id
  AND sa.answer_session_id IN (
    SELECT id FROM answer_sessions
    WHERE student_id = $1 AND is_latest = true
  )
WHERE qs.set_type = 'exercise_workbook'
  AND qs.grade = $2
  AND qs.subject_id = $3
  AND (q.min_course IS NULL OR course_rank(q.min_course) <= course_rank($4::course_level))
ORDER BY ss.session_number, q.display_order;
```

---

#### 1A-5: リフレクト画面サブタブ統合

**工数**: 0.5〜1日
**依存**: 1A-4
**成果物**: リフレクト画面の到達度マップにサブタブ追加

**UI変更**:
```
現在:
  [振り返り] [到達度マップ] [テスト結果]

Phase 1A後:
  [振り返り] [到達度マップ] [テスト結果]
                 └─ [演習問題集（デフォルト）] [予習シリーズ]
```

- 「演習問題集」をデフォルト表示
- 「予習シリーズ」で既存 `achievement-map.tsx` を表示
- 将来（Phase 1C）でテスト結果タブ → 演習到達度に統合

---

### Sprint 3: 3ロール展開 + UX（1A-6 〜 1A-8）

#### 1A-6: 指導者画面への到達度マップ追加

**工数**: 1日
**依存**: 1A-4
**成果物**: `app/coach/student/[id]/` に演習問題集到達度マップ表示

**詳細**:
- `exercise-achievement-map.tsx` コンポーネントを再利用（`studentId` propで切替）
- RLSは既存 `get_assigned_student_ids()` で対応済み
- コース別プレビュー機能も利用可能

---

#### 1A-7: 保護者画面への到達度マップ追加

**工数**: 1日
**依存**: 1A-4
**成果物**: `app/parent/` に演習問題集到達度マップ表示

**詳細**:
- 同じく `exercise-achievement-map.tsx` を再利用
- RLSは既存 `parent_student_relations` で対応済み

---

#### 1A-8: コース別プレビュー機能

**工数**: 0.5〜1日
**依存**: 1A-4
**成果物**: 到達度マップ上部にコース切替セレクター

**UI**:
```
表示コース: [A] [B ●] [C] [S]   ← 現在コース=Bが初期選択
⚠ プレビュー表示中               ← 別コース選択時のみ表示
```

- 表示フィルタの変更のみ（`students.course` は変更しない）
- クエリの `course_rank($4)` パラメータを動的に切り替えるだけ

---

## 優先順位の区分

### 先行グループ（MVP成立に必須）: 1A-1 〜 1A-5

```
1A-1 (DB拡張) → 1A-2 (データ投入) → 1A-3 (入力UI + 採点) → 1A-4 (到達度マップ) → 1A-5 (サブタブ)
```

これが完了すれば「小5算数で入力 → 採点 → マップ表示」が生徒画面で動作する。

### 後置グループ（ロール展開・UX拡張）: 1A-6 〜 1A-8

```
1A-4 → 1A-6 (指導者画面)
     → 1A-7 (保護者画面)
     → 1A-8 (プレビュー)
```

先行グループ安定後に着手。独立して並列実行可能。

---

## データ整備ワークストリーム（独立管理）

### フェーズ

| フェーズ | 範囲 | 目的 |
|---------|------|------|
| D-1: パイロット | 算数 第1回（通常）+ 第5回（総合） | 2パターン検証。テンプレ確立 |
| 🚩 工数再見積もりゲート | D-1完了後 | 1問あたりの整備時間を実績ベースで計測し、全体見積もりを再計算 |
| D-2: 通常回展開 | 第2-4, 6-9回 | 通常回テンプレで横展開 |
| D-3: 総合回展開 | 第10, 15, 20回 | 総合回テンプレで横展開 |
| D-4: 残り | 第11-14, 16-19回 | 全20回完了 |

### 投入手順

1. **ユーザー**: 演習問題集（実物）から問題情報を提供
   - 問番号、セクション名、解答形式、正解値
   - 参考: スプレッドシートやCSVで整理すると効率的
2. **開発者**: 投入用SQLスクリプト作成
   - `scripts/seed-exercise-data/math_g5_session_NN.sql`
3. **検証SQL**:
   ```sql
   -- 投入確認
   SELECT qs.title, qs.session_id,
     COUNT(q.id) as total,
     COUNT(q.id) FILTER (WHERE q.min_course = 'A') as course_a,
     COUNT(q.id) FILTER (WHERE q.min_course = 'B') as course_b,
     COUNT(q.id) FILTER (WHERE q.min_course = 'C') as course_c
   FROM question_sets qs
   JOIN questions q ON q.question_set_id = qs.id
   WHERE qs.set_type = 'exercise_workbook'
   GROUP BY qs.title, qs.session_id
   ORDER BY qs.session_id;
   ```
4. **ユーザー**: 正解データの正確性確認
5. **本番投入**: ローカル検証後

---

## 工数サマリー

| タスク | 工数 | ステータス | 備考 |
|--------|------|----------|------|
| 1A-1: DB拡張 | 0.5日 | **完了** | マイグレーション + RPC + 型再生成 |
| 1A-2: データ投入（パイロット） | 1日 | **完了** | 小5算数 第1回 39問投入済み |
| 1A-3: 入力UI + 採点 | 3〜4日 | **完了** | Spark内タブ + セクション別採点UI |
| 1A-4: 到達度マップ | 2〜3日 | 未着手 | 通常回/総合回の2パターン対応 |
| 1A-5: サブタブ統合 | 0.5〜1日 | 未着手 | リフレクト画面 |
| 1A-6: 指導者画面 | 1日 | 未着手 | コンポーネント再利用 |
| 1A-7: 保護者画面 | 1日 | 未着手 | コンポーネント再利用 |
| 1A-8: プレビュー | 0.5〜1日 | 未着手 | フィルタ切替のみ |
| **合計** | **約10〜14日** | **1A-1〜3 完了** | |

### クリティカルパス

```
1A-1 ✅ → 1A-2 ✅ → 1A-3 ✅ → 1A-4 → 1A-5
```

---

## リスクと緩和策

| リスク | 影響 | 緩和策 |
|--------|------|--------|
| データ整備の遅延 | 全体のリリース遅延 | 第1回のみでMVPデモを先行。D-1後に再見積もり |
| 問題構造が想定と異なる | DB設計の手戻り | D-1パイロットで実物検証してから1A-3に着手 |
| 通常回/総合回の列不統一 | 到達度マップの表示複雑化 | グループ分け表示（通常回ブロック + 総合回ブロック） |
| 既存マスタープリントへの影響 | 回帰バグ | `set_type` 分離 + 部分ユニークインデックス置換 + `pnpm test` 回帰 |
| データ入力品質確認の工数超過 | 見積もり超過 | D-1完了後の再見積もりゲートで早期検知 |

---

## 将来の展開パス

```
Phase 1A  : 小5算数（上）— 本計画
Phase 1A' : 小6算数（上）— スキーマ変更なし、データ追加のみ
Phase 1A'': 小5/小6算数（下）— edition カラムで教材バリアント区別
Phase 1B  : 理科・社会（小5+6同時）— 横展開。下巻2種教材も edition で対応
Phase 1C  : 旧入力整理 — 予習シリーズ非表示化、AI分析入力源移行
```

---

## レビュー反映履歴

### 2026-03-15: 初回レビュー — P0 2件 + P1 2件を反映

**P0（必須修正）:**
1. ✅ 一意制約衝突: 既存 `idx_question_sets_session_subject_order` を DROP → `set_type` 別の部分ユニークインデックス2本に置換
2. ✅ 部分ユニーク制約SQL構文: `ALTER TABLE ... ADD CONSTRAINT ... UNIQUE ... WHERE` → `CREATE UNIQUE INDEX ... WHERE` に修正

**P1（手戻り防止）:**
1. ✅ 教材バリアント拡張軸: `question_sets.edition VARCHAR(20) DEFAULT NULL` を追加。小6（下）2種教材に対応可能に
2. ✅ 工数再見積もりゲート: D-1完了後に実績ベースで全体工数を再計算するゲートを追加

### 2026-03-15: 実装レビュー — 複数ラウンドの指摘を反映

**セッション管理:**
- ✅ `create_exercise_session` RPC 作成（`pg_advisory_xact_lock` で並行保護）
- ✅ `REVOKE EXECUTE FROM PUBLIC` + `GRANT TO service_role`（既存RPCパターン統一）
- ✅ 非アトミックなセッション操作を RPC に置換

**採点ロジック:**
- ✅ コース別フィルタで `maxScore` 分母を表示対象のみに限定
- ✅ `filterByCourse()` ヘルパーで一元管理（`COURSE_RANK` 定数）
- ✅ 未回答問題を不正解として記録（`sectionQuestionIds` パラメータ追加）
- ✅ セクション再挑戦時の前回回答コピー（保存整合性の確保）

**セクション別採点UI:**
- ✅ `gradeExerciseSection` Server Action 新設（段階的 answer_session 蓄積）
- ✅ アコーディオン UI でセクション別入力・採点
- ✅ セクション単位の「不正解だけやり直す」「全部やり直す」ボタン
- ✅ 不正解リトライ時の正解ロック（`lockedQuestionIds`）
- ✅ `in_progress` セッションの復元対応
- ✅ 総合スコアのクライアント合算（全セクション `score` の合計 / 全問題 `points` 合計）
- ✅ `attemptNumber` をサーバー返却値に統一

**UI/UXデザイン:**
- ✅ 入力コンポーネントのボーダー視認性改善（`border-2 border-gray-300 bg-white`）
- ✅ セクションヘッダーの色分け（基本=青、練習=紫、実戦=オレンジ）
- ✅ 未採点セクションにプログレスバー + 回答進捗表示
- ✅ 進行中スコアカードのデザイン改善（グラデーション + プログレスバー）
- ✅ 総合スコアの分母を全問題基準に統一

**テスト:**
- ✅ 純粋関数テスト: コース別フィルタ（6件）、採点ロジック（6件）、再挑戦スコア（1件）
- ✅ 統合テスト: RPC呼び出し、コースフィルタ後maxScore、RPC失敗、INSERT失敗、不正解リトライマージ、セクション別テスト（3件）

---

## 次のアクション

1. **開発者**: 1A-4 到達度マップ実装（リフレクト画面）
2. **開発者**: 1A-5 リフレクト画面にサブタブ追加
3. **ユーザー**: 算数 小5 第5回（総合回）の問題データ提供（到達度マップの2パターン検証用）
4. **ユーザー**: 第2回以降のデータ整備（D-2〜D-4）
