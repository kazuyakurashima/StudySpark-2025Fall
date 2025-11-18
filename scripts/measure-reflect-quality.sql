-- ========================================
-- Phase 1-2 効果測定クエリ
-- ========================================
-- 実行頻度: 週次（土曜夜または日曜）
-- 目的: リフレクト機能の改善効果を定量測定
--
-- 判断基準（2週間後）:
--   IF 「⚠️ 時間帯のみ（境界）」ケースが週5件以上
--     AND そのうち50%以上が「来週やらなかった」と報告
--   THEN Phase 2.5 実施検討
--   ELSE 現状維持
-- ========================================

-- 📊 メインクエリ: 振り返りセッションの品質分析
WITH recent_sessions AS (
  SELECT
    cs.id,
    cs.student_id,
    s.login_id,
    cs.week_start_date,
    cs.turn_count,
    cs.completed_at,
    cs.messages::text as messages_text,
    -- 最終行動計画の抽出（最後のユーザー発言）
    (
      SELECT content
      FROM jsonb_array_elements(cs.messages) msg
      WHERE msg->>'role' = 'user'
      ORDER BY (msg->>'timestamp')::timestamp DESC
      LIMIT 1
    ) as final_action_plan
  FROM coaching_sessions cs
  INNER JOIN students s ON s.id = cs.student_id
  WHERE cs.session_type = 'reflect'
    AND cs.completed_at >= CURRENT_DATE - INTERVAL '14 days'  -- 過去2週間
    AND cs.completed_at IS NOT NULL  -- 完了済みのみ
)
SELECT
  week_start_date,
  login_id,
  turn_count,
  final_action_plan,
  LENGTH(final_action_plan) as plan_length,

  -- 🔍 具体性レベルの判定
  CASE
    WHEN final_action_plan ~* '月曜|火曜|水曜|木曜|金曜|土曜|日曜|毎日|毎朝|毎晩' THEN '✅ 曜日指定'
    WHEN final_action_plan ~* '\d+時|\d+分|放課後|寝る前' THEN '✅ 時刻指定'
    WHEN final_action_plan ~* '\d+回|\d+問|\d+ページ' THEN '✅ 回数指定'
    WHEN final_action_plan ~* '朝|昼|夜' AND LENGTH(final_action_plan) BETWEEN 15 AND 25 THEN '⚠️ 時間帯のみ（境界）'
    WHEN final_action_plan ~* 'やれる時|できる時|余裕' THEN '❌ 曖昧（旧問題）'
    ELSE '❓ その他'
  END as specificity_level,

  -- 🔍 選択肢提示の有無判定
  CASE
    WHEN messages_text ~* 'パターン1|パターン2|パターン3' THEN '✅ 選択肢提示あり'
    ELSE '通常深掘り'
  END as scaffolding_used,

  -- 🔍 困惑シグナルの有無
  CASE
    WHEN messages_text ~* 'うーん|難しい|わからない' THEN '✅ 困惑検出'
    ELSE '-'
  END as hesitation_detected

FROM recent_sessions
ORDER BY week_start_date DESC, login_id;


-- ========================================
-- 📈 サマリー統計
-- ========================================

WITH recent_sessions AS (
  SELECT
    cs.id,
    cs.student_id,
    cs.week_start_date,
    cs.messages::text as messages_text,
    (
      SELECT content
      FROM jsonb_array_elements(cs.messages) msg
      WHERE msg->>'role' = 'user'
      ORDER BY (msg->>'timestamp')::timestamp DESC
      LIMIT 1
    ) as final_action_plan
  FROM coaching_sessions cs
  WHERE cs.session_type = 'reflect'
    AND cs.completed_at >= CURRENT_DATE - INTERVAL '14 days'
    AND cs.completed_at IS NOT NULL
),
classified AS (
  SELECT
    week_start_date,
    CASE
      WHEN final_action_plan ~* '月曜|火曜|水曜|木曜|金曜|土曜|日曜|毎日|毎朝|毎晩' THEN 'specific'
      WHEN final_action_plan ~* '\d+時|\d+分|放課後|寝る前' THEN 'specific'
      WHEN final_action_plan ~* '\d+回|\d+問|\d+ページ' THEN 'specific'
      WHEN final_action_plan ~* '朝|昼|夜' AND LENGTH(final_action_plan) BETWEEN 15 AND 25 THEN 'boundary'
      WHEN final_action_plan ~* 'やれる時|できる時|余裕' THEN 'vague'
      ELSE 'other'
    END as category,
    CASE
      WHEN messages_text ~* 'パターン1|パターン2|パターン3' THEN true
      ELSE false
    END as used_scaffolding,
    CASE
      WHEN messages_text ~* 'うーん|難しい|わからない' THEN true
      ELSE false
    END as detected_hesitation
  FROM recent_sessions
)
SELECT
  '📊 全体サマリー（過去2週間）' as section,
  COUNT(*) as total_sessions,
  ROUND(100.0 * SUM(CASE WHEN category = 'specific' THEN 1 ELSE 0 END) / COUNT(*), 1) as specific_rate_percent,
  ROUND(100.0 * SUM(CASE WHEN category = 'boundary' THEN 1 ELSE 0 END) / COUNT(*), 1) as boundary_rate_percent,
  ROUND(100.0 * SUM(CASE WHEN category = 'vague' THEN 1 ELSE 0 END) / COUNT(*), 1) as vague_rate_percent,
  ROUND(100.0 * SUM(CASE WHEN used_scaffolding THEN 1 ELSE 0 END) / COUNT(*), 1) as scaffolding_usage_percent,
  ROUND(100.0 * SUM(CASE WHEN detected_hesitation THEN 1 ELSE 0 END) / COUNT(*), 1) as hesitation_detected_percent
FROM classified;


-- ========================================
-- 🎯 成功指標チェック
-- ========================================

WITH recent_sessions AS (
  SELECT
    cs.id,
    cs.messages::text as messages_text,
    (
      SELECT content
      FROM jsonb_array_elements(cs.messages) msg
      WHERE msg->>'role' = 'user'
      ORDER BY (msg->>'timestamp')::timestamp DESC
      LIMIT 1
    ) as final_action_plan
  FROM coaching_sessions cs
  WHERE cs.session_type = 'reflect'
    AND cs.completed_at >= CURRENT_DATE - INTERVAL '14 days'
    AND cs.completed_at IS NOT NULL
),
metrics AS (
  SELECT
    COUNT(*) as total,
    SUM(CASE WHEN final_action_plan ~* 'やれる時|できる時|余裕' THEN 1 ELSE 0 END) as vague_count,
    SUM(CASE WHEN
      final_action_plan ~* '月曜|火曜|水曜|木曜|金曜|土曜|日曜|毎日|毎朝|毎晩|\d+時|\d+分|\d+回|\d+問'
      THEN 1 ELSE 0 END) as specific_count,
    SUM(CASE WHEN
      final_action_plan ~* '朝|昼|夜' AND LENGTH(final_action_plan) BETWEEN 15 AND 25
      THEN 1 ELSE 0 END) as boundary_count,
    SUM(CASE WHEN messages_text ~* 'パターン1|パターン2|パターン3' THEN 1 ELSE 0 END) as scaffolding_count
  FROM recent_sessions
)
SELECT
  '🎯 成功指標' as metric,
  '目標値' as target,
  '実測値' as actual,
  '判定' as status
UNION ALL
SELECT
  '旧問題の解消',
  'ゼロ',
  vague_count::text || ' 件',
  CASE WHEN vague_count = 0 THEN '✅ 達成' ELSE '❌ 要改善' END
FROM metrics
UNION ALL
SELECT
  '具体的計画率',
  '70%以上',
  ROUND(100.0 * specific_count / NULLIF(total, 0), 1)::text || '%',
  CASE WHEN ROUND(100.0 * specific_count / NULLIF(total, 0), 1) >= 70 THEN '✅ 達成' ELSE '⚠️ 要観察' END
FROM metrics
UNION ALL
SELECT
  '境界ケース発生率',
  '10%未満',
  ROUND(100.0 * boundary_count / NULLIF(total, 0), 1)::text || '%',
  CASE WHEN ROUND(100.0 * boundary_count / NULLIF(total, 0), 1) < 10 THEN '✅ 達成' ELSE '⚠️ Phase 2.5 検討' END
FROM metrics
UNION ALL
SELECT
  '選択肢利用率',
  '20%以上',
  ROUND(100.0 * scaffolding_count / NULLIF(total, 0), 1)::text || '%',
  CASE WHEN ROUND(100.0 * scaffolding_count / NULLIF(total, 0), 1) >= 20 THEN '✅ 達成' ELSE '⚠️ 要観察' END
FROM metrics;


-- ========================================
-- 📅 週別トレンド分析
-- ========================================

WITH recent_sessions AS (
  SELECT
    cs.week_start_date,
    (
      SELECT content
      FROM jsonb_array_elements(cs.messages) msg
      WHERE msg->>'role' = 'user'
      ORDER BY (msg->>'timestamp')::timestamp DESC
      LIMIT 1
    ) as final_action_plan
  FROM coaching_sessions cs
  WHERE cs.session_type = 'reflect'
    AND cs.completed_at >= CURRENT_DATE - INTERVAL '14 days'
    AND cs.completed_at IS NOT NULL
)
SELECT
  week_start_date,
  COUNT(*) as sessions,
  SUM(CASE WHEN
    final_action_plan ~* '月曜|火曜|水曜|木曜|金曜|土曜|日曜|毎日|毎朝|毎晩|\d+時|\d+分|\d+回|\d+問'
    THEN 1 ELSE 0 END) as specific,
  SUM(CASE WHEN
    final_action_plan ~* '朝|昼|夜' AND LENGTH(final_action_plan) BETWEEN 15 AND 25
    THEN 1 ELSE 0 END) as boundary,
  SUM(CASE WHEN final_action_plan ~* 'やれる時|できる時|余裕' THEN 1 ELSE 0 END) as vague,
  ROUND(100.0 * SUM(CASE WHEN
    final_action_plan ~* '月曜|火曜|水曜|木曜|金曜|土曜|日曜|毎日|毎朝|毎晩|\d+時|\d+分|\d+回|\d+問'
    THEN 1 ELSE 0 END) / COUNT(*), 1) as specific_rate
FROM recent_sessions
GROUP BY week_start_date
ORDER BY week_start_date DESC;
