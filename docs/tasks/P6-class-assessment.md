# Phase 6: クラス内テスト機能（算数プリント・漢字テスト）

**期間:** 4-6週間（Phase 1-3）
**進捗:** 25% (2/8フェーズ完了 - P6-1 DB, P6-2 Server Actions)
**状態:** 🔄 実装中（P6-2完了、次: P6-3 指導者バッチ入力UI）
**ブランチ:** `feature/p6-class-assessment`

---

## 概要

塾の算数プリントと漢字テストの採点結果をStudySparkに取り込み、生徒・保護者・指導者が閲覧・応援できる機能を実装する。

### 基本方針

| 項目 | 決定事項 |
|------|---------|
| **データ入力者** | 指導者のみ（生徒・保護者は閲覧専用） |
| **入力方式** | 指導者用バッチ入力画面を優先実装 |
| **生徒体験** | 「先生の採点結果」として表示、編集UIなし |
| **教育設計** | 点数だけでなく「次の一歩」を毎回提示 |

### 設計原則（UX/教育効果）

1. **役割分離の明示**: 「先生入力」「生徒・保護者は閲覧のみ」をUI文言で明確化
2. **行動を促すコピー**: 点数表示と同時に具体的な次の学習行動を提案
3. **成功体験の強調**: 高得点時は祝福演出、低得点時は励ましをデフォルト表示
4. **文脈付きカード**: 前回比矢印、満点/得点をセット表示
5. **ペルソナ別情報量**: 各ロールで必要な情報のみ表示

---

## データモデル設計

### 設計方針

| 項目 | 決定事項 | 理由 |
|------|---------|------|
| **マスタ連携** | FK制約で厳密に紐付け | データ整合性を担保、満点等はマスタから取得 |
| **attempt_number上限** | 算数:1-2、漢字:1（再提出は別レコード） | CHECK制約で入力ミス防止 |
| **前回比の定義** | 同テスト種別 × 同attempt_number の直近（再提出・欠席除外） | 公平な比較のため |
| **クラス平均の定義** | 同マスタ × 通常提出のみ（**日付問わず**、欠席/再提出除外） | 「テスト全体の平均」として公平 |
| **再提出回数** | 1回のみ（同一テストにつき） | ユニーク制約で担保 |
| **欠席表現** | status ENUM('completed', 'absent', 'not_submitted') | 欠席/未提出/完了を明確に区別 |
| **初回欠席→補習** | 補習を**通常提出**扱い（is_resubmission=false） | 初回未受験なので「再」提出ではない |
| **代行修正** | 管理者ロールで他コーチの入力を修正可 | 運用柔軟性を確保 |
| **値の固定** | 入力時点のmax_score/gradeをレコードに保存 | 将来のマスタ変更で過去データの%が変わらないように |
| **固定値の不変** | max_score_at_submission / grade_at_submission はUPDATE不可 | 入力時点の値を永続的に保持 |
| **学年整合チェック** | grade_at_submissionとマスタ学年で比較（現学年は参照しない） | 進級後の補填登録にも対応 |
| **修正監査** | 管理者修正時はmodified_byに記録 | 誰が修正したか追跡可能 |
| **マスタ不変** | assessment_mastersは作成後の更新禁止 | 既存レコードとの整合性を担保 |

### テーブル: `assessment_masters`（マスタデータ）

```sql
-- ★ マスタを先に作成（class_assessmentsがFKで参照）
CREATE TABLE assessment_masters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  assessment_type VARCHAR(20) NOT NULL CHECK (assessment_type IN ('math_print', 'kanji_test')),
  grade VARCHAR(10) NOT NULL CHECK (grade IN ('5年', '6年')),
  session_number INTEGER NOT NULL CHECK (session_number >= 1),
  attempt_number INTEGER NOT NULL DEFAULT 1,

  -- attempt_number上限制約（種別ごと）
  -- 算数プリント: 1-2（週2回）
  -- 漢字テスト: 1（週1回）
  CONSTRAINT valid_attempt_number CHECK (
    (assessment_type = 'math_print' AND attempt_number BETWEEN 1 AND 2) OR
    (assessment_type = 'kanji_test' AND attempt_number = 1)
  ),

  -- メタ情報
  max_score INTEGER NOT NULL DEFAULT 100 CHECK (max_score > 0),
  scheduled_date DATE,                      -- 予定実施日（オプション）
  description VARCHAR(200),                 -- 説明（例: 「第10回 分数の計算」）

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (assessment_type, grade, session_number, attempt_number)
);

-- 検索用インデックス
CREATE INDEX idx_assessment_masters_type_grade ON assessment_masters(assessment_type, grade);
```

### テーブル: `class_assessments`

```sql
-- ★ ステータスENUM型を先に作成
CREATE TYPE assessment_status AS ENUM ('completed', 'absent', 'not_submitted');

CREATE TABLE class_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 対象生徒
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,

  -- ★ マスタ参照（FK制約で厳密に紐付け）
  master_id UUID NOT NULL REFERENCES assessment_masters(id),

  -- ★ ステータス（完了/欠席/未提出）
  -- completed: 得点入力済み
  -- absent: 欠席（補習対象）
  -- not_submitted: 未提出（指導者がまだ入力していない）
  status assessment_status NOT NULL DEFAULT 'not_submitted',

  -- 得点（status='completed'のときのみ有効値、それ以外はNULL）
  score INTEGER CHECK (score >= 0),

  -- ★ statusとscoreの整合性チェック
  CONSTRAINT score_status_consistency CHECK (
    (status = 'completed' AND score IS NOT NULL) OR
    (status IN ('absent', 'not_submitted') AND score IS NULL)
  ),

  -- ★ 入力時点の値を固定（将来のマスタ変更で過去データの%が変わらないように）
  max_score_at_submission INTEGER NOT NULL CHECK (max_score_at_submission > 0),
  grade_at_submission VARCHAR(10) NOT NULL CHECK (grade_at_submission IN ('5年', '6年')),

  -- 実施日（テスト実施予定日）
  -- ★ status='not_submitted'の場合も必須（予定日を記録）
  -- ★ status='absent'の場合は欠席した日を記録
  -- ★ status='completed'の場合は実際に受験した日を記録
  assessment_date DATE NOT NULL,

  -- 再提出フラグ（通常提出:false、再提出:true）
  -- ★ 再提出は1回のみ許可（下記ユニーク制約で担保）
  -- ★ 初回欠席→補習は通常提出扱い（is_resubmission=false）
  is_resubmission BOOLEAN NOT NULL DEFAULT false,

  -- ★ is_resubmissionとstatusの組み合わせ制約
  -- 再提出は必ずcompleted（欠席/未提出の再提出は論理的に不整合）
  CONSTRAINT resubmission_must_be_completed CHECK (
    is_resubmission = false OR status = 'completed'
  ),

  -- 監査情報
  grader_id UUID NOT NULL REFERENCES auth.users(id), -- 入力した指導者
  modified_by UUID REFERENCES auth.users(id),        -- ★ 管理者が修正した場合に記録
  source VARCHAR(20) NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'import')),

  -- タイムスタンプ
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- ★ 一意制約: 同一生徒・同一マスタにつき、通常提出1回＋再提出1回のみ許可
  -- assessment_dateを除外することで、再提出が1回のみに制限される
  UNIQUE (student_id, master_id, is_resubmission)
);

-- インデックス
CREATE INDEX idx_class_assessments_student_date ON class_assessments(student_id, assessment_date DESC);
CREATE INDEX idx_class_assessments_master ON class_assessments(master_id);
CREATE INDEX idx_class_assessments_grader ON class_assessments(grader_id);

-- ★ 統合トリガー: 入力値設定 + バリデーションを1つの関数で実行
-- （トリガー実行順序問題を回避するため統合）
--
-- 処理順序:
-- INSERT時:
--   1. マスタからmax_score, gradeを取得してコピー（自動設定）
--   2. scoreがmax_score_at_submissionを超えていないかチェック
-- UPDATE時:
--   1. master_id / max_score_at_submission / grade_at_submission 不変チェック
--   2. scoreがmax_score_at_submissionを超えていないかチェック
--
CREATE OR REPLACE FUNCTION process_assessment_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_max_score INTEGER;
  v_master_grade VARCHAR(10);
BEGIN
  -- ★ UPDATE時: 不変フィールドのチェック
  IF TG_OP = 'UPDATE' THEN
    -- master_id変更禁止
    IF OLD.master_id != NEW.master_id THEN
      RAISE EXCEPTION 'master_id cannot be changed after insert. Create a new record instead.';
    END IF;

    -- ★ max_score_at_submission 変更禁止（入力時点の値を保持）
    IF OLD.max_score_at_submission != NEW.max_score_at_submission THEN
      RAISE EXCEPTION 'max_score_at_submission cannot be changed after insert.';
    END IF;

    -- ★ grade_at_submission 変更禁止（入力時点の値を保持）
    IF OLD.grade_at_submission != NEW.grade_at_submission THEN
      RAISE EXCEPTION 'grade_at_submission cannot be changed after insert.';
    END IF;
  END IF;

  -- INSERT時のみ: マスタから値を取得してコピー
  IF TG_OP = 'INSERT' THEN
    SELECT max_score, grade INTO v_max_score, v_master_grade
    FROM assessment_masters WHERE id = NEW.master_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Master not found: %', NEW.master_id;
    END IF;

    -- 入力時点の値を固定（マスタからコピー）
    -- ★ これによりマスタの将来の変更が過去データに影響しない
    NEW.max_score_at_submission := v_max_score;
    NEW.grade_at_submission := v_master_grade;
  END IF;

  -- 得点チェック（status='completed'の場合のみ、INSERT/UPDATE共通）
  IF NEW.status = 'completed' THEN
    IF NEW.score IS NULL THEN
      RAISE EXCEPTION 'Score is required when status is completed';
    END IF;
    IF NEW.score > NEW.max_score_at_submission THEN
      RAISE EXCEPTION 'Score (%) exceeds max_score_at_submission (%)',
        NEW.score, NEW.max_score_at_submission;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ★ 単一のトリガーで全処理を実行（順序問題を回避）
CREATE TRIGGER trg_process_assessment
BEFORE INSERT OR UPDATE ON class_assessments
FOR EACH ROW EXECUTE FUNCTION process_assessment_insert();
```

### RLSポリシー

```sql
-- RLS有効化
ALTER TABLE class_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_masters ENABLE ROW LEVEL SECURITY;

-- ===== assessment_masters（マスタデータ） =====

-- 全ユーザー閲覧可
CREATE POLICY "masters_select_all" ON assessment_masters
  FOR SELECT TO authenticated
  USING (true);

-- ★ マスタ登録は管理者のみ（運用時にシード投入）
CREATE POLICY "masters_insert_admin_only" ON assessment_masters
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ★ マスタ更新は禁止（RLSポリシーなし = 更新不可）
-- 理由: 既存のclass_assessmentsレコードのmax_score_at_submission/grade_at_submissionと
--       整合性が取れなくなるため
-- 修正が必要な場合は、新しいマスタレコードを作成し、既存レコードは維持する

-- ★ マスタ削除も禁止（参照整合性のため）
-- class_assessmentsからFKで参照されているため、DELETEは自動的に失敗する

-- ===== class_assessments =====

-- 生徒: 自分のデータのみ閲覧（SELECT only）
CREATE POLICY "students_select_own" ON class_assessments
  FOR SELECT TO authenticated
  USING (
    student_id IN (
      SELECT id FROM students WHERE user_id = auth.uid()
    )
  );

-- 保護者: 子どものデータのみ閲覧（SELECT only）
CREATE POLICY "parents_select_children" ON class_assessments
  FOR SELECT TO authenticated
  USING (
    student_id IN (
      SELECT student_id FROM parent_child_relations
      WHERE parent_id IN (SELECT id FROM parents WHERE user_id = auth.uid())
    )
  );

-- 指導者: 担当生徒のデータを閲覧
CREATE POLICY "coaches_select_assigned" ON class_assessments
  FOR SELECT TO authenticated
  USING (
    student_id IN (
      SELECT student_id FROM coach_student_relations
      WHERE coach_id IN (SELECT id FROM coaches WHERE user_id = auth.uid())
    )
  );

-- 指導者: 担当生徒への入力（自分がgrader）
CREATE POLICY "coaches_insert_assigned" ON class_assessments
  FOR INSERT TO authenticated
  WITH CHECK (
    student_id IN (
      SELECT student_id FROM coach_student_relations
      WHERE coach_id IN (SELECT id FROM coaches WHERE user_id = auth.uid())
    )
    AND grader_id = auth.uid()
  );

-- 指導者: 自分が入力したデータの更新・削除
CREATE POLICY "coaches_update_own" ON class_assessments
  FOR UPDATE TO authenticated
  USING (grader_id = auth.uid())
  WITH CHECK (grader_id = auth.uid());

CREATE POLICY "coaches_delete_own" ON class_assessments
  FOR DELETE TO authenticated
  USING (grader_id = auth.uid());

-- ★ 管理者: 全データの閲覧・更新・削除（代行修正用）
-- ★ 重要: 管理者はgrader_idチェックをバイパスして他コーチの入力を修正可能
-- ★ 修正時はmodified_byに管理者のUIDを記録すること（アプリ側で実装）
CREATE POLICY "admin_all" ON class_assessments
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ★ 管理者修正時のmodified_by自動設定トリガー
CREATE OR REPLACE FUNCTION set_modified_by_on_admin_update()
RETURNS TRIGGER AS $$
DECLARE
  v_is_admin BOOLEAN;
BEGIN
  -- 現在のユーザーがadminロールか確認
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  ) INTO v_is_admin;

  -- ★ adminロールでのUPDATEは常にmodified_byを設定
  -- （grader_idを自分に変更した場合も監査漏れを防止）
  IF v_is_admin THEN
    NEW.modified_by := auth.uid();
  -- 非adminの場合は、grader_id以外のユーザーが更新した場合のみ記録
  ELSIF auth.uid() != OLD.grader_id THEN
    NEW.modified_by := auth.uid();
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_modified_by
BEFORE UPDATE ON class_assessments
FOR EACH ROW EXECUTE FUNCTION set_modified_by_on_admin_update();
```

#### 権限マトリクス

| ロール | SELECT | INSERT | UPDATE | DELETE | 備考 |
|--------|--------|--------|--------|--------|------|
| 生徒 | ○（自分のみ） | × | × | × | 閲覧専用 |
| 保護者 | ○（子どものみ） | × | × | × | 閲覧専用 |
| 指導者 | ○（担当生徒） | ○（担当生徒） | ○（自分入力分） | ○（自分入力分） | 入力者として記録（grader_id） |
| 管理者 | ○（全て） | ○（全て） | ○（全て） | ○（全て） | 代行修正可（modified_byに記録）|

#### 管理者修正フロー

```
1. 管理者が他コーチの入力を修正
2. RLSのadmin_allポリシーでgrader_idチェックをバイパス
3. トリガーでmodified_by = auth.uid() を自動設定
4. 監査ログとして「誰が」「いつ」修正したか追跡可能
```

### 型定義

```typescript
// lib/types/class-assessment.ts

export type AssessmentType = 'math_print' | 'kanji_test'
export type AssessmentSource = 'manual' | 'import'

// ★ ステータス型（欠席/未提出/完了を明確に区別）
export type AssessmentStatus = 'completed' | 'absent' | 'not_submitted'

// マスタデータ
export interface AssessmentMaster {
  id: string
  assessment_type: AssessmentType
  grade: '5年' | '6年'
  session_number: number
  attempt_number: number
  max_score: number
  scheduled_date?: string // YYYY-MM-DD
  description?: string
  created_at: string
}

// テスト結果レコード
export interface ClassAssessment {
  id: string
  student_id: number
  master_id: string
  // ★ ステータス（欠席/未提出/完了）
  status: AssessmentStatus
  // ★ 得点（status='completed'のときのみ有効、それ以外はnull）
  score: number | null
  // ★ 入力時点の固定値（将来のマスタ変更で過去データの%が変わらない）
  max_score_at_submission: number
  grade_at_submission: '5年' | '6年'
  assessment_date: string // YYYY-MM-DD
  is_resubmission: boolean
  grader_id: string
  modified_by?: string  // ★ 管理者が修正した場合に記録
  source: AssessmentSource
  created_at: string
  updated_at: string
}

// マスタ情報を結合した結果
export interface ClassAssessmentWithMaster extends ClassAssessment {
  master: AssessmentMaster
}

// 前回比・行動提案付きの結果
export interface AssessmentWithContext extends ClassAssessmentWithMaster {
  // ★ 計算フィールド（入力時点の固定値を使用）
  percentage: number           // score / max_score_at_submission * 100

  // ★ 前回比（同種別・同attempt_number の直近と比較、再提出除外）
  previous_score?: number      // 前回の得点
  previous_percentage?: number // 前回の正答率
  change?: number              // 前回比（得点差）
  change_label?: string        // 「前回比(算数プリント1回目)」

  // ★ クラス平均（同マスタ × 提出済み全件、日付問わず）
  // ★ 除外: 欠席(absent)、未提出(not_submitted)、再提出(is_resubmission=true)
  class_average?: number       // 提出済み平均点
  class_average_percentage?: number // 提出済み平均正答率
  class_average_count?: number // 平均算出に使用した人数（提出済み人数）

  // 行動提案（AI生成 or テンプレート）
  action_suggestion?: string   // 「まちがえた問題をもう一度ノートに解いてみよう」
}

export interface AssessmentSummary {
  assessment_type: AssessmentType
  total_count: number
  average_percentage: number
  recent_trend: 'up' | 'stable' | 'down'
  best_score: number
  latest_score: number
}

// バッチ入力用
export interface BatchAssessmentInput {
  student_id: number
  master_id: string
  // ★ ステータスで状態を明示（completed/absent/not_submitted）
  status: AssessmentStatus
  // ★ 得点（status='completed'のときのみ必須）
  score: number | null
  assessment_date: string
  is_resubmission: boolean
}
```

---

## UI/UX設計

### 既存UIとの整合性ガイドライン

#### 使用コンポーネント（既存パターン準拠）

| 要素 | 使用コンポーネント | インポート元 |
|------|-------------------|-------------|
| カード | `Card`, `CardHeader`, `CardContent` | `@/components/ui/card` |
| バッジ | `Badge` | `@/components/ui/badge` |
| プログレスバー | `Progress` | `@/components/ui/progress` |
| アイコン | Lucide React | `lucide-react` |
| ボタン | `Button` | `@/components/ui/button` |

#### 色定義（Tailwind標準色）

| テスト種別 | Badge色 | 背景色 |
|-----------|---------|--------|
| 算数プリント | `bg-blue-100 text-blue-800` | `bg-blue-50` |
| 漢字テスト | `bg-orange-100 text-orange-800` | `bg-orange-50` |

#### 前回比アイコン（Lucide React）

```tsx
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

// 使用例
{change > 0 && <TrendingUp className="h-4 w-4 text-emerald-600" />}
{change < 0 && <TrendingDown className="h-4 w-4 text-red-500" />}
{change === 0 && <Minus className="h-4 w-4 text-slate-400" />}
```

#### レスポンシブ設計

| ブレークポイント | レイアウト |
|----------------|-----------|
| デフォルト（モバイル） | 1列、`px-4` |
| `sm:` | 2列グリッド |
| `md:` | `max-w-4xl mx-auto` |

---

### ダッシュボード配置順

#### 生徒ダッシュボード

```
1. UserProfileHeader（固定）
2. AIコーチメッセージ
3. StreakCard（連続学習）
4. 📝 先生からの採点結果 ← 新規追加
5. TodayMissionCard
6. カレンダー
7. WeeklyProgress
8. 応援メッセージ
9. 学習履歴
```

#### 保護者ダッシュボード

```
1. UserProfileHeader + 子ども切り替え
2. AI生成ステータス
3. StreakCard
4. 📊 テスト結果サマリー ← 新規追加
5. カレンダー
6. WeeklyProgress
7. 応援メッセージ
```

#### 指導者ダッシュボード

```
1. UserProfileHeader
2. アラートバナー（7日以上未入力）
3. 担当生徒グリッド
4. 最近の学習記録
5. 📝 テスト結果入力へのリンク ← 新規追加
```

---

### コンポーネント設計

#### AssessmentResultCard（生徒・保護者共通）

```tsx
// components/assessment/assessment-result-card.tsx

import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { TrendingUp, TrendingDown, Minus, Lightbulb } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AssessmentResultCardProps {
  type: 'math_print' | 'kanji_test'
  sessionNumber: number
  attemptNumber?: number
  score: number
  maxScore: number
  change?: number
  actionSuggestion?: string
  showEncouragementCTA?: boolean
  onEncourage?: () => void
}

export function AssessmentResultCard({
  type,
  sessionNumber,
  attemptNumber = 1,
  score,
  maxScore,
  change,
  actionSuggestion,
  showEncouragementCTA,
  onEncourage,
}: AssessmentResultCardProps) {
  const percentage = Math.round((score / maxScore) * 100)
  const isHighScore = percentage >= 80

  return (
    <Card className="rounded-xl shadow-sm border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge className={cn(
              "text-xs",
              type === 'math_print'
                ? "bg-blue-100 text-blue-800 border-blue-200"
                : "bg-orange-100 text-orange-800 border-orange-200"
            )}>
              {type === 'math_print' ? '算数プリント' : '漢字テスト'}
            </Badge>
            <span className="text-sm text-slate-600">
              第{sessionNumber}回{attemptNumber > 1 ? `-${attemptNumber}` : ''}
            </span>
          </div>
          {change !== undefined && (
            <div className="flex items-center gap-1">
              {change > 0 && <TrendingUp className="h-4 w-4 text-emerald-600" />}
              {change < 0 && <TrendingDown className="h-4 w-4 text-red-500" />}
              {change === 0 && <Minus className="h-4 w-4 text-slate-400" />}
              <span className={cn(
                "text-sm font-medium",
                change > 0 ? "text-emerald-600" : change < 0 ? "text-red-500" : "text-slate-500"
              )}>
                {change > 0 ? `+${change}` : change}点
              </span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* スコア表示 */}
        <div className="flex items-center gap-4">
          <div className="text-2xl font-bold">
            {score}
            <span className="text-base text-slate-500 font-normal">/{maxScore}</span>
          </div>
          <Progress
            value={percentage}
            className={cn(
              "flex-1 h-2",
              type === 'math_print' ? "[&>div]:bg-blue-500" : "[&>div]:bg-orange-500"
            )}
          />
        </div>

        {/* 前回比メッセージ */}
        {change !== undefined && change !== 0 && (
          <p className="text-sm text-slate-600">
            {change > 0
              ? `前回より${change}点アップ！成長してるね`
              : `前回より${Math.abs(change)}点。次は挽回しよう！`}
          </p>
        )}

        {/* 高得点時の祝福 */}
        {isHighScore && (
          <div className="flex items-center gap-2 text-amber-600">
            <span className="text-lg">🎉</span>
            <span className="text-sm font-medium">すごい！目標達成だね！</span>
          </div>
        )}

        {/* 行動提案 */}
        {actionSuggestion && (
          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
            <p className="text-sm flex items-start gap-2">
              <Lightbulb className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <span className="text-slate-700">
                <span className="font-medium">次の一歩: </span>
                {actionSuggestion}
              </span>
            </p>
          </div>
        )}

        {/* 応援CTA（保護者・指導者用） */}
        {showEncouragementCTA && onEncourage && (
          <div className="pt-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              onClick={onEncourage}
              className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
            >
              <Heart className="h-4 w-4 mr-1" />
              ねぎらう
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
```

---

### ワイヤーフレーム

#### 生徒ダッシュボード表示

```
┌─────────────────────────────────────────────┐
│  📝 先生からの採点結果                        │
├─────────────────────────────────────────────┤
│  ┌───────────────────────────────────────┐  │
│  │ [Badge:算数プリント] 第10回    [↑+5点] │  │
│  │ ━━━━━━━━━━━━━━━━━━━━━ 85/100点        │  │
│  │ 前回より5点アップ！成長してるね          │  │
│  │ 🎉 すごい！目標達成だね！               │  │
│  │ ┌─────────────────────────────────┐    │  │
│  │ │ 💡 次の一歩: まちがえた問題を    │    │  │
│  │ │    もう一度ノートに解いてみよう  │    │  │
│  │ └─────────────────────────────────┘    │  │
│  └───────────────────────────────────────┘  │
│                                             │
│  ┌───────────────────────────────────────┐  │
│  │ [Badge:漢字テスト] 第10回       [→0点] │  │
│  │ ━━━━━━━━━━━━━━━━ 72/100点              │  │
│  │ ┌─────────────────────────────────┐    │  │
│  │ │ 💡 次の一歩: まちがえた漢字を    │    │  │
│  │ │    3回ずつ書いて覚えよう        │    │  │
│  │ └─────────────────────────────────┘    │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

#### 保護者ダッシュボード表示

```
┌─────────────────────────────────────────────┐
│  📊 ○○くんのテスト結果                       │
├─────────────────────────────────────────────┤
│  今週の結果                                  │
│  ┌─────────────────┐ ┌─────────────────┐   │
│  │ [Badge:算数]     │ │ [Badge:漢字]    │   │
│  │ 85点 [↑]        │ │ 72点 [→]        │   │
│  │ 安定して成長中   │ │ コツコツ継続中  │   │
│  │ [♡ねぎらう]     │ │ [♡ねぎらう]     │   │
│  └─────────────────┘ └─────────────────┘   │
│                                             │
│  📈 推移（直近5回）                          │
│  ┌───────────────────────────────────────┐  │
│  │ [Recharts BarChart]                    │  │
│  │ - 棒グラフ（算数=青、漢字=橙）         │  │
│  │ - 80点目標ライン（点線）               │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

#### 指導者バッチ入力画面

```
┌─────────────────────────────────────────────┐
│  📝 テスト結果入力                           │
├─────────────────────────────────────────────┤
│  [Select:テスト種別] → [Select:学習回]      │
│        ↓ マスタ選択で自動セット              │
│  満点: 100点  実施順: 1回目                  │
│  [DatePicker:実施日]                        │
├─────────────────────────────────────────────┤
│  [Table]                                    │
│  生徒名          得点    /満点    状態      │
│  ────────────────────────────────────────   │
│  [Avatar] 田中 太郎  [Input:85] /100  ✓    │
│  [Avatar] 鈴木 花子  [Input:72] /100  ✓    │
│  [Avatar] 佐藤 健    [Input:  ] /100  ○    │
│  [Avatar] 山田 美咲  [Checkbox:欠席]   ─    │
├─────────────────────────────────────────────┤
│  入力済: 2/4名  未入力: 1名  欠席: 1名      │
│                                             │
│  [Button:ghost:下書き保存] [Button:確定保存]│
└─────────────────────────────────────────────┘
```

**バッチ入力UIのマスタ連携:**
1. テスト種別選択 → 該当学年のマスタ一覧をフィルタ
2. 学習回選択 → マスタから`max_score`、`attempt_number`を自動セット
3. 満点・実施順は読み取り専用（マスタで定義済み）

---

### UXパターン

#### 計算仕様サマリー

| 計算項目 | 対象データ | 除外条件 | 備考 |
|---------|-----------|---------|------|
| **正答率(%)** | score / max_score_at_submission × 100 | status != 'completed' | 入力時点の固定値を使用 |
| **前回比** | 同種別 × 同attempt_number の直近 | 再提出・status != 'completed' | 初回は「初めての記録」表示 |
| **クラス平均** | 同マスタ × 通常提出（**日付問わず**） | 再提出・status != 'completed' | 「テスト全体の平均」として公平 |

#### 前回比の計算ロジック

```typescript
/**
 * 前回比を計算（同テスト種別 × 同attempt_number の直近と比較）
 */
function getPreviousComparison(
  currentAssessment: ClassAssessmentWithMaster,
  allAssessments: ClassAssessmentWithMaster[]
): { previousScore?: number; change?: number; changeLabel: string } {
  const { master } = currentAssessment

  // 同種別・同attempt_numberの過去データを抽出
  const sameTypeAttempts = allAssessments.filter(a =>
    a.master.assessment_type === master.assessment_type &&
    a.master.attempt_number === master.attempt_number &&
    a.assessment_date < currentAssessment.assessment_date &&
    !a.is_resubmission  // 再提出は除外
  )

  // 日付降順でソート、最新を取得
  const previous = sameTypeAttempts.sort((a, b) =>
    b.assessment_date.localeCompare(a.assessment_date)
  )[0]

  const typeLabel = master.assessment_type === 'math_print' ? '算数プリント' : '漢字テスト'
  const attemptLabel = master.attempt_number > 1 ? `${master.attempt_number}回目` : ''
  const changeLabel = `前回比(${typeLabel}${attemptLabel})`

  if (!previous) {
    return { changeLabel }
  }

  return {
    previousScore: previous.score,
    change: currentAssessment.score - previous.score,
    changeLabel
  }
}
```

#### クラス平均の計算ロジック

```typescript
/**
 * ★ 同マスタ（テスト）の平均を計算
 *
 * 対象: 同マスタ × 通常提出 × status='completed'
 * 除外: 再提出(is_resubmission=true)、欠席/未提出(status != 'completed')
 *
 * ★ 日付フィルタなし: 同じテストを受けた全生徒の平均
 * これにより「テスト全体の平均」として公平な比較が可能
 *
 * @param masterId - マスタID
 * @returns { average, percentage, count } - 平均点、正答率、人数
 */
async function getGradeAverage(
  masterId: string
): Promise<{ average: number; percentage: number; count: number }> {
  const { data } = await supabase
    .from('class_assessments')
    .select('score, max_score_at_submission')
    .eq('master_id', masterId)
    .eq('status', 'completed')       // ★ 完了のみ（欠席/未提出除外）
    .eq('is_resubmission', false)    // ★ 再提出は除外
    // ★ 日付フィルタなし: 同マスタの全通常提出を対象

  if (!data || data.length === 0) {
    return { average: 0, percentage: 0, count: 0 }
  }

  // score is guaranteed non-null when status='completed'
  const totalScore = data.reduce((sum, a) => sum + (a.score ?? 0), 0)
  const totalMaxScore = data.reduce((sum, a) => sum + a.max_score_at_submission, 0)

  return {
    average: Math.round(totalScore / data.length),
    percentage: Math.round((totalScore / totalMaxScore) * 100),
    count: data.length
  }
}
```

#### 行動提案のフォールバック

```typescript
const ACTION_SUGGESTION_TEMPLATES = {
  // 高得点（80%以上）
  high: {
    math_print: [
      'この調子で次も頑張ろう！',
      '計算がとても正確だね。応用問題にも挑戦してみよう',
      '素晴らしい！他の人に教えてあげると、もっと力がつくよ'
    ],
    kanji_test: [
      '漢字バッチリだね！この調子！',
      '読み書きが上手。新しい漢字もどんどん覚えよう',
      '素晴らしい！習った漢字を日記で使ってみよう'
    ]
  },
  // 中得点（50-79%）
  medium: {
    math_print: [
      'まちがえた問題をもう一度ノートに解いてみよう',
      '惜しい問題があったね。見直しをして、次は満点を目指そう',
      'あと少し！計算の途中を丁寧に書くと、ミスが減るよ'
    ],
    kanji_test: [
      'まちがえた漢字を3回ずつ書いて覚えよう',
      '読みと書きを声に出して練習すると覚えやすいよ',
      '惜しい！部首を意識すると、形が覚えやすくなるよ'
    ]
  },
  // 低得点（50%未満）
  low: {
    math_print: [
      '基本問題からもう一度やってみよう。わからないところは先生に聞こう',
      '計算の基礎を確認しよう。焦らずゆっくりでOK',
      '一つずつ確実に解けるようになろう。必ずできるよ！'
    ],
    kanji_test: [
      '覚えにくい漢字は、意味と一緒に覚えるといいよ',
      '毎日少しずつ練習しよう。5分でも効果があるよ',
      '漢字カードを作って、すきま時間に見てみよう'
    ]
  }
}

/**
 * 行動提案を生成（AI失敗時のフォールバック付き）
 */
function getActionSuggestion(
  type: AssessmentType,
  percentage: number,
  aiSuggestion?: string
): string {
  // AI生成がある場合はそちらを優先
  if (aiSuggestion) return aiSuggestion

  // フォールバック: テンプレートからランダム選択
  const level = percentage >= 80 ? 'high' : percentage >= 50 ? 'medium' : 'low'
  const templates = ACTION_SUGGESTION_TEMPLATES[level][type]
  return templates[Math.floor(Math.random() * templates.length)]
}
```

#### 空・欠損時の表示

| 状態 | status値 | 表示内容 |
|------|----------|---------|
| 初回テスト前 | レコードなし | 「まだテスト結果がありません。先生が入力すると表示されます」 |
| データあり・前回比なし | `completed` | 前回比矢印を非表示、「初めての記録です！」と表示 |
| 欠席 | `absent` | 「このテストは欠席しました」（灰色表示、補習対象を示唆） |
| 未提出 | `not_submitted` | 「結果がまだ入力されていません」（灰色表示） |
| 全員欠席/未提出（平均計算不可） | 全て`absent`/`not_submitted` | 「平均: まだ提出者がいません」 |

```tsx
// 空状態コンポーネント
function EmptyAssessmentState() {
  return (
    <Card className="rounded-xl border-dashed border-2 border-slate-200 bg-slate-50">
      <CardContent className="py-8 text-center">
        <FileQuestion className="h-12 w-12 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500 text-sm">
          まだテスト結果がありません
        </p>
        <p className="text-slate-400 text-xs mt-1">
          先生が入力すると表示されます
        </p>
      </CardContent>
    </Card>
  )
}

// 初回データ（前回比なし）の表示
function FirstAssessmentNote() {
  return (
    <div className="flex items-center gap-2 text-blue-600 text-sm">
      <Sparkles className="h-4 w-4" />
      <span>初めての記録です！</span>
    </div>
  )
}
```

#### 応援CTAの常設化

```tsx
// 応援CTAは結果の有無に関わらず常設
// 送信後は即座にバッジ/吹き出しでフィードバック

interface EncouragementCTAProps {
  assessmentId?: string  // nullなら結果なしでも応援可
  studentId: number
  onSent: () => void
}

function EncouragementCTA({ assessmentId, studentId, onSent }: EncouragementCTAProps) {
  const [isSending, setIsSending] = useState(false)
  const [hasSent, setHasSent] = useState(false)

  const handleSend = async () => {
    setIsSending(true)
    await sendEncouragement({
      studentId,
      relatedAssessmentId: assessmentId,
      type: 'quick_reaction'
    })
    setHasSent(true)
    setIsSending(false)
    onSent()
  }

  if (hasSent) {
    return (
      <div className="flex items-center gap-2 text-rose-600 text-sm animate-fade-in">
        <HeartHandshake className="h-4 w-4" />
        <span>応援を送りました！</span>
      </div>
    )
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleSend}
      disabled={isSending}
      className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
    >
      {isSending ? (
        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
      ) : (
        <Heart className="h-4 w-4 mr-1" />
      )}
      ねぎらう
    </Button>
  )
}
```

---

## 欠席→補習のハンドリング

### 基本ルール

| シナリオ | status | is_resubmission | 説明 |
|---------|--------|-----------------|------|
| **通常受験** | `completed` | `false` | 正規の実施日に受験 |
| **欠席登録** | `absent` | `false` | 欠席を記録（補習対象） |
| **補習受験（初回欠席後）** | `completed` | `false` | ★ 通常提出扱い（再提出ではない） |
| **再提出（低得点後）** | `completed` | `true` | 通常受験後の再チャレンジ |

### 重要なポイント

1. **初回欠席→補習は「再提出」ではない**
   - 初回を受けていないので、補習が実質的に「初回」扱い
   - `is_resubmission = false` で登録
   - クラス平均計算に含まれる

2. **通常受験→再提出のみ「再提出」扱い**
   - 一度受験して低得点だった場合の再チャレンジ
   - `is_resubmission = true` で登録
   - クラス平均計算から除外

### 運用フロー

```
【ケース1: 通常受験】
1. 指導者が結果入力（status=completed, is_resubmission=false）
2. 生徒・保護者に表示、クラス平均に含む

【ケース2: 欠席→補習】
1. 欠席時: 指導者が欠席登録（status=absent, is_resubmission=false）
2. 補習後: 欠席レコードを更新（status=completed, score=XX）
   ★ is_resubmissionは変えない（falseのまま）
3. クラス平均に含む（通常提出扱いのため）

【ケース3: 低得点→再提出】
1. 通常受験: 指導者が結果入力（status=completed, is_resubmission=false）
2. 再提出後: 新規レコード作成（status=completed, is_resubmission=true）
3. 再提出はクラス平均から除外
```

### UI表示の違い

| 状態 | バッジ色 | アイコン | 平均比較 |
|------|---------|---------|---------|
| 通常受験（completed, false） | 青/橙 | なし | 表示 |
| 欠席（absent） | 灰色 | ⚠️ | 非表示 |
| 補習（completed, false, 欠席更新後） | 青/橙 | 📝「補習」 | 表示 |
| 再提出（completed, true） | 青/橙 | 🔄「再」 | 非表示（参考値のみ） |

---

## 応援機能統合

### データモデル拡張

```sql
-- 既存テーブルにカラム追加
ALTER TABLE encouragement_messages
ADD COLUMN related_assessment_id UUID REFERENCES class_assessments(id);

-- related_study_log_id と related_assessment_id は排他的
-- (どちらか一方のみ値を持つ)
```

### 応援UI統合

テスト結果カードに応援CTAを常設:

```
┌───────────────────────────────────────┐
│ 算数プリント 第10回-1                  │
│ 85点/100点 ↑+5点                      │
├───────────────────────────────────────┤
│ [❤️ ねぎらう] [💬 アドバイス]         │
└───────────────────────────────────────┘
```

送信後は小さなスタンプ/吹き出しで可視化:

```
┌───────────────────────────────────────┐
│ 算数プリント 第10回-1                  │
│ 85点/100点 ↑+5点                      │
├───────────────────────────────────────┤
│ 💬 ママより: がんばったね！           │
└───────────────────────────────────────┘
```

### AIプロンプト調整

テスト結果コンテキストを考慮したプロンプト:

```typescript
const assessmentContext = {
  type: 'math_print',
  score: 85,
  maxScore: 100,
  change: +5,
  trend: 'improving',
  actionSuggestion: 'まちがえた問題をもう一度解く'
}

// プロンプトに追加
`生徒は${assessmentContext.type === 'math_print' ? '算数プリント' : '漢字テスト'}で
${assessmentContext.score}点/${assessmentContext.maxScore}点を取りました。
前回より${assessmentContext.change > 0 ? `${assessmentContext.change}点アップ` : `${Math.abs(assessmentContext.change)}点ダウン`}しています。
この結果に対する励ましのメッセージを生成してください。`
```

---

## マスタデータ仕様

### 漢字テスト（kanji_test）

| 項目 | 値 |
|------|-----|
| **max_score** | 10（固定） |
| **attempt_number** | 1（週1回のみ） |
| **対象回次** | 第1回〜第19回（5年生） |

### 算数プリント（math_print）- 5年生

**注意:** 満点（max_score）は回次・実施順ごとに異なる。問題数 = 満点。

| 回次 | ① 1回目 | ② 2回目 | タイトル |
|------|---------|---------|----------|
| 第1回 | 44 | 22 | 比の利用 |
| 第2回 | 32 | 41 | 平面図形と比 |
| 第3回 | 22 | 23 | 平面図形と比 |
| 第4回 | 21 | 40 | つるかめ算の応用・年齢算 |
| 第5回 | **欠落** | **欠落** | — |
| 第6回 | 21 | 37 | 速さと比 |
| 第7回 | 18 | 12 | 旅人算と比 |
| 第8回 | 18 | 24 | 平面図形と比 |
| 第9回 | 15 | 18 | 図形の移動・円の転がり移動 |
| 第10回 | **欠落** | **欠落** | — |
| 第11回 | 24 | 23 | 仕事に関する問題 |
| 第12回 | 27 | 20 | 水深の変化と比 |
| 第13回 | 28 | 26 | 整数の分解と構成 |
| 第14回 | 21 | 14 | 直方体・立方体の切断 |
| 第15回 | **欠落** | **欠落** | — |
| 第16回 | 25 | 23 | 濃さと比 |
| 第17回 | 14 | 16 | いろいろな立体の求積 |
| 第18回 | 28 | 32 | いろいろな速さの問題 |
| 第19回 | **欠落** | **欠落** | — |

**欠落回次:** 第5回、第10回、第15回、第19回（テストなし）

### シードデータSQL例

```sql
-- 5年生 漢字テスト（max_score=10固定）
INSERT INTO assessment_masters (assessment_type, grade, session_number, attempt_number, max_score, description)
SELECT 'kanji_test', '5年', n, 1, 10, '第' || n || '回 漢字テスト'
FROM generate_series(1, 19) AS n
WHERE n NOT IN (5, 10, 15, 19);  -- 欠落回次を除外

-- 5年生 算数プリント（max_scoreは回次ごとに異なる）
INSERT INTO assessment_masters (assessment_type, grade, session_number, attempt_number, max_score, description)
VALUES
  -- 第1回
  ('math_print', '5年', 1, 1, 44, '第1回① 比の利用'),
  ('math_print', '5年', 1, 2, 22, '第1回② 比の利用'),
  -- 第2回
  ('math_print', '5年', 2, 1, 32, '第2回① 平面図形と比'),
  ('math_print', '5年', 2, 2, 41, '第2回② 平面図形と比'),
  -- 第3回
  ('math_print', '5年', 3, 1, 22, '第3回① 平面図形と比'),
  ('math_print', '5年', 3, 2, 23, '第3回② 平面図形と比'),
  -- 第4回
  ('math_print', '5年', 4, 1, 21, '第4回① つるかめ算の応用'),
  ('math_print', '5年', 4, 2, 40, '第4回② つるかめ算の応用・年齢算'),
  -- 第5回: 欠落
  -- 第6回
  ('math_print', '5年', 6, 1, 21, '第6回① 速さと比'),
  ('math_print', '5年', 6, 2, 37, '第6回② 速さと比'),
  -- 第7回
  ('math_print', '5年', 7, 1, 18, '第7回① 旅人算と比'),
  ('math_print', '5年', 7, 2, 12, '第7回② 旅人算と比'),
  -- 第8回
  ('math_print', '5年', 8, 1, 18, '第8回① 平面図形と比'),
  ('math_print', '5年', 8, 2, 24, '第8回② 平面図形と比'),
  -- 第9回
  ('math_print', '5年', 9, 1, 15, '第9回① 図形の移動'),
  ('math_print', '5年', 9, 2, 18, '第9回② 円の転がり移動'),
  -- 第10回: 欠落
  -- 第11回
  ('math_print', '5年', 11, 1, 24, '第11回① 仕事に関する問題'),
  ('math_print', '5年', 11, 2, 23, '第11回② 仕事に関する問題'),
  -- 第12回
  ('math_print', '5年', 12, 1, 27, '第12回① 水深の変化と比'),
  ('math_print', '5年', 12, 2, 20, '第12回② 水深の変化と比'),
  -- 第13回
  ('math_print', '5年', 13, 1, 28, '第13回① 整数の分解と構成'),
  ('math_print', '5年', 13, 2, 26, '第13回② 整数の分解と構成'),
  -- 第14回
  ('math_print', '5年', 14, 1, 21, '第14回① 直方体・立方体の切断'),
  ('math_print', '5年', 14, 2, 14, '第14回② 直方体・立方体の切断'),
  -- 第15回: 欠落
  -- 第16回
  ('math_print', '5年', 16, 1, 25, '第16回① 濃さと比'),
  ('math_print', '5年', 16, 2, 23, '第16回② 濃さと比'),
  -- 第17回
  ('math_print', '5年', 17, 1, 14, '第17回① いろいろな立体の求積'),
  ('math_print', '5年', 17, 2, 16, '第17回② いろいろな立体の求積'),
  -- 第18回
  ('math_print', '5年', 18, 1, 28, '第18回① いろいろな速さの問題'),
  ('math_print', '5年', 18, 2, 32, '第18回② いろいろな速さの問題');
  -- 第19回: 欠落
```

### 6年生データ（TODO）

6年生の算数プリント・漢字テストのmax_scoreデータは別途提供待ち。

---

## タスク優先順位・並行可能性

### 依存関係図

```
P6-1 データベース設計
  │
  ├──→ P6-2 Server Actions
  │       │
  │       ├──→ P6-3 指導者バッチ入力 ─────┐
  │       │                              │
  │       ├──→ P6-4 生徒閲覧 ────────────┼──→ Phase 6.1 完了
  │       │                              │
  │       └──→ P6-5 保護者閲覧 ───────────┘
  │
  └──→ P6-6 指導者分析（P6-2完了後に着手可）
```

### 並行可能性マトリクス

| フェーズ | タスク | 並行可否 | 前提条件 | 状態 |
|---------|--------|---------|---------|------|
| P6-1 | DB設計・マイグレーション | **単独必須** | なし（最優先） | ✅ 完了 |
| P6-2 | Server Actions | **単独必須** | P6-1完了 | ✅ 完了 |
| P6-3 | 指導者バッチ入力 | **並行可** | P6-2完了 | ⏳ 次 |
| P6-4 | 生徒閲覧 | **並行可** | P6-2完了（P6-3と並行可） | ⏳ 待機 |
| P6-5 | 保護者閲覧 | **並行可** | P6-2完了（P6-3, P6-4と並行可） | ⏳ 待機 |
| P6-6 | 指導者分析 | 後発 | P6-2完了（Phase 6.2以降に実施推奨） | ⏳ 待機 |

### 推奨実装順序

```
Week 1: P6-1（DB設計）→ P6-2（Server Actions前半）
Week 2: P6-2（Server Actions後半）→ P6-3（バッチ入力UI）
Week 3: P6-3, P6-4, P6-5 を並行実装
Week 4: 統合テスト、P6-6（分析）着手
```

---

## タスク一覧

### P6-1: データベース設計・マイグレーション ⏳ 未着手 (0/18完了)

**目標:** クラス内テストを管理するテーブルを設計・作成

- [ ] `assessment_masters` マスタテーブル作成（FK参照元を先に作成）
- [ ] `class_assessments` テーブル作成（master_id FK付き）
- [ ] `max_score_at_submission`カラム追加（入力時点の満点固定）
- [ ] `grade_at_submission`カラム追加（入力時点の学年固定）
- [ ] `modified_by`カラム追加（管理者修正監査用）
- [ ] マイグレーションファイル作成
- [ ] 得点上限チェックトリガー作成（score <= max_score_at_submission）
- [ ] 入力時値固定トリガー作成（max_score, gradeをマスタからコピー）
- [ ] 学年整合性チェックトリガー作成（student.grade == master.grade）
- [ ] 管理者修正監査トリガー作成（modified_by自動設定）
- [ ] 再提出ユニーク制約（同一マスタにつき1回のみ）
- [ ] RLSポリシー実装（生徒/保護者=SELECT、指導者=担当生徒、管理者=ALL）
- [ ] インデックス最適化
- [ ] 型定義作成 (`lib/types/class-assessment.ts`)
- [ ] Zodスキーマ作成（バリデーション用）
- [ ] マスタシードデータ作成（5年/6年 × 各回次）
- [ ] デモデータ作成（テスト用）
- [ ] 5年生用feature flag実装
- [ ] RLS動作確認テスト（全ロール）
- [ ] P6-1 総合テスト

### P6-2: Server Actions実装 ⏳ 未着手 (0/14完了)

**目標:** クラス内テストのCRUD操作を実装（指導者のみ書き込み可）

- [ ] `app/actions/class-assessment.ts` 作成
- [ ] `getAssessmentMasters()` 実装（マスタ一覧取得）
- [ ] `saveClassAssessment()` 実装（単一入力）
- [ ] `saveBatchAssessments()` 実装（バッチ入力）
- [ ] `getClassAssessments()` 実装（一覧取得 with マスタJOIN）
- [ ] `getPreviousComparison()` 実装（同種別・同attempt_number比較）
- [ ] `getGradeAverage()` 実装（同学年平均計算）
- [ ] `getAssessmentWithContext()` 実装（前回比・行動提案・平均付き）
- [ ] `getAssessmentSummary()` 実装（集計データ）
- [ ] `deleteClassAssessment()` 実装
- [ ] `generateActionSuggestion()` 実装（AI + フォールバック）
- [ ] 行動提案テンプレート定義 (`lib/constants/action-suggestions.ts`)
- [ ] API Route作成 (`/api/class-assessment`)
- [ ] P6-2 総合テスト

### P6-3: 指導者バッチ入力画面 ⏳ 未着手 (0/10完了)

**目標:** 指導者が効率的にテスト結果を入力できる画面

- [ ] バッチ入力ページ作成 (`/coach/assessment/input`)
- [ ] マスタ選択UI（種別 → 回次 → 自動で満点/attempt_numberセット）
- [ ] 生徒一覧テーブル（得点入力フィールド、満点表示）
- [ ] 再提出チェックボックス
- [ ] 欠席/未提出マーク機能
- [ ] 入力状況サマリー表示（入力済/未入力/欠席）
- [ ] 下書き保存機能（localStorage）
- [ ] 確定保存＋バリデーション（満点超過チェック）
- [ ] 保存成功時のフィードバックUI
- [ ] P6-3 総合テスト

### P6-4: 生徒閲覧画面 ⏳ 未着手 (0/12完了)

**目標:** 生徒が「先生からの採点結果」を閲覧できる画面

- [ ] ダッシュボードへの結果カード追加（配置順4番目）
- [ ] `AssessmentResultCard` コンポーネント作成
- [ ] 前回比表示（同種別・同attempt_number比較、Lucideアイコン）
- [ ] 前回比ラベル明示（「前回比(算数プリント1回目)」）
- [ ] 行動提案表示（💡アイコン + テンプレートフォールバック）
- [ ] 高得点時の祝福演出（🎉 80%以上）
- [ ] 低得点時の励ましコピー
- [ ] 空状態コンポーネント（「まだテスト結果がありません」）
- [ ] 初回データ表示（「初めての記録です！」）
- [ ] 履歴ページ作成（棒グラフ）
- [ ] 目標ライン表示（80点、点線）
- [ ] P6-4 総合テスト

### P6-5: 保護者閲覧・応援画面 ⏳ 未着手 (0/12完了)

**目標:** 保護者が子どもの結果を閲覧し、応援できる画面

- [ ] ダッシュボードへのサマリーカード追加（配置順4番目）
- [ ] 学年平均との比較表示（「学年平均: 75点」）
- [ ] [ねぎらう]ワンタップCTA実装（常設）
- [ ] 応援CTA: 結果有無に関わらず常設
- [ ] 応援送信後の即時フィードバック（「応援を送りました！」）
- [ ] 推移グラフ表示（棒グラフ、算数=青、漢字=橙）
- [ ] 目標ライン表示（80点、点線）
- [ ] トレンド文言表示（「安定して成長中」等）
- [ ] 複数子どもの切り替え対応
- [ ] 応援履歴表示（吹き出し形式）
- [ ] 空状態コンポーネント
- [ ] P6-5 総合テスト

### P6-6: 指導者分析・応援画面 ⏳ 未着手 (0/10完了)

**目標:** 指導者が分析・応援できる画面

- [ ] 生徒詳細タブへの追加（assessment-tab）
- [ ] 学年平均・分布表示（担当生徒の位置をハイライト）
- [ ] 未提出/欠席検知アラート
- [ ] 生徒間比較グラフ（棒グラフ、同学年比較）
- [ ] 応援送信機能（結果カードから、常設CTA）
- [ ] 応援送信後の即時フィードバック
- [ ] 分析ページへの統合（既存分析UIと整合）
- [ ] 応援履歴表示
- [ ] 入力済み/未入力のステータス表示
- [ ] P6-6 総合テスト

---

## フェーズ分け計画

### Phase 6.1: MVP（2-3週間）

**スコープ:** 指導者入力 + 生徒・保護者閲覧

| タスク | 優先度 |
|--------|-------|
| P6-1: DB設計・マイグレーション | 必須 |
| P6-2: Server Actions | 必須 |
| P6-3: 指導者バッチ入力 | 必須 |
| P6-4: 生徒閲覧（基本） | 必須 |
| P6-5: 保護者閲覧（基本） | 必須 |

**DoD:**
- [ ] 指導者がバッチ入力でテスト結果を登録できる
- [ ] 生徒が「先生からの採点結果」を閲覧できる
- [ ] 保護者が子どものテスト結果を閲覧できる
- [ ] 前回比・行動提案が表示される
- [ ] RLSで適切なアクセス制御が機能

### Phase 6.2: 応援統合（1-2週間）

**スコープ:** テスト結果への応援機能

| タスク | 優先度 |
|--------|-------|
| 応援テーブル拡張 | 必須 |
| 保護者応援CTA | 必須 |
| 指導者応援CTA | 必須 |
| AI応援プロンプト調整 | 必須 |
| 応援表示（吹き出し） | 必須 |

**DoD:**
- [ ] 保護者がテスト結果に応援を送信できる
- [ ] 指導者がテスト結果に応援を送信できる
- [ ] 生徒が応援を受信・閲覧できる
- [ ] AI生成応援がテスト結果を考慮している

### Phase 6.3: 分析強化（1週間）

**スコープ:** 指導者向け分析機能

| タスク | 優先度 |
|--------|-------|
| クラス平均・分布表示 | 必須 |
| 未提出検知 | 必須 |
| 生徒間比較 | オプション |

---

## ロールアウト計画

### 5年生先行（2024年12月〜）

```typescript
// feature flag
const ASSESSMENT_ENABLED_GRADES = ['5年']

// 使用例
if (ASSESSMENT_ENABLED_GRADES.includes(student.grade)) {
  // テスト結果表示
}
```

### 6年生展開（2025年2月〜）

- 受験終了後に有効化
- assessment_mastersに6年生用データ追加
- feature flag更新: `['5年', '6年']`

---

## リスク要因

| リスク | 発生確率 | 影響度 | 対策 | 状態 |
|--------|---------|--------|------|------|
| 指導者の入力負荷 | 中 | 高 | バッチ入力UIの最適化、将来的なOCR導入 | ⏳ 監視中 |
| データ信頼性 | 低 | 高 | 指導者のみ入力、監査ログ | ✅ 対策済 |
| 既存応援機能へのリグレッション | 中 | 中 | 段階的統合、テスト充実 | ⏳ 監視中 |
| スケジュール遅延 | 中 | 中 | MVPスコープを明確化、優先度付け | ✅ 対策済 |

---

## 参照ドキュメント

- `docs/01-Concept.md` - セルフコンパッション・成長マインドセット
- `docs/03-Requirements-Student.md` - 生徒機能仕様
- `docs/04-Requirements-Parent.md` - 保護者機能仕様
- `docs/05-Requirements-Coach.md` - 指導者機能仕様
- `docs/tasks/P2-encouragement.md` - 応援機能タスク（参考）

---

**最終更新:** 2025年12月9日（設計レビューv6反映: 監査トリガー改善）
**更新者:** Claude Code

---

## 変更履歴

| 日付 | バージョン | 変更内容 |
|------|-----------|---------|
| 2025-12-09 | **P6-2実装** | Server Actions実装完了（CRUD、バッチ入力、計算ヘルパー）、API Routes（3エンドポイント）、SWRフック追加 |
| 2025-12-09 | **P6-1実装** | DBマイグレーション実装完了（assessment_masters, class_assessments, ENUM, トリガー, RLS, マスタデータ）、TypeScript型定義追加 |
| 2025-12-09 | v6 | admin監査漏れ修正（adminロールは常にmodified_by設定）、冗長な学年整合チェック削除 |
| 2025-12-09 | v5 | max_score_at_submission / grade_at_submission のUPDATE時変更禁止チェック追加（トリガー強化） |
| 2025-12-09 | v4 | is_resubmission+status組み合わせ制約追加、master_id変更禁止（トリガー）、UPDATE時grade整合チェックスキップ、assessment_date用途明記、マスタ更新禁止ポリシー追加、UI用語統一 |
| 2025-12-09 | v3 | status ENUM追加（completed/absent/not_submitted）、トリガー統合（順序問題修正）、学年整合チェック修正（grade_at_submission使用）、クラス平均計算修正（日付フィルタ削除）、欠席→補習ハンドリング追加 |
| 2025-12-09 | v2 | max_score_at_submission/grade_at_submission追加、modified_by監査、再提出制限(1回)、計算仕様明文化、タスク優先順位追加 |
| 2025-12-09 | v1 | 初版作成（マスタFK設計、RLS、UXパターン） |
