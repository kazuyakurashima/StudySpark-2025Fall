# カスタムアバターアップロード機能 実装ドキュメント

## 概要

生徒・保護者・指導者の3ロールすべてで、カスタムアバター画像のアップロード・表示が可能な機能を実装。クロスロール間（生徒↔保護者↔指導者）でのアバター反映にも対応。

## 実装日

2024-11-26

## 機能仕様

### アップロード仕様
- **対応形式**: JPEG, PNG, WebP
- **最大サイズ**: 2MB
- **保存先**: Supabase Storage (`avatars` bucket)
- **ファイル構造**: `avatars/{user_id}/avatar.{ext}`

### 表示優先度
1. `custom_avatar_url` （カスタムアバター）
2. `avatar_id` → プリセットアバター画像
3. フォールバック画像

## 実装ファイル一覧

### 新規作成

| ファイル | 説明 |
|---------|------|
| `app/api/avatar/upload/route.ts` | アバターアップロード/削除API |
| `components/avatar-upload.tsx` | アップロードUIコンポーネント |
| `supabase/migrations/20251126000001_add_custom_avatar_support.sql` | DBスキーマ変更 |
| `supabase/migrations/20251126000002_update_sender_profiles_rpc_add_custom_avatar.sql` | RPC関数更新 |

### 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| `lib/types/profile.ts` | `custom_avatar_url`フィールド追加 |
| `app/actions/profile.ts` | カスタムアバターURL更新処理追加 |
| `app/actions/parent-dashboard.ts` | 子供プロファイルに`custom_avatar_url`追加 |
| `app/actions/coach.ts` | 生徒情報に`custom_avatar_url`追加 |
| `app/actions/encouragement.ts` | プロファイルJOINに`custom_avatar_url`追加 |
| `components/profile/edit-profile-modal.tsx` | アップロードUI統合（タブ切り替え） |
| `components/common/user-profile-header.tsx` | カスタムアバター優先表示 |
| `app/coach/components/coach-home-client.tsx` | カスタムアバター対応 |
| `app/coach/encouragement/page.tsx` | カスタムアバター対応 |
| `app/coach/students/page.tsx` | カスタムアバター対応 |
| `app/coach/student/[id]/page.tsx` | カスタムアバター対応 |
| `lib/hooks/use-coach-student-detail.ts` | `Student`インターフェース更新 |

## データベース変更

### profiles テーブル

```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS custom_avatar_url TEXT;
```

### Storage バケット

```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp']);
```

### RLS ポリシー

- ユーザーは自分のフォルダ（`avatars/{user_id}/`）のみアクセス可能
- 読み取りは全ユーザー可能（public bucket）

### RPC関数更新

`get_sender_profiles` と `get_sender_profile` に `custom_avatar_url` を追加:

```sql
CREATE OR REPLACE FUNCTION public.get_sender_profiles(sender_ids UUID[])
RETURNS TABLE (
  id UUID,
  display_name TEXT,
  avatar_url TEXT,
  avatar_id TEXT,
  nickname TEXT,
  custom_avatar_url TEXT  -- 追加
)
```

## 本番環境への適用手順

### 方法1: Supabase Dashboard（推奨）

1. [Supabase Dashboard](https://supabase.com/dashboard) にログイン
2. プロジェクトを選択
3. **SQL Editor** を開く
4. 以下の順序でSQLを実行:
   1. `20251126000001_add_custom_avatar_support.sql`
   2. `20251126000002_update_sender_profiles_rpc_add_custom_avatar.sql`

### 方法2: Supabase CLI

```bash
npx supabase link --project-ref <project-ref>
npx supabase db push
```

## クロスロール反映

| 変更元 | 反映先 | 対応状況 |
|-------|-------|---------|
| 生徒 | 保護者画面 | ✅ |
| 生徒 | 指導者画面 | ✅ |
| 保護者 | 生徒画面（応援メッセージ） | ✅ |
| 保護者 | 指導者画面 | ✅ |
| 指導者 | 生徒画面（応援メッセージ） | ✅ |

## UI/UXフロー

### プロフィール編集モーダル

1. **プリセットから選択**タブ: 既存のプリセットアバターから選択
2. **画像をアップロード**タブ: カスタム画像をアップロード

アップロード画面では:
- ドラッグ&ドロップ対応
- プレビュー表示
- 削除機能
- ファイルサイズ/形式バリデーション

## トラブルシューティング

### アバターが表示されない

1. ブラウザのキャッシュをクリア
2. `custom_avatar_url`がDBに保存されているか確認
3. Storage bucketにファイルが存在するか確認

### アップロードエラー

1. ファイルサイズが2MB以下か確認
2. ファイル形式がJPEG/PNG/WebPか確認
3. Storage bucketのRLSポリシーを確認

## 関連コミット

```
e9ca536 Merge branch 'feature/custom-avatar-upload' into main
7fdcca4 fix: 指導者画面でカスタムアバターが反映されるよう修正
0c2c5e2 fix: 保護者画面で子供のカスタムアバターが反映されない問題を修正
b417128 feat: カスタムアバターアップロード機能を追加
```
