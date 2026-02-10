# PoC 自動採点・理科振り返り 実装計画

## 0. 概要

### 目的
1. **理科**: 選択式解答入力 → 自動採点 → 結果表示
2. **算数**: 数値入力（分数対応） → 自動採点 → 結果表示
3. **理科**: AI学習振り返り対話（既存リフレクト基盤を転用）

### 前提条件
- **算数**: 問題は紙（アナログ）で配布。生徒はWebに**解答のみ**数値入力。分数は既約分数/仮分数のまま完全一致判定（通分・約分の同値判定はしない）
- **理科**: 問題＋解答セットを講師がWeb管理画面から登録し、生徒はWebで選択式に解答（Phase 1はフォーム入力。CSV一括取込は将来検討）
- 問題データは講師/管理者が管理画面から登録

### 運用ワークフロー（実態ベース）

| | 算数 | 理科 |
|--|------|------|
| **授業頻度** | 週3回授業、問題プリント2セット/週 | 週2回Webテスト |
| **問題提供方法** | 紙で配布済み。講師はシステムに**解答データのみ**登録<br>例: `(1) 4, (2) 0.23, (3) 3/4` | 講師が**問題＋解答セット**をシステムに登録 |
| **生徒の解答ペース** | 週2〜3回に分けて漸次入力（途中保存あり） | 1回のテストとして一括解答 |
| **問題作成頻度** | 2〜3セッション分をまとめて登録 | テストのたびに都度登録（just-in-time） |
| **question_set 粒度** | 1問題プリント = 1 question_set | 1Webテスト = 1 question_set |

### フェーズ構成

| Phase | 内容 | 主な成果物 |
|-------|------|-----------|
| **1** | DB基盤 + 理科の選択式自動採点 | 問題テーブル群、問題管理UI（理科フル入力＋算数解答のみ入力）、解答入力UI、自動採点、結果表示 |
| **2** | 算数の数値入力自動採点 + 途中保存 | 数値/分数入力UI、算数用採点ロジック、漸次入力（途中保存）機能 |
| **3** | 理科AI振り返り対話 | 既存リフレクト基盤の理科特化版 |

> **スコープ外（将来Phase）**:
> - AI選択肢自動生成→承認ワークフロー。Phase 1-3 では問題・選択肢は講師が手動登録する。
>   ただし `question_options.error_type` カラムは Phase 1 で先行投入し、将来のAI生成・弱点分析に備える。
> - 算数の単位プルダウン/サジェストUIも本PoCのスコープ外（ユーザー方針: 数値入力のみ）。
> - 理科の問題データCSV/TSV一括取込。Phase 1 ではフォームベースの手入力で運用し、
>   登録負荷が高い場合は Phase 1 後半以降でCSV取込機能を追加検討する。
>
> **PoC成功判断**: Phase 1-3 の完了条件を満たすことで PoC 成功とする。
> 将来Phase（AI選択肢生成等）の要否は PoC 成果を踏まえて判断する。

---

## 1. 共通DB設計

### 1-1. 新規テーブル

```sql
-- ============================================================
-- 問題セット: セッション×科目×コンテンツの問題グループ
-- ============================================================
CREATE TABLE question_sets (
  id            BIGSERIAL PRIMARY KEY,
  session_id    BIGINT NOT NULL REFERENCES study_sessions(id),
  subject_id    BIGINT NOT NULL REFERENCES subjects(id),
  -- study_content_type_id は NULL許可（セット全体が特定コンテンツに紐づかない場合）
  study_content_type_id BIGINT REFERENCES study_content_types(id),
  grade         SMALLINT NOT NULL CHECK (grade IN (5, 6)),
  title         VARCHAR(255),          -- 表示用タイトル（例: "第3回 理科 基本演習"）
  status        VARCHAR(20) NOT NULL DEFAULT 'draft'
                CHECK (status IN ('draft', 'approved')),
  created_by    UUID NOT NULL REFERENCES auth.users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 問題: 個別の設問
-- ============================================================
CREATE TABLE questions (
  id              BIGSERIAL PRIMARY KEY,
  question_set_id BIGINT NOT NULL REFERENCES question_sets(id) ON DELETE CASCADE,
  question_number VARCHAR(20) NOT NULL,  -- "問1", "問2(1)", "3-(2)" など
  answer_type     VARCHAR(20) NOT NULL
                  CHECK (answer_type IN ('choice', 'numeric', 'fraction')),
  correct_answer  VARCHAR(255) NOT NULL, -- 正答値（後述の形式ルール参照）
  points          SMALLINT NOT NULL DEFAULT 1 CHECK (points > 0),
  display_order   SMALLINT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (question_set_id, display_order)
);

-- ============================================================
-- 選択肢: choice 型の問題にのみ使用
-- ============================================================
CREATE TABLE question_options (
  id              BIGSERIAL PRIMARY KEY,
  question_id     BIGINT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  option_label    VARCHAR(10) NOT NULL,  -- "ア", "イ", "ウ", "エ" or "A","B","C","D"
  option_text     VARCHAR(500) NOT NULL, -- 選択肢の本文
  is_correct      BOOLEAN NOT NULL DEFAULT false,
  error_type      VARCHAR(50),           -- 誤答タイプ（例: "条件読み落とし", "単位ミス", "概念誤り"）
                                         -- Phase 1 では任意入力。将来の弱点分析・AI選択肢生成で活用
  display_order   SMALLINT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (question_id, option_label),
  UNIQUE (question_id, display_order)
);

-- ============================================================
-- 解答セッション: 生徒の1回の解答提出をグループ化
-- ============================================================
CREATE TABLE answer_sessions (
  id              BIGSERIAL PRIMARY KEY,
  student_id      BIGINT NOT NULL REFERENCES students(id),
  question_set_id BIGINT NOT NULL REFERENCES question_sets(id),
  attempt_number  SMALLINT NOT NULL DEFAULT 1 CHECK (attempt_number > 0),
  is_latest       BOOLEAN NOT NULL DEFAULT true,
  status          VARCHAR(20) NOT NULL DEFAULT 'in_progress'
                  CHECK (status IN ('in_progress', 'completed', 'graded')),
  total_score     SMALLINT,             -- 自動採点後にセット
  max_score       SMALLINT,             -- 自動採点後にセット
  started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- 同一生徒×問題セット×試行番号で一意
  UNIQUE (student_id, question_set_id, attempt_number),

  -- 整合性保証: graded 時は completed_at/total_score/max_score が必須
  CHECK (status != 'graded' OR (completed_at IS NOT NULL AND total_score IS NOT NULL AND max_score IS NOT NULL))
);

-- is_latest の整合性: 同一 (student_id, question_set_id) で is_latest=true は最大1行
CREATE UNIQUE INDEX idx_answer_sessions_latest
  ON answer_sessions (student_id, question_set_id)
  WHERE is_latest = true;

-- ============================================================
-- 生徒解答: 問題ごとの解答レコード
-- ============================================================
CREATE TABLE student_answers (
  id                BIGSERIAL PRIMARY KEY,
  answer_session_id BIGINT NOT NULL REFERENCES answer_sessions(id) ON DELETE CASCADE,
  question_id       BIGINT NOT NULL REFERENCES questions(id),
  raw_input         VARCHAR(255),        -- 生徒の入力値そのまま（デバッグ・監査用）
  answer_value      VARCHAR(255),        -- 採点に使用した正規化済み値（NULL = 未回答）
  is_correct        BOOLEAN,             -- 自動採点結果（NULL = 未採点）
  scored_at         TIMESTAMPTZ,         -- 採点実行時刻
  answered_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (answer_session_id, question_id)
);
```

### 1-2. correct_answer の形式ルールと正規化

| answer_type | correct_answer の形式 | 例 | 判定ルール |
|-------------|----------------------|-----|-----------|
| `choice` | option_label の値 | `"ア"` | trim後に完全一致 |
| `numeric` | 正規化済み数値文字列 | `"42"`, `"-3.5"` | 正規化後に完全一致（下記参照） |
| `fraction` | `"分子/分母"` 形式 | `"3/4"`, `"7/3"` | trim後に完全一致（通分・約分しない） |

**numeric の正規化ルール**（`raw_input` → `answer_value` 変換時に適用）:

```typescript
// 許可フォーマット: 整数・小数・負数のみ（科学記数法 1e2 等は拒否）
const NUMERIC_FORMAT = /^-?(\d+\.?\d*|\d*\.?\d+)$/

function normalizeNumeric(raw: string): string | null {
  const trimmed = raw.trim()
  if (!NUMERIC_FORMAT.test(trimmed)) return null  // "1e2", "abc" 等を拒否
  const num = Number(trimmed)
  if (!Number.isFinite(num)) return null  // 安全弁（通常は上の正規表現で弾かれる）
  // 整数は整数表記に統一: "42.0" → "42", "042" → "42"
  // 小数はそのまま: "-3.5" → "-3.5"
  return String(num)
}
// "42" → "42", "42.0" → "42", "042" → "42", "-3.5" → "-3.5"
// "1e2" → null（拒否）, "abc" → null（拒否）
// 正答登録時にも同じ正規化を適用し、correct_answer に正規化済み値を保存
```

> **設計判断**: 小学算数の問題範囲（整数、1〜2桁の小数、単純分数）では浮動小数点精度の問題は発生しない。
> `parseFloat(a) === parseFloat(b)` の代わりに `normalizeNumeric(a) === normalizeNumeric(b)` とすることで、
> 表記ゆれ（先頭ゼロ、末尾ゼロ）を吸収しつつ文字列比較で安全に判定する。
> `raw_input` に元入力を保持するため、判定ルール変更時の再採点も可能。
> 正規表現で許可フォーマットを制限し、`1e2` 等の教育上想定外の入力は拒否する。

### 1-3. RLSポリシー定義

全テーブルで `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` を適用。

```sql
-- ============================================================
-- question_sets: 生徒は approved かつ自学年のみ閲覧
-- ============================================================
CREATE POLICY "students_select_approved_question_sets" ON question_sets
  FOR SELECT TO authenticated
  USING (
    status = 'approved'
    AND grade = (
      SELECT s.grade FROM students s
      JOIN profiles p ON p.id = s.user_id
      WHERE p.id = auth.uid() AND p.role = 'student'
    )
  );

CREATE POLICY "coaches_manage_question_sets" ON question_sets
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('coach', 'admin'))
  );

-- 保護者は子どもが実際に受験した問題セットのみ閲覧可能
-- （結果表示で問題タイトル・設問詳細を表示するため）
-- 未受験のセットは非表示とし、将来のテスト内容が事前に見えることを防ぐ
CREATE POLICY "parents_select_child_attempted_question_sets" ON question_sets
  FOR SELECT TO authenticated
  USING (
    status = 'approved'
    AND EXISTS (
      SELECT 1 FROM answer_sessions ans
      JOIN parent_child_relations pcr ON pcr.student_id = ans.student_id
      JOIN parents p ON p.id = pcr.parent_id
      WHERE p.user_id = auth.uid()
        AND ans.question_set_id = question_sets.id
        AND ans.is_latest = true  -- 部分インデックス idx_answer_sessions_latest を活用
    )
  );

-- ============================================================
-- questions / question_options: question_sets のRLSに委譲
-- ============================================================
CREATE POLICY "select_questions_via_set" ON questions
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM question_sets qs WHERE qs.id = question_set_id)
  );

CREATE POLICY "coaches_manage_questions" ON questions
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('coach', 'admin'))
  );

-- question_options も同様のパターン（question_id → questions → question_sets）

-- ============================================================
-- answer_sessions: 生徒は自分のみ、講師は担当生徒のみ
-- ============================================================
CREATE POLICY "students_own_answer_sessions" ON answer_sessions
  FOR ALL TO authenticated
  USING (
    student_id = (
      SELECT s.id FROM students s WHERE s.user_id = auth.uid()
    )
  );

CREATE POLICY "coaches_view_assigned_answer_sessions" ON answer_sessions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM coach_student_relations csr
      JOIN coaches c ON c.id = csr.coach_id
      WHERE c.user_id = auth.uid() AND csr.student_id = answer_sessions.student_id
    )
  );

CREATE POLICY "parents_view_child_answer_sessions" ON answer_sessions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM parent_child_relations pcr
      JOIN parents p ON p.id = pcr.parent_id
      WHERE p.user_id = auth.uid() AND pcr.student_id = answer_sessions.student_id
    )
  );

CREATE POLICY "admins_all_answer_sessions" ON answer_sessions
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- student_answers: SELECT は answer_sessions のRLSに委譲、
--                  書き込みは student本人 + admin に限定
-- ============================================================
CREATE POLICY "select_student_answers_via_session" ON student_answers
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM answer_sessions a WHERE a.id = answer_session_id)
  );

CREATE POLICY "students_write_own_answers" ON student_answers
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM answer_sessions a
      JOIN students s ON s.id = a.student_id
      WHERE a.id = answer_session_id AND s.user_id = auth.uid()
        AND a.status = 'in_progress'  -- 採点後(graded)セッションへの追加入力を防止
    )
  );

CREATE POLICY "students_update_own_answers" ON student_answers
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM answer_sessions a
      JOIN students s ON s.id = a.student_id
      WHERE a.id = answer_session_id AND s.user_id = auth.uid()
        AND a.status = 'in_progress'  -- 採点後(graded)の改竄を防止
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM answer_sessions a
      JOIN students s ON s.id = a.student_id
      WHERE a.id = answer_session_id AND s.user_id = auth.uid()
        AND a.status = 'in_progress'  -- 更新後の値も同条件を満たすことを保証
    )
  );

CREATE POLICY "admins_write_student_answers" ON student_answers
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
```

> **設計判断**: `questions`/`question_options` は `question_sets` のRLSで間接的に制御。
> `student_answers` の **SELECT** は `answer_sessions` のRLSで間接的に制御（保護者・講師も閲覧可能）。
> `student_answers` の **書き込み**（INSERT/UPDATE）は student 本人 + admin に限定し、
> 保護者・講師が閲覧権限を持っていても解答データを改変できないようにする。
> さらに **INSERT/UPDATE** は `answer_sessions.status = 'in_progress'` の場合のみ許可し、
> 採点完了（`graded`）後の解答追加・改竄をRLSレベルで防止する。
> 保護者の `question_sets` 閲覧は子どもが実際に受験したセット（`answer_sessions` 経由）に限定し、
> 未受験のテスト内容が事前に見えることを防ぐ。
>
> **実装タスク**: 上記RLSポリシーは本計画書の設計定義であり、実DBへの適用はPoC実装フェーズで
> マイグレーションファイル（`supabase/migrations/YYYYMMDD_create_auto_grading_tables.sql`）として作成・適用する。
> 適用タイミング: PoC Step 1（テーブル作成）と同時。

### 1-4. 既存テーブルとの関係

```
study_sessions ─────┐
subjects ───────────┤
study_content_types ┤
                    ├─→ question_sets ──→ questions ──→ question_options
                    │                         │
students ───────────┤                         │
                    └─→ answer_sessions ──→ student_answers
```

### 1-5. answer_sessions の状態遷移

```
                    ┌──────────────┐
  saveDraftAnswers  │ in_progress  │  ← 途中保存中（算数の漸次入力で使用）
  (UPSERT)          │              │     student_answers: is_correct=NULL, scored_at=NULL
                    └──────┬───────┘
                           │ submitAndGradeAnswers
                           ↓
                    ┌──────────────┐
                    │   graded     │  ← 採点完了
                    │              │     student_answers: is_correct/scored_at セット済み
                    └──────────────┘
```

- **理科**: `in_progress` → `graded` を1回の提出で遷移（一括解答）
- **算数**: `in_progress` で複数回 `saveDraftAnswers` → 最終的に `submitAndGradeAnswers` で `graded` に遷移
- `completed` ステータスは予約（将来の手動採点フロー等）。現時点では `in_progress` → `graded` の2状態のみ使用

**student_answers の UPSERT 動作**（途中保存時）:
```sql
INSERT INTO student_answers (answer_session_id, question_id, raw_input, answer_value)
VALUES ($1, $2, $3, $4)
ON CONFLICT (answer_session_id, question_id) DO UPDATE SET
  raw_input = EXCLUDED.raw_input,
  answer_value = EXCLUDED.answer_value,
  answered_at = now();
-- is_correct, scored_at は途中保存時は NULL のまま
```

**`study_logs`（既存）と `answer_sessions`（新規）の責務分離:**

| 責務 | study_logs | answer_sessions + student_answers |
|------|-----------|----------------------------------|
| データ投入 | スパーク画面（手動入力） | 解答入力画面（自動採点） |
| 表示先 | 既存ダッシュボード（カレンダー・進捗バー） | **専用カード**（自動採点結果） |
| 集計指標 | 正答率（correct_count / total_problems） | 得点率（total_score / max_score） |
| グラフ | 既存の週次推移チャート | 専用の得点推移チャート（Phase 2以降） |

- PoC期間中は**完全分離**。`study_logs` への書き戻し・混在は行わない
- 保護者/講師画面では`study_logs`の既存カードとは**別の専用カード**として自動採点結果を表示
- 統合（例: カレンダーに自動採点データも反映）はPoC検証後に判断

---

## 2. Phase 1: 理科の選択式自動採点

### 2-0. スコープ

- 対象: 理科のみ（subject_id = 3）
- 解答形式: 選択式（choice）のみ
- 対象回数: まず 2〜3 セッション分で検証
- 必要な画面: 問題管理（coach/admin）、解答入力（student）、結果表示（student/parent）

### 2-1. 問題管理画面（Coach/Admin）

**ルート**: `/coach/questions/` (一覧) / `/coach/questions/new` (新規作成) / `/coach/questions/[id]` (編集)

**一覧画面**:
- フィルタ: 学年、科目、セッション、ステータス（draft/approved）
- 表示: タイトル、問題数、ステータス、作成日
- アクション: 新規作成、編集、承認
- **作成頻度に最適化**: 2〜3セッション分をまとめて登録できるフロー

#### 理科: フル入力モード（問題＋選択肢＋正答）

講師が問題文・選択肢・正答を一式登録する。週2回のWebテストに合わせて都度作成。

```
┌─────────────────────────────────────────┐
│ 問題セット作成 [理科]                    │
├─────────────────────────────────────────┤
│ 学年: [5年 ▼]  科目: [理科 ▼]           │
│ セッション: [第3回 ▼]                    │
│ タイトル: [第3回 理科 基本演習________]   │
├─────────────────────────────────────────┤
│ 問1  解答形式: [選択式 ▼]  配点: [1]     │
│   ア: [地球の自転___________] ○正解      │
│   イ: [地球の公転___________]            │
│   ウ: [月の自転_____________]            │
│   エ: [月の公転_____________]            │
│                          [＋選択肢追加]   │
├─────────────────────────────────────────┤
│ 問2  解答形式: [選択式 ▼]  配点: [1]     │
│   ア: [...] イ: [...] ウ: [...] エ: [...] │
├─────────────────────────────────────────┤
│ [＋問題を追加]                           │
│                                         │
│ [下書き保存]  [承認して公開]              │
└─────────────────────────────────────────┘
```

#### 算数: 解答のみクイック入力モード

算数の問題は紙プリントで既に配布済みのため、システムには**正答データのみ**を登録する。
講師は `(1) 4, (2) 0.23, (3) 3/4` のようなテキストを入力し、システムがパースして問題を自動生成する。

```
┌─────────────────────────────────────────┐
│ 問題セット作成 [算数 - 解答のみ]         │
├─────────────────────────────────────────┤
│ 学年: [6年 ▼]  科目: [算数 ▼]           │
│ セッション: [第3回 ▼]                    │
│ タイトル: [第3回 算数 基本演習________]   │
├─────────────────────────────────────────┤
│ 正答データを入力（1行1問 or カンマ区切り）│
│ ┌─────────────────────────────────────┐ │
│ │ (1) 4                               │ │
│ │ (2) 0.23                            │ │
│ │ (3) 3/4                             │ │
│ │ (4) -12                             │ │
│ │ (5) 100                             │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ [パースしてプレビュー]                   │
├─────────────────────────────────────────┤
│ パース結果:                             │
│ 問(1)  答: 4      型: numeric   ✅      │
│ 問(2)  答: 0.23   型: numeric   ✅      │
│ 問(3)  答: 3/4    型: fraction  ✅      │
│ 問(4)  答: -12    型: numeric   ✅      │
│ 問(5)  答: 100    型: numeric   ✅      │
│                                         │
│ [下書き保存]  [承認して公開]              │
└─────────────────────────────────────────┘
```

**パースルール**（`parseMathAnswerText()` — 純粋関数、DBアクセスなし）:
```typescript
// "(1) 4" → { questionNumber: "(1)", correctAnswer: "4", answerType: "numeric" }
// "(3) 3/4" → { questionNumber: "(3)", correctAnswer: "3/4", answerType: "fraction" }
function parseMathAnswerText(text: string): { questions: ParsedQuestion[]; errors: string[] } {
  // 正規表現で (番号) 値 のパターンを抽出
  // "/" を含む → fraction、それ以外で数値変換可能 → numeric
  // fraction の場合: 分母が 0 なら errors に記録しスキップ（"3/0" は不正）
  // numeric の場合: NUMERIC_FORMAT 正規表現で検証（"1e2" 等は拒否）
  // 配点はデフォルト1（後から個別編集可能）
  // エラー行はスキップし errors に記録
}
// UI側で [パースしてプレビュー] → parseMathAnswerText() → 結果表示
//         [下書き保存/承認して公開] → createMathQuestionsFromParsed() → DB書き込み
```

> **設計判断**: 算数は問題文がシステムに不要（紙に印刷済み）なので、
> 講師の登録負荷を最小化するためクイック入力モードを採用。
> 1セット5〜20問程度の正答データを1分以内に登録可能にする。
> パース（プレビュー）と確定登録を分離し、確定前にDB書き込みしないことで誤登録を防止する。

**Server Actions** (`app/actions/question-management.ts`):
```typescript
// 問題セット CRUD
export async function createQuestionSet(input: CreateQuestionSetInput)
export async function updateQuestionSet(id: number, input: UpdateQuestionSetInput)
export async function getQuestionSets(filters: QuestionSetFilters)
export async function getQuestionSetDetail(id: number)
export async function approveQuestionSet(id: number)

// 問題 CRUD（問題セット内）
export async function addQuestion(questionSetId: number, input: CreateQuestionInput)
export async function updateQuestion(id: number, input: UpdateQuestionInput)
export async function deleteQuestion(id: number)

// 選択肢 CRUD（問題内）
export async function setQuestionOptions(questionId: number, options: OptionInput[])

// 算数クイック入力 - Step 1: テキストをパース（DB書き込みなし・プレビュー用）
export function parseMathAnswerText(
  answerText: string   // "(1) 4\n(2) 0.23\n(3) 3/4"
): { questions: ParsedQuestion[]; errors: string[] }

// 算数クイック入力 - Step 2: パース結果を確定してDB登録
export async function createMathQuestionsFromParsed(
  questionSetId: number,
  parsedQuestions: ParsedQuestion[]
): Promise<{ createdCount: number }>
```

### 2-2. 生徒の解答入力画面

**ルート**: `/student/answer/[questionSetId]`

**入口**: スパーク画面（既存）またはダッシュボードに「解答入力」ボタンを追加

**画面構成**:
```
┌─────────────────────────────────────────┐
│ 第3回 理科 基本演習          3/10問完了   │
├─────────────────────────────────────────┤
│                                         │
│ 問1                                     │
│ ┌─────────────────────────────────────┐ │
│ │ ア  地球の自転                ○    │ │
│ │ イ  地球の公転                ○    │ │
│ │ ウ  月の自転                  ●    │ │ ← 選択済み
│ │ エ  月の公転                  ○    │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ 問2                                     │
│ ┌─────────────────────────────────────┐ │
│ │ ア  ...                       ○    │ │
│ │ イ  ...                       ○    │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ...                                     │
│                                         │
│ [提出する]                              │
└─────────────────────────────────────────┘
```

**UX要件**:
- 全問一覧表示（スクロール）— 問題数が少ない（10〜20問程度）前提
- 未回答の問題にはハイライト表示
- 「提出する」押下時に未回答があれば確認ダイアログ
- iPad最適化: タップしやすい選択肢サイズ（min-height: 48px）

**Server Actions** (`app/actions/student-answer.ts`):
```typescript
// 解答可能な問題セット一覧（生徒の学年・approved のみ）
export async function getAvailableQuestionSets(studentId: number)

// 問題セットの全問題＋選択肢を取得（解答入力用）
export async function getQuestionsForAnswering(questionSetId: number)

// 解答提出＋自動採点
export async function submitAnswers(input: SubmitAnswersInput)
```

### 2-3. 自動採点ロジック

`submitAnswers()` 内で同期的に実行:

```typescript
async function submitAnswers(input: {
  questionSetId: number
  answers: { questionId: number; rawInput: string | null }[]
}) {
  // 1. 既存の answer_session を確認（冪等性保証）
  //    - graded → 既存の採点結果をそのまま返す（二重送信に対して冪等）
  //    - in_progress → 通常の採点フローを実行（下記 2〜5）
  //    - セッションなし → attempt_number=1, is_latest=true で新規作成し採点
  //    ※ 新しい attempt は絶対に作成しない（再受験は startNewAttempt() からのみ）
  // 2. questions テーブルから correct_answer, answer_type を一括取得
  // 3. 各解答を gradeAnswer() で正規化＋判定
  // 4. student_answers を一括 INSERT/UPDATE（raw_input, answer_value, is_correct, scored_at）
  // 5. total_score / max_score を計算して answer_sessions を UPDATE（status: 'graded'）
  // 6. 結果を返却
  return {
    answerSessionId: number,
    attemptNumber: number,
    totalScore: number,
    maxScore: number,
    percentage: number,
    details: { questionId, isCorrect, correctAnswer, rawInput, answerValue }[]
  }
}
```

**再受験フロー**:
- 生徒は同じ問題セットに何度でも解答可能
- 前回の `is_latest` を `false` に更新し、新しいセッションを `is_latest=true` で作成
- 結果表示・保護者画面では `is_latest=true` のみ表示（過去の試行は履歴として保持）
- 講師画面では全試行を閲覧可能（成長の可視化）

**トランザクション保証**:

共通方針: Supabase `.rpc()` で PostgreSQL 関数を呼び出し、原子性を保証。

- **`submitAnswers()`**: セッション作成（初回のみ）+ 解答INSERT + 採点UPDATE + ステータス変更を単一トランザクションで実行。
  `is_latest` の更新は行わない（既存セッションのステータスを `in_progress` → `graded` に変更するのみ）。
  初回（セッションなし）の場合のみ `attempt_number=1, is_latest=true` で新規作成する。
- **`startNewAttempt()`**: `is_latest` 切替 + 新セッション作成を単一トランザクションで実行（下記参照）。
  `attempt_number` の採番は `SELECT MAX(attempt_number) + 1 ... FOR UPDATE` で競合回避。
  一意制約衝突時（23505）は `attempt_number` をインクリメントして最大3回リトライ。

**`startNewAttempt(questionSetId)` の仕様**:
```typescript
// Server Action: 再受験セッションを作成（採点は行わない）
export async function startNewAttempt(questionSetId: number): Promise<{ answerSessionId: number; attemptNumber: number }> {
  // 単一トランザクション（.rpc()）で以下を実行:
  //   1. 現在の is_latest=true セッションを FOR UPDATE でロック
  //   2. 前回セッションの is_latest を false に更新
  //   3. attempt_number = MAX(attempt_number) + 1 で新セッション作成（is_latest=true, status='in_progress'）
  //   4. 一意制約衝突(23505) → リトライ（最大3回）
  // 前提条件: 前回セッションが graded であること（in_progress → エラー返却: 途中保存がある旨を通知）
}
```

**二重送信防止**:
- **クライアント側**: 「提出する」ボタンを `isSubmitting` state で即座に無効化
- **サーバー側**: `submitAnswers()` は**採点のみ**を行い、新しいattemptは作成しない
  - `graded` → 既存の採点結果をそのまま返す（冪等。時間窓に依存しない）
  - `in_progress` → 通常の採点フローを実行
  - セッションなし → `attempt_number=1` で新規作成＋採点
- **再受験の分離**: 再受験は `startNewAttempt(questionSetId)` という**別のServer Action**からのみ開始。
  `submitAnswers()` の二重送信では絶対に新しいattemptを作成しない

> **オプション（将来検討）**: `submission_token`（1提出1トークン）をクライアントで生成し、サーバー側で重複チェックする方式。
> PoC段階ではクライアント側ボタン無効化 + サーバー側ステータスガードで十分と判断。

### 2-4. 結果表示画面

**ルート**: `/student/answer/[questionSetId]/result`

**画面構成**:
```
┌─────────────────────────────────────────┐
│ 第3回 理科 基本演習  結果               │
├─────────────────────────────────────────┤
│                                         │
│         🎯 8 / 10 問正解               │
│            80点 / 100点                 │
│                                         │
│ ───────────────────────────────────────  │
│ 問1  ✅ 正解  あなたの解答: ア          │
│ 問2  ❌ 不正解  あなた: ウ → 正解: イ   │
│ 問3  ✅ 正解  あなたの解答: エ          │
│ ...                                     │
│                                         │
│ [ダッシュボードに戻る]                   │
└─────────────────────────────────────────┘
```

**保護者画面への反映**（study_logs とは完全分離の専用カード）:
- 既存の保護者ダッシュボードに**専用カード「自動採点結果」**を追加（既存カードの下に配置）
- `study_logs` の既存グラフ・カレンダーには混在させない
- 表示: 問題セット名、得点/満点、正答率、受験日時、試行回数
- データソース: `answer_sessions WHERE is_latest=true`（最新の試行のみ）

### 2-5. ファイル構成

```
app/
  actions/
    question-management.ts   # 問題管理 Server Actions
    student-answer.ts        # 解答提出・採点 Server Actions
  coach/
    questions/
      page.tsx               # 問題セット一覧
      new/
        page.tsx             # 新規作成
      [id]/
        page.tsx             # 編集
        question-set-editor.tsx  # 編集フォーム（Client Component）
  student/
    answer/
      page.tsx               # 解答可能な問題セット一覧
      [questionSetId]/
        page.tsx             # 解答入力画面（Server Component）
        answer-form.tsx      # 解答フォーム（Client Component）
        result/
          page.tsx           # 結果表示
supabase/
  migrations/
    YYYYMMDD_create_question_tables.sql
```

### 2-6. Phase 1 完了条件

- [ ] DBマイグレーション適用（5テーブル + RLS）
- [ ] 講師が問題セットを作成・承認できる
- [ ] 生徒が理科の問題に選択式で解答できる
- [ ] 自動採点が正しく動作する
- [ ] 結果が生徒画面に表示される
- [ ] 結果が保護者画面に表示される
- [ ] `pnpm run build` 成功

---

## 3. Phase 2: 算数の数値入力自動採点 + 途中保存

### 3-0. スコープ

- 対象: 算数（subject_id = 1）
- 解答形式: `numeric`（整数・小数）+ `fraction`（分数）
- Phase 1 の基盤（テーブル・採点ロジック・結果表示）を再利用
- **新規**: 漸次入力（途中保存）対応 — 生徒は1週間で2〜3回に分けて解答を入力

### 3-1. 算数の運用フロー

```
[講師] 解答データ登録            [生徒] 漸次入力
  "(1) 4, (2) 0.23, ..."           紙で問題を解く
         ↓                              ↓
  question_set + questions 作成     Day 1: (1)〜(5) を入力 → 途中保存
                                        ↓
                                    Day 2: (6)〜(10) を追加入力 → 途中保存
                                        ↓
                                    Day 3: (11)〜(15) を追加 → 全問提出 → 自動採点
```

**ポイント**:
- 生徒は問題を紙で解き、解答だけをWebに入力（問題文はシステムに表示されない）
- 1回で全問入力する必要はなく、解いた分だけ都度入力して途中保存できる
- 全問入力後（または任意のタイミングで）「提出して採点」を選択

### 3-2. 算数用の入力UI

**数値入力**:
```
┌─────────────────────────────────────────┐
│ 第3回 算数 基本演習       5/15問 入力済み │
│                          [途中保存済み ✓] │
├─────────────────────────────────────────┤
│                                         │
│ (1)  ┌──────────────┐                   │
│      │  4           │  ← 入力済み       │
│      └──────────────┘                   │
│                                         │
│ (2)  ┌──────────────┐                   │
│      │  0.23        │  ← 入力済み       │
│      └──────────────┘                   │
│                                         │
│ (3)  ┌─────┐                            │
│      │  3  │ ← 分子  （分数入力）       │
│      ├─────┤                            │
│      │  4  │ ← 分母                     │
│      └─────┘                            │
│                                         │
│ (4)  ┌──────────────┐                   │
│      │              │  ← 未入力         │
│      └──────────────┘                   │
│ ...                                     │
│                                         │
│ [途中保存]          [提出して採点する]     │
└─────────────────────────────────────────┘
```

**UX要件**:
- 問題番号のみ表示（問題文なし — 紙に印刷済み）
- `answer_type` に応じて入力UIを自動切替（numeric → テキスト入力、fraction → 分子/分母2欄）
- 「途中保存」: 入力済みの解答を保存、ステータスは `in_progress` のまま
- 「提出して採点する」: 全解答を確定し、自動採点を実行
- 前回保存した解答は次回アクセス時に自動復元
- 未入力の問題があっても提出可能（確認ダイアログ表示）

**分数入力コンポーネント** (`components/fraction-input.tsx`):
- 分子/分母の2つの数値入力フィールド
- 視覚的に分数線を表示
- 出力値: `"3/4"` 形式の文字列
- バリデーション: 分母 ≠ 0

**数値入力コンポーネント**:
- `<input type="text" inputMode="decimal">` を使用
- iPad のテンキーを表示させる
- マイナス値・小数対応

### 3-3. 途中保存（漸次入力）の実装

**状態遷移**:
```
[初回アクセス] → answer_session (status: 'in_progress') 作成
                  ↓
[途中保存] ×N → student_answers を UPSERT（answer_session は 'in_progress' のまま）
                  ↓
[提出して採点] → 全 student_answers を採点 → answer_session (status: 'graded')
```

**Server Actions** (`app/actions/student-answer.ts` に追加):
```typescript
// 途中保存: 入力済みの解答のみ保存（未採点）
export async function saveDraftAnswers(input: {
  questionSetId: number
  answers: { questionId: number; rawInput: string | null }[]
}): Promise<{ answerSessionId: number; savedCount: number }> {
  // 1. 既存の in_progress セッションを取得 or 新規作成
  // 2. student_answers を UPSERT（ON CONFLICT (answer_session_id, question_id) DO UPDATE）
  //    - raw_input, answer_value を更新
  //    - is_correct = NULL, scored_at = NULL のまま（未採点）
  // 3. savedCount を返却
}

// 最終提出: 全解答を採点してセッションを完了
export async function submitAndGradeAnswers(input: {
  answerSessionId: number
}): Promise<GradeResult> {
  // 1. answer_session の status が 'in_progress' であることを確認
  // 2. 全 student_answers を取得
  // 3. gradeAnswer() で各問を採点 → is_correct, scored_at を UPDATE
  // 4. total_score / max_score を計算
  // 5. answer_session を 'graded' に更新
  // 6. 結果を返却
}

// 途中保存データの復元
export async function getDraftAnswers(
  questionSetId: number
): Promise<{ answerSessionId: number; answers: DraftAnswer[] } | null> {
  // in_progress かつ is_latest=true のセッションから保存済み解答を取得
}
```

**再受験時の途中保存**:
- 前回 `graded` のセッションがある場合 → 新しい `in_progress` セッションを作成（`attempt_number + 1`）
- 前回 `in_progress` のセッションがある場合 → そのまま続きを入力
- 前回セッションの `is_latest` は新セッション作成時に `false` に更新

**トランザクション・冪等性**:
- `saveDraftAnswers`: UPSERT は冪等。同一解答の再保存は安全（`ON CONFLICT DO UPDATE`）
- `submitAndGradeAnswers`: 冒頭でステータスチェック
  - `graded` → 既存結果をそのまま返す（冪等。時間窓に依存しない）
  - `in_progress` → 採点〜ステータス更新を単一トランザクションで実行
  - 再受験は `startNewAttempt()` からのみ開始（採点APIからは新attemptを作成しない）
- クライアント側: 「途中保存」「提出して採点する」ボタンを `isSubmitting` で即座に無効化

### 3-4. 算数用の採点ロジック拡張

`gradeAnswer()` 関数をPhase 1の `submitAnswers()` から抽出して共有化:

```typescript
// raw_input → answer_value の正規化 + 採点を一括実行
function gradeAnswer(
  answerType: 'choice' | 'numeric' | 'fraction',
  rawInput: string | null,
  correctAnswer: string   // 登録時に正規化済み
): { answerValue: string | null; isCorrect: boolean } {
  if (rawInput === null || rawInput.trim() === '') {
    return { answerValue: null, isCorrect: false }
  }

  switch (answerType) {
    case 'choice': {
      const normalized = rawInput.trim()
      return { answerValue: normalized, isCorrect: normalized === correctAnswer.trim() }
    }

    case 'numeric': {
      // normalizeNumeric: セクション 1-2 で定義した正規化関数
      const normalized = normalizeNumeric(rawInput)
      if (normalized === null) return { answerValue: rawInput.trim(), isCorrect: false }
      return { answerValue: normalized, isCorrect: normalized === correctAnswer }
    }

    case 'fraction': {
      // "分子/分母" 形式。trim のみで完全一致判定
      const normalized = rawInput.trim()
      // 防御的検証: 分母0の入力は不正解扱い（パーサで弾くが二重防御）
      const parts = normalized.split('/')
      if (parts.length === 2 && Number(parts[1]) === 0) {
        return { answerValue: normalized, isCorrect: false }
      }
      return { answerValue: normalized, isCorrect: normalized === correctAnswer.trim() }
    }
  }
}

// student_answers に保存する値:
//   raw_input: rawInput（生徒の入力そのまま）
//   answer_value: gradeAnswer().answerValue（正規化済み）
//   is_correct: gradeAnswer().isCorrect
//   scored_at: now()
```

### 3-5. Phase 2 完了条件

- [ ] 数値入力コンポーネントが iPad で快適に動作する
- [ ] 分数入力コンポーネントが正しく `"分子/分母"` 形式を出力する
- [ ] 途中保存が正常に動作する（保存→復元→追加入力→再保存）
- [ ] 「提出して採点する」で全問が正しく自動採点される（整数、小数、分数）
- [ ] 問題管理画面の解答のみクイック入力で算数問題を作成できる
- [ ] 結果表示が理科と同じUXで動作する
- [ ] 再受験時に前回の途中保存データが適切にハンドリングされる
- [ ] `pnpm run build` 成功

---

## 4. Phase 3: 理科AI振り返り対話

### 4-0. スコープ

- Phase 1 の自動採点結果をコンテキストとして使用
- 既存の週次リフレクト基盤（`reflect-chat.tsx`, `reflect-coaching.ts`）のパターンを転用
- ただし**単元単位**の振り返り（週次ではなく、問題セット完了後に実施）

### 4-1. 振り返りの位置づけ

```
[解答提出] → [自動採点・結果表示] → [振り返り対話（任意）]
```

- 結果画面に「振り返りをする」ボタンを配置
- 全問正解でも振り返り可能（理解の言語化が目的）
- 振り返り結果は記録・保護者/講師画面で閲覧可能

### 4-2. 対話フロー（テンプレ型）

既存のリフレクトが GROW モデル（3〜6ターン）を使うのに対し、
理科振り返りは**3ターン固定**の短いフォーマットで運用安定化:

```
Turn 1 (AI): 採点結果を踏まえた導入
  「10問中8問正解だったね！間違えた問題について一緒に振り返ろう。
   問2は「地球の公転」が正解だったけど、どう考えてウを選んだ？」
  → 生徒: 自由入力 or テンプレ選択
    - 「問題をよく読んでいなかった」
    - 「2つで迷った」
    - 「わからなかった」
    - （自由入力）

Turn 2 (AI): 理解の深掘り
  「なるほど、迷ったんだね。自転と公転の違いを自分の言葉で説明できる？」
  → 生徒: 自由入力 or テンプレ選択
    - 「自転は自分で回ること、公転は太陽のまわりを回ること」
    - 「うまく説明できない」
    - （自由入力）

Turn 3 (AI): まとめ＋激励
  「いい説明だね！ポイントは〇〇。次に同じ問題が出たら自信を持って解けるよ。」
```

### 4-3. 技術実装

**新規ファイル**:
```
app/
  student/
    answer/
      [questionSetId]/
        reflect/
          page.tsx                    # 振り返り画面（Server Component）
          science-reflect-chat.tsx    # チャットUI（Client Component）
lib/
  openai/
    science-reflection.ts            # プロンプト生成
```

**DB**: 既存の `coaching_sessions` テーブルを拡張するか、新テーブルを追加

```sql
-- 既存 coaching_sessions に session_type カラムを追加
ALTER TABLE coaching_sessions
  ADD COLUMN session_type VARCHAR(20) NOT NULL DEFAULT 'weekly_reflect'
    CHECK (session_type IN ('weekly_reflect', 'science_reflect'));

-- 理科振り返りの場合、answer_session_id で紐づけ
ALTER TABLE coaching_sessions
  ADD COLUMN answer_session_id BIGINT REFERENCES answer_sessions(id);
```

**プロンプト設計** (`lib/openai/science-reflection.ts`):

```typescript
// プロンプトバージョン管理: 定数で管理し、coaching_sessions.metadata に記録
const SCIENCE_REFLECT_PROMPT_VERSION = 'v1.0'

export function getScienceReflectPrompt(context: {
  studentName: string
  questionSetTitle: string
  totalScore: number
  maxScore: number
  incorrectQuestions: {
    questionNumber: string
    studentAnswer: string
    correctAnswer: string
    correctOptionText: string  // 選択肢の本文
    errorType?: string         // question_options.error_type（あれば）
  }[]
  turnNumber: 1 | 2 | 3
  conversationHistory: Message[]
}): string {
  // Turn 1: 結果概要 + 間違えた問題の中から1つ選んで質問
  // Turn 2: 生徒の回答を受けて理解を深掘り
  // Turn 3: まとめ + 次回への激励
}
```

**堅牢性設計**（既存 `coach-feedback.ts` のパターンを転用）:

```typescript
// 1. フォールバックメッセージ（API障害時）
const FALLBACK_MESSAGES = {
  turn1: '今回の結果を振り返ってみよう。間違えた問題について、どう思った？',
  turn2: 'もう少し詳しく教えてくれる？',
  turn3: 'よく頑張ったね！次も一緒にがんばろう！',
}

// 2. API呼び出し with リトライ + タイムアウト
async function generateReflectMessage(context, turnNumber) {
  try {
    const response = await openai.chat.completions.create({
      // ...
    }, { timeout: 8000 })  // 8秒タイムアウト
    return response.choices[0].message.content
  } catch (error) {
    console.error('[ScienceReflect] API error:', error)
    // Langfuse にエラー記録
    return FALLBACK_MESSAGES[`turn${turnNumber}`]
  }
}

// 3. 保存失敗時の再送
// coaching_messages の保存は fire-and-forget ではなく、
// 失敗時はクライアント側で最大2回リトライ（既存 reflect-chat と同パターン）

// 4. プロンプトバージョン記録
// coaching_sessions 作成時に metadata: { prompt_version: SCIENCE_REFLECT_PROMPT_VERSION } を保存
// 将来のプロンプト改善時に、どのバージョンで生成したか追跡可能
```

**テンプレ選択肢の生成**:
- Turn 1: 固定選択肢（「問題をよく読んでいなかった」「迷った」「わからなかった」）
- Turn 2: AIが生成する選択肢 + 自由入力
  - ただし選択肢はサーバーサイドで生成し、クライアントに渡す
  - 生徒は選択 or 自由入力のどちらでも可

### 4-4. 保護者/講師への振り返り共有

- 振り返りの要約（AI生成、100〜150文字）を `coaching_sessions.summary` に保存
- 保護者ダッシュボード: 「理科振り返り」カードとして表示
- 講師画面: 生徒詳細ページの学習タブに表示

### 4-5. Phase 3 完了条件

- [ ] 結果画面から振り返り対話を開始できる
- [ ] 3ターンの対話が正常に動作する
- [ ] テンプレ選択肢 + 自由入力の両方が使える
- [ ] 振り返り要約が生成・保存される
- [ ] 保護者画面で振り返り結果を閲覧できる
- [ ] `pnpm run build` 成功

---

## 5. 技術的な設計判断

### 5-1. 既存 study_logs との責務分離

| 項目 | study_logs（既存） | answer_sessions + student_answers（新規） |
|------|-------------------|------------------------------------------|
| 粒度 | コンテンツ種別ごとの集計 | 問題ごとの正誤 |
| 入力者 | 生徒（手動） | 生徒（解答）→ システム（採点） |
| 用途 | 週次進捗・カレンダー | 自動採点・弱点分析 |
| 表示場所 | 既存ダッシュボードカード群 | **専用カード**（別セクション） |
| API | `app/actions/study-log.ts` | `app/actions/student-answer.ts` |

**PoC期間中のルール**:
1. `study_logs` への書き戻しは**行わない**（集計ロジック劣化リスク回避）
2. 既存ダッシュボードのカレンダー・進捗バーは**変更しない**
3. 自動採点結果は専用カード・専用APIで完全分離
4. スパーク入力（既存）と解答入力（新規）は独立して動作

統合判断はPoC検証後（保護者・講師のフィードバックを踏まえて）。

### 5-2. iPad 最適化

- タップ領域: 最低 48px × 48px（Apple HIG準拠）
- 選択肢: `RadioGroup` コンポーネント（Radix UI）をカスタム
- 数値入力: `inputMode="decimal"` で iOS テンキー表示
- 分数入力: 分子→分母のフォーカス自動移動

### 5-3. パフォーマンス

- 問題データは Server Component でプリフェッチ → Client Component に渡す
- 理科: 解答提出は1回の Server Action 呼び出しで全問一括送信
- 算数: 途中保存は UPSERT で冪等（同じ問題の再保存は UPDATE）。採点は最終提出時に1回
- 途中保存データの復元: `getDraftAnswers()` で in_progress セッションから一括取得（N+1 なし）
- 採点はサーバーサイドで同期実行（問題数が少ないため非同期不要）

### 5-4. 認可モデル

| 操作 | student | coach | admin |
|------|---------|-------|-------|
| 問題セット作成 | - | ✅ | ✅ |
| 問題セット承認 | - | ✅ | ✅ |
| 解答提出 | ✅（自分のみ） | - | - |
| 採点結果閲覧 | ✅（自分のみ） | ✅（担当生徒） | ✅（全員） |
| 振り返り実施 | ✅ | - | - |
| 振り返り閲覧 | ✅（自分のみ） | ✅（担当生徒） | ✅（全員） |

---

## 6. リスクと対策

| リスク | 影響 | 対策 |
|--------|------|------|
| 問題データの初期登録が重い | 運用開始が遅れる | 算数: 解答のみクイック入力で1分以内に1セット登録可能。理科: 2〜3セッション分をまとめて都度登録 |
| 算数クイック入力のパースエラー | 正答が誤登録される | パース結果のプレビュー画面で講師が確認。承認ステップ（draft→approved）で二重チェック |
| iPad での入力体験が悪い | 生徒の利用率低下 | Phase 1 の理科（タップのみ）で早期検証。算数の数値入力は Phase 2 で改善余地あり |
| 途中保存データの不整合 | 生徒の入力が消える | UPSERT で冪等性を保証。`in_progress` セッションは明示的に削除しない限り保持 |
| 分数の完全一致が厳しすぎる | 正解なのに不正解判定 | 講師に「出題時の形式で解答する」旨を周知。問題登録時に正答形式を明記 |
| AI振り返りの品質 | 不自然な対話 | テンプレ選択肢で入力を構造化。プロンプトに具体例を多数含める |
| AI API障害で振り返りが止まる | 生徒の体験中断 | フォールバックメッセージで対話継続（既存coach-feedbackと同パターン） |
| 数値正規化の表記ゆれ | 正解なのに不正解判定 | `normalizeNumeric()` で統一。`raw_input` 保持で再採点可能 |
| 再受験データの膨張 | DB容量・クエリ性能 | `is_latest` 部分インデックスで最新のみ高速取得。古い試行は表示制限 |

---

## 7. マイルストーン

| Phase | 主要マイルストーン | 検証ポイント |
|-------|-------------------|-------------|
| **1** | 理科 2〜3回分の自動採点が動作 + 算数の解答のみクイック入力が動作 | 生徒が迷わず操作できるか。講師の問題登録負荷は許容範囲か（理科フル入力 / 算数クイック入力） |
| **2** | 算数の途中保存＋数値/分数入力＋自動採点が動作 | iPad での数値入力体験。途中保存→復元のUXが直感的か。分数の完全一致判定で問題ないか |
| **3** | 理科振り返り対話が動作 | 生徒が「わかった」を言語化できるか。対話の自然さ |
