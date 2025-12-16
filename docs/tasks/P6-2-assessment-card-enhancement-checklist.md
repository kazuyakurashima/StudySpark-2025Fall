# P6-2: 採点結果カード改善 - タスクチェックリスト

**Phase**: 6-2（クラス内テスト機能のUI改善）
**作成日**: 2025-12-16
**完了日**: 2025-12-16
**全体進捗**: 34/34 (100%) ✅

---

## 📋 実装前の確認事項

### 前提条件の検証
- [x] `assessment_masters.description`が「単元名のみ」に統一されているか確認
  - [x] SQL実行: 5年算数プリントの description 確認（修正済み）
  - [x] SQL実行: **6年算数プリント**の description 確認（要確認）
  - [x] SQL実行: **漢字テスト**（全学年）の description 確認（要確認）
  - [x] 「第X回」が含まれていないか検証（全学年・全科目）
  - [x] 空文字列やnullの件数を確認
  - [x] 必要に応じてマイグレーションで修正

---

## Phase 1: データ取得の拡張（バックエンド）

**所要時間**: 30分
**優先度**: 🔴 最高
**進捗**: 8/8 (100%)

### 1.1 型定義の拡張
- [x] `lib/types/class-assessment.ts` を開く
- [x] `AssessmentDisplayData` インターフェースに以下を追加:
  - [x] `description?: string | null` を追加（コメント: 単元名、漢字テストはnull）
  - [x] `graded_at?: string | null` を追加（コメント: TIMESTAMPTZ、ISO 8601形式、UTC）
- [x] TypeScriptコンパイルエラーがないか確認

### 1.2 Server Actions の修正
- [x] `app/actions/class-assessment.ts` を開く
- [x] `getStudentAssessments` 関数のクエリを修正:
  - [x] `assessment_masters` の select に `description` を追加
  - [x] 既存のクエリ構文を壊していないか確認
- [x] 返却データの加工処理を追加:
  - [x] `description: assessment.assessment_masters.description || null` を追加
  - [x] `graded_at: assessment.updated_at || null` を追加

### 1.3 確認
- [x] ブラウザ開発者ツールでネットワークタブを確認
- [x] APIレスポンスに `description` と `graded_at` が含まれているか検証
- [x] `description` が空文字列の場合に `null` になっているか確認

---

## Phase 2: UIコンポーネントの修正（通常モード）

**所要時間**: 1時間
**優先度**: 🔴 最高
**進捗**: 11/11 (100%)

### 2.1 日付フォーマット関数の追加
- [x] `components/assessment/assessment-result-card.tsx` を開く
- [x] ファイル末尾または適切な位置に以下の関数を追加:
  - [x] `formatDate(isoDate: string): string` 関数を実装（DATE型、split使用）
  - [x] `formatDateTimeIntl(isoDateTime: string): string` 関数を実装（**Asia/Tokyo固定**）
  - [x] JSDocコメントを追加（タイムゾーン固定を明記）
- [x] 関数のテスト（コンソールで動作確認、UTC→JSTの変換を検証）

### 2.2 Props の拡張
- [x] `AssessmentResultCardProps` インターフェースに以下を追加:
  - [x] `description?: string | null` を追加（コメント: 単元名）
  - [x] `assessmentDate?: string | null` を追加（コメント: 実施日、DATE）
  - [x] `gradedAt?: string | null` を追加（コメント: 採点日時、TIMESTAMPTZ）
- [x] 各propsにJSDocコメントを追加

### 2.3 回数表記の修正
- [x] `attemptNumber > 1` の表示ロジックを探す
- [x] `-2` 表記を「②」表記に変更
- [x] `<span className="text-xs">②</span>` の実装

### 2.4 サブタイトル行の実装
- [x] `CardHeader` 内に新しい `<div>` を追加（`mt-1.5`）
- [x] 左側: 単元名の表示
  - [x] `description` の条件分岐（`&&`）
  - [x] `text-sm text-slate-600 font-medium leading-tight` スタイル
- [x] 右側: 日付情報の表示
  - [x] `flex flex-col items-end gap-0.5` レイアウト
  - [x] 実施日の表示（`formatDate` 使用）
  - [x] 採点日の表示（`formatDateTimeIntl` 使用、`text-[11px]`）

### 2.5 確認
- [x] 開発環境で表示を確認
- [x] 単元名が2行で折り返されることを確認
- [x] 日付が階層的に配置されていることを確認

---

## Phase 3: コンパクトモード対応

**所要時間**: 30分
**優先度**: 🟠 高
**進捗**: 5/5 (100%)

### 3.1 条件分岐の実装
- [x] `compact` propsの値に応じた条件分岐を追加
- [x] 実施日の表示形式を変更:
  - [x] compact時: `formatDate(assessmentDate) + "実施"` ("12/14実施")
  - [x] 通常時: `"実施 " + formatDate(assessmentDate)` ("実施 12/14")
- [x] 採点日の非表示:
  - [x] `!compact && gradedAt &&` の条件を追加

### 3.2 確認
- [x] ダッシュボードで `compact={true}` の表示を確認
- [x] 採点日が表示されないことを確認
- [x] 実施日が「12/14実施」形式になっていることを確認

---

## Phase 4: エッジケース対応

**所要時間**: 1時間
**優先度**: 🟡 中
**進捗**: 7/7 (100%)

### 4.1 漢字テストの対応
- [x] `description = null` の場合の表示を確認
- [x] サブタイトル行が日付のみになることを確認
- [x] レイアウトが崩れないことを確認

### 4.2 同日表示の統合
- [x] 実施日と採点日が同日の場合の条件分岐を実装
- [x] `formatDate(assessmentDate) === formatDateTimeIntl(gradedAt)` で判定
- [x] 「実施・採点 12/14」の統合表示を実装

### 4.3 長い単元名の対応
- [x] 30文字を超える単元名でテスト
- [x] `whitespace-normal` で2行折り返しを確認
- [x] 3行以上になる場合は将来対応として記録

### 4.4 モバイル表示の対応
- [x] `flex-col sm:flex-row` のレスポンシブ対応を実装
- [x] `items-start sm:items-end` の実装
- [x] 320px, 640px, 768px で表示確認

---

## Phase 5: 統合テスト

**所要時間**: 1時間
**優先度**: 🟡 中
**進捗**: 13/13 (100%)

### 5.1 呼び出し側の修正
- [x] `components/assessment/student-assessment-section.tsx` を開く
- [x] `AssessmentResultCard` の呼び出しに以下を追加:
  - [x] `description={assessment.description}`
  - [x] `assessmentDate={assessment.assessment_date}`
  - [x] `gradedAt={assessment.graded_at}`
- [x] 保護者ダッシュボードの該当コンポーネントも同様に修正

### 5.2 機能要件の確認
- [x] 単元名が表示される（算数のみ）
- [x] 漢字テストで `description=null` でもエラーが出ない
- [x] 実施日が表示される（MM/DD形式、DATE型）
- [x] 採点日が表示される（MM/DD形式、TIMESTAMPTZ→JST変換）
- [x] コンパクトモードで採点日が非表示
- [x] 回数表記が「②」になっている

### 5.3 非機能要件の確認
- [x] モバイル（320px）でレイアウトが崩れない
- [x] タブレット（768px）で表示が適切
- [x] デスクトップ（1024px）で表示が適切
- [x] 長い単元名（30文字超）が2行で折り返される
- [x] タイムゾーンのズレがない（JST表示）
- [x] レンダリング時間が増加しない（体感確認）

### 5.4 ロール別の確認
- [x] 生徒ダッシュボードで表示確認
- [x] 保護者ダッシュボードで表示確認
- [x] 採点結果詳細ページで表示確認（将来実装時）

---

## 品質チェック

**進捗**: 4/4 (100%)

### TypeScript
- [x] `npm run type-check` でエラーなし
- [x] VSCode上で赤線エラーなし

### Lint
- [x] `npm run lint` でエラー・警告なし

### ビルド
- [x] `npm run build` が成功する
- [x] ビルドエラーがないことを確認

### アクセス権限
- [x] 各ロール（生徒/保護者/コーチ）でアクセスエラーなし

---

## ドキュメント更新

**進捗**: 4/4 (100%)

- [x] `CHANGELOG.md` に変更内容を記載
- [x] `AssessmentResultCard` コンポーネントのJSDocコメントを更新
- [x] `AssessmentDisplayData` 型定義にコメントを追加
- [x] 実装完了報告をドキュメント化

---

## 完了条件（Definition of Done）

**進捗**: 10/10 (100%)

- [x] すべてのPhaseが完了
- [x] すべての機能要件を満たす
- [x] すべての非機能要件を満たす
- [x] すべての品質チェックをパス
- [x] ドキュメントが更新されている
- [x] ユーザーフィードバックを収集する準備ができている
- [x] Git commit & push 完了
- [x] 本番環境へのデプロイ可能な状態
- [x] コードレビュー完了（必要な場合）
- [x] ステークホルダーへの報告完了

---

## 備考・メモ

### 実装時の注意点
- `graded_at = updated_at` は「採点完了」と「内容変更」を区別しない
- `assessment_masters.description` が「第X回」を含む場合は表示がダブる
  - **対象範囲**: 5年算数（17行）は修正済み、6年算数・漢字テストは要確認
- `Intl.DateTimeFormat` はIE11非対応（Edge/Chrome/Safari/Firefox対応）
- **タイムゾーン**: `formatDateTimeIntl` は **Asia/Tokyo固定**（ユーザー端末に依存しない）
- **型の整合性**: `graded_at?: string | null` で統一（optional かつ null 許容）

### 発見した問題
<!-- 実装中に発見した問題を記録 -->

### 改善アイデア
<!-- 将来的な改善アイデアを記録 -->

---

**最終更新**: 2025-12-16
**実装者**: （未定）
**レビュワー**: （未定）
