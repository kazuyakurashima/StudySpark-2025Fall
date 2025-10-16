# ページヘッダー統一デザイン要件定義

## 1. 概要

**重要**: 本アプリケーションのナビゲーションは**ボトムナビゲーションのみ**です（docs/03-Requirements-Student.md、docs/04-Requirements-Parent.md参照）。

本要件定義は、各ページ上部のヘッダーバナー（タイトル・アイコン・情報表示エリア）の統一デザインを定義します。

### 1.1 デザイン原則

- **一貫性**: 全ページで統一されたビジュアル言語を使用
- **明瞭性**: ページの目的が一目で理解できる
- **上品さ**: 過度な装飾を避け、機能美を追求
- **レスポンシブ**: モバイル・タブレット・デスクトップで最適な表示

---

## 2. 現状の問題点

各ページで異なるヘッダースタイルが使用されており、統一感がありません:

### 学生ページの例

| ページ | 背景スタイル | パディング | 問題 |
|--------|-------------|-----------|------|
| dashboard-client.tsx:1176 | `surface-gradient-primary backdrop-blur-lg border-b border-border/30 p-6` | p-6 | グラデーション + ブラー |
| spark-client.tsx:790 | `bg-white/95 backdrop-blur-lg border-b border-slate-200/60 p-6` | p-6 | 白背景 + ブラー |
| goal/page.tsx | 独自スタイル | 不統一 | 別デザイン |
| reflect/page.tsx:202 | `surface-gradient-primary backdrop-blur-lg border-b border-border/30 p-3 sm:p-4` | p-3/p-4 | パディング不統一 |

### 保護者ページの例

| ページ | 背景スタイル | パディング | 問題 |
|--------|-------------|-----------|------|
| parent/page.tsx:1732 | `surface-gradient-primary backdrop-blur-lg border-b border-border/30 p-6` | p-6 | 学生版と同じ？ |
| parent/spark/page.tsx:250 | `bg-white/95 backdrop-blur-md shadow-sm border-b border-pink-100` | 独自 | ピンク系独自配色 |

**問題:**
- 背景色・グラデーション・透明度がバラバラ
- `backdrop-blur-lg` と `backdrop-blur-md` が混在
- パディング値が不統一（p-6, p-3, p-4, 独自値）
- ボーダー色が各ページで異なる

---

## 3. 統一デザイン仕様

### 3.1 共通ヘッダーコンポーネント

全ページで以下の共通スタイルを使用します:

```tsx
// components/common/PageHeader.tsx
interface PageHeaderProps {
  icon: React.ComponentType<{ className?: string }>
  title: string
  subtitle?: string
  actions?: React.ReactNode // 右側に配置するアクション（フィルターボタンなど）
  variant?: 'student' | 'parent' // 配色バリエーション
}

export function PageHeader({
  icon: Icon,
  title,
  subtitle,
  actions,
  variant = 'student'
}: PageHeaderProps) {
  return (
    <div className="page-header">
      <div className="page-header-container">
        <div className="page-header-content">
          <div className="page-header-title-section">
            <div className="page-header-icon">
              <Icon className="h-6 w-6 text-primary" aria-hidden="true" />
            </div>
            <div>
              <h1 className="page-header-title">{title}</h1>
              {subtitle && <p className="page-header-subtitle">{subtitle}</p>}
            </div>
          </div>
          {actions && <div className="page-header-actions">{actions}</div>}
        </div>
      </div>
    </div>
  )
}
```

### 3.2 統一CSS仕様

```css
/* ページヘッダー統一スタイル */
.page-header {
  /* 背景: 統一グラデーション */
  background: linear-gradient(135deg,
    hsl(var(--primary) / 0.03) 0%,
    hsl(var(--primary) / 0.08) 100%
  );

  /* ブラー効果: 統一 */
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);

  /* ボーダー: 統一 */
  border-bottom: 1px solid hsl(var(--border) / 0.3);

  /* シャドウ: 控えめな統一効果 */
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);

  /* パディング: 統一 */
  padding: 1rem 1rem; /* 16px 上下左右 */
}

/* コンテナ: 最大幅とセンタリング */
.page-header-container {
  max-width: 1280px; /* 80rem */
  margin: 0 auto;
}

/* コンテンツ: フレックスレイアウト */
.page-header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

/* タイトルセクション */
.page-header-title-section {
  display: flex;
  align-items: center;
  gap: 0.75rem; /* 12px */
}

/* アイコンコンテナ */
.page-header-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem; /* 8px */
  background: hsl(var(--primary) / 0.1);
  border-radius: 0.75rem; /* 12px */
}

/* タイトル */
.page-header-title {
  font-size: 1.25rem; /* 20px */
  font-weight: 700;
  line-height: 1.2;
  color: hsl(var(--foreground));
  letter-spacing: -0.01em;
}

/* サブタイトル */
.page-header-subtitle {
  font-size: 0.875rem; /* 14px */
  font-weight: 500;
  color: hsl(var(--muted-foreground));
  margin-top: 0.25rem; /* 4px */
}

/* アクションエリア */
.page-header-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/* レスポンシブ: タブレット */
@media (min-width: 640px) {
  .page-header {
    padding: 1.25rem 1.5rem; /* 20px 24px */
  }

  .page-header-title {
    font-size: 1.5rem; /* 24px */
  }
}

/* レスポンシブ: デスクトップ */
@media (min-width: 1024px) {
  .page-header {
    padding: 1.5rem 2rem; /* 24px 32px */
  }
}

/* モバイル: タイトルセクションを縦方向に */
@media (max-width: 480px) {
  .page-header-content {
    flex-direction: column;
    align-items: flex-start;
  }

  .page-header-title {
    font-size: 1.125rem; /* 18px */
  }
}
```

### 3.3 Tailwind版（実装用）

```tsx
<div className="bg-gradient-to-br from-primary/[0.03] to-primary/[0.08] backdrop-blur-xl border-b border-border/30 shadow-sm px-4 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-6">
  <div className="max-w-screen-xl mx-auto">
    <div className="flex items-center justify-between gap-4 max-sm:flex-col max-sm:items-start">
      {/* タイトルセクション */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center p-2 bg-primary/10 rounded-xl">
          <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-primary" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground tracking-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm font-medium text-muted-foreground mt-1">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* アクションエリア */}
      {actions && (
        <div className="flex items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  </div>
</div>
```

---

## 4. 実装方針

### 4.1 段階的移行

1. **Phase 1**: PageHeader コンポーネント作成
2. **Phase 2**: 学生ページから順次移行
3. **Phase 3**: 保護者ページを移行
4. **Phase 4**: 旧スタイルの削除とクリーンアップ

### 4.2 移行対象ページ

**学生ページ:**
- [ ] `app/student/dashboard-client.tsx` (1176行目付近)
- [ ] `app/student/spark/spark-client.tsx` (790行目付近)
- [ ] `app/student/goal/page.tsx`
- [ ] `app/student/reflect/page.tsx` (202行目付近)

**保護者ページ:**
- [ ] `app/parent/page.tsx` (1732行目付近)
- [ ] `app/parent/spark/page.tsx` (250行目付近)
- [ ] `app/parent/goal/page.tsx`
- [ ] `app/parent/reflect/page.tsx`
- [ ] `app/parent/encouragement/page.tsx`
- [ ] `app/parent/settings/page.tsx`

---

## 5. 配色バリエーション（将来拡張）

現在は統一デザインで十分ですが、将来的にページごとの識別性を高める場合:

```css
/* 学生: ブルー系（デフォルト） */
.page-header[data-variant="student"] {
  background: linear-gradient(135deg,
    hsl(217 91% 60% / 0.03) 0%,
    hsl(217 91% 60% / 0.08) 100%
  );
}

/* 保護者: ローズ系 */
.page-header[data-variant="parent"] {
  background: linear-gradient(135deg,
    hsl(330 81% 60% / 0.03) 0%,
    hsl(330 81% 60% / 0.08) 100%
  );
}

/* 指導者: パープル系（将来実装） */
.page-header[data-variant="coach"] {
  background: linear-gradient(135deg,
    hsl(262 83% 58% / 0.03) 0%,
    hsl(262 83% 58% / 0.08) 100%
  );
}
```

---

## 6. アクセシビリティ要件

- `<h1>` タグで明確なページタイトルを提供
- アイコンには `aria-hidden="true"` を設定（装飾的なため）
- 色コントラスト比: WCAG 2.1 AA（4.5:1）以上を確保
- サブタイトルは補足情報として適切にマークアップ

---

## 7. 既存コードとの互換性

UserProfileHeader は引き続き使用します（プロフィール情報表示のため）。

**レイアウト構成:**
```
<UserProfileHeader />          ← プロフィール情報（アバター・ニックネーム）
<div className="main-content">
  <PageHeader />               ← 各ページのタイトルバナー（統一デザイン）
  {/* ページコンテンツ */}
</div>
<BottomNavigation />           ← ボトムナビゲーション（ページ遷移）
```

**余白調整:**
- UserProfileHeader の高さ: 約 56px (モバイル) / 64px (デスクトップ)
- PageHeader: 統一パディング使用
- main-content: `pt-14 md:pt-16` でUserProfileHeaderの分だけ余白確保

---

## 8. 参考資料

- [Material Design - Top App Bar](https://m3.material.io/components/top-app-bar)
- [Apple Human Interface Guidelines - Navigation Bars](https://developer.apple.com/design/human-interface-guidelines/navigation-bars)
- [WCAG 2.1 - Headings and Labels](https://www.w3.org/WAI/WCAG21/Understanding/headings-and-labels.html)

---

## 改訂履歴

| バージョン | 日付 | 変更内容 |
|----------|------|---------|
| 1.0 | 2025-10-17 | 初版作成。トップナビゲーション削除、ページヘッダー統一デザイン定義 |
