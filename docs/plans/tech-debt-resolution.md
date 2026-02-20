# 技術的負債解消: 深刻度順の修正計画

## Context

客観評価レポートおよび Codex セキュリティレビューで指摘された技術的負債を、深刻度が高いものから順に解消する。
講師への展開を控えており、本番運用の安定性確保が目的。

**現状の問題:**
- API Route 10本中 10本が認証ゼロ（任意のユーザーがAPIを直接叩ける）
- CRON_SECRET 未設定時にバッチ処理が認証バイパスされる
- console.log に機密情報（会話履歴、学習データ、メールアドレス）が出力されている
- ビルド時に ESLint / TypeScript エラーを無視している（バグが本番に入るリスク）
- React エラーバウンダリがゼロ（コンポーネントエラーで白画面になる）
- 不要ファイル 3,080行が残存

---

## 修正対象一覧（深刻度順）

| # | 優先度 | 対象 | 変更ファイル | 完了条件 |
|---|--------|------|-------------|---------|
| 1 | P0 | reset-student-password API Route 廃止 | `app/api/auth/reset-student-password/route.ts` → `app/actions/auth.ts` | API Route 削除済み、Server Action で保護者/指導者/管理者の正常系+異常系テスト通過 |
| 2 | P0 | API Route 認証追加（7本） | 7本の API Route + `lib/api/auth.ts` | 全7本で未認証→401、不正ロール→403 を確認 |
| 3 | P0 | 登録エンドポイント最低限防御 | `app/api/auth/parent-signup/route.ts`, `parent-register/route.ts` | 不正 Origin→403、監査ログ出力を確認 |
| 4 | P0 | CRON_SECRET バイパス修正 | `app/api/cron/weekly-analysis/route.ts` | 未設定→500、不正トークン→401 を確認 |
| 5 | P0 | 機密情報ログ削減 | `lib/openai/reflect-coaching.ts`, `lib/openai/coach-message.ts`, `app/actions/auth.ts` | `JSON.stringify` による機密出力が 0 件 |
| 6 | P1 | ビルド安全性の復元 | `next.config.mjs` | `ignoreDuringBuilds: false` + `ignoreBuildErrors: false` に変更済み |
| 7 | P1 | TypeScript エラー修正 | ビルドで検出される全ファイル | `tsc --noEmit` + `lint` + `build` がエラーゼロ |
| 8 | P1 | error.tsx 追加（白画面防止） | `app/error.tsx` + ロール別 4ファイル | 本番モードで error.tsx が表示されることを確認 |
| 9 | P2 | 不要ファイル削除 | `app/student/goal/page.old.tsx`, `app/student/reflect/page.old.tsx` | import 参照ゼロを確認後に削除完了 |

**スコープ外（今回は対応しない）:**
- レート制限（Gemini 移行予定のため、移行後に再評価）
- console.log 一括削除（287箇所、影響範囲が広く別タスク。P0-5 は機密情報のみ対象）
- Sentry 再有効化（v8 App Router 移行が必要、別タスク）

---

## P0-1. reset-student-password API Route 廃止

**問題:** `app/api/auth/reset-student-password/route.ts` は認証ゼロで、任意の生徒パスワードをリセットできる **Critical** な脆弱性。

さらに、このエンドポイントは保護者UI（`parent/settings/student-password-reset-form.tsx`）からも利用されている。
単純に coach/admin ロール限定にすると **保護者のパスワードリセット機能が壊れる**。

**現状のフロー:**
```
保護者UI → Server Action (resetStudentPassword) → fetch("/api/auth/reset-student-password") → Service Role Key
```

**修正方針: API Route を廃止し、Server Action 内で完結する。**

Server Action はセッション Cookie で認証済みのため、公開 API Route を経由する必要がない。
攻撃面を完全に排除できる。

**修正後のフロー:**
```
保護者UI → Server Action (resetStudentPassword) → createAdminClient() → auth.admin.updateUserById()
```

**変更内容:**

### `app/actions/auth.ts`

**ID マッピング（重要）:**
- `studentId` パラメータ = `students.id`（BIGSERIAL）— フォームから渡される値
- `parent_child_relations.parent_id` = `parents.id`（BIGINT）— `auth.users.id` ではない
- `parent_child_relations.student_id` = `students.id`（BIGINT）
- `auth.admin.updateUserById()` は `auth.users.id`（UUID）を要求 — `students.user_id` を渡す

```diff
  // resetStudentPassword 関数内
+ import { createAdminClient } from "@/lib/supabase/server"
+
  export async function resetStudentPassword(studentId: string, newPassword: string) {
+   // 認証チェック: ログイン中のユーザーを取得
+   const supabase = await createClient()
+   const { data: { user } } = await supabase.auth.getUser()
+   if (!user) return { error: "認証が必要です" }
+
+   // ロール確認
+   const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
+   if (!profile || !["parent", "coach", "admin"].includes(profile.role)) {
+     return { error: "権限がありません" }
+   }
+
+   // 親の場合: 親子関係を検証（parents.id 経由）
+   if (profile.role === "parent") {
+     const { data: parentRecord } = await supabase
+       .from("parents")
+       .select("id")
+       .eq("user_id", user.id)  // auth.users.id → parents.id に変換
+       .single()
+     if (!parentRecord) return { error: "保護者情報が見つかりません" }
+
+     const { data: relation } = await supabase
+       .from("parent_child_relations")
+       .select("id")
+       .eq("parent_id", parentRecord.id)  // parents.id を使用
+       .eq("student_id", studentId)        // students.id を使用
+       .single()
+     if (!relation) return { error: "権限がありません" }
+   }
+
+   // students.id → students.user_id（UUID）に変換
+   const { data: student } = await supabase
+     .from("students")
+     .select("user_id")
+     .eq("id", studentId)
+     .single()
+   if (!student) return { error: "生徒が見つかりません" }
+
+   // パスワード更新（Service Role Key、auth.users.id で実行）
+   const adminClient = createAdminClient()
-   const response = await fetch("/api/auth/reset-student-password", { ... })
+   const { error } = await adminClient.auth.admin.updateUserById(student.user_id, { password: newPassword })
+   if (error) return { error: `パスワード更新エラー: ${error.message}` }
+   return { success: true }
  }
```

### `app/api/auth/reset-student-password/route.ts`

**削除する。** 呼び出し元がなくなるため不要。

---

## P0-2. API Route 認証追加（7本）

**対象:**

| API Route | メソッド | リスク | 修正内容 |
|-----------|---------|--------|----------|
| `app/api/coach/encouragement-suggestions/route.ts` | POST | High: OpenAI API 消費 | coach ロール認証必須 |
| `app/api/goal/navigation/route.ts` | POST | High: OpenAI API 消費 | student ロール認証必須 |
| `app/api/goal/simple-navigation/route.ts` | POST | High: OpenAI API 消費 | student ロール認証必須 |
| `app/api/goal/simple-thoughts/route.ts` | POST | High: OpenAI API 消費 | student ロール認証必須 |
| `app/api/goal/thoughts/route.ts` | POST | High: OpenAI API 消費 | student ロール認証必須 |
| `app/api/reflect/message/route.ts` | POST | High: OpenAI API 消費 | student ロール認証必須 |
| `app/api/reflect/summary/route.ts` | POST | High: OpenAI API 消費 | student ロール認証必須 |

**実装パターン:**

共通の認証ヘルパーを作成し、各 Route で呼び出す。
API Route は `lib/supabase/route.ts`（Route Handler 専用クライアント）を使用する。

```typescript
// lib/api/auth.ts
import { createClient } from "@/lib/supabase/route"
import { NextResponse } from "next/server"

type Role = "student" | "parent" | "coach" | "admin"

interface AuthSuccess {
  user: { id: string; email?: string }
  profile: { role: Role }
}

interface AuthError {
  error: NextResponse
}

export async function requireAuth(allowedRoles: Role[]): Promise<AuthSuccess | AuthError> {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (!profile || !allowedRoles.includes(profile.role as Role)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) }
  }

  return { user, profile: { role: profile.role as Role } }
}
```

**注意:**
- `lib/supabase/route.ts` は Route Handler 専用（cookie 設定に try-catch なし）
- `lib/supabase/server.ts` は Server Components / Server Actions 用（cookie 設定に try-catch あり）
- API Route では `route.ts` を使うのがプロジェクト標準

**各 Route の修正例:**

```typescript
import { requireAuth } from "@/lib/api/auth"

export async function POST(request: NextRequest) {
  const auth = await requireAuth(["student"])
  if ("error" in auth) return auth.error

  // 既存ロジック
}
```

**方針:**
- `any` 型は追加しない。`requireAuth` の戻り値は `AuthSuccess | AuthError` で型安全に定義
- 認証失敗は 401（未認証）/ 403（権限不足）を返す

---

## P0-3. 登録エンドポイント最低限防御

**問題:** `parent-signup` / `parent-register` は認証不要の登録エンドポイントだが、
内部で **Service Role Key** を使用してアカウントを作成している。
Zod バリデーションのみでは、大量アカウント作成による abuse を防げない。

**対象:**
- `app/api/auth/parent-signup/route.ts` — Service Role Key で子アカウント作成
- `app/api/auth/parent-register/route.ts` — `createAdminClient()` で親＋子アカウント一括作成

**最低限の防御（レート制限・CAPTCHA は別タスク）:**

```typescript
// 各登録エンドポイントの先頭に追加
const origin = request.headers.get("origin")
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL

if (!siteUrl) {
  console.error("NEXT_PUBLIC_SITE_URL is not configured")
  return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
}

// 厳密な Origin 比較（startsWith ではなく完全一致）
try {
  const allowedOrigin = new URL(siteUrl).origin
  if (!origin || new URL(origin).origin !== allowedOrigin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
} catch {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 })
}
```

**注意:**
- `startsWith` は `https://evil-site.com/https://myapp.com` で騙される可能性があるため不可
- `NEXT_PUBLIC_SUPABASE_URL` は Supabase の URL であり、アプリの Origin ではないため使用不可
- `NEXT_PUBLIC_SITE_URL` のみを許可 Origin とする

**追加: 監査ログ**

```typescript
console.log(`[Registration] parent-register: origin=${origin} children=${children.length}`)
```

**設計判断:** レート制限・CAPTCHA は Gemini 移行後に再評価（ユーザー決定）。
ただし Service Role Key を露出させる以上、Origin 検証と監査ログは P0 で必須とする。

---

## P0-4. CRON_SECRET バイパス修正

**問題:** `weekly-analysis/route.ts` L28 の条件分岐:

```typescript
if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
```

`CRON_SECRET` 環境変数が未設定の場合、`cronSecret` は `undefined` → 条件が `false` → 認証チェックがスキップされる。
つまり、**環境変数の設定漏れだけで誰でもバッチ処理を実行可能**。

**ファイル:** `app/api/cron/weekly-analysis/route.ts`

**変更内容:**
```diff
- if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
-   return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
- }
+ if (!cronSecret) {
+   console.error("CRON_SECRET is not configured")
+   return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
+ }
+ if (authHeader !== `Bearer ${cronSecret}`) {
+   return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
+ }
```

**検証:** `CRON_SECRET` が本番環境（Vercel）に設定されていることを確認する。

---

## P0-5. 機密情報ログ削減

**問題:** `console.log` で以下の機密情報が出力されている:

| ファイル | 行 | 出力内容 | リスク |
|---------|-----|---------|--------|
| `lib/openai/reflect-coaching.ts` | L48 | `JSON.stringify(context.conversationHistory)` | 生徒との AI 対話全文 |
| `lib/openai/reflect-coaching.ts` | L46-47 | System Prompt + User Prompt 全文 | プロンプト漏洩 |
| `lib/openai/coach-message.ts` | L155-162 | `JSON.stringify({...context.recentLogs, weeklyProgress})` | 生徒の学習履歴・進捗データ |
| `app/actions/auth.ts` | L62 | `authData.user.email + profile.role` | メールアドレス + ロール |

**変更方針:**
- 機密データの `JSON.stringify` を削除し、安全なサマリーに置換
- 開発デバッグ用の詳細ログは `NODE_ENV === "development"` でガードするか削除

**変更内容:**

### `lib/openai/reflect-coaching.ts`

```diff
  // L31-40: コンテキストログ → 安全なサマリーのみ
  console.log("=== Reflect Message Generation Started (v2.0) ===")
- console.log("Context:", JSON.stringify({
-   studentName: context.studentName,
-   weekType: context.weekType,
-   ...
- }, null, 2))
+ console.log(`Reflect: turn=${context.turnNumber} weekType=${context.weekType}`)

  // L46-48: プロンプト・会話履歴ログ → 削除
- console.log("System Prompt:", systemPrompt)
- console.log("User Prompt:", userPrompt)
- console.log("Conversation History:", JSON.stringify(context.conversationHistory, null, 2))
```

### `lib/openai/coach-message.ts`

```diff
  // L155-162: 学習データ全文ログ → 件数のみ
- console.log("🔍 [AI Coach] Generating prompt with context:", JSON.stringify({
-   studentName: context.studentName,
-   grade: context.grade,
-   recentLogsCount: totalRecentLogs,
-   recentLogs: context.recentLogs,
-   weeklyProgressCount: context.weeklyProgress?.length || 0,
-   weeklyProgress: context.weeklyProgress
- }, null, 2))
+ console.log(`🔍 [AI Coach] Generating prompt: logs=${totalRecentLogs} progress=${context.weeklyProgress?.length || 0}`)
```

### `app/actions/auth.ts`

```diff
  // L62: メールアドレスログ → ロールのみ
- console.log("[Login] Success for user:", authData.user.email, "role:", profile.role)
+ console.log(`[Login] Success: role=${profile.role}`)
```

---

## P1-6. ビルド安全性の復元

**ファイル:** `next.config.mjs`

**変更内容:**
```diff
- eslint: {
-   ignoreDuringBuilds: true,
- },
- typescript: {
-   ignoreBuildErrors: true,
- },
+ eslint: {
+   ignoreDuringBuilds: false,
+ },
+ typescript: {
+   ignoreBuildErrors: false,
+ },
```

**リスク:** ビルドが通らなくなる可能性が高い。P1-7 で全エラーを修正する。

---

## P1-7. TypeScript / ESLint エラー修正

**手順:**
1. `next.config.mjs` を変更後、`pnpm exec tsc --noEmit` を実行（ビルドより高速）
2. 型エラーを全て修正
3. `pnpm run lint` を実行し ESLint エラーを修正
4. `pnpm run build` で最終確認

**修正サイクル:** `tsc --noEmit` → `lint` → `build` の順で分割し、フィードバックループを短縮する。

**方針:**
- `any` → 具体的な型に置換（可能な範囲で）
- どうしても型が不明な箇所は `unknown` + 型ガード
- 新たに `any` を追加しない（P0-2 の認証ヘルパー含む）
- ESLint のルール自体が不合理な場合は `.eslintrc` で該当ルールを調整（抑制ではなく設定変更）

---

## P1-8. error.tsx 追加

**追加ファイル:**
- `app/error.tsx` — アプリ全体のフォールバック
- `app/student/error.tsx` — 生徒ページ用
- `app/parent/error.tsx` — 保護者ページ用
- `app/coach/error.tsx` — 指導者ページ用
- `app/admin/error.tsx` — 管理者ページ用

**実装パターン:**
```tsx
"use client"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <h2 className="text-lg font-semibold mb-2">エラーが発生しました</h2>
      <p className="text-sm text-muted-foreground mb-4">
        しばらくしてからもう一度お試しください
      </p>
      <button
        onClick={reset}
        className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm"
      >
        もう一度試す
      </button>
    </div>
  )
}
```

**既存資産:** `app/not-found.tsx` が存在（13行）。スタイルを統一する。
**既存資産:** `lib/monitoring/notify.ts` に構造化ログユーティリティが存在。error.tsx から `console.error` は使うが、notify は使わない（クライアントコンポーネントのため）。

---

## P2-9. 不要ファイル削除

**削除対象:**
- `app/student/goal/page.old.tsx`（1,652行）
- `app/student/reflect/page.old.tsx`（1,428行）

**確認:** 他ファイルからの import 参照がないことを確認してから削除。

---

## 実装順序

| Step | 作業 | 優先度 | 依存 |
|------|------|--------|------|
| 1 | `reset-student-password` API Route 廃止 → Server Action 内製化 | P0 | なし |
| 2 | 認証ヘルパー `lib/api/auth.ts` 作成 | P0 | なし |
| 3 | API Route 7本に認証追加 | P0 | Step 2 |
| 4 | 登録エンドポイント Origin 検証 + 監査ログ追加 | P0 | なし |
| 5 | CRON_SECRET バイパス修正 | P0 | なし |
| 6 | 機密情報ログ削減（3ファイル） | P0 | なし |
| 7 | `error.tsx` 5ファイル追加 | P1 | なし |
| 8 | `next.config.mjs` 変更 | P1 | なし |
| 9 | `pnpm exec tsc --noEmit` → 型エラー修正 | P1 | Step 8 |
| 10 | `pnpm run lint` → ESLint エラー修正 | P1 | Step 9 |
| 11 | `pnpm run build` → 成功確認 | P1 | Step 10 |
| 12 | `.old.tsx` ファイル削除 | P2 | なし |

Step 1-8, 12 は並行可能（Step 3 のみ Step 2 に依存）。Step 9 以降は逐次実行。

---

## 検証方法

### P0 検証
1. `/api/auth/reset-student-password` が 404 になること（削除済み）
2. Server Action 経由のパスワードリセットが正常動作すること（保護者・指導者・管理者）
3. 親子関係のない保護者がリセットを試みると拒否されること
4. 認証なしで API Route にリクエスト → 401 が返ること
5. 不正ロールで API Route にリクエスト → 403 が返ること
6. 登録エンドポイントに不正 Origin でリクエスト → 403 が返ること
7. `CRON_SECRET` 未設定で cron API にリクエスト → 500 が返ること
8. 機密情報ログが出力されないこと（`pnpm run dev` で動作確認）

### P1 検証
9. `pnpm exec tsc --noEmit` が **エラーゼロ** で成功すること
10. `pnpm run lint` が **エラーゼロ** で成功すること
11. `pnpm run build` が **エラーゼロ** で成功すること
12. 開発サーバーで各ロール（生徒/保護者/指導者/管理者）のページが正常表示されること
13. `pnpm build && pnpm start` で本番モード起動し、各ロール別導線が正常表示されること
14. 本番モードで意図的にエラーを起こした場合に error.tsx が表示されること

---

## 設計判断の記録

| 判断 | 決定 | 理由 |
|------|------|------|
| reset-student-password | API Route 廃止 → Server Action 内製化 | 保護者UIも利用中。公開APIではなくServer Actionで認証+親子関係検証が安全 |
| 認証ヘルパーの Supabase クライアント | `lib/supabase/route.ts` を使用 | API Route 専用クライアント（cookie try-catch なし）がプロジェクト標準 |
| 登録エンドポイント | Origin 検証 + 監査ログ（P0）、レート制限は後日 | Service Role Key 操作を含むため最低限の防御は必須。レート制限は Gemini 移行後 |
| レート制限 | スキップ | Gemini 移行予定（$10/月 API）。移行後に再評価 |
| `any` 型追加 | 禁止 | 既存の型安全性を維持、認証ヘルパーも型定義する |
| console.log 一括削除 | 別タスク | 287箇所は影響範囲が広い。P0-5 で機密情報のみ先行対応 |
| P1 エラー修正順序 | `tsc --noEmit` → `lint` → `build` | ビルドより高速なフィードバックループ |
