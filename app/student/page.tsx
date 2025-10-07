import { StudentDashboardClient } from './dashboard-client'
import {
  getStudentDashboardData,
  getAICoachMessage,
  getStudyStreak,
  getRecentStudyLogs,
  getLastLoginInfo,
  getTodayMissionData,
  getLearningCalendarData,
  getWeeklySubjectProgress
} from "@/app/actions/dashboard"
import { getRecentEncouragementMessages } from "@/app/actions/encouragement"

export const dynamic = 'force-dynamic'

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
    calendar,
    weeklySubject
  ] = await Promise.all([
    getStudentDashboardData(),
    getAICoachMessage(),
    getStudyStreak(),
    getRecentStudyLogs(50),
    getRecentEncouragementMessages(),
    getLastLoginInfo(),
    getTodayMissionData(),
    getLearningCalendarData(),
    getWeeklySubjectProgress()
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
    userName: dashboardData?.profile?.display_name || "学習者",
    selectedAvatar: dashboardData?.profile?.avatar_url || "student1",
    aiCoachMessage: coachMsg?.message || "今日も一緒に頑張ろう！",
    studyStreak: typeof streakResult?.streak === "number" ? streakResult.streak : 0,
    recentLogs: Array.isArray(logsResult?.logs) ? logsResult.logs : [],
    recentMessages: messagesResult?.success && Array.isArray(messagesResult?.messages) ? messagesResult.messages : [],
    lastLoginInfo: loginInfo?.error ? null : loginInfo,
    todayProgress: Array.isArray(todayMission?.todayProgress) ? todayMission.todayProgress : [],
    calendarData: calendar?.calendarData || {},
    weeklyProgress: Array.isArray(weeklySubject?.progress) ? weeklySubject.progress : [],
  }

  return <StudentDashboardClient initialData={initialData} />
}
