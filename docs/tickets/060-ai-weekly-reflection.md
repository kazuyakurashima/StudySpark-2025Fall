---
id: T-060
title: AI Weekly Reflection with Feedback
status: todo
spec_version: 01@v0.1
decisions_version: DECISIONS@v0.1
depends_on: [T-010]
links:
  req: [AC-005, US-005]
  api: [/api/ai/reflection-feedback]
  db: [reflections, study_inputs]
  routes: [/student/reflect]
---

## Scope
週間振り返り機能。土日入力、良い点・改善点記録、AIから前向きフィードバックと次週アドバイス生成。

## Definition of Done
- ☐ 土曜または日曜に振り返り入力可能
- ☐ 今週の良かった点・改善点を記録
- ☐ AIが前向きなフィードバックを生成
- ☐ 次週の具体的アドバイスを提示
- ☐ セルフコンパッション促進の応答内容

## TODO
- ☐ DB: reflections テーブル作成（週単位管理）
- ☐ API: POST /api/ai/reflection-feedback 実装
- ☐ AI: セルフコンパッション プロンプト設計
- ☐ AI: 週間学習データ要約・分析
- ☐ AI: 前向きフィードバック生成（禁止ワード設定）
- ☐ Logic: 週境界判定（月曜開始〜日曜終了）
- ☐ UI: /student/reflect 振り返り入力フォーム
- ☐ UI: WeeklyReflectionForm コンポーネント
- ☐ UI: AIFeedback 表示コンポーネント
- ☐ Test: 週境界ロジックテスト
- ☐ Test: AIフィードバック品質テスト

## Files (予定)
- `app/student/reflect/page.tsx` - 振り返り画面
- `app/api/ai/reflection-feedback/route.ts` - AI分析API
- `components/features/reflect/WeeklyReflectionForm.tsx` - 入力フォーム
- `components/features/reflect/AIFeedback.tsx` - AI応答表示
- `supabase/migrations/20250107_003_reflections.sql` - reflections テーブル
- `lib/services/ai-reflection.ts` - AI振り返りサービス
- `lib/utils/week-boundaries.ts` - 週管理ユーティリティ

## Rollback
reflections テーブル削除、AI振り返りAPI削除、画面削除

## Notes
D-007準拠: 既存UI構造維持。
セルフコンパッション: 自己批判抑制、成長促進の表現を重視。
タイムゾーン: Asia/Tokyo 基準で週境界判定。