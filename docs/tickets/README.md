# StudySpark Development Tickets

## Overview
このディレクトリには、docs配下の仕様書から生成された開発チケットが含まれています。
各チケットはMust優先度のAcceptance Criteriaを縦スライス化して作成されています。

## Ticket Status Management

### Status Values
- `todo` - 未着手
- `in-progress` - 実装中  
- `done` - 完了
- `blocked` - ブロック中（依存関係・外部要因）

### Status Update Process
1. チケットファイルのヘッダー `status:` フィールドを更新
2. Definition of Done の ☐ を ☒ に変更（完了項目）
3. TODO の ☐ を ☒ に変更（完了項目）
4. Notes に進捗・ブロッカー・決定事項を追記

## Ticket List & Dependencies

| ID | Title | Status | Depends On | Links |
|----|-------|---------|------------|-------|
| T-010 | Study Records CRUD (Student Learning Input) | todo | - | REQ: AC-001, US-001 |
| T-020 | Learning Calendar Heatmap (GitHub-style Visualization) | todo | T-010 | REQ: AC-001, US-001 |
| T-030 | Parent Dashboard with AI Interpretation | todo | T-010 | REQ: AC-002, US-002 |
| T-040 | Coach Dashboard with Priority Alerts | todo | T-010 | REQ: AC-003, US-003 |
| T-050 | AI Goal Coaching with GROW Model | todo | T-010 | REQ: AC-004, US-004 |
| T-060 | AI Weekly Reflection with Feedback | todo | T-010 | REQ: AC-005, US-005 |
| T-070 | Authentication & Role-based Access Control | todo | - | REQ: Security NFR |

## Implementation Priority

### Phase 1: Foundation (週1-2)
1. **T-070** - Authentication & Role-based Access Control
2. **T-010** - Study Records CRUD (Student Learning Input)

### Phase 2: Core Features (週3-4)  
3. **T-020** - Learning Calendar Heatmap
4. **T-030** - Parent Dashboard with AI Interpretation
5. **T-040** - Coach Dashboard with Priority Alerts

### Phase 3: AI Features (週5-6)
6. **T-050** - AI Goal Coaching with GROW Model
7. **T-060** - AI Weekly Reflection with Feedback

## Database Migrations Applied

| Migration | Status | Description |
|-----------|--------|-------------|
| `20250107_000_auth_tables.sql` | ✅ Ready | Core authentication, users, profiles, memberships |
| `20250107_001_study_inputs.sql` | ✅ Ready | Learning records with RLS policies |
| `20250107_002_goals.sql` | ✅ Ready | SMART goals with AI coaching session tracking |
| `20250107_003_reflections.sql` | ✅ Ready | Weekly reflections with AI feedback support |

## Development Rules

### D-007: UI Lock Compliance
- 既存のUI構造・DOM・クラスを変更禁止
- data-testid の追加のみ許可
- UIに手を入れる必要がある場合は実装中止し、`docs/drafts/ui_change_proposal.md` で提案

### Traceability Requirements
- 各チケット実装時に links セクションの整合性確認必須
- REQ-xxx ↔ API-xxx ↔ DB-xxx の対応関係を維持
- 仕様変更は差分ファイルで提案、仕様書直接編集禁止

### Testing Standards
- 各ACに対応する検証観点でテスト作成
- ユニット・統合・E2Eテストの3層構造
- AIフィードバック品質テスト（内容適切性・応答時間）

## Progress Tracking Commands

```bash
# 全チケット状況確認
grep -r "status:" docs/tickets/*.md

# 特定チケットの進捗確認  
grep -A 10 "Definition of Done" docs/tickets/010-*.md

# 完了チケット数確認
grep -r "status: done" docs/tickets/*.md | wc -l

# ブロック中チケット確認
grep -r "status: blocked" docs/tickets/*.md
```

## AI Model Configuration

### GPT-5-mini Usage Limits
- 目標設定コーチング: 生徒1人あたり週10対話
- 振り返りフィードバック: 生徒1人あたり週1回
- 保護者解釈: 保護者1人あたり月100リクエスト
- 応答時間制限: 5秒以内

### Prompt Design Guidelines
- セルフコンパッション促進（自己批判抑制）
- GROW モデル準拠（Goal→Reality→Options→Will）
- SMART 原則チェック（具体性・測定可能性・達成可能性・関連性・期限）
- 禁止ワード設定（プレッシャー表現・他者比較・ネガティブ指摘）

---

## Quick Reference

### Ticket Template
```markdown
---
id: T-XXX
title: Title Here
status: todo | in-progress | done | blocked
spec_version: 01@v0.1
decisions_version: DECISIONS@v0.1
depends_on: [T-000]
links:
  req: [REQ-001]
  api: [/api/endpoint]
  db: [table_name]
  routes: [/route/path]
---
```

### Status Update Example
```bash
# チケット T-010 を開始
sed -i 's/status: todo/status: in-progress/' docs/tickets/010-*.md

# 完了項目をチェック
sed -i 's/☐ DB: study_inputs/☒ DB: study_inputs/' docs/tickets/010-*.md
```