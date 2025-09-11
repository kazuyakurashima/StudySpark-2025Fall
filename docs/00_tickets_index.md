# StudySpark開発チケット一覧

**Based on:** 01_requirements.md  
**Last Updated:** 2025-01-XX  
**Total Tickets:** 10

## チケット概要

| ID | タイトル | 優先度 | ステータス | 概要 |
|------|----------|---------|-----------|------|
| T-003 | [認証システム実装](./03_ticket_auth.md) | Must Have | In Progress | 三者向け認証・ロール管理 |
| T-004 | [学生の学習記録機能](./04_ticket_student_learning_records.md) | Must Have | Planning | 学習記録入力・履歴管理 |
| T-005 | [保護者の進捗確認機能](./05_ticket_parent_monitoring.md) | Must Have | Planning | 子供の学習状況確認・応援メッセージ |
| T-006 | [指導者の生徒管理機能](./06_ticket_coach_management.md) | Should Have | Planning | 複数生徒の管理・分析 |
| T-007 | [目標設定機能](./07_ticket_goal_management.md) | Must Have | Planning | テスト目標設定・達成管理 |
| T-008 | [AIコーチ機能](./08_ticket_ai_coach.md) | Could Have | Planning | 自動メッセージ・モチベーション支援 |
| T-009 | [ダッシュボードUI実装](./09_ticket_dashboard_ui.md) | Must Have | In Progress | ロール別ダッシュボード・レスポンシブ対応 |
| T-010 | [API統合とデータベース連携](./10_ticket_api_integration.md) | Must Have | Planning | Supabaseとの完全連携・モックデータ移行 |
| T-011 | [テスト・品質保証体制](./11_ticket_testing_quality.md) | Must Have | Planning | 包括的テスト戦略・品質管理 |
| T-012 | [デプロイ・運用体制構築](./12_ticket_deployment_ops.md) | Must Have | Planning | プロダクション運用・監視体制 |

## ステータス別サマリー

- **In Progress**: 2チケット（T-003, T-009）
- **Planning**: 8チケット
- **Completed**: 0チケット

## 優先度別サマリー

- **Must Have**: 8チケット
- **Should Have**: 1チケット
- **Could Have**: 1チケット

## 依存関係

\`\`\`
T-003 (認証) 
├── T-004 (学習記録)
├── T-005 (保護者確認)
├── T-006 (指導者管理)
├── T-007 (目標設定)
└── T-008 (AIコーチ)

T-004,005,006,007,008
└── T-010 (API統合)

T-010 (API統合)
├── T-011 (テスト)
└── T-012 (デプロイ・運用)

T-009 (ダッシュボード) ←→ T-004,005,006,007,008
\`\`\`

## 開発フェーズ

### Phase 1: 基盤構築 (Must Have)
- [x] T-003: 認証システム実装（進行中）
- [ ] T-009: ダッシュボードUI実装（進行中）
- [ ] T-010: API統合とデータベース連携

### Phase 2: 核心機能 (Must Have)
- [ ] T-004: 学生の学習記録機能
- [ ] T-005: 保護者の進捗確認機能
- [ ] T-007: 目標設定機能

### Phase 3: 拡張機能 (Should/Could Have)
- [ ] T-006: 指導者の生徒管理機能
- [ ] T-008: AIコーチ機能

### Phase 4: 品質・運用 (Must Have)
- [ ] T-011: テスト・品質保証体制
- [ ] T-012: デプロイ・運用体制構築

## 進捗トラッキング

### T-003: 認証システム実装
- [x] Supabase Auth基盤
- [x] Database Functions/Triggers
- [x] ログイン・新規登録UI
- [ ] 指導者コード管理システム
- [ ] パスワードポリシー強化

### T-009: ダッシュボードUI実装
- [x] 学生ダッシュボード（モックデータ）
- [x] レスポンシブ対応
- [ ] 保護者ダッシュボード
- [ ] 指導者ダッシュボード
- [ ] データベース連携

## User Stories マッピング

| User Story | 関連チケット | 優先度 | 状況 |
|------------|-------------|--------|------|
| US-001: 学生の学習記録 | T-004 | Must Have | Planning |
| US-002: 保護者の進捗確認 | T-005 | Must Have | Planning |
| US-003: 指導者の生徒管理 | T-006 | Should Have | Planning |
| US-004: 目標設定 | T-007 | Must Have | Planning |
| US-005: AIコーチ機能 | T-008 | Could Have | Planning |

## Acceptance Criteria 進捗

### 完了 ✅
- AC-001: ユーザー認証とロール別リダイレクト（T-003）

### 進行中 🔄
- AC-002: 新規登録とプロフィール作成（T-003）
- ダッシュボードUI実装（T-009）

### 未着手 ⏳
- AC-003: 学習記録の科目別保存（T-004）
- AC-004: 理解度5段階評価（T-004）
- AC-005: 保護者の週間サマリー表示（T-005）
- その他のAC項目

## リスク・課題

### High Risk
- データベース設計の複雑性（解決済み）
- ~~認証システムの未実装（解決済み）~~

### Medium Risk
- API統合の複雑性（T-010で対応予定）
- パフォーマンス要件達成（T-011で検証予定）

### Low Risk
- UI/UXの最適化
- 運用体制の構築

## 次回アクション

1. **T-003**: 指導者コード管理システム実装
2. **T-009**: 保護者・指導者ダッシュボード作成
3. **T-010**: API統合の詳細設計開始
4. **T-004**: 学習記録機能の実装着手

## 備考

- 各チケットには詳細なToDoリストと受入テストが含まれています
- 完了したタスクは `[x]` で、未完了は `[ ]` でマークされています
- 依存関係を考慮した段階的開発を推奨します
