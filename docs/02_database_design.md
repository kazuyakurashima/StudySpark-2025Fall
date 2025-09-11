# 02_database_design.md

**Spec-Version:** 0.1  
**Depends:** 01_requirements.md  
**Created:** 2025-01-XX

## 1. データベース設計概要

StudySparkアプリケーションの要件に基づき、学生・保護者・指導者の三者間での学習情報共有を支援するデータベース設計を行う。

## 2. エンティティ関係図 (概念)

\`\`\`
profiles (users) 1:N learning_records
profiles 1:N goals
profiles 1:N messages (sender)
profiles 1:N messages (recipient)
profiles 1:N class_memberships
classes 1:N class_memberships
profiles (coach) 1:N classes
test_schedules 1:N goals
\`\`\`

## 3. テーブル定義

### 3.1 profiles (ユーザープロフィール)

**Purpose:** ユーザー認証と基本情報管理 (REQ-001)

| カラム名 | データ型 | 制約 | 説明 |
|----------|----------|------|------|
| id | uuid | PRIMARY KEY | Supabase auth.users.id |
| email | text | NOT NULL, UNIQUE | メールアドレス |
| name | text | NULL | 表示名 |
| avatar | text | NULL | アバター画像URL |
| role | text | NOT NULL, CHECK | 'student', 'parent', 'coach' |
| parent_id | uuid | NULL, FK | 保護者ID（学生の場合） |
| coach_code | text | NULL | 指導者コード（コーチの場合） |
| created_at | timestamptz | NOT NULL, DEFAULT now() | 作成日時 |
| updated_at | timestamptz | NOT NULL, DEFAULT now() | 更新日時 |

**インデックス:**
- idx_profiles_role
- idx_profiles_parent_id
- idx_profiles_coach_code

### 3.2 classes (クラス)

**Purpose:** 指導者が管理するクラス情報

| カラム名 | データ型 | 制約 | 説明 |
|----------|----------|------|------|
| id | uuid | PRIMARY KEY, DEFAULT gen_random_uuid() | クラスID |
| name | text | NOT NULL | クラス名 |
| coach_id | uuid | NOT NULL, FK | 担当指導者ID |
| description | text | NULL | クラス説明 |
| created_at | timestamptz | NOT NULL, DEFAULT now() | 作成日時 |
| updated_at | timestamptz | NOT NULL, DEFAULT now() | 更新日時 |

### 3.3 class_memberships (クラス所属)

**Purpose:** 学生のクラス所属関係管理

| カラム名 | データ型 | 制約 | 説明 |
|----------|----------|------|------|
| id | uuid | PRIMARY KEY, DEFAULT gen_random_uuid() | 所属ID |
| student_id | uuid | NOT NULL, FK | 学生ID |
| class_id | uuid | NOT NULL, FK | クラスID |
| joined_at | timestamptz | NOT NULL, DEFAULT now() | 加入日時 |

**制約:**
- UNIQUE(student_id, class_id)

### 3.4 learning_records (学習記録)

**Purpose:** 日々の学習内容記録 (REQ-002)

| カラム名 | データ型 | 制約 | 説明 |
|----------|----------|------|------|
| id | uuid | PRIMARY KEY, DEFAULT gen_random_uuid() | 記録ID |
| student_id | uuid | NOT NULL, FK | 学生ID |
| subject | text | NOT NULL | 科目 ('算数', '国語', '理科', '社会') |
| lesson_type | text | NOT NULL | 授業タイプ ('授業', '宿題') |
| understanding_level | integer | NOT NULL, CHECK (1-5) | 理解度（5段階） |
| notes | text | NULL | 備考 |
| study_date | date | NOT NULL | 学習日 |
| created_at | timestamptz | NOT NULL, DEFAULT now() | 記録作成日時 |
| updated_at | timestamptz | NOT NULL, DEFAULT now() | 更新日時 |

**インデックス:**
- idx_learning_records_student_date
- idx_learning_records_subject

### 3.5 goals (目標設定)

**Purpose:** テスト目標とコース・組設定 (REQ-003)

| カラム名 | データ型 | 制約 | 説明 |
|----------|----------|------|------|
| id | uuid | PRIMARY KEY, DEFAULT gen_random_uuid() | 目標ID |
| student_id | uuid | NOT NULL, FK | 学生ID |
| test_schedule_id | uuid | NOT NULL, FK | テストスケジュールID |
| target_course | text | NULL | 目標コース ('S', 'A', 'B', 'C') |
| target_group | integer | NULL | 目標組 |
| subject_targets | jsonb | NULL | 科目別目標スコア |
| thoughts | text | NULL | 今回の思い |
| status | text | NOT NULL, DEFAULT 'active' | 'active', 'completed', 'cancelled' |
| created_at | timestamptz | NOT NULL, DEFAULT now() | 作成日時 |
| updated_at | timestamptz | NOT NULL, DEFAULT now() | 更新日時 |

**インデックス:**
- idx_goals_student_id
- idx_goals_test_schedule_id
- idx_goals_status

### 3.6 test_schedules (テストスケジュール)

**Purpose:** テストスケジュール管理

| カラム名 | データ型 | 制約 | 説明 |
|----------|----------|------|------|
| id | uuid | PRIMARY KEY, DEFAULT gen_random_uuid() | スケジュールID |
| name | text | NOT NULL | テスト名 |
| test_type | text | NOT NULL | テスト種類 ('合不合判定テスト', '週テスト') |
| test_date | date | NOT NULL | テスト実施日 |
| is_active | boolean | NOT NULL, DEFAULT true | アクティブフラグ |
| created_at | timestamptz | NOT NULL, DEFAULT now() | 作成日時 |

**インデックス:**
- idx_test_schedules_date
- idx_test_schedules_type

### 3.7 messages (メッセージ)

**Purpose:** 保護者から学生への応援メッセージ (REQ-004)

| カラム名 | データ型 | 制約 | 説明 |
|----------|----------|------|------|
| id | uuid | PRIMARY KEY, DEFAULT gen_random_uuid() | メッセージID |
| sender_id | uuid | NOT NULL, FK | 送信者ID |
| recipient_id | uuid | NOT NULL, FK | 受信者ID |
| message_type | text | NOT NULL | 'encouragement', 'feedback' |
| content | text | NOT NULL | メッセージ内容 |
| is_read | boolean | NOT NULL, DEFAULT false | 既読フラグ |
| created_at | timestamptz | NOT NULL, DEFAULT now() | 送信日時 |

**インデックス:**
- idx_messages_recipient_id
- idx_messages_created_at

### 3.8 ai_coach_messages (AIコーチメッセージ)

**Purpose:** AIコーチからの自動メッセージ (REQ-005)

| カラム名 | データ型 | 制約 | 説明 |
|----------|----------|------|------|
| id | uuid | PRIMARY KEY, DEFAULT gen_random_uuid() | メッセージID |
| student_id | uuid | NOT NULL, FK | 学生ID |
| message_type | text | NOT NULL | 'greeting', 'encouragement', 'streak' |
| content | text | NOT NULL | メッセージ内容 |
| trigger_data | jsonb | NULL | トリガー条件データ |
| created_at | timestamptz | NOT NULL, DEFAULT now() | 生成日時 |

**インデックス:**
- idx_ai_coach_messages_student_id
- idx_ai_coach_messages_created_at

### 3.9 learning_streaks (学習連続記録)

**Purpose:** 連続学習日数管理

| カラム名 | データ型 | 制約 | 説明 |
|----------|----------|------|------|
| id | uuid | PRIMARY KEY, DEFAULT gen_random_uuid() | 記録ID |
| student_id | uuid | NOT NULL, FK, UNIQUE | 学生ID |
| current_streak | integer | NOT NULL, DEFAULT 0 | 現在の連続日数 |
| longest_streak | integer | NOT NULL, DEFAULT 0 | 最長連続日数 |
| last_study_date | date | NULL | 最終学習日 |
| updated_at | timestamptz | NOT NULL, DEFAULT now() | 更新日時 |

## 4. Row Level Security (RLS) ポリシー

### 4.1 profiles テーブル
\`\`\`sql
-- ユーザーは自分のプロフィールのみ閲覧・更新可能
CREATE POLICY "Users can view own profile" ON profiles 
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles 
  FOR UPDATE USING (auth.uid() = id);
\`\`\`

### 4.2 learning_records テーブル
\`\`\`sql
-- 学生は自分の記録のみ操作可能
-- 保護者は子供の記録を閲覧可能
-- 指導者は担当クラスの学生記録を閲覧可能
CREATE POLICY "Students can manage own records" ON learning_records
  FOR ALL USING (auth.uid() = student_id);

CREATE POLICY "Parents can view children records" ON learning_records
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
        AND role = 'parent' 
        AND id = (SELECT parent_id FROM profiles WHERE id = student_id)
    )
  );
\`\`\`

### 4.3 messages テーブル
\`\`\`sql
-- 送信者・受信者のみメッセージを閲覧可能
CREATE POLICY "Users can view own messages" ON messages
  FOR SELECT USING (auth.uid() IN (sender_id, recipient_id));

CREATE POLICY "Users can send messages" ON messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);
\`\`\`

## 5. パフォーマンス考慮事項

### 5.1 インデックス戦略
- 頻繁な検索条件（student_id, date範囲）にインデックス作成
- 複合インデックスで範囲検索を最適化
- JSONBカラム内の特定キーにGINインデックス適用

### 5.2 データ分割
- learning_recordsテーブルは学習年度での分割を検討
- 大量データ蓄積時はパーティショニング適用

## 6. セキュリティ考慮事項

### 6.1 データ保護
- 個人情報はRLSで厳格に制御
- 指導者コードはハッシュ化して保存
- メッセージ内容は暗号化オプション検討

### 6.2 監査ログ
- 重要操作（目標設定、成績記録）の変更履歴記録
- トリガーによる自動監査ログ生成

## 7. 拡張性考慮事項

### 7.1 将来的な機能追加
- 成績分析用の集計テーブル追加
- 通知設定テーブル
- ファイル添付機能用のattachmentsテーブル

### 7.2 外部システム連携
- 外部テストシステムとの連携用インターフェーステーブル
- API連携ログテーブル

## 8. マイグレーション戦略

### 8.1 段階的導入
1. 基本テーブル（profiles, classes, class_memberships）
2. 学習記録系（learning_records, goals, test_schedules）
3. コミュニケーション系（messages, ai_coach_messages）
4. 分析・拡張系（learning_streaks, audit_logs）

### 8.2 データ移行
- 既存localStorage データの移行スクリプト作成
- バックアップ・ロールバック手順の確立

## 9. 要件トレーサビリティ

| Requirement ID | 関連テーブル | 実装内容 |
|----------------|--------------|----------|
| REQ-001 | profiles, classes, class_memberships | ユーザー認証とロール管理 |
| REQ-002 | learning_records, learning_streaks | 学習記録と進捗管理 |
| REQ-003 | goals, test_schedules | 目標設定と達成追跡 |
| REQ-004 | messages | 保護者から学生へのメッセージ機能 |
| REQ-005 | ai_coach_messages | AIコーチ機能 |

## 10. 制約事項・前提条件

### 10.1 データ制約
- 学生は一つのクラスにのみ所属
- 保護者は複数の子供を持てる
- 指導者は複数のクラスを担当可能

### 10.2 ビジネスルール
- 学習記録は当日分のみ編集可能
- 目標設定はテスト実施日の7日前まで変更可能
- 連続学習記録は日次バッチで更新
