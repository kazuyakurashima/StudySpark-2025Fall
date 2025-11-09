import { StudentDashboardClient } from './dashboard-client'
import {
  getStudentDashboardData,
  getAICoachMessage,
  getStudyStreak,
  getRecentStudyLogs,
  getLastLoginInfo,
  getTodayMissionData,
  getYesterdayMissionData,
  getLearningCalendarData,
  getWeeklySubjectProgress,
  getWeeklyReflectionStatus,
  getLiveUpdateData
} from "@/app/actions/dashboard"
import { getRecentEncouragementMessages } from "@/app/actions/encouragement"

export default async function StudentDashboard() {
  // Fetch all data in parallel on the server
  const [
    dashboardData,
    coachMsg,
    streakResult,
    logsResult,
    messagesResult,
    loginInfo,
    todayMission,
    yesterdayMission,
    calendar,
    weeklySubject,
    reflectionStatus,
    liveUpdates
  ] = await Promise.all([
    getStudentDashboardData(),
    getAICoachMessage(),
    getStudyStreak(),
    getRecentStudyLogs(50),
    getRecentEncouragementMessages(),
    getLastLoginInfo(),
    getTodayMissionData(),
    getYesterdayMissionData(),
    getLearningCalendarData(),
    getWeeklySubjectProgress(),
    getWeeklyReflectionStatus(),
    getLiveUpdateData()
  ])

  // Handle error states
  if (dashboardData?.error) {
    return (
      <div className="min-h-screen bg-background pb-20 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 font-bold mb-2">データの取得に失敗しました</p>
          <p className="text-muted-foreground">{dashboardData.error}</p>
        </div>
      </div>
    )
  }

  // Prepare data for client component
  const initialData = {
    userName: dashboardData?.profile?.nickname || "学習者",
    selectedAvatar: dashboardData?.profile?.avatar_id || "student1",
    aiCoachMessage: coachMsg?.message || "今日も一緒に頑張ろう！",
    aiCoachMessageCreatedAt: coachMsg?.createdAt || null,
    studyStreak: typeof streakResult?.streak === "number" ? streakResult.streak : 0,
    maxStreak: typeof streakResult?.maxStreak === "number" ? streakResult.maxStreak : 0,
    lastStudyDate: streakResult?.lastStudyDate || null,
    todayStudied: streakResult?.todayStudied || false,
    streakState: streakResult?.streakState || "reset",
    recentLogs: Array.isArray(logsResult?.logs) ? logsResult.logs : [],
    recentMessages: messagesResult?.success && Array.isArray(messagesResult?.messages) ? messagesResult.messages : [],
    lastLoginInfo: loginInfo?.error ? null : loginInfo,
    todayProgress: Array.isArray(todayMission?.todayProgress) ? todayMission.todayProgress : [],
    yesterdayProgress: Array.isArray(yesterdayMission?.yesterdayProgress) ? yesterdayMission.yesterdayProgress : [],
    calendarData: calendar?.calendarData || {},
    weeklyProgress: Array.isArray(weeklySubject?.progress) ? weeklySubject.progress : [],
    sessionNumber: typeof weeklySubject?.sessionNumber === "number" ? weeklySubject.sessionNumber : null,
    reflectionCompleted: reflectionStatus?.reflectionCompleted || false,
    liveUpdates: liveUpdates?.updates || [],
    lastUpdateTime: liveUpdates?.lastUpdateTime || null,
    hasLiveUpdates: liveUpdates?.hasUpdates || false,
  }

  return <StudentDashboardClient initialData={initialData} />
}
