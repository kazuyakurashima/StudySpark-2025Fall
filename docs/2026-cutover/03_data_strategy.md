# データ戦略

## 1. 概要

年度切替において、データは以下の3種類に分類され、それぞれ異なる扱いが必要となる。
本ドキュメントでは、データ分類・移行方針・学年繰り上げの設計を定義する。

## 2. データ分類

### 2.1 分類定義

| 分類 | 定義 | 年度切替時の扱い |
|------|------|-----------------|
| **Identity** | ユーザー認証・プロフィール・関連付け | DB2026へ移行 |
| **Master** | 学習コンテンツの定義（年度依存） | DB2026で新規作成 |
| **Log** | 学習履歴・メッセージ等の蓄積データ | [Decision Needed] |

### 2.2 テーブル分類一覧

#### Identity データ（移行対象）

| テーブル | 説明 | 移行方法 |
|---------|------|---------|
| `auth.users` | Supabase認証ユーザー | Auth Export/Import |
| `profiles` | ユーザープロフィール | SQL Export/Import |
| `students` | 生徒詳細情報 | SQL Export/Import + 学年繰り上げ |
| `parents` | 保護者詳細情報 | SQL Export/Import |
| `coaches` | 指導者詳細情報 | SQL Export/Import |
| `admins` | 管理者詳細情報 | SQL Export/Import |
| `parent_child_relations` | 保護者-生徒関連 | SQL Export/Import |
| `coach_student_relations` | 指導者-生徒関連 | SQL Export/Import |

#### Master データ（新規作成）

| テーブル | 説明 | 2026年度対応 |
|---------|------|-------------|
| `subjects` | 科目マスタ | 変更なし（共通） |
| `study_content_types` | 学習内容タイプ | **2026年度カリキュラム変更に伴い全面置換**（マイグレーションで DELETE→INSERT） |
| `study_sessions` | 学習回マスタ | 2026年度版を投入（期間情報更新） |
| `problem_counts` | 問題数マスタ | 2026年度版を投入（学年・回数に合わせて更新）※段階的投入 |
| `assessment_masters` | テスト・プリントマスタ（算数プリント・漢字テスト） | **2026年度対応が必要**（マイグレーション更新：5年19回→20回、6年15回→18回） |
| `test_schedules` | テスト日程マスタ | 2026年度版を投入 |
| `test_types` | テスト種別マスタ | 変更なし（共通） |

#### Log データ（判断が必要）

| テーブル | 説明 | 検討事項 |
|---------|------|---------|
| `study_logs` | 学習記録 | 過年度参照が必要か？ |
| `goals` | 目標設定 | 過年度参照が必要か？ |
| `goal_weekly_feelings` | 週次の気持ち | 2025年度で完結 |
| `coaching_sessions` | AIコーチング履歴 | 過年度参照が必要か？ |
| `encouragement_messages` | 応援メッセージ | 過年度参照が必要か？ |
| `notifications` | 通知 | 移行不要（新年度でリセット） |
| `class_assessments` | テスト結果 | 過年度参照が必要か？ |
| `past_exam_results` | 過去問結果 | 過年度参照が必要か？ |
| `user_events` | ユーザーイベント | 移行不要 |
| `audit_logs` | 監査ログ | DB2025に保持 |

## 3. [Decision Needed] 過年度データの参照可否

### 3.1 選択肢

| 選択肢 | 説明 | メリット | デメリット |
|--------|------|---------|-----------|
| **A: 参照不要** | Log データは DB2025 に残し、DB2026 には移行しない | シンプル、データ量削減 | 過去の学習履歴が見られない |
| **B: 参照必要** | Log データも DB2026 に移行、または DB2025 を参照専用として残す | 継続性、分析可能 | 複雑性増加、データ量増加 |

### 3.2 選択肢B を採用する場合の設計案

#### B-1: Log データを DB2026 に移行

```
DB2026
├── Identity データ（移行）
├── Master データ（2026年度版）
└── Log データ（2025年度分も移行）
    └── academic_year カラムで年度識別
```

- 利点: 単一DBで完結
- 欠点: データ量増加、移行時間増加

#### B-2: DB2025 を参照専用として残す

```
DB2026 (本番)
├── Identity データ
├── Master データ（2026年度版）
└── Log データ（2026年度分のみ）

DB2025 (参照専用)
├── Log データ（2025年度分）
└── RLS: 読み取り専用ポリシー
```

- 利点: 移行がシンプル、DB2025 を保護
- 欠点: アプリが2DB参照、クエリが複雑化

### 3.3 推奨案

**選択肢A（参照不要）** を基本とし、必要に応じて B-2（DB2025参照専用）へ拡張可能な設計を採用。

理由:
- 2025年度は1年間（実質5ヶ月）の運用
- 過去データ参照のユースケースが限定的
- シンプルな構成で切替リスクを最小化
- 必要になった場合に DB2025 への参照を追加可能

## 4. DB2026 への投入タイミング

### 4.1 1月中に入れて良いもの

| データ種別 | タイミング | 理由 |
|-----------|-----------|------|
| Master データ（2026年度版） | 1月上旬〜中旬 | 開発・検証に必要 |
| テスト用 Identity データ | 1月上旬 | 開発・検証に必要 |
| シードデータ | 随時 | 開発用ダミーデータ |

### 4.2 1月中に入れない方が良いもの

| データ種別 | 理由 | 投入タイミング |
|-----------|------|---------------|
| 本番 Identity データ | 1月中も DB2025 で更新される | 2/1 直前（1/31夜 or 2/1早朝） |
| 本番 Log データ | 同上 | 2/1 直前（移行する場合のみ） |

### 4.3 データ投入スケジュール案

```
1月第1週: DB2026 プロジェクト作成、スキーマ適用
1月第2週: Master データ（2026年度版）投入開始
1月第3週: Master データ投入完了、検証
1月第4週: Identity 移行リハーサル
1/31夜〜2/1早朝: 本番 Identity 一括移行
```

### 4.4 [Decision Needed] 1月中のDB2025→DB2026 日次同期の要否

#### 選択肢

| 選択肢 | 説明 | メリット | デメリット |
|--------|------|---------|-----------|
| **A: 同期不要** | 切替直前（1/31夜）のみIdentity一括移行 | シンプル、混線リスク最小 | 開発中の検証が本番データで行えない |
| **B: 日次同期が必要** | 毎日DB2025→DB2026へIdentity同期 | 本番に近いデータで検証可能 | 複雑性増加、同期ミスリスク |

#### 推奨案: A（同期不要）

**理由:**
- DB2026 は1月中は「マスタデータ整備の工事現場」として扱う
- Identity データは切替直前まで DB2025 で更新が続く
- 同期機構を作るコストとリスクが見合わない
- テスト用 Identity データで十分な検証が可能

#### 選択肢B を採用する場合の考慮事項

```
- 同期スクリプトの開発・テストが必要
- 同期失敗時の検知・対応手順が必要
- DB2026 のデータが「本番ではない」ことの識別が必要
- 同期タイミング（毎日深夜等）の設定
```

**注記:** 本計画は選択肢A（同期不要）を前提に策定されている。
選択肢Bを採用する場合、TASKS.md にタスク追加が必要。

## 5. Identity データ移行

### 5.1 移行対象

```
auth.users (Supabase Auth)
    ↓
profiles → students / parents / coaches / admins
    ↓
parent_child_relations
coach_student_relations
```

### 5.2 移行手順（概念設計）

#### Step 1: DB2025 からデータエクスポート

**重要**: すべてのデータを先にエクスポートしてから、Step 2 で順序正しくインポートする。

**⚠️ 事前確認必須**: 本番DB2025の親子関係テーブル名を確認してください。
```bash
# テーブル名確認（parent_child_relations または parent_student_relationships のどちらか）
psql <DB2025_CONNECTION> -c "\dt public.parent*"
```

**テーブル名マッピング方針（重要）:**
- **DB2026**: マイグレーションで `parent_child_relations` が作成される（固定）
- **DB2025**: `parent_child_relations` または `parent_student_relationships` の可能性あり
- **方針**: DB2025 の実テーブル名とスキーマを確認し、必要に応じて変換

**⚠️ DB2025 が `parent_child_relations` の場合（単純コピー）:**
- 通常の CSV エクスポート/インポートでOK
- `COPY (SELECT * FROM parent_child_relations) TO STDOUT WITH CSV HEADER > parent_child_relations.csv`

**⚠️ DB2025 が `parent_student_relationships` の場合（変換必要）:**

**スキーマの違い:**
| 項目 | parent_student_relationships (旧) | parent_child_relations (新) |
|------|----------------------------------|----------------------------|
| 主キー | id UUID | id BIGSERIAL |
| parent_id | UUID REFERENCES profiles(id) | BIGINT REFERENCES parents(id) |
| student_id | UUID REFERENCES students(id) | BIGINT REFERENCES students(id) |
| カラム名 | relationship_type | relation_type |
| 値 | 'parent', 'guardian' | 'father', 'mother', 'guardian' |

**⚠️ 重要: DB2025の実スキーマ確認が必須**

変換SQLを実行する前に、以下を確認してください:
```bash
# DB2025 の parent_student_relationships の外部キー定義を確認
psql <DB2025_CONNECTION> -c "
  SELECT
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS definition
  FROM pg_constraint
  WHERE conrelid = 'public.parent_student_relationships'::regclass
  ORDER BY conname;
"
```

**⚠️ 重要: parent_student_relationships は UUID ベース**

`parent_student_relationships` テーブルは以下のスキーマです：
- `parent_id UUID` → `profiles(id)` を参照（常に）
- `student_id UUID` → `students(id)` または `profiles(id)` を参照
- 両カラムとも UUID のため、**両方とも BIGINT への変換が必須**

FK 参照先の確認（`student_id` がどちらを指すか確認）:
```bash
psql <DB2025_CONNECTION> -c "
  SELECT conname, pg_get_constraintdef(oid)
  FROM pg_constraint
  WHERE conrelid = 'public.parent_student_relationships'::regclass
  ORDER BY conname;
"
```

**変換SQL パターン選択表:**
| パターン | student_id 参照先 | 使用例 |
|---------|------------------|--------|
| A | students(id) | scripts/create-parent-student-relationships.sql の定義（推奨） |
| B | profiles(id) | student_id が profiles を参照する場合 |

**パターン選択ルール:**
1. FK確認結果で student_id → students(id) の場合 → **パターンA を試行**
2. パターンAでJOINエラー（型不一致等）が発生した場合 → **パターンB へ切替**
3. FK確認結果で student_id → profiles(id) の場合 → **パターンB を使用**

**注**: parent_id は常に profiles(id) を参照するため、パターンは student_id の参照先のみで決まります。

**変換SQL パターンA:**
parent_id → profiles(id) [UUID], student_id → students(id) [UUID]

```bash
psql <DB2025_CONNECTION> -c "
  COPY (
    SELECT
      p.id AS parent_id,
      s.id AS student_id,
      'guardian' AS relation_type,
      MIN(psr.created_at) AS created_at
    FROM parent_student_relationships psr
    JOIN parents p ON p.user_id = psr.parent_id
    JOIN students s ON s.id = psr.student_id
    GROUP BY p.id, s.id
    ORDER BY created_at
  ) TO STDOUT WITH CSV HEADER
" > parent_child_relations.csv
```

**変換SQL パターンB:**
parent_id → profiles(id) [UUID], student_id → profiles(id) [UUID]

```bash
psql <DB2025_CONNECTION> -c "
  COPY (
    SELECT
      p.id AS parent_id,
      s.id AS student_id,
      'guardian' AS relation_type,
      MIN(psr.created_at) AS created_at
    FROM parent_student_relationships psr
    JOIN parents p ON p.user_id = psr.parent_id
    JOIN students s ON s.user_id = psr.student_id
    GROUP BY p.id, s.id
    ORDER BY created_at
  ) TO STDOUT WITH CSV HEADER
" > parent_child_relations.csv
```

**変換方針:**
- **parent_id の変換**: `psr.parent_id` (UUID) → `parents.user_id` 経由で `parents.id` (BIGINT) に変換
- **student_id の変換**: `psr.student_id` (UUID) → パターンに応じて `students.id` (BIGINT) に変換
  - パターンA: `students.id = psr.student_id` でマッチング
  - パターンB: `students.user_id = psr.student_id` でマッチング
- **relation_type**: 'parent' / 'guardian' → 'guardian' に統一（性別情報なし）
- **重複排除**: `GROUP BY p.id, s.id` のみ（UNIQUE制約 parent_id, student_id に対応）
- **created_at**: 重複時は `MIN(created_at)` で最古の日時を採用
- **CSV ファイル名**: `parent_child_relations.csv` に統一（DB2026 のテーブル名に合わせる）

```bash
# DB2025 からエクスポート（サーバ側ファイル保存は不可のため STDOUT を使用）
psql <DB2025_CONNECTION> -c "COPY (SELECT * FROM profiles) TO STDOUT WITH CSV HEADER" > profiles.csv
psql <DB2025_CONNECTION> -c "COPY (SELECT * FROM students) TO STDOUT WITH CSV HEADER" > students.csv
psql <DB2025_CONNECTION> -c "COPY (SELECT * FROM parents) TO STDOUT WITH CSV HEADER" > parents.csv
psql <DB2025_CONNECTION> -c "COPY (SELECT * FROM coaches) TO STDOUT WITH CSV HEADER" > coaches.csv
psql <DB2025_CONNECTION> -c "COPY (SELECT * FROM admins) TO STDOUT WITH CSV HEADER" > admins.csv
psql <DB2025_CONNECTION> -c "COPY (SELECT * FROM invitation_codes) TO STDOUT WITH CSV HEADER" > invitation_codes.csv
psql <DB2025_CONNECTION> -c "COPY (SELECT * FROM parent_child_relations) TO STDOUT WITH CSV HEADER" > parent_child_relations.csv
psql <DB2025_CONNECTION> -c "COPY (SELECT * FROM coach_student_relations) TO STDOUT WITH CSV HEADER" > coach_student_relations.csv

# auth.users のエクスポート（Supabase CLI を使用）
supabase auth export --project-ref zlipaeanhcslhintxpej > auth_users_20260201.json
```

#### Step 2: DB2026 へのインポート

**重要な順序制約**: profiles.id は auth.users(id) への外部キーのため、必ず auth.users を先にインポート。

**前提条件**: DB2026 の Identity テーブル（auth.users, profiles, students, parents 等）は **完全に空** であること。
- ステージング環境でテストユーザーが存在する場合、事前に全削除が必要
- 混入すると ID 衝突・孤児レコード・権限不整合のリスクあり

```bash
# 2-0. DB2026 の既存 Identity データをクリーンアップ（事前確認必須）
# ⚠️ 以下のコマンドは DB2026 にテストデータがある場合のみ実行

# Step 1: public スキーマのテーブルを削除（CASCADE で関連も削除される）
psql <DB2026_CONNECTION> -c "
  DELETE FROM public.coach_student_relations;
  DELETE FROM public.parent_child_relations;
  DELETE FROM public.invitation_codes;
  DELETE FROM public.admins;
  DELETE FROM public.coaches;
  DELETE FROM public.parents;
  DELETE FROM public.students;
  DELETE FROM public.profiles;
"

# Step 2: auth.users を削除（Supabase 管理画面または CLI）
# 方法A: 管理画面から手動削除（推奨）
#   - Supabase Dashboard → Authentication → Users → すべて選択して削除
# 方法B: Supabase CLI（全ユーザー一括削除）
#   ⚠️ 本番環境では絶対に実行しないこと
#   ⚠️ このコマンドの動作は未検証。実行前に Supabase CLI ドキュメントで確認推奨
#   supabase auth users delete --all --project-ref <DB2026_REF>
# 方法C: SQL で削除（動作するかは環境依存）
#   psql <DB2026_CONNECTION> -c "DELETE FROM auth.users"

# Step 3: 削除完了確認
psql <DB2026_CONNECTION> -c "SELECT COUNT(*) FROM auth.users"  # 0件であること
psql <DB2026_CONNECTION> -c "SELECT COUNT(*) FROM profiles"     # 0件であること

# 2-1. auth.users を最初にインポート（FK 制約のため必須）
supabase auth import --project-ref <DB2026_REF> < auth_users_20260201.json

# 2-2. auth.users import により自動作成された profiles を削除
# （DB2025 の profiles データで上書きするため）
psql <DB2026_CONNECTION> -c "DELETE FROM profiles WHERE id IN (SELECT id FROM auth.users)"

# 2-3. profiles 系テーブルをインポート
psql <DB2026_CONNECTION> -c "COPY profiles FROM STDIN WITH CSV HEADER" < profiles.csv
psql <DB2026_CONNECTION> -c "COPY students FROM STDIN WITH CSV HEADER" < students.csv
psql <DB2026_CONNECTION> -c "COPY parents FROM STDIN WITH CSV HEADER" < parents.csv
psql <DB2026_CONNECTION> -c "COPY coaches FROM STDIN WITH CSV HEADER" < coaches.csv
psql <DB2026_CONNECTION> -c "COPY admins FROM STDIN WITH CSV HEADER" < admins.csv
psql <DB2026_CONNECTION> -c "COPY invitation_codes FROM STDIN WITH CSV HEADER" < invitation_codes.csv
psql <DB2026_CONNECTION> -c "COPY parent_child_relations FROM STDIN WITH CSV HEADER" < parent_child_relations.csv
psql <DB2026_CONNECTION> -c "COPY coach_student_relations FROM STDIN WITH CSV HEADER" < coach_student_relations.csv
```

#### Step 2.5: シーケンスの更新

BIGSERIAL カラムのシーケンスを現在の最大値に更新（次回 INSERT 時の ID 重複を防ぐ）。

**注意**: 空テーブルの場合 MAX(id) が NULL となり setval が失敗するため、COALESCE で 0 にフォールバック。

```bash
psql <DB2026_CONNECTION> -c "SELECT setval('students_id_seq', COALESCE((SELECT MAX(id) FROM students), 0), true)"
psql <DB2026_CONNECTION> -c "SELECT setval('parents_id_seq', COALESCE((SELECT MAX(id) FROM parents), 0), true)"
psql <DB2026_CONNECTION> -c "SELECT setval('coaches_id_seq', COALESCE((SELECT MAX(id) FROM coaches), 0), true)"
psql <DB2026_CONNECTION> -c "SELECT setval('admins_id_seq', COALESCE((SELECT MAX(id) FROM admins), 0), true)"
psql <DB2026_CONNECTION> -c "SELECT setval('invitation_codes_id_seq', COALESCE((SELECT MAX(id) FROM invitation_codes), 0), true)"
psql <DB2026_CONNECTION> -c "SELECT setval('parent_child_relations_id_seq', COALESCE((SELECT MAX(id) FROM parent_child_relations), 0), true)"
psql <DB2026_CONNECTION> -c "SELECT setval('coach_student_relations_id_seq', COALESCE((SELECT MAX(id) FROM coach_student_relations), 0), true)"
```

#### Step 3: 卒業対象の抽出（繰り上げ前に実施）

**重要**: 学年繰り上げ前に「元々6年生だった生徒」を CSV に出力して保存。

```bash
# 卒業対象を CSV に出力
# email は auth.users にあり、profiles には display_name が存在
psql <DB2026_CONNECTION> -c "
  COPY (
    SELECT s.id, s.user_id, au.email, p.display_name
    FROM students s
    JOIN profiles p ON s.user_id = p.id
    JOIN auth.users au ON p.id = au.id
    WHERE s.grade = 6
    ORDER BY s.id
  ) TO STDOUT WITH CSV HEADER
" > graduating_students_20260201.csv

# 件数確認（ヘッダー行を除く）
tail -n +2 graduating_students_20260201.csv | wc -l
```

#### Step 4: 学年繰り上げ（students テーブル）

```sql
-- 5年生を6年生に繰り上げ
UPDATE students SET grade = 6 WHERE grade = 5;

-- 6年生→卒業 の処理は Step 5 で実施（CSV を使用）
```

### 5.3 移行スクリプト化

実装時は以下を考慮：

- [ ] 冪等性（何度実行しても同じ結果）
- [ ] ロールバック可能性
- [ ] 進捗表示・ログ出力
- [ ] エラーハンドリング

## 6. [Decision Needed] 学年繰り上げ方式

### 6.1 選択肢

| 選択肢 | 説明 | メリット | デメリット |
|--------|------|---------|-----------|
| **A: 自動バッチ** | 移行スクリプト内で自動実行 | 人手不要、一貫性 | 例外処理が困難 |
| **B: 手動SQL** | 管理者が SQL を実行 | 柔軟、確認しながら実行可能 | 人手、ミスリスク |
| **C: 管理画面** | 管理画面から実行 | UI で確認可能 | 開発コスト |

### 6.2 推奨案: A（自動バッチ）+ B（例外対応）

```
1. 基本は自動バッチで一括繰り上げ
2. 例外ケース（留年、転校等）は手動SQL で個別対応
3. 実行前に対象者リストを出力して確認
```

### 6.3 学年繰り上げロジック

```sql
-- 繰り上げ前の確認
SELECT grade, COUNT(*) FROM students GROUP BY grade;

-- 5年生 → 6年生
UPDATE students
SET grade = 6,
    updated_at = NOW()
WHERE grade = 5;

-- 6年生 → 卒業処理（選択肢による）
-- [Decision Needed] 下記参照
```

## 7. [Decision Needed] 6年生卒業後のアカウント扱い

現行スキーマの students テーブルには卒業フラグや有効/無効カラムが存在しないため、無効化や機能制限は Auth 側の制御またはアプリ側での対応が必要となる。

### 7.1 選択肢

| 選択肢 | 説明 | auth.users | students | 備考 |
|--------|------|-----------|----------|------|
| **A: 削除** | 完全削除 | DELETE | DELETE | CASCADE DELETE |
| **B: 無効化** | ログイン不可、データ保持 | Admin APIでBAN | 保持（grade=6のまま） | 追加カラム不要 |
| **C: 保持** | そのまま保持 | 変更なし | 変更なし | 機能制限が必要ならアプリ側対応 |

### 7.2 推奨案: B（無効化）

理由:
- データは分析・監査目的で保持したい場合がある
- 完全削除は復旧不可能
- ログインを防ぎつつデータは残す

#### 実装方法

**Step 5: 卒業生の無効化（BAN）**

Step 3 で出力した `graduating_students_20260201.csv` を使用して BAN を実行:

```bash
# 方法A: 専用スクリプトを使用（推奨）
npx tsx scripts/ban-graduated-users.ts graduating_students_20260201.csv

# 方法B: 手動で Supabase Admin API を呼び出し
# ⚠️ 永久BANには大きな値を使用（公式例: "100y"）
while IFS=, read -r id user_id email display_name; do
  if [ "$user_id" != "user_id" ]; then  # ヘッダー行をスキップ
    curl -X POST "https://<DB2026_URL>/auth/v1/admin/users/${user_id}/ban" \
      -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
      -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
      -H "Content-Type: application/json" \
      -d '{"duration": "100y"}'  # 100年（公式ドキュメント例に準拠）
    echo "Banned: $display_name ($email)"
  fi
done < graduating_students_20260201.csv
```

**BAN スクリプトの実装**（`scripts/ban-graduated-users.ts`）:

**BAN API 仕様調査結果（実装方針確定）**:
- 公式ドキュメントには `"100y"` (100年間BAN) の例のみ記載
- `"none"` の意味は **ドキュメントに記載なし**（おそらくBAN解除を意味する可能性が高い）
- **決定**: 公式例に従い `"100y"` を使用（時間単位 "h" の動作保証がないため）

**参考URL**:
- https://supabase.com/docs/reference/javascript/auth-admin-updateuserbyid
- 実装前に Supabase サポートまたは SDK ソースコードで仕様確認推奨

```typescript
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import { parse } from 'csv-parse/sync'  // ⚠️ 依存関係に csv-parse の追加が必要

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false }
})

async function banGraduatedUsers(csvPath: string) {
  const csvContent = fs.readFileSync(csvPath, 'utf-8')
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true
  })

  console.log(`Processing ${records.length} users...`)

  let successCount = 0
  let errorCount = 0

  for (const record of records) {
    try {
      // ⚠️ 永久BANには公式例に従って "100y" を指定
      // "none" は BAN解除の可能性が高いため使用しない
      const { error } = await supabase.auth.admin.updateUserById(
        record.user_id,
        { ban_duration: '100y' }  // 100年（公式ドキュメント例）
      )

      if (error) throw error

      console.log(`✓ Banned: ${record.display_name} (${record.email})`)
      successCount++
    } catch (error) {
      console.error(`✗ Failed: ${record.display_name} (${record.email})`, error)
      errorCount++
    }
  }

  console.log(`\nCompleted: ${successCount} success, ${errorCount} errors`)
}

if (process.argv.length < 3) {
  console.error('Usage: npx tsx scripts/ban-graduated-users.ts <csv_file>')
  process.exit(1)
}

banGraduatedUsers(process.argv[2])
```

**依存関係**:
- `csv-parse`: CSV パース用ライブラリ（`pnpm add csv-parse` で追加）
- `tsx`: TypeScript 実行用（`pnpm add -D tsx` で追加）

## 8. Master データ刷新

### 8.1 刷新対象

| テーブル | 2026年度での変更点 |
|---------|-------------------|
| `study_sessions` | 期間（start_date, end_date）の更新 |
| `test_schedules` | 組分けテスト・合不合テストの日程更新 |
| `problem_counts` | 学年別回数の更新（段階的投入） |
| `assessment_masters` | 回数の更新（5年19回→20回、6年15回→18回） |

**注記**:
- `assessment_masters` は既存マイグレーション [20251209000001_create_class_assessments.sql](../supabase/migrations/20251209000001_create_class_assessments.sql) で投入されているが、回数が2025年度版（5年19回、6年15回）のため、2026年度版（5年20回、6年18回）への更新が必要
- **対応方法**: マイグレーション修正または新規マイグレーション作成（別タスク）

### 8.2 投入方法

```
1. 2026年度版のマスタデータを用意（提供された2026年度のExcel/CSVを根拠データとする）
2. `supabase/seed.sql` を2026年度版で全面置換（最新年度のみ保持）
3. DB2026 に投入
4. 検証
```

**根拠データ（オフリポジトリ）**:
- `2026年四谷大塚DB.xlsx`
- `2026年テスト日程と学習回.csv`
- `2026年組分けテストと日程.csv`

### 8.3 study_sessions の期間計算

```typescript
// 5年生: 19回（9月〜1月）
// 6年生: 15回（8月下旬〜1月）

// 2026年度の場合:
// 上半期運用（2026/2/9〜2026/7/19）
// 5年生: 2026/2/9 開始、全20回（組分けテスト週も連番に含める）
// 6年生: 2026/2/9 開始、全18回（組分けテスト週も連番に含める）
```

### 8.4 problem_counts の投入

**実施済み（2026-02-06）**: `problem_counts` のデータ生成完了。

#### 生成ツール

- **スクリプト**: `scripts/generate-problem-counts-sql.py`
- **ソースデータ**: `2026年四谷大塚DB.xlsx`（16シート）
- **出力**: `supabase/seeds/problem_counts_2026.sql`（1,408件）

#### study_content_types の変更について

当初「変更なし（共通）」としていたが、2026年度はカリキュラム構造が変更されており、
study_content_types の全面置換が必要であることが判明。

- **マイグレーション**: `20260206000002_update_content_types_and_problem_counts.sql`
  - 既存 study_content_types を DELETE → 2026年度版 109件を INSERT
  - ⚠️ DELETE 前に `study_logs` の存在チェック（CASCADE による学習ログ削除防止）
- **命名規則の変更**:
  - 理科・6年社会: 予習/演習で同名の項目があるため「予習：」「演習：」接頭辞を付与
  - 例: 「練習問題」→「予習：練習問題」「演習：練習問題」

#### 投入手順

1. study_content_types マイグレーション適用（Supabase SQL Editor）
2. problem_counts 投入: `psql <DB2026_CONNECTION> -f supabase/seeds/problem_counts_2026.sql`
   - ヘルパー関数が前提データ不整合を検出した場合、RAISE EXCEPTION で中断

## 9. データ整合性チェック

### 9.1 移行後のチェック項目

```sql
-- 1. ユーザー数の一致確認
SELECT COUNT(*) FROM auth.users;  -- DB2025 と DB2026 で比較

-- 2. 学年分布の確認
SELECT grade, COUNT(*) FROM students GROUP BY grade;

-- 3. 関連テーブルの整合性
SELECT COUNT(*) FROM parent_child_relations
WHERE student_id NOT IN (SELECT id FROM students);  -- 0件であること

-- 4. 外部キー制約の確認
-- 制約違反がないこと
```

### 9.2 チェックスクリプト化

移行後に自動実行されるチェックスクリプトを準備：

- [ ] ユーザー数一致チェック
- [ ] 学年分布チェック
- [ ] 関連テーブル整合性チェック
- [ ] 外部キー制約チェック
- [ ] ログイン可能性チェック（サンプルユーザー）

## 10. 更新履歴

| 日付 | 更新者 | 内容 |
|------|--------|------|
| 2026-01-02 | Claude Code | 初版作成 |
| 2026-01-03 | Claude Code | 親子関係変換SQL修正（GROUP BY不整合解消、型不一致修正、パターンA/Bのみに限定） |
