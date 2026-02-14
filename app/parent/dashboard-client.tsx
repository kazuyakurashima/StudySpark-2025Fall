"use client"

export const dynamic = 'force-dynamic'

import React, { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import ParentBottomNavigation from "@/components/parent-bottom-navigation"
import { UserProfileHeader } from "@/components/common/user-profile-header"
import { PageHeader } from "@/components/common/page-header"
import { Flame, Calendar, Home, Flag, MessageCircle, BarChart3, Clock, Heart, Sparkles, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, RefreshCw } from "lucide-react"
import { WeeklySubjectProgressCard } from "@/components/weekly-subject-progress-card"
import { StudentAssessmentSection } from "@/components/assessment/student-assessment-section"
import { useUserProfile } from "@/lib/hooks/use-user-profile"
import { hexWithAlpha, isThemeActive } from "@/lib/utils/theme-color"
import { isError } from "@/lib/types/profile"
import { StreakCard } from "@/components/streak-card"
import { useParentDashboard, prefetchChildDashboard, type ParentDashboardData as SWRDashboardData } from "@/lib/hooks/use-parent-dashboard"
import { groupLogsByBatch, getRepresentativeLog, type FeedbackMaps, type StudyLogWithBatch, type GroupedLogEntry } from "@/lib/utils/batch-grouping"

// 🚀 パフォーマンス改善: カレンダーコンポーネントを遅延ロード（IntersectionObserver で真の遅延ロード）
import LazyCalendarWrapper from './components/lazy-calendar-wrapper'

/**
 * SSR初期データをSWR形式に変換する関数
 * SSR: todayMission, calendarData, reflectionStatus, streakState
 * SWR: todayProgress, calendar, reflection, state
 */
function transformSSRtoSWRData(
  childId: number,
  ssrData: import("@/lib/types/profile").ParentDashboardData | null
): Partial<SWRDashboardData> | undefined {
  if (!ssrData) return undefined

  return {
    childId,
    todayStatus: isError(ssrData.todayStatus)
      ? { message: "", createdAt: null, error: ssrData.todayStatus.error }
      : { message: ssrData.todayStatus.message, createdAt: ssrData.todayStatus.createdAt || null },
    streak: isError(ssrData.streak)
      ? { streak: 0, maxStreak: 0, lastStudyDate: null, todayStudied: false, state: "reset" as const, error: ssrData.streak.error }
      : {
          streak: ssrData.streak.streak,
          maxStreak: (ssrData.streak as any).maxStreak || 0,
          lastStudyDate: (ssrData.streak as any).lastStudyDate || null,
          todayStudied: (ssrData.streak as any).todayStudied || false,
          state: (ssrData.streak as any).streakState || "reset",
        },
    todayProgress: isError(ssrData.todayMission)
      ? { todayProgress: [], error: ssrData.todayMission.error }
      : { todayProgress: ssrData.todayMission.todayProgress },
    weeklyProgress: isError(ssrData.weeklyProgress)
      ? { progress: [], sessionNumber: null, error: ssrData.weeklyProgress.error }
      : { progress: ssrData.weeklyProgress.progress, sessionNumber: ssrData.weeklyProgress.sessionNumber },
    calendar: isError(ssrData.calendarData)
      ? { calendarData: {}, error: ssrData.calendarData.error }
      : { calendarData: ssrData.calendarData.calendarData },
    recentLogs: isError(ssrData.recentLogs)
      ? { logs: [], batchFeedbacks: {}, legacyFeedbacks: {}, error: ssrData.recentLogs.error }
      : {
          logs: ssrData.recentLogs.logs,
          batchFeedbacks: (ssrData.recentLogs as any).batchFeedbacks || {},
          legacyFeedbacks: (ssrData.recentLogs as any).legacyFeedbacks || {},
        },
    recentMessages: isError(ssrData.recentMessages)
      ? { messages: [], error: ssrData.recentMessages.error }
      : { messages: ssrData.recentMessages.messages },
    reflection: isError(ssrData.reflectionStatus)
      ? { completed: false, error: ssrData.reflectionStatus.error }
      : { completed: ssrData.reflectionStatus.completed },
    fetchedAt: Date.now(),
  }
}

const getGreetingMessage = (userName: string, lastLoginInfo: { lastLoginDays: number | null, lastLoginHours: number, isFirstTime: boolean } | null) => {
  if (!lastLoginInfo || lastLoginInfo.isFirstTime || lastLoginInfo.lastLoginDays === 0) {
    return `はじめまして、${userName}さん`
  }

  if (lastLoginInfo.lastLoginHours < 24) {
    return `おかえりなさい、${userName}さん`
  }

  return `お久しぶり、${userName}さん`
}

// ユーティリティ関数: 日時のフォーマット（JST）
function formatDateTime(isoString: string | null) {
  if (!isoString) return ""
  const date = new Date(isoString)

  // JST で日付と時刻を取得
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Tokyo',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })

  return formatter.format(date)
}

const getAvatarSrc = (avatarId?: string) => {
  if (avatarId && avatarId.startsWith("http")) {
    return avatarId
  }

  const avatarMap: { [key: string]: string } = {
    student1: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/student1-xZFJU5uXJO4DEfUbq1jbTMQUXReyM0.png",
    student2: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/student2-mZ9Q9oVm43IQoRyxSYytVFYgp3JS1V.png",
    student3: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/student3-teUpOKnopXNhE2vGFtvz9RWtC7O6kv.png",
    student4: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/student4-pKazGXekCT1H5kzHBqmfOrM1968hML.png",
    student5: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/student5-kehwNSIKsgkTL6EkAPO2evB3qJWnRM.png",
    student6: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/student6-dJrMk7uUxYSRMp5tMJ3t4KYDOEIuNl.png",
    coach: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/coach-LENT7C1nR9yWT7UBNTHgxnWakF66Pr.png",
    ai_coach: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/ai_coach-oDEKn6ZVqTbEdoExg9hsYQC4PTNbkt.png",
    parent1: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/parent1-HbhESuJlC27LuGOGupullRXyEUzFLy.png",
    parent2: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/parent2-zluk4uVJLfzP8dBe0I7v5fVGSn5QfU.png",
    parent3: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/parent3-EzBDrjsFP5USAgnSPTXjcdNeq1bzSm.png",
    parent4: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/parent4-YHYTNRnNQ7bRb6aAfTNEFMozjGRlZq.png",
    parent5: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/parent5-dGCLocpgcZw4lXWRiPmTHkXURBXXoH.png",
    parent6: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/parent6-gKoeUywhHoKWJ4BPEk69iW6idztaLl.png",
  }
  return avatarMap[avatarId || ""] || avatarMap["student1"]
}

const ParentTodayMissionCard = ({
  todayProgress,
  studentName,
  selectedChildId,
  isReflectCompleted,
  onMessagesUpdate,
  encouragementStatus,
  setEncouragementStatus
}: {
  todayProgress: Array<{subject: string, accuracy: number, correctCount: number, totalProblems: number, logs: any[]}>,
  studentName: string,
  selectedChildId: number | null,
  isReflectCompleted: boolean,
  onMessagesUpdate: (messages: any[]) => void,
  encouragementStatus: { [childId: number]: boolean },
  setEncouragementStatus: (status: { [childId: number]: boolean }) => void
}) => {
  const [expandedLogs, setExpandedLogs] = useState<Set<number>>(new Set())
  const [encouragementSent, setEncouragementSent] = useState<{ [key: string]: boolean }>({})
  const [showAIDialog, setShowAIDialog] = useState(false)
  const [aiMessages, setAiMessages] = useState<string[]>([])
  const [selectedMessage, setSelectedMessage] = useState<string>("")
  const [currentLogId, setCurrentLogId] = useState<string | null>(null)
  const [currentSubject, setCurrentSubject] = useState<string>("")
  const [isGeneratingAI, setIsGeneratingAI] = useState(false)
  const [isSendingMessage, setIsSendingMessage] = useState(false)

  const toggleExpandLog = (index: number) => {
    setExpandedLogs(prev => {
      const newSet = new Set(prev)
      if (newSet.has(index)) {
        newSet.delete(index)
      } else {
        newSet.add(index)
      }
      return newSet
    })
  }

  const getTodayWeekday = () => {
    const today = new Date()
    // JST での曜日を取得
    const formatter = new Intl.DateTimeFormat('ja-JP', {
      timeZone: 'Asia/Tokyo',
      weekday: 'short'
    })
    const weekdayStr = formatter.format(today)
    // 曜日文字列を数値に変換
    const weekdayMap: { [key: string]: number } = {
      '日': 0, '月': 1, '火': 2, '水': 3, '木': 4, '金': 5, '土': 6
    }
    return weekdayMap[weekdayStr] ?? 0 // 0=日曜, 1=月曜, ..., 6=土曜
  }

  const getCurrentHour = () => {
    const now = new Date()
    // JST での時刻を取得
    const formatter = new Intl.DateTimeFormat('ja-JP', {
      timeZone: 'Asia/Tokyo',
      hour: 'numeric',
      hour12: false
    })
    const parts = formatter.formatToParts(now)
    const hour = Number(parts.find(p => p.type === 'hour')?.value)
    return hour
  }

  const getSubjectBlock = (weekday: number) => {
    const blocks = {
      1: ["算数", "国語", "社会"], // 月曜 - ブロックA
      2: ["算数", "国語", "社会"], // 火曜 - ブロックA
      3: ["算数", "国語", "理科"], // 水曜 - ブロックB
      4: ["算数", "国語", "理科"], // 木曜 - ブロックB
      5: ["算数", "理科", "社会"], // 金曜 - ブロックC
      6: ["算数", "理科", "社会"], // 土曜 - ブロックC
    }
    return blocks[weekday as keyof typeof blocks] || []
  }

  const getMissionMode = (weekday: number, hour: number) => {
    if (weekday === 0) return "special" // 日曜日も特別モード
    if (weekday === 6 && hour >= 12) return "special" // 土曜12時以降
    // 月〜金（土曜12時前も）は全て入力促進モード
    return "input"
  }

  const getMissionData = (weekday: number, hour: number) => {
    const mode = getMissionMode(weekday, hour)
    const subjects = getSubjectBlock(weekday)

    // Convert todayProgress array to map for easy lookup
    const progressMap: { [subject: string]: { accuracy: number; inputCount: number; logs: any[] } } = {}
    todayProgress.forEach((item) => {
      progressMap[item.subject] = {
        accuracy: item.accuracy,
        inputCount: item.logs.length,
        logs: item.logs,
      }
    })

    // 土曜12時以降・日曜日：特別モード（リフレクト + 低正答率2科目）
    if (mode === "special") {
      const lowAccuracySubjects = todayProgress
        .filter((item) => item.accuracy < 80 && item.totalProblems > 0)
        .slice(0, 2)
        .map((item) => ({
          subject: item.subject,
          correctRate: item.accuracy,
          needsAction: true,
          type: "review",
          isCompleted: false,
          logs: item.logs,
        }))

      const panels = [
        {
          name: "リフレクト",
          status: isReflectCompleted ? "完了" : "未完了",
          description: "週間振り返り",
          type: "reflect",
          needsAction: !isReflectCompleted,
          isCompleted: isReflectCompleted,
        },
        ...lowAccuracySubjects.map((item) => ({
          subject: item.subject,
          correctRate: item.correctRate,
          status: `進捗率${item.correctRate}%`,
          needsAction: item.needsAction,
          type: "review",
          isCompleted: item.isCompleted,
          logs: item.logs,
        })),
      ]

      const completedCount = panels.filter((p) => p.isCompleted).length
      const allCompleted = completedCount === panels.length

      return {
        mode: "special",
        subjects: lowAccuracySubjects.map((item) => item.subject),
        panels,
        statusMessage: allCompleted
          ? "特別ミッション完了！今週もお疲れさまでした！"
          : `週間振り返りと復習で今週を締めくくりましょう！`,
        completionStatus: `${completedCount}/${panels.length}入力完了`,
        allCompleted,
      }
    }

    // 通常モード（入力促進モード）
    const panels = subjects.map((subject) => {
      const data = progressMap[subject] || { accuracy: 0, inputCount: 0, logs: [] }
      let status = "未入力"
      let needsAction = false
      let isCompleted = false

      // 完了判定: 入力あり＋正答率80%以上
      if (data.inputCount > 0) {
        // 入力あり
        if (data.accuracy >= 80) {
          // 入力あり＋正答率80%以上 → 完了
          status = `進捗率${data.accuracy}%`
          isCompleted = true
          needsAction = false
        } else {
          // 入力あり＋正答率80%未満 → 入力済みだが要改善
          status = `進捗率${data.accuracy}%`
          isCompleted = false
          needsAction = true
        }
      } else {
        // 入力なし → 未入力
        status = "未入力"
        needsAction = true
        isCompleted = false
      }

      return {
        subject,
        status,
        needsAction,
        isCompleted,
        correctRate: data.accuracy,
        inputCount: data.inputCount,
        logs: data.logs,
      }
    })

    const completedCount = panels.filter((p) => p.isCompleted).length
    const actionNeededCount = panels.filter((p) => p.needsAction).length

    // 全て完了した場合の判定
    const allCompleted = completedCount === panels.length

    // 保護者向け：入力数を取得
    const inputCount = panels.filter((p) => p.inputCount > 0).length

    // 保護者向けミッション状況メッセージ（温かく、プレッシャーを与えない）
    let statusMessage = ""
    if (completedCount === panels.length) {
      // 全科目完了（3/3）
      statusMessage = "✨ 今日のミッション達成！素晴らしい頑張りです"
    } else if (completedCount === panels.length - 1) {
      // 2科目完了（2/3）
      statusMessage = "💪 2科目達成！順調に進んでいます"
    } else if (completedCount === 1) {
      // 1科目完了（1/3）
      statusMessage = "📚 1科目達成！マイペースに頑張っています"
    } else if (inputCount > 0) {
      // 入力はあるが正答率が低い場合
      statusMessage = "挑戦中！難しい問題にも取り組んでいます"
    } else {
      // 未完了（0/3）
      statusMessage = "今日はこれから。温かく見守りましょう"
    }

    return {
      mode,
      subjects,
      panels,
      statusMessage,
      completionStatus: {
        inputCount,
        completedCount,
        totalCount: panels.length,
      },
      allCompleted,
    }
  }

  const todayWeekday = getTodayWeekday()
  const currentHour = getCurrentHour()
  const missionData = getMissionData(todayWeekday, currentHour)

  const getSubjectColor = (subject: string) => {
    const colors = {
      算数: "border-l-4 border-l-blue-500 bg-blue-50/80",
      国語: "border-l-4 border-l-pink-500 bg-pink-50/80",
      理科: "border-l-4 border-l-orange-500 bg-orange-50/80",
      社会: "border-l-4 border-l-emerald-500 bg-emerald-50/80",
    }
    return colors[subject as keyof typeof colors] || "border-l-4 border-l-slate-400 bg-slate-50/80"
  }

  const getStatusBadgeColor = (status: string, needsAction: boolean) => {
    if (status === "未入力") {
      // 未入力は赤
      return "bg-red-100 text-red-800 border-red-300"
    }
    if (status.includes("進捗率")) {
      const rate = Number.parseInt(status.match(/\d+/)?.[0] || "0")
      // 80%以上は青、50-80%未満は黄色、50%未満はオレンジ
      if (rate >= 80) return "bg-blue-100 text-blue-800 border-blue-300 font-bold"
      if (rate >= 50) return "bg-yellow-100 text-yellow-800 border-yellow-300"
      return "bg-orange-100 text-orange-800 border-orange-300"
    }
    if (status === "完了") return "bg-green-100 text-green-800 border-green-200 font-bold"
    if (status === "未完了") return "bg-slate-100 text-slate-700 border-slate-300"
    return "bg-slate-100 text-slate-700 border-slate-300"
  }

  const getModeTitle = () => {
    return "今日のミッション"
  }

  const handleQuickEncouragement = async (subject: string, logIndex: number, studyLogId: string | undefined, type: "heart" | "star" | "thumbsup") => {
    if (!selectedChildId || !studyLogId) {
      alert("学習記録が見つかりません")
      return
    }

    try {
      const { sendQuickEncouragement } = await import("@/app/actions/encouragement")
      const result = await sendQuickEncouragement(selectedChildId.toString(), studyLogId, type)

      if (result.success) {
        const key = `${subject}-${logIndex}`
        setEncouragementSent({ ...encouragementSent, [key]: true })

        // 応援ステータスを更新（ハートバッジを表示）
        setEncouragementStatus({ ...encouragementStatus, [selectedChildId]: true })

        alert("応援メッセージを送信しました！")

        // 直近の応援履歴を再取得
        const { getStudentRecentMessages } = await import("@/app/actions/parent-dashboard")
        const messagesResult = await getStudentRecentMessages(selectedChildId, 3)
        if (!isError(messagesResult)) {
          onMessagesUpdate(messagesResult.messages)
        }
      } else {
        alert(`エラー: ${result.error}`)
      }
    } catch (error) {
      console.error("応援送信エラー:", error)
      alert("応援メッセージの送信に失敗しました")
    }
  }

  const handleOpenAIDialog = async (subject: string, studyLogId?: string) => {
    if (!selectedChildId || !studyLogId) {
      alert("学習記録が見つかりません")
      return
    }

    setCurrentLogId(studyLogId)
    setCurrentSubject(subject)
    setShowAIDialog(true)
    setIsGeneratingAI(true)
    setAiMessages([])
    setSelectedMessage("")

    try {
      const { generateAIEncouragement } = await import("@/app/actions/encouragement")
      const result = await generateAIEncouragement(selectedChildId.toString(), studyLogId)

      if (result.success && result.messages && result.messages.length > 0) {
        setAiMessages(result.messages)
        setSelectedMessage(result.messages[0])
        setIsGeneratingAI(false)
      } else {
        alert(`エラー: ${result.error || "AI応援メッセージ生成に失敗しました"}`)
        setShowAIDialog(false)
        setIsGeneratingAI(false)
      }
    } catch (error) {
      console.error("AI応援エラー:", error)
      alert("AI応援機能でエラーが発生しました")
      setShowAIDialog(false)
      setIsGeneratingAI(false)
    }
  }

  const handleSendAIMessage = async () => {
    if (!selectedChildId || !currentLogId || !selectedMessage.trim()) {
      alert("メッセージを選択または入力してください")
      return
    }

    setIsSendingMessage(true)
    try {
      const { sendCustomEncouragement } = await import("@/app/actions/encouragement")
      const result = await sendCustomEncouragement(selectedChildId.toString(), currentLogId, selectedMessage, "ai")

      if (result.success) {
        alert("AI応援メッセージを送信しました！")
        setShowAIDialog(false)

        // Mark as sent in UI (use same key format as quick encouragement)
        const key = `${currentSubject}-0`
        setEncouragementSent({ ...encouragementSent, [key]: true })

        // 応援ステータスを更新（ハートバッジを表示）
        setEncouragementStatus({ ...encouragementStatus, [selectedChildId]: true })

        // 直近の応援履歴を再取得
        const { getStudentRecentMessages } = await import("@/app/actions/parent-dashboard")
        const messagesResult = await getStudentRecentMessages(selectedChildId, 3)
        if (!isError(messagesResult)) {
          onMessagesUpdate(messagesResult.messages)
        }
      } else {
        alert(`送信エラー: ${result.error}`)
      }
    } catch (error) {
      console.error("メッセージ送信エラー:", error)
      alert("メッセージの送信に失敗しました")
    } finally {
      setIsSendingMessage(false)
    }
  }

  const formatLogTime = (loggedAt: string) => {
    const date = new Date(loggedAt)
    // JST で時刻を取得
    const formatter = new Intl.DateTimeFormat('ja-JP', {
      timeZone: 'Asia/Tokyo',
      hour: 'numeric',
      minute: '2-digit',
      hour12: false
    })
    const parts = formatter.formatToParts(date)
    const hour = parts.find(p => p.type === 'hour')?.value
    const minute = parts.find(p => p.type === 'minute')?.value
    return `${hour}:${minute}`
  }

  return (
    <Card className="bg-gradient-to-br from-primary/8 to-accent/8 border-primary/30 shadow-xl">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold text-slate-800">
            {getModeTitle()}
          </CardTitle>
          {missionData.completionStatus && (
            <div className="flex items-center gap-2 text-sm">
              <span className="font-semibold text-slate-700">
                📝 <span className="text-blue-600">{missionData.completionStatus.inputCount}/{missionData.completionStatus.totalCount}</span> 記録
              </span>
              <span className="text-slate-300">•</span>
              <span className="font-semibold text-slate-700">
                ✨ <span className="text-emerald-600">{missionData.completionStatus.completedCount}/{missionData.completionStatus.totalCount}</span> 達成
              </span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {missionData.allCompleted && (
          <div className="bg-gradient-to-r from-green-400 to-blue-500 text-white rounded-xl p-6 text-center shadow-lg mb-6">
            <div className="flex items-center justify-center mb-3">
              <div className="bg-white/20 rounded-full p-3">
                <Flag className="h-8 w-8 text-white" />
              </div>
            </div>
            <h3 className="text-xl font-bold mb-2">今日のミッション完了！</h3>
            <p className="text-white/90">{studentName}さん、素晴らしい！今日も一日お疲れさまでした！</p>
          </div>
        )}

        {/* 日曜日・特別モード */}
        {(missionData.mode === "sunday" || missionData.mode === "special") && (() => {
          const subjectPanels = missionData.panels.filter((p: any) => p.type !== "reflect")
          const reflectPanel = missionData.panels.find((p: any) => p.type === "reflect")

          return (
            <div className="space-y-6">
              {/* リフレクトカード（フル幅・独立セクション） */}
              {reflectPanel && (
                <div className="w-full p-6 rounded-xl bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 border-2 border-primary/30 shadow-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <span className="text-2xl">📝</span>
                        </div>
                        <h3 className="text-xl font-bold text-slate-800">リフレクト</h3>
                      </div>
                      <p className="text-sm text-slate-600 mb-1">
                        今週の学習を振り返り、来週の目標を立てましょう
                      </p>
                      <p className="text-xs text-slate-500">
                        利用可能: 土曜 12:00 - 水曜 23:59
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Button
                        onClick={() => {
                          const childParam = selectedChild?.id ? `?child=${selectedChild.id}` : ""
                          window.location.href = `/parent/reflect${childParam}`
                        }}
                        className="bg-primary hover:bg-primary/90 text-white"
                      >
                        見守る
                      </Button>
                      <Badge className="border border-slate-300 bg-slate-100 text-slate-600">
                        {reflectPanel.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              )}

              {/* 科目カードセクション */}
              {subjectPanels.length > 0 ? (
                <div className={`grid gap-4 ${
                  subjectPanels.length === 1 ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"
                }`}>
                  {subjectPanels.map((panel: any, index: number) => (
                    <div
                      key={index}
                      className={`p-4 rounded-xl border-2 shadow-md hover:shadow-lg transition-all duration-200 bg-white ${getSubjectColor(panel.subject)}`}
                    >
                      {/* ヘッダー */}
                      <div className="flex justify-between items-center mb-3">
                        <h3 className="font-bold text-lg text-slate-800">{panel.subject}</h3>
                        <Badge className={`border ${getStatusBadgeColor(panel.status, panel.needsAction)}`}>
                          {panel.status}
                        </Badge>
                      </div>

                      {/* 応援ボタン（平日と同じ） */}
                      {panel.logs && panel.logs.length > 0 ? (
                        <div className="space-y-2.5">
                          {/* 3つの応援ボタン */}
                          <Button
                            onClick={() => handleQuickEncouragement(panel.subject, 0, panel.logs[0].id, "heart")}
                            className="group relative w-full py-3 px-4 rounded-xl text-sm overflow-hidden bg-gradient-to-br from-rose-50 via-pink-50 to-rose-100 hover:from-rose-100 hover:via-pink-100 hover:to-rose-200 text-rose-700 border border-rose-200/50 shadow-sm hover:shadow-md transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 ease-out disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
                            disabled={panel.logs[0].hasParentEncouragement}
                          >
                            <Heart className="h-4 w-4 group-hover:scale-110 transition-transform duration-300 fill-rose-500" />
                            <span>がんばったね</span>
                          </Button>
                          <Button
                            onClick={() => handleQuickEncouragement(panel.subject, 0, panel.logs[0].id, "star")}
                            className="group relative w-full py-3 px-4 rounded-xl text-sm overflow-hidden bg-gradient-to-br from-amber-50 via-yellow-50 to-amber-100 hover:from-amber-100 hover:via-yellow-100 hover:to-amber-200 text-amber-700 border border-amber-200/50 shadow-sm hover:shadow-md transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 ease-out disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
                            disabled={panel.logs[0].hasParentEncouragement}
                          >
                            <span className="text-lg group-hover:scale-110 transition-transform duration-300">⭐</span>
                            <span>すごい！</span>
                          </Button>
                          <Button
                            onClick={() => handleQuickEncouragement(panel.subject, 0, panel.logs[0].id, "thumbsup")}
                            className="group relative w-full py-3 px-4 rounded-xl text-sm overflow-hidden bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 hover:from-sky-100 hover:via-blue-100 hover:to-sky-200 text-sky-700 border border-sky-200/50 shadow-sm hover:shadow-md transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 ease-out disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
                            disabled={panel.logs[0].hasParentEncouragement}
                          >
                            <span className="text-lg group-hover:scale-110 transition-transform duration-300">👍</span>
                            <span>よくできました</span>
                          </Button>

                          {/* AI応援ボタン */}
                          <Button
                            onClick={() => handleOpenAIDialog(panel.subject, panel.logs[0].id)}
                            className="group relative w-full py-3.5 px-4 rounded-xl text-sm overflow-hidden bg-gradient-to-br from-violet-50 via-purple-50 to-violet-100 hover:from-violet-100 hover:via-purple-100 hover:to-violet-200 text-violet-700 border border-violet-200/50 shadow-sm hover:shadow-md transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 ease-out disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
                            disabled={panel.logs[0].hasParentEncouragement}
                          >
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000 ease-in-out" />
                            <Sparkles className="h-4 w-4 relative z-10 group-hover:rotate-12 group-hover:scale-110 transition-all duration-300 fill-violet-500" />
                            <span className="relative z-10 tracking-wide">AI応援メッセージ</span>
                          </Button>

                          {/* 応援済み表示 */}
                          {panel.logs[0].hasParentEncouragement && (
                            <div className="flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-gradient-to-r from-emerald-50 via-green-50 to-teal-50 border border-emerald-200/50 shadow-sm">
                              <div className="flex items-center justify-center w-5 h-5 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 shadow-md">
                                <span className="text-white text-xs font-bold">✓</span>
                              </div>
                              <span className="text-sm font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                                応援済み
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <Button disabled className="w-full py-3 px-4 rounded-lg text-sm bg-slate-100 text-slate-400 cursor-not-allowed">
                          未完了
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              ) : null}

              {/* ポジティブメッセージカード（科目が0の場合） */}
              {subjectPanels.length === 0 && (
                <div className="w-full p-8 rounded-xl border-2 border-emerald-400 bg-gradient-to-br from-emerald-100 to-teal-100 text-center shadow-none cursor-default">
                  <div className="text-7xl mb-4">🎉</div>
                  <h3 className="text-2xl font-bold text-emerald-800 mb-3">
                    おめでとうございます！
                  </h3>
                  <p className="text-base text-slate-700 mb-2">
                    お子様はすべての科目で80%以上を達成しています！
                  </p>
                  <p className="text-sm text-slate-600">
                    今週は振り返りを通じて、さらなる成長をサポートしましょう。
                  </p>
                </div>
              )}

              {/* 1科目特化メッセージ（科目が1つの場合） */}
              {subjectPanels.length === 1 && (
                <div className="w-full p-6 rounded-xl border-2 border-dashed border-emerald-300 bg-gradient-to-br from-emerald-50 to-teal-50 text-center shadow-none cursor-default">
                  <div className="text-6xl mb-3">💪</div>
                  <h3 className="text-lg font-bold text-emerald-700 mb-2">
                    もう少しです！
                  </h3>
                  <p className="text-sm text-slate-600 mb-1">
                    他の科目は80%以上を達成しています
                  </p>
                  <p className="text-sm text-slate-600 font-semibold">
                    {subjectPanels[0].subject}をクリアすれば全科目目標達成です！
                  </p>
                </div>
              )}
            </div>
          )
        })()}

        {/* 通常モード（入力促進・復習促進） */}
        {(missionData.mode === "input" || missionData.mode === "review") && (
          <div className="space-y-6">
            {missionData.panels.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-slate-600">今日はまだ学習記録がありません</p>
                <p className="text-sm text-slate-500 mt-2">{studentName}さんの学習を見守りましょう！</p>
              </div>
            ) : (
              <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {missionData.panels.map((panel: any, index: number) => (
                <div
                  key={index}
                  className={`p-4 rounded-xl border-2 shadow-sm transition-all duration-300 ${getSubjectColor(panel.subject)}`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-lg text-slate-800">{panel.subject}</span>
                      <Badge
                        className={`text-xs px-2 py-1 border ${getStatusBadgeColor(panel.status, panel.needsAction)}`}
                      >
                        {panel.status}
                      </Badge>
                    </div>

                    {/* Show buttons based on whether logs exist */}
                    {!panel.logs || panel.logs.length === 0 ? (
                      <Button
                        disabled
                        className="w-full py-3 px-4 rounded-lg text-sm bg-slate-100 text-slate-400 cursor-not-allowed"
                      >
                        未完了
                      </Button>
                    ) : (encouragementSent[`${panel.subject}-0`] || panel.logs?.[0]?.hasParentEncouragement) ? (
                      /* 応援済みの場合はバッジのみ表示 */
                      <div className="py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-50 via-green-50 to-teal-50 border border-emerald-200/50 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="flex items-center justify-center gap-2">
                          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 shadow-md">
                            <span className="text-white text-sm font-bold">✓</span>
                          </div>
                          <span className="text-sm font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                            応援メッセージ送信済み
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {/* クイック応援ボタン（3種類） - Soft Gradation Style */}
                        <div className="space-y-2.5">
                          <Button
                            onClick={() => handleQuickEncouragement(panel.subject, 0, panel.logs?.[0]?.id, "heart")}
                            className="group relative w-full py-3 px-4 rounded-xl text-sm overflow-hidden
                              bg-gradient-to-br from-rose-50 via-pink-50 to-rose-100
                              hover:from-rose-100 hover:via-pink-100 hover:to-rose-200
                              text-rose-700 border border-rose-200/50 shadow-sm hover:shadow-md
                              transform hover:scale-[1.02] active:scale-[0.98]
                              transition-all duration-300 ease-out
                              flex items-center justify-center gap-2"
                          >
                            <Heart className="h-4 w-4 group-hover:scale-110 transition-transform duration-300 fill-rose-500" />
                            <span>がんばったね</span>
                          </Button>
                          <Button
                            onClick={() => handleQuickEncouragement(panel.subject, 0, panel.logs?.[0]?.id, "star")}
                            className="group relative w-full py-3 px-4 rounded-xl text-sm overflow-hidden
                              bg-gradient-to-br from-amber-50 via-yellow-50 to-amber-100
                              hover:from-amber-100 hover:via-yellow-100 hover:to-amber-200
                              text-amber-700 border border-amber-200/50 shadow-sm hover:shadow-md
                              transform hover:scale-[1.02] active:scale-[0.98]
                              transition-all duration-300 ease-out
                              flex items-center justify-center gap-2"
                          >
                            <span className="text-lg group-hover:scale-110 transition-transform duration-300">⭐</span>
                            <span>すごい！</span>
                          </Button>
                          <Button
                            onClick={() => handleQuickEncouragement(panel.subject, 0, panel.logs?.[0]?.id, "thumbsup")}
                            className="group relative w-full py-3 px-4 rounded-xl text-sm overflow-hidden
                              bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100
                              hover:from-sky-100 hover:via-blue-100 hover:to-sky-200
                              text-sky-700 border border-sky-200/50 shadow-sm hover:shadow-md
                              transform hover:scale-[1.02] active:scale-[0.98]
                              transition-all duration-300 ease-out
                              flex items-center justify-center gap-2"
                          >
                            <span className="text-lg group-hover:scale-110 transition-transform duration-300">👍</span>
                            <span>よくできました</span>
                          </Button>
                        </div>
                        {/* AI応援ボタン - 特別なデザイン */}
                        <Button
                          onClick={() => handleOpenAIDialog(panel.subject, panel.logs?.[0]?.id)}
                          className="group relative w-full py-3.5 px-4 rounded-xl text-sm overflow-hidden
                            bg-gradient-to-br from-violet-50 via-purple-50 to-violet-100
                            hover:from-violet-100 hover:via-purple-100 hover:to-violet-200
                            text-violet-700 border border-violet-200/50 shadow-sm hover:shadow-md
                            transform hover:scale-[1.02] active:scale-[0.98]
                            transition-all duration-300 ease-out
                            flex items-center justify-center gap-2"
                        >
                          {/* シマー効果 */}
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent
                            translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000 ease-in-out" />
                          <Sparkles className="h-4 w-4 relative z-10 group-hover:rotate-12 group-hover:scale-110 transition-all duration-300 fill-violet-500" />
                          <span className="relative z-10 tracking-wide">AI応援メッセージ</span>
                        </Button>
                        <Button
                          onClick={() => toggleExpandLog(index)}
                          variant="outline"
                          className="w-full py-2 px-3 rounded-lg text-xs"
                        >
                          {expandedLogs.has(index) ? "閉じる" : "詳細を見る"}
                        </Button>

                        {/* Expanded log details */}
                        {expandedLogs.has(index) && panel.logs && panel.logs.length > 0 && (
                          <div className="mt-3 p-3 bg-white rounded-lg border border-slate-200 space-y-2">
                            {panel.logs.map((log: any, logIndex: number) => (
                              <div key={logIndex} className="text-xs space-y-1 pb-2 border-b border-slate-100 last:border-b-0">
                                <div className="flex justify-between items-center">
                                  <span className="text-slate-600">{formatLogTime(log.logged_at)}</span>
                                  <span className="font-medium">{log.study_content_types?.content_name}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-slate-600">
                                    {log.correct_count}/{log.total_problems}問
                                  </span>
                                  <span className="font-bold text-green-600">
                                    {log.total_problems > 0 ? Math.round((log.correct_count / log.total_problems) * 100) : 0}%
                                  </span>
                                </div>
                                {log.reflection_text && (
                                  <p className="text-slate-700 italic mt-1">「{log.reflection_text}」</p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* ミッション状況表示 */}
            <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 border-2 border-primary/20 shadow-lg">
              <div className="text-center">
                <h3 className="font-bold text-lg text-slate-800 mb-2">ミッション状況</h3>
                <p className="text-base text-slate-700 leading-relaxed">{missionData.statusMessage}</p>
              </div>
            </div>
              </>
            )}
          </div>
        )}
      </CardContent>

      {/* AI応援メッセージダイアログ - プレミアムデザイン */}
      {showAIDialog && (
        <div className="fixed inset-0 bg-gradient-to-br from-black/60 via-purple-900/30 to-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50 animate-in fade-in duration-200" onClick={() => !isGeneratingAI && !isSendingMessage && setShowAIDialog(false)}>
          <div className="bg-gradient-to-br from-white via-purple-50/30 to-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full max-h-[90vh] sm:max-h-[80vh] overflow-y-auto shadow-2xl border-2 border-purple-100/50 animate-in slide-in-from-bottom-4 duration-300" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-violet-500 to-fuchsia-600 rounded-xl blur-md opacity-50 animate-pulse"></div>
                  <div className="relative bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-600 p-2.5 rounded-xl shadow-lg">
                    <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                  </div>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 bg-clip-text text-transparent">
                  <span className="hidden xs:inline">AI応援メッセージ</span>
                  <span className="xs:hidden">AI応援</span>
                </h3>
              </div>
              <button
                onClick={() => setShowAIDialog(false)}
                disabled={isGeneratingAI || isSendingMessage}
                className="group relative w-10 h-10 rounded-full hover:bg-slate-100 transition-all duration-200 disabled:opacity-50 flex items-center justify-center"
              >
                <span className="text-slate-400 group-hover:text-slate-600 text-2xl font-light transition-colors">✕</span>
              </button>
            </div>

            {isGeneratingAI ? (
              <div className="py-16 text-center">
                <div className="relative inline-block mb-6">
                  <div className="absolute inset-0 bg-gradient-to-br from-violet-500 to-fuchsia-600 rounded-full blur-xl opacity-30 animate-pulse"></div>
                  <div className="relative animate-spin inline-block w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full"></div>
                </div>
                <p className="text-lg font-semibold bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
                  AI応援メッセージを生成中...
                </p>
                <p className="text-sm text-slate-500 mt-2">心を込めて考えています</p>
              </div>
            ) : (
              <div className="space-y-4 sm:space-y-5">
                <div className="bg-gradient-to-r from-purple-50 via-violet-50 to-purple-50 rounded-2xl p-4 border border-purple-100">
                  <p className="text-sm text-slate-700 leading-relaxed">
                    <span className="font-semibold text-purple-700">✨ 3つの応援メッセージ</span>から選んでください。<br />
                    <span className="text-xs text-slate-600">メッセージは自由に編集できます。</span>
                  </p>
                </div>

                {/* 3つのメッセージ選択肢 - プレミアムデザイン */}
                <div className="space-y-3 sm:space-y-4">
                  {aiMessages.map((message, index) => (
                    <div key={index} className="relative group">
                      <input
                        type="radio"
                        id={`message-${index}`}
                        name="ai-message"
                        checked={selectedMessage === message}
                        onChange={() => setSelectedMessage(message)}
                        className="sr-only"
                      />
                      <label
                        htmlFor={`message-${index}`}
                        className={`block p-4 sm:p-5 rounded-2xl border-2 cursor-pointer transition-all duration-300 ${
                          selectedMessage === message
                            ? "border-purple-400 bg-gradient-to-br from-purple-50 via-violet-50 to-fuchsia-50 shadow-lg scale-[1.02]"
                            : "border-slate-200 bg-white hover:border-purple-200 hover:shadow-md"
                        }`}
                      >
                        <div className="flex items-start gap-3 sm:gap-4">
                          <div className={`flex-shrink-0 w-6 h-6 sm:w-7 sm:h-7 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                            selectedMessage === message
                              ? "border-purple-500 bg-gradient-to-br from-violet-500 to-fuchsia-600 shadow-lg scale-110"
                              : "border-slate-300 group-hover:border-purple-300"
                          }`}>
                            {selectedMessage === message && (
                              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`text-xs font-bold px-2.5 py-1 rounded-full transition-all duration-300 ${
                                selectedMessage === message
                                  ? "bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white shadow-md"
                                  : "bg-purple-100 text-purple-700"
                              }`}>
                                {index === 0 ? "💪 励まし型" : index === 1 ? "🤝 共感型" : "🌟 次への期待型"}
                              </span>
                            </div>
                            <p className="text-sm sm:text-base text-slate-700 leading-relaxed break-words">{message}</p>
                          </div>
                        </div>
                      </label>
                    </div>
                  ))}
                </div>

                {/* メッセージ編集エリア - エレガントデザイン */}
                <div className="mt-6 sm:mt-8 bg-gradient-to-br from-slate-50 to-purple-50/30 rounded-2xl p-4 sm:p-5 border border-purple-100/50">
                  <label className="block text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <span className="text-purple-600">✏️</span>
                    メッセージを編集（200文字まで）
                  </label>
                  <textarea
                    value={selectedMessage}
                    onChange={(e) => setSelectedMessage(e.target.value.slice(0, 200))}
                    className="w-full p-4 text-sm bg-white border-2 border-purple-200/50 rounded-xl
                      focus:border-purple-400 focus:ring-4 focus:ring-purple-100
                      transition-all duration-200 resize-none shadow-inner
                      placeholder:text-slate-400"
                    rows={5}
                    placeholder="選択したメッセージを自由に編集できます..."
                  />
                  <div className="flex justify-between items-center mt-2">
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <span className={selectedMessage.length >= 180 ? "text-amber-600 font-semibold" : ""}>
                        {selectedMessage.length}
                      </span>
                      <span>/200文字</span>
                    </p>
                    {selectedMessage.length >= 180 && (
                      <p className="text-xs text-amber-600 font-medium">あと{200 - selectedMessage.length}文字</p>
                    )}
                  </div>
                </div>

                {/* 送信ボタン - プレミアムデザイン */}
                <div className="flex gap-3 sm:gap-4 mt-6 sm:mt-8">
                  <Button
                    onClick={() => setShowAIDialog(false)}
                    variant="outline"
                    className="flex-1 py-3.5 text-sm rounded-xl
                      border-2 border-slate-300 hover:border-slate-400 hover:bg-slate-50
                      transition-all duration-200 shadow-sm hover:shadow-md"
                    disabled={isSendingMessage}
                  >
                    キャンセル
                  </Button>
                  <Button
                    onClick={handleSendAIMessage}
                    disabled={!selectedMessage.trim() || isSendingMessage}
                    className="group relative flex-1 py-3.5 text-sm rounded-xl overflow-hidden
                      bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-600
                      hover:from-violet-600 hover:via-purple-600 hover:to-fuchsia-700
                      text-white shadow-xl hover:shadow-2xl
                      transform hover:scale-[1.02] active:scale-[0.98]
                      transition-all duration-300 ease-out
                      disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
                      border-2 border-white/20"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent
                      translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000 ease-in-out" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      {isSendingMessage ? (
                        <>
                          <div className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                          送信中...
                        </>
                      ) : (
                        <>
                          <Heart className="h-4 w-4" />
                          送信する
                        </>
                      )}
                    </span>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  )
}


const RecentLearningHistoryCard = ({
  logs,
  batchFeedbacks,
  legacyFeedbacks
}: {
  logs: any[]
  batchFeedbacks: Record<string, string>
  legacyFeedbacks: Record<number, string>
}) => {
  const [showAll, setShowAll] = useState(false)

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "記録日時不明"

    const date = new Date(dateStr)
    if (Number.isNaN(date.getTime())) return "記録日時不明"

    // JST で日付と時刻を取得（サーバー・クライアント両方で統一）
    const formatter = new Intl.DateTimeFormat('ja-JP', {
      timeZone: 'Asia/Tokyo',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: false
    })
    const parts = formatter.formatToParts(date)
    const get = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find(p => p.type === type)?.value
    const year = Number(get('year'))
    const month = Number(get('month'))
    const day = Number(get('day'))
    const hour = Number(get('hour'))
    const minute = get('minute')

    // 今日と昨日の判定（JST 基準）
    const nowFormatter = new Intl.DateTimeFormat('ja-JP', {
      timeZone: 'Asia/Tokyo',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric'
    })
    const nowParts = nowFormatter.formatToParts(new Date())
    const nowYear = Number(nowParts.find(p => p.type === 'year')?.value)
    const nowMonth = Number(nowParts.find(p => p.type === 'month')?.value)
    const nowDay = Number(nowParts.find(p => p.type === 'day')?.value)

    // 昨日の日付を計算（JST 基準）
    const yesterday = new Date()
    yesterday.setTime(yesterday.getTime() - 24 * 60 * 60 * 1000)
    const yParts = nowFormatter.formatToParts(yesterday)
    const yYear = Number(yParts.find(p => p.type === 'year')?.value)
    const yMonth = Number(yParts.find(p => p.type === 'month')?.value)
    const yDay = Number(yParts.find(p => p.type === 'day')?.value)

    if (year === nowYear && month === nowMonth && day === nowDay) {
      return `今日 ${hour}:${minute}`
    } else if (year === yYear && month === yMonth && day === yDay) {
      return `昨日 ${hour}:${minute}`
    } else {
      return `${month}/${day} ${hour}:${minute}`
    }
  }

  const safeLogs = Array.isArray(logs) ? logs : []

  // ダッシュボード用の拡張ログ型（リレーション情報含む）
  type DashboardLog = StudyLogWithBatch & {
    study_sessions?: {
      session_number?: number
      start_date?: string
      end_date?: string
    }
    subjects?: {
      name?: string
    }
    study_content_types?: {
      content_name?: string
    }
  }

  // セッション表示フォーマット
  const formatSession = (log: DashboardLog) => {
    if (log.study_sessions) {
      const sessionNum = log.study_sessions.session_number || log.session_id || 0
      if (log.study_sessions.start_date && log.study_sessions.end_date) {
        const startDate = new Date(log.study_sessions.start_date)
        const endDate = new Date(log.study_sessions.end_date)
        const startStr = `${startDate.getMonth() + 1}/${startDate.getDate()}`
        const endStr = `${endDate.getMonth() + 1}/${endDate.getDate()}`
        return `第${sessionNum}回(${startStr}〜${endStr})`
      }
      return `第${sessionNum}回`
    }
    return `第${log.session_id || 0}回`
  }

  // 共通ユーティリティでbatch_idグループ化（logged_at降順でソート済み）
  const feedbackMaps: FeedbackMaps = { batchFeedbacks, legacyFeedbacks }
  const groupedEntries = groupLogsByBatch<DashboardLog>(safeLogs as DashboardLog[], feedbackMaps)

  // 表示用に追加情報を付与
  type DisplayEntry = GroupedLogEntry<DashboardLog> & {
    studentRecordTime: string
    session: string
    reflection?: string
  }

  const historyEntries: DisplayEntry[] = groupedEntries.map((entry) => {
    // 代表ログを共通ユーティリティで取得（ロジック二重管理を防止）
    const representativeLog = getRepresentativeLog(entry)
    if (entry.type === "batch") {
      return {
        ...entry,
        studentRecordTime: formatDate(entry.latestLoggedAt),
        session: formatSession(representativeLog),
        reflection: representativeLog.reflection_text || "",
      }
    }
    return {
      ...entry,
      studentRecordTime: formatDate(entry.log.logged_at),
      session: formatSession(entry.log),
    }
  })

  const displayedEntries = showAll ? historyEntries : historyEntries.slice(0, 5)

  const getSubjectColor = (subject: string) => {
    const colors = {
      算数: "text-blue-600 bg-blue-50 border-blue-200",
      国語: "text-pink-600 bg-pink-50 border-pink-200",
      理科: "text-orange-600 bg-orange-50 border-orange-200",
      社会: "text-emerald-600 bg-emerald-50 border-emerald-200",
    }
    return colors[subject as keyof typeof colors] || "text-slate-600 bg-slate-50 border-slate-200"
  }

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 80) return "text-green-700 bg-green-50 border-green-200"
    if (accuracy >= 60) return "text-yellow-700 bg-yellow-50 border-yellow-200"
    return "text-red-700 bg-red-50 border-red-200"
  }

  const getImprovementDisplay = (current: number, previous: number | null) => {
    if (previous === null) return null
    const improvement = current - previous
    const isPositive = improvement > 0
    return {
      text: `${previous}% → ${current}%`,
      color: isPositive ? "text-green-600" : improvement === 0 ? "text-slate-600" : "text-red-600",
      icon: isPositive ? "↗" : improvement === 0 ? "→" : "↘",
    }
  }

  // バッチエントリの集計計算
  const getBatchSummary = (entry: DisplayEntry) => {
    if (entry.type !== "batch") return null
    const totalCorrect = entry.logs.reduce((sum, log) => sum + (log.correct_count || 0), 0)
    const totalProblems = entry.logs.reduce((sum, log) => sum + (log.total_problems || 0), 0)
    const accuracy = totalProblems > 0 ? Math.round((totalCorrect / totalProblems) * 100) : 0
    return { totalCorrect, totalProblems, accuracy }
  }

  return (
    <Card className="bg-gradient-to-br from-green-50 via-emerald-50 to-blue-50 border-green-200/60 shadow-xl backdrop-blur-sm">
      <CardHeader className="pb-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-t-lg">
        <CardTitle className="text-xl font-bold flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-full shadow-sm">
            <Clock className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <span className="text-slate-800">直近の学習履歴</span>
            <p className="text-sm font-normal text-slate-600 mt-1">最新のスパーク機能記録</p>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-6">
        {historyEntries.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-600">まだ学習記録がありません</p>
            <p className="text-sm text-slate-500 mt-2">お子さんの学習を見守りましょう！</p>
          </div>
        ) : (
          <>
            {displayedEntries.map((entry, index) => {
              if (entry.type === "batch") {
                // バッチエントリ: 複数科目をまとめて表示
                const summary = getBatchSummary(entry)
                return (
                  <div
                    key={`batch-${entry.batchId}`}
                    className="bg-white/90 backdrop-blur-sm rounded-xl p-5 border border-green-100 shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    <div className="space-y-4">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-3 flex-wrap">
                          {entry.subjects.map((subject) => (
                            <Badge key={subject} className={`text-sm px-3 py-1 border font-medium ${getSubjectColor(subject)}`}>
                              {subject}
                            </Badge>
                          ))}
                          <span className="text-sm text-slate-600 bg-slate-100 px-3 py-1 rounded-full font-medium">
                            {entry.studentRecordTime}
                          </span>
                          <Badge variant="outline" className="text-sm px-3 py-1 border-slate-300 bg-white">
                            {entry.session}
                          </Badge>
                        </div>
                        {summary && (
                          <Badge className={`text-sm px-3 py-2 border font-bold ${getAccuracyColor(summary.accuracy)}`}>
                            {summary.accuracy}%
                          </Badge>
                        )}
                      </div>

                      <div className="space-y-3">
                        {/* バッチ内の各科目の詳細 */}
                        <div className="space-y-2">
                          {entry.logs.map((log) => {
                            const logAccuracy = log.total_problems > 0 ? Math.round((log.correct_count / log.total_problems) * 100) : 0
                            return (
                              <div key={log.id} className="flex items-center justify-between text-sm bg-slate-50 px-3 py-2 rounded-lg">
                                <div className="flex items-center gap-2">
                                  <Badge className={`text-xs px-2 py-0.5 border ${getSubjectColor(log.subjects?.name || "")}`}>
                                    {log.subjects?.name || "不明"}
                                  </Badge>
                                  <span className="text-slate-600">{log.study_content_types?.content_name || ""}</span>
                                </div>
                                <span className="font-medium text-slate-700">
                                  {log.correct_count}/{log.total_problems}問 ({logAccuracy}%)
                                </span>
                              </div>
                            )
                          })}
                        </div>
                        {summary && (
                          <div className="flex items-center justify-between flex-wrap gap-3 pt-2 border-t border-slate-200">
                            <span className="text-base text-slate-700">
                              合計正答数:{" "}
                              <span className="font-bold text-slate-800">
                                {summary.totalCorrect}/{summary.totalProblems}問
                              </span>
                            </span>
                          </div>
                        )}
                        {entry.reflection && (
                          <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                            <p className="text-sm text-blue-800 leading-relaxed">
                              <span className="font-semibold">今日の振り返り:</span> {entry.reflection}
                            </p>
                          </div>
                        )}
                        {entry.coachFeedback ? (
                          <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-xl border border-purple-200">
                            <div className="flex items-start gap-3">
                              <Avatar className="h-10 w-10 border-2 border-purple-300 shadow-md flex-shrink-0">
                                <AvatarImage src={getAvatarSrc("ai_coach") || "/placeholder.svg"} alt="AIコーチ" />
                                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold text-xs">AI</AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <p className="text-xs text-purple-600 font-semibold mb-1">AIコーチより</p>
                                <p className="text-sm text-purple-800 leading-relaxed">{entry.coachFeedback}</p>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8 border border-slate-300 flex-shrink-0 opacity-50">
                                <AvatarImage src={getAvatarSrc("ai_coach") || "/placeholder.svg"} alt="AIコーチ" />
                                <AvatarFallback className="bg-slate-300 text-slate-500 font-bold text-xs">AI</AvatarFallback>
                              </Avatar>
                              <p className="text-xs text-slate-500">AIコーチからのメッセージ準備中...</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              } else {
                // シングルエントリ: 1科目を表示
                const log = entry.log
                const accuracy = log.total_problems > 0 ? Math.round((log.correct_count / log.total_problems) * 100) : 0
                return (
                  <div
                    key={`single-${log.id}`}
                    className="bg-white/90 backdrop-blur-sm rounded-xl p-5 border border-green-100 shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    <div className="space-y-4">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-3 flex-wrap">
                          <Badge className={`text-sm px-3 py-1 border font-medium ${getSubjectColor(log.subjects?.name || "")}`}>
                            {log.subjects?.name || "不明"}
                          </Badge>
                          <span className="text-sm text-slate-600 bg-slate-100 px-3 py-1 rounded-full font-medium">
                            {entry.studentRecordTime}
                          </span>
                          <Badge variant="outline" className="text-sm px-3 py-1 border-slate-300 bg-white">
                            {entry.session}
                          </Badge>
                        </div>
                        <Badge className={`text-sm px-3 py-2 border font-bold ${getAccuracyColor(accuracy)}`}>
                          {accuracy}%
                        </Badge>
                      </div>

                      <div className="space-y-3">
                        <p className="font-bold text-slate-800 text-lg">{log.study_content_types?.content_name || ""}</p>
                        <div className="flex items-center justify-between flex-wrap gap-3">
                          <span className="text-base text-slate-700">
                            正答数:{" "}
                            <span className="font-bold text-slate-800">
                              {log.correct_count || 0}/{log.total_problems || 0}問
                            </span>
                          </span>
                        </div>
                        {log.reflection_text && (
                          <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                            <p className="text-sm text-blue-800 leading-relaxed">
                              <span className="font-semibold">今日の振り返り:</span> {log.reflection_text}
                            </p>
                          </div>
                        )}
                        {entry.coachFeedback ? (
                          <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-xl border border-purple-200">
                            <div className="flex items-start gap-3">
                              <Avatar className="h-10 w-10 border-2 border-purple-300 shadow-md flex-shrink-0">
                                <AvatarImage src={getAvatarSrc("ai_coach") || "/placeholder.svg"} alt="AIコーチ" />
                                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold text-xs">AI</AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <p className="text-xs text-purple-600 font-semibold mb-1">AIコーチより</p>
                                <p className="text-sm text-purple-800 leading-relaxed">{entry.coachFeedback}</p>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8 border border-slate-300 flex-shrink-0 opacity-50">
                                <AvatarImage src={getAvatarSrc("ai_coach") || "/placeholder.svg"} alt="AIコーチ" />
                                <AvatarFallback className="bg-slate-300 text-slate-500 font-bold text-xs">AI</AvatarFallback>
                              </Avatar>
                              <p className="text-xs text-slate-500">AIコーチからのメッセージ準備中...</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              }
            })}
            {historyEntries.length > 5 && (
              <div className="flex justify-center pt-2">
                <Button
                  variant="outline"
                  onClick={() => setShowAll(!showAll)}
                  className="w-full max-w-xs bg-white hover:bg-green-50 text-green-700 border-green-300 font-medium"
                >
                  {showAll ? "閉じる" : `もっと見る (残り${historyEntries.length - 5}件)`}
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

const RecentEncouragementCard = ({ messages, selectedChildId }: { messages: any[], selectedChildId: number | null }) => {
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set())

  const toggleCard = (index: number) => {
    setExpandedCards((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(index)) {
        newSet.delete(index)
      } else {
        newSet.add(index)
      }
      return newSet
    })
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "記録日時不明"

    const date = new Date(dateStr)
    if (Number.isNaN(date.getTime())) return "記録日時不明"

    // JST で日付と時刻を取得（サーバー・クライアント両方で統一）
    const formatter = new Intl.DateTimeFormat('ja-JP', {
      timeZone: 'Asia/Tokyo',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: false
    })
    const parts = formatter.formatToParts(date)
    const get = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find(p => p.type === type)?.value
    const year = Number(get('year'))
    const month = Number(get('month'))
    const day = Number(get('day'))
    const hour = Number(get('hour'))
    const minute = get('minute')

    // 今日と昨日の判定（JST 基準）
    const nowFormatter = new Intl.DateTimeFormat('ja-JP', {
      timeZone: 'Asia/Tokyo',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric'
    })
    const nowParts = nowFormatter.formatToParts(new Date())
    const nowYear = Number(nowParts.find(p => p.type === 'year')?.value)
    const nowMonth = Number(nowParts.find(p => p.type === 'month')?.value)
    const nowDay = Number(nowParts.find(p => p.type === 'day')?.value)

    // 昨日の日付を計算（JST 基準）
    const yesterday = new Date()
    yesterday.setTime(yesterday.getTime() - 24 * 60 * 60 * 1000)
    const yParts = nowFormatter.formatToParts(yesterday)
    const yYear = Number(yParts.find(p => p.type === 'year')?.value)
    const yMonth = Number(yParts.find(p => p.type === 'month')?.value)
    const yDay = Number(yParts.find(p => p.type === 'day')?.value)

    if (year === nowYear && month === nowMonth && day === nowDay) {
      return `今日 ${hour}:${minute}`
    } else if (year === yYear && month === yMonth && day === yDay) {
      return `昨日 ${hour}:${minute}`
    } else {
      return `${month}/${day} ${hour}:${minute}`
    }
  }

  const safeMessages = Array.isArray(messages) ? messages : []

  const encouragementMessages = safeMessages.map((msg) => {
    const senderProfile = msg.sender_profile
    const baseMessage = msg.message || ""
    const studyLog = msg.study_logs

    // 学習記録情報の整形（生徒画面と同じロジック）
    let studyInfo = null
    if (studyLog) {
      const accuracy = studyLog.total_problems > 0
        ? Math.round((studyLog.correct_count / studyLog.total_problems) * 100)
        : 0

      studyInfo = {
        session: studyLog.study_sessions?.session_number || "不明",
        subject: studyLog.subjects?.name || "不明",
        content: studyLog.study_content_types?.content_name || "不明",
        accuracy,
        correctCount: studyLog.correct_count || 0,
        totalProblems: studyLog.total_problems || 0,
      }
    }

    return {
      recordTime: formatDate(msg.sent_at),
      from: senderProfile?.nickname || "応援者",
      avatar: senderProfile?.avatar_id || (msg.sender_role === "parent" ? "parent1" : "coach"),
      message: baseMessage,
      senderRole: msg.sender_role || "unknown",
      studyInfo,
    }
  })

  return (
    <Card className="bg-gradient-to-br from-pink-50 via-rose-50 to-red-50 border-pink-200/60 shadow-xl backdrop-blur-sm">
      <CardHeader className="pb-4 bg-gradient-to-r from-pink-500/10 to-rose-500/10 rounded-t-lg">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold flex items-center gap-3">
            <div className="p-2 bg-pink-100 rounded-full shadow-sm">
              <Heart className="h-6 w-6 text-pink-600" />
            </div>
            <div>
              <span className="text-slate-800">直近の応援履歴</span>
              <p className="text-sm font-normal text-slate-600 mt-1">昨日0:00〜今日23:59の保護者・指導者からの応援</p>
            </div>
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const childParam = selectedChildId ? `&child=${selectedChildId}` : ""
              window.location.href = `/parent/reflect?tab=encouragement${childParam}`
            }}
            className="border-pink-300 text-pink-700 hover:bg-pink-100"
          >
            全て見る
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-6">
        {encouragementMessages.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-600">まだ応援メッセージがありません</p>
            <p className="text-sm text-slate-500 mt-2">お子さんへ応援メッセージを送りましょう！</p>
          </div>
        ) : (
          encouragementMessages.map((message, index) => {
            const isExpanded = expandedCards.has(index)
            return (
              <div
                key={index}
                className="bg-white/90 backdrop-blur-sm rounded-xl p-5 border border-pink-100 shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <div className="flex items-start gap-4">
                  <Avatar className="h-12 w-12 border-3 border-pink-200 flex-shrink-0 shadow-md">
                    <AvatarImage src={getAvatarSrc(message.avatar) || "/placeholder.svg"} alt={message.from} />
                    <AvatarFallback className="bg-pink-100 text-pink-700 font-bold text-lg">
                      {message.from.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-bold text-slate-800 text-lg">{message.from}</span>
                      <span className="text-sm text-slate-600 bg-slate-100 px-2 py-1 rounded-full">
                        {message.recordTime}
                      </span>
                      <div className="flex items-center gap-1">
                        <Heart className="h-4 w-4 text-pink-500" />
                        <span className="text-xs text-pink-600 font-medium">応援</span>
                      </div>
                    </div>
                    {isExpanded ? (
                      <div className="space-y-3">
                        <div className="bg-gradient-to-r from-pink-50 to-rose-50 p-4 rounded-xl border border-pink-100">
                          <p className="text-base leading-relaxed text-slate-700 font-medium">{message.message}</p>
                        </div>
                        {message.studyInfo && (
                          <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-200">
                            <p className="text-sm font-semibold text-blue-900 mb-3">📚 応援された学習記録</p>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div className="bg-white p-2 rounded-lg border border-blue-100">
                                <span className="text-slate-600">学習回: </span>
                                <span className="font-medium text-slate-800">第{message.studyInfo.session}回</span>
                              </div>
                              <div className="bg-white p-2 rounded-lg border border-blue-100">
                                <span className="text-slate-600">科目: </span>
                                <span className="font-medium text-slate-800">{message.studyInfo.subject}</span>
                              </div>
                              <div className="bg-white p-2 rounded-lg border border-blue-100 col-span-2">
                                <span className="text-slate-600">内容: </span>
                                <span className="font-medium text-slate-800">{message.studyInfo.content}</span>
                              </div>
                              <div className="bg-white p-2 rounded-lg border border-blue-100">
                                <span className="text-slate-600">正答数: </span>
                                <span className="font-medium text-slate-800">
                                  {message.studyInfo.correctCount}/{message.studyInfo.totalProblems}問
                                </span>
                              </div>
                              <div className="bg-white p-2 rounded-lg border border-blue-100">
                                <span className="text-slate-600">正答率: </span>
                                <span className={`font-bold ${
                                  message.studyInfo.accuracy >= 80 ? "text-green-600" :
                                  message.studyInfo.accuracy >= 60 ? "text-yellow-600" :
                                  "text-red-600"
                                }`}>
                                  {message.studyInfo.accuracy}%
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="bg-gradient-to-r from-pink-50 to-rose-50 p-4 rounded-xl border border-pink-100">
                        <p className="text-base leading-relaxed text-slate-700 font-medium line-clamp-2">
                          {message.message}
                        </p>
                      </div>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleCard(index)}
                      className="text-pink-600 hover:text-pink-700 hover:bg-pink-50 w-full"
                    >
                      {isExpanded ? "閉じる" : "詳細を見る"}
                    </Button>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}

interface ParentDashboardInnerProps {
  parentProfile: {
    displayName: string
    avatarId: string
    themeColor: string
  }
  children: import("@/lib/types/profile").ChildProfile[]
  initialSelectedChild: import("@/lib/types/profile").ChildProfile | null
  initialData: import("@/lib/types/profile").ParentDashboardData | null
}

function ParentDashboardInner({
  parentProfile,
  children: initialChildren,
  initialSelectedChild,
  initialData,
}: ParentDashboardInnerProps) {
  const { profile, selectedChild, setSelectedChildId, loading: profileLoading, children: profileChildren } = useUserProfile()
  const [userName, setUserName] = useState(parentProfile.displayName)
  const [selectedAvatar, setSelectedAvatar] = useState(parentProfile.avatarId)
  const [children, setChildren] = useState<any[]>(initialChildren)
  const [todayStatusMessage, setTodayStatusMessage] = useState(
    initialData && !isError(initialData.todayStatus) ? initialData.todayStatus.message : ""
  )
  const [todayStatusMessageCreatedAt, setTodayStatusMessageCreatedAt] = useState<string | null>(
    initialData && !isError(initialData.todayStatus) ? initialData.todayStatus.createdAt || null : null
  )
  const [isStatusMessageExpanded, setIsStatusMessageExpanded] = useState(true)
  const [isHydrated, setIsHydrated] = useState(false)
  const [studyStreak, setStudyStreak] = useState(
    initialData && !isError(initialData.streak) ? initialData.streak.streak : 0
  )
  const [maxStreak, setMaxStreak] = useState(
    initialData && !isError(initialData.streak) ? initialData.streak.maxStreak : 0
  )
  const [lastStudyDate, setLastStudyDate] = useState<string | null>(
    initialData && !isError(initialData.streak) ? initialData.streak.lastStudyDate : null
  )
  const [todayStudied, setTodayStudied] = useState(
    initialData && !isError(initialData.streak) ? initialData.streak.todayStudied : false
  )
  const [streakState, setStreakState] = useState<"active" | "grace" | "warning" | "reset">(
    initialData && !isError(initialData.streak) ? initialData.streak.state : "reset"
  )
  const [recentLogs, setRecentLogs] = useState<any[]>(
    initialData && !isError(initialData.recentLogs) ? initialData.recentLogs.logs : []
  )
  const [batchFeedbacks, setBatchFeedbacks] = useState<Record<string, string>>(
    initialData && !isError(initialData.recentLogs) ? (initialData.recentLogs as any).batchFeedbacks || {} : {}
  )
  const [legacyFeedbacks, setLegacyFeedbacks] = useState<Record<number, string>>(
    initialData && !isError(initialData.recentLogs) ? (initialData.recentLogs as any).legacyFeedbacks || {} : {}
  )
  const [recentMessages, setRecentMessages] = useState<any[]>(
    initialData && !isError(initialData.recentMessages) ? initialData.recentMessages.messages : []
  )
  const [lastLoginInfo, setLastLoginInfo] = useState<any>(null)
  const [todayProgress, setTodayProgress] = useState<any[]>(
    initialData && !isError(initialData.todayMission) ? initialData.todayMission.todayProgress : []
  )
  const [calendarData, setCalendarData] = useState<any>(
    initialData && !isError(initialData.calendarData) ? initialData.calendarData.calendarData : {}
  )
  const [weeklyProgress, setWeeklyProgress] = useState<any[]>(
    initialData && !isError(initialData.weeklyProgress) ? initialData.weeklyProgress.progress : []
  )
  const [sessionNumber, setSessionNumber] = useState<number | null>(
    initialData && !isError(initialData.weeklyProgress) ? initialData.weeklyProgress.sessionNumber : null
  )
  const [isLoading, setIsLoading] = useState(!initialData)
  const [isReflectCompleted, setIsReflectCompleted] = useState(
    initialData && !isError(initialData.reflectionStatus) ? initialData.reflectionStatus.completed : false
  )

  // テーマカラーを取得（デフォルトは使わない）
  const themeColor = profile?.theme_color || parentProfile.themeColor || "default"

  // Cache for AI-generated status message (persisted in localStorage)
  const [encouragementStatus, setEncouragementStatus] = useState<{ [childId: number]: boolean }>({})

  // 🚀 SWR: SSR初期データをSWR形式に変換（初期表示用）
  // useMemoで初回のみ計算し、子供切り替え時は再計算
  const swrFallbackData = React.useMemo(() => {
    if (!initialSelectedChild?.id || !initialData) return undefined
    // 初期選択された子供のデータのみfallbackとして使用
    if (selectedChild?.id !== initialSelectedChild.id) return undefined
    return transformSSRtoSWRData(initialSelectedChild.id, initialData)
  }, [initialSelectedChild?.id, initialData, selectedChild?.id])

  // 🚀 SWR: 子供ごとのデータをSWRでキャッシュ・管理
  const {
    data: swrData,
    isLoading: swrLoading,
    isValidating: swrValidating,
    mutate: swrMutate,
    isStale: swrIsStale,
  } = useParentDashboard(selectedChild?.id ?? null, swrFallbackData)

  // 手動更新ハンドラー
  const handleManualRefresh = useCallback(() => {
    swrMutate()
  }, [swrMutate])

  // 🚀 改善: aiMessageCache を削除（サーバー側で ai_cache テーブルで管理）

  // ページがフォーカスされたときの再読み込みは、SWRのrevalidateOnFocusで自動処理される

  // 初期データはサーバーから渡されているため、fetchParentDataは不要

  // マウント後に localStorage から状態を復元
  useEffect(() => {
    setIsHydrated(true)
    const saved = localStorage.getItem('parentStatusMessageExpanded')
    if (saved !== null) {
      setIsStatusMessageExpanded(saved === 'true')
    }
  }, [])

  // 開閉状態をlocalStorageに保存（hydration 後のみ）
  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem('parentStatusMessageExpanded', String(isStatusMessageExpanded))
    }
  }, [isStatusMessageExpanded, isHydrated])

  // 🚀 改善: 初期データをサーバーから受け取った場合は即座に表示
  useEffect(() => {
    if (initialData && initialSelectedChild) {
      console.log("✅ [CLIENT] Using initial server data for child:", initialSelectedChild.id)

      // discriminated union を適切に処理
      if (!isError(initialData.todayStatus)) {
        setTodayStatusMessage(initialData.todayStatus.message)
        setTodayStatusMessageCreatedAt(initialData.todayStatus.createdAt || null)
      }

      if (!isError(initialData.streak)) {
        setStudyStreak(initialData.streak.streak)
        setMaxStreak(initialData.streak.maxStreak)
        setLastStudyDate(initialData.streak.lastStudyDate)
        setTodayStudied(initialData.streak.todayStudied)
        setStreakState(initialData.streak.streakState)
      }

      if (!isError(initialData.todayMission)) {
        setTodayProgress(initialData.todayMission.todayProgress)
      }

      if (!isError(initialData.weeklyProgress)) {
        setWeeklyProgress(initialData.weeklyProgress.progress)
        setSessionNumber(initialData.weeklyProgress.sessionNumber)
      }

      if (!isError(initialData.calendarData)) {
        setCalendarData(initialData.calendarData.calendarData)
      }

      if (!isError(initialData.recentLogs)) {
        setRecentLogs(initialData.recentLogs.logs)
        setBatchFeedbacks((initialData.recentLogs as any).batchFeedbacks || {})
        setLegacyFeedbacks((initialData.recentLogs as any).legacyFeedbacks || {})
      }

      if (!isError(initialData.recentMessages)) {
        setRecentMessages(initialData.recentMessages.messages)
      }

      if (!isError(initialData.reflectionStatus)) {
        setIsReflectCompleted(initialData.reflectionStatus.completed)
      }

      // 🚀 SWR: キャッシュはSWRが管理するため、childDataCacheへの保存は不要

      setIsLoading(false)
    }
  }, []) // 初回マウント時のみ実行

  // Update children list when profileChildren is loaded
  useEffect(() => {
    if (!profileLoading && profileChildren.length > 0) {
      console.log("🔍 [CLIENT] Updating children list from profile:", profileChildren)
      setChildren(profileChildren)
    }
  }, [profileLoading, profileChildren])

  // 🚀 SWR: データが更新されたら各stateに反映
  useEffect(() => {
    if (!swrData) return

    console.log("🚀 [SWR] Data received for child:", swrData.childId)

    // ステータスメッセージ
    if (!swrData.todayStatus.error) {
      setTodayStatusMessage(swrData.todayStatus.message)
      setTodayStatusMessageCreatedAt(swrData.todayStatus.createdAt)
    }

    // ストリーク
    if (!swrData.streak.error) {
      setStudyStreak(swrData.streak.streak)
      setMaxStreak(swrData.streak.maxStreak)
      setLastStudyDate(swrData.streak.lastStudyDate)
      setTodayStudied(swrData.streak.todayStudied)
      setStreakState(swrData.streak.state)
    }

    // 今日の進捗
    if (!swrData.todayProgress.error) {
      setTodayProgress(swrData.todayProgress.todayProgress)
    }

    // 週間進捗
    if (!swrData.weeklyProgress.error) {
      setWeeklyProgress(swrData.weeklyProgress.progress)
      setSessionNumber(swrData.weeklyProgress.sessionNumber)
    }

    // カレンダー
    if (!swrData.calendar.error) {
      setCalendarData(swrData.calendar.calendarData)
    }

    // 最近のログ
    if (!swrData.recentLogs.error) {
      setRecentLogs(swrData.recentLogs.logs)
      setBatchFeedbacks(swrData.recentLogs.batchFeedbacks || {})
      setLegacyFeedbacks(swrData.recentLogs.legacyFeedbacks || {})
    }

    // 最近のメッセージ
    if (!swrData.recentMessages.error) {
      setRecentMessages(swrData.recentMessages.messages)
    }

    // 振り返り完了状態
    if (!swrData.reflection.error) {
      setIsReflectCompleted(swrData.reflection.completed)
    }

    console.log("✅ [SWR] All state updated from SWR data")
  }, [swrData])

  // 🚀 SWR: ローディング状態を同期
  useEffect(() => {
    // SWRのローディング状態を反映（初期データがある場合は即座に表示）
    if (!selectedChild?.id) {
      setIsLoading(false)
      return
    }
    // swrDataがある場合はローディング完了
    if (swrData) {
      setIsLoading(false)
    } else if (swrLoading) {
      setIsLoading(true)
    }
  }, [selectedChild?.id, swrData, swrLoading])

  // 🚀 SWR: 子ども選択時に他の子どものデータをプリフェッチ
  useEffect(() => {
    if (!children || children.length <= 1) return

    // 選択されていない子どものデータを事前取得
    children.forEach((child) => {
      if (child.id !== selectedChild?.id) {
        prefetchChildDashboard(child.id)
      }
    })
  }, [children, selectedChild?.id])

  // 全ての子供の今日の応援状況をチェック
  // ページ表示時にも再取得（他ページで応援送信後の反映のため）
  useEffect(() => {
    const checkEncouragementStatus = async () => {
      if (!children || children.length === 0) return

      try {
        const { getDailySparkLevel } = await import("@/app/actions/daily-spark")
        const { fetchEncouragementStatusMap } = await import("@/lib/utils/check-encouragement-status")
        const statusMap = await fetchEncouragementStatusMap(children, getDailySparkLevel)
        setEncouragementStatus(statusMap)
      } catch (error) {
        console.error("[ParentDashboard] checkEncouragementStatus failed:", error)
        const fallback: { [childId: number]: boolean } = {}
        children.forEach((c) => {
          const id = typeof c.id === "string" ? parseInt(c.id as string, 10) : c.id
          if (Number.isInteger(id)) fallback[id] = false
        })
        setEncouragementStatus(fallback)
      }
    }

    // 初回実行
    checkEncouragementStatus()

    // ページがフォーカスされた時に再チェック（他ページで応援送信後の更新用）
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkEncouragementStatus()
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [children])

  const greetingMessage = getGreetingMessage(userName, lastLoginInfo)

  const handleChildSelect = (childId: number) => {
    setSelectedChildId(childId)
    setIsLoading(true)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-20 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">読み込み中...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <UserProfileHeader encouragementStatus={encouragementStatus} />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 pb-20 elegant-fade-in">
        <PageHeader
          icon={Home}
          title="ホーム"
          subtitle={greetingMessage}
          variant="parent"
        />

        <div className="max-w-screen-xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
          {/* 🚀 SWR: 更新状態インジケーター */}
          {swrValidating && (
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground bg-blue-50 rounded-full px-3 py-1.5 w-fit mx-auto">
              <RefreshCw className="h-3 w-3 animate-spin" />
              <span>更新中...</span>
            </div>
          )}
        </div>

        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="space-y-8 lg:space-y-0">
            {/* スマホでの表示順序 */}
            <div className="lg:hidden space-y-8">
              <Card
                className="bg-gradient-to-br border shadow-xl backdrop-blur-sm transition-all duration-300 group cursor-pointer"
                style={
                  isThemeActive(themeColor)
                    ? {
                        backgroundImage: `linear-gradient(to bottom right, ${hexWithAlpha(themeColor, 8)}, ${hexWithAlpha(themeColor, 15)})`,
                        borderColor: hexWithAlpha(themeColor, 25),
                      }
                    : {}
                }
              >
                <CardHeader
                  className="pb-6 bg-gradient-to-r rounded-t-lg relative overflow-hidden"
                  style={
                    isThemeActive(themeColor)
                      ? {
                          backgroundImage: `linear-gradient(90deg, ${hexWithAlpha(themeColor, 12)}, ${hexWithAlpha(themeColor, 18)})`,
                        }
                      : {}
                  }
                >
                  {/* テーマカラーのグラデーションライン（上部） */}
                  {isThemeActive(themeColor) && (
                    <div
                      className="absolute top-0 left-0 right-0 h-1"
                      style={{
                        background: `linear-gradient(90deg, transparent 0%, ${themeColor} 50%, transparent 100%)`,
                      }}
                    />
                  )}
                  <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => setIsStatusMessageExpanded(!isStatusMessageExpanded)}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar
                        className="h-14 w-14 shadow-lg transition-all duration-300 group-hover:scale-105"
                        style={
                          isThemeActive(themeColor)
                            ? {
                                backgroundColor: hexWithAlpha(themeColor, 20),
                                border: `3px solid ${hexWithAlpha(themeColor, 60)}`,
                                boxShadow: `0 4px 12px ${hexWithAlpha(themeColor, 25)}`,
                              }
                            : {}
                        }
                      >
                        <AvatarImage src={getAvatarSrc("ai_coach") || "/placeholder.svg"} alt="AIコーチ" />
                        <AvatarFallback className="font-bold text-base" style={{ backgroundColor: hexWithAlpha(themeColor, 20) || '#e0f2fe' }}>AI</AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-lg font-bold mb-1" style={{ color: isThemeActive(themeColor) ? themeColor : '#164e63' }}>
                          今日の様子
                        </CardTitle>
                        {!isStatusMessageExpanded && (
                          <p className="text-xs text-gray-500">タップして表示</p>
                        )}
                      </div>
                    </div>
                    <button
                      className="p-2.5 rounded-full transition-all duration-300 hover:scale-110"
                      style={{
                        backgroundColor: isThemeActive(themeColor)
                          ? hexWithAlpha(themeColor, 15)
                          : '#e0f2fe',
                      }}
                      aria-label={isStatusMessageExpanded ? "メッセージを閉じる" : "メッセージを開く"}
                    >
                      {isStatusMessageExpanded ? (
                        <ChevronUp
                          className="h-6 w-6 transition-colors"
                          style={{ color: isThemeActive(themeColor) ? themeColor : '#0891b2' }}
                        />
                      ) : (
                        <ChevronDown
                          className="h-6 w-6 transition-colors"
                          style={{ color: isThemeActive(themeColor) ? themeColor : '#0891b2' }}
                        />
                      )}
                    </button>
                  </div>
                </CardHeader>
                {isStatusMessageExpanded && (
                  <CardContent className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
                    <div
                      className="bg-white/95 backdrop-blur-sm rounded-2xl p-8 border shadow-lg transition-all duration-300 relative"
                      style={
                        isThemeActive(themeColor)
                          ? { borderColor: hexWithAlpha(themeColor, 20) }
                          : {}
                      }
                    >
                      <p className="text-lg leading-relaxed text-slate-700 font-medium mb-6">
                        {todayStatusMessage || `${selectedChild?.nickname || "お子さん"}さんの今日の様子を見守りましょう`}
                      </p>
                      {todayStatusMessageCreatedAt && (
                        <div className="text-right">
                          <span className="text-xs text-gray-400">作成: {formatDateTime(todayStatusMessageCreatedAt)}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>

              <ParentTodayMissionCard
                todayProgress={todayProgress}
                studentName={selectedChild?.nickname || "お子さん"}
                selectedChildId={selectedChild?.id || null}
                isReflectCompleted={isReflectCompleted}
                onMessagesUpdate={setRecentMessages}
                encouragementStatus={encouragementStatus}
                setEncouragementStatus={setEncouragementStatus}
              />
              <StreakCard
                streak={studyStreak}
                maxStreak={maxStreak}
                lastStudyDate={lastStudyDate}
                todayStudied={todayStudied}
                streakState={streakState}
                themeColor={themeColor}
                viewMode="parent"
                studentName={selectedChild?.nickname || "お子さん"}
              />
              <LazyCalendarWrapper calendarData={calendarData} />
              <WeeklySubjectProgressCard weeklyProgress={weeklyProgress} sessionNumber={sessionNumber} />
              {selectedChild?.id && (
                <StudentAssessmentSection
                  studentId={selectedChild.id}
                  limit={3}
                  compact={false}
                />
              )}
              <RecentEncouragementCard messages={recentMessages} selectedChildId={selectedChild?.id || null} />
              <RecentLearningHistoryCard logs={recentLogs} batchFeedbacks={batchFeedbacks} legacyFeedbacks={legacyFeedbacks} />
            </div>

            <div className="hidden lg:grid lg:grid-cols-3 lg:gap-8">
              {/* 左列（メイン - 2/3の幅） */}
              <div className="lg:col-span-2 space-y-8">
                <Card
                  className="bg-gradient-to-br border shadow-xl backdrop-blur-sm transition-all duration-300 group cursor-pointer"
                  style={
                    isThemeActive(themeColor)
                      ? {
                          backgroundImage: `linear-gradient(to bottom right, ${hexWithAlpha(themeColor, 8)}, ${hexWithAlpha(themeColor, 15)})`,
                          borderColor: hexWithAlpha(themeColor, 25),
                        }
                      : {}
                  }
                >
                  <CardHeader
                    className="pb-6 bg-gradient-to-r rounded-t-lg relative overflow-hidden"
                    style={
                      isThemeActive(themeColor)
                        ? {
                            backgroundImage: `linear-gradient(90deg, ${hexWithAlpha(themeColor, 12)}, ${hexWithAlpha(themeColor, 18)})`,
                          }
                        : {}
                    }
                  >
                    {/* テーマカラーのグラデーションライン（上部） */}
                    {isThemeActive(themeColor) && (
                      <div
                        className="absolute top-0 left-0 right-0 h-1"
                        style={{
                          background: `linear-gradient(90deg, transparent 0%, ${themeColor} 50%, transparent 100%)`,
                        }}
                      />
                    )}
                    <div
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => setIsStatusMessageExpanded(!isStatusMessageExpanded)}
                    >
                      <CardTitle className="text-xl font-bold flex items-center gap-4">
                        <div className="flex items-center gap-3">
                          <Avatar
                            className="h-16 w-16 shadow-xl transition-all duration-300"
                            style={
                              isThemeActive(themeColor)
                                ? {
                                    backgroundColor: hexWithAlpha(themeColor, 20),
                                    border: `4px solid ${hexWithAlpha(themeColor, 70)}`,
                                    boxShadow: `0 4px 12px ${hexWithAlpha(themeColor, 30)}`,
                                  }
                                : {}
                            }
                          >
                            <AvatarImage src={getAvatarSrc("ai_coach") || "/placeholder.svg"} alt="AIコーチ" />
                            <AvatarFallback className="font-bold text-lg" style={{ backgroundColor: hexWithAlpha(themeColor, 20) || '#e0f2fe' }}>AI</AvatarFallback>
                          </Avatar>
                          <div>
                            <span className="font-bold text-xl" style={{ color: isThemeActive(themeColor) ? themeColor : '#164e63' }}>
                              今日の様子
                            </span>
                            {!isStatusMessageExpanded && (
                              <p className="text-xs text-gray-500 font-normal mt-1">クリックして表示</p>
                            )}
                          </div>
                        </div>
                      </CardTitle>
                      <button
                        className="p-2 rounded-full shadow-sm transition-all duration-300 hover:scale-110"
                        style={{ backgroundColor: hexWithAlpha(themeColor, 15) || '#e0f2fe' }}
                        aria-label={isStatusMessageExpanded ? "メッセージを閉じる" : "メッセージを開く"}
                      >
                        {isStatusMessageExpanded ? (
                          <ChevronUp className="h-6 w-6" style={{ color: isThemeActive(themeColor) ? themeColor : '#0891b2' }} />
                        ) : (
                          <ChevronDown className="h-6 w-6" style={{ color: isThemeActive(themeColor) ? themeColor : '#0891b2' }} />
                        )}
                      </button>
                    </div>
                  </CardHeader>
                  {isStatusMessageExpanded && (
                    <CardContent className="space-y-6">
                      <div
                        className="bg-white/95 backdrop-blur-sm rounded-2xl p-8 border shadow-2xl transition-all duration-300"
                        style={
                          isThemeActive(themeColor)
                            ? { borderColor: hexWithAlpha(themeColor, 20) }
                            : {}
                        }
                      >
                        <p className="text-lg leading-relaxed text-slate-700 font-medium">
                          {todayStatusMessage || `${selectedChild?.nickname || "お子さん"}さんの今日の様子を見守りましょう`}
                        </p>
                        {todayStatusMessageCreatedAt && (
                          <div className="text-right">
                            <span className="text-xs text-gray-400">作成: {formatDateTime(todayStatusMessageCreatedAt)}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  )}
                </Card>

                <ParentTodayMissionCard
                todayProgress={todayProgress}
                studentName={selectedChild?.nickname || "お子さん"}
                selectedChildId={selectedChild?.id || null}
                isReflectCompleted={isReflectCompleted}
                onMessagesUpdate={setRecentMessages}
                encouragementStatus={encouragementStatus}
                setEncouragementStatus={setEncouragementStatus}
              />
                <RecentEncouragementCard messages={recentMessages} selectedChildId={selectedChild?.id || null} />
                <RecentLearningHistoryCard logs={recentLogs} batchFeedbacks={batchFeedbacks} legacyFeedbacks={legacyFeedbacks} />
              </div>

              {/* 右列（サブ - 1/3の幅） */}
              <div className="lg:col-span-1 space-y-8">
                <StreakCard
                  streak={studyStreak}
                  maxStreak={maxStreak}
                  lastStudyDate={lastStudyDate}
                  todayStudied={todayStudied}
                  streakState={streakState}
                  themeColor={themeColor}
                  viewMode="parent"
                  studentName={selectedChild?.nickname || "お子さん"}
                />
                <LazyCalendarWrapper calendarData={calendarData} />
                <WeeklySubjectProgressCard weeklyProgress={weeklyProgress} sessionNumber={sessionNumber} />
                {selectedChild?.id && (
                  <StudentAssessmentSection
                    studentId={selectedChild.id}
                    limit={3}
                    compact
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <ParentBottomNavigation selectedChildId={selectedChild?.id || null} />
    </>
  )
}

/**
 * 保護者用ダッシュボードコンポーネント（クライアント側）
 * サーバーコンポーネントから初期データを受け取る
 */
interface ParentDashboardClientProps {
  parentProfile: {
    displayName: string
    avatarId: string
    themeColor: string
  }
  children: import("@/lib/types/profile").ChildProfile[]
  selectedChild: import("@/lib/types/profile").ChildProfile | null
  initialData: import("@/lib/types/profile").ParentDashboardData | null
}

export default function ParentDashboardClient({
  parentProfile,
  children,
  selectedChild: initialSelectedChild,
  initialData,
}: ParentDashboardClientProps) {
  // UserProfileProvider は app/parent/layout.tsx で提供されている
  return (
    <ParentDashboardInner
      parentProfile={parentProfile}
      children={children}
      initialSelectedChild={initialSelectedChild}
      initialData={initialData}
    />
  )
}
