# UX改善: タブUIの統一実装計画

## 📋 概要

生徒・保護者画面のふりかえりページのタブUIを統一し、モバイルファーストで洗練された体験を提供する。

**実装日**: 2025-12-24

---

## 🎯 設計方針（確定）

### 1. タブ値の後方互換性
- **方針**: Option A - 両方受け入れ→内部は `assessment` に統一
- **理由**: 既存ブックマーク/リンクを壊さない、長期的に設計が綺麗

### 2. タブ名と語彙の統一
- **方針**: 「ふりかえり」に統一
- **タブ名**: 「ふりかえり履歴」
- **モバイル短縮**: 「ふり返り」（4文字、送り仮名付きで既存語彙に沿う）
- **注意文**: 「ふりかえり機能はお子様本人のみご利用いただけます」
- **理由**: ユーザー体験語彙として理解されやすい、ページタイトルとの整合性、語彙の分断を避ける

### 3. 保護者向け注意文
- **方針**: 改善案C（コンパクト＋アイコン）
- **理由**: 読む負担が少なく、視認性が高い

### 4. タブ順序（生徒・保護者共通）
```
1. 達成マップ (achievement)
2. テスト結果 (assessment)
3. 学習履歴 (history)
4. 応援履歴 (encouragement)
5. ふりかえり履歴 (coaching)
```

---

## 📝 タスク一覧

### ✅ タスク10: 生徒画面のタブUI統一実装

**対象ファイル**: `app/student/reflect/page.tsx`

#### 10-1: アイコンimportの追加

**場所**: line 12付近の既存importに追加

```typescript
import {
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
  Target,          // 達成マップ用
  ClipboardCheck,  // テスト結果用
  BookOpen,        // 学習履歴用
  Heart,           // 応援履歴用
  MessageSquare,   // ふりかえり履歴用
} from "lucide-react"
```

#### 10-2: タブ値の型定義と後方互換性の実装

**場所**: lines 61-66

**修正前**:
```typescript
const tabParam = searchParams.get("tab")
const initialTab = (tabParam && ["achievement", "assessment", "history", "encouragement", "coaching"].includes(tabParam))
  ? (tabParam as "achievement" | "assessment" | "history" | "encouragement" | "coaching")
  : "achievement"

const [activeTab, setActiveTab] = useState<"achievement" | "assessment" | "history" | "encouragement" | "coaching">(initialTab)
```

**修正後**:
```typescript
const tabParam = searchParams.get("tab")

// 後方互換: assessment-history を assessment に正規化
const normalizedTab = tabParam === "assessment-history" ? "assessment" : tabParam

const initialTab = (normalizedTab && ["achievement", "assessment", "history", "encouragement", "coaching"].includes(normalizedTab))
  ? (normalizedTab as "achievement" | "assessment" | "history" | "encouragement" | "coaching")
  : "achievement"

const [activeTab, setActiveTab] = useState<"achievement" | "assessment" | "history" | "encouragement" | "coaching">(initialTab)
```

**理由**: 既存の `?tab=assessment-history` リンクを壊さない後方互換を確保

#### 10-3: TabsListの更新（アイコン＋モバイル最適化）

**場所**: lines 271-280

**修正前**:
```typescript
<TabsList className="grid w-full grid-cols-5">
  <TabsTrigger value="achievement">達成マップ</TabsTrigger>
  <TabsTrigger value="history">学習履歴</TabsTrigger>
  <TabsTrigger value="encouragement">応援履歴</TabsTrigger>
  <TabsTrigger value="assessment">テスト結果</TabsTrigger>
  <TabsTrigger value="coaching">コーチング履歴</TabsTrigger>
</TabsList>
```

**修正後**:
```typescript
<TabsList className="grid w-full grid-cols-5">
  <TabsTrigger value="achievement" className="flex items-center gap-1 text-xs sm:text-sm min-h-[44px] px-2 sm:px-3">
    <Target className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" aria-hidden="true" />
    <span className="hidden sm:inline">達成マップ</span>
    <span className="sm:hidden leading-tight">達成</span>
  </TabsTrigger>
  <TabsTrigger value="assessment" className="flex items-center gap-1 text-xs sm:text-sm min-h-[44px] px-2 sm:px-3">
    <ClipboardCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" aria-hidden="true" />
    <span className="hidden sm:inline">テスト結果</span>
    <span className="sm:hidden leading-tight">テスト</span>
  </TabsTrigger>
  <TabsTrigger value="history" className="flex items-center gap-1 text-xs sm:text-sm min-h-[44px] px-2 sm:px-3">
    <BookOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" aria-hidden="true" />
    <span className="hidden sm:inline">学習履歴</span>
    <span className="sm:hidden leading-tight">学習</span>
  </TabsTrigger>
  <TabsTrigger value="encouragement" className="flex items-center gap-1 text-xs sm:text-sm min-h-[44px] px-2 sm:px-3">
    <Heart className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" aria-hidden="true" />
    <span className="hidden sm:inline">応援履歴</span>
    <span className="sm:hidden leading-tight">応援</span>
  </TabsTrigger>
  <TabsTrigger value="coaching" className="flex items-center gap-1 text-xs sm:text-sm min-h-[44px] px-2 sm:px-3">
    <MessageSquare className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" aria-hidden="true" />
    <span className="hidden sm:inline">ふりかえり履歴</span>
    <span className="sm:hidden leading-tight whitespace-nowrap">ふり返り</span>
  </TabsTrigger>
</TabsList>
```

**改善ポイント**:
- ✅ 全タブにアイコン追加（視覚的識別性向上）
- ✅ `aria-hidden="true"` でアクセシビリティ対応（装飾アイコンとして明示）
- ✅ `min-h-[44px]` (44px) でモバイルタップ領域を確保
- ✅ `px-2 sm:px-3` で横パディング調整、テキスト折返し防止
- ✅ `text-xs sm:text-sm` で320px幅対策
- ✅ `leading-tight` で行間調整
- ✅ `shrink-0` でアイコンの縮小防止
- ✅ `whitespace-nowrap` で「ふり返り」の改行防止
- ✅ モバイル短縮ラベルを統一（達成/テスト/学習/応援/ふり返り）

#### 10-4: TabsContentの順序調整

**場所**: lines 282以降

**修正内容**: TabsContentの順序を新しいタブ順序に合わせて並び替え

```typescript
{/* 達成マップタブ */}
<TabsContent value="achievement" className="space-y-4">
  <AchievementMap ... />
</TabsContent>

{/* テスト結果タブ */}
<TabsContent value="assessment" className="space-y-4">
  <AssessmentHistory />
</TabsContent>

{/* 学習履歴タブ */}
<TabsContent value="history" className="space-y-4">
  <StudyHistory viewerRole="student" />
</TabsContent>

{/* 応援履歴タブ */}
<TabsContent value="encouragement" className="space-y-4">
  <EncouragementHistory viewerRole="student" />
</TabsContent>

{/* ふりかえり履歴タブ */}
<TabsContent value="coaching" className="space-y-4">
  {/* 既存のコーチング対話UI */}
</TabsContent>
```

**完了条件**:
- [ ] アイコンimportを追加
- [ ] タブ値の後方互換ロジックを実装
- [ ] TabsListを更新（アイコン＋モバイル最適化）
- [ ] TabsContentの順序を調整
- [ ] TypeScriptのビルドエラーがないことを確認

---

### ✅ タスク11: 保護者画面のタブUI統一実装

**対象ファイル**: `app/parent/reflect/page.tsx`

#### 11-1: アイコンimportの追加

**場所**: line 21-31付近（既存のimportに追加）

```typescript
import {
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
  Eye,
  Users,
  Bot,
  Lock,
  MessageCircle,
  Target,          // 達成マップ用
  ClipboardCheck,  // テスト結果用
  BookOpen,        // 学習履歴用
  Heart,           // 応援履歴用
  MessageSquare,   // ふりかえり履歴用
} from "lucide-react"
```

#### 11-2: タブ値の型定義と後方互換性の実装

**場所**: lines 58-72

**修正前**:
```typescript
const tabParam = searchParams.get("tab")
const initialTab = (tabParam && ["map", "history", "encouragement", "coaching", "assessment-history"].includes(tabParam))
  ? (tabParam as "map" | "history" | "encouragement" | "coaching" | "assessment-history")
  : "map"

// ... 中略 ...

const [activeTab, setActiveTab] = useState<"map" | "history" | "encouragement" | "coaching" | "assessment-history">(initialTab)
```

**修正後**:
```typescript
const tabParam = searchParams.get("tab")

// 後方互換: 旧タブ値を新タブ値に正規化
const normalizeTabValue = (tab: string | null): string | null => {
  if (!tab) return null
  if (tab === "map") return "achievement"
  if (tab === "assessment-history") return "assessment"
  return tab
}

const normalizedTab = normalizeTabValue(tabParam)

const initialTab = (normalizedTab && ["achievement", "assessment", "history", "encouragement", "coaching"].includes(normalizedTab))
  ? (normalizedTab as "achievement" | "assessment" | "history" | "encouragement" | "coaching")
  : "achievement"

// ... 中略 ...

const [activeTab, setActiveTab] = useState<"achievement" | "assessment" | "history" | "encouragement" | "coaching">(initialTab)
```

**理由**:
- 保護者画面は `map` → `achievement` の変更も含むため、より包括的な正規化
- 既存の `?tab=map` や `?tab=assessment-history` リンクを壊さない

#### 11-3: TabsListの更新（生徒画面と完全統一）

**場所**: lines 253-262

**修正前**:
```typescript
<TabsList className="grid w-full grid-cols-5">
  <TabsTrigger value="map">達成マップ</TabsTrigger>
  <TabsTrigger value="history">学習履歴</TabsTrigger>
  <TabsTrigger value="encouragement">応援履歴</TabsTrigger>
  <TabsTrigger value="coaching">コーチング履歴</TabsTrigger>
  <TabsTrigger value="assessment-history">
    <span className="hidden sm:inline">テスト結果</span>
    <span className="sm:hidden">テスト</span>
  </TabsTrigger>
</TabsList>
```

**修正後**:
```typescript
<TabsList className="grid w-full grid-cols-5">
  <TabsTrigger value="achievement" className="flex items-center gap-1 text-xs sm:text-sm min-h-[44px] px-2 sm:px-3">
    <Target className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" aria-hidden="true" />
    <span className="hidden sm:inline">達成マップ</span>
    <span className="sm:hidden leading-tight">達成</span>
  </TabsTrigger>
  <TabsTrigger value="assessment" className="flex items-center gap-1 text-xs sm:text-sm min-h-[44px] px-2 sm:px-3">
    <ClipboardCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" aria-hidden="true" />
    <span className="hidden sm:inline">テスト結果</span>
    <span className="sm:hidden leading-tight">テスト</span>
  </TabsTrigger>
  <TabsTrigger value="history" className="flex items-center gap-1 text-xs sm:text-sm min-h-[44px] px-2 sm:px-3">
    <BookOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" aria-hidden="true" />
    <span className="hidden sm:inline">学習履歴</span>
    <span className="sm:hidden leading-tight">学習</span>
  </TabsTrigger>
  <TabsTrigger value="encouragement" className="flex items-center gap-1 text-xs sm:text-sm min-h-[44px] px-2 sm:px-3">
    <Heart className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" aria-hidden="true" />
    <span className="hidden sm:inline">応援履歴</span>
    <span className="sm:hidden leading-tight">応援</span>
  </TabsTrigger>
  <TabsTrigger value="coaching" className="flex items-center gap-1 text-xs sm:text-sm min-h-[44px] px-2 sm:px-3">
    <MessageSquare className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" aria-hidden="true" />
    <span className="hidden sm:inline">ふりかえり履歴</span>
    <span className="sm:hidden leading-tight whitespace-nowrap">ふり返り</span>
  </TabsTrigger>
</TabsList>
```

#### 11-4: TabsContentの順序調整とvalue変更

**場所**: lines 265以降

**修正内容**:
1. `value="map"` → `value="achievement"` に変更
2. `value="assessment-history"` → `value="assessment"` に変更
3. 順序を新しいタブ順序に合わせて並び替え

```typescript
{/* 達成マップタブ */}
<TabsContent value="achievement" className="space-y-4">
  {selectedChild && (
    <AchievementMap
      studentGrade={selectedChild.grade}
      studentCourse="B"
      viewerRole="parent"
      studentId={selectedChildId}
    />
  )}
</TabsContent>

{/* テスト結果タブ */}
<TabsContent value="assessment" className="space-y-4">
  {!selectedChild ? (
    <Card className="card-elevated">
      <CardContent className="py-12 text-center space-y-4">
        <div className="text-6xl">👨‍👩‍👧‍👦</div>
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-700">
            お子様を選択してください
          </p>
          <p className="text-xs text-slate-500">
            お子様のテスト結果履歴を確認できます
          </p>
        </div>
      </CardContent>
    </Card>
  ) : (
    <AssessmentHistory studentId={selectedChild.id} />
  )}
</TabsContent>

{/* 学習履歴タブ */}
<TabsContent value="history" className="space-y-4">
  {selectedChildId && (
    <StudyHistory viewerRole="parent" studentId={selectedChildId} />
  )}
</TabsContent>

{/* 応援履歴タブ */}
<TabsContent value="encouragement" className="space-y-4">
  {selectedChildId && (
    <EncouragementHistory viewerRole="parent" studentId={selectedChildId} />
  )}
</TabsContent>

{/* ふりかえり履歴タブ */}
<TabsContent value="coaching" className="space-y-4">
  {reflections.length === 0 ? (
    <Card>
      <CardContent className="py-10 text-center text-gray-500">
        まだ振り返りがありません
      </CardContent>
    </Card>
  ) : (
    <div className="space-y-3">
      {reflections.map((reflection) => {
        {/* 既存の振り返り表示コード */}
      })}
    </div>
  )}
</TabsContent>
```

#### 11-5: 保護者向け注意文の改善

**場所**: lines 236-250

**修正前**:
```typescript
<Card className="border-amber-200 bg-amber-50">
  <CardContent className="py-4">
    <div className="flex items-start gap-3">
      <Lock className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
      <div className="space-y-1">
        <p className="text-sm font-medium text-amber-900">
          AIコーチング機能はお子様本人のみご利用いただけます
        </p>
        <p className="text-xs text-amber-700">
          保護者様は過去の振り返り履歴、達成マップ、学習履歴、応援履歴をご覧いただけます
        </p>
      </div>
    </div>
  </CardContent>
</Card>
```

**修正後**:
```typescript
<Card className="border-blue-200 bg-blue-50">
  <CardContent className="py-4">
    <div className="flex items-start gap-3">
      <Eye className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
      <div className="space-y-1">
        <p className="text-sm font-semibold text-blue-900">
          保護者様へ
        </p>
        <p className="text-xs text-blue-700 leading-relaxed">
          お子様の達成マップ、テスト結果、学習履歴、応援履歴、ふりかえり履歴をご覧いただけます。ふりかえり機能（対話形式）はお子様本人のみご利用いただけます。
        </p>
      </div>
    </div>
  </CardContent>
</Card>
```

**改善ポイント**:
- ✅ アイコンを `Lock` → `Eye` に変更（閲覧機能の強調）
- ✅ カラーを amber（警告色） → blue（情報色）に変更
- ✅ 絵文字「📌」を除去（スクリーンリーダーノイズ防止）
- ✅ `font-medium` → `font-semibold` でヘッダーを強調
- ✅ テスト結果を追加、タブ順序に合わせてリスト化
- ✅ 語彙を「ふりかえり」に統一（タブ名と一致）
- ✅ 「AIコーチング機能」→「ふりかえり機能（対話形式）」で具体的に説明
- ✅ コンパクトでポジティブな表現

**完了条件**:
- [ ] アイコンimportを追加
- [ ] タブ値の後方互換ロジックを実装（map, assessment-history両対応）
- [ ] TabsListを更新（生徒画面と完全統一）
- [ ] TabsContentの順序とvalueを調整
- [ ] 保護者向け注意文を改善
- [ ] TypeScriptのビルドエラーがないことを確認

---

### ✅ タスク12: 動作確認とビルド検証

#### 12-1: ビルド検証

```bash
pnpm run build
```

**確認項目**:
- [ ] TypeScriptエラーがないこと
- [ ] ビルドが成功すること

#### 12-2: 生徒画面の動作確認

```bash
pnpm run dev
```

**確認項目**:
- [ ] タブが新しい順序で表示される（達成マップ/テスト結果/学習履歴/応援履歴/ふりかえり履歴）
- [ ] 各タブにアイコンが表示される
- [ ] モバイルサイズ（320px）で短縮ラベルが表示される（達成/テスト/学習/応援/ふり返り）
- [ ] タブ切り替えが正常に動作する
- [ ] `?tab=assessment-history` でアクセスしても正常に動作する（後方互換）
- [ ] `?tab=assessment` でアクセスしても正常に動作する

#### 12-3: 保護者画面の動作確認

**確認項目**:
- [ ] タブが新しい順序で表示される（達成マップ/テスト結果/学習履歴/応援履歴/ふりかえり履歴）
- [ ] 各タブにアイコンが表示される
- [ ] モバイルサイズ（320px）で短縮ラベルが表示される（達成/テスト/学習/応援/ふり返り）
- [ ] タブ切り替えが正常に動作する
- [ ] `?tab=map` でアクセスしても正常に動作する（後方互換）
- [ ] `?tab=assessment-history` でアクセスしても正常に動作する（後方互換）
- [ ] 保護者向け注意文が新しいデザインで表示される
- [ ] テスト結果タブが正常に動作する

#### 12-4: レスポンシブ確認

**確認項目**:
- [ ] 320px幅でタブが見切れないこと
- [ ] 375px幅（iPhone SE）で快適に表示されること
- [ ] 768px幅（タブレット）で完全なラベルが表示されること
- [ ] 1024px幅（デスクトップ）で快適に表示されること

#### 12-5: アクセシビリティ確認

**確認項目**:
- [ ] アイコンに `aria-hidden="true"` が設定されていること
- [ ] テキストラベルが必ず存在すること（スクリーンリーダー対応）
- [ ] キーボードナビゲーションが正常に動作すること

---

## 📊 実装前後の比較

### Before（現状）

**生徒画面**:
- タブ順: 達成/学習/応援/テスト/コーチング
- モバイル最適化: なし
- アイコン: なし

**保護者画面**:
- タブ順: map/学習/応援/コーチング/テスト
- モバイル最適化: テスト結果のみ
- アイコン: なし
- タブ値: 混在（map, assessment-history）

### After（実装後）

**生徒・保護者画面（統一）**:
- タブ順: 達成/テスト/学習/応援/ふり返り
- モバイル最適化: 全タブ対応（達成/テスト/学習/応援/ふり返り）
- アイコン: 全タブに設定
- タブ値: 統一（achievement, assessment, history, encouragement, coaching）
- 後方互換: 旧URL（map, assessment-history）も動作
- アクセシビリティ: aria-hidden対応
- 320px幅: min-h-[44px]（44px）でタップ領域確保、px調整で最適化済み
- 語彙統一: 「ふりかえり」に統一（タブ名と注意文）

---

## 🎨 UI/UX改善ポイント

1. **視覚的一貫性**
   - 全タブにアイコンを配置し、言語非依存の識別性を確保
   - `flex items-center gap-1` で icon+text の美しい配置

2. **モバイル最適化**
   - 5列でも視認可能: アイコン + 2-3文字ラベル
   - `hidden sm:inline` / `sm:hidden` パターンで段階的開示
   - `text-xs sm:text-sm` で320px幅対策
   - `leading-tight` で行間調整、`whitespace-nowrap` で改行防止

3. **論理的情報アーキテクチャ**
   - **達成 → テスト → 学習** = 成果を先に見せる（モチベーション設計）
   - **応援 → ふりかえり** = 感情サポート系を後半に配置

4. **アクセシビリティ**
   - `aria-hidden="true"` で装飾アイコンを明示
   - テキストラベルも残すことでスクリーンリーダー対応

5. **後方互換性**
   - 既存ブックマーク/共有リンクを壊さない設計
   - `map` → `achievement`、`assessment-history` → `assessment` の正規化

6. **語彙の統一**
   - 生徒/保護者/URLパラメータで同じ語彙を使用
   - 「達成マップ／テスト結果／学習履歴／応援履歴／ふりかえり履歴」

---

## 📌 注意事項

1. **タブ値の変更による影響**
   - 保護者画面: `map` → `achievement`、`assessment-history` → `assessment`
   - 後方互換ロジックで既存URLは動作するが、新規リンクは新タブ値を使用すること

2. **コードレビューポイント**
   - TabsContent の `value` 属性が新しいタブ値に変更されているか
   - 後方互換ロジックが正しく実装されているか
   - アイコンに `aria-hidden="true"` が設定されているか

3. **デプロイ前の確認**
   - 両画面のすべてのタブが正常に動作するか
   - 旧URLパラメータでアクセスしても正常に動作するか
   - モバイル実機で320px幅の表示を確認したか

---

## ✅ チェックリスト

### 実装フェーズ
- [ ] タスク10: 生徒画面のタブUI統一実装
  - [ ] 10-1: アイコンimportの追加
  - [ ] 10-2: タブ値の型定義と後方互換性の実装
  - [ ] 10-3: TabsListの更新
  - [ ] 10-4: TabsContentの順序調整
- [ ] タスク11: 保護者画面のタブUI統一実装
  - [ ] 11-1: アイコンimportの追加
  - [ ] 11-2: タブ値の型定義と後方互換性の実装
  - [ ] 11-3: TabsListの更新
  - [ ] 11-4: TabsContentの順序調整とvalue変更
  - [ ] 11-5: 保護者向け注意文の改善
- [ ] タスク12: 動作確認とビルド検証
  - [ ] 12-1: ビルド検証
  - [ ] 12-2: 生徒画面の動作確認
  - [ ] 12-3: 保護者画面の動作確認
  - [ ] 12-4: レスポンシブ確認
  - [ ] 12-5: アクセシビリティ確認

### レビューフェーズ
- [ ] コードレビュー完了
- [ ] デザインレビュー完了
- [ ] ユーザビリティテスト完了

### デプロイフェーズ
- [ ] ステージング環境へのデプロイ
- [ ] 本番環境へのデプロイ
- [ ] デプロイ後の動作確認

---

## 🚀 実装フロー

### 必須手順（厳守）

1. **ブランチを切る**
   ```bash
   git checkout -b feature/ux-tabs-unification
   ```

2. **ローカルで開発**
   - タスク10: 生徒画面のタブUI統一実装
   - タスク11: 保護者画面のタブUI統一実装
   - 各タスク完了後、こまめにコミット

3. **ローカルで動作確認**
   ```bash
   # ビルド検証
   pnpm run build

   # 開発サーバー起動
   pnpm run dev

   # タスク12の確認項目をすべて実施
   ```

4. **mainへマージ**
   ```bash
   # mainブランチを最新化
   git checkout main
   git pull origin main

   # feature branchをマージ
   git merge feature/ux-tabs-unification

   # リモートへプッシュ
   git push origin main
   ```

5. **デプロイ**
   - Vercel等の自動デプロイ確認
   - デプロイ後、本番環境で動作確認

### ⚠️ 重要な注意事項

**本番環境のデータ破壊は絶対に行わないこと**

- このUI改善は**フロントエンド変更のみ**でバックエンド/DBへの影響はなし
- `npx supabase db reset` などのDB破壊コマンドは実行しない
- Server Actions (`app/actions/reflect.ts`) は既に実装済みで変更不要
- マイグレーションファイルの作成・変更も不要

---

## 📝 実装メモ

- 実装日: 2025-12-24
- 担当: Claude Code
- レビュー者: （記入してください）
- 承認者: （記入してください）
- ブランチ名: `feature/ux-tabs-unification`
