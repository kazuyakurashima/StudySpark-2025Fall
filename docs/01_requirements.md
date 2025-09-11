# 01_requirements.md

**Spec-Version:** 0.1  
**Depends:** DECISIONS.md, GLOSSARY.md

## 1. Purpose & Success Metrics

**Purpose:**  
学習管理と進捗追跡を支援する教育アプリケーションを提供し、学生・保護者・指導者の三者間での学習情報共有を円滑化する。

**Success Metrics:**  
- ユーザー登録完了率: 目標値未定
- 学習記録入力頻度: 週3回以上
- 保護者アクティブ率: 月次ログイン50%以上

## 2. Scope

### In Scope
- 三者（学生/保護者/指導者）向けユーザーインターフェース
- 学習記録の入力と閲覧機能
- 目標設定と進捗管理
- 基本的な認証とロール管理
- モバイル対応レスポンシブUI

### Out of Scope
- 外部学習管理システムとの連携
- リアルタイム通信機能
- 決済・課金機能
- 詳細な成績分析AI
- ネイティブモバイルアプリ

## 3. User Stories

### ID: US-001 - 学生の学習記録
**As a** 学生 (用語)  
**I want to** 日々の学習内容を記録する  
**So that** 自分の学習進捗を確認できる

### ID: US-002 - 保護者の進捗確認
**As a** 保護者 (用語)  
**I want to** 子供の学習状況を確認する  
**So that** 適切なサポートを提供できる

### ID: US-003 - 指導者の生徒管理
**As a** 指導者 (用語)  
**I want to** 複数生徒の学習状況を一覧管理する  
**So that** 効率的な指導計画を立てられる

### ID: US-004 - 目標設定
**As a** 学生  
**I want to** テスト目標を設定する  
**So that** 計画的に学習を進められる

### ID: US-005 - AIコーチ機能
**As a** 学生  
**I want to** AIコーチからフィードバックを受ける  
**So that** モチベーションを維持できる

## 4. Acceptance Criteria

### US-001: 学習記録
**AC-001:** WHEN 学生が学習記録を入力 THEN 科目別に保存される  
**AC-002:** WHEN 理解度を選択 THEN 5段階評価で記録される  
**Priority:** Must Have (MoSCoW)

### US-002: 保護者確認
**AC-003:** WHEN 保護者がログイン THEN 子供の週間サマリーが表示される  
**AC-004:** WHEN 応援メッセージ送信 THEN 学生画面に表示される  
**Priority:** Must Have

### US-003: 指導者管理
**AC-005:** WHEN 指導者がログイン THEN 全生徒リストが表示される  
**AC-006:** WHEN 生徒選択 THEN 個別の学習詳細が確認できる  
**Priority:** Should Have

### US-004: 目標設定
**AC-007:** WHEN テスト目標設定 THEN コース・組・科目別スコアが登録される  
**AC-008:** WHEN 目標期日到達 THEN 達成状況が自動評価される  
**Priority:** Must Have

### US-005: AIコーチ
**AC-009:** WHEN 学生がログイン THEN 時間帯別挨拶メッセージが表示される  
**AC-010:** WHEN 連続学習日数達成 THEN 励ましメッセージが生成される  
**Priority:** Could Have

## 5. Non-Functional Requirements

### Performance
- ページ読み込み: 3秒以内
- API応答時間: 1秒以内
- 同時接続数: 100ユーザー

### Availability
- 稼働率目標: 99%（月次）
- メンテナンス窓: 深夜2-4時

### Security
- パスワード: 8文字以上必須
- セッション管理: 30分無操作でタイムアウト
- HTTPS通信必須

### Operations
- バックアップ: 日次実行
- ログ保持期間: 30日間
- エラー監視: 要実装

## 6. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| API統合遅延 | High | localStorage使用で機能提供継続 |
| 認証システム未実装 | High | モックユーザーIDで暫定運用 |
| パフォーマンス劣化 | Medium | CDN活用とコード最適化 |

## 7. Open Questions

### Q1: 外部テストデータ連携仕様
**Status:** Pending  
**Assumption:** 手動入力のみで初期リリース

### Q2: 友達機能のプライバシー設定
**Status:** Pending  
**Assumption:** 同一クラス内のみ相互閲覧可能

### Q3: AIコーチの応答ロジック詳細
**Status:** Pending  
**Assumption:** 定型メッセージのローテーション表示

## 8. Traceability Seeds

| Requirement | API Endpoint | Database Table | UI Route |
|-------------|--------------|----------------|----------|
| REQ-001: ユーザー認証 | /api/auth/login | users | / |
| REQ-002: 学習記録保存 | /api/records | learning_records | /student/spark |
| REQ-003: 目標管理 | /api/goals | goals | /*/goal |
| REQ-004: メッセージ送信 | /api/messages | messages | /parent/reflect |
| REQ-005: 進捗表示 | /api/progress | - | /*/dashboard |

## 9. Dependencies

### External Dependencies
- Next.js 14.2.x
- React 18.3.x
- TypeScript 5.5.x
- Tailwind CSS v4
- shadcn/ui

### Internal Dependencies
- DECISIONS.md: アーキテクチャ決定事項
- GLOSSARY.md: 用語定義
- 00_raw_spec.md: 元仕様書

## 10. Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 0.1 | 2024-01-xx | System | Initial requirements from raw spec |
