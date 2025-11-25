# SWR実装ガイド

このドキュメントはStudySparkにおけるSWR（Stale-While-Revalidate）の実装状況と設計方針をまとめたものです。

## 概要

SWRは、データフェッチングのためのReact Hooksライブラリです。キャッシュ、再検証、フォーカス追跡、ネットワーク復帰時の再取得などの機能を提供します。

## 実装状況

### 完了済み

| ページ | API Route | SWRフック | 実装日 |
|--------|-----------|-----------|--------|
| 生徒ダッシュボード | `/api/student/dashboard` | `useStudentDashboard` | 2024-11 |
| 保護者ダッシュボード | `/api/parent/dashboard` | `useParentDashboard` | 2024-11 |
| 指導者ダッシュボード | `/api/coach/dashboard` | `useCoachDashboard` | 2024-11 |
| 指導者生徒詳細 | `/api/coach/student/[id]` | `useCoachStudentDetail` | 2024-11-26 |
| 指導者生徒一覧 | `/api/coach/students` | `useCoachStudents` | 2024-11-26 |
| 指導者応援ページ | `/api/coach/encouragement` | `useCoachStudyLogs`, `useCoachInactiveStudents` | 2024-11-26 |

### 未実装（優先度低）

| ページ | 理由 |
|--------|------|
| 指導者分析ページ | 使用頻度低、AI分析は都度生成でキャッシュ効果薄い |
| 指導者リフレクト閲覧 | 閲覧のみ、更新頻度低い |
| 管理者ページ | 内部運用のみ |

## ファイル構成

```
lib/hooks/
├── use-student-dashboard.ts    # 生徒ダッシュボード用
├── use-parent-dashboard.ts     # 保護者ダッシュボード用
├── use-coach-dashboard.ts      # 指導者ダッシュボード用
├── use-coach-student-detail.ts # 指導者生徒詳細用
├── use-coach-students.ts       # 指導者生徒一覧用
├── use-coach-encouragement.ts  # 指導者応援ページ用
└── use-user-profile.tsx        # ユーザープロフィール用

app/api/
├── student/dashboard/route.ts
├── parent/dashboard/route.ts
├── coach/
│   ├── dashboard/route.ts
│   ├── student/[id]/route.ts
│   ├── students/route.ts
│   └── encouragement/route.ts
```

## 共通SWR設定

すべてのフックで以下の設定を使用しています：

```typescript
const SWR_OPTIONS = {
  dedupingInterval: 5000,        // 5秒間は重複リクエストを排除
  revalidateOnFocus: true,       // タブ復帰時に再取得
  focusThrottleInterval: 30000,  // 30秒間はフォーカス復帰時の再取得を抑制
  revalidateOnReconnect: true,   // ネットワーク復帰時に再取得
  errorRetryCount: 3,            // エラー時の自動リトライ（3回まで）
  revalidateIfStale: true,       // 初回レンダリング時にデータがない場合のみ再取得
}
```

## 設計パターン

### 1. API Route + Server Action

API RouteはServer Actionをラップして、SWRのfetcher用エンドポイントを提供します。

```typescript
// app/api/coach/students/route.ts
export async function GET() {
  const result = await getCoachStudents()  // Server Action
  return NextResponse.json({
    students: result?.students || [],
    fetchedAt: Date.now(),
  })
}
```

### 2. フックの返却値

すべてのフックは以下の形式で返却します：

```typescript
return {
  data,           // 生データ
  error,          // エラー
  isLoading,      // 初回ロード中
  isValidating,   // 再検証中（リフレッシュボタン用）
  mutate,         // 手動再取得関数
  // 便利なアクセサ
  students,       // 整形済みデータ
  studentsError,  // エラーメッセージ
  isStale,        // 5分経過でtrue
}
```

### 3. フィルター対応（応援ページ）

フィルター条件をSWRキーに含めることで、条件ごとにキャッシュを分離します：

```typescript
// URLにフィルター条件を含める
const url = `/api/coach/encouragement?type=logs&grade=${filters.grade}&subject=${filters.subject}`

// フィルターが変わるとキーが変わり、新しいキャッシュが使われる
const { data } = useSWR(url, fetcher)
```

### 4. SSRデータとの統合

SSRで取得した初期データをfallbackDataとして使用できます：

```typescript
const { data } = useSWR(url, fetcher, {
  fallbackData: initialData,
  revalidateOnMount: !initialData,  // fallbackがあれば初回再取得しない
})
```

## 使用方法

### 基本的な使用

```typescript
import { useCoachStudents } from "@/lib/hooks/use-coach-students"

function StudentsPage() {
  const { students, isLoading, isValidating, mutate } = useCoachStudents()

  if (isLoading) return <Loader />

  return (
    <div>
      <RefreshButton onClick={() => mutate()} disabled={isValidating} />
      {students.map(student => <StudentCard key={student.id} student={student} />)}
    </div>
  )
}
```

### アクション後の再取得

```typescript
const handleSendMessage = async () => {
  const result = await sendMessage(studentId, message)
  if (result.success) {
    mutate()  // SWRキャッシュを再取得
  }
}
```

### 手動再取得（他のコンポーネントから）

```typescript
import { revalidateCoachStudents } from "@/lib/hooks/use-coach-students"

// どこからでも再取得をトリガー可能
await revalidateCoachStudents()
```

## リフレッシュボタンの実装

すべてのSWR対応ページにリフレッシュボタンを追加しています：

```tsx
<Button
  variant="ghost"
  size="icon"
  onClick={() => mutate()}
  disabled={isValidating}
  title="データを更新"
>
  <RefreshCw className={`h-5 w-5 ${isValidating ? "animate-spin" : ""}`} />
</Button>
```

## 今後の拡張

### グローバル設定の検討

現在は各フックに同じ設定を書いていますが、以下のようなグローバル設定も検討できます：

```typescript
// lib/swr-config.tsx
import { SWRConfig } from 'swr'

export function SWRProvider({ children }) {
  return (
    <SWRConfig value={{
      dedupingInterval: 5000,
      revalidateOnFocus: true,
      // ...
    }}>
      {children}
    </SWRConfig>
  )
}
```

### プリフェッチ

ナビゲーションホバー時にデータを先読みする機能：

```typescript
import { prefetchCoachDashboard } from "@/lib/hooks/use-coach-dashboard"

// リンクホバー時にプリフェッチ
<Link href="/coach" onMouseEnter={() => prefetchCoachDashboard()}>
  ダッシュボード
</Link>
```

## 参考リンク

- [SWR公式ドキュメント](https://swr.vercel.app/ja)
- [Next.js Data Fetching](https://nextjs.org/docs/app/building-your-application/data-fetching)
