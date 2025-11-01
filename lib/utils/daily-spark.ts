"use server"

import { createAdminClient } from "@/lib/supabase/server"
import { getTodayMissionSubjectsFromString } from "./get-today-mission"

/**
 * Daily Sparkのレベル
 * - none: 未達成
 * - child: 子供のみ達成（生徒が今日のミッション完了）
 * - parent: 保護者のみ達成（保護者が今日応援メッセージ送信）
 * - both: 両方達成
 */
export type SparkLevel = "none" | "child" | "parent" | "both"

/**
 * 今日の日付をJST形式で取得（YYYY-MM-DD）
 */
function getTodayInJST(): string {
  const now = new Date()
  const jstOffset = 9 * 60 // JSTはUTC+9
  const jstTime = new Date(now.getTime() + jstOffset * 60 * 1000)

  const year = jstTime.getUTCFullYear()
  const month = String(jstTime.getUTCMonth() + 1).padStart(2, "0")
  const day = String(jstTime.getUTCDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}

/**
 * Daily Sparkのレベルを取得
 * @param studentId 生徒ID
 * @param parentUserId 保護者のユーザーID（保護者ログイン時のみ）
 * @returns SparkLevel
 */
export async function getDailySparkLevel(
  studentId: number,
  parentUserId?: string
): Promise<SparkLevel> {
  const today = getTodayInJST()

  // 子供の達成チェック
  const childAchieved = await checkStudentMissionComplete(studentId, today)

  // 保護者の応援チェック（Phase 2で実装）
  let parentAchieved = false
  if (parentUserId) {
    // TODO: Phase 2で実装
    // parentAchieved = await checkParentEncouragementSent(parentUserId, studentId, today)
  }

  if (childAchieved && parentAchieved) return "both"
  if (childAchieved) return "child"
  if (parentAchieved) return "parent"
  return "none"
}

/**
 * 生徒の今日のミッション達成をチェック（厳格版）
 *
 * 判定基準：指定3科目すべて完了
 * - 月火（ブロックA）: 算数、国語、社会
 * - 水木（ブロックB）: 算数、国語、理科
 * - 金土（ブロックC）: 算数、理科、社会
 * - 日曜: 振り返り（ミッション対象外、常にfalse）
 *
 * @param studentId 生徒ID
 * @param date 日付（YYYY-MM-DD、JST）
 * @returns 達成しているかどうか
 */
async function checkStudentMissionComplete(studentId: number, date: string): Promise<boolean> {
  try {
    // 1. 今日のミッション科目を取得
    const missionSubjects = getTodayMissionSubjectsFromString(date)

    // 日曜日はミッション対象外
    if (missionSubjects.length === 0) {
      return false
    }

    const adminClient = createAdminClient()

    // 2. 今日の学習記録を取得（科目のみ）
    const { data: logs, error } = await adminClient
      .from("study_logs")
      .select("subject")
      .eq("student_id", studentId)
      .eq("study_date", date)

    if (error) {
      console.error("[checkStudentMissionComplete] Error:", error)
      return false
    }

    if (!logs || logs.length === 0) {
      return false
    }

    // 3. 記録された科目を抽出（重複除去）
    const recordedSubjects = [...new Set(logs.map((log) => log.subject))]

    // 4. すべてのミッション科目が記録されているかチェック
    const allSubjectsCompleted = missionSubjects.every((subject) => recordedSubjects.includes(subject))

    return allSubjectsCompleted
  } catch (error) {
    console.error("[checkStudentMissionComplete] Exception:", error)
    return false
  }
}

/**
 * 保護者の今日の応援メッセージ送信をチェック（Phase 2で実装）
 * @param parentUserId 保護者のユーザーID
 * @param studentId 生徒ID
 * @param date 日付（YYYY-MM-DD）
 * @returns 送信しているかどうか
 */
async function checkParentEncouragementSent(
  parentUserId: string,
  studentId: number,
  date: string
): Promise<boolean> {
  try {
    const adminClient = createAdminClient()

    // 今日の応援メッセージをチェック
    const { data: messages, error } = await adminClient
      .from("encouragement_messages")
      .select("id")
      .eq("sender_user_id", parentUserId)
      .eq("student_id", studentId)
      .gte("created_at", `${date}T00:00:00+09:00`)
      .lt("created_at", `${date}T23:59:59+09:00`)
      .limit(1)

    if (error) {
      console.error("[checkParentEncouragementSent] Error:", error)
      return false
    }

    // 応援メッセージが1件でもあれば達成とみなす
    return messages && messages.length > 0
  } catch (error) {
    console.error("[checkParentEncouragementSent] Exception:", error)
    return false
  }
}
