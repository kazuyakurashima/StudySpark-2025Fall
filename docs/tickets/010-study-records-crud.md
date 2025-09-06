---
id: T-010
title: Study Records CRUD (Student Learning Input)
status: completed
spec_version: 01@v0.1
decisions_version: DECISIONS@v0.1
depends_on: []
links:
  req: [AC-001, US-001]
  api: [/api/students/{id}/records]
  db: [study_inputs, audit_logs]
  routes: [/student/spark]
---

## Scope
学習記録の入力・更新・削除機能。3レベル（Spark/Flame/Blaze）対応、理解度5段階選択を実装。

## Definition of Done
- ☑ 生徒が学習記録を3レベルで段階的詳細入力可能
- ☑ 理解度を5段階の顔マークで選択可能
- ☑ 同日・同科目・同種類の記録は更新（UPSERT）
- ☑ 入力データの妥当性検証（日付・科目・理解度範囲）
- ☑ audit_logs でデータ変更を追跡

## TODO
- ☑ DB: study_inputs テーブル作成（level_type, understanding_level）
- ☑ API: POST /api/students/{id}/records 実装（UPSERT + RFC7807エラー）
- ☑ API: GET /api/students/{id}/records?date=YYYY-MM-DD 実装
- ☑ UI: /student/spark 記録入力フォーム（3レベル切り替え）
- ☑ UI: 理解度選択コンポーネント（顔マーク5段階）
- ☐ Test: API単体テスト（正常・異常系）
- ☐ Test: フォーム入力E2Eテスト
- ☐ Doc: API仕様書との整合性確認

## Files (予定)
- `app/student/spark/page.tsx` - 記録入力画面
- `app/api/students/[studentId]/records/route.ts` - CRUD API
- `components/features/spark/RecordForm.tsx` - フォーム
- `components/features/spark/UnderstandingSelector.tsx` - 理解度選択
- `supabase/migrations/20250107_001_study_inputs.sql` - テーブル作成
- `lib/schemas/study-record.ts` - Zod validation

## Rollback
study_inputs テーブル削除、APIルート削除、コンポーネント削除

## Notes
D-007準拠: 既存UI構造変更禁止。data-testid 追加のみ許可。
理解度の顔マーク表現は既存アイコンセット使用想定。