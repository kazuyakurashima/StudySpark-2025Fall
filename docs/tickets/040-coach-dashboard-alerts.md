---
id: T-040
title: Coach Dashboard with Priority Alerts
status: todo
spec_version: 01@v0.1
decisions_version: DECISIONS@v0.1
depends_on: [T-010]
links:
  req: [AC-003, US-003]
  api: [/api/coaches/{id}/students]
  db: [memberships, study_inputs]
  routes: [/coach, /coach/students/{id}]
---

## Scope
指導者ダッシュボード。担当生徒全員の状況を優先度順表示、アラート通知、1クリック遷移。

## Definition of Done
- ☐ 担当生徒全員の状況が優先度順に表示
- ☐ アラート（3日未記録等）が目立つ形で通知
- ☐ 個別生徒画面へ1クリックで遷移可能
- ☐ 組織スコープでの生徒フィルタリング
- ☐ アラートルール設定（3日未記録、理解度低下等）

## TODO
- ☐ API: GET /api/coaches/{id}/students 実装
- ☐ Logic: アラート検出ルール実装（3日未記録、理解度低下）
- ☐ Logic: 優先度ソートアルゴリズム（アラート数、最終記録日）
- ☐ UI: CoachDashboard コンポーネント作成
- ☐ UI: StudentCard アラート付きカード
- ☐ UI: AlertBadge 目立つアラート表示
- ☐ UI: StudentList 優先度順ソート
- ☐ Route: /coach/students/{id} 遷移確認
- ☐ Auth: 組織スコープ権限確認（RLS）
- ☐ Test: アラート検出ロジックテスト
- ☐ Test: 優先度ソート正確性テスト

## Files (予定)
- `app/coach/page.tsx` - 指導者ダッシュボード
- `app/api/coaches/[coachId]/students/route.ts` - 生徒一覧API
- `components/features/coach/CoachDashboard.tsx` - ダッシュボード
- `components/features/coach/StudentCard.tsx` - 生徒カード
- `components/features/coach/AlertBadge.tsx` - アラートバッジ
- `lib/services/alert-detection.ts` - アラート検出
- `lib/utils/priority-sorting.ts` - 優先度ソート

## Rollback
指導者ダッシュボード削除、アラートAPI削除

## Notes
D-007準拠: 既存ダッシュボード構造維持。
スケーラビリティ: 100名以上の生徒対応想定。
アラートルール: 将来的に設定可能にする拡張性を考慮。