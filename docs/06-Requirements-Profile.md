# 06-Requirements-Profile.md

## 概要
ユーザーの自己表現と継続モチベーションを高めるため、全画面共通のアバター表示とプロフィール編集機能を実装する。
AIコーチとの関係性を一貫して感じられるUI体験を提供し、学習への愛着を育む。

---

## 1. 機能概要

### 1.1 プロフィール情報の管理
- ユーザーがニックネーム、アバター、テーマカラーを設定・変更できる
- 変更内容は即時反映され、データベースに永続化される
- 初回ログイン時はデフォルト値を自動設定（セットアップフロー経由）

### 1.2 共通ヘッダーでのアバター表示
- 全画面に共通ヘッダーを配置し、右上に小アバターを常時表示
- アバタークリック/タップでドロップダウンメニューを開く
- プロフィール編集・ログアウトへの導線を提供

### 1.3 対象ロール（Phase 1実装範囲）
| ロール | 共通ヘッダー | プロフィール編集 | セットアップフロー | 備考 |
|--------|------------|-----------------|------------------|------|
| 生徒（student） | ✅ 実装 | ✅ 実装 | ✅ 実装済み | メイン機能 |
| 保護者（parent） | ✅ 実装 | ✅ 実装 | ✅ 実装済み | 生徒と同一構造 |
| 指導者（coach） | ✅ 実装 | ✅ 実装 | ❌ Phase 2 | 保護者用アバターを流用 |
| 管理者（admin） | ✅ 実装 | ⚠️ 任意 | ❌ Phase 2 | 必要に応じて実装 |

**Phase 1での実装方針:**
- すべてのロールで共通ヘッダーにアバター表示
- 生徒・保護者・指導者でプロフィール編集機能を提供
- 管理者は最小限（ログアウト機能のみでも可）
- セットアップフローは生徒・保護者のみ（指導者・管理者は招待制のため不要）

---

## 2. データ構造

### 2.1 テーブル設計（`profiles` テーブル）
| カラム名 | 型 | 制約 | 説明 |
|---------|-----|------|------|
| `id` | UUID | PRIMARY KEY | ユーザーID（auth.users.id と同一） |
| `nickname` | TEXT | NOT NULL | ニックネーム（1〜10文字） |
| `avatar_id` | TEXT | NOT NULL | アバターID（student1〜6, parent1〜6など） |
| `theme_color` | TEXT | DEFAULT '#3B82F6' | テーマカラー（HEX形式） |
| `role` | TEXT | NOT NULL | ユーザーロール（student/parent/coach/admin） |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | 作成日時 |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | 更新日時 |

**注**: `avatar_id` のデフォルト値はアプリケーション側で `role` に応じて設定します（student: 'student1', parent: 'parent1'）。

### 2.2 アバター選択肢（固定リスト）
既存のセットアップフローで使用されているアバターと同一のものを使用します。

#### 2.2.1 生徒用アバター
```typescript
const STUDENT_AVATARS = [
  {
    id: "student1",
    name: "スマイルボーイ",
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/student1-xZFJU5uXJO4DEfUbq1jbTMQUXReyM0.png"
  },
  {
    id: "student2",
    name: "ハッピーガール",
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/student2-mZ9Q9oVm43IQoRyxSYytVFYgp3JS1V.png"
  },
  {
    id: "student3",
    name: "クールキッズ",
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/student3-teUpOKnopXNhE2vGFtvz9RWtC7O6kv.png"
  },
  {
    id: "student4",
    name: "スマートガール",
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/student4-pKazGXekCT1H5kzHBqmfOrM1968hML.png"
  },
  {
    id: "student5",
    name: "チャレンジャー",
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/student5-kehwNSIKsgkTL6EkAPO2evB3qJWnRM.png"
  },
  {
    id: "student6",
    name: "ピースメーカー",
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/student6-dJrMk7uUxYSRMp5tMJ3t4KYDOEIuNl.png"
  },
]
```

#### 2.2.2 保護者用アバター
```typescript
const PARENT_AVATARS = [
  {
    id: "parent1",
    name: "保護者1",
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/parent1-HbhESuJlC27LuGOGupullRXyEUzFLy.png"
  },
  {
    id: "parent2",
    name: "保護者2",
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/parent2-zluk4uVJLfzP8dBe0I7v5fVGSn5QfU.png"
  },
  {
    id: "parent3",
    name: "保護者3",
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/parent3-EzBDrjsFP5USAgnSPTXjcdNeq1bzSm.png"
  },
  {
    id: "parent4",
    name: "保護者4",
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/parent4-YHYTNRnNQ7bRb6aAfTNEFMozjGRlZq.png"
  },
  {
    id: "parent5",
    name: "保護者5",
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/parent5-dGCLocpgcZw4lXWRiPmTHkXURBXXoH.png"
  },
  {
    id: "parent6",
    name: "保護者6",
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/parent6-gKoeUywhHoKWJ4BPEk69iW6idztaLl.png"
  },
]
```

#### 2.2.3 指導者・管理者用アバター
**注**: 現時点では指導者・管理者専用のアバター選択画面は未実装です。以下のいずれかの対応が必要です：
- 保護者用アバターを流用する
- 生徒用アバターを流用する
- 新規にアバターセットを作成する（将来対応）

実装時は `role` に応じて適切なアバターリストを返すようにします。

### 2.3 テーマカラー選択肢
```typescript
const THEME_COLORS = [
  { id: 1, name: "ブルー", value: "#3B82F6" },
  { id: 2, name: "グリーン", value: "#10B981" },
  { id: 3, name: "パープル", value: "#8B5CF6" },
  { id: 4, name: "ピンク", value: "#EC4899" },
  { id: 5, name: "オレンジ", value: "#F59E0B" },
  { id: 6, name: "ティール", value: "#14B8A6" },
]
```

---

## 3. UI設計

### 3.1 共通ヘッダー
**レイアウト:**
- 高さ: 56px（モバイル）/ 64px（タブレット・PC）
- 背景: 白（`bg-white`）+ 下部ボーダー（`border-b border-gray-200`）
- 左: ロゴまたはページタイトル（任意）
- 右: アバター + ニックネーム（PC時のみ表示）

**アバター表示:**
| デバイス | サイズ | 表示内容 |
|---------|--------|----------|
| モバイル（〜639px） | 32px × 32px | アバターのみ |
| タブレット（640px〜1023px） | 40px × 40px | アバター + ニックネーム |
| PC（1024px〜） | 40px × 40px | アバター + ニックネーム + 下向き矢印アイコン |

**ドロップダウンメニュー:**
- 右上から展開（right-0）
- 白背景、ドロップシャドウ（`shadow-lg`）
- 角丸: `rounded-lg`
- 幅: 200px（固定）
- メニュー項目:
  1. プロフィール編集（アイコン: User）
  2. ログアウト（アイコン: LogOut、赤文字）

**インタラクション:**
- ホバー時: 背景を薄グレーに変更（`hover:bg-gray-50`）
- フォーカス時: アウトラインを表示（キーボード操作対応）
- クリック/タップ時: メニュー開閉（トグル動作）
- メニュー外クリック時: 自動的に閉じる

### 3.2 プロフィール編集モーダル
**レイアウト:**
- 中央配置、幅: 90%（モバイル）/ 480px（タブレット・PC）
- 背景オーバーレイ: 半透明黒（`bg-black/50`）
- 角丸: `rounded-2xl`
- パディング: 24px

**コンテンツ構成（上から順）:**
1. ヘッダー
   - タイトル: "プロフィール編集"（左寄せ、font-bold text-xl）
   - 閉じるボタン: 右上のXアイコン（`hover:bg-gray-100` の円形ボタン）

2. アバタープレビュー（中央配置）
   - サイズ: 96px × 96px
   - 選択中のアバターを表示
   - 背景色: 選択中のテーマカラー（`theme_color`）の10%透明度版
   - 角丸: `rounded-full`
   - 例: `bg-[#3B82F6]/10`（テーマカラーが青の場合）

3. ニックネーム入力
   - ラベル: "ニックネーム"（font-medium text-sm text-gray-700）
   - 入力フィールド:
     - プレースホルダー: "例: ハッピーガールさん"
     - 文字数カウンター: "0/10"（右下に表示）
     - バリデーション: 1〜10文字、必須
     - リアルタイムプレビュー: 入力中もアバタープレビュー下にニックネームを表示

4. アバター選択
   - ラベル: "アバター"
   - グリッドレイアウト: 3列（モバイル）/ 6列（タブレット・PC）
   - 各アバター:
     - サイズ: 64px × 64px
     - 角丸: `rounded-lg`
     - ボーダー: 選択中は太い青ボーダー（`border-2 border-blue-500`）
     - ホバー時: スケール拡大（`hover:scale-105`）+ シャドウ
     - クリック時: 即座にプレビューを更新

5. テーマカラー選択
   - ラベル: "テーマカラー"
   - 横並びのカラーパレット（6色）
   - 各カラー:
     - サイズ: 40px × 40px（円形）
     - 選択中: 白いチェックマーク + 太いボーダー
     - ホバー時: スケール拡大（`hover:scale-110`）

6. フッター（ボタン配置）
   - キャンセルボタン: 左寄せ、グレー背景
   - 保存ボタン: 右寄せ、プライマリーボタン（青背景）
   - 両ボタン間にスペース（`justify-between`）

**アクセシビリティ:**
- Escキーで閉じる
- Tab/Shift+Tabでフォーカス移動可能
- フォーカストラップ（モーダル外にフォーカスが移動しない）
- `aria-label` 属性を適切に設定
- スクリーンリーダー対応

### 3.3 保存成功トースト
- 右上に表示（fixed position）
- 背景: 緑（`bg-green-500`）
- テキスト: 白（`text-white`）
- アイコン: チェックマーク
- メッセージ: "プロフィールを保存しました✨"
- 表示時間: 3秒後に自動消去
- アニメーション: フェードイン・フェードアウト

---

## 4. UX設計

### 4.1 インタラクションフロー
```
ユーザー操作 → システム応答

1. ヘッダーのアバタークリック
   → ドロップダウンメニュー表示（150ms fade-in）

2. "プロフィール編集"をクリック
   → モーダル表示（200ms fade-in + scale-up）
   → 現在のプロフィール情報をフェッチ・表示

3. ニックネーム入力
   → リアルタイムで文字数カウンター更新
   → プレビューエリアのニックネームも同時更新

4. アバター選択
   → クリック時に即座にプレビュー更新
   → 軽いバウンスアニメーション（100ms）

5. カラー選択
   → クリック時に選択状態を視覚的に強調

6. 保存ボタンクリック
   → ローディングスピナー表示（ボタン内）
   → Supabase更新処理（500ms〜1s）
   → 成功トースト表示
   → モーダル自動クローズ（300ms fade-out）
   → AIコーチからのコメント表示（オプション）

7. ヘッダーのアバターが新しい内容に更新
   → 全画面で即座に反映（状態管理による）
```

### 4.2 エラーハンドリング
| エラーケース | UX対応 |
|-------------|--------|
| ニックネームが空 | 入力フィールド下に赤文字で「ニックネームを入力してください」を表示 |
| ニックネームが10文字超過 | 入力フィールドを赤枠、文字数カウンターを赤文字に変更 |
| ネットワークエラー（保存失敗） | 赤背景のトーストで「保存に失敗しました。もう一度お試しください」を表示 |
| データ取得失敗 | モーダル内に「データを読み込めませんでした」メッセージ + 再試行ボタン |

### 4.3 AIコーチのフィードバック（オプション機能）
プロフィール保存後、ダッシュボードのAIコーチメッセージエリアに以下のようなコメントを表示:

**アバター変更時:**
- "新しいスタイル、似合ってるね!✨"
- "おっ、イメチェン? かっこいいじゃん!"
- "その姿、やる気が伝わってくるよ!"

**ニックネーム変更時:**
- "新しい名前、いい響きだね!"
- "よろしくね、[新ニックネーム]さん!"

**カラー変更時:**
- "その色、元気が出るね!"
- "新しい色、君らしいよ!"

**実装方法:**
- ランダムに選択（配列からシャッフル）
- 保存後24時間以内に1回のみ表示
- LocalStorageに `profile_update_feedback_shown` フラグを保存

---

## 5. レスポンシブ対応

### 5.1 ブレークポイント
| デバイス | 幅 | 共通ヘッダー仕様 | モーダル幅 |
|---------|-----|----------------|----------|
| モバイル | 〜639px | アバターのみ（32px） | 90% |
| タブレット | 640px〜1023px | アバター + ニックネーム（40px） | 480px |
| PC | 1024px〜 | アバター + ニックネーム + 矢印（40px） | 480px |

### 5.2 タッチ対応
- タップターゲットサイズ: 最小44px × 44px（Apple推奨）
- ホバー効果はタッチデバイスでは非表示
- スワイプジェスチャーでモーダルを閉じる（オプション）

---

## 6. 技術要件

### 6.1 フロントエンド
**状態管理:**
```typescript
// カスタムフック: useUserProfile()
export function useUserProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    // Supabase から取得
  }

  const updateProfile = async (data: Partial<UserProfile>) => {
    // Supabase へ保存
    // ローカル状態も更新
  }

  return { profile, loading, updateProfile }
}
```

**コンポーネント構成:**
- `components/common/header.tsx` - 共通ヘッダー
- `components/profile/avatar-dropdown.tsx` - ドロップダウンメニュー
- `components/profile/edit-modal.tsx` - 編集モーダル
- `components/profile/avatar-selector.tsx` - アバター選択UI（ロール別にアバターリストを切り替え）
- `components/profile/color-palette.tsx` - カラー選択UI
- `lib/constants/avatars.ts` - アバター定義（STUDENT_AVATARS, PARENT_AVATARS）

**アニメーションライブラリ:**
- Framer Motion（推奨） or Tailwind CSS Transition

### 6.2 バックエンド（Supabase）
**API設計:**

1. **GET `/api/profile/:user_id`**
   - プロフィール情報の取得
   - レスポンス:
     ```json
     {
       "id": "uuid",
       "nickname": "ハッピーガールさん",
       "avatar_id": "student2",
       "theme_color": "#3B82F6",
       "role": "student"
     }
     ```

2. **POST `/api/profile/update`**
   - プロフィール更新
   - リクエストボディ:
     ```json
     {
       "nickname": "新しいニックネーム",
       "avatar_id": "student3",
       "theme_color": "#10B981"
     }
     ```
   - バリデーション:
     - `nickname`: 1〜10文字、必須
     - `avatar_id`: ロールに応じた有効なアバターID
       - student: student1〜student6
       - parent: parent1〜parent6
       - coach/admin: parent1〜parent6 または student1〜student6（暫定）
     - `theme_color`: HEX形式（正規表現: `^#[0-9A-Fa-f]{6}$`）

**Row Level Security (RLS):**
```sql
-- ユーザーは自分のプロフィールのみ閲覧・更新可能
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);
```

### 6.3 パフォーマンス
- アバター画像: WebP形式、各5KB以下
- モーダルの遅延ロード（dynamic import）
- プロフィール情報のキャッシュ（React Query or SWR推奨）
- 保存処理の楽観的更新（Optimistic Update）

---

## 7. セキュリティ要件
- CSRF対策: Supabase のトークンベース認証で自動対応
- XSS対策: ニックネーム入力のサニタイズ（`DOMPurify` 使用）
- 入力バリデーション: フロントエンド + バックエンド両方で実施
- Rate Limiting: プロフィール更新は1分間に5回まで

---

## 8. 初回セットアップとの統合

### 8.1 初回ログイン時のフロー
```
ログイン成功
 ↓
profiles テーブルにレコードがあるか確認
 ↓
【ない場合】
 ├→ デフォルト値で新規作成（ロール別）:
 │   【生徒の場合】
 │   - nickname: "ユーザー" + ランダム4桁（例: "ユーザー1234"）
 │   - avatar_id: "student1"（スマイルボーイ）
 │   - theme_color: "#3B82F6"
 │
 │   【保護者の場合】
 │   - nickname: "保護者" + ランダム4桁（例: "保護者5678"）
 │   - avatar_id: "parent1"（保護者1）
 │   - theme_color: "#3B82F6"
 │
 │   【指導者・管理者の場合】
 │   - nickname: "指導者" + ランダム4桁（例: "指導者9012"）
 │   - avatar_id: "parent1"（暫定: 保護者用を流用）
 │   - theme_color: "#3B82F6"
 ↓
セットアップフロー (`/app/setup/*`) へリダイレクト（ロール別）
 ├→ 生徒: アバター選択 (`/app/setup/avatar`) → プロフィール入力 (`/app/setup/profile`)
 ├→ 保護者: アバター選択 (`/app/setup/parent-avatar`) → ダッシュボードへ
 └→ 指導者・管理者: デフォルトプロフィールで作成後、直接ダッシュボードへ
     （セットアップフローは Phase 2 で実装、Phase 1 ではスキップ）

【ある場合】
 └→ ロール別ダッシュボードへ直接遷移
```

### 8.2 セットアップフローとの連携
- **生徒**: `/app/setup/avatar` → `/app/setup/profile` でアバター・ニックネームを選択
- **保護者**: `/app/setup/parent-avatar` でアバターを選択
- 同じUIコンポーネントを再利用（`avatar-selector.tsx`）でロール別にアバターリストを切り替え
- 保存後は `localStorage.registrationComplete = true` を設定

**実装ポイント:**
```typescript
// lib/constants/avatars.ts でロール別にアバターを取得
export function getAvatarsByRole(role: UserRole) {
  switch (role) {
    case 'student':
      return STUDENT_AVATARS
    case 'parent':
      return PARENT_AVATARS
    case 'coach':
    case 'admin':
      // 暫定: 保護者用を流用
      return PARENT_AVATARS
    default:
      return STUDENT_AVATARS
  }
}
```

---

## 9. テスト要件

### 9.1 ユニットテスト
- `useUserProfile()` フックの状態管理ロジック
- バリデーション関数（ニックネーム長、HEXカラー形式）
- アバター選択時のプレビュー更新ロジック

### 9.2 統合テスト
- プロフィール取得 → 表示 → 編集 → 保存の一連のフロー
- エラーケース（ネットワークエラー、バリデーションエラー）
- 複数デバイスでの表示確認

### 9.3 E2Eテスト（Playwright推奨）
```typescript
test('プロフィール編集フロー', async ({ page }) => {
  // ログイン
  await page.goto('/app')
  await page.fill('[name="username"]', 'student1')
  await page.fill('[name="password"]', 'password')
  await page.click('button[type="submit"]')

  // ヘッダーのアバタークリック
  await page.click('[data-testid="user-avatar"]')
  await page.click('text=プロフィール編集')

  // モーダルが表示されることを確認
  await expect(page.locator('[role="dialog"]')).toBeVisible()

  // ニックネーム変更
  await page.fill('[name="nickname"]', '新しいニックネーム')

  // アバター選択（生徒の場合）
  await page.click('[data-avatar-id="student3"]')

  // 保存
  await page.click('button:has-text("保存")')

  // 成功トーストが表示されることを確認
  await expect(page.locator('text=保存しました')).toBeVisible()

  // ヘッダーのニックネームが更新されていることを確認
  await expect(page.locator('[data-testid="user-nickname"]'))
    .toHaveText('新しいニックネーム')
})
```

---

## 10. 完了条件（Definition of Done）

### 10.1 Phase 1必須要件（生徒・保護者）
- [ ] すべての画面で共通ヘッダーが表示され、右上にアバターが常時表示される
- [ ] ドロップダウンメニューからプロフィール編集モーダルを開ける
- [ ] ニックネーム、アバター、カラーを変更でき、リアルタイムプレビューが動作する
- [ ] 保存後、全画面で即座にプロフィール情報が更新される
- [ ] Supabase の `profiles` テーブルにデータが正しく保存される
- [ ] 保存成功時にトースト通知が表示される
- [ ] モバイル・タブレット・PCで適切にレスポンシブ表示される
- [ ] キーボード操作とスクリーンリーダーでアクセス可能
- [ ] E2Eテスト（生徒・保護者）が全パス
- [ ] エラーケースで適切なフィードバックが表示される

### 10.2 Phase 1拡張要件（指導者）
- [ ] 指導者画面でも共通ヘッダーとアバターが表示される
- [ ] 指導者がプロフィール編集モーダルで保護者用アバターを選択できる
- [ ] 保存処理が正常に動作する

### 10.3 Phase 2以降（任意）
- AIコーチのフィードバック機能
- 指導者・管理者専用のセットアップフロー
- 管理者向けプロフィール編集機能

---

## 11. 将来的な拡張案（Phase 2以降）
- **AIコーチのフィードバック機能** - プロフィール変更時にダッシュボードでAIコーチがコメントを返す
- プロフィール画像のアップロード機能（カスタム画像）
- バッジ・実績システムとの統合（プロフィールにバッジ表示）
- テーマカラーの全画面適用（ヘッダー、ボタン、強調色）
- ダークモード対応
- プロフィールの公開・非公開設定（保護者・指導者向け）
- プロフィール変更履歴の記録（監査ログ）

---

## 備考
- 実装優先度: 生徒 > 保護者 > 指導者 > 管理者
- **Phase 1（初回リリース）スコープ**:
  - 生徒・保護者向けのプロフィール編集機能（ヘッダー表示、モーダル編集、保存）
  - 基本的なトースト通知のみ（AIコーチフィードバックは Phase 2）
- デザインシステムの統一性を保つため、既存の `components/ui/*` を最大限活用する
