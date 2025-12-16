# P6-2: 採点結果カード改善 - 実装案

**Phase**: 6-2（クラス内テスト機能のUI改善）
**作成日**: 2025-12-16
**ステータス**: 設計完了 → 実装待ち
**関連**: P6（クラス内テスト機能）の機能拡張

## 改訂履歴
- **v1**: 初版（2025-12-16）
- **v2**: レビュー反映（graded_at注意点、日付ズレ対策、単元名前提の明確化）

---

## 0. 目的と背景

### 0.1 課題
現在の採点結果カードには以下の情報が不足しており、学習の振り返りや家庭内会話に支障がある：
- **いつのテストか**（実施日・採点日が不明）
- **何のテストか**（算数の単元名が不明）

### 0.2 目標
以下の情報を追加表示することで、ユーザー体験を向上させる：
1. **単元名**: 「旅人算と比」など具体的な学習内容を表示
2. **実施日**: いつ受けたテストかを明示
3. **採点日**: いつ採点されたかを補助情報として表示

### 0.3 期待効果
- **生徒**: 復習すべき内容を特定しやすくなる
- **保護者**: 家庭内会話が具体化（「12/14の旅人算のテスト、どうだった？」）
- **コーチ**: 採点日を確認でき、入力漏れの発見が容易になる

---

## 1. 前提条件の確認（重要）

### 1.1 マスタデータの統一性
**確認事項**: `assessment_masters.description` が「単元名のみ」に統一されているか

- ✅ **想定**: `"旅人算と比"`, `"比の利用"` など単元名のみ
- ❌ **NGパターン**: `"第7回① 旅人算と比"` （「第X回」が含まれると表示がダブる）

**対象範囲**:
- マイグレーション `20251216000001` で修正済み: **5年算数プリント（17行）**
- 未確認: **6年算数プリント、漢字テスト**

**確認コマンド**:
```sql
-- 5年算数プリント（修正済み）
SELECT assessment_type, grade, session_number, attempt_number, description
FROM assessment_masters
WHERE assessment_type = 'math_print' AND grade = '5年'
ORDER BY session_number, attempt_number;

-- 6年算数プリント（要確認）
SELECT assessment_type, grade, session_number, attempt_number, description
FROM assessment_masters
WHERE assessment_type = 'math_print' AND grade = '6年'
ORDER BY session_number, attempt_number;

-- 漢字テスト（全学年・要確認）
SELECT assessment_type, grade, session_number, attempt_number, description
FROM assessment_masters
WHERE assessment_type = 'kanji_test'
ORDER BY grade, session_number, attempt_number;
```

**実装前の対応**:
- 5年算数以外のdescriptionも「単元名のみ」に統一されているか確認
- 「第X回」が含まれている場合はマイグレーションで修正

### 1.2 日付の扱い
- **assessment_date**: DATE型（タイムゾーンの影響を受けない）
- **graded_at (updated_at)**: TIMESTAMPTZ型（UTC保存、表示時にJST変換が必要）

---

## 2. データ構造の変更

### 2.1 型定義の拡張
**ファイル**: `lib/types/class-assessment.ts`

```typescript
export interface AssessmentDisplayData {
  id: string
  student_id: number
  status: AssessmentStatus

  // テスト情報
  assessment_type: AssessmentType
  session_number: number
  attempt_number: number
  assessment_date: string  // 既存: 実施日（DATE型、"2025-12-14"）
  is_resubmission: boolean

  // ✨ 追加: 単元名（optional - 漢字テストや古いデータはnull）
  description?: string | null  // 例: "旅人算と比"、漢字テストはnull

  // ✨ 追加: 採点日時（optional - 未採点や古いデータはnull）
  graded_at?: string | null  // updated_at（TIMESTAMPTZ、ISO 8601形式、UTC）

  // 得点情報（既存）
  score: number | null
  max_score: number
  percentage: number | null
  // ... 以下既存フィールド
}
```

**設計判断**:
- `description`: optional（`?`）にして、古いデータやnullを許容
- `graded_at`: optional（`?`）にして、未採点データでもエラーにならないようにする
- `graded_at`は`updated_at`を使用するが、**「採点完了」と「内容変更」の区別が付かない**点を認識（将来的に厳密化が必要な場合は専用カラム追加を検討）

---

## 3. Server Actions の修正

### 3.1 データ取得クエリの拡張
**ファイル**: `app/actions/class-assessment.ts` の `getStudentAssessments` 関数

**現在のクエリ:**
```typescript
.select(`
  id, student_id, status, score, assessment_date, is_resubmission,
  max_score_at_submission, grade_at_submission, created_at, updated_at,
  master_id,
  assessment_masters!inner(assessment_type, session_number, attempt_number, max_score)
`)
```

**変更後のクエリ:**
```typescript
.select(`
  id, student_id, status, score, assessment_date, is_resubmission,
  max_score_at_submission, grade_at_submission, created_at, updated_at,
  master_id,
  assessment_masters!inner(
    assessment_type,
    session_number,
    attempt_number,
    max_score,
    description  // ✨ 追加
  )
`)
```

**返却データの加工:**
```typescript
return {
  // ... 既存フィールド
  description: assessment.assessment_masters.description || null,  // ✨ 追加
  graded_at: assessment.updated_at || null,  // ✨ 追加（最終更新日）
}
```

**注意点**:
- `description`が空文字列の場合も`null`に正規化
- `graded_at`はUTC文字列（ISO 8601形式: `"2025-12-16T10:30:00Z"`）

---

## 4. UIコンポーネントの修正

### 4.1 AssessmentResultCard の props 拡張
**ファイル**: `components/assessment/assessment-result-card.tsx`

```typescript
interface AssessmentResultCardProps {
  type: AssessmentType
  sessionNumber: number
  attemptNumber?: number
  status: AssessmentStatus
  score: number | null
  maxScore: number
  percentage: number | null
  change?: number
  changeLabel?: string
  actionSuggestion?: string
  isResubmission?: boolean
  compact?: boolean

  // ✨ 追加（すべてoptional、null許容）
  description?: string | null       // 単元名（算数のみ、漢字はnull）
  assessmentDate?: string | null    // 実施日（DATE: "2025-12-14"）
  gradedAt?: string | null          // 採点日時（TIMESTAMPTZ: "2025-12-16T10:30:00Z"）
}
```

---

### 4.2 UIレイアウト案（確定版）

#### 通常モード（詳細表示）
```
┌──────────────────────────────────────────┐
│ [算数プリント] 第7回②        +3点 ↗️   │ ← ヘッダー（②表記）
│ 旅人算と比                    実施 12/14│ ← サブタイトル + 実施日
│                              採点 12/16 │ ← 採点日（右寄せ・小さく）
├──────────────────────────────────────────┤
│ 28 /32        ▓▓▓▓▓▓▓▓▓▓▓░░░░ 87%      │ ← スコア
│ 前回より3点アップ！成長してるね           │ ← 前回比メッセージ
│ 🎉 すごい！目標達成だね！                │ ← 祝福
│ 💡 次の一歩: この調子で次のプリントに... │ ← 行動提案
└──────────────────────────────────────────┘
```

#### コンパクトモード（ダッシュボード）
```
┌──────────────────────────────────────────┐
│ [算数プリント] 第7回②        +3点 ↗️   │ ← ヘッダー（②表記）
│ 旅人算と比                    12/14実施 │ ← 単元名 + 実施日のみ
├──────────────────────────────────────────┤
│ 28 /32        ▓▓▓▓▓▓▓▓▓▓▓░░░░ 87%      │ ← スコア（簡略）
└──────────────────────────────────────────┘
```

**レイアウト判断**:
- ✅ **回数表記**: `attemptNumber > 1`は「②」表記（既存UIと統一）
- ✅ **単元名**: 2行表示を許容（`whitespace-normal`）、長すぎる場合もコンパクトモードでは`truncate`不使用（視認性優先）
- ✅ **日付**: 右寄せ、階層的に配置（実施日→採点日）

---

### 4.3 日付フォーマット関数（タイムゾーン対応版）

```typescript
/**
 * DATE型の日付をMM/DD形式にフォーマット
 * @param isoDate - "2025-12-14" 形式（DATE型、タイムゾーンの影響なし）
 * @returns "12/14"
 */
function formatDate(isoDate: string): string {
  // DATE型は "YYYY-MM-DD" 形式なので split で安全に処理
  const [year, month, day] = isoDate.split('-')
  return `${parseInt(month)}/${parseInt(day)}`
}

/**
 * TIMESTAMPTZ型の日付時刻をMM/DD形式（JST固定）にフォーマット
 * @param isoDateTime - "2025-12-16T10:30:00Z" 形式（UTC）
 * @returns "12/16" （Asia/Tokyo タイムゾーンで表示）
 * @note タイムゾーンは Asia/Tokyo に固定（ユーザー端末のロケールに依存しない）
 */
function formatDateTimeIntl(isoDateTime: string): string {
  const date = new Date(isoDateTime)
  const formatter = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',  // ✅ JST固定（ユーザー端末に依存しない）
    month: 'numeric',
    day: 'numeric',
  })
  return formatter.format(date) // "12/16"
}
```

**設計判断**:
- ✅ **assessment_date（DATE）**: `formatDate()`を使用（splitで安全処理、ズレなし）
- ✅ **graded_at（TIMESTAMPTZ）**: `formatDateTimeIntl()`を使用（JST変換、`Intl.DateTimeFormat`で確実）
- ❌ **NGパターン**: `new Date(isoDate).getMonth()` → タイムゾーンでズレる可能性

---

### 4.4 実装コード例（確定版）

```typescript
// CardHeader の下に追加
<CardHeader className={compact ? "pb-2 pt-3 px-4" : "pb-2"}>
  {/* 既存: タイトル行 */}
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2">
      <Badge className={cn("text-xs", colors.badge)}>
        {ASSESSMENT_TYPE_LABELS[type]}
      </Badge>
      <span className="text-sm text-slate-600">
        第{sessionNumber}回
        {/* ✨ 修正: attemptNumber > 1 は「②」表記 */}
        {type === "math_print" && attemptNumber > 1 && (
          <span className="text-xs">②</span>
        )}
      </span>
      {isResubmission && (
        <Badge variant="outline" className="text-xs">再提出</Badge>
      )}
    </div>
    {change !== undefined && (
      // 既存: 前回比表示
    )}
  </div>

  {/* ✨ 新規: サブタイトル行（単元名 + 日付） */}
  {(description || assessmentDate || gradedAt) && (
    <div className="flex items-start justify-between mt-1.5 gap-2">
      {/* 左: 単元名（2行表示を許容） */}
      {description && (
        <span className="text-sm text-slate-600 font-medium leading-tight">
          {description}
        </span>
      )}

      {/* 右: 日付情報（階層的に配置） */}
      <div className="flex flex-col items-end gap-0.5 text-xs flex-shrink-0">
        {/* 実施日 */}
        {assessmentDate && (
          <span className="text-slate-500">
            {compact
              ? formatDate(assessmentDate) + "実施"     // "12/14実施"
              : "実施 " + formatDate(assessmentDate)   // "実施 12/14"
            }
          </span>
        )}
        {/* 採点日（通常モードのみ） */}
        {!compact && gradedAt && (
          <span className="text-slate-400 text-[11px]">
            採点 {formatDateTimeIntl(gradedAt)}  // "採点 12/16" (JST)
          </span>
        )}
      </div>
    </div>
  )}
</CardHeader>
```

**実装ポイント**:
- ✅ 単元名は`leading-tight`で行間を詰める（2行時の見栄え改善）
- ✅ 日付は`gap-0.5`で詰める（階層的な視覚効果）
- ✅ 採点日は`text-[11px]`でさらに小さく（補助情報として控えめに）
- ✅ すべてのフィールドがoptionalなので、`&&`で安全にレンダリング

---

## 5. エッジケースの対応（確定版）

### 5.1 漢字テストの場合
- `description = null` → サブタイトル行は**日付のみ**表示
- レイアウト: `justify-between`で自然に右寄せになる

### 5.2 実施日と採点日が同日の場合
```typescript
// ✨ 判断: 同日なら統合表示
{assessmentDate && gradedAt && (
  (() => {
    const isSameDay = formatDate(assessmentDate) === formatDateTimeIntl(gradedAt)
    return (
      <span className="text-slate-500">
        {isSameDay
          ? `実施・採点 ${formatDate(assessmentDate)}`  // "実施・採点 12/14"
          : (
            <>
              実施 {formatDate(assessmentDate)}
              {!compact && <><br />採点 {formatDateTimeIntl(gradedAt)}</>}
            </>
          )
        }
      </span>
    )
  })()
)}
```

**設計判断**: 同日の場合は「実施・採点 12/14」と統合表示（冗長性の排除）

### 5.3 長い単元名（30文字超）
- **通常モード**: `whitespace-normal`で2行表示を許容
- **コンパクトモード**: 同様（`truncate`不使用、視認性優先）
- 将来的に必要なら: ホバーでツールチップ表示を検討

### 5.4 モバイル表示（幅320px〜）
```typescript
{/* レスポンシブ対応: sm未満では縦積み */}
<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mt-1.5 gap-2">
  {description && (
    <span className="text-sm text-slate-600 font-medium leading-tight">
      {description}
    </span>
  )}
  <div className="flex flex-col items-start sm:items-end gap-0.5 text-xs flex-shrink-0">
    {/* 日付 */}
  </div>
</div>
```

**設計判断**:
- `sm:` ブレークポイント（640px）以下で縦積み
- 日付も左寄せに変更（`items-start sm:items-end`）

---

## 6. 実装判断事項（確定版）

### 6.1 確定事項
| 項目 | 判断 | 理由 |
|------|------|------|
| **graded_at の元データ** | `updated_at`（最終更新日時） | 採点修正に対応するため |
| **graded_at の表示形式** | JST表示（`Intl.DateTimeFormat`使用） | タイムゾーンズレ対策 |
| **回数表記** | 「②」表記（`attemptNumber > 1`時） | 既存UIと統一 |
| **単元名の折り返し** | 2行許容（`whitespace-normal`） | 視認性優先 |
| **コンパクトモードの採点日** | 非表示 | 情報密度の調整 |
| **同日表示** | 「実施・採点 12/14」と統合 | 冗長性の排除 |

### 6.2 注意事項
- ⚠️ `graded_at = updated_at`は「採点完了」と「内容変更」を区別しない（将来的に専用カラム検討）
- ⚠️ `assessment_masters.description`が「第X回」を含む場合は表示がダブる（マスタの統一が前提）
- ⚠️ 日付フォーマットは`Intl.DateTimeFormat`を使用（ブラウザ互換性: IE11非対応、Edge/Chrome/Safari/Firefox対応）
- ⚠️ `AssessmentResultCard`は`"use client"`（CSR）のため、`Intl.DateTimeFormat`はブラウザで実行される（SSRで使う場合はNode.js ICU対応が必要）

---

## 7. 期待される改善効果（定量評価）

### 7.1 情報密度の向上
- **Before**: タイトル（テスト種別 + 回数）、スコア、前回比 = **3要素**
- **After**: タイトル + 単元名 + 実施日 + 採点日 + スコア + 前回比 = **6要素**
- **増加率**: +100%（情報量2倍）

### 7.2 視覚的な複雑さ
- **追加行数**: サブタイトル行1行のみ
- **視覚的負荷**: わずかな増加（`mt-1.5`で適度な間隔）
- **可読性**: 階層的な配置で視線誘導が明確

### 7.3 ユーザーメリット
1. **生徒**: 「どの単元のテストか」が即座に分かる → 復習の優先順位付けが容易
2. **保護者**: 「いつの何のテストか」を把握 → 家庭内会話が具体化（「12/14の旅人算のテスト、どうだった？」）
3. **コーチ**: 採点日を確認できる → 入力漏れや古いデータの発見が容易

---

## 8. 実装優先度

| 項目 | 優先度 | 所要時間 | 影響範囲 |
|------|--------|----------|----------|
| **Phase 1: データ取得** | 🔴 最高 | 30分 | バックエンド |
| **Phase 2: 通常モード** | 🔴 最高 | 1時間 | UIコンポーネント |
| **Phase 3: コンパクトモード** | 🟠 高 | 30分 | ダッシュボード |
| **Phase 4: エッジケース** | 🟡 中 | 1時間 | モバイル対応 |
| **Phase 5: 統合テスト** | 🟡 中 | 1時間 | 全体 |

**合計所要時間**: 4時間

---

## 9. 変更ファイル一覧

### 修正ファイル
- `lib/types/class-assessment.ts` - 型定義拡張
- `app/actions/class-assessment.ts` - Server Actions修正
- `components/assessment/assessment-result-card.tsx` - UIコンポーネント修正
- `components/assessment/student-assessment-section.tsx` - props追加
- `app/parent/dashboard-client.tsx`（または該当コンポーネント） - props追加

### 新規作成不要
- 日付フォーマット関数は既存コンポーネント内に追加

---

## 10. 実装後のフォローアップ

### 10.1 短期（1週間以内）
- ユーザーフィードバック収集（生徒・保護者）
- 表示崩れやバグの修正
- パフォーマンスモニタリング

### 10.2 中期（1ヶ月以内）
- 長い単元名のtruncate検討（必要に応じて）
- 採点日の「厳密化」検討（`graded_at`専用カラム追加）
- ツールチップ追加検討（詳細情報の表示）

### 10.3 長期（3ヶ月以内）
- 「単元別の成績推移」機能との連携
- 「復習すべき単元」のレコメンド機能
- AI分析での単元名活用

---

## 11. 参考資料

- P6設計ドキュメント: `docs/tasks/P6-class-assessment.md`
- マイグレーション: `supabase/migrations/20251209000001_create_class_assessments.sql`
- マスタ修正: `supabase/migrations/20251216000001_fix_class_assessment_masters_math_print_5th_grade.sql`
