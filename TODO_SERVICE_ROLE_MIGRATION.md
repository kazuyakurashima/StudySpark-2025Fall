# Service Role 削除 TODO リスト

## 完了項目 ✅

### Phase 1: クライアント側のService Role排除
- ✅ `lib/hooks/use-user-profile.tsx` - UserProfileProviderへ初期データprops追加
- ✅ `app/parent/page.tsx` - サーバーコンポーネント化
- ✅ `app/parent/dashboard-client.tsx` - クライアントコンポーネント分離

### Phase 2: 保護者ダッシュボードのService Role完全排除
- ✅ `app/actions/parent-dashboard.ts` - createAdminClient()完全削除（11箇所）
- ✅ RLSポリシー追加:
  - ✅ `students` テーブル（保護者が子供のプロフィールを閲覧可能）
  - ✅ `profiles` テーブル（保護者/指導者が子供/担当生徒のprofilesを閲覧可能）
  - ✅ マスタデータ（study_sessions, subjects, study_content_types, problem_counts）

## 未対応項目（今後のフェーズで対応）

### ファイル: `app/actions/encouragement.ts`
**Service Role使用箇所**:
- 応援メッセージ送信機能
- 保護者/指導者が子供/担当生徒へメッセージを送信

**必要なRLSポリシー**:
- `encouragement_messages` テーブル（既存ポリシーあり、要確認）

**優先度**: 中

---

### ファイル: `app/actions/parent.ts`
**Service Role使用箇所**:
- 保護者関連の各種機能

**必要な対応**:
- 既存RLSポリシーの確認
- 必要に応じてポリシー追加

**優先度**: 中

---

### ファイル: `lib/utils/daily-spark.ts`
**Service Role使用箇所**:
- 日次スパーク処理

**必要な対応**:
- バッチ処理のためService Roleが妥当かどうか検討
- ユーザーコンテキスト不要な処理の可能性あり

**優先度**: 低（バッチ処理のため）

---

## 実装方針

1. **段階的移行**: 機能ごとに順次RLS化
2. **テスト重視**: 各段階でローカル環境での動作確認を徹底
3. **ロールバック準備**: 各マイグレーションにdownスクリプトを用意

## 参考資料

- Phase 1実装: コミット `164f827`
- Phase 2実装: コミット `998f912`
- profiles RLS追加: マイグレーション `20251102000002_add_profiles_rls_for_parents_coaches.sql`
