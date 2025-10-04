# Phase 2: 応援機能

**期間:** 2週間
**進捗:** 0% (0/23タスク完了)
**状態:** ⏳ 未着手

---

## 概要

保護者・指導者から生徒への応援メッセージ送信

**成果物:**
- ChatGPT API統合基盤
- 保護者応援機能
- 指導者応援機能
- 生徒応援受信機能

---

## タスク一覧

### P2-1: ChatGPT API統合基盤 ⏳ 未着手

- [ ] OpenAI SDK実装 (`lib/openai/client.ts`)
  - 対応要件: `04-Requirements-Parent.md`, `05-Requirements-Coach.md`
  - 検証: gpt-5-mini接続成功、エラーハンドリング実装

- [ ] 応援メッセージ生成プロンプト設計
  - 対応要件: `04-Requirements-Parent.md`
  - 検証: セルフコンパッション原則、成長マインドセット反映

- [ ] AIキャッシュテーブル実装
  - 対応要件: `04-Requirements-Parent.md`
  - 検証: `ai_cache` テーブルで同一状況の応援文再利用

---

### P2-2: 保護者応援機能実装 ⏳ 未着手

- [ ] `/app/parent/encouragement/page.tsx` 実装
  - 対応要件: `04-Requirements-Parent.md` - 応援機能
  - 検証: 子ども選択、学習状況確認、応援ボタン表示

- [ ] クイック応援 (スタンプ) 実装
  - 対応要件: `04-Requirements-Parent.md`
  - 検証: ❤️/⭐/👍 固定メッセージ送信、送信後の状態更新

- [ ] 応援メッセージ生成UI実装
  - 対応要件: `04-Requirements-Parent.md`
  - 検証: AI生成文3案表示、編集可能、送信成功

- [ ] カスタム応援メッセージ実装
  - 対応要件: `04-Requirements-Parent.md`
  - 検証: 最大200文字入力、送信、バリデーション

- [ ] 応援履歴表示実装
  - 対応要件: `04-Requirements-Parent.md`
  - 検証: 過去の応援メッセージ一覧、日時順表示

- [ ] 応援フィルター・ソート実装
  - 対応要件: `04-Requirements-Parent.md`
  - 検証: 応援有無・科目・期間フィルター、記録日時/学習回/正答率並び替え、5件未満時の期間自動展開
  - 実装方針:
    - テーブル: `encouragement_messages`（`encouragement_logs` ではない）
    - 応援種別フィルター: `support_type` カラム使用（quick/ai/custom）
    - 科目フィルター: `study_logs` テーブルと LEFT JOIN で取得
      ```sql
      SELECT em.*, sl.subject_id, s.name as subject_name
      FROM encouragement_messages em
      LEFT JOIN study_logs sl ON em.related_study_log_id = sl.id
      LEFT JOIN subjects s ON sl.subject_id = s.id
      WHERE em.student_id = $1
        AND (s.name = $2 OR $2 IS NULL);
      ```
    - `related_study_log_id` が NULL の応援: 「全科目」選択時のみ表示
  - 備考: P0-3 での `support_type`/`related_study_log_id` カラム追加が前提

- [ ] 応援カード詳細開閉制御
  - 対応要件: `04-Requirements-Parent.md`
  - 検証: 「全表示/一部表示」ボタン、カード毎の詳細開閉、学習内容表示切替

---

### P2-3: 指導者応援機能実装 ⏳ 未着手

- [ ] `/app/coach/encouragement/page.tsx` 実装
  - 対応要件: `05-Requirements-Coach.md` - 応援機能
  - 検証: 生徒選択、学習状況確認、応援ボタン表示

- [ ] 指導者向けクイック応援 (スタンプ) 実装
  - 対応要件: `05-Requirements-Coach.md`
  - 検証: ワンクリック送信、履歴反映

- [ ] 生徒選択UI実装
  - 対応要件: `05-Requirements-Coach.md`
  - 検証: 担当生徒一覧、フィルター機能、検索機能

- [ ] 応援メッセージ生成・送信実装
  - 対応要件: `05-Requirements-Coach.md`
  - 検証: AI生成文3案表示、編集可能、送信成功

- [ ] 個別メッセージ作成機能実装
  - 対応要件: `05-Requirements-Coach.md`
  - 検証: 自由入力メッセージ送信、バリデーション

- [ ] 応援フィルター・ソート/タブ実装
  - 対応要件: `05-Requirements-Coach.md`
  - 検証: 学年・科目・応援種別フィルター、昇降順切替、指導者/保護者タブ、詳細ボタンで10件ずつ読み込み
  - 実装方針:
    - テーブル: `encouragement_messages`
    - 応援種別フィルター: `support_type` カラム使用（quick/ai/custom）
    - 応援者別フィルター: `sender_role` カラム使用（parent/coach）
    - 科目フィルター: `study_logs` テーブルと LEFT JOIN で取得（保護者応援と同様）
  - 備考: P0-3 での `support_type`/`related_study_log_id` カラム追加が前提

- [ ] 未入力生徒一覧実装
  - 対応要件: `05-Requirements-Coach.md`
  - 検証: フィルター選択（3/5/7日以上）、警告強調（7日以上）、対応ボタン/メモ保存、Asia/Tokyo基準
  - 実装方針:
    - 一覧表示: フィルター選択に応じた生徒を表示（3/5/7日以上未入力）
    - 警告強調: 7日以上未入力の生徒のみ視覚的にハイライト（赤枠・警告アイコン等）
    - デフォルト: 7日以上フィルター（警告対象のみ表示）
    - 自動除外: 生徒が入力再開 → フィルター条件を下回った時点で一覧から除外
  - UI例:
    ```
    フィルター: [7日以上▼]
    🔴 田中太郎（未入力12日）← 警告強調
    🔴 佐藤花子（未入力8日） ← 警告強調
       鈴木次郎（未入力5日） ← 5日フィルター時のみ表示
    ```

---

### P2-4: 生徒応援受信機能実装 ⏳ 未着手

- [ ] ダッシュボード応援表示更新
  - 対応要件: `03-Requirements-Student.md`
  - 検証: 最新3件表示、保護者・指導者別アイコン

- [ ] 応援詳細画面実装
  - 対応要件: `03-Requirements-Student.md`
  - 検証: 全応援メッセージ一覧、既読管理

- [ ] 通知機能実装 (オプション)
  - 対応要件: 通知要件
  - 検証: 新規応援時に `notifications` テーブルへ登録

- [ ] 応援カード詳細要素の同期
  - 対応要件: `03-Requirements-Student.md`
  - 検証: 学習回/科目/正答率/変化表示、詳細開閉と保護者表示との整合
  - 備考: 生徒側UIで保護者・指導者カードと同じデータ構造を共有し、差異がないか確認

---

### P2-5: Phase 2 総合テスト ⏳ 未着手

- [ ] 応援機能E2Eテスト
  - 対応要件: `04-Requirements-Parent.md`, `05-Requirements-Coach.md`
  - 検証: 保護者・指導者 → 応援送信 → 生徒受信
  - 備考: クイック/AI/カスタム全モード、未入力警告→応援→解除までのフローを含める

- [ ] AIキャッシュ動作確認
  - 対応要件: コスト最適化要件
  - 検証: 同一状況で過去の応援文再利用、OpenAI API呼び出し削減

---

## DoD (Definition of Done)

Phase 2完了の条件:

- [ ] 保護者が子どもに応援メッセージを送信できる
- [ ] 指導者が担当生徒に応援メッセージを送信できる
- [ ] 生徒ダッシュボードで応援メッセージを受信・閲覧できる
- [ ] AI生成メッセージがセルフコンパッション・成長マインドセット原則に準拠
- [ ] AIキャッシュでコスト最適化が機能
- [ ] クイック/AI/カスタム応援が全ロールで期待通り動作する
- [ ] 応援フィルター・未入力警告が仕様通りに制御される

---

## リスク要因

| リスク | 発生確率 | 影響度 | 対策 | 状態 |
|--------|---------|--------|------|------|
| OpenAI APIレート制限 | 中 | 高 | キャッシュ戦略、リトライロジック | ⏳ 未対応 |
| AI応援文の品質 | 中 | 中 | プロンプトチューニング、A/Bテスト | ⏳ 未対応 |
| コスト超過 | 低 | 中 | キャッシュ徹底、使用量監視 | ⏳ 未対応 |

---

## 次のマイルストーン

**現在:** ⏳ Phase 1完了待ち
**次:** P2-1 ChatGPT API統合基盤構築

---

**最終更新:** 2025年10月6日 10:45
**更新者:** Claude Code / Codex
