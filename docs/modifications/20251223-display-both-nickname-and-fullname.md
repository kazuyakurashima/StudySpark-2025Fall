# ニックネーム・本名同時表示の実装

**作成日**: 2025-12-23
**ステータス**: 実装中
**目的**: 生徒の識別性向上、UI/UX一貫性の確保、情報階層の明確化

## 背景

### 現状の問題点
1. **一覧Aと一覧Bで表示形式が異なる** → 認知負荷が高い
2. **`nickname || full_name` ロジック** → どちらか片方しか表示されず、識別性が低い
3. **「ニックネーム:」ラベル** → 冗長で情報密度を下げている
4. **詳細ページの階層が不明確** → 呼称と正式名の区別がつきにくい

### UI/UX設計方針
- **一覧**: 「ニックネーム（本名）」形式で識別性と省スペースを両立
- **詳細**: 2段表示で視覚階層を明確化
- **一貫性**: 全ての一覧で同じフォーマットを採用

---

## 修正対象ファイル

### 1. 一覧A（ダッシュボードカード）
**ファイル**: `app/coach/components/coach-home-client.tsx`
**修正箇所**: 270-272行目付近（要確認）

#### 変更前
```tsx
<p className="font-medium text-slate-900 text-sm truncate w-full">
  {student.nickname || student.full_name}
</p>
```

#### 変更後
```tsx
<p className="font-medium text-slate-900 text-sm leading-tight line-clamp-2 w-full">
  {student.nickname ? (
    <>
      {student.nickname}
      <span className="text-slate-500 font-normal">（{student.full_name}）</span>
    </>
  ) : (
    student.full_name
  )}
</p>
```

#### 改善ポイント
- `truncate` → `line-clamp-2`: 2行まで許容し情報欠損を防ぐ
- `leading-tight`: 行間を詰めて美しく
- 括弧内を `text-slate-500` で視覚的階層化

---

### 2. 一覧B（生徒一覧ページ）
**ファイル**: `app/coach/students/page.tsx`
**修正箇所**: 117-122行目付近（要確認）

#### 変更前
```tsx
<div className="font-semibold text-base md:text-lg truncate">{student.full_name}</div>
{student.nickname && (
  <div className="text-sm text-muted-foreground truncate">
    ニックネーム: {student.nickname}
  </div>
)}
```

#### 変更後
```tsx
<div className="font-semibold text-base md:text-lg leading-tight line-clamp-2">
  {student.nickname ? (
    <>
      {student.nickname}
      <span className="text-slate-500 font-normal">（{student.full_name}）</span>
    </>
  ) : (
    student.full_name
  )}
</div>
```

#### 改善ポイント
- 「ニックネーム:」ラベルを削除（冗長性の排除）
- 一覧Aと同じフォーマットに統一
- `text-muted-foreground` → `text-slate-500` に統一（デザイントークンの一貫性）

---

### 3. 詳細ページ
**ファイル**: `app/coach/student/[id]/student-detail-client.tsx`

#### 修正箇所1: パンくず（110行目付近、要確認）

**変更前:**
```tsx
<span className="text-slate-900 font-medium">
  {student.nickname || student.full_name}
</span>
```

**変更後:**
```tsx
<span className="text-slate-900 font-medium">
  {student.nickname
    ? `${student.nickname}（${student.full_name}）`
    : student.full_name
  }
</span>
```

#### 修正箇所2: ヘッダー（136-142行目付近、要確認）

**変更前:**
```tsx
<div>
  <h1 className="text-base font-semibold leading-tight">
    {student.nickname || student.full_name}
  </h1>
  <p className="text-xs text-slate-500">
    {student.grade}
    {student.course && ` · ${student.course}`}
  </p>
</div>
```

**変更後:**
```tsx
<div>
  <h1 className="text-base font-semibold leading-tight">
    {student.nickname || student.full_name}
  </h1>
  <p className="text-xs text-slate-500">
    {student.nickname && `${student.full_name} · `}
    {student.grade}
    {student.course && ` · ${student.course}`}
  </p>
</div>
```

#### 改善ポイント
- パンくず: 省スペース、識別性高い案1形式
- ヘッダー: 2段表示で視覚階層を明確化
- 呼称（大）→ 正式名・属性（小）の自然な情報フロー

---

## UI/UX改善効果

| 項目 | Before | After | 効果 |
|------|--------|-------|------|
| **一覧の一貫性** | 異なる形式 | 統一形式 | 認知負荷↓ |
| **識別性** | 片方のみ表示 | 両方表示 | 混同防止 |
| **情報密度** | "ニックネーム:"ラベル | 括弧表記 | 洗練↑ |
| **可読性** | `truncate`で切れる | `line-clamp-2`で2行許容 | 情報欠損↓ |
| **視覚階層** | 同一色 | 括弧内を薄色 | スキャナビリティ↑ |
| **詳細ページ** | 1段・片方のみ | 2段・階層明確 | プロ感↑ |
| **色トークン** | バラバラ | `text-slate-500` 統一 | デザイン一貫性↑ |

---

## 表示例

### 一覧A・B
- **ニックネームあり**: `太郎くん（山田太郎）`
- **ニックネームなし**: `山田太郎`

### 詳細ページ - パンくず
- `生徒一覧 › 太郎くん（山田太郎）`

### 詳細ページ - ヘッダー
**ニックネームあり:**
```
太郎くん
山田太郎 · 小学6年生 · Aコース
```

**ニックネームなし:**
```
山田太郎
小学6年生 · Aコース
```

---

## 実装チェックリスト

- [ ] ブランチ作成: `fix/display-both-nickname-and-fullname`
- [ ] 実際の行番号を確認
- [ ] `coach-home-client.tsx` 修正
- [ ] `students/page.tsx` 修正
- [ ] `student-detail-client.tsx` 修正（パンくず）
- [ ] `student-detail-client.tsx` 修正（ヘッダー）
- [ ] ローカル動作確認
  - [ ] 一覧Aで両名表示
  - [ ] 一覧Bで両名表示、「ニックネーム:」削除確認
  - [ ] 詳細ページでパンくず表示
  - [ ] 詳細ページで2段ヘッダー表示
  - [ ] ニックネームなしの生徒でも正常表示
- [ ] コミット & プッシュ
- [ ] mainへマージ
- [ ] 本番デプロイ確認

---

## レビュー観点

### UI/UX
- [ ] 識別性が向上しているか
- [ ] 視覚階層が明確か
- [ ] 一覧全体で一貫性があるか
- [ ] 情報の欠損がないか

### コード品質
- [ ] 条件分岐が適切か（ニックネームなしケース）
- [ ] Tailwind クラスが正しく適用されているか
- [ ] レスポンシブ対応が維持されているか

### 運用
- [ ] 同姓の生徒を区別できるか
- [ ] 長い名前でもレイアウトが崩れないか

---

## 参考リンク
- プロジェクトルール: `/docs/01-Concept.md`
- 指導者機能要件: `/docs/05-Requirements-Coach.md`
