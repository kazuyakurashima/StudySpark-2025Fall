# StudySpark Requirements Definition

**Spec-Version**: 0.1  
**Depends**: DECISIONS.md (TBD), GLOSSARY.md (TBD)  
**Document Status**: Initial Draft  
**Last Updated**: 2025-01-07

---

## 1. Purpose & Success Metrics

### Purpose
中学受験を通じて生徒の可能性を最大限開花させる学習支援Webアプリケーション。主体的学習、保護者の安心、指導者の効率的支援を実現。

### Success Metrics
- **短期KPI**: 週テスト成績向上率（測定可能時に設定）
- **中期KPI**: 月次模試（合不合テスト）での偏差値向上
- **行動KPI**: 学習記録継続率 70%以上（週5日以上の記録）
- **定着KPI**: 理解度「できた」以上の割合 60%以上

---

## 2. Scope

### In Scope
- 小学6年生向け学習記録・管理システム（Spark機能）
- AI活用の個別コーチング機能（Goal/Reflect）
- 保護者向けリアルタイム進捗把握機能
- 指導者向け複数生徒管理ダッシュボード
- 家族単位のアカウント管理システム

### Out of Scope
- 学習コンテンツ（問題集・教材）の提供
- ビデオ通話・リアルタイム指導機能
- 決済・課金システム
- 成績データの外部システム連携

---

## 3. User Stories

### ID: US-001
**As a** 生徒 (student)  
**I want to** 毎日の学習を簡単に記録  
**So that** 継続の手応えを視覚的に確認できる

### ID: US-002
**As a** 保護者 (parent)  
**I want to** 子供の学習状況をリアルタイムで把握  
**So that** 適切なタイミングで応援できる

### ID: US-003
**As a** 指導者 (coach)  
**I want to** 複数生徒の状況を一覧管理  
**So that** 優先度の高い生徒から効率的に支援できる

### ID: US-004
**As a** 生徒  
**I want to** AIコーチと目標設定の対話  
**So that** 自分に合った現実的な目標を立てられる

### ID: US-005
**As a** 生徒  
**I want to** 週末に振り返りを記録  
**So that** 次週の改善点を明確にできる

---

## 4. Acceptance Criteria

### AC: AC-001 (US-001) [MUST]
**WHEN** 生徒が学習記録を入力  
**THEN** 3レベル（Spark/Flame/Blaze）で段階的に詳細入力可能  
**AND** 理解度を5段階の顔マークで選択可能  
**AND** GitHub風ヒートマップで継続状況を可視化

### AC: AC-002 (US-002) [MUST]
**WHEN** 保護者がダッシュボードを開く  
**THEN** 子供の今週の学習状況が要約表示される  
**AND** AI解釈付きで状況を理解できる  
**AND** 推奨アクション（声かけ例）が提示される

### AC: AC-003 (US-003) [MUST]
**WHEN** 指導者がダッシュボードを開く  
**THEN** 担当生徒全員の状況が優先度順に表示  
**AND** アラート（3日未記録等）が目立つ形で通知  
**AND** 個別生徒画面へ1クリックで遷移可能

### AC: AC-004 (US-004) [SHOULD]
**WHEN** 生徒が週目標を設定  
**THEN** AIがGROWモデルで対話的に目標設定支援  
**AND** SMART原則に基づく具体的目標が生成  
**AND** 過去データから現実的な目標値を提案

### AC: AC-005 (US-005) [SHOULD]
**WHEN** 土曜または日曜に振り返り入力  
**THEN** 今週の良かった点・改善点を記録  
**AND** AIが前向きなフィードバックを生成  
**AND** 次週の具体的アドバイスを提示

---

## 5. Non-Functional Requirements

### Performance
- AI応答時間: 最大5秒以内
- ページ読込時間: 3秒以内（3G回線想定）
- 同時接続数: 1000ユーザー以上

### Availability
- 稼働率: 99.5%以上（計画メンテナンス除く）
- データバックアップ: 日次自動実行
- 障害復旧時間目標(RTO): 4時間以内

### Security
- 多層防御: 認証・アプリケーション・データベース各層
- パスワード: bcryptハッシュ化必須
- セッション: JWT/Cookie（httpOnly, secure）
- 招待制: 指導者は完全招待制（コード/トークン必須）

### Usability
- レスポンシブデザイン: スマホ優先、タブレット/PC対応
- アクセシビリティ: WCAG 2.1 Level AA準拠目標
- 多言語: 日本語のみ（初期リリース）

---

## 6. Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| AI応答の不適切な内容 | High | Low | プロンプト設計の徹底、禁止ワード設定 |
| 個人情報漏洩 | High | Low | RLS実装、定期的セキュリティ監査 |
| システム障害による記録消失 | High | Medium | 自動保存機能、ローカルストレージ活用 |
| ユーザー離脱率の高さ | Medium | High | オンボーディング改善、プッシュ通知検討 |

---

## 7. Open Questions

### Q1: 週テスト・模試データの取得方法
**Assumption**: 初期は手動入力。将来的に塾システムとのAPI連携を検討。

### Q2: AI使用料金の上限設定
**Assumption**: 生徒1人あたり月額上限を設定（具体値は運用開始後に決定）。

### Q3: 指導者の招待権限管理
**Assumption**: 初期は管理者のみ招待可能。段階的に権限委譲を検討。

### Q4: データ保持期間
**Assumption**: 卒業後1年間保持。その後は匿名化して統計利用。

---

## 8. Traceability Seeds

### Requirements to System Components Mapping

| Req ID | Component Type | Component ID | Notes |
|--------|---------------|--------------|-------|
| REQ-001 | API | /api/spark/record | 学習記録登録 |
| REQ-001 | DB | study_inputs | 学習記録テーブル |
| REQ-001 | Route | /student/spark | 記録入力画面 |
| REQ-002 | API | /api/parent/dashboard | 保護者ダッシュボード |
| REQ-002 | DB | parent_student_relations | 親子関係 |
| REQ-002 | Route | /parent | 保護者ホーム |
| REQ-003 | API | /api/coach/students | 生徒一覧取得 |
| REQ-003 | DB | memberships | 所属関係 |
| REQ-003 | Route | /coach | 指導者ダッシュボード |
| REQ-004 | API | /api/goal/ai-coaching | AI目標設定 |
| REQ-004 | DB | goals | 目標管理 |
| REQ-004 | Route | /student/goal | ゴールナビ |
| REQ-005 | API | /api/reflect/weekly | 週次振り返り |
| REQ-005 | DB | reflections | 振り返りデータ |
| REQ-005 | Route | /student/reflect | リフレクト画面 |

---

## 9. Dependencies

### Technical Dependencies
- Next.js 14.2.x / React 18.3.x / TypeScript 5.5.x
- Supabase (PostgreSQL + Auth + Edge Functions)
- OpenAI GPT-5-mini API
- Tailwind CSS / Framer Motion

### Business Dependencies
- 塾の教科割・時間割情報（外部提供想定）
- 保護者の協力（生徒アカウント作成・管理）
- 指導者の定期的なフィードバック入力

---

## Appendix A: Glossary References

| Term | Definition | Context |
|------|------------|---------|
| Spark機能 (Spark) | 3段階学習記録システム | 習慣化を促す基本機能 |
| ゴールナビ (Goal) | AI支援目標設定機能 | GROWモデル活用 |
| リフレクト (Reflect) | 週次振り返り機能 | セルフコンパッション促進 |
| 理解度 (Understanding) | 5段階評価（顔マーク） | むずかしかった〜バッチリ理解 |
| 家族単位 (Family) | アカウント管理単位 | 保護者-生徒の紐付け基盤 |

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 0.1 | 2025-01-07 | System | Initial draft from raw spec |