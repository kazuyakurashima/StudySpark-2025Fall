"use server"

import { getDailySparkLevel as getLevel } from "@/lib/utils/daily-spark"

/**
 * Server Action: Daily Sparkレベルを取得
 * @param studentId 生徒ID
 * @param parentUserId 保護者のユーザーID（オプション）
 * @returns SparkLevel
 */
export async function getDailySparkLevel(studentId: number, parentUserId?: string) {
  return await getLevel(studentId, parentUserId)
}
