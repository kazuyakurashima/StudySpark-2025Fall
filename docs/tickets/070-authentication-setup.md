---
id: T-070
title: Authentication & Role-based Access Control
status: completed
spec_version: 01@v0.1
decisions_version: DECISIONS@v0.1
depends_on: []
links:
  req: [Security NFR]
  api: [/join, /api/auth/*]
  db: [users, profiles, memberships, invites]
  routes: [/, /join, /setup/*]
---

## Scope
認証システム実装。学生ID/パスワード、保護者・指導者メール認証、RLS権限制御、招待制。

## Definition of Done
- ☑ 多層防御: 認証・アプリケーション・データベース各層
- ☑ パスワード: bcryptハッシュ化必須
- ☑ セッション: JWT/Cookie（httpOnly, secure）
- ☑ 招待制: 指導者は完全招待制（コード/トークン必須）
- ☑ RLS権限制御で家族・組織スコープ分離

## TODO
- ☑ DB: users/profiles/memberships/invites テーブル作成
- ☑ Auth: Supabase Auth設定（メール認証）
- ☑ Auth: 学生カスタム認証（Edge Functions）
- ☑ Auth: RLS ポリシー実装（family/org スコープ）
- ☑ API: 招待コード生成・検証API
- ☑ UI: / ログイン画面（タブ切り替え）
- ☑ UI: /setup/* セットアップフロー
- ☑ Middleware: 認証・認可ガード
- ☑ Security: セッション管理・CSRF対策

## Files (予定)
- `supabase/migrations/20250107_000_auth_tables.sql` - 認証テーブル
- `app/page.tsx` - ログイン画面
- `app/join/page.tsx` - 登録画面
- `app/setup/*/page.tsx` - セットアップフロー
- `middleware.ts` - 認証・認可ミドルウェア
- `lib/auth/supabase.ts` - Supabase Auth設定
- `lib/auth/student-auth.ts` - 学生認証
- `components/auth/LoginForm.tsx` - ログインフォーム

## Rollback
認証テーブル削除、RLS無効化、認証画面削除

## Notes
D-007準拠: 既存ログイン画面構造維持。
セキュリティ: OWASP Top 10 対策、定期的セキュリティ監査実施。