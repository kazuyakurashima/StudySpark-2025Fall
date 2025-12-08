# Phase 6: クラス内テスト機能（算数プリント・漢字テスト）

**期間:** 4-6週間（Phase 1-3）
**進捗:** 0% (0/72タスク完了)
**状態:** ⏳ 設計完了
**ブランチ:** `feature/class-assessment`

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
| **前回比の定義** | 同テスト種別 × 同attempt_number の直近 | 公平な比較のため |
| **クラス平均の定義** | 同学年の全生徒 | 保護者向け参考指標 |
| **代行修正** | 管理者ロールで他コーチの入力を修正可 | 運用柔軟性を確保 |

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
CREATE TABLE class_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 対象生徒
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,

  -- ★ マスタ参照（FK制約で厳密に紐付け）
  master_id UUID NOT NULL REFERENCES assessment_masters(id),

  -- 得点（max_scoreはマスタから取得、ここにはscoreのみ保存）
  score INTEGER NOT NULL CHECK (score >= 0),

  -- 実施日
  assessment_date DATE NOT NULL,

  -- 再提出フラグ（通常提出:false、再提出:true）
  is_resubmission BOOLEAN NOT NULL DEFAULT false,

  -- 監査情報
  grader_id UUID NOT NULL REFERENCES auth.users(id), -- 入力した指導者
  source VARCHAR(20) NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'import')),

  -- タイムスタンプ
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- 一意制約（同一生徒・同一マスタ・同一日・同一提出種別の重複防止）
  UNIQUE (student_id, master_id, assessment_date, is_resubmission)
);

-- インデックス
CREATE INDEX idx_class_assessments_student_date ON class_assessments(student_id, assessment_date DESC);
CREATE INDEX idx_class_assessments_master ON class_assessments(master_id);
CREATE INDEX idx_class_assessments_grader ON class_assessments(grader_id);

-- 得点がmax_scoreを超えないことを保証するトリガー
CREATE OR REPLACE FUNCTION check_score_not_exceeds_max()
RETURNS TRIGGER AS $$
DECLARE
  v_max_score INTEGER;
BEGIN
  SELECT max_score INTO v_max_score FROM assessment_masters WHERE id = NEW.master_id;
  IF NEW.score > v_max_score THEN
    RAISE EXCEPTION 'Score (%) exceeds max_score (%)', NEW.score, v_max_score;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_score
BEFORE INSERT OR UPDATE ON class_assessments
FOR EACH ROW EXECUTE FUNCTION check_score_not_exceeds_max();

-- 学年整合性チェック（生徒の学年とマスタの学年が一致することを確認）
CREATE OR REPLACE FUNCTION check_grade_consistency()
RETURNS TRIGGER AS $$
DECLARE
  v_student_grade VARCHAR(10);
  v_master_grade VARCHAR(10);
BEGIN
  SELECT grade INTO v_student_grade FROM students WHERE id = NEW.student_id;
  SELECT grade INTO v_master_grade FROM assessment_masters WHERE id = NEW.master_id;
  IF v_student_grade != v_master_grade THEN
    RAISE EXCEPTION 'Grade mismatch: student (%) vs master (%)', v_student_grade, v_master_grade;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_grade_consistency
BEFORE INSERT OR UPDATE ON class_assessments
FOR EACH ROW EXECUTE FUNCTION check_grade_consistency();
```

### RLSポリシー

```sql
-- RLS有効化
ALTER TABLE class_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_masters ENABLE ROW LEVEL SECURITY;

-- assessment_masters: 全ユーザー閲覧可（マスタデータ）
CREATE POLICY "masters_select_all" ON assessment_masters
  FOR SELECT TO authenticated
  USING (true);

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
```

#### 権限マトリクス

| ロール | SELECT | INSERT | UPDATE | DELETE | 備考 |
|--------|--------|--------|--------|--------|------|
| 生徒 | ○（自分のみ） | × | × | × | 閲覧専用 |
| 保護者 | ○（子どものみ） | × | × | × | 閲覧専用 |
| 指導者 | ○（担当生徒） | ○（担当生徒） | ○（自分入力分） | ○（自分入力分） | 入力者として記録 |
| 管理者 | ○（全て） | ○（全て） | ○（全て） | ○（全て） | 代行修正可 |

### 型定義

```typescript
// lib/types/class-assessment.ts

export type AssessmentType = 'math_print' | 'kanji_test'
export type AssessmentSource = 'manual' | 'import'

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
  score: number
  assessment_date: string // YYYY-MM-DD
  is_resubmission: boolean
  grader_id: string
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
  // 計算フィールド
  percentage: number           // score / master.max_score * 100

  // ★ 前回比（同種別・同attempt_number の直近と比較）
  previous_score?: number      // 前回の得点
  previous_percentage?: number // 前回の正答率
  change?: number              // 前回比（得点差）
  change_label?: string        // 「前回比(算数プリント1回目)」

  // ★ クラス平均（同学年全体）
  grade_average?: number       // 同学年平均点
  grade_average_percentage?: number // 同学年平均正答率

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
  score: number | null  // null = 欠席/未提出
  assessment_date: string
  is_resubmission: boolean
  is_absent?: boolean   // 欠席フラグ（UIのみで使用、DBには保存しない）
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
 * 同学年平均を計算
 */
async function getGradeAverage(
  masterId: string,
  assessmentDate: string
): Promise<{ average: number; count: number }> {
  const { data } = await supabase
    .from('class_assessments')
    .select('score, master:assessment_masters!inner(grade, max_score)')
    .eq('master_id', masterId)
    .eq('assessment_date', assessmentDate)
    .eq('is_resubmission', false)

  if (!data || data.length === 0) {
    return { average: 0, count: 0 }
  }

  const total = data.reduce((sum, a) => sum + a.score, 0)
  return {
    average: Math.round(total / data.length),
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

| 状態 | 表示内容 |
|------|---------|
| 初回テスト前 | 「まだテスト結果がありません。先生が入力すると表示されます」 |
| データあり・前回比なし | 前回比矢印を非表示、「初めての記録です！」と表示 |
| 欠席/未提出 | 「このテストは欠席しました」（灰色表示） |
| 全員欠席（平均計算不可） | 「クラス平均: データなし」 |

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

## タスク一覧

### P6-1: データベース設計・マイグレーション ⏳ 未着手 (0/14完了)

**目標:** クラス内テストを管理するテーブルを設計・作成

- [ ] `assessment_masters` マスタテーブル作成（FK参照元を先に作成）
- [ ] `class_assessments` テーブル作成（master_id FK付き）
- [ ] マイグレーションファイル作成
- [ ] 得点上限チェックトリガー作成（score <= max_score）
- [ ] 学年整合性チェックトリガー作成（student.grade == master.grade）
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

**最終更新:** 2025年12月9日（設計レビュー反映）
**更新者:** Claude Code
