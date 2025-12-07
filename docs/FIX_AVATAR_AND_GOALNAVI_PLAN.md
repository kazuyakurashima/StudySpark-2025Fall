# アバター表示 & ゴールナビ修正計画

**作成日**: 2025-12-06
**ブランチ**: `fix/parent-goal-and-avatar-display` → mainマージ済み
**ステータス**: ✅ 実装完了、動作確認待ち
**最終更新**: 2025-12-07

---

## 概要

保護者画面で発生している2つの問題を修正する。

1. **アバター非表示**: リフレクト機能で指導者・保護者のアバターが表示されない
2. **ゴールナビ非表示**: 保護者画面のゴールナビで内容が見えない

---

## 問題1: アバター非表示

### 原因

`app/student/reflect/encouragement-history.tsx` の `getAvatarUrl` 関数が以下の問題を持つ:

1. **coach1-6 未対応**: 保護者アバター（parent1-6）のみマッピングされており、指導者アバター（coach1-6）がない
2. **フォールバックパス不正**: `/avatars/${avatar}.png` にフォールバックするが、`public/avatars/` ディレクトリは存在しない（正しくは `public/images/`）

### 現状コード（問題箇所）

```typescript
// encouragement-history.tsx:98-124
const getAvatarUrl = (avatar: string | null | undefined) => {
  // ...
  const parentAvatarMap: Record<string, string> = {
    "parent1": "https://...",
    // parent1-6 のみ
  }
  // coach1-6 がない！
  return `/avatars/${avatar}.png`  // 存在しないパス
}
```

### 解決策

`lib/constants/avatars.ts` の既存マッピングを活用した共通ユーティリティを作成:

```typescript
// lib/utils/avatar.ts (新規)
import { STUDENT_AVATARS, PARENT_AVATARS, COACH_AVATARS } from "@/lib/constants/avatars"

const ALL_AVATARS = [...STUDENT_AVATARS, ...PARENT_AVATARS, ...COACH_AVATARS]

export function getAvatarUrl(avatarId: string | null | undefined, role?: string): string {
  // 1. HTTP URLはそのまま返す
  if (avatarId?.startsWith("http")) return avatarId

  // 2. マッピングから検索
  if (avatarId) {
    const found = ALL_AVATARS.find(a => a.id === avatarId)
    if (found) return found.src
  }

  // 3. ロール別フォールバック
  switch (role) {
    case "coach": return COACH_AVATARS[0].src   // /images/coach1.png
    case "parent": return PARENT_AVATARS[0].src // Blob URL (parent1)
    default: return STUDENT_AVATARS[0].src      // Blob URL (student1)
  }
}
```

### 注意事項

- `sender_role` を必ず渡すこと（渡さないと student1 にフォールバック）
- `COACH_AVATARS` の `src` は `/images/coachN.png` 形式（`public/images/` に存在確認済み）

---

## 問題2: ゴールナビ非表示

### 原因の可能性

1. **型の不一致**: `selectedChildId` が string だが、内部処理で number を期待している可能性
2. **RLS/権限問題**: 保護者が生徒のテストデータにアクセスできていない
3. **エラーの隠蔽**: API エラーが発生しても空配列として処理され、原因が見えない

### 現状の型の流れ

```
[page.tsx]
selectedChildId: string  ← useState<string>("")

↓ 呼び出し

[goal.ts actions]
getAvailableTestsForStudent(studentId: string)
  → .eq("id", studentId)  // string比較
```

### 解決策

#### Step 1: 型の確認と統一

`app/actions/goal.ts` の関数シグネチャを確認:

```typescript
// 現状を確認し、必要に応じて以下のように統一
export async function getAvailableTestsForStudent(studentId: string | number) {
  const id = typeof studentId === 'string' ? studentId : String(studentId)
  // または数値に統一: parseInt(studentId, 10)
  // Supabaseカラム型に合わせる
}
```

#### Step 2: エラーログの追加

```typescript
// parent/goal/page.tsx の loadChildData 内
const [testsData, goalsData, resultsData] = await Promise.all([...])

// エラーを明示的にログ
if (testsData.error) console.error('🔍 [ゴールナビ] テスト取得エラー:', testsData.error)
if (goalsData.error) console.error('🔍 [ゴールナビ] 目標取得エラー:', goalsData.error)
if (resultsData.error) console.error('🔍 [ゴールナビ] 結果取得エラー:', resultsData.error)
```

#### Step 3: UI エラー表示

```typescript
const [dataError, setDataError] = useState<string | null>(null)

// エラー時に設定
if (testsData.error || goalsData.error || resultsData.error) {
  setDataError("データの取得に失敗しました")
}

// UI表示
{dataError && (
  <Card className="border-red-200 bg-red-50">
    <CardContent className="py-4 text-center text-red-600">
      {dataError}
    </CardContent>
  </Card>
)}
```

#### Step 4: RLS確認（必要に応じて）

修正後もデータが空の場合、`parent_child_relations` に基づくRLSポリシーを確認:

```sql
-- 確認用クエリ
SELECT * FROM parent_child_relations WHERE parent_id = '<parent_user_id>';
```

---

## 実装タスク

| # | タスク | ファイル | ステータス |
|---|--------|---------|----------|
| 1 | 共通アバターユーティリティ作成 | `lib/utils/avatar.ts` | ✅ 完了 |
| 2 | encouragement-history.tsx 更新 | `app/student/reflect/encouragement-history.tsx` | ✅ 完了 |
| 3 | goal.ts アクション型確認 | `app/actions/goal.ts` | ✅ 完了（型は一貫していた） |
| 4 | parent/goal/page.tsx 更新 | `app/parent/goal/page.tsx` | ✅ 完了 |
| 5 | ビルド確認 | - | ✅ 完了 |
| 6 | mainマージ・プッシュ | - | ✅ 完了 (2025-12-07) |
| 7 | 動作確認 | - | ⏳ 待機中（ユーザーテスト待ち） |

---

## 修正ファイル一覧

| ファイル | 変更種別 | 内容 |
|---------|---------|------|
| `lib/utils/avatar.ts` | 新規作成 | 共通アバターURL解決ユーティリティ |
| `app/student/reflect/encouragement-history.tsx` | 修正 | ローカル関数を共通ユーティリティに置換 |
| `app/parent/goal/page.tsx` | 修正 | エラーログ追加、UI表示、型確認 |
| `app/actions/goal.ts` | 確認/修正 | 引数型の確認・必要に応じて修正 |

---

## テスト項目

### アバター表示

- [ ] 指導者から応援メッセージ送信 → 生徒のリフレクト画面でアバター表示される
- [ ] 保護者から応援メッセージ送信 → 生徒のリフレクト画面でアバター表示される
- [ ] avatar_id が null の場合 → ロール別デフォルトアバター表示

### ゴールナビ

- [ ] 保護者ログイン → ゴールナビで子どものテスト目標が表示される
- [ ] APIエラー時 → エラーメッセージがUIに表示される
- [ ] コンソールにエラーログが出力される

---

## 関連ファイル参照

- `lib/constants/avatars.ts` - アバター定義（STUDENT/PARENT/COACH_AVATARS）
- `public/images/coach1-6.png` - 指導者アバター画像
- `app/actions/parent.ts` - `getChildEncouragementHistory` 関数

---

## 備考

- 他のファイルにも分散したアバターマップが存在する（dashboard-client.tsx等）
- 今回は `encouragement-history.tsx` のみ修正し、他は順次移行予定
- RLS問題が発覚した場合は別途対応
