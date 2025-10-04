# StudySpark データベース設計提案書

## 1. ER図 (テキスト形式)

```
┌─────────────────┐
│  auth.users     │ (Supabase Auth標準テーブル)
│  ─────────────  │
│  id (UUID)      │
│  email          │
│  created_at     │
└────────┬────────┘
         │
         │ 1:1
         ▼
┌─────────────────────────┐
│  profiles               │ (全ユーザー共通プロフィール)
│  ─────────────────────  │
│  id (UUID) PK, FK       │─────┐
│  role (enum)            │     │
│  display_name           │     │
│  avatar_url             │     │
│  created_at             │     │
│  updated_at             │     │
└─────────────────────────┘     │
         │                      │
         │                      │
    ┌────┴────┬─────────┬───────┴────┐
    │         │         │            │
    ▼         ▼         ▼            ▼
┌─────────┐ ┌─────────┐ ┌──────────┐ ┌────────┐
│students │ │parents  │ │coaches   │ │admins  │
│─────────│ │─────────│ │──────────│ │────────│
│user_id  │ │user_id  │ │user_id   │ │user_id │
│login_id │ │         │ │          │ │        │
│grade    │ │         │ │          │ │        │
│course   │ │         │ │          │ │        │
└────┬────┘ └────┬────┘ └────┬─────┘ └────────┘
     │           │            │
     │           │            │
     │      ┌────┴────────────┴───────┐
     │      │                         │
     │      ▼                         ▼
     │  ┌──────────────────────┐  ┌───────────────────────┐
     │  │parent_student_rels   │  │coach_student_relations│
     │  │──────────────────────│  │───────────────────────│
     │  │id                    │  │id                     │
     │  │parent_id (FK)        │  │coach_id (FK)          │
     │  │student_id (FK)       │  │student_id (FK)        │
     │  │created_at            │  │created_at             │
     │  └──────────────────────┘  └───────────────────────┘
     │
     │
     ├──────────┬──────────┬──────────┬──────────┬──────────┐
     │          │          │          │          │          │
     ▼          ▼          ▼          ▼          ▼          ▼
┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
│study    │ │encourage│ │test     │ │test     │ │coaching │ │coaching │
│_logs    │ │ment_logs│ │_goals   │ │_results │ │_sessions│ │_messages│
│─────────│ │─────────│ │─────────│ │─────────│ │─────────│ │─────────│
│id       │ │id       │ │id       │ │id       │ │id       │ │id       │
│stud_id  │ │stud_id  │ │stud_id  │ │stud_id  │ │stud_id  │ │sess_id  │
│session  │ │sender_id│ │test_id  │ │goal_id  │ │week_type│ │role     │
│subject  │ │type     │ │course   │ │course   │ │grow_data│ │content  │
│content  │ │message  │ │group_num│ │group_num│ │created  │ │created  │
│correct  │ │created  │ │thought  │ │reflect  │ └─────────┘ └─────────┘
│total    │ └─────────┘ │created  │ │created  │
│reflect  │             └─────────┘ └─────────┘
│created  │
└─────────┘

┌──────────────────┐
│learning_sessions │ (マスターデータ: 学習回)
│──────────────────│
│id                │
│grade (5 or 6)    │
│session_number    │
│start_date        │
│end_date          │
└──────────────────┘

┌──────────────────┐
│subjects          │ (マスターデータ: 科目)
│──────────────────│
│id                │
│name (算数等)     │
└──────────────────┘

┌──────────────────┐
│content_items     │ (マスターデータ: 学習内容)
│──────────────────│
│id                │
│session_id (FK)   │
│subject_id (FK)   │
│name (類題等)     │
│total_questions   │
│required_course   │ (A/B/C)
└──────────────────┘

┌──────────────────┐
│test_schedule     │ (マスターデータ: テスト日程)
│──────────────────│
│id                │
│grade             │
│test_name         │
│test_date         │
│display_start     │
│display_end       │
└──────────────────┘

┌──────────────────┐
│notifications     │ (アプリ内通知)
│──────────────────│
│id                │
│user_id (FK)      │
│type              │
│title             │
│body              │
│read_at           │
│created_at        │
└──────────────────┘

┌──────────────────┐
│audit_logs        │ (監査ログ)
│──────────────────│
│id                │
│user_id (FK)      │
│action            │
│table_name        │
│record_id         │
│changes           │
│created_at        │
└──────────────────┘
```

---

## 2. テーブル詳細仕様

### 2.1 認証・プロフィール関連

#### `profiles` (全ユーザー共通プロフィール)

| カラム名 | 型 | NULL | デフォルト | 説明 |
|---------|---|------|-----------|-----|
| id | UUID | NO | - | PK, FK to auth.users(id) |
| role | ENUM | NO | - | student/parent/coach/admin |
| display_name | VARCHAR(100) | YES | NULL | 表示名 (スキップ時はロール名) |
| avatar_url | TEXT | YES | NULL | アバター画像URL |
| created_at | TIMESTAMPTZ | NO | now() | 作成日時 |
| updated_at | TIMESTAMPTZ | NO | now() | 更新日��� |

**インデックス:**
- PRIMARY KEY (id)
- INDEX ON (role)

**制約:**
- role CHECK (role IN ('student', 'parent', 'coach', 'admin'))

---

#### `students` (生徒詳細情報)

| カラム名 | 型 | NULL | デフォルト | 説明 |
|---------|---|------|-----------|-----|
| id | BIGSERIAL | NO | - | PK |
| user_id | UUID | NO | - | FK to profiles(id), UNIQUE |
| login_id | VARCHAR(50) | NO | - | 自動生成ログインID, UNIQUE |
| full_name | VARCHAR(100) | NO | - | 本名 |
| furigana | VARCHAR(100) | YES | NULL | ふりがな |
| grade | SMALLINT | NO | - | 学年 (5 or 6) |
| course | CHAR(1) | YES | 'A' | 現在のコース (A/B/C/S) |
| created_at | TIMESTAMPTZ | NO | now() | 作成日時 |
| updated_at | TIMESTAMPTZ | NO | now() | 更新日時 |

**インデックス:**
- PRIMARY KEY (id)
- UNIQUE (user_id)
- UNIQUE (login_id)
- INDEX ON (grade)
- INDEX ON (course)

**制約:**
- grade CHECK (grade IN (5, 6))
- course CHECK (course IN ('A', 'B', 'C', 'S'))

---

#### `parents` (保護者詳細情報)

| カラム名 | 型 | NULL | デフォルト | 説明 |
|---------|---|------|-----------|-----|
| id | BIGSERIAL | NO | - | PK |
| user_id | UUID | NO | - | FK to profiles(id), UNIQUE |
| full_name | VARCHAR(100) | NO | - | 本名 |
| furigana | VARCHAR(100) | YES | NULL | ふりがな |
| created_at | TIMESTAMPTZ | NO | now() | 作成日時 |
| updated_at | TIMESTAMPTZ | NO | now() | 更新日時 |

**インデックス:**
- PRIMARY KEY (id)
- UNIQUE (user_id)

---

#### `coaches` (指導者詳細情報)

| カラム名 | 型 | NULL | デフォルト | 説明 |
|---------|---|------|-----------|-----|
| id | BIGSERIAL | NO | - | PK |
| user_id | UUID | NO | - | FK to profiles(id), UNIQUE |
| full_name | VARCHAR(100) | NO | - | 本名 |
| furigana | VARCHAR(100) | YES | NULL | ふりがな |
| invitation_code | UUID | NO | - | 使用した招待コード |
| created_at | TIMESTAMPTZ | NO | now() | 作成日時 |
| updated_at | TIMESTAMPTZ | NO | now() | 更新日時 |

**インデックス:**
- PRIMARY KEY (id)
- UNIQUE (user_id)

---

#### `admins` (管理者情報)

| カラム名 | 型 | NULL | デフォルト | 説明 |
|---------|---|------|-----------|-----|
| id | BIGSERIAL | NO | - | PK |
| user_id | UUID | NO | - | FK to profiles(id), UNIQUE |
| full_name | VARCHAR(100) | NO | - | 本名 |
| invitation_code | UUID | NO | - | 使用した招待コード |
| created_at | TIMESTAMPTZ | NO | now() | 作成日時 |

**インデックス:**
- PRIMARY KEY (id)
- UNIQUE (user_id)

---

#### `parent_student_relations` (親子関係)

| カラム名 | 型 | NULL | デフォルト | 説明 |
|---------|---|------|-----------|-----|
| id | BIGSERIAL | NO | - | PK |
| parent_id | BIGINT | NO | - | FK to parents(id) |
| student_id | BIGINT | NO | - | FK to students(id) |
| created_at | TIMESTAMPTZ | NO | now() | 関係確立日時 |

**インデックス:**
- PRIMARY KEY (id)
- UNIQUE (parent_id, student_id)
- INDEX ON (parent_id)
- INDEX ON (student_id)

---

#### `coach_student_relations` (指導者-生徒関係)

| カラム名 | 型 | NULL | デフォルト | 説明 |
|---------|---|------|-----------|-----|
| id | BIGSERIAL | NO | - | PK |
| coach_id | BIGINT | NO | - | FK to coaches(id) |
| student_id | BIGINT | NO | - | FK to students(id) |
| created_at | TIMESTAMPTZ | NO | now() | 関係確立日時 |

**インデックス:**
- PRIMARY KEY (id)
- UNIQUE (coach_id, student_id)
- INDEX ON (coach_id)
- INDEX ON (student_id)

---

#### `invitation_codes` (招待コード管理)

| カラム名 | 型 | NULL | デフォルト | 説明 |
|---------|---|------|-----------|-----|
| id | BIGSERIAL | NO | - | PK |
| code | UUID | NO | - | 招待コード, UNIQUE |
| role | ENUM | NO | - | coach/admin |
| created_by | UUID | YES | NULL | FK to profiles(id), 発行者 |
| used_by | UUID | YES | NULL | FK to profiles(id), 使用者 |
| expires_at | TIMESTAMPTZ | YES | NULL | 有効期限 |
| used_at | TIMESTAMPTZ | YES | NULL | 使用日時 |
| created_at | TIMESTAMPTZ | NO | now() | 作成日時 |

**インデックス:**
- PRIMARY KEY (id)
- UNIQUE (code)
- INDEX ON (role)
- INDEX ON (used_by)

**制約:**
- role CHECK (role IN ('coach', 'admin'))

---

### 2.2 マスターデータ

#### `learning_sessions` (学習回マスター)

| カラム名 | 型 | NULL | デフォルト | 説明 |
|---------|---|------|-----------|-----|
| id | BIGSERIAL | NO | - | PK |
| grade | SMALLINT | NO | - | 学年 (5 or 6) |
| session_number | SMALLINT | NO | - | 第X回 |
| start_date | DATE | NO | - | 開始日 |
| end_date | DATE | NO | - | 終了日 |
| created_at | TIMESTAMPTZ | NO | now() | 作成日時 |

**インデックス:**
- PRIMARY KEY (id)
- UNIQUE (grade, session_number)
- INDEX ON (start_date, end_date)

**制約:**
- grade CHECK (grade IN (5, 6))
- session_number CHECK (session_number >= 1 AND session_number <= 20)

---

#### `subjects` (科目マスター)

| カラム名 | 型 | NULL | デフォルト | 説明 |
|---------|---|------|-----------|-----|
| id | BIGSERIAL | NO | - | PK |
| name | VARCHAR(20) | NO | - | 科目名 (算数/国語/理科/社会), UNIQUE |
| display_order | SMALLINT | NO | - | 表示順 |
| created_at | TIMESTAMPTZ | NO | now() | 作成日時 |

**インデックス:**
- PRIMARY KEY (id)
- UNIQUE (name)

---

#### `content_items` (学習内容マスター)

| カラム名 | 型 | NULL | デフォルト | 説明 |
|---------|---|------|-----------|-----|
| id | BIGSERIAL | NO | - | PK |
| session_id | BIGINT | NO | - | FK to learning_sessions(id) |
| subject_id | BIGINT | NO | - | FK to subjects(id) |
| name | VARCHAR(100) | NO | - | 学習内容名 (類題/基本問題等) |
| total_questions | SMALLINT | NO | - | 問題数 |
| required_course | CHAR(1) | NO | - | 必要コース (A/B/C) |
| display_order | SMALLINT | NO | - | 表示順 |
| created_at | TIMESTAMPTZ | NO | now() | 作成日時 |

**インデックス:**
- PRIMARY KEY (id)
- INDEX ON (session_id, subject_id)
- INDEX ON (required_course)

**制約:**
- required_course CHECK (required_course IN ('A', 'B', 'C'))
- total_questions CHECK (total_questions >= 0)

---

#### `test_schedule` (テスト日程マスター)

| カラム名 | 型 | NULL | デフォルト | 説明 |
|---------|---|------|-----------|-----|
| id | BIGSERIAL | NO | - | PK |
| grade | SMALLINT | NO | - | 学年 (5 or 6) |
| test_name | VARCHAR(100) | NO | - | テスト名 |
| test_type | VARCHAR(50) | NO | - | 組分け/合不合 |
| test_date | DATE | NO | - | 実施日 |
| display_start | DATE | NO | - | 表示開始日 |
| display_end | DATE | NO | - | 表示終了日 |
| created_at | TIMESTAMPTZ | NO | now() | 作成日時 |

**インデックス:**
- PRIMARY KEY (id)
- INDEX ON (grade, test_date)
- INDEX ON (display_start, display_end)

**制約:**
- grade CHECK (grade IN (5, 6))

---

### 2.3 トランザクションデータ

#### `study_logs` (学習ログ)

| カラム名 | 型 | NULL | デフォルト | 説明 |
|---------|---|------|-----------|-----|
| id | BIGSERIAL | NO | - | PK |
| student_id | BIGINT | NO | - | FK to students(id) |
| session_id | BIGINT | NO | - | FK to learning_sessions(id) |
| content_item_id | BIGINT | NO | - | FK to content_items(id) |
| correct_answers | SMALLINT | NO | - | 正答数 |
| total_questions | SMALLINT | NO | - | 問題数 (冗長化: 高速計算用) |
| accuracy_rate | DECIMAL(5,2) | NO | - | 正答率 (%) |
| reflection | TEXT | YES | NULL | 振り返り (最大300字) |
| study_date | DATE | NO | - | 学習日 (入力日と異なる場合あり) |
| created_at | TIMESTAMPTZ | NO | now() | 入力日時 |
| updated_at | TIMESTAMPTZ | NO | now() | 更新日時 |

**インデックス:**
- PRIMARY KEY (id)
- INDEX ON (student_id, study_date)
- INDEX ON (student_id, session_id)
- INDEX ON (created_at)

**制約:**
- correct_answers CHECK (correct_answers >= 0)
- total_questions CHECK (total_questions > 0)
- accuracy_rate CHECK (accuracy_rate >= 0 AND accuracy_rate <= 100)

---

#### `encouragement_logs` (応援ログ)

| カラム名 | 型 | NULL | デフォルト | 説明 |
|---------|---|------|-----------|-----|
| id | BIGSERIAL | NO | - | PK |
| student_id | BIGINT | NO | - | FK to students(id), 応援対象 |
| sender_id | UUID | NO | - | FK to profiles(id), 応援送信者 |
| study_log_id | BIGINT | YES | NULL | FK to study_logs(id), 関連学習ログ |
| type | VARCHAR(20) | NO | - | quick/ai/custom |
| message | TEXT | YES | NULL | メッセージ内容 |
| icon | VARCHAR(20) | YES | NULL | スタンプアイコン (❤️/⭐/👍) |
| created_at | TIMESTAMPTZ | NO | now() | 送信日時 |

**インデックス:**
- PRIMARY KEY (id)
- INDEX ON (student_id, created_at)
- INDEX ON (sender_id, created_at)
- INDEX ON (study_log_id)

**制約:**
- type CHECK (type IN ('quick', 'ai', 'custom'))

---

#### `test_goals` (テスト目標)

| カラム名 | 型 | NULL | デフォルト | 説明 |
|---------|---|------|-----------|-----|
| id | BIGSERIAL | NO | - | PK |
| student_id | BIGINT | NO | - | FK to students(id) |
| test_id | BIGINT | NO | - | FK to test_schedule(id) |
| target_course | CHAR(1) | NO | - | 目標コース (S/C/B/A) |
| target_group | SMALLINT | NO | - | 目標組 (1〜40) |
| thought | TEXT | YES | NULL | 今回の思い (最大300字) |
| thought_history | JSONB | YES | NULL | 編集履歴 (最大5件) |
| created_at | TIMESTAMPTZ | NO | now() | 作成日時 |
| updated_at | TIMESTAMPTZ | NO | now() | 更新日時 |

**インデックス:**
- PRIMARY KEY (id)
- UNIQUE (student_id, test_id)
- INDEX ON (student_id)

**制約:**
- target_course CHECK (target_course IN ('S', 'C', 'B', 'A'))
- target_group CHECK (target_group >= 1 AND target_group <= 40)

---

#### `test_results` (テスト結果)

| カラム名 | 型 | NULL | デフォルト | 説明 |
|---------|---|------|-----------|-----|
| id | BIGSERIAL | NO | - | PK |
| goal_id | BIGINT | NO | - | FK to test_goals(id), UNIQUE |
| actual_course | CHAR(1) | NO | - | 実際のコース (S/C/B/A) |
| actual_group | SMALLINT | NO | - | 実際の組 (1〜40) |
| reflection | TEXT | YES | NULL | テストの振り返り (最大300字) |
| created_at | TIMESTAMPTZ | NO | now() | 作成日時 |
| updated_at | TIMESTAMPTZ | NO | now() | 更新日時 |

**インデックス:**
- PRIMARY KEY (id)
- UNIQUE (goal_id)

**制約:**
- actual_course CHECK (actual_course IN ('S', 'C', 'B', 'A'))
- actual_group CHECK (actual_group >= 1 AND actual_group <= 40)

---

#### `coaching_sessions` (コーチングセッション)

| カラム名 | 型 | NULL | デフォルト | 説明 |
|---------|---|------|-----------|-----|
| id | BIGSERIAL | NO | - | PK |
| student_id | BIGINT | NO | - | FK to students(id) |
| session_type | VARCHAR(20) | NO | - | weekly_reflect/goal_thought |
| week_type | VARCHAR(20) | YES | NULL | 成長週/安定週/挑戦週/特別週 |
| week_start | DATE | YES | NULL | 週の開始日 (weekly_reflect時) |
| grow_data | JSONB | YES | NULL | GROW構造データ |
| summary | TEXT | YES | NULL | サマリー (表示用) |
| completed_at | TIMESTAMPTZ | YES | NULL | 完了日時 |
| created_at | TIMESTAMPTZ | NO | now() | 開始日時 |

**インデックス:**
- PRIMARY KEY (id)
- INDEX ON (student_id, created_at)
- INDEX ON (session_type)

**制約:**
- session_type CHECK (session_type IN ('weekly_reflect', 'goal_thought'))
- week_type CHECK (week_type IN ('growth', 'stable', 'challenge', 'special') OR week_type IS NULL)

---

#### `coaching_messages` (コーチング会話ログ)

| カラム名 | 型 | NULL | デフォルト | 説明 |
|---------|---|------|-----------|-----|
| id | BIGSERIAL | NO | - | PK |
| session_id | BIGINT | NO | - | FK to coaching_sessions(id) |
| role | VARCHAR(10) | NO | - | ai/student |
| content | TEXT | NO | - | メッセージ内容 |
| turn_number | SMALLINT | NO | - | ターン番号 (1〜) |
| created_at | TIMESTAMPTZ | NO | now() | 送信日時 |

**インデックス:**
- PRIMARY KEY (id)
- INDEX ON (session_id, turn_number)

**制約:**
- role CHECK (role IN ('ai', 'student'))
- turn_number CHECK (turn_number >= 1)

---

#### `ai_cache` (AI生成キャッシュ)

| カラム名 | 型 | NULL | デフォルト | 説明 |
|---------|---|------|-----------|-----|
| id | BIGSERIAL | NO | - | PK |
| cache_key | VARCHAR(255) | NO | - | キャッシュキー, UNIQUE |
| cache_type | VARCHAR(50) | NO | - | encouragement/reflection/coaching |
| input_data | JSONB | NO | - | 入力データ (ハッシュ化前) |
| output_data | JSONB | NO | - | 生成結果 |
| created_at | TIMESTAMPTZ | NO | now() | 生成日時 |
| expires_at | TIMESTAMPTZ | YES | NULL | 有効期限 |

**インデックス:**
- PRIMARY KEY (id)
- UNIQUE (cache_key)
- INDEX ON (cache_type)
- INDEX ON (expires_at)

---

### 2.4 通知・監査

#### `notifications` (アプリ内通知)

| カラム名 | 型 | NULL | デフォルト | 説明 |
|---------|---|------|-----------|-----|
| id | BIGSERIAL | NO | - | PK |
| user_id | UUID | NO | - | FK to profiles(id), 通知対象 |
| type | VARCHAR(50) | NO | - | encouragement/coaching_complete等 |
| title | VARCHAR(200) | NO | - | 通知タイトル |
| body | TEXT | YES | NULL | 通知本文 |
| link_url | TEXT | YES | NULL | リンク先URL |
| read_at | TIMESTAMPTZ | YES | NULL | 既読日時 |
| created_at | TIMESTAMPTZ | NO | now() | 作成日時 |

**インデックス:**
- PRIMARY KEY (id)
- INDEX ON (user_id, created_at)
- INDEX ON (user_id, read_at) -- 未読検索用

---

#### `audit_logs` (監査ログ)

| カラム名 | 型 | NULL | デフォルト | 説明 |
|---------|---|------|-----------|-----|
| id | BIGSERIAL | NO | - | PK |
| user_id | UUID | YES | NULL | FK to profiles(id), 操作者 |
| action | VARCHAR(50) | NO | - | INSERT/UPDATE/DELETE/LOGIN等 |
| table_name | VARCHAR(100) | YES | NULL | 対象テーブル |
| record_id | BIGINT | YES | NULL | 対象レコードID |
| changes | JSONB | YES | NULL | 変更内容 (before/after) |
| ip_address | INET | YES | NULL | IPアドレス |
| user_agent | TEXT | YES | NULL | ユーザーエージェント |
| created_at | TIMESTAMPTZ | NO | now() | 操作日時 |

**インデックス:**
- PRIMARY KEY (id)
- INDEX ON (user_id, created_at)
- INDEX ON (table_name, created_at)
- INDEX ON (action)

---

#### `weekly_analysis` (週次分析結果)

| カラム名 | 型 | NULL | デフォルト | 説明 |
|---------|---|------|-----------|-----|
| id | BIGSERIAL | NO | - | PK |
| analysis_type | VARCHAR(20) | NO | - | interim/final |
| week_start | DATE | NO | - | 分析対象週の開始日 |
| executed_at | TIMESTAMPTZ | NO | now() | 実行日時 |
| analysis_data | JSONB | NO | - | 分析結果 (5項目) |
| created_at | TIMESTAMPTZ | NO | now() | 作成日時 |

**インデックス:**
- PRIMARY KEY (id)
- INDEX ON (week_start, analysis_type)
- INDEX ON (executed_at)

**制約:**
- analysis_type CHECK (analysis_type IN ('interim', 'final'))

---

## 3. RLS (Row Level Security) ポリシー方針

### 3.1 基本方針

- **デフォルト**: すべてのテーブルでRLS有効化
- **認証済みユーザーのみ**: 未認証ユーザーは一切アクセス不可
- **ロール別制御**: profiles.role で判定

### 3.2 ロール別アクセス権限マトリクス

| テーブル | student | parent | coach | admin |
|---------|---------|--------|-------|-------|
| **profiles** | 自分のみR/U | 自分のみR/U | 自分のみR/U | 全件R/U |
| **students** | 自分のみR/U | 子どものみR | 担当生徒のみR | 全件R/U/D |
| **parents** | 自分の保護者のみR | 自分のみR/U | 関連保護者のみR | 全件R/U/D |
| **coaches** | - | - | 自分のみR/U | 全件R/U/D |
| **parent_student_relations** | - | 自分の関係のみR/C/D | 関連のみR | 全件R/C/U/D |
| **coach_student_relations** | - | - | 自分の関係のみR/C/D | 全件R/C/U/D |
| **study_logs** | 自分のみR/C/U | 子どものみR | 担当生徒のみR | 全件R/U/D |
| **encouragement_logs** | 自分宛のみR | 自分の送信のみR/C/U + 子ども宛R | 自分の送信のみR/C/U + 担当生徒宛R | 全件R/U/D |
| **test_goals** | 自分のみR/C/U | 子どものみR | 担当生徒のみR | 全件R/U/D |
| **test_results** | 自分のみR/C/U | 子どものみR | 担当生徒のみR | 全件R/U/D |
| **coaching_sessions** | 自分のみR/C | 子どものみR | 担当生徒のみR | 全件R/U/D |
| **coaching_messages** | 自分のセッションのみR/C | 子どものセッションのみR | 担当生徒のセッションのみR | 全件R/U/D |
| **notifications** | 自分宛のみR/U | 自分宛のみR/U | 自分宛のみR/U | 全件R/U/D |
| **audit_logs** | - | - | - | 全件R |
| **マスターデータ** | 全件R | 全件R | 全件R | 全件R/C/U/D |

**凡例:**
- R: Read (SELECT)
- C: Create (INSERT)
- U: Update (UPDATE)
- D: Delete (DELETE)

### 3.3 重要なRLSポリシー例

#### `study_logs` (学習ログ)

```sql
-- 生徒: 自分のログのみ編集可
CREATE POLICY "Students can manage their own study logs"
ON study_logs
FOR ALL
TO authenticated
USING (
  student_id IN (
    SELECT id FROM students WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  student_id IN (
    SELECT id FROM students WHERE user_id = auth.uid()
  )
);

-- 保護者: 自分の子どものログ閲覧のみ
CREATE POLICY "Parents can view their children's study logs"
ON study_logs
FOR SELECT
TO authenticated
USING (
  student_id IN (
    SELECT student_id FROM parent_student_relations
    WHERE parent_id IN (
      SELECT id FROM parents WHERE user_id = auth.uid()
    )
  )
);

-- 指導者: 担当生徒のログ閲覧のみ
CREATE POLICY "Coaches can view their students' study logs"
ON study_logs
FOR SELECT
TO authenticated
USING (
  student_id IN (
    SELECT student_id FROM coach_student_relations
    WHERE coach_id IN (
      SELECT id FROM coaches WHERE user_id = auth.uid()
    )
  )
);

-- 管理者: 全件アクセス
CREATE POLICY "Admins can manage all study logs"
ON study_logs
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  )
);
```

---

## 4. データ削除ポリシー実装

### 4.1 卒業後1年削除 (学習ログ)

```sql
-- Supabase Edge Function (日次実行)
-- 卒業日の定義: 小6の1/31
-- 削除対象: 卒業日+1年経過の学習ログ

DELETE FROM study_logs
WHERE student_id IN (
  SELECT id FROM students
  WHERE grade = 6
  AND created_at < NOW() - INTERVAL '2 years 1 month' -- 小6作成+1年+1月
);
```

### 4.2 退会時個人情報保持 (1年間)

```sql
-- 退会フラグ追加 (profiles に deleted_at カラム)
-- 退会後1年経過で完全削除

DELETE FROM profiles
WHERE deleted_at IS NOT NULL
AND deleted_at < NOW() - INTERVAL '1 year';
```

### 4.3 通知データ90日削除 (既読のみ)

```sql
DELETE FROM notifications
WHERE read_at IS NOT NULL
AND read_at < NOW() - INTERVAL '90 days';
```

---

## 5. 代替案との比較

### 案1: 採用案 (上記設計)

**長所:**
- 正規化されたスキーマ、拡張性高
- RLSで細かい権限制御
- Supabase標準機能を最大活用

**短所:**
- JOIN多用によるクエリ複雑化
- RLSポリシーの保守コスト

### 案2: 非正規化案 (study_logs に student_user_id 冗長化)

**長所:**
- JOINなしでRLS適用可能
- クエリパフォーマンス向上

**短所:**
- データ冗長性
- 更新時の整合性保証が困難

### 採用理由

- 初期段階ではデータ量が少なく、正規化のメリット大
- Supabase の RLS は JOIN を含むサブクエリに対応
- 将来的なデータ分析で正規化スキーマが有利

---

## 6. マイグレーション戦略

### Phase 0 実装順序

1. **`db/schema/01-auth.sql`**
   - profiles, students, parents, coaches, admins, invitation_codes

2. **`db/schema/02-relations.sql`**
   - parent_student_relations, coach_student_relations

3. **`db/schema/03-master-data.sql`**
   - learning_sessions, subjects, content_items, test_schedule

4. **`db/schema/04-logs.sql`**
   - study_logs, encouragement_logs, ai_cache

5. **`db/schema/05-goals.sql`**
   - test_goals, test_results

6. **`db/schema/06-coaching.sql`**
   - coaching_sessions, coaching_messages

7. **`db/schema/07-notifications.sql`**
   - notifications

8. **`db/schema/08-audit.sql`**
   - audit_logs, weekly_analysis

9. **`db/policies/*.sql`**
   - 各テーブルのRLSポリシー

10. **`db/seed/*.sql`**
    - マスターデータ投入

---

**このDB設計で進めてよろしいですか？(OK / 修正希望 でお答えください)**
