# 6か月アップスキル計画（偏差値60到達向け）

## 目的

AI活用を維持しながら、実装速度と本番品質を両立できる開発者へ成長する。
6か月後に以下を安定達成する。

- `pnpm exec tsc --noEmit` エラー 0
- `pnpm lint` warning 30 以下
- 認証/認可漏れ API 0
- 主要機能の正常系/異常系テスト整備
- PRごとの品質ゲート（lint/type/test/build）通過を運用定着

## 期間・前提

- 期間: 24週間（6か月）
- 学習時間: 週10〜12時間
- 実践対象: 本リポジトリ
- 作業方式: 毎週 `feature/*` ブランチで小さく実装し、PRで統合
- テスト基盤: Vitest 導入済み（テスト3件）。テスト拡充は早期に着手
- AI API: OpenAI → Gemini 移行予定（$10/月 API）。移行作業はカリキュラムに含む

## KPI（毎週トラッキング）

1. `pnpm exec tsc --noEmit` のエラー数
2. `pnpm lint` の warning 数
3. `pnpm test` のテスト数と成功率
4. 認証/認可漏れ API 数
5. 1 PR あたりの差分行数（目安 300行以下）

## 週次カリキュラム（実装順）

> **運用ルール:** 各週の開始時に「対象ファイルまたはコンポーネント」「成果物の形式」を事前に決定する。
> 合格条件の曖昧な週は、具体的な対象を1つ以上明示してから着手すること。

| 週 | テーマ | 実装課題 | 合格条件 |
|---|---|---|---|
| 1 | 現状可視化 | `tsc/lint/test/build` 実行、基準値固定 | 4コマンド結果を記録 |
| 2 | **セキュリティ P0-1** | `reset-student-password` API Route 廃止→Server Action 内製化 + 認証ヘルパー作成 | API Route 削除（404）+ Server Action の認可テスト通過（保護者: 親子関係検証、不正ロール: 拒否） |
| 3 | **セキュリティ P0-2** | 残り7本の API 認証追加 + CRON_SECRET 修正 | 全 API Route の認証漏れ 0 |
| 4 | **セキュリティ P0-3 + ビルド** | 機密ログ削減 + ビルドゲート復元 | 機密 `JSON.stringify` 0、`ignoreBuildErrors: false` |
| 5 | TypeScript基礎1 | `any` を20件削減 | `any` 純増 0 |
| 6 | TypeScript基礎2 | `unknown + guard` への置換 | 型ガード関数を3つ追加 |
| 7 | TypeScript基礎3 | union/discriminated union 適用 | `as any` を主要箇所で除去 |
| 8 | JS/React基礎1 | state/effect 整理（1画面） | 不要 effect を2件以上削減 |
| 9 | JS/React基礎2 + テスト入門 | 巨大ファイル分割（1画面）+ テスト1本追加 | 対象ファイルを500行以下へ分割、Vitest テスト追加 |
| 10 | React設計1 | props型と責務分離 | Container/Presentational 分離1画面（対象を事前選定） |
| 11 | React設計2 | 再レンダリング最適化 | 不要な `useMemo/useCallback` を計測して3件以上整理 |
| 12 | Next.js基礎1 | Server/Client境界見直し | 不要 `use client` の削減 |
| 13 | Next.js基礎2 | error boundary 整備 | `app/*/error.tsx` を整備 |
| 14 | Next.js基礎3 + Gemini移行 | API入力検証 + AI APIプロバイダー移行検証 | 主要API 3本に `zod` 導入、Gemini SDK 接続テスト。**前提: セキュリティ KPI（認証漏れ API 0）が安定していること** |
| 15 | Next.js基礎4 + Gemini移行 | 動的/静的方針の棚卸し + Gemini本番切替 | 静的化候補リスト（markdown）作成、AI API切替完了 |
| 16 | Supabase設計1 | DB設計見直し | ER図と正規化方針更新（markdown + mermaid） |
| 17 | Supabase設計2 | migration実装 | migration 1本を安全適用 |
| 18 | Supabase設計3 | RLS棚卸し | テーブル別RLSマトリクス（markdown表）作成 |
| 19 | Supabase設計4 | RLS強化 | 重要テーブルのRLS改善 |
| 20 | 品質基盤1 | 認証テスト拡充 | 全認証付きAPIの正常系/異常系テスト |
| 21 | 品質基盤2 | API異常系テスト拡張 | 主要APIの異常系テスト追加 |
| 22 | 品質基盤3 | CI整備 | lint/type/test/build を必須化 |
| 23 | AI活用運用1 | AI実装 + 人間レビュー標準化 | PRテンプレ運用開始 |
| 24 | AI活用運用2 | 総合リファクタと振り返り | KPI改善レポート提出 |

## AI活用を維持した品質プロセス（毎週固定）

1. Issueに受け入れ条件、認可要件、失敗時挙動、テスト観点を先に記述
2. 実装前に30分で自力設計し、その後AIでドラフト作成
3. AI出力は必ず手動で認証、認可、入力検証、例外処理をレビュー
4. PR前に以下4コマンドを必ず実行

```bash
pnpm exec tsc --noEmit
pnpm lint
pnpm test
pnpm build
```

5. 1PR1目的、差分は小さく維持
6. 週次で「再発原因」「予防策」を記録し、チェックリストへ反映

## マイルストーン

### Month 1（週1-4）
- **セキュリティ P0 を即時解消**（認証漏れ API 封鎖、CRON修正、機密ログ削減）
- ビルドゲート復元
- 本番環境の安全性を最優先で確保

### Month 2（週5-8）
- 型エラー削減の基盤構築
- `any` 依存から脱却開始

### Month 3（週9-12）
- React設計と保守性向上
- 巨大コンポーネントの分割着手
- テスト拡充を開始

### Month 4（週13-16）
- Next.js運用力向上
- エラーハンドリングとAPI境界強化
- Gemini 移行（OpenAI → Gemini）

### Month 5（週17-20）
- Supabase設計/RLS強化
- データアクセスの安全性向上
- 認証テスト拡充

### Month 6（週21-24）
- テストとCIを定着
- AI活用プロセスを運用として固定化

## 完了判定

- 4コマンド（type/lint/test/build）を毎週通過
- 認証/認可漏れ API が 0
- KPI が 4週連続で改善傾向
- 変更時に品質ゲートを壊さない運用が定着
