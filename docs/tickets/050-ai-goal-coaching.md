---
id: T-050
title: AI Goal Coaching with GROW Model
status: todo
spec_version: 01@v0.1
decisions_version: DECISIONS@v0.1
depends_on: [T-010]
links:
  req: [AC-004, US-004]
  api: [/api/ai/goal-coaching]
  db: [goals, study_inputs]
  routes: [/student/goal]
---

## Scope
AIがGROWモデルで対話的に目標設定支援。SMART原則準拠、過去データから現実的目標値提案。

## Definition of Done
- ☐ AIがGROWモデルで対話的に目標設定支援
- ☐ SMART原則に基づく具体的目標が生成
- ☐ 過去データから現実的な目標値を提案
- ☐ 目標の進捗追跡と達成判定
- ☐ AI応答時間5秒以内（GPT-5-mini使用）

## TODO
- ☐ DB: goals テーブル作成（SMART準拠項目）
- ☐ API: POST /api/ai/goal-coaching 実装
- ☐ AI: GROWモデルプロンプト設計（Goal/Reality/Options/Will）
- ☐ AI: SMART原則検証ロジック
- ☐ AI: 過去データ分析（現実的目標値算出）
- ☐ UI: /student/goal 目標設定画面
- ☐ UI: AICoachingChat 対話コンポーネント
- ☐ UI: GoalProgress 進捗表示
- ☐ Logic: 目標達成判定（study_inputs連携）
- ☐ Test: AI対話フローテスト
- ☐ Test: SMART原則適合性テスト

## Files (予定)
- `app/student/goal/page.tsx` - 目標設定画面
- `app/api/ai/goal-coaching/route.ts` - AI対話API
- `components/features/goal/AICoachingChat.tsx` - AI対話
- `components/features/goal/GoalProgress.tsx` - 進捗表示
- `supabase/migrations/20250107_002_goals.sql` - goals テーブル
- `lib/services/ai-goal-coaching.ts` - AIコーチングサービス
- `lib/utils/smart-validation.ts` - SMART原則検証

## Rollback
goals テーブル削除、AI対話API削除、目標設定画面削除

## Notes
D-007準拠: 既存UI構造維持。
GPT-5-mini使用料上限: 生徒1人あたり週10対話想定。
GROWモデル: Goal→Reality→Options→Willの順序で対話進行。