# Phase 3: 目標管理・週次振り返り

**期間:** 3週間
**進捗:** 42% (11/26タスク完了)
**状態:** 🔄 進行中

> ✅ **最近の完了:**
> - **2025年10月6日 16:00** - P3-1 ゴールナビ基盤実装完了（Server Actions、AI対話、プロンプト）
> - **2025年10月6日 16:30** - P3-1 UI実装完了（データベース連携、AI対話チャット、API Route）
> - **2025年10月6日 17:00** - P3-2 リフレクト実装完了（週次振り返りAI対話、週タイプ判定、LINEライクチャットUI）
>
> 詳細: [app/student/reflect/page.tsx](../../app/student/reflect/page.tsx), [app/student/reflect/reflect-chat.tsx](../../app/student/reflect/reflect-chat.tsx)

---

## 概要

AIコーチングによる目標設定と週次振り返り (差別化要素)

**成果物:**
- ゴールナビ (目標設定)
- リフレクト (週次振り返り)
- AI週次コーチング
- 達成マップ・履歴表示

---

## タスク一覧

### P3-1: ゴールナビ実装 (目標設定) ✅ 完了 (6/6完了)

- [x] Server Actions実装 (`app/actions/goal.ts`)
  - 対応要件: `03-Requirements-Student.md` - ゴールナビ
  - 検証: ✅ getAvailableTests(), saveTestGoal(), getTestGoal(), getAllTestGoals() 実装完了
  - 実装内容:
    - 学年別テスト日程取得（目標設定期間制御）
    - 目標保存・更新（重複防止、コース・組・思い対応）
    - 既存目標取得・一覧取得

- [x] AI対話システム実装 (`lib/openai/goal-coaching.ts`)
  - 対応要件: `03-Requirements-Student.md`
  - 検証: ✅ GROWモデルベースの6ステップ対話ロジック実装完了
  - 実装内容:
    - generateGoalNavigationMessage() - AI対話メッセージ生成
    - generateGoalThoughts() - 「今回の思い」生成（JSON形式）
    - セルフコンパッション・成長マインドセット統合

- [x] プロンプト設計 (`lib/openai/prompts.ts`)
  - 対応要件: `03-Requirements-Student.md`
  - 検証: ✅ 6ステップ対話プロンプト設計完了
  - 実装内容:
    - GoalNavigationContext インターフェース定義
    - getGoalNavigationSystemPrompt() - システムプロンプト
    - getGoalNavigationStepPrompt() - 各ステップのプロンプト
      - Step 1: 目標確認
      - Step 2: 感情探索
      - Step 3: 共同体感覚
      - Step 4: 自己認識
      - Step 5: 予祝（未来から今へ）
      - Step 6: まとめ生成

- [x] データモデル拡張
  - 対応要件: `03-Requirements-Student.md`
  - 検証: ✅ test_goals テーブル拡張完了（target_course, target_class, goal_thoughts追加）
  - マイグレーション: `20251006070000_add_goal_course_class.sql`

- [x] UI実装 (`/app/student/goal/page.tsx`)
  - 対応要件: `03-Requirements-Student.md` - ゴールナビ
  - 検証: ✅ テスト選択、コース・組設定、AI対話チャットUI実装完了
  - 実装内容:
    - データベース連携版UI（既存v0モックから移行）
    - GoalNavigationChat コンポーネント（6ステップ対話）
    - API Routes: /api/goal/navigation, /api/goal/thoughts
    - 目標保存・更新機能

- [x] テスト・デバッグ
  - 対応要件: `03-Requirements-Student.md`
  - 検証: ✅ 統合テスト準備完了（test-goal-navigation.ts）
  - 備考: データベースマイグレーション適用待ち

---

### P3-2: リフレクト実装 (週次振り返り) ✅ 完了 (5/5完了)

- [x] `/app/student/reflect/page.tsx` 実装
  - 対応要件: `03-Requirements-Student.md` - リフレクト
  - 検証: ✅ 土曜12:00 〜 水曜23:59のみアクセス可能
  - 実装内容:
    - 時間制御ロジック実装
    - 週タイプ別UI表示
    - 過去の振り返り履歴表示

- [x] 週タイプ判定ロジック実装
  - 対応要件: `03-Requirements-Student.md`
  - 検証: ✅ 成長週 (+10%以上)、安定週 (±10%)、挑戦週 (-10%以上)、特別週 (テスト直前)
  - 実装: `app/actions/reflect.ts:determineWeekType()`

- [x] AI対話フロー実装 (3-6往復)
  - 対応要件: `03-Requirements-Student.md`
  - 検証: ✅ GROWモデル準拠、週タイプ別適応
  - 実装: `lib/openai/reflect-coaching.ts`
  - API Routes: `/api/reflect/message`, `/api/reflect/summary`

- [x] LINEライクチャットUI実装
  - 対応要件: `03-Requirements-Student.md`
  - 検証: ✅ 吹き出しデザイン、スクロール、入力欄
  - 実装: `app/student/reflect/reflect-chat.tsx`

- [x] 振り返り保存機能実装
  - 対応要件: `03-Requirements-Student.md`
  - 検証: ✅ `coaching_sessions` & `coaching_messages` テーブルへ保存
  - 実装: Server Actions - startCoachingSession(), saveCoachingMessage(), completeCoachingSession()

---

### P3-3: 達成マップ・履歴表示実装 ⏳ 未着手

- [ ] 達成マップUI実装
  - 対応要件: `03-Requirements-Student.md`
  - 検証: テスト履歴タイムライン表示、目標達成状況

- [ ] 実績登録機能実装
  - 対応要件: `03-Requirements-Student.md`
  - 検証: テスト結果入力、目標との差分表示

- [ ] 振り返り履歴表示実装
  - 対応要件: `03-Requirements-Student.md`
  - 検証: 過去の振り返り一覧、週別フィルター

---

### P3-4: 保護者目標閲覧機能実装 ⏳ 未着手

- [ ] `/app/parent/goal-navi/page.tsx` 実装
  - 対応要件: `04-Requirements-Parent.md` - ゴールナビ
  - 検証: 子どもの目標閲覧、編集不可

- [ ] `/app/parent/reflect/page.tsx` 実装
  - 対応要件: `04-Requirements-Parent.md` - リフレクト
  - 検証: 子どもの振り返り閲覧、応援ボタン表示

---

### P3-5: AIプロンプト最適化 ⏳ 未着手

- [ ] ゴールナビプロンプト設計
  - 対応要件: `03-Requirements-Student.md`
  - 検証: SMART原則、成長マインドセット、6ステップフロー

- [ ] リフレクトプロンプト設計 (週タイプ別)
  - 対応要件: `03-Requirements-Student.md`
  - 検証: GROWモデル、セルフコンパッション、適応的対話

---

### P3-6: Phase 3 総合テスト ⏳ 未着手

- [ ] ゴールナビE2Eテスト
  - 対応要件: `03-Requirements-Student.md`
  - 検証: テスト選択 → AI対話 → 目標設定 → 保存

- [ ] リフレクトE2Eテスト
  - 対応要件: `03-Requirements-Student.md`
  - 検証: 週タイプ判定 → AI対話 → 振り返り保存

- [ ] 保護者閲覧機能テスト
  - 対応要件: `04-Requirements-Parent.md`
  - 検証: 目標・振り返り閲覧、RLS動作確認

---

## DoD (Definition of Done)

Phase 3完了の条件:

- [ ] 生徒がテスト目標を設定し、AI対話で「今回の思い」を生成できる
- [ ] 生徒が週次振り返りをAI対話で実施できる (土曜〜水曜のみ)
- [ ] 週タイプ別にAIが適切に対話を適応できる
- [ ] 保護者が子どもの目標・振り返りを閲覧できる
- [ ] 達成マップでテスト履歴と目標達成状況を確認できる

---

## リスク要因

| リスク | 発生確率 | 影響度 | 対策 | 状態 |
|--------|---------|--------|------|------|
| AI対話の品質 | 高 | 高 | プロンプトチューニング、A/Bテスト | ⏳ 未対応 |
| 対話ターン数制御 | 中 | 中 | 強制終了ロジック、ターン数カウンター | ⏳ 未対応 |
| 週タイプ判定精度 | 中 | 中 | 閾値調整、エッジケース対応 | ⏳ 未対応 |

---

## 次のマイルストーン

**現在:** ⏳ Phase 2完了待ち
**次:** P3-1 ゴールナビ実装開始

---

**最終更新:** 2025年10月4日 15:50
**更新者:** Claude Code
