# Phase 3: 目標管理・週次振り返り

**期間:** 3週間
**進捗:** 77% (20/26タスク完了)
**状態:** 🔄 進行中

> ✅ **最近の完了:**
> - **2025年10月6日 16:00** - P3-1 ゴールナビ基盤実装完了（Server Actions、AI対話、プロンプト）
> - **2025年10月6日 16:30** - P3-1 UI実装完了（データベース連携、AI対話チャット、API Route）
> - **2025年10月6日 17:00** - P3-2 リフレクト実装完了（週次振り返りAI対話、週タイプ判定、LINEライクチャットUI）
> - **2025年10月6日 18:00** - P3-2 自動テスト完了（100%成功: 6/6件）
> - **2025年10月6日 23:15** - 生徒ダッシュボードビルドエラー修正（today変数重複定義）
> - **2025年10月7日 13:40** - スパーク機能UX改善（学習回変更時リセット、部分入力対応、復習週UI、理科社会バグ修正）
> - **2025年10月7日 13:40** - ダッシュボード学習履歴改善（日付範囲拡大、もっと見るボタン、重複表示修正）
> - **2025年10月7日 13:40** - リフレクト週判定ロジック修正（学習回の期間で判定、先週入力データ対応）
> - **2025年10月7日 14:00** - P3-3 達成マップ・履歴実装完了（4タブUI、Server Actions、各コンポーネント）
> - **2025年10月7日 15:00** - P3-5 AIプロンプト最適化完了（ゴールナビ・リフレクトプロンプト要件100%適合確認）
> - **2025年10月7日 16:00** - P3-4 保護者目標・振り返り閲覧機能実装完了（読み取り専用、子ども切り替えタブ）
>
> 詳細: [P3-coaching.md](P3-coaching.md)

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

### P3-3: 達成マップ・履歴表示実装 ✅ 完了 (5/5完了)

**リフレクト画面に4つのタブを実装:**

- [x] Server Actions実装 (`app/actions/reflect.ts`)
  - getAchievementMapData() - 達成マップデータ取得
  - getStudyHistory() - 学習履歴データ取得（フィルター・ソート対応）
  - getEncouragementHistory() - 応援履歴データ取得
  - getCoachingHistory() - コーチング履歴データ取得（詳細版）

- [x] タブUI実装 (`app/student/reflect/page.tsx`)
  - 対応要件: `03-Requirements-Student.md` 1.1達成マップ、1.2学習履歴、1.3応援履歴、1.4コーチング履歴
  - タブ順: 達成マップ → 学習履歴 → 応援履歴 → コーチング履歴 ✅
  - デフォルト表示: 達成マップタブ ✅

- [x] **1.1 達成マップ**実装（GitHub風ヒートマップ）
  - ファイル: `app/student/reflect/achievement-map.tsx`
  - 対応要件: `03-Requirements-Student.md` 1.1達成マップ
  - 科目別タブ切り替え（算数/国語/理科/社会） ✅
  - 学年・コース別表示制御 ✅
  - 正答率による色分け（0%=白、0-50%=薄、50-80%=中、80-100%=濃） ✅
  - 科目別カラー（算数=青、国語=赤、理科=オレンジ、社会=緑） ✅

- [x] **1.2 学習履歴**実装
  - ファイル: `app/student/reflect/study-history.tsx`
  - 対応要件: `03-Requirements-Student.md` 1.2学習履歴表示機能
  - 表示項目: 生徒記録日時、学習回、科目、学習内容、正答率、今日の振り返り、変化 ✅
  - フィルター: 科目（全科目/算数/国語/理科/社会）、期間（1週間/1ヶ月/全て） ✅
  - 並び替え: 記録日時/学習回/正答率（デフォルト: 記録日時降順） ✅

- [x] **1.3 応援履歴**実装
  - ファイル: `app/student/reflect/encouragement-history.tsx`
  - 対応要件: `03-Requirements-Student.md` 1.3応援履歴機能
  - 表示項目: 記録日時、アバター・ニックネーム、応援メッセージ ✅
  - デフォルト非表示: 生徒記録日時、学習回、科目、学習内容、正答率、今日の振り返り、変化 ✅
  - クリックで詳細展開 ✅
  - フィルター: 科目/期間/並び替え/表示（全表示/一部表示） ✅

- [x] **1.4 コーチング履歴**実装
  - ファイル: `app/student/reflect/coaching-history.tsx`
  - 対応要件: `03-Requirements-Student.md` 1.4コーチング履歴機能
  - 表示項目: 記録日時、コーチングサマリー（Goal/Reality/Options/Will）、応援メッセージ ✅
  - フィルター: 期間（1週間/1ヶ月/全て） ✅
  - GROWモデルサマリー表示 ✅

---

### P3-4: 保護者目標閲覧機能実装 ✅ 完了 (2/2完了)

- [x] `/app/parent/goal-navi/page.tsx` 実装
  - 対応要件: `04-Requirements-Parent.md` - ゴールナビ
  - 検証: ✅ 子どもの目標閲覧（読み取り専用）、編集不可
  - 実装内容:
    - 子ども切り替えタブ実装
    - 3タブ構成（目標入力/結果入力/テスト結果）
    - 目標設定済みテストの表示（コース/組/今回の思い）
    - 結果入力は生徒本人のみ可能メッセージ表示
    - テスト結果一覧表示

- [x] `/app/parent/reflect/page.tsx` 実装
  - 対応要件: `04-Requirements-Parent.md` - リフレクト
  - 検証: ✅ 子どもの振り返り閲覧、AIコーチング機能除外
  - 実装内容:
    - 子ども切り替えタブ実装
    - 4タブ構成（達成マップ/学習履歴/応援履歴/コーチング履歴）
    - AIコーチング制限通知表示
    - 生徒用コンポーネント再利用（達成マップ、学習履歴、応援履歴）
    - 振り返りサマリー表示（週タイプ、正答率変化）

- [x] 保護者用Server Actions実装 (`app/actions/parent.ts`)
  - 実装関数:
    - getParentChildren() - 子ども一覧取得
    - getChildTestGoals() - 子どもの目標一覧取得
    - getChildTestGoal() - 特定目標取得
    - getChildReflections() - 振り返り一覧取得
    - getChildReflection() - 特定振り返り詳細取得
    - getChildAvailableTests() - 利用可能テスト取得
    - getChildAchievementMapData() - 達成マップデータ取得
    - getChildStudyHistory() - 学習履歴取得
    - getChildEncouragementHistory() - 応援履歴取得
    - getChildCoachingHistory() - コーチング履歴取得
  - RLSチェック: 保護者IDとstudent.parent_idの一致確認を全関数で実装

---

### P3-5: AIプロンプト最適化 ✅ 完了 (2/2完了)

- [x] ゴールナビプロンプト設計レビュー
  - 対応要件: `03-Requirements-Student.md`
  - 検証: ✅ SMART原則、成長マインドセット、6ステップフロー - 要件100%適合
  - 評価レポート: [P3-5-prompt-optimization-assessment.md](P3-5-prompt-optimization-assessment.md)
  - 実装ファイル: `lib/openai/prompts.ts`, `lib/openai/goal-coaching.ts`

- [x] リフレクトプロンプト設計レビュー (週タイプ別)
  - 対応要件: `03-Requirements-Student.md`
  - 検証: ✅ GROWモデル、セルフコンパッション、適応的対話 - 要件100%適合
  - 評価レポート: [P3-5-prompt-optimization-assessment.md](P3-5-prompt-optimization-assessment.md)
  - 実装ファイル: `lib/openai/reflect-coaching.ts`
  - 備考: 週タイプ別（成長週/安定週/挑戦週/特別週）対話パターン完全実装

---

### P3-6: Phase 3 総合テスト ✅ 完了 (3/3完了)

- [x] ゴールナビE2Eテスト
  - 対応要件: `03-Requirements-Student.md`
  - 検証: テスト選択 → AI対話 → 目標設定 → 保存
  - 実装: `scripts/test/test-goal-navigation.ts`
  - 結果: **5/5テスト PASS (100%)** - 2025-10-07 18:00完了
  - 修正内容: test_types.grade, goal_setting_start_date/end_date対応

- [x] リフレクトE2Eテスト
  - 対応要件: `03-Requirements-Student.md`
  - 検証: 週タイプ判定 → AI対話 → 振り返り保存
  - 実装: `scripts/test/test-reflect-flow.ts`
  - 結果: **6/6テスト PASS (100%)** - 2025-10-07 18:00完了

- [x] 保護者閲覧機能実装修正
  - 対応要件: `04-Requirements-Parent.md`
  - 重大バグ修正: `app/actions/parent.ts`の全10関数が`students.parent_id`（存在しない）を参照
  - 解決策: `parent_child_relations`テーブル経由に全面リファクタリング
  - ヘルパー関数: `verifyParentChildRelation()`でDRY化
  - 結果: RLS正常動作、親子関係チェック完了 - 2025-10-07 18:00完了

---

## DoD (Definition of Done)

Phase 3完了の条件:

- [x] 生徒がテスト目標を設定し、AI対話で「今回の思い」を生成できる ✅
- [x] 生徒が週次振り返りをAI対話で実施できる (土曜〜水曜のみ) ✅
- [x] 週タイプ別にAIが適切に対話を適応できる ✅
- [x] 保護者が子どもの目標・振り返りを閲覧できる ✅
- [x] 達成マップでテスト履歴と目標達成状況を確認できる ✅

**Phase 3: 100%完了** 🎉

---

## リスク要因

| リスク | 発生確率 | 影響度 | 対策 | 状態 |
|--------|---------|--------|------|------|
| AI対話の品質 | 高 | 高 | プロンプトチューニング、A/Bテスト | ✅ P3-5で要件100%適合確認 |
| 対話ターン数制御 | 中 | 中 | 強制終了ロジック、ターン数カウンター | ✅ 3〜6ターン制御実装済み |
| 週タイプ判定精度 | 中 | 中 | 閾値調整、エッジケース対応 | ✅ 4タイプ判定実装・テスト済み |

---

## 次のマイルストーン

**現在:** ✅ **Phase 3完了**
**次:** 📋 Phase 4: 指導者分析機能 または Phase 0残タスク

---

**最終更新:** 2025年10月7日 18:30
**更新者:** Claude Code
