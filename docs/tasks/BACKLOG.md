# バックログ - 将来対応タスク

**作成日:** 2025年10月4日
**目的:** エラーなく稼働することを最優先するため、初期実装では省略し、Phase 0-5完了後に対応するタスク

---

## 📋 Phase 1 関連の詳細化タスク

### P1-1-detail: スパーク機能詳細化
**優先度:** 中
**対応時期:** Phase 1完了後

- [ ] 再入力時のデフォルト値引き継ぎ
  - 1回目入力内容の表示ロジック
  - 横バーと数値入力のデフォルト値設定

---

## 📋 Phase 2 関連の詳細化タスク

### P2-5: AI品質基準策定（新規タスク）
**優先度:** 高
**対応時期:** Phase 2開始前

- [ ] セルフコンパッション原則の統一ドキュメント作成
- [ ] 成長マインドセット原則の統一ドキュメント作成
- [ ] GROWモデル準拠チェックリスト作成
- [ ] SMARTチェックリスト作成
- [ ] AI応答品質のテストケース作成

---

## 📋 Phase 1 → Phase 3 移行タスク

### P1-to-P3: AI メッセージの移行
**優先度:** 高
**対応時期:** Phase 3 完了後

- [ ] 生徒ダッシュボード AI コーチメッセージの AI 生成化
  - Phase 1 実装: 時間帯別テンプレートメッセージ（朝/昼/夕）
  - Phase 3 移行後: GROW/Will データ + 直近3日の学習ログを参照する AI 生成メッセージに差し替え
  - 実装内容:
    ```typescript
    // Phase 1: テンプレート
    const getMessage = (hour: number) => {
      if (hour < 12) return "おはよう！今日も一緒に頑張ろう✨";
      if (hour < 18) return "おかえり！今日も学習を続けよう！";
      return "今日もお疲れさま！明日も一緒に頑張ろう！";
    };

    // Phase 3 移行後: AI 生成
    const getMessage = async (studentId: string) => {
      const growData = await getLatestGROW(studentId);
      const recentLogs = await getRecentLogs(studentId, 3);
      return await generateAIMessage(growData, recentLogs);
    };
    ```

- [ ] 保護者ダッシュボード「今日の様子」の AI 生成化
  - Phase 1 実装: 静的テンプレートメッセージ
  - Phase 3 移行後: 直近3日の学習ログ + GROW/Will データを参照する AI 生成メッセージに差し替え
  - プロンプト設計: 保護者向けトーン、子どもの成長を伝える内容

---

## 📋 Phase 3 関連の詳細化タスク

### P3-1-detail: ゴールナビ詳細機能
**優先度:** 中
**対応時期:** Phase 3完了後

- [ ] 「今回の思い」の編集履歴管理
  - 編集履歴保持（最大5件）
  - 編集日時記録
  - 自動保存（5秒後）

- [ ] エラーハンドリング実装
  - 未入力エラーメッセージ
  - 通信エラー時のローカル保存 → 自動再送
  - AI生成失敗時の再生成ボタン
  - 権限エラー時の閲覧モード切替

### P3-2-detail: リフレクト詳細機能
**優先度:** 中
**対応時期:** Phase 3完了後

- [ ] 特別感の演出実装
  - 「土曜日限定」ラベル表示
  - ボタンの光るアニメーション
  - 完了時の達成音
  - 振り返り完了バッジ

- [ ] セルフコンパッション応答マトリクス実装
  - 「全然ダメだった」への応答
  - 「友達はもっとできてる」への応答
  - 「やる気が出ない」への応答

### P3-3-detail: 達成マップ・履歴表示の詳細機能
**優先度:** 中
**対応時期:** Phase 3完了後

- [ ] コース別表示制御ロジック実装
  - Aコース: Spark（楽しくスタート）
  - Bコース: Flame（成長ステップ）
  - C/Sコース: Blaze（最高にチャレンジ）

- [ ] 学習履歴フィルター条件実装
  - 期間フィルターで「1ヶ月の間に記録が5件未満のときには全ての期間表示」ロジック

- [ ] 応援履歴フィルター機能実装
  - 科目フィルター
  - 期間フィルター
  - 並び替え（記録日時/学習回/正答率）
  - 表示（全表示/一部表示）

---

## 📋 Phase 4 関連の詳細化タスク

### P4-2-detail: 週次AI分析の共通分析軸・固有分析軸
**優先度:** 中
**対応時期:** Phase 4完了後

- [ ] 共通分析軸の実装
  - 学年別分析（小学5年/6年）
  - 生徒別分析
  - 科目別分析
  - 前週比較

- [ ] 項目別固有の分析軸実装
  - 応援履歴: 応援者別/応援種類別/応援量/効果測定
  - コーチング履歴: Will品質分析（SMART度）/達成率/行動変容

- [ ] 履歴閲覧機能実装
  - 過去の分析結果を選択して閲覧可能な機能
  - 時系列での変化確認機能

---

## 📋 共通タスク

### 共通-UI: 共通UIコンポーネントの再利用性改善
**優先度:** 高
**対応時期:** Phase 1開始時

- [ ] `components/shared/LearningCalendar.tsx` 実装
  - 生徒・保護者・指導者で共通利用
  - 月移動機能
  - 色分けロジック

- [ ] `components/shared/ProgressBar.tsx` 実装
  - 生徒・保護者で共通利用
  - 4科目別進捗バー

- [ ] `components/shared/EncouragementCard.tsx` 実装
  - 生徒・保護者・指導者で共通利用
  - 応援メッセージ表示

### 共通-通知: 通知機能の詳細実装
**優先度:** 低
**対応時期:** Phase 5完了後

- [ ] 新規応援メッセージ受信時の通知
- [ ] リフレクト期間（土曜12:00〜）の通知
- [ ] テスト直前の通知

---

## 🎯 優先順位サマリー

### 高優先度（Phase 0-1完了直後に対応）
1. **P2-5: AI品質基準策定** - Phase 2開始前に必要
2. **共通-UI: 共通UIコンポーネント** - 再利用性向上のためPhase 1開始時に実装

### 中優先度（各Phase完了後に対応）
- P1-1-detail: スパーク機能詳細化
- P3-1-detail, P3-2-detail, P3-3-detail: ゴールナビ・リフレクト詳細機能
- P4-2-detail: 週次AI分析の詳細化

### 低優先度（MVP完成後に対応）
- 共通-通知: 通知機能の詳細実装

---

## 📋 算数自動採点 関連の延期タスク

### TD-1: ダッシュボード Server Action 重複発火の共通キャッシュ戦略
**優先度:** 低（パフォーマンス最適化）
**追加日:** 2026-02-11

生徒ダッシュボード (`dashboard-client.tsx`) ではモバイル/PC 両レイアウトに同一コンポーネントを配置しているため、以下の Server Action が二重発火する:

- `getMathGradingHistory()` — `MathAutoGradingSection` x2
- `useStudentAssessments()` — `StudentAssessmentSection` x2

**対応案:**
1. 親コンポーネントで1回取得 → props 配布パターン
2. SWR / React Query 導入でリクエストレベルの重複排除
3. `useMemo` + Context でレスポンシブ切り替え時の再フェッチ防止

**影響ファイル:** `components/assessment/math-auto-grading-section.tsx`, `components/assessment/student-assessment-section.tsx`, `app/student/dashboard-client.tsx`

### TD-2: 保護者ダッシュボードに算数自動採点表示 (計画書 12-4)
**優先度:** 中
**追加日:** 2026-02-11

バックエンド（Server Action の保護者認可チェック）は実装済み。フロントエンド統合が未実装。

### ~~TD-3: 指導者 生徒詳細画面に算数自動採点表示 (計画書 12-5)~~
**ステータス:** 実装済み（2026-02-11 確認）

`/coach/student/[id]` の `AssessmentHistory` コンポーネントが `studentId` props で算数自動採点データを自動統合。追加作業不要。

---

## 🔒 セキュリティ改善タスク

### SEC-1: Server Action `getDailySparkLevel` 認証チェック追加
**優先度:** 高（セキュリティ）
**追加日:** 2026-02-13
**更新日:** 2026-02-13（コードレビュー反映）
**検出元:** Vercel React Best Practices 監査 (server-auth-actions ルール)
**現状リスク:** PoCで新規登録を閉じているため実害は限定的。本番公開時は必須対応。

#### 問題
`app/actions/daily-spark.ts` の `getDailySparkLevel(studentId, parentUserId?)` は `"use server"` で公開エンドポイントとなっているが、`supabase.auth.getUser()` による認証チェックがない。任意の `studentId` を渡して他人のミッション達成状況を取得可能。

さらに `lib/utils/daily-spark.ts` も先頭に `"use server"` があり、`daily-spark-logo.tsx` から直接 import されているため、**公開エンドポイントが2箇所**存在する。

#### 影響範囲

**公開エンドポイント（2箇所 → 1箇所に統一が必要）:**
- `app/actions/daily-spark.ts:11` — Server Action エントリポイント（**認証追加対象**）
- `lib/utils/daily-spark.ts:36` — `"use server"` 付きで直接 import されている（**内部専用化が必要**）

**呼び出し元（全6箇所）:**

| ファイル | 行 | 呼び出し元ロール | try/catch |
|---------|-----|-----------------|-----------|
| `components/common/daily-spark-logo.tsx` | 39 | 生徒・保護者 | あり |
| `app/parent/dashboard-client.tsx` | 1927 | 保護者 | あり |
| `app/parent/encouragement/page.tsx` | 76 | 保護者 | **なし（要追加）** |
| `app/parent/goal/page.tsx` | 169 | 保護者 | あり（個別child try/catch） |
| `app/parent/reflect/page.tsx` | 174 | 保護者 | **なし（要追加）** |
| `scripts/debug-daily-spark.ts` | 122 | デバッグ用 | — |

#### 修正方針

**Step 1: 公開エンドポイントの統一**
- `lib/utils/daily-spark.ts` から `"use server"` を削除し、内部専用化
- `daily-spark-logo.tsx` の import 元を `@/lib/utils/daily-spark` → `@/app/actions/daily-spark` に変更
- 全呼び出し元が `app/actions/daily-spark.ts` を経由するように統一

**Step 2: `parentUserId` をサーバー側で確定** (`app/actions/daily-spark.ts`)
- `parentUserId` を外部引数で受けず、サーバー側でセッションの `user.id` から確定
- シグネチャ変更: `getDailySparkLevel(studentId: number)` （parentUserId 引数を削除）
- 保護者かどうかはロール判定後にサーバー側で `user.id` を渡す

**Step 3: 認可チェックに `checkStudentAccess` を再利用** (`app/actions/daily-spark.ts`)
```typescript
import { checkStudentAccess } from "@/app/actions/common/check-student-access"

export async function getDailySparkLevel(studentId: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error("認証が必要です")
  }

  // 認可チェック（既存の共通関数を再利用）
  // checkStudentAccess は生徒本人・保護者（parent_child_relations）・
  // コーチ（coach_student_relations = 担当生徒のみ）を判定
  const hasAccess = await checkStudentAccess(user.id, String(studentId))
  if (!hasAccess) {
    throw new Error("アクセス権限がありません")
  }

  // 保護者の場合はサーバー側で user.id を parentUserId として渡す
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  const parentUserId = profile?.role === "parent" ? user.id : undefined
  return await getLevel(studentId, parentUserId)
}
```

> **注:** `checkStudentAccess` (`app/actions/common/check-student-access.ts`) は既にコーチの認可を
> `coach_student_relations` テーブルで判定しており、**担当生徒のみ**アクセス可（全生徒ではない）。
> これは RLS ポリシー（`20251006000013_update_rls_policies.sql` の `"Coaches can view assigned students *"` ポリシー群）と整合する。

**Step 4: 呼び出し元の修正**
- `daily-spark-logo.tsx` — import 元を `@/app/actions/daily-spark` に変更、`parentUserId` 引数を削除
- `parent/encouragement/page.tsx:76` — try/catch 追加
- `parent/reflect/page.tsx:174` — try/catch 追加
- 全保護者ページ — `parentUserId` 引数の削除、`profile.id` を渡す箇所を削除

**Step 5: ループ呼び出しの並列化**
```typescript
// Before: 逐次呼び出し
for (const child of children) {
  const level = await getDailySparkLevel(child.id, profile.id)
  statusMap[child.id] = level === "parent" || level === "both"
}

// After: Promise.allSettled で並列化
const results = await Promise.allSettled(
  children.map((child) => getDailySparkLevel(child.id))
)
results.forEach((result, i) => {
  const childId = children[i].id
  statusMap[childId] = result.status === "fulfilled"
    && (result.value === "parent" || result.value === "both")
})
```

#### UXへの影響
- **なし** — 正当なログイン済みユーザーの挙動は変わらない
- 未認証リクエストのみ弾く
- ループ呼び出しの `Promise.allSettled` 化により、複数子ども時のレスポンス改善

#### テスト観点
- 生徒ログイン → 自分のstudentIdでSparkレベル取得 → 成功
- 生徒ログイン → 他人のstudentIdでSparkレベル取得 → エラー
- 保護者ログイン → 自分の子どものstudentIdで取得 → 成功
- 保護者ログイン → 関連のないstudentIdで取得 → エラー
- **コーチログイン → 担当生徒のstudentIdで取得 → 成功**
- **コーチログイン → 非担当生徒のstudentIdで取得 → エラー**
- 未認証 → エラー

#### 対応時期
- PoCフェーズ: 低リスク（新規登録を閉じているため）
- 本番公開前: **必須対応**

### SEC-2: Server Action 入力バリデーション・レート制限追加
**優先度:** 中
**追加日:** 2026-02-13
**更新日:** 2026-02-13（コードレビュー反映）
**検出元:** Vercel React Best Practices 監査 (server-auth-actions ルール)

#### zod スキーマバリデーション未実装
以下の Server Action に zod スキーマバリデーションが未実装:
- `universalLogin(input, password)` — 型注釈のみ
- `parentSignUp(...)` — 9引数を受け取るがスキーマなし

#### `sendPasswordResetEmail` のセキュリティ強化
- **レート制限**: 同一メールアドレスへの連続送信を制限（例: 1分間に1回、1時間に5回）
- **ユーザー列挙対策**: メールアドレスの存在有無に関わらず同一レスポンスを返す
  - 現状リスク: 存在しないメールでエラーが返る場合、攻撃者がアカウント有無を判別可能
  - 対策: 成功/失敗に関わらず「メールを送信しました」と返す（実際にはSupabase側で制御）

#### 対応時期
- 本番公開前に対応推奨

---

## 🎨 Vercel React Best Practices 改善タスク

### BP-1: localStorage アクセスの堅牢化
**優先度:** 低
**追加日:** 2026-02-13

- `dashboard-client.tsx` — try-catch 追加、バージョンプレフィックス追加
- `use-user-profile.tsx` — 同上
- localStorage 保存を useEffect → イベントハンドラへ移動

### BP-2: ダッシュボード再レンダリング最適化
**優先度:** 低
**追加日:** 2026-02-13

- SWRデータの useEffect → state 同期パターンを直接導出に変更
- ハイドレーションフリッカー対策

---

**最終更新:** 2026年2月13日
**更新者:** Claude Code

**注:** このバックログはPhase 0-5の基本実装完了後に順次対応します。エラーなく稼働することを最優先し、初期実装では省略します。
