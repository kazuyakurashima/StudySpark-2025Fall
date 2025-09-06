---
id: T-030
title: Parent Dashboard with AI Interpretation
status: todo
spec_version: 01@v0.1
decisions_version: DECISIONS@v0.1
depends_on: [T-010]
links:
  req: [AC-002, US-002]
  api: [/api/parents/{id}/dashboard]
  db: [parent_student_relations, study_inputs]
  routes: [/parent]
---

## Scope
保護者向けダッシュボード。子供の今週学習状況要約、AI解釈、推奨アクション表示。

## Definition of Done
- ☐ 子供の今週の学習状況が要約表示される
- ☐ AI解釈付きで状況を理解できる（GPT-5-mini使用）
- ☐ 推奨アクション（声かけ例）が提示される
- ☐ 複数子供がいる場合のタブ切り替え
- ☐ リアルタイムデータ反映（子供の記録更新時）

## TODO
- ☐ API: GET /api/parents/{id}/dashboard 実装
- ☐ AI: 学習状況解釈プロンプト設計（GPT-5-mini）
- ☐ AI: 推奨アクション生成（声かけパターンDB）
- ☐ UI: ParentDashboard コンポーネント作成
- ☐ UI: ChildrenTabs 切り替えコンポーネント
- ☐ UI: AIInterpretation 表示コンポーネント
- ☐ UI: RecommendedActions リストコンポーネント
- ☐ Data: 親子関係の権限確認（RLS適用）
- ☐ Test: AI応答の品質テスト
- ☐ Test: 複数子供切り替えのE2Eテスト

## Files (予定)
- `app/parent/page.tsx` - 保護者ダッシュボード
- `app/api/parents/[parentId]/dashboard/route.ts` - 集計API
- `components/features/parent/ParentDashboard.tsx` - ダッシュボード
- `components/features/parent/ChildrenTabs.tsx` - 子供切り替え
- `components/features/ai/AIInterpretation.tsx` - AI解釈表示
- `lib/services/ai-parent-coaching.ts` - AI解釈サービス
- `lib/utils/parent-student-access.ts` - 権限チェック

## Rollback
保護者ダッシュボード削除、AI解釈API削除

## Notes
D-007準拠: 既存レイアウト構造維持。
AI使用料上限: 保護者1人あたり月100リクエスト想定。
プライバシー: 子供の詳細データは要約のみ表示。