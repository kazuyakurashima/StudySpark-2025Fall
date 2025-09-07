# T-010: API統合とデータベース連携

**Based on:** REQ-002, REQ-003, REQ-004, REQ-005  
**Priority:** Must Have  
**User Story:** アプリケーションをSupabaseデータベースと完全に連携させる  
**Assignee:** -  
**Status:** Planning

## 概要

現在のlocalStorage・モックデータベースの実装をSupabaseデータベースとの完全な連携に移行する。

## 要件

### 機能詳細
- 学習記録の完全なCRUD操作
- 目標設定・管理のデータベース連携
- メッセージ機能のリアルタイム実装
- 進捗データの動的取得・表示
- データ同期とオフライン対応

## 技術仕様

### API実装対象
- 学習記録API（/api/learning-records）
- 目標管理API（/api/goals）
- メッセージAPI（/api/messages）
- ユーザー管理API（/api/users）
- 統計・分析API（/api/analytics）

### データベーステーブル
- [x] profiles - ユーザープロフィール
- [x] learning_records - 学習記録
- [x] goals - 目標設定
- [x] messages - メッセージ
- [x] ai_coach_messages - AIコーチメッセージ
- [x] learning_streaks - 連続学習日数
- [x] classes - クラス管理
- [x] class_memberships - クラス所属

## ToDo

### バックエンドAPI実装
- [ ] 学習記録API
  - [ ] POST /api/learning-records - 記録作成
  - [ ] GET /api/learning-records - 記録一覧取得
  - [ ] PUT /api/learning-records/:id - 記録更新
  - [ ] DELETE /api/learning-records/:id - 記録削除
  - [ ] GET /api/learning-records/calendar - カレンダー用データ
- [ ] 目標管理API
  - [ ] POST /api/goals - 目標作成
  - [ ] GET /api/goals/my-goals - 自分の目標取得
  - [ ] PUT /api/goals/:id - 目標更新
  - [ ] GET /api/goals/:id/progress - 達成状況取得
- [ ] メッセージAPI
  - [ ] POST /api/messages - メッセージ送信
  - [ ] GET /api/messages - メッセージ取得
  - [ ] PUT /api/messages/:id/read - 既読更新
- [ ] AIコーチAPI
  - [ ] GET /api/ai-coach/messages - メッセージ取得
  - [ ] POST /api/ai-coach/generate - メッセージ生成
- [ ] 統計・分析API
  - [ ] GET /api/analytics/progress - 進捗統計
  - [ ] GET /api/analytics/streaks - 連続学習統計
  - [ ] GET /api/analytics/class/:id - クラス統計

### フロントエンド データ連携
- [ ] 学習記録機能の移行
  - [ ] 記録入力フォームのAPI連携
  - [ ] 学習履歴カレンダーのリアルタイム更新
  - [ ] 連続学習日数の自動更新
- [ ] 目標設定機能の移行
  - [ ] 目標設定フォームのAPI連携
  - [ ] 目標表示の動的データ対応
  - [ ] 達成状況の自動評価表示
- [ ] メッセージ機能の実装
  - [ ] 応援メッセージ送信機能
  - [ ] メッセージ一覧表示
  - [ ] リアルタイム受信対応
- [ ] ダッシュボードの動的化
  - [ ] 学生ダッシュボードのAPI連携
  - [ ] 保護者ダッシュボードのAPI連携
  - [ ] 指導者ダッシュボードのAPI連携

### データ移行・同期
- [ ] LocalStorageデータの移行
  - [ ] 既存学習記録の移行スクリプト
  - [ ] ユーザー設定の移行
  - [ ] データ整合性の確認
- [ ] リアルタイム同期
  - [ ] Supabase Realtime機能の実装
  - [ ] オプティミスティック更新
  - [ ] 競合解決メカニズム
- [ ] オフライン対応
  - [ ] オフラインデータキャッシュ
  - [ ] 同期待ち状態の管理
  - [ ] 接続復旧時の自動同期

### パフォーマンス最適化
- [ ] クエリ最適化
  - [ ] 必要なデータのみ取得
  - [ ] ページネーション実装
  - [ ] インデックス活用
- [ ] キャッシング戦略
  - [ ] React Query導入
  - [ ] データのローカルキャッシュ
  - [ ] キャッシュ無効化戦略
- [ ] バッチ処理
  - [ ] 複数操作の一括処理
  - [ ] バックグラウンド処理
  - [ ] 重複リクエストの防止

## 受入テスト

### テストケース
1. **API動作テスト**
   - [ ] 全APIエンドポイントの正常動作
   - [ ] エラーハンドリングの確認
   - [ ] データバリデーションの確認
   - [ ] 権限制御の確認

2. **データ整合性テスト**
   - [ ] 学習記録の正確な保存・取得
   - [ ] 目標設定の正確な管理
   - [ ] メッセージの正確な送受信
   - [ ] ユーザー間データの分離確認

3. **パフォーマンステスト**
   - [ ] API応答時間（< 1秒）
   - [ ] 大量データ処理性能
   - [ ] 同時接続負荷テスト
   - [ ] メモリ使用量の確認

## 定義完了（DoD）

- [ ] 全受入テスト通過
- [ ] APIドキュメント作成
- [ ] パフォーマンステスト通過
- [ ] セキュリティレビュー完了
- [ ] データ移行テスト完了
- [ ] E2Eテスト作成・実行

## エラーハンドリング戦略

- ネットワークエラーの適切な処理
- データベースエラーの復旧メカニズム
- ユーザーフレンドリーなエラーメッセージ
- ログ記録と監視体制

## セキュリティ考慮事項

- Row Level Security (RLS) の適切な実装
- APIレート制限
- 入力データのサニタイゼーション
- SQLインジェクション対策

## 関連チケット

- T-003: 認証システム実装（依存）
- T-004: 学生の学習記録機能（連携）
- T-005: 保護者の進捗確認機能（連携）
- T-006: 指導者の生徒管理機能（連携）
- T-007: 目標設定機能（連携）
- T-008: AIコーチ機能（連携）

## 技術スタック

- **バックエンド**: Supabase (PostgreSQL + Auth + Realtime)
- **APIクライアント**: Supabase JavaScript Client
- **状態管理**: React Query (TanStack Query)
- **型安全性**: TypeScript with Supabase generated types

## 備考

- 段階的な移行を実施（機能別に順次切り替え）
- 既存のモックデータを活用した開発継続
- パフォーマンス監視体制の構築が重要