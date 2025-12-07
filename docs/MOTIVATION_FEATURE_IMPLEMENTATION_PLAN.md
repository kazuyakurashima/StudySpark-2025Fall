# モチベーション機能 実装計画書

## 概要

Duolingo調査を踏まえたStudySpark向けモチベーション機能の実装計画。
セルフコンパッション・成長マインドセットの理念に沿い、ストリーク依存を軽減しつつ継続意欲を高める。

## 前提条件

| 項目 | 現状 |
|------|------|
| 生徒数 | 約12名（小5: 6名、小6: 6名） |
| 保護者数 | 0名（未案内） |
| 計測基盤 | Langfuse（AI）のみ、イベントトラッキングなし |
| A/Bテスト | 不可能（規模不足） |
| タイムライン | 3月以降の次年度向け改善 |

---

## 定義の明文化

### 学習日の判定ルール

```
学習日 = study_logs テーブルに当該 student_id の
         study_date が1件以上存在する日
```

- **1日の複数レコード**: 1日として圧縮（DISTINCT study_date）
- **タイムゾーン**: Asia/Tokyo（JST）で判定
- **study_date vs logged_at**: study_dateを学習日として使用（logged_atは記録時刻）

### JST正規化ルール

```sql
-- study_date が DATE型の場合はそのまま使用
-- logged_at から日付を取得する場合は以下で正規化
(logged_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Tokyo')::DATE AS study_date_jst

-- CURRENT_DATE もJSTで取得
(NOW() AT TIME ZONE 'Asia/Tokyo')::DATE AS today_jst
```

**運用ルール:**
- study_logs.study_date は記録時にJST基準で設定される前提
- もし揺れがある場合は logged_at から再計算する補正処理を用意

### 連続日数（Streak）の算出ロジック

```sql
-- 連続日数: 今日または昨日から遡って連続する日数
-- グレースピリオド: 昨日まで記録があれば今日未記録でも継続扱い

WITH today_jst AS (
  SELECT (NOW() AT TIME ZONE 'Asia/Tokyo')::DATE AS today
),
study_days AS (
  SELECT DISTINCT
    student_id,
    study_date
  FROM study_logs
  WHERE student_id = :student_id
),
numbered AS (
  SELECT
    study_date,
    study_date - ROW_NUMBER() OVER (ORDER BY study_date)::INT AS grp
  FROM study_days
),
streaks AS (
  SELECT
    MIN(study_date) AS streak_start,
    MAX(study_date) AS streak_end,
    COUNT(*) AS streak_length
  FROM numbered
  GROUP BY grp
)
SELECT
  CASE
    -- 今日記録あり: そのストリークの長さ
    WHEN streak_end = (SELECT today FROM today_jst) THEN streak_length
    -- 昨日記録あり（グレースピリオド）: そのストリークの長さ
    WHEN streak_end = (SELECT today FROM today_jst) - 1 THEN streak_length
    -- それ以外: 0
    ELSE 0
  END AS current_streak,
  streak_end AS last_study_date
FROM streaks
ORDER BY streak_end DESC
LIMIT 1;
```

**状態定義:**
| 状態 | 条件 | UI表示 |
|------|------|--------|
| active | 今日記録あり | 🔥 継続中 |
| grace | 昨日記録あり、今日未記録 | ⏳ 今日記録で継続 |
| reset | 昨日も今日も記録なし | ✨ 新しいスタート |

### 累積日数（Total）の算出ロジック

```sql
SELECT COUNT(DISTINCT study_date) AS total_study_days
FROM study_logs
WHERE student_id = :student_id;
```

- **リセットされない**: 連続が途切れても累積は減らない
- **全期間集計**: アカウント作成時からの全記録を対象

### 週の定義

- **週の起点**: 月曜日（ISO週）
- **週番号の算出**: `DATE_TRUNC('week', study_date)` （PostgreSQL標準）
- **「直近3週間」**: 今週を含む過去3週間

```sql
-- 週の開始日を取得（月曜日）
DATE_TRUNC('week', study_date)::DATE AS week_start

-- 直近3週間のフィルタ
WHERE study_date >= DATE_TRUNC('week', (NOW() AT TIME ZONE 'Asia/Tokyo')::DATE - INTERVAL '2 weeks')
```

---

## Phase 0: 計測基盤整備

### 目的
- 現状のベースラインを把握
- 後続フェーズの効果測定に使用

### 実装タスク

#### 0-1. 現状確認SQL（手動実行）

```sql
-- 0. JSTの今日を定義
WITH today_jst AS (
  SELECT (NOW() AT TIME ZONE 'Asia/Tokyo')::DATE AS today
),

-- 1. 各生徒の学習日を取得
study_days AS (
  SELECT DISTINCT
    student_id,
    study_date
  FROM study_logs
),

-- 2. 連続日数グループを計算
numbered AS (
  SELECT
    student_id,
    study_date,
    study_date - ROW_NUMBER() OVER (
      PARTITION BY student_id ORDER BY study_date
    )::INT AS grp
  FROM study_days
),

-- 3. 各ストリークの長さを計算
streaks AS (
  SELECT
    student_id,
    MIN(study_date) AS streak_start,
    MAX(study_date) AS streak_end,
    COUNT(*) AS streak_length
  FROM numbered
  GROUP BY student_id, grp
),

-- 4. 現在の連続日数を取得（グレースピリオド考慮）
current_streaks AS (
  SELECT
    student_id,
    CASE
      WHEN streak_end = (SELECT today FROM today_jst) THEN streak_length
      WHEN streak_end = (SELECT today FROM today_jst) - 1 THEN streak_length
      ELSE 0
    END AS current_streak,
    streak_end AS last_study_date,
    CASE
      WHEN streak_end = (SELECT today FROM today_jst) THEN 'active'
      WHEN streak_end = (SELECT today FROM today_jst) - 1 THEN 'grace'
      ELSE 'reset'
    END AS streak_state
  FROM streaks
  WHERE streak_end >= (SELECT today FROM today_jst) - 1
     OR streak_end = (SELECT MAX(streak_end) FROM streaks s2 WHERE s2.student_id = streaks.student_id)
),

-- 5. 累積日数を計算
totals AS (
  SELECT
    student_id,
    COUNT(DISTINCT study_date) AS total_days
  FROM study_logs
  GROUP BY student_id
),

-- 6. 最大連続日数を計算（将来の表示用に同時集計）
max_streaks AS (
  SELECT
    student_id,
    MAX(streak_length) AS max_streak
  FROM streaks
  GROUP BY student_id
)

-- 最終結果
SELECT
  s.id AS student_id,
  p.display_name,
  COALESCE(t.total_days, 0) AS total_days,
  COALESCE(cs.current_streak, 0) AS current_streak,
  COALESCE(ms.max_streak, 0) AS max_streak,
  cs.last_study_date,
  COALESCE(cs.streak_state, 'reset') AS streak_state
FROM students s
JOIN profiles p ON s.user_id = p.id
LEFT JOIN totals t ON s.id = t.student_id
LEFT JOIN current_streaks cs ON s.id = cs.student_id
LEFT JOIN max_streaks ms ON s.id = ms.student_id
ORDER BY total_days DESC;

-- 7. 週次アクティブ生徒数（直近7日、JST基準）
SELECT COUNT(DISTINCT student_id) AS weekly_active
FROM study_logs
WHERE study_date >= (NOW() AT TIME ZONE 'Asia/Tokyo')::DATE - INTERVAL '7 days';

-- 8. 連続切れ後の復帰状況（直近30日でresetになった生徒）
WITH today_jst AS (
  SELECT (NOW() AT TIME ZONE 'Asia/Tokyo')::DATE AS today
),
reset_events AS (
  -- 最終記録日から2日以上経過した生徒
  SELECT
    student_id,
    MAX(study_date) AS last_study_date,
    (SELECT today FROM today_jst) - MAX(study_date) AS days_since_last
  FROM study_logs
  GROUP BY student_id
  HAVING MAX(study_date) < (SELECT today FROM today_jst) - 1
),
resumed AS (
  -- リセット後に復帰した生徒
  SELECT
    r.student_id,
    r.last_study_date AS reset_date,
    MIN(sl.study_date) AS resume_date,
    MIN(sl.study_date) - r.last_study_date AS days_to_resume
  FROM reset_events r
  JOIN study_logs sl ON r.student_id = sl.student_id
    AND sl.study_date > r.last_study_date
  GROUP BY r.student_id, r.last_study_date
)
SELECT
  student_id,
  reset_date,
  resume_date,
  days_to_resume,
  CASE WHEN days_to_resume <= 7 THEN 'within_7_days' ELSE 'after_7_days' END AS resume_speed
FROM resumed;
```

#### 0-2. イベントログテーブル作成

```sql
-- user_events テーブル（イベント計測用）
CREATE TABLE IF NOT EXISTS user_events (
  id BIGSERIAL PRIMARY KEY,

  -- ユーザー識別（必須）
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 生徒識別（生徒イベントの場合。保護者イベントはNULL）
  student_id INT REFERENCES students(id) ON DELETE SET NULL,

  -- ロール（'student' | 'parent' | 'coach' | 'system'）
  user_role VARCHAR(20) NOT NULL,

  -- イベント情報
  event_type VARCHAR(50) NOT NULL,
  event_data JSONB DEFAULT '{}',

  -- Langfuseトレース紐付け（AI生成イベントの場合）
  langfuse_trace_id VARCHAR(100),

  -- 生成コンテンツID（褒めヒント等のDB保存時）
  content_id BIGINT,

  -- タイムスタンプ
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_user_events_user_id ON user_events(user_id);
CREATE INDEX idx_user_events_student_id ON user_events(student_id);
CREATE INDEX idx_user_events_type ON user_events(event_type);
CREATE INDEX idx_user_events_created_at ON user_events(created_at);
CREATE INDEX idx_user_events_langfuse ON user_events(langfuse_trace_id) WHERE langfuse_trace_id IS NOT NULL;
CREATE INDEX idx_user_events_content_id ON user_events(content_id) WHERE content_id IS NOT NULL;

-- RLS
ALTER TABLE user_events ENABLE ROW LEVEL SECURITY;

-- アクセスパターン:
-- 1. 書き込み: Server Actions / API Routes から service_role で実行
-- 2. 読み取り: 管理者ダッシュボードのみ（一般ユーザーは直接参照しない）

-- service_role: 全操作可能
CREATE POLICY "Service role full access"
  ON user_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 一般ユーザー: アクセス不可（Server Actions経由でのみ書き込み）
-- フロントエンドのanonキーではアクセスできない設計
```

**アクセスパターン設計:**
| 操作 | 実行元 | ロール | 方法 |
|------|--------|--------|------|
| INSERT | Server Action | service_role | `createClient({ supabaseKey: serviceRoleKey })` |
| SELECT | 管理ダッシュボード | service_role | 同上 |
| フロント直接 | - | anon | **不可**（RLSでブロック） |

#### 0-3. 計測するイベント定義（全フェーズ対応）

| イベント名 | 発火タイミング | user_role | event_data |
|-----------|---------------|-----------|------------|
| **Phase 0-1** ||||
| `streak_card_view` | StreakCard表示時 | student | `{streak, total_days, state}` |
| `streak_reset` | 連続が途切れた時 | student | `{previous_streak, total_days, last_study_date}` |
| `streak_resume` | リセット後に初回記録時 | student | `{days_since_reset, total_days, previous_streak, resume_date}` |
| **Phase 2** ||||
| `parent_dashboard_view` | 保護者ダッシュボード表示 | parent | `{child_student_id}` |
| `praise_hint_view` | 褒めヒント表示時 | parent | `{hint_category, langfuse_trace_id}` |
| `praise_hint_ng_report` | NG報告ボタン押下時 | parent | `{content_id, reason}` |
| `encouragement_sent` | 応援メッセージ送信時 | parent/coach | `{recipient_student_id, message_length}` |
| `weekly_summary_view` | 週次サマリー閲覧時 | parent | `{week_start}` |
| **Phase 3** ||||
| `badge_earned` | バッジ獲得時 | student | `{badge_id, badge_name, trigger}` |
| `badge_notification_sent` | バッジ通知送信時 | system | `{recipient_user_id, badge_ids}` |
| `badge_card_view` | バッジ一覧表示時 | student | `{earned_count, total_count}` |

> **注**: `badge_notification_sent`の`user_role`は`system`（cronジョブ等のバッチ処理から発火するため）

#### 0-4. streak_resume の判定ロジック

> **注**: `createServiceClient()`, `recordEvent()` の実装は「1-3. イベント記録の実装」を参照

```typescript
// lib/utils/streak-helpers.ts

import { createServiceClient } from "@/lib/supabase/service"
import { recordEvent } from "@/lib/utils/event-tracking"

/**
 * 累積学習日数を取得（DISTINCT study_date の件数）
 *
 * @note 将来の最適化
 * 現在は全study_dateを取得してSet化しているが、データ量増加時は
 * RPC関数（SQL: SELECT COUNT(DISTINCT study_date)）に置き換えること。
 * 例: supabase.rpc('get_total_study_days', { p_student_id: studentId })
 */
async function getTotalDays(studentId: number): Promise<number> {
  const supabase = createServiceClient()
  // Supabase は DISTINCT count を直接サポートしないため、
  // 全study_dateを取得してSet化でユニーク化
  // TODO: データ量増加時はRPC関数に置き換え
  const { data } = await supabase
    .from('study_logs')
    .select('study_date')
    .eq('student_id', studentId)
  const uniqueDays = new Set(data?.map(d => d.study_date) || [])
  return uniqueDays.size
}

/**
 * 学習記録保存時に呼び出し
 * reset状態から記録した場合にstreak_resumeイベントを記録
 */
async function checkAndRecordStreakResume(
  userId: string,
  studentId: number,
  previousState: 'active' | 'grace' | 'reset',
  todayDate: string  // 今日の日付（YYYY-MM-DD, JST）
) {
  const supabase = createServiceClient()

  // reset状態から記録した場合のみstreak_resumeを記録
  if (previousState === 'reset') {
    // 直前のstreak_resetイベントを取得
    const { data: lastReset } = await supabase
      .from('user_events')
      .select('event_data')
      .eq('user_id', userId)
      .eq('event_type', 'streak_reset')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    // last_study_date（実際の最終学習日）からの日数差を計算
    // created_at（イベント記録日時）ではなく、学習日ベースで正確に算出
    const lastStudyDate = lastReset?.event_data?.last_study_date as string | undefined
    const daysSinceReset = lastStudyDate
      ? Math.floor(
          (new Date(todayDate).getTime() - new Date(lastStudyDate).getTime()) / (1000 * 60 * 60 * 24)
        )
      : null

    await recordEvent(userId, 'student', 'streak_resume', {
      days_since_reset: daysSinceReset,
      total_days: await getTotalDays(studentId),
      previous_streak: lastReset?.event_data?.previous_streak || 0,
      resume_date: todayDate
    }, { studentId })
  }
}
```

**日数計算の補足:**
- `days_since_reset`は`streak_reset.event_data.last_study_date`（最終学習日）と復帰日の差分で計算
- `created_at`（イベント記録日時）を使うと、リセット検知タイミングのズレで誤算が生じるため不採用

### 完了基準
- [ ] 現状確認SQLを実行し、結果をスクリーンショット保存
- [ ] user_eventsテーブルをマイグレーションで作成
- [ ] イベント記録用のヘルパー関数を実装（recordEvent）
- [ ] streak_resume判定ロジックを実装
- [ ] ベースラインKPIを記録

### KPI（ベースライン）
- 週次アクティブ生徒数: __名 / 12名
- 平均累積日数: __日
- 平均最大連続日数: __日
- 連続切れ後7日以内復帰率: __% （SQL結果から計算）

---

## Phase 1: 累積日数表示

### 目的
- ストリーク切れ時のメンタルダメージを軽減
- 「努力の総量」を可視化し、再開意欲を維持

### 実装タスク

#### 1-1. API修正: getStudyStreak に累積日数を追加

**ファイル**: `app/actions/dashboard.ts`

```typescript
// 返却値に totalDays を追加
return {
  streak: currentStreak,
  maxStreak: maxStreak,
  totalDays: totalDays,  // 追加
  lastStudyDate: lastStudyDate,
  todayStudied: todayStudied,
  streakState: streakState,
}
```

#### 1-2. UI修正: StreakCard に累積表示を追加

**ファイル**: `components/streak-card.tsx`

**Before:**
```
🔥 5日連続
```

**After:**
```
🔥 5日連続
📚 累計47日

// リセット時のサブテキスト
✨ 新しいスタート
📚 累計47日（リセットされません）
```

**UIコピー定義:**

| 状態 | メイン | サブ | 累積表示 |
|------|--------|------|----------|
| active | 🔥 {streak}日連続 | 学習継続中！ | 📚 累計{total}日 |
| grace | ⏳ {streak}日連続 | 今日記録で継続！ | 📚 累計{total}日 |
| reset | ✨ 新しいスタート | また始めよう！ | 📚 累計{total}日（消えません） |

#### 1-3. イベント記録の実装

**実行経路の方針:**
- イベント記録はServer Actions / API Routes内で実行（フロントから直接呼び出さない）
- RLSはservice_role専用のため、`createServiceClient()`を使用
- フロントエンドのanonキーでは書き込み不可（意図的な設計）

```typescript
// lib/supabase/service.ts（新規作成）

import { createClient } from "@supabase/supabase-js"

/**
 * service_role キーを使用するクライアント
 * Server Actions / API Routes 専用（フロントでは使用不可）
 */
export function createServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false }
  })
}
```

```typescript
// lib/utils/event-tracking.ts

import { createServiceClient } from "@/lib/supabase/service"

interface EventOptions {
  studentId?: number
  langfuseTraceId?: string
  contentId?: number
}

/**
 * イベント記録（service_role使用）
 *
 * @description
 * - Server Actions / API Routes 内で呼び出すこと
 * - フロントから直接呼び出し不可（RLSでブロック）
 * - 失敗時はサイレントエラー（計測失敗で本機能を止めない）
 */
export async function recordEvent(
  userId: string,
  userRole: 'student' | 'parent' | 'coach' | 'system',
  eventType: string,
  eventData: Record<string, any>,
  options: EventOptions = {}
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createServiceClient()

    const { error } = await supabase.from('user_events').insert({
      user_id: userId,
      student_id: options.studentId || null,
      user_role: userRole,
      event_type: eventType,
      event_data: eventData,
      langfuse_trace_id: options.langfuseTraceId || null,
      content_id: options.contentId || null,
    })

    if (error) {
      // ログ出力のみ、例外は投げない
      console.error('[event-tracking] Insert failed:', error.message)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    // 予期せぬエラーもサイレント処理
    console.error('[event-tracking] Unexpected error:', err)
    return { success: false, error: String(err) }
  }
}

// StreakCard表示時（Server Action内で呼び出し）
export async function recordStreakCardView(
  userId: string,
  studentId: number,
  data: {
    streak: number
    totalDays: number
    state: 'active' | 'grace' | 'reset'
  }
) {
  return recordEvent(userId, 'student', 'streak_card_view', data, { studentId })
}

// 連続切れ検知時
export async function recordStreakReset(
  userId: string,
  studentId: number,
  data: {
    previousStreak: number
    totalDays: number
    lastStudyDate: string  // YYYY-MM-DD（復帰日数計算に使用）
  }
) {
  return recordEvent(userId, 'student', 'streak_reset', data, { studentId })
}
```

**エラーハンドリング方針:**
| 状況 | 対応 | 理由 |
|------|------|------|
| INSERT失敗 | サイレントエラー（console.error） | 計測失敗で本機能を止めない |
| RLSブロック | 同上 | 設計ミスの早期検知用にログ出力 |
| ネットワークエラー | 同上 | リトライは行わない（計測ロス許容） |
| UI表示 | エラー時もtoast表示なし | ユーザー体験を損なわない |

**NG報告（ユーザーアクションを伴う場合）:**

> **実行経路**: クライアント → Server Action → DB
> service_roleキーはサーバーサイドでのみ使用可能。クライアントからはServer Actionを呼び出す。

```typescript
// app/actions/praise-hint.ts（Server Action）
"use server"

import { createServiceClient } from "@/lib/supabase/service"
import { recordEvent } from "@/lib/utils/event-tracking"

export async function reportNgPraiseHint(
  userId: string,
  contentId: number,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServiceClient()

  const { error } = await supabase
    .from('praise_hints')
    .update({ ng_reported: true, ng_reason: reason })
    .eq('id', contentId)

  if (error) {
    return { success: false, error: error.message }
  }

  // イベント記録（失敗してもOK）
  await recordEvent(userId, 'parent', 'praise_hint_ng_report', {
    content_id: contentId,
    reason: reason || 'unspecified'
  }, { contentId })

  return { success: true }
}
```

```typescript
// クライアントコンポーネントでの呼び出し例
import { reportNgPraiseHint } from "@/app/actions/praise-hint"

async function handleNgReport(contentId: number, reason?: string) {
  const result = await reportNgPraiseHint(userId, contentId, reason)

  if (!result.success) {
    toast({ variant: 'destructive', description: '報告に失敗しました。再度お試しください。' })
    return
  }

  toast({ description: 'ご報告ありがとうございます。改善に活用させていただきます。' })
}
```

### 完了基準
- [ ] getStudyStreak が totalDays を返す
- [ ] StreakCard に累積日数が表示される
- [ ] リセット時に「累計は消えません」メッセージが表示される
- [ ] イベント記録（streak_card_view, streak_reset, streak_resume）が動作する

### KPI
- 連続切れ後7日以内復帰率: ベースライン比 +10% 目標
- 週次アクティブ率: 維持または向上

### 効果確認方法
- **定性**: 生徒2-3名に直接ヒアリング（「累積表示どう？」）
- **定量**: user_events から streak_reset → streak_resume の日数を集計

```sql
-- 復帰率の計算
WITH resets AS (
  SELECT user_id, created_at AS reset_at
  FROM user_events
  WHERE event_type = 'streak_reset'
),
resumes AS (
  SELECT user_id, created_at AS resume_at, (event_data->>'days_since_reset')::INT AS days
  FROM user_events
  WHERE event_type = 'streak_resume'
)
SELECT
  COUNT(DISTINCT resets.user_id) AS total_resets,
  COUNT(DISTINCT CASE WHEN resumes.days <= 7 THEN resets.user_id END) AS resumed_within_7_days,
  ROUND(
    COUNT(DISTINCT CASE WHEN resumes.days <= 7 THEN resets.user_id END)::NUMERIC /
    NULLIF(COUNT(DISTINCT resets.user_id), 0) * 100, 1
  ) AS resume_rate_7d
FROM resets
LEFT JOIN resumes ON resets.user_id = resumes.user_id
  AND resumes.resume_at > resets.reset_at;
```

---

## Phase 2: 保護者向け機能強化

### 目的
- 保護者に価値を感じてもらえる状態にしてから案内
- 「褒めるヒント」で適切な声かけを支援

### 実装タスク

#### 2-1. 褒めるヒント生成

**ファイル**: 新規 `lib/openai/praise-hint.ts`

```typescript
interface PraiseHintInput {
  studentName: string
  weeklyLogs: {
    totalDays: number
    subjects: string[]
    totalProblems: number
    totalCorrect: number
    streakState: string
    weakSubject?: string  // 苦手科目（正答率最低）
    challengedWeakSubject: boolean  // 苦手科目に挑戦したか
    resumedFromReset: boolean  // リセット後復帰したか
  }
}

interface PraiseHintOutput {
  hint: string
  category: 'process' | 'effort' | 'challenge' | 'recovery' | 'rest'
  langfuseTraceId: string
}
```

**トーンガイド（プロンプトに明記）:**

```
# 褒めるヒント生成ルール

## 必須
- 具体的な行動を褒める（「3日記録した」「理科に挑戦した」）
- プロセスを評価する（結果ではなく努力）
- 短文（50文字以内）

## 禁止
- 他の子との比較（「他の子より」「クラスで一番」）
- 過度なプレッシャー（「もっと頑張って」「毎日やろう」）
- 結果の評価（「100点すごい」「正答率が高い」）

## 状況別テンプレート
- ログ0件: 「今週は忙しかったかな。ゆっくり休んで、また来週一緒に頑張ろう」（category: rest）
- ログ1-2件: 「忙しい中でも記録できたね。その姿勢が大事」（category: effort）
- ログ3件以上: 「コンスタントに取り組めているね。素晴らしい」（category: process）
- 苦手科目に挑戦: 「苦手な{科目}にも挑戦したね。勇気ある行動だよ」（category: challenge）
- 連続切れ後復帰: 「また始められたね。再開する力が一番大事」（category: recovery）
```

**生成内容のDB保存:**

```sql
-- 褒めヒント保存テーブル（品質管理・NG報告紐付け用）
CREATE TABLE praise_hints (
  id BIGSERIAL PRIMARY KEY,
  parent_id UUID NOT NULL REFERENCES auth.users(id),
  student_id INT NOT NULL REFERENCES students(id),
  week_start DATE NOT NULL,
  hint_text TEXT NOT NULL,
  category VARCHAR(20) NOT NULL,
  langfuse_trace_id VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  ng_reported BOOLEAN DEFAULT FALSE,
  ng_reason TEXT,
  UNIQUE(parent_id, student_id, week_start)
);

-- RLS
ALTER TABLE praise_hints ENABLE ROW LEVEL SECURITY;

-- service_role: 全操作可能（生成・NG報告更新）
CREATE POLICY "Service role full access"
  ON praise_hints FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- 保護者: 自分宛のヒントのみ読み取り可能
CREATE POLICY "Parents can read own hints"
  ON praise_hints FOR SELECT TO authenticated
  USING (parent_id = auth.uid());
```

**praise_hints アクセスパターン:**
| 操作 | 実行元 | ロール | 方法 |
|------|--------|--------|------|
| INSERT | AI生成時（Server Action） | service_role | `createServiceClient()` |
| UPDATE（NG報告） | Server Action | service_role | 同上 |
| SELECT | 保護者ダッシュボード | authenticated | 通常クライアント（自分宛のみ） |

#### 2-2. 保護者ダッシュボードに表示

**ファイル**: `app/parent/dashboard-client.tsx`

```tsx
// 褒めるヒントカード
<Card className="bg-gradient-to-r from-amber-50 to-yellow-50">
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <MessageCircle className="h-5 w-5 text-amber-600" />
      今週の褒めポイント
    </CardTitle>
  </CardHeader>
  <CardContent>
    <p className="text-sm text-slate-700">{praiseHint.hint}</p>
    <p className="text-xs text-slate-500 mt-2">
      お子さんにこんな声かけをしてみてください
    </p>
    <div className="flex justify-end mt-3">
      <Button variant="ghost" size="sm" onClick={handleNgReport}>
        <Flag className="h-4 w-4 mr-1" />
        不適切な提案を報告
      </Button>
    </div>
  </CardContent>
</Card>
```

#### 2-3. NG報告機能

```typescript
// NG報告処理
async function handleNgReport(contentId: number, reason?: string) {
  // 1. praise_hints テーブルを更新
  await supabase
    .from('praise_hints')
    .update({ ng_reported: true, ng_reason: reason })
    .eq('id', contentId)

  // 2. イベント記録
  await recordEvent(userId, 'parent', 'praise_hint_ng_report', {
    content_id: contentId,
    reason: reason || 'unspecified'
  }, { contentId })

  // 3. UIフィードバック
  toast({ description: 'ご報告ありがとうございます。改善に活用させていただきます。' })
}
```

#### 2-4. 0件週のUX

| 状況 | 表示内容 | category |
|------|---------|----------|
| ログ0件 | 「今週は忙しかったかな。ゆっくり休んで、また来週一緒に頑張ろう」 | rest |
| 子供全員0件 | 「今週は記録がありませんでした。来週の様子を見守りましょう」 | rest |

**沈黙（非表示）にはしない**: 0件でも必ずメッセージを表示し、保護者が「何も見るものがない」と感じないようにする。

### 品質ガバナンス

#### 品質チェックフロー
1. **生成時**: Langfuseでトレース、DBに保存
2. **週次**: NG報告があったヒントを抽出、パターン分析
3. **改善**: トーンガイドのルール追加、プロンプト調整

#### NG報告のレビュー

```sql
-- 週次でNG報告を確認
SELECT
  ph.id,
  ph.hint_text,
  ph.category,
  ph.ng_reason,
  ph.langfuse_trace_id,
  p.display_name AS student_name
FROM praise_hints ph
JOIN students s ON ph.student_id = s.id
JOIN profiles p ON s.user_id = p.id
WHERE ph.ng_reported = TRUE
  AND ph.created_at >= NOW() - INTERVAL '7 days'
ORDER BY ph.created_at DESC;
```

### 完了基準
- [ ] 褒めるヒント生成関数が実装されている
- [ ] praise_hintsテーブルが作成されている
- [ ] 保護者ダッシュボードにカードが表示される
- [ ] 0件週でも適切なメッセージが表示される
- [ ] NG報告機能が動作し、DBに記録される
- [ ] イベント記録（parent_dashboard_view, praise_hint_view, praise_hint_ng_report）が動作する

### KPI
- 保護者ダッシュボード週次訪問率: __%
- 応援メッセージ送信率: ベースライン比 +20% 目標
- 褒めるヒントNG報告率: 5%未満

---

## Phase 3: マイルストーンバッジ（次年度）

### 目的
- プロセスを評価するバッジで達成感を提供
- 乱発を防ぎ、価値ある報酬として維持

### 初期バッジセット（4個に限定）

| バッジID | 名前 | 条件 | メッセージ | 冷却期間 |
|---------|------|------|----------|---------|
| `first_step` | 🌱 はじめの一歩 | 初回記録 | 最初の一歩を踏み出したね！ | - |
| `day_10` | 🔥 10日チャレンジャー | 累計10日 | 10日分の努力が積み重なったよ！ | - |
| `day_30` | ⭐ 30日マスター | 累計30日 | 1ヶ月分の成長だね！ | - |
| `overcome` | 💪 苦手克服 | 弱点科目を3週連続記録 | 苦手にも向き合えたね！ | 30日 |

### overcome バッジの詳細定義

**弱点科目の判定:**
```sql
-- 過去30日で正答率が最も低い科目（最低5問以上解いた科目のみ）
WITH subject_stats AS (
  SELECT
    subject_id,
    SUM(correct_count) AS total_correct,
    SUM(total_problems) AS total_problems,
    ROUND(SUM(correct_count)::NUMERIC / NULLIF(SUM(total_problems), 0) * 100, 1) AS accuracy
  FROM study_logs
  WHERE student_id = :student_id
    AND study_date >= (NOW() AT TIME ZONE 'Asia/Tokyo')::DATE - INTERVAL '30 days'
  GROUP BY subject_id
  HAVING SUM(total_problems) >= 5
)
SELECT subject_id, accuracy
FROM subject_stats
ORDER BY accuracy ASC
LIMIT 1;
```

**タイの扱い:**
- 正答率が同率の場合、`subject_id`が小さい方（先に登録された科目）を弱点とする
- 実質的に算数 > 国語 > 理科 > 社会 の優先順

**3週連続の判定:**
```sql
-- 直近3週間（月曜起点）で毎週1回以上記録があるか
WITH weeks AS (
  SELECT
    DATE_TRUNC('week', study_date)::DATE AS week_start,
    COUNT(*) AS logs_count
  FROM study_logs
  WHERE student_id = :student_id
    AND subject_id = :weak_subject_id
    AND study_date >= DATE_TRUNC('week', (NOW() AT TIME ZONE 'Asia/Tokyo')::DATE - INTERVAL '2 weeks')
  GROUP BY DATE_TRUNC('week', study_date)
)
SELECT COUNT(*) AS weeks_with_logs
FROM weeks
WHERE logs_count >= 1;
-- 結果が 3 ならバッジ獲得
```

**記録0科目の扱い:**
- 30日間で1件も記録がない科目は弱点判定の対象外
- 全科目0件の場合、overcomeバッジは判定しない

### バッジテーブル設計

```sql
CREATE TABLE badges (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  icon VARCHAR(10) NOT NULL,
  description TEXT,
  condition_type VARCHAR(50) NOT NULL,  -- 'first_log', 'total_days', 'overcome'
  condition_value JSONB,  -- { "days": 10 } など
  cooldown_days INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_badges (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  student_id INT NOT NULL REFERENCES students(id),
  badge_id VARCHAR(50) NOT NULL REFERENCES badges(id),
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  notified_at TIMESTAMPTZ,  -- 通知済み日時
  UNIQUE(student_id, badge_id)  -- 同一バッジは1回のみ
);

-- overcome バッジは冷却期間後に再取得可能にする場合
CREATE TABLE user_badges_history (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  student_id INT NOT NULL REFERENCES students(id),
  badge_id VARCHAR(50) NOT NULL REFERENCES badges(id),
  earned_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: badges（マスタデータ）
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;

-- 全ユーザー読み取り可能（マスタデータ）
CREATE POLICY "Anyone can read badges"
  ON badges FOR SELECT TO authenticated
  USING (true);

-- 書き込みはservice_roleのみ（初期データ投入・管理用）
CREATE POLICY "Service role can manage badges"
  ON badges FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- RLS: user_badges
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

-- 生徒: 自分のバッジのみ読み取り可能
CREATE POLICY "Students can read own badges"
  ON user_badges FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- 書き込みはservice_roleのみ（バッジ付与はServer Action経由）
CREATE POLICY "Service role can manage user_badges"
  ON user_badges FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- RLS: user_badges_history
ALTER TABLE user_badges_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can read own badge history"
  ON user_badges_history FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Service role can manage badge history"
  ON user_badges_history FOR ALL TO service_role
  USING (true) WITH CHECK (true);
```

**バッジ関連テーブル アクセスパターン:**
| テーブル | 操作 | 実行元 | ロール |
|---------|------|--------|--------|
| badges | SELECT | バッジ一覧UI | authenticated |
| badges | INSERT/UPDATE | 初期データ投入 | service_role |
| user_badges | SELECT | 生徒ダッシュボード | authenticated（自分のみ） |
| user_badges | INSERT | バッジ付与（Server Action） | service_role |
| user_badges | UPDATE | 通知済み更新（cron） | service_role |

### 通知制御

**週次まとめ通知:**
- 毎週日曜 18:00 JST にバッジ獲得をまとめて通知
- 0件週は通知スキップ（沈黙）

```typescript
// 週次バッジ通知（cron job）
async function sendWeeklyBadgeNotifications() {
  // 今週獲得したバッジを集計
  const { data: newBadges } = await supabase
    .from('user_badges')
    .select('user_id, student_id, badge_id, badges(name, icon)')
    .gte('earned_at', startOfWeek)
    .is('notified_at', null)

  // ユーザーごとにグループ化
  const grouped = groupBy(newBadges, 'user_id')

  for (const [userId, badges] of Object.entries(grouped)) {
    if (badges.length === 0) continue  // 0件はスキップ

    // 通知送信（アプリ内通知 or プッシュ）
    await sendNotification(userId, {
      title: `今週のバッジ: ${badges.length}個獲得！`,
      body: badges.map(b => `${b.badges.icon} ${b.badges.name}`).join('、')
    })

    // notified_at を更新
    await supabase
      .from('user_badges')
      .update({ notified_at: new Date() })
      .in('id', badges.map(b => b.id))

    // イベント記録
    await recordEvent(userId, 'student', 'badge_notification_sent', {
      badge_ids: badges.map(b => b.badge_id)
    })
  }
}
```

**保護者通知（opt-in）:**
- 保護者設定画面で「バッジ獲得を通知する」をON/OFFできるようにする
- デフォルトはOFF

### 0件週のUX

| 状況 | 表示内容 |
|------|---------|
| 今週バッジ獲得0件 | 通知スキップ（沈黙） |
| バッジ一覧画面 | 「まだ獲得していないバッジ」はグレーアウト表示（ロック感を出しすぎない） |
| 次のバッジまで | 「あと◯日で次のバッジ！」（進捗表示、プレッシャーにならない程度に） |

### 完了基準
- [ ] バッジテーブルがマイグレーションで作成
- [ ] 初期バッジ4個が登録
- [ ] バッジ獲得判定ロジックが実装（overcome含む）
- [ ] 週次まとめ通知が動作
- [ ] 保護者opt-in設定が動作
- [ ] イベント記録（badge_earned, badge_notification_sent, badge_card_view）が動作

### KPI
- バッジ獲得率: 累計10日バッジを80%以上が獲得
- 獲得後の週次アクティブ率: 維持または向上
- 通知開封率: 50%以上

---

## タスク進捗管理

### Phase 0: 計測基盤整備

| タスク | 担当 | 状態 | 期限 |
|--------|------|------|------|
| 0-1. 現状確認SQL実行・結果保存 | - | ✅完了 | 2025-12-05 |
| 0-2. user_eventsテーブル作成 | - | ✅完了 | 2025-12-05 |
| 0-3. praise_hintsテーブル作成 | - | 未着手 | - |
| 0-4. recordEventヘルパー実装 | - | ✅完了 | 2025-12-05 |
| 0-5. streak_resume判定実装 | - | ✅完了 | 2025-12-05 |
| 0-6. ベースラインKPI記録 | - | ✅完了 | 2025-12-05 |

### Phase 1: 累積日数表示

| タスク | 担当 | 状態 | 期限 |
|--------|------|------|------|
| 1-1. getStudyStreak修正 | - | ✅完了 | 2025-12-05 |
| 1-2. StreakCard UI修正 | - | ✅完了 | 2025-12-05 |
| 1-3. イベント記録実装 | - | ✅完了 | 2025-12-05 |
| 1-4. 生徒ヒアリング | - | 未着手 | - |
| 1-5. 効果測定SQL実行 | - | 未着手 | - |

### Phase 2: 保護者向け機能

| タスク | 担当 | 状態 | 期限 |
|--------|------|------|------|
| 2-1. 褒めるヒント生成実装 | - | 未着手 | - |
| 2-2. ダッシュボード表示 | - | 未着手 | - |
| 2-3. NG報告機能 | - | 未着手 | - |
| 2-4. 0件週のUX実装 | - | 未着手 | - |
| 2-5. イベント記録実装 | - | 未着手 | - |
| 2-6. 保護者への案内 | - | 未着手 | - |

### Phase 3: バッジ（次年度）

| タスク | 担当 | 状態 | 期限 |
|--------|------|------|------|
| 3-1. バッジテーブル設計・作成 | - | 未着手 | 3月以降 |
| 3-2. 獲得判定ロジック（累計系） | - | 未着手 | 3月以降 |
| 3-3. 獲得判定ロジック（overcome） | - | 未着手 | 3月以降 |
| 3-4. 週次まとめ通知実装 | - | 未着手 | 3月以降 |
| 3-5. 保護者opt-in設定 | - | 未着手 | 3月以降 |
| 3-6. バッジ一覧UI | - | 未着手 | 3月以降 |

---

## リスクと対策

| リスク | 影響 | 対策 |
|--------|------|------|
| 褒めヒントのトーン逸脱 | 保護者の不信感 | トーンガイド明文化、NG報告、Langfuseトレース、週次レビュー |
| バッジ乱発 | 価値低下 | 初期4個に限定、冷却期間設定、週次まとめ通知 |
| 通知疲れ | 離脱 | 週次まとめ、保護者opt-in、0件週は沈黙 |
| 計測不足で効果不明 | 改善方向が分からない | user_eventsで全イベント記録、SQL集計 |
| overcome条件のエッジケース | 不公平感 | タイ処理・0件科目の扱いを明文化 |
| TZ揺れ | 連続日数の誤計算 | JST正規化ルールを明文化、SQL内で明示 |

---

## 参考資料

- [Duolingo調査結果](./AI_COACH_MESSAGE_UX_ANALYSIS.md)
- [StreakCard実装](../components/streak-card.tsx)
- [既存のAIコーチメッセージ](../lib/openai/coach-message.ts)
- [応援機能バッチ対応改善計画](./ENCOURAGEMENT_BATCH_IMPROVEMENT_PLAN.md) ← Phase 2関連

---

**作成日**: 2025-12-05
**最終更新**: 2025-12-07
**ステータス**: Phase 0-1 完了、本番デプロイ済み、データ収集中

---

## 全体進捗サマリー

| Phase | 状態 | 次のアクション |
|-------|------|--------------|
| Phase 0 | ✅ 5/6完了 | praise_hintsテーブル作成が残り |
| Phase 1 | ✅ 3/5完了 | 生徒ヒアリング・効果測定待ち |
| Phase 2 | 🔲 未着手 | Phase 0-3完了後に着手 |
| Phase 3 | 🔲 未着手 | 次年度（3月以降） |
