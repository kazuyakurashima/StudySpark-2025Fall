# 指導者ボトムナビに「算数」タブ追加

## 背景・目的

指導者が算数マスタープリントの結果を頻繁に確認するため、
ボトムナビゲーションからワンタップでアクセスできるようにする。

現状: ホーム / 応援 / 分析（3タブ）
変更後: ホーム / 応援 / 算数 / 分析（4タブ）

---

## 変更対象ファイル

| ファイル | 変更内容 |
|---------|----------|
| `components/coach-bottom-navigation.tsx` | タブ定義追加 + グリッド列数動的化 |

---

## 設計判断（監査フィードバック反映）

### 1. アクティブ判定: matchPath 不要、pathname ベースで統一

`usePathname()` が返す値にはクエリパラメータが含まれない（Next.js の仕様）。
したがって `pathname?.startsWith("/coach/math-master")` は `?grade=5` / `?grade=6` どちらでも正しくマッチする。

**結論**: `matchPath` プロパティは不要。既存の判定ルールをそのまま適用する。
- `home`: 完全一致（`pathname === "/coach"`）
- それ以外: プレフィックス一致（`pathname?.startsWith(tab.href)`）
- math-master の `href` はパス部分のみ `/coach/math-master` にし、クエリは別途付与

### 2. grade 固定遷移の UX

タブタップ時は `?grade=5` で遷移する（初期表示の固定）。
すでに `?grade=6` を閲覧中のユーザーがタブを再タップすると `?grade=5` に戻る。

**許容理由**:
- ページ内に学年切替ボタンがあり、ワンタップで戻せる
- ボトムナビは「ページへのエントリポイント」であり、状態保持は求めない
- 他タブ（ホーム等）も同様に固定URLで遷移している

### 3. タブ増減時の保守性

`grid-cols-4` を固定値ではなく `tabs.length` から動的に決定する。

```typescript
const gridClass = `grid-cols-${tabs.length}` // 3〜5 対応
```

**注意**: Tailwind CSS は動的クラス名を静的解析できないため、
`safelist` に追加するか、完全なクラス名を条件分岐で返す。

実装方式（条件分岐、safelist 不要）:
```typescript
const gridCols: Record<number, string> = {
  3: "grid-cols-3",
  4: "grid-cols-4",
  5: "grid-cols-5",
}
const gridClass = gridCols[tabs.length] ?? "grid-cols-4"
```

### 4. 既存導線の位置づけ

| 導線 | 種別 | 説明 |
|------|------|------|
| ボトムナビ「算数」タブ | **主要導線** | 全ページから直接アクセス |
| 分析ページのカードリンク | **補助導線** | 分析コンテキストからの遷移用。削除不要 |

---

## 実装詳細

### 1. タブ定義の追加

`tabs` 配列に「算数」タブを追加。挿入位置は「応援」と「分析」の間。

```typescript
{
  id: "math-master",
  label: "算数",
  icon: ClipboardList,  // lucide-react（分析ページのリンクカードと統一）
  href: "/coach/math-master",
}
```

リンク先を `href="/coach/math-master?grade=5"` にする（タブ定義の `href` はパス部分のみ、
`Link` の `href` で `?grade=5` を付与）。

**方式**: タブ定義に `linkHref` を追加し、Link の href に使用。アクティブ判定は `href`（パス部分）で行う。

```typescript
{
  id: "math-master",
  label: "算数",
  icon: ClipboardList,
  href: "/coach/math-master",       // アクティブ判定用（パスのみ）
  linkHref: "/coach/math-master?grade=5",  // Link の遷移先
}
```

### 2. グリッド列数の動的化

```typescript
const gridCols: Record<number, string> = {
  3: "grid-cols-3",
  4: "grid-cols-4",
  5: "grid-cols-5",
}
// ...
<div className={`grid ${gridCols[tabs.length] ?? "grid-cols-4"} h-16`}>
```

### 3. アクティブ判定（変更なし）

```typescript
const isActive = tab.id === "home"
  ? pathname === tab.href
  : pathname?.startsWith(tab.href) ?? false
```

`usePathname()` はクエリを含まないため、既存ロジックで正しく動作する。

### 4. Link の href

```typescript
<Link href={tab.linkHref ?? tab.href} ...>
```

### 5. import 追加

```diff
- import { Home, Heart, BarChart3 } from "lucide-react"
+ import { Home, Heart, ClipboardList, BarChart3 } from "lucide-react"
```

### 6. コメント更新

```diff
- * コーチ用ボトムナビゲーション（3項目）
+ * コーチ用ボトムナビゲーション（4項目）
```

追加:
```
 * - 算数: 算数マスタープリントの設問別 ○/× 一覧・正答率
```

---

## 動作確認チェックリスト

- [ ] `/coach` → 「ホーム」タブがアクティブ
- [ ] `/coach/encouragement` → 「応援」タブがアクティブ
- [ ] `/coach/math-master?grade=5` → 「算数」タブがアクティブ
- [ ] `/coach/math-master?grade=6` → 「算数」タブがアクティブ
- [ ] `/coach/analysis` → 「分析」タブがアクティブ
- [ ] モバイル幅（375px）で4タブが崩れない
- [ ] タブラベルが省略されずに表示される
- [ ] 「算数」タブ再タップで `?grade=5` に戻る（意図通り）
