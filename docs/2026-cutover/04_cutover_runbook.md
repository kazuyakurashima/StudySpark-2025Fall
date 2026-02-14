# 切替手順書（Runbook）

## 1. 概要

本ドキュメントは、2026年度の年度切替の具体的な手順書である。
初回切替は2026年2月7日に実施済み。以下は計画手順と実績を統合した記録。
事前準備から当日作業、ロールバック手順までを網羅する。

## 2. 切替タイムライン

### 2.1 全体スケジュール

> **実績**: 2026-02-07 に簡易手順で実施。以下は当初計画。次回切替時の参考として残す。

| 日付 | 時間 | イベント | 担当 |
|------|------|---------|------|
| 1/27 (月) | - | release/2025 ソフトフリーズ | 開発チーム |
| 1/29 (水) | - | 最終リハーサル | 全員 |
| 1/30 (木) | - | release/2025 ハードフリーズ | 開発チーム |
| 1/31 (金) | 18:00 | main フリーズ | 開発チーム |
| 1/31 (金) | 22:00 | 事前チェック完了 | 全員 |
| 1/31 (金) | 23:00 | Identity 移行開始 | 運用担当 |
| 2/1 (日) | 00:00 | メンテナンスモード開始 | 運用担当 |
| 2/1 (日) | 00:30 | 環境切替実施 | 運用担当 |
| 2/1 (日) | 01:00 | 動作確認開始 | 全員 |
| 2/1 (日) | 02:00 | 切替完了 or ロールバック判断 | 責任者 |
| 2/1 (日) | 06:00 | メンテナンスモード解除 | 運用担当 |

### 2.2 [Decision Needed] ダウンタイム許容

| 選択肢 | 想定ダウンタイム | リスク | 難易度 |
|--------|-----------------|--------|--------|
| **A: ホットスワップ** | 0分 | 中（データ不整合リスク） | 高 |
| **B: 計画停止** | 〜30分 | 低 | 中 |
| **C: 深夜メンテナンス** | 〜6時間 | 最低 | 低 |

**推奨: C（深夜メンテナンス）**

理由:
- 土曜深夜〜日曜早朝は利用が最も少ない
- 十分な作業時間を確保し、焦らず確実に実施
- ロールバック判断の余裕がある

## 3. 事前チェックリスト

### 3.1 1週間前（1/25まで）

#### 環境準備
- [ ] DB2026 のマスタデータ投入完了（以下の順序で実行）
  1. `seed.sql` — subjects, study_sessions, study_content_types(2026版), test_types, test_schedules
  2. マイグレーション `20260206000001` — assessment_masters 更新
  3. マイグレーション `20260206000002` — study_content_types 全面置換（新規DBでは冪等、既存DBアップグレード用）
  4. `supabase/seeds/problem_counts_2026.sql` — problem_counts 投入（1,408件）
  - 参照: [data_strategy.md](03_data_strategy.md#84-problem_counts-の投入)
- [ ] DB2026 でのステージング検証完了
- [ ] main ブランチの動作確認完了
- [ ] 新小5登録スクリプトの依存関係インストール完了
  - `pnpm add csv-parse iconv-lite`
  - `pnpm add -D @types/node`

#### ドキュメント
- [ ] 切替手順書のレビュー完了
- [ ] ロールバック手順のレビュー完了
- [ ] 連絡体制の確認

#### リハーサル
- [ ] Identity 移行リハーサル実施
- [ ] 環境切替リハーサル実施
- [ ] ロールバックリハーサル実施

### 3.2 前日（1/31）

#### 最終確認
- [ ] release/2025 と main の差分確認（未 cherry-pick がないこと）
- [ ] DB2025 のバックアップ取得
- [ ] DB2026 の状態確認（マスタデータ、スキーマ）
  - `problem_counts` が投入済みであること（1,408件）
- [ ] Vercel 環境変数の変更値を準備

#### 関係者連絡
- [ ] メンテナンス告知の掲出
- [ ] 関係者への最終連絡
- [ ] 緊急連絡先の確認

### 3.3 当日朝（2/1 作業開始前）

- [ ] 参加者の健康状態確認
- [ ] 作業環境の確認（ネットワーク、ツール）
- [ ] コミュニケーションチャネルの確認（Slack等）

## 4. 切替手順（詳細）

### Phase 0: 準備（1/31 22:00〜）

```
担当: 運用担当
所要時間: 1時間

□ 作業用端末の準備
□ 必要なクレデンシャルの確認
  - Supabase ダッシュボードアクセス
  - Vercel ダッシュボードアクセス
  - GitHub リポジトリアクセス
□ 作業ログの記録開始
□ バックアップの最終確認
```

### Phase 1: メンテナンスモード（2/1 00:00〜）

```
担当: 運用担当
所要時間: 10分

□ メンテナンスモードの有効化
  # Vercel 環境変数でメンテナンスモードを有効化
  $ vercel env add NEXT_PUBLIC_MAINTENANCE_MODE true production

  # または Vercel ダッシュボードで設定
  # Settings → Environment Variables → Production
  # NEXT_PUBLIC_MAINTENANCE_MODE = true

□ 再デプロイ（環境変数反映のため）
  $ vercel deploy --prod

□ メンテナンスページの表示確認
  □ 本番 URL にアクセスしてメンテナンスページが表示されることを確認

□ 作業ログに記録: 「メンテナンスモード開始 HH:MM」
```

### Phase 2: Identity 移行（00:05〜）

```
担当: 運用担当
所要時間: 30分（データ量による）

□ DB2025 から全データをエクスポート
  # ⚠️ 事前確認: 親子関係テーブル名を確認
  $ psql <DB2025_CONNECTION> -c "\dt public.parent*"
  # → parent_child_relations または parent_student_relationships
  #
  # ⚠️ テーブル名マッピング方針:
  #    【parent_child_relations の場合】
  #    - 通常のCOPYコマンドでOK（下記そのまま使用）
  #
  #    【parent_student_relationships の場合】
  #    - ⚠️ スキーマ変換が必要（UUID→BIGINT、profiles参照→parents参照）
  #    - ⚠️ parent_student_relationships は UUID ベース（parent_id, student_id ともに UUID）
  #    - ⚠️ 両カラムとも BIGINT への変換が必須（JOIN 必須）
  #
  #    # FK参照先の確認（student_id がどちらを指すか確認）
  #    $ psql <DB2025_CONNECTION> -c "
  #      SELECT conname, pg_get_constraintdef(oid)
  #      FROM pg_constraint
  #      WHERE conrelid = 'public.parent_student_relationships'::regclass
  #      ORDER BY conname;
  #    "
  #
  #    - 下記のエクスポートコマンドを以下に置換（パターンは student_id の参照先で選択）:
  #
  #    【パターン選択表】
  #    | パターン | student_id 参照先 | 使用例 |
  #    |---------|------------------|--------|
  #    | A | students(id) | scripts/create-parent-student-relationships.sql の定義（推奨） |
  #    | B | profiles(id) | student_id が profiles を参照する場合 |
  #
  #    【パターン選択ルール】
  #    1. FK確認結果で student_id → students(id) の場合 → パターンA を試行
  #    2. パターンAでJOINエラー（型不一致等）が発生した場合 → パターンB へ切替
  #    3. FK確認結果で student_id → profiles(id) の場合 → パターンB を使用
  #
  #    ※ parent_id は常に profiles(id) を参照するため、パターンは student_id の参照先のみで決まります
  #
  #    【パターンA: parent_id→profiles, student_id→students の場合】
  #    $ psql <DB2025_CONNECTION> -c "
  #      COPY (
  #        SELECT
  #          p.id AS parent_id,
  #          s.id AS student_id,
  #          'guardian' AS relation_type,
  #          MIN(psr.created_at) AS created_at
  #        FROM parent_student_relationships psr
  #        JOIN parents p ON p.user_id = psr.parent_id
  #        JOIN students s ON s.id = psr.student_id
  #        GROUP BY p.id, s.id
  #        ORDER BY created_at
  #      ) TO STDOUT WITH CSV HEADER
  #    " > parent_child_relations.csv
  #
  #    【パターンB: parent_id→profiles, student_id→profiles の場合】
  #    $ psql <DB2025_CONNECTION> -c "
  #      COPY (
  #        SELECT
  #          p.id AS parent_id,
  #          s.id AS student_id,
  #          'guardian' AS relation_type,
  #          MIN(psr.created_at) AS created_at
  #        FROM parent_student_relationships psr
  #        JOIN parents p ON p.user_id = psr.parent_id
  #        JOIN students s ON s.user_id = psr.student_id
  #        GROUP BY p.id, s.id
  #        ORDER BY created_at
  #      ) TO STDOUT WITH CSV HEADER
  #    " > parent_child_relations.csv
  #
  #    【変換方針の説明】
  #    - parent_id の変換: psr.parent_id (UUID) → parents.user_id 経由で parents.id (BIGINT) に変換
  #    - student_id の変換: psr.student_id (UUID) → パターンに応じて students.id (BIGINT) に変換
  #      - パターンA: students.id = psr.student_id でマッチング
  #      - パターンB: students.user_id = psr.student_id でマッチング
  #    - relation_type を 'guardian' に統一（parent → guardian へマッピング）
  #    - GROUP BY は p.id, s.id のみ（UNIQUE制約 parent_id, student_id に対応）
  #    - MIN(created_at) で最古の関係を保持（重複時）
  #    - CSV ファイル名は parent_child_relations.csv に統一（DB2026 のテーブル名に合わせる）

  # profiles 系テーブル
  $ psql <DB2025_CONNECTION> -c "COPY (SELECT * FROM profiles) TO STDOUT WITH CSV HEADER" > profiles.csv
  $ psql <DB2025_CONNECTION> -c "COPY (SELECT * FROM students) TO STDOUT WITH CSV HEADER" > students.csv
  $ psql <DB2025_CONNECTION> -c "COPY (SELECT * FROM parents) TO STDOUT WITH CSV HEADER" > parents.csv
  $ psql <DB2025_CONNECTION> -c "COPY (SELECT * FROM coaches) TO STDOUT WITH CSV HEADER" > coaches.csv
  $ psql <DB2025_CONNECTION> -c "COPY (SELECT * FROM admins) TO STDOUT WITH CSV HEADER" > admins.csv
  $ psql <DB2025_CONNECTION> -c "COPY (SELECT * FROM invitation_codes) TO STDOUT WITH CSV HEADER" > invitation_codes.csv
  $ psql <DB2025_CONNECTION> -c "COPY (SELECT * FROM parent_child_relations) TO STDOUT WITH CSV HEADER" > parent_child_relations.csv
  $ psql <DB2025_CONNECTION> -c "COPY (SELECT * FROM coach_student_relations) TO STDOUT WITH CSV HEADER" > coach_student_relations.csv

  # auth.users
  $ supabase auth export --project-ref zlipaeanhcslhintxpej > auth_users_20260201.json
  □ エクスポート件数を記録

□ DB2026 にインポート（FK 制約のため auth.users が先）
  # Step 0-1: public テーブルのクリーンアップ（テストデータがある場合）
  $ psql <DB2026_CONNECTION> -c "
    DELETE FROM public.coach_student_relations;
    DELETE FROM public.parent_child_relations;
    DELETE FROM public.invitation_codes;
    DELETE FROM public.admins;
    DELETE FROM public.coaches;
    DELETE FROM public.parents;
    DELETE FROM public.students;
    DELETE FROM public.profiles;
  "
  □ public テーブルのクリーンアップ完了を確認

  # Step 0-2: auth.users のクリーンアップ（Supabase 管理画面で事前に実施推奨）
  # ⚠️ 管理画面から手動削除が最も安全
  # または SQL で削除: psql <DB2026_CONNECTION> -c "DELETE FROM auth.users"
  # ※ CLI `supabase auth users delete --all` は未検証のため、事前にドキュメント確認を推奨
  □ auth.users が空であることを確認
    $ psql <DB2026_CONNECTION> -c "SELECT COUNT(*) FROM auth.users"  # → 0件

  # Step 1: auth.users を先にインポート（profiles.id が auth.users(id) を参照するため）
  $ supabase auth import --project-ref <DB2026_REF> < auth_users_20260201.json
  □ インポート件数を記録
  □ 件数が一致することを確認

  # Step 2: auth.users import で自動作成された profiles を削除
  $ psql <DB2026_CONNECTION> -c "DELETE FROM profiles WHERE id IN (SELECT id FROM auth.users)"

  # Step 3: profiles 系テーブルをインポート
  $ psql <DB2026_CONNECTION> -c "COPY profiles FROM STDIN WITH CSV HEADER" < profiles.csv
  $ psql <DB2026_CONNECTION> -c "COPY students FROM STDIN WITH CSV HEADER" < students.csv
  $ psql <DB2026_CONNECTION> -c "COPY parents FROM STDIN WITH CSV HEADER" < parents.csv
  $ psql <DB2026_CONNECTION> -c "COPY coaches FROM STDIN WITH CSV HEADER" < coaches.csv
  $ psql <DB2026_CONNECTION> -c "COPY admins FROM STDIN WITH CSV HEADER" < admins.csv
  $ psql <DB2026_CONNECTION> -c "COPY invitation_codes FROM STDIN WITH CSV HEADER" < invitation_codes.csv
  $ psql <DB2026_CONNECTION> -c "COPY parent_child_relations FROM STDIN WITH CSV HEADER" < parent_child_relations.csv
  $ psql <DB2026_CONNECTION> -c "COPY coach_student_relations FROM STDIN WITH CSV HEADER" < coach_student_relations.csv
  □ 各テーブルの件数を記録

□ シーケンスの更新（空テーブル対応のため COALESCE 使用）
  $ psql <DB2026_CONNECTION> -c "SELECT setval('students_id_seq', COALESCE((SELECT MAX(id) FROM students), 0), true)"
  $ psql <DB2026_CONNECTION> -c "SELECT setval('parents_id_seq', COALESCE((SELECT MAX(id) FROM parents), 0), true)"
  $ psql <DB2026_CONNECTION> -c "SELECT setval('coaches_id_seq', COALESCE((SELECT MAX(id) FROM coaches), 0), true)"
  $ psql <DB2026_CONNECTION> -c "SELECT setval('admins_id_seq', COALESCE((SELECT MAX(id) FROM admins), 0), true)"
  $ psql <DB2026_CONNECTION> -c "SELECT setval('invitation_codes_id_seq', COALESCE((SELECT MAX(id) FROM invitation_codes), 0), true)"
  $ psql <DB2026_CONNECTION> -c "SELECT setval('parent_child_relations_id_seq', COALESCE((SELECT MAX(id) FROM parent_child_relations), 0), true)"
  $ psql <DB2026_CONNECTION> -c "SELECT setval('coach_student_relations_id_seq', COALESCE((SELECT MAX(id) FROM coach_student_relations), 0), true)"

□ 卒業対象を CSV に出力（繰り上げ前）
  $ psql <DB2026_CONNECTION> -c "
    COPY (
      SELECT s.id, s.user_id, au.email, p.display_name
      FROM students s
      JOIN profiles p ON s.user_id = p.id
      JOIN auth.users au ON p.id = au.id
      WHERE s.grade = 6
      ORDER BY s.id
    ) TO STDOUT WITH CSV HEADER
  " > graduating_students_20260201.csv
  □ 件数を記録（ヘッダー除く）: $ tail -n +2 graduating_students_20260201.csv | wc -l → ___ 件

□ 学年繰り上げの実行
  $ psql <DB2026_CONNECTION> -c "UPDATE students SET grade = 6 WHERE grade = 5"
  □ 更新件数を記録: ___ 件

□ 卒業処理（選択肢B: 無効化を採用）
  # 専用スクリプトで BAN 実行
  $ npx tsx scripts/ban-graduated-users.ts graduating_students_20260201.csv
  □ BAN 完了件数を記録: ___ 件
  □ エラーがあれば記録

□ 整合性チェック（SQLで即時確認）
  $ psql <DB2026_CONNECTION> -c "SELECT COUNT(*) FROM auth.users"
  $ psql <DB2026_CONNECTION> -c "SELECT COUNT(*) FROM profiles"
  $ psql <DB2026_CONNECTION> -c "SELECT COUNT(*) FROM students"
  $ psql <DB2026_CONNECTION> -c "SELECT COUNT(*) FROM admins"
  $ psql <DB2026_CONNECTION> -c "SELECT grade, COUNT(*) FROM students GROUP BY grade"
  $ psql <DB2026_CONNECTION> -c "SELECT COUNT(*) FROM parent_child_relations WHERE student_id NOT IN (SELECT id FROM students)"
  □ 主要件数・整合性が問題ないことを確認

□ 卒業処理の事後確認（⚠️ 必須: 指導者画面への旧生徒表示を防止）
  # 卒業対象が coach_student_relations から除外されているか確認
  $ psql <DB2026_CONNECTION> -c "
    SELECT csr.student_id, s.full_name
    FROM coach_student_relations csr
    JOIN students s ON s.id = csr.student_id
    WHERE csr.student_id IN (
      SELECT student_id FROM _backup_graduated_csr
    )
  "
  □ 結果が 0 件であること（残存している場合は relation 削除を再実施）

  # BAN 状態の確認（卒業対象の auth.users.banned_until が設定済みか）
  $ psql <DB2026_CONNECTION> -c "
    SELECT au.email, au.banned_until, s.full_name
    FROM students s
    JOIN auth.users au ON au.id = s.user_id
    WHERE s.id IN (SELECT student_id FROM _backup_graduated_csr)
    ORDER BY au.banned_until NULLS FIRST
  "
  □ 全員の banned_until が設定済みであること（NULL がある場合は BAN を再実施）

  # 注意: 卒業生の判定に students.grade は使用しない
  # 繰り上げ後は grade=6 に現役生も含まれるため、
  # 卒業対象リスト（graduating_students_*.csv / _backup_graduated_*）を基準にする
  # 詳細: 03_data_strategy.md セクション 7.2
```

### Phase 2.5: 新小5生徒登録（00:35〜）

```
担当: 運用担当
所要時間: 10分

⚠️ 前提条件:
- 新小5生徒のCSVファイルを準備（生徒保護者情報アカウント.csv）
- 依存関係がインストール済み（事前準備で確認済み）

□ 新小5生徒登録スクリプトの実行
  $ npx tsx scripts/register-grade5-students.ts ~/Downloads/生徒保護者情報アカウント.csv

  □ 確認プロンプトで登録内容を確認
  □ Enter キーで登録開始

  □ 実行結果を確認:
    - Success: ___ 件（期待値: 5件）
    - Failure: ___ 件（期待値: 0件）

  □ 失敗があった場合:
    - エラーメッセージを記録
    - **重複エラーの場合**:
      - 保護者メールアドレス重複: 該当の保護者アカウントが既に存在
      - 生徒ログインID重複: 該当の生徒アカウントが既に存在
      - → スキップして次の生徒へ進む（重複データは上書きされない）
    - **その他のエラーの場合**:
      - スクリプトが自動ロールバックを試みる（ベストエフォート）
      - 部分的に作成されたデータは削除される
      - エラー内容を確認し、必要に応じて手動で再実行

□ シーケンスの手動更新（必須）
  スクリプト終了時に表示される SQL を実行:

  $ psql <DB2026_CONNECTION> -c "SELECT setval('students_id_seq', COALESCE((SELECT MAX(id) FROM students), 0), true);"
  $ psql <DB2026_CONNECTION> -c "SELECT setval('parents_id_seq', COALESCE((SELECT MAX(id) FROM parents), 0), true);"
  $ psql <DB2026_CONNECTION> -c "SELECT setval('parent_child_relations_id_seq', COALESCE((SELECT MAX(id) FROM parent_child_relations), 0), true);"

  □ すべて成功したことを確認

□ 登録確認
  $ psql <DB2026_CONNECTION> -c "SELECT grade, COUNT(*) FROM students GROUP BY grade ORDER BY grade;"
  □ 小5が5件増えていることを確認

  $ psql <DB2026_CONNECTION> -c "SELECT COUNT(*) FROM parents;"
  □ 保護者が5件増えていることを確認

  $ psql <DB2026_CONNECTION> -c "SELECT COUNT(*) FROM parent_child_relations;"
  □ 親子関係が5件増えていることを確認

□ 作業ログに記録: 「新小5登録完了 HH:MM、登録件数: ___ 件」
```

### Phase 3: 環境切替（00:45〜）

> **実績ノート (2026-02-10)**:
> 当初計画では新規 DB2026 プロジェクトへの環境変数切替を想定していたが、
> 実際には **既存本番DB に対する直接更新** で2026年度移行を実施した。
> - `study_sessions`: マイグレーション `20260210000001` を SQL Editor で手動実行（2026-02-10、38行確認済み）
> - `study_content_types`: 109件確認済み（2026-02-10 時点）。投入経路は未記録（seed.sql 実行 or 手動投入の可能性あり）
> - `problem_counts`: 1,408件確認済み（2026-02-10 時点）。投入経路は未記録
> - 環境変数の切替は **実施せず**（同一 Supabase プロジェクトを継続使用）
>
> 以下の手順は当初計画として参考に残す。

```
担当: 運用担当
所要時間: 15分（00:45〜01:00）

□ Vercel 環境変数の変更
  1. Vercel ダッシュボード → Settings → Environment Variables
  2. Production 環境の変数を更新:
     NEXT_PUBLIC_SUPABASE_URL      → <DB2026_URL>
     NEXT_PUBLIC_SUPABASE_ANON_KEY → <DB2026_ANON_KEY>
     SUPABASE_SERVICE_ROLE_KEY     → <DB2026_SERVICE_ROLE_KEY>
  □ 変更内容をスクリーンショットで記録

□ Production ブランチの変更
  1. Vercel ダッシュボード → Settings → Git
  2. Production Branch を release/2025 → main に変更
  □ 変更をスクリーンショットで記録

□ 再デプロイの実行
  1. Deployments → 最新の main ビルドを Production に Promote
  または
  2. $ vercel --prod
  □ デプロイ完了を確認
  □ デプロイURLを記録
```

### Phase 4: 動作確認（01:00〜）

```
担当: 全員
所要時間: 50分（01:00〜01:50）

□ 基本動作確認
  - [ ] トップページの表示
  - [ ] ログインページの表示

□ 生徒機能
  - [ ] 生徒ログイン（テストアカウント）
  - [ ] ダッシュボード表示
  - [ ] Spark（学習記録）入力
  - [ ] 目標設定画面表示
  - [ ] 振り返り画面表示

□ 保護者機能
  - [ ] 保護者ログイン（テストアカウント）
  - [ ] ダッシュボード表示
  - [ ] 子どもの学習状況表示

□ 指導者機能
  - [ ] 指導者ログイン（テストアカウント）
  - [ ] ダッシュボード表示
  - [ ] 生徒一覧表示
  - [ ] 得点入力機能

□ マスタデータ確認
  - [ ] 学習回が2026年度版であること（小5: 20回、小6: 18回）
  - [ ] テスト日程が2026年度版であること
  - [ ] 科目・単元が正しく表示されること
  - [ ] 問題数データ（`problem_counts`）が投入済みであること（1,408件）
    - 確認: 学習記録入力画面で「◯問中◯問」が正しく表示されること

□ API動作確認
  - [ ] AIコーチメッセージの生成
  - [ ] Cron Job の動作確認（手動トリガー）

□ エラー監視
  - [ ] Sentry にエラーが出ていないこと
  - [ ] Vercel ログにエラーが出ていないこと
```

### Phase 5: 完了判定（01:50〜）

```
担当: 責任者
所要時間: 10分

□ 動作確認結果のレビュー
  - 全項目 PASS: → Phase 6 へ
  - 致命的な問題あり: → ロールバック手順へ
  - 軽微な問題のみ: → 継続 + 後日修正

□ 完了判定の記録
  □ 判定結果: [完了 / ロールバック]
  □ 判定時刻: HH:MM
  □ 判定理由:
```

### Phase 6: 完了処理（02:00〜）

```
担当: 運用担当
所要時間: 10分

□ メンテナンスモードの解除
  # Vercel 環境変数でメンテナンスモードを無効化
  $ vercel env rm NEXT_PUBLIC_MAINTENANCE_MODE production

  # または Vercel ダッシュボードで削除/false に設定

  # 再デプロイ（環境変数反映のため）
  $ vercel deploy --prod

  □ ユーザーアクセス可能を確認
  □ 通常ページが表示されることを確認

□ 完了告知
  □ メンテナンス完了の告知
  □ 関係者への完了連絡

□ 後処理
  □ release/2025 ブランチのアーカイブ（タグ化）
  □ 作業ログの保存
  □ 振り返りミーティングの日程調整
```

## 5. ロールバック手順

### 5.1 ロールバック判断基準

| 基準 | 判断 |
|------|------|
| ログインできない | ロールバック |
| 主要機能が動作しない | ロールバック |
| データ不整合が発生 | ロールバック |
| 軽微なUI問題のみ | 継続（後日修正） |
| パフォーマンス低下のみ | 継続（後日対応） |

### 5.2 ロールバック手順

```
担当: 運用担当
所要時間: 15分

□ Vercel 環境変数を DB2025 に戻す
  NEXT_PUBLIC_SUPABASE_URL      → <DB2025_URL>
  NEXT_PUBLIC_SUPABASE_ANON_KEY → <DB2025_ANON_KEY>
  SUPABASE_SERVICE_ROLE_KEY     → <DB2025_SERVICE_ROLE_KEY>

□ Production ブランチを release/2025 に戻す

□ 再デプロイ

□ 動作確認
  - [ ] ログイン可能
  - [ ] 主要機能動作

□ ロールバック完了の記録
  □ 時刻: HH:MM
  □ 原因:
  □ 今後の対応:
```

### 5.3 ロールバック後の対応

```
1. 原因分析
   - 何が問題だったか
   - 事前に検知できなかった理由

2. 修正計画
   - 問題の修正
   - 再リハーサル

3. 再切替日程の調整
   - 翌週末など
```

## 6. 監視・検証項目

### 6.1 切替後24時間の監視

| 項目 | 頻度 | 担当 |
|------|------|------|
| Sentry エラー監視 | 1時間ごと | 運用担当 |
| Vercel ログ確認 | 1時間ごと | 運用担当 |
| ユーザー問い合わせ | 随時 | サポート担当 |
| パフォーマンス監視 | 2時間ごと | 運用担当 |

### 6.2 監視対象メトリクス

```
- エラー率: < 1%
- レスポンスタイム: < 3秒（95パーセンタイル）
- ログイン成功率: > 99%
- API成功率: > 99%
```

## 7. 連絡体制

### 7.1 緊急連絡先

| 役割 | 担当者 | 連絡先 |
|------|--------|--------|
| 責任者 | (記入) | (記入) |
| 運用担当 | (記入) | (記入) |
| 開発担当 | (記入) | (記入) |
| サポート担当 | (記入) | (記入) |

### 7.2 コミュニケーションチャネル

- 主: Slack #2026-cutover
- 副: 電話

### 7.3 エスカレーションルール

```
問題発生
  ↓ 5分以内に判断できない
運用担当 → 開発担当に相談
  ↓ 10分以内に解決できない
開発担当 → 責任者に報告
  ↓ ロールバック判断
責任者が最終決定
```

## 8. 更新履歴

| 日付 | 更新者 | 内容 |
|------|--------|------|
| 2026-01-02 | Claude Code | 初版作成 |
| 2026-01-03 | Claude Code | 親子関係変換SQL修正（GROUP BY不整合解消、パターンA/Bのみに限定） |
