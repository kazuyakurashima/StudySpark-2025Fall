# StudySpark API Design

**Spec-Version**: 0.1  
**Depends**: docs/01_requirements.md, docs/02_architecture.md, docs/03_database.md  
**Document Status**: Initial Draft  
**Last Updated**: 2025-01-07

---

## 1. OpenAPI 3.1 Specification

### API Overview
```yaml
openapi: 3.1.0
info:
  title: StudySpark API
  version: 0.1.0
  description: |
    中学受験支援アプリ StudySpark の REST API
    - 生徒・保護者・指導者の3役割をサポート
    - AI（GPT-5-mini）による個別コーチング機能
    - 学習記録・目標管理・振り返り機能を提供
  contact:
    name: StudySpark Development Team
  license:
    name: Private
servers:
  - url: https://api.studyspark.app/v1
    description: Production
  - url: https://api-staging.studyspark.app/v1
    description: Staging
```

---

## 2. Authentication & Authorization

### 2.1 Authentication Scheme
```yaml
components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
      description: Supabase JWT token
    
    StudentAuth:
      type: http
      scheme: basic
      description: Student ID/Password (custom implementation)

security:
  - BearerAuth: []
  - StudentAuth: []
```

### 2.2 Role-based Authorization Matrix

| Endpoint | Student | Parent | Coach | Admin | Scope |
|----------|---------|--------|-------|-------|-------|
| `GET /students/{id}/records` | Own only | Child only | Assigned | All | family/org |
| `POST /students/{id}/records` | Own only | ❌ | ❌ | All | family |
| `GET /parents/{id}/children` | ❌ | Own only | ❌ | All | family |
| `GET /coaches/{id}/students` | ❌ | ❌ | Own only | All | org |
| `POST /ai/coaching` | Own session | Child session | Student session | All | contextual |

---

## 3. API Endpoints by Feature Tags

### 3.1 Tag: Learning Records (REQ-001)

#### API-001: Create/Update Study Record
```yaml
POST /api/students/{studentId}/records
tags: [learning-records]
summary: 学習記録の登録・更新
description: |
  生徒の学習記録を登録または更新する。
  同一日・科目・種類の記録が存在する場合は更新。
security:
  - BearerAuth: [student, admin]
  - StudentAuth: []
parameters:
  - name: studentId
    in: path
    required: true
    schema:
      type: string
      format: uuid
requestBody:
  required: true
  content:
    application/json:
      schema:
        $ref: '#/components/schemas/StudyRecordInput'
      examples:
        spark_level:
          summary: Spark レベル（最小入力）
          value:
            study_date: "2024-01-15"
            subject: "math"
            content_type: "class"
            understanding_level: 4
            level_type: "spark"
        flame_level:
          summary: Flame レベル（時間記録あり）
          value:
            study_date: "2024-01-15"
            subject: "math"
            content_type: "homework"
            understanding_level: 3
            time_spent_minutes: 45
            memo: "関数の問題で苦戦した"
            level_type: "flame"
responses:
  '200':
    description: 記録更新成功
    content:
      application/json:
        schema:
          $ref: '#/components/schemas/StudyRecord'
  '201':
    description: 記録作成成功
    content:
      application/json:
        schema:
          $ref: '#/components/schemas/StudyRecord'
  '400':
    $ref: '#/components/responses/ValidationError'
  '401':
    $ref: '#/components/responses/Unauthorized'
  '403':
    $ref: '#/components/responses/Forbidden'
```

#### API-002: Get Learning Calendar
```yaml
GET /api/students/{studentId}/calendar
tags: [learning-records]
summary: 学習カレンダー取得
description: GitHub風ヒートマップ用の月次集計データを取得
security:
  - BearerAuth: [student, parent, coach, admin]
parameters:
  - name: studentId
    in: path
    required: true
    schema:
      type: string
      format: uuid
  - name: month
    in: query
    schema:
      type: string
      pattern: '^\d{4}-\d{2}$'
      example: "2024-01"
    description: 対象月（YYYY-MM形式）
responses:
  '200':
    description: カレンダーデータ
    content:
      application/json:
        schema:
          $ref: '#/components/schemas/LearningCalendar'
        example:
          month: "2024-01"
          data:
            - date: "2024-01-15"
              subject_count: 2
              total_records: 3
              understanding_avg: 3.67
              color_level: "medium"
            - date: "2024-01-16"
              subject_count: 3
              total_records: 4
              understanding_avg: 4.25
              color_level: "high"
```

### 3.2 Tag: Dashboard (REQ-002, REQ-003)

#### API-003: Student Dashboard
```yaml
GET /api/students/{studentId}/dashboard
tags: [dashboard]
summary: 生徒ダッシュボード
description: |
  今日のミッション・AIコーチメッセージ・学習カレンダーを統合取得
security:
  - BearerAuth: [student, parent, coach, admin]
responses:
  '200':
    description: ダッシュボードデータ
    content:
      application/json:
        schema:
          $ref: '#/components/schemas/StudentDashboard'
        example:
          ai_message:
            content: "3日連続の記録、着実に習慣になってきたね！今日も一歩ずつ前へ進もう。"
            type: "encouragement"
            generated_at: "2024-01-15T00:00:00Z"
          daily_missions:
            date: "2024-01-15"
            weekday: "月曜日"
            mode: "input_promotion"
            subjects: ["math", "science", "social"]
            panels:
              - subject: "math"
                content_type: "class"
                status: "未入力"
                cta: "授業を入力する"
          week_goals:
            current_week: "2024-01-15"
            goals:
              - id: "goal-123"
                title: "算数の理解度4以上を3回"
                progress: 2
                target: 3
                is_achieved: false
```

#### API-004: Parent Dashboard
```yaml
GET /api/parents/{parentId}/dashboard
tags: [dashboard]
summary: 保護者ダッシュボード
description: 紐付いた子供の学習状況概要とAI解釈を取得
security:
  - BearerAuth: [parent, admin]
responses:
  '200':
    description: 保護者ダッシュボード
    content:
      application/json:
        schema:
          $ref: '#/components/schemas/ParentDashboard'
        example:
          children:
            - student_id: "student-123"
              nickname: "たろう"
              avatar: "student1"
              days_since_last_record: 1
              this_week_count: 4
              understanding_trend: "improving"
              ai_interpretation: "継続的に学習に取り組めており、理解度も向上傾向です"
              recommended_actions:
                - "「今週もよくがんばったね」と声をかけてあげてください"
                - "苦手だった理科への取り組みを褒めてあげましょう"
```

### 3.3 Tag: AI Coaching (REQ-004, REQ-005)

#### API-005: AI Goal Coaching
```yaml
POST /api/ai/goal-coaching
tags: [ai-coaching]
summary: AI目標設定コーチング
description: |
  GROWモデルによる対話式目標設定。
  GPT-5-miniによる個別最適化されたコーチング。
security:
  - BearerAuth: [student, parent, coach, admin]
requestBody:
  required: true
  content:
    application/json:
      schema:
        $ref: '#/components/schemas/AICoachingRequest'
      examples:
        initial_session:
          summary: 初回目標設定開始
          value:
            student_id: "student-123"
            session_type: "goal_setting"
            context:
              current_goals: []
              recent_performance: 
                weekly_avg_understanding: 3.2
                subjects_struggling: ["science"]
        follow_up:
          summary: 対話継続
          value:
            student_id: "student-123"
            session_id: "session-456"
            session_type: "goal_setting"
            user_message: "理科が苦手だから、理科の点数を上げたい"
            context:
              previous_messages: 3
responses:
  '200':
    description: AIコーチング応答
    content:
      application/json:
        schema:
          $ref: '#/components/schemas/AICoachingResponse'
        example:
          session_id: "session-456"
          message: |
            理科を得意にしたいんだね！すばらしい目標だ。
            先週の理科の勉強を振り返ってみて、どの分野が特に難しく感じた？
            例えば、計算問題、暗記問題、実験の理解など、具体的に教えてくれるかな？
          coaching_stage: "reality"
          suggested_goals: []
          next_questions:
            - "どの理科の分野が一番苦手ですか？"
            - "理科の勉強時間は週にどのくらいですか？"
  '400':
    $ref: '#/components/responses/ValidationError'
  '429':
    $ref: '#/components/responses/RateLimited'
```

#### API-006: AI Weekly Reflection
```yaml
POST /api/ai/reflection-feedback
tags: [ai-coaching]
summary: AI振り返りフィードバック
description: |
  週間振り返りに対するAIからの前向きなフィードバックと
  次週への具体的なアドバイスを生成
security:
  - BearerAuth: [student, admin]
requestBody:
  required: true
  content:
    application/json:
      schema:
        $ref: '#/components/schemas/ReflectionFeedbackRequest'
      example:
        student_id: "student-123"
        week_start_date: "2024-01-15"
        reflection_data:
          good_points: "算数の宿題を毎日できた。理科の実験が楽しかった。"
          improvement_points: "社会の暗記がなかなか進まなかった"
          emotion_score: 4
          study_summary:
            total_sessions: 12
            avg_understanding: 3.4
            subjects_distribution:
              math: 5
              science: 4
              social: 3
responses:
  '200':
    description: AI振り返りフィードバック
    content:
      application/json:
        schema:
          $ref: '#/components/schemas/ReflectionFeedbackResponse'
        example:
          feedback: |
            素晴らしい1週間だったね！算数の宿題を毎日続けられたのは本当にすごいことです。
            継続は力なり、その積み重ねが必ず結果につながります。
            
            理科の実験を楽しめたのもいいですね。楽しいと感じることができれば、
            きっと理解も深まっているはずです。
          suggestions:
            - title: "社会の暗記のコツ"
              description: "1日5分でいいので、寝る前に今日覚えたことを思い出してみましょう"
            - title: "来週の小さな挑戦"
              description: "理科の実験の楽しさを他の科目でも見つけてみませんか？"
          next_week_focus: "社会の暗記を無理せず、少しずつ習慣化していこう"
```

---

## 4. Data Schemas (Zod Compatible)

### 4.1 Core Entities
```yaml
components:
  schemas:
    StudyRecordInput:
      type: object
      required: [study_date, subject, content_type, understanding_level, level_type]
      properties:
        study_date:
          type: string
          format: date
          description: 学習実施日（Asia/Tokyo）
        subject:
          type: string
          enum: [math, japanese, science, social, english]
        content_type:
          type: string
          enum: [class, homework, test_prep, exam_prep]
        understanding_level:
          type: integer
          minimum: 1
          maximum: 5
          description: 1=難しい, 2=不安, 3=ふつう, 4=できた, 5=バッチリ理解
        time_spent_minutes:
          type: integer
          minimum: 1
          maximum: 480
          description: 学習時間（分）
        memo:
          type: string
          maxLength: 500
          description: メモ・感想
        level_type:
          type: string
          enum: [spark, flame, blaze]
          default: spark
          description: 記録詳細レベル

    StudyRecord:
      allOf:
        - $ref: '#/components/schemas/StudyRecordInput'
        - type: object
          required: [id, created_at, updated_at, updated_by]
          properties:
            id:
              type: string
              format: uuid
            created_at:
              type: string
              format: date-time
            updated_at:
              type: string
              format: date-time
            updated_by:
              type: string
              format: uuid

    LearningCalendar:
      type: object
      required: [month, data]
      properties:
        month:
          type: string
          pattern: '^\d{4}-\d{2}$'
        data:
          type: array
          items:
            type: object
            required: [date, subject_count, total_records, color_level]
            properties:
              date:
                type: string
                format: date
              subject_count:
                type: integer
                minimum: 0
                maximum: 5
              total_records:
                type: integer
                minimum: 0
              understanding_avg:
                type: number
                minimum: 1
                maximum: 5
              color_level:
                type: string
                enum: [none, low, medium, high]
```

### 4.2 AI Coaching Schemas
```yaml
    AICoachingRequest:
      type: object
      required: [student_id, session_type]
      properties:
        student_id:
          type: string
          format: uuid
        session_id:
          type: string
          format: uuid
          description: 継続セッションの場合
        session_type:
          type: string
          enum: [goal_setting, reflection, encouragement]
        user_message:
          type: string
          maxLength: 1000
        context:
          type: object
          properties:
            current_goals:
              type: array
              items:
                $ref: '#/components/schemas/Goal'
            recent_performance:
              type: object
              properties:
                weekly_avg_understanding:
                  type: number
                subjects_struggling:
                  type: array
                  items:
                    type: string

    AICoachingResponse:
      type: object
      required: [session_id, message, coaching_stage]
      properties:
        session_id:
          type: string
          format: uuid
        message:
          type: string
          description: AIからの応答メッセージ
        coaching_stage:
          type: string
          enum: [goal, reality, options, will]
          description: GROWモデルの現在段階
        suggested_goals:
          type: array
          items:
            $ref: '#/components/schemas/SuggestedGoal'
        next_questions:
          type: array
          items:
            type: string
        metadata:
          type: object
          properties:
            model_used:
              type: string
              enum: [gpt-5-mini]
            response_time_ms:
              type: integer
            token_count:
              type: integer

    Goal:
      type: object
      required: [id, title, target_date, goal_type]
      properties:
        id:
          type: string
          format: uuid
        title:
          type: string
          maxLength: 200
        description:
          type: string
          maxLength: 1000
        target_date:
          type: string
          format: date
        goal_type:
          type: string
          enum: [weekly_test, monthly_exam, behavior]
        target_value:
          type: number
          minimum: 0
        current_value:
          type: number
          minimum: 0
          default: 0
        is_achieved:
          type: boolean
          default: false
        is_smart_compliant:
          type: boolean
          description: SMART原則準拠チェック済み
```

---

## 5. Error Handling (RFC 7807)

### 5.1 Standard Error Response
```yaml
components:
  schemas:
    ProblemDetails:
      type: object
      required: [type, title, status]
      properties:
        type:
          type: string
          format: uri
          description: エラー種別を識別するURI
        title:
          type: string
          description: 人間が読める短いエラーサマリ
        status:
          type: integer
          description: HTTPステータスコード
        detail:
          type: string
          description: 具体的なエラー詳細
        instance:
          type: string
          format: uri
          description: エラーが発生したリクエストURI
        errors:
          type: array
          description: バリデーションエラーの詳細
          items:
            type: object
            properties:
              field:
                type: string
              code:
                type: string
              message:
                type: string

  responses:
    ValidationError:
      description: バリデーションエラー
      content:
        application/problem+json:
          schema:
            $ref: '#/components/schemas/ProblemDetails'
          example:
            type: "https://studyspark.app/problems/validation-error"
            title: "入力値が不正です"
            status: 400
            detail: "理解度は1-5の範囲で入力してください"
            instance: "/api/students/123/records"
            errors:
              - field: "understanding_level"
                code: "out_of_range"
                message: "理解度は1から5の間で選択してください"

    Unauthorized:
      description: 認証エラー
      content:
        application/problem+json:
          schema:
            $ref: '#/components/schemas/ProblemDetails'
          example:
            type: "https://studyspark.app/problems/unauthorized"
            title: "認証が必要です"
            status: 401
            detail: "有効なJWTトークンを含めてリクエストしてください"

    Forbidden:
      description: 認可エラー
      content:
        application/problem+json:
          schema:
            $ref: '#/components/schemas/ProblemDetails'
          example:
            type: "https://studyspark.app/problems/forbidden"
            title: "アクセス権限がありません"
            status: 403
            detail: "この生徒のデータにアクセスする権限がありません"

    RateLimited:
      description: レート制限エラー
      content:
        application/problem+json:
          schema:
            $ref: '#/components/schemas/ProblemDetails'
          example:
            type: "https://studyspark.app/problems/rate-limited"
            title: "レート制限に達しました"
            status: 429
            detail: "AI機能は1分間に3回までです。しばらく待ってから再試行してください"
      headers:
        Retry-After:
          description: 再試行可能になるまでの秒数
          schema:
            type: integer
```

---

## 6. Rate Limiting & Idempotency

### 6.1 Rate Limiting Policy

| Endpoint Category | Limit | Window | Scope |
|-------------------|-------|---------|-------|
| **Learning Records** | 100 requests | 1 hour | per student |
| **AI Coaching** | 30 requests | 1 hour | per student |
| **Dashboard** | 300 requests | 1 hour | per user |
| **Authentication** | 10 requests | 15 min | per IP |

### 6.2 Rate Limit Headers
```yaml
responses:
  '200':
    headers:
      X-RateLimit-Limit:
        description: リクエスト上限
        schema:
          type: integer
      X-RateLimit-Remaining:
        description: 残りリクエスト数
        schema:
          type: integer
      X-RateLimit-Reset:
        description: リセット時刻（Unix timestamp）
        schema:
          type: integer
```

### 6.3 Idempotency Policy

| HTTP Method | Idempotency | Key Header | Behavior |
|-------------|-------------|------------|----------|
| **GET** | Natural | - | Safe operation |
| **POST** (create) | Manual | `Idempotency-Key` | 24h cache, return existing |
| **PUT** | Natural | - | Replace operation |
| **DELETE** | Natural | - | 404 if not exists |

```yaml
requestBody:
  headers:
    Idempotency-Key:
      description: べき等性キー（POST操作用）
      schema:
        type: string
        pattern: '^[A-Za-z0-9\-]{8,64}$'
      example: "req-20240115-abc123def456"
```

---

## 7. Example Requests/Responses

### 7.1 Success Case: Create Study Record
```http
POST /api/students/550e8400-e29b-41d4-a716-446655440000/records
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
Content-Type: application/json
Idempotency-Key: req-20240115-math-class-001

{
  "study_date": "2024-01-15",
  "subject": "math",
  "content_type": "class",
  "understanding_level": 4,
  "time_spent_minutes": 50,
  "memo": "分数の計算がよくわかった！",
  "level_type": "flame"
}
```

```http
HTTP/1.1 201 Created
Content-Type: application/json
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1705334400

{
  "id": "record-789",
  "study_date": "2024-01-15",
  "subject": "math",
  "content_type": "class",
  "understanding_level": 4,
  "time_spent_minutes": 50,
  "memo": "分数の計算がよくわかった！",
  "level_type": "flame",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z",
  "updated_by": "550e8400-e29b-41d4-a716-446655440000"
}
```

### 7.2 Error Case: Validation Error
```http
POST /api/students/550e8400-e29b-41d4-a716-446655440000/records
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
Content-Type: application/json

{
  "study_date": "2024-01-15",
  "subject": "invalid_subject",
  "content_type": "class",
  "understanding_level": 10
}
```

```http
HTTP/1.1 400 Bad Request
Content-Type: application/problem+json

{
  "type": "https://studyspark.app/problems/validation-error",
  "title": "入力値が不正です",
  "status": 400,
  "detail": "複数の入力項目でエラーが発生しました",
  "instance": "/api/students/550e8400-e29b-41d4-a716-446655440000/records",
  "errors": [
    {
      "field": "subject",
      "code": "invalid_enum",
      "message": "科目は math, japanese, science, social, english のいずれかを選択してください"
    },
    {
      "field": "understanding_level",
      "code": "out_of_range",
      "message": "理解度は1から5の間で選択してください"
    }
  ]
}
```

### 7.3 AI Coaching Request/Response
```http
POST /api/ai/goal-coaching
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
Content-Type: application/json

{
  "student_id": "550e8400-e29b-41d4-a716-446655440000",
  "session_type": "goal_setting",
  "user_message": "算数の成績を上げたいです",
  "context": {
    "recent_performance": {
      "weekly_avg_understanding": 2.8,
      "subjects_struggling": ["math"]
    }
  }
}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json
X-RateLimit-Limit: 30
X-RateLimit-Remaining: 29

{
  "session_id": "session-456",
  "message": "算数の成績を上げたい気持ち、とてもよくわかります！まずは現在の状況を整理してみましょう。\n\n算数のどの分野が特に難しく感じますか？例えば、計算問題、文章題、図形問題など、具体的に教えてください。",
  "coaching_stage": "reality",
  "suggested_goals": [],
  "next_questions": [
    "算数のどの分野が最も苦手ですか？",
    "1週間で算数にどのくらい時間をかけていますか？",
    "最近の算数の勉強で、うまくいったことはありますか？"
  ],
  "metadata": {
    "model_used": "gpt-5-mini",
    "response_time_ms": 1250,
    "token_count": 145
  }
}
```

---

## 8. Traceability Matrix

### Requirements to API Mapping

| Req ID | API Endpoint | API ID | DB Operations | Notes |
|--------|--------------|--------|---------------|-------|
| REQ-001 | `POST /students/{id}/records` | API-001 | INSERT/UPDATE study_inputs | 学習記録登録 |
| REQ-001 | `GET /students/{id}/calendar` | API-002 | SELECT study_inputs (aggregated) | ヒートマップ用 |
| REQ-001 | `GET /students/{id}/dashboard` | API-003 | SELECT study_inputs + missions | ダッシュボード統合 |
| REQ-002 | `GET /parents/{id}/dashboard` | API-004 | SELECT via parent_student_relations | 保護者向け概要 |
| REQ-003 | `GET /coaches/{id}/students` | API-007 | SELECT via memberships | 指導者向け一覧 |
| REQ-004 | `POST /ai/goal-coaching` | API-005 | INSERT/UPDATE goals | AI目標設定支援 |
| REQ-005 | `POST /ai/reflection-feedback` | API-006 | INSERT/UPDATE reflections | AI振り返り支援 |

### API to Database Mapping

| API ID | Primary Table | Secondary Tables | Query Pattern |
|--------|---------------|------------------|---------------|
| API-001 | study_inputs | profiles (validation) | UPSERT with conflict resolution |
| API-002 | study_inputs | - | Date range aggregation |
| API-003 | study_inputs | goals, reflections | Multi-table dashboard query |
| API-004 | parent_student_relations | study_inputs, profiles | JOIN with RLS filtering |
| API-005 | goals | study_inputs (context) | AI integration + CRUD |
| API-006 | reflections | study_inputs (summary) | AI integration + weekly aggregation |

### Error Code to Problem Type Mapping

| HTTP Status | Problem Type | API Context | DB Constraint |
|-------------|--------------|-------------|---------------|
| 400 | validation-error | Input validation | CHECK constraints |
| 401 | unauthorized | Missing/invalid JWT | Authentication failure |
| 403 | forbidden | RLS policy violation | Row-level security |
| 404 | not-found | Resource not exists | Foreign key validation |
| 409 | conflict | Unique constraint | UNIQUE constraint violation |
| 429 | rate-limited | API rate limit | Application-level limiting |
| 500 | internal-error | System error | Database connection issues |

---

## 9. Implementation Notes

### 9.1 Next.js API Routes Structure
```
app/api/
├── students/
│   └── [studentId]/
│       ├── records/
│       │   └── route.ts          # API-001
│       ├── calendar/
│       │   └── route.ts          # API-002
│       └── dashboard/
│           └── route.ts          # API-003
├── parents/
│   └── [parentId]/
│       └── dashboard/
│           └── route.ts          # API-004
├── coaches/
│   └── [coachId]/
│       └── students/
│           └── route.ts          # API-007
└── ai/
    ├── goal-coaching/
    │   └── route.ts              # API-005
    └── reflection-feedback/
        └── route.ts              # API-006
```

### 9.2 Middleware Chain
```typescript
// middleware.ts
export const middleware = withAuth(
  withRateLimit(
    withLogging(
      withErrorHandling(
        // Route handler
      )
    )
  )
);
```

### 9.3 Zod Schema Integration
```typescript
// lib/schemas/study-record.ts
import { z } from 'zod';

export const StudyRecordInputSchema = z.object({
  study_date: z.string().date(),
  subject: z.enum(['math', 'japanese', 'science', 'social', 'english']),
  content_type: z.enum(['class', 'homework', 'test_prep', 'exam_prep']),
  understanding_level: z.number().int().min(1).max(5),
  time_spent_minutes: z.number().int().positive().max(480).optional(),
  memo: z.string().max(500).optional(),
  level_type: z.enum(['spark', 'flame', 'blaze']).default('spark'),
});

export type StudyRecordInput = z.infer<typeof StudyRecordInputSchema>;
```

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 0.1 | 2025-01-07 | System | Initial API design from requirements, architecture, and database |