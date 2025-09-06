---
id: T-020
title: Learning Calendar Heatmap (GitHub-style Visualization)
status: todo
spec_version: 01@v0.1
decisions_version: DECISIONS@v0.1
depends_on: [T-010]
links:
  req: [AC-001, US-001]
  api: [/api/students/{id}/calendar]
  db: [study_inputs]
  routes: [/student, /student/spark/history]
---

## Scope
GitHub風ヒートマップで学習継続状況を可視化。月次データ集計と3段階カラーレベル表示。

## Definition of Done
- ☐ GitHub風ヒートマップで継続状況を可視化
- ☐ 月次表示（当月+次月の2ブロック）
- ☐ 3段階色分け（なし/薄/中/濃）based on 科目数×理解度
- ☐ 日付クリックでツールチップ表示（記録数・科目・理解度分布）
- ☐ レスポンシブ対応（SP/Tablet/PC）

## TODO
- ☐ API: GET /api/students/{id}/calendar?month=YYYY-MM 実装
- ☐ DB: 月次集計クエリ最適化（インデックス確認）
- ☐ UI: HeatmapCalendar コンポーネント作成
- ☐ UI: CalendarTooltip コンポーネント作成
- ☐ UI: /student ダッシュボードへの埋め込み
- ☐ UI: /student/spark/history 履歴ページ作成
- ☐ Style: 3段階ブルー色定義（アクセシビリティ配慮）
- ☐ Test: 集計ロジックの単体テスト
- ☐ Test: カレンダー操作のE2Eテスト

## Files (予定)
- `app/api/students/[studentId]/calendar/route.ts` - 集計API
- `components/features/calendar/HeatmapCalendar.tsx` - ヒートマップ
- `components/features/calendar/CalendarTooltip.tsx` - ツールチップ
- `app/student/spark/history/page.tsx` - 履歴ページ
- `lib/utils/calendar-aggregation.ts` - 集計ロジック
- `styles/calendar-colors.css` - カラーテーマ

## Rollback
カレンダーコンポーネント削除、集計API削除

## Notes
D-007準拠: 既存ダッシュボード構造維持。
色覚多様性対応: コントラスト比4.5:1以上、数値併記必須。
パフォーマンス: 月単位プリフェッチ（±1ヶ月）。