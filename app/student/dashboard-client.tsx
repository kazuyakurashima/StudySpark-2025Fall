"use client"

import React, { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { BottomNavigation } from "@/components/bottom-navigation"
import { WeeklySubjectProgressCard } from "@/components/weekly-subject-progress-card"
import { UserProfileHeader } from "@/components/common/user-profile-header"
import { PageHeader } from "@/components/common/page-header"
import { Flame, Calendar, Home, Flag, MessageCircle, BarChart3, Clock, Heart, ChevronLeft, ChevronRight, Bot, Sparkles, ChevronDown, ChevronUp } from "lucide-react"
import { UserProfileProvider, useUserProfile } from "@/lib/hooks/use-user-profile"
import { hexWithAlpha, isThemeActive } from "@/lib/utils/theme-color"
import { StreakCard } from "@/components/streak-card"
import { useStudentDashboard, type StudentDashboardData as SWRDashboardData } from "@/lib/hooks/use-student-dashboard"
import { groupLogsByBatch, getRepresentativeLog, calculateSummary, calculateAccuracy } from "@/lib/utils/batch-grouping"
import type { StudyLogWithBatch, GroupedLogEntry, FeedbackMaps } from "@/lib/types/batch-grouping"

interface DashboardData {
  userName: string
  selectedAvatar: string
  aiCoachMessage: string
  aiCoachMessageCreatedAt: string | null
  studyStreak: number
  maxStreak: number
  lastStudyDate: string | null
  todayStudied: boolean
  streakState: "active" | "grace" | "warning" | "reset"
  /** 累積学習日数（Phase 1: モチベーション機能） */
  totalDays: number
  recentLogs: any[]
  batchFeedbacks: Record<string, string>
  legacyFeedbacks: Record<number, string>
  recentMessages: any[]
  lastLoginInfo: {
    lastLoginDays: number | null
    lastLoginHours: number
    isFirstTime: boolean
  } | null
  todayProgress: Array<{
    subject: string
    accuracy: number
    correctCount: number
    totalProblems: number
    logCount: number
  }>
  yesterdayProgress: Array<{
    subject: string
    accuracy: number
    correctCount: number
    totalProblems: number
  }>
  calendarData: { [dateStr: string]: { subjectCount: number; accuracy80Count: number } }
  weeklyProgress: Array<{
    subject: string
    colorCode: string
    accuracy: number
    correctCount: number
    totalProblems: number
    details: Array<{ content: string; remaining: number }>
  }>
  sessionNumber: number | null
  reflectionCompleted: boolean
  liveUpdates: Array<{
    subject: string
    improvement: number
    isFirstTime: boolean
    todayCorrect: number
    todayTotal: number
  }>
  lastUpdateTime: string | null
  hasLiveUpdates: boolean
}

/**
 * SSR初期データをSWR形式に変換する関数
 */
function transformSSRtoSWRData(ssrData: DashboardData): Partial<SWRDashboardData> {
  return {
    profile: {
      nickname: ssrData.userName,
      avatarId: ssrData.selectedAvatar,
      // SSR初期データにはthemeColorがないため空文字（profile hookの値を優先）
      themeColor: "",
    },
    aiCoachMessage: {
      message: ssrData.aiCoachMessage,
      createdAt: ssrData.aiCoachMessageCreatedAt,
    },
    streak: {
      streak: ssrData.studyStreak,
      maxStreak: ssrData.maxStreak,
      lastStudyDate: ssrData.lastStudyDate,
      todayStudied: ssrData.todayStudied,
      state: ssrData.streakState,
      totalDays: ssrData.totalDays,
    },
    recentLogs: { logs: ssrData.recentLogs, batchFeedbacks: ssrData.batchFeedbacks, legacyFeedbacks: ssrData.legacyFeedbacks },
    recentMessages: { messages: ssrData.recentMessages },
    lastLoginInfo: ssrData.lastLoginInfo,
    todayProgress: { todayProgress: ssrData.todayProgress },
    yesterdayProgress: { yesterdayProgress: ssrData.yesterdayProgress },
    calendar: { calendarData: ssrData.calendarData },
    weeklyProgress: {
      progress: ssrData.weeklyProgress,
      sessionNumber: ssrData.sessionNumber,
    },
    reflection: { completed: ssrData.reflectionCompleted },
    liveUpdates: {
      updates: ssrData.liveUpdates,
      lastUpdateTime: ssrData.lastUpdateTime,
      hasUpdates: ssrData.hasLiveUpdates,
    },
    fetchedAt: Date.now(),
  }
}

// ユーティリティ関数: 科目名 → アイコン
function getSubjectIcon(subject: string) {
  const icons: { [key: string]: string } = {
    "算数": "📐",
    "国語": "📖",
    "理科": "🔬",
    "社会": "🌏",
  }
  return icons[subject] || "✨"
}

// ユーティリティ関数: 日時のフォーマット（JST）
function formatDateTime(isoString: string | null) {
  if (!isoString) return ""
  const date = new Date(isoString)

  // JST で日付と時刻を取得（サーバー・クライアント両方で統一）
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

function getGreetingMessage(userName: string, lastLoginInfo: { lastLoginDays: number | null, lastLoginHours: number, isFirstTime: boolean } | null) {
  // 初回ログインパターン（3種類）
  const firstTimeGreetings = [
    `はじめまして、${userName}さん`,
    `ようこそ、${userName}さん`,
    `これからよろしくね、${userName}さん`
  ]

  // 24時間以内の再ログインパターン（4種類）
  const recentGreetings = [
    `おかえりなさい、${userName}さん`,
    `また会えたね、${userName}さん`,
    `こんにちは、${userName}さん`,
    `お待ちしてたよ、${userName}さん`
  ]

  // 24時間以上ぶりのログインパターン（3種類）
  const longTimeGreetings = [
    `お久しぶり、${userName}さん`,
    `待ってたよ、${userName}さん`,
    `また一緒に頑張ろう、${userName}さん`
  ]

  // 日付ベースでランダムパターンを選択（同じ日は同じメッセージ）
  // JST基準の日付を取得
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
  const today = formatter.format(new Date())
  const seed = today.split('-').reduce((acc, val) => acc + parseInt(val), 0)

  if (!lastLoginInfo || lastLoginInfo.isFirstTime || lastLoginInfo.lastLoginDays === 0) {
    return firstTimeGreetings[seed % firstTimeGreetings.length]
  }

  if (lastLoginInfo.lastLoginHours < 24) {
    return recentGreetings[seed % recentGreetings.length]
  }

  return longTimeGreetings[seed % longTimeGreetings.length]
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
    coach1: "/images/coach1.png",
    coach2: "/images/coach2.png",
    coach3: "/images/coach3.png",
    coach4: "/images/coach4.png",
    coach5: "/images/coach5.png",
    coach6: "/images/coach6.png",
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

const getLearningIntensity = (
  date: string,
  calendarData: { [dateStr: string]: { subjectCount: number; accuracy80Count: number } },
  criteriaMode: "input" | "accuracy"
) => {
  const data = calendarData[date]
  if (!data) return "none"

  // 判定基準に応じて使用する値を選択
  const count = criteriaMode === "input" ? data.subjectCount : data.accuracy80Count

  if (count === 0) return "none"
  if (count === 1) return "light"
  if (count === 2) return "medium"
  return "dark"
}

const LearningHistoryCalendar = ({ calendarData }: { calendarData: { [dateStr: string]: { subjectCount: number; accuracy80Count: number } } }) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date())
  const [criteriaMode, setCriteriaMode] = useState<"input" | "accuracy">("input")

  // JST で日付のパーツ（年月日・曜日）を取得
  const getJSTDateParts = (date: Date) => {
    const formatter = new Intl.DateTimeFormat('ja-JP', {
      timeZone: 'Asia/Tokyo',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      weekday: 'short'
    })
    const parts = formatter.formatToParts(date)
    return {
      year: Number(parts.find(p => p.type === 'year')?.value),
      month: Number(parts.find(p => p.type === 'month')?.value),
      day: Number(parts.find(p => p.type === 'day')?.value),
      weekday: parts.find(p => p.type === 'weekday')?.value || ''
    }
  }

  // JST の曜日文字列を数値に変換
  const getWeekdayNumber = (weekdayStr: string): number => {
    const weekdayMap: { [key: string]: number } = {
      '日': 0, '月': 1, '火': 2, '水': 3, '木': 4, '金': 5, '土': 6
    }
    return weekdayMap[weekdayStr] ?? 0
  }

  // JST で YYYY-MM-DD 形式の文字列を生成
  const formatJSTDateString = (date: Date): string => {
    const parts = getJSTDateParts(date)
    return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`
  }

  // データ取得範囲（6週間前まで、JST基準）
  const today = new Date()
  const todayParts = getJSTDateParts(today)
  const sixWeeksAgo = new Date(today.getTime() - 42 * 24 * 60 * 60 * 1000)
  const sixWeeksAgoParts = getJSTDateParts(sixWeeksAgo)

  // ナビゲーション関数（JST 基準）
  const goToPreviousMonth = () => {
    const parts = getJSTDateParts(selectedMonth)
    // 前月の1日を JST で作成
    let newYear = parts.year
    let newMonth = parts.month - 1
    if (newMonth < 1) {
      newMonth = 12
      newYear -= 1
    }
    // UTC で作成するが、JST の年月日を意図して作成
    const newDate = new Date(Date.UTC(newYear, newMonth - 1, 1, 0, 0, 0))
    setSelectedMonth(newDate)
  }

  const goToNextMonth = () => {
    const parts = getJSTDateParts(selectedMonth)
    // 次月の1日を JST で作成
    let newYear = parts.year
    let newMonth = parts.month + 1
    if (newMonth > 12) {
      newMonth = 1
      newYear += 1
    }
    const newDate = new Date(Date.UTC(newYear, newMonth - 1, 1, 0, 0, 0))
    setSelectedMonth(newDate)
  }

  const goToToday = () => {
    setSelectedMonth(new Date())
  }

  // 前月・次月ボタンの有効/無効判定（JST 基準）
  const canGoPrevious = () => {
    const parts = getJSTDateParts(selectedMonth)
    // 前月の最終日を取得
    let prevYear = parts.year
    let prevMonth = parts.month - 1
    if (prevMonth < 1) {
      prevMonth = 12
      prevYear -= 1
    }
    // 前月の最終日 = 当月の0日目
    const lastDayOfPrevMonth = new Date(Date.UTC(parts.year, parts.month - 1, 0, 0, 0, 0))
    const lastDayParts = getJSTDateParts(lastDayOfPrevMonth)

    // 6週間前との比較
    if (lastDayParts.year < sixWeeksAgoParts.year) return false
    if (lastDayParts.year > sixWeeksAgoParts.year) return true
    if (lastDayParts.month < sixWeeksAgoParts.month) return false
    if (lastDayParts.month > sixWeeksAgoParts.month) return true
    return lastDayParts.day >= sixWeeksAgoParts.day
  }

  const canGoNext = () => {
    const parts = getJSTDateParts(selectedMonth)
    // 次月の1日を取得
    let nextYear = parts.year
    let nextMonth = parts.month + 1
    if (nextMonth > 12) {
      nextMonth = 1
      nextYear += 1
    }

    // 今日との比較
    if (nextYear > todayParts.year) return false
    if (nextYear < todayParts.year) return true
    if (nextMonth > todayParts.month) return false
    return true
  }

  // 選択された月のカレンダーデータを生成（JST 基準）
  const targetParts = getJSTDateParts(selectedMonth)
  const monthName = `${targetParts.year}年${targetParts.month}月`

  const weeks = []

  // その月の最初の日と最後の日を JST で取得
  // UTC で作成するが、JST の年月日を意図
  const firstDayUTC = new Date(Date.UTC(targetParts.year, targetParts.month - 1, 1, 0, 0, 0))
  const lastDayUTC = new Date(Date.UTC(targetParts.year, targetParts.month, 0, 0, 0, 0))

  const firstDayParts = getJSTDateParts(firstDayUTC)
  const lastDayParts = getJSTDateParts(lastDayUTC)

  // カレンダーの開始日（月初の曜日に応じて前月の日付を含む）
  const firstWeekday = getWeekdayNumber(firstDayParts.weekday)
  const startDayNum = firstDayParts.day - firstWeekday
  const startDateUTC = new Date(Date.UTC(targetParts.year, targetParts.month - 1, startDayNum, 0, 0, 0))

  // カレンダーの終了日（月末の曜日に応じて次月の日付を含む）
  const lastWeekday = getWeekdayNumber(lastDayParts.weekday)
  const endDayNum = lastDayParts.day + (6 - lastWeekday)
  const endDateUTC = new Date(Date.UTC(targetParts.year, targetParts.month - 1, endDayNum, 0, 0, 0))

  // カレンダーを日付ごとに生成
  let currentDateUTC = new Date(startDateUTC)
  while (currentDateUTC <= endDateUTC) {
    const week = []
    for (let day = 0; day < 7; day++) {
      const currentParts = getJSTDateParts(currentDateUTC)
      const dateStr = formatJSTDateString(currentDateUTC)

      // 判定基準に基づいて濃淡を決定
      const intensity = getLearningIntensity(dateStr, calendarData, criteriaMode)
      const isCurrentMonth = currentParts.month === targetParts.month

      week.push({
        date: dateStr,
        day: currentParts.day,
        intensity: isCurrentMonth ? intensity : "none",
        data: calendarData[dateStr],
        isCurrentMonth,
      })

      // 次の日へ（24時間加算で日付変更を JST ベースで実現）
      currentDateUTC = new Date(currentDateUTC.getTime() + 24 * 60 * 60 * 1000)
    }
    weeks.push(week)
  }

  const intensityColors = {
    none: "bg-slate-100 border-slate-200",
    light: "bg-blue-200 border-blue-300",
    medium: "bg-blue-400 border-blue-500",
    dark: "bg-primary border-primary",
  }

  const isCurrentMonth = targetParts.year === todayParts.year && targetParts.month === todayParts.month

  return (
    <Card className="bg-gradient-to-br from-blue-50 to-primary/10 border-primary/20 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" />
            学習カレンダー
          </CardTitle>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={goToPreviousMonth}
              disabled={!canGoPrevious()}
              className="h-7 w-7 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={goToToday}
              className="h-7 px-2 text-xs"
            >
              今月
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={goToNextMonth}
              disabled={!canGoNext()}
              className="h-7 w-7 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex justify-center mt-3">
          <Button
            variant={criteriaMode === "input" ? "default" : "outline"}
            size="sm"
            onClick={() => setCriteriaMode("input")}
            className="rounded-r-none text-xs h-7"
          >
            入力数
          </Button>
          <Button
            variant={criteriaMode === "accuracy" ? "default" : "outline"}
            size="sm"
            onClick={() => setCriteriaMode("accuracy")}
            className="rounded-l-none text-xs h-7"
          >
            80%以上
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-3 sm:px-6">
        <div className="space-y-3 sm:space-y-4">
          <div className="text-base font-bold text-slate-800 text-center">
            {monthName}
          </div>

          {/* 曜日ヘッダー */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {["日", "月", "火", "水", "木", "金", "土"].map((day) => (
              <div
                key={day}
                className="text-sm font-semibold text-center text-slate-700 py-1 w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center"
              >
                {day}
              </div>
            ))}
          </div>

          {/* カレンダーグリッド */}
          {weeks.map((week: any[], weekIndex: number) => (
            <div key={weekIndex} className="grid grid-cols-7 gap-1 sm:gap-2">
              {week.map((day: any, dayIndex: number) => (
                <div
                  key={dayIndex}
                  className={`
                    w-5 h-5 sm:w-6 sm:h-6 rounded-md border-2 transition-all duration-300 hover:scale-110 cursor-pointer shadow-sm
                    ${intensityColors[day.intensity as keyof typeof intensityColors]}
                    ${!day.isCurrentMonth ? "opacity-30" : ""}
                  `}
                  title={
                    day.data && day.isCurrentMonth
                      ? `${day.date}: ${criteriaMode === "input" ? `学習記録 ${day.data.subjectCount}件` : `正答率80%以上 ${day.data.accuracy80Count}件`}`
                      : `${day.date}: 学習記録なし`
                  }
                />
              ))}
            </div>
          ))}

          {/* 凡例 */}
          <div className="flex items-center justify-between text-sm text-slate-600 pt-3 border-t border-slate-300">
            <span className="font-medium">少ない</span>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-md bg-slate-100 border-2 border-slate-200 shadow-sm"></div>
              <div className="w-4 h-4 rounded-md bg-blue-200 border-2 border-blue-300 shadow-sm"></div>
              <div className="w-4 h-4 rounded-md bg-blue-400 border-2 border-blue-500 shadow-sm"></div>
              <div className="w-4 h-4 rounded-md bg-primary border-2 border-primary shadow-sm"></div>
            </div>
            <span className="font-medium">多い</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

const TodayMissionCard = ({ todayProgress, yesterdayProgress, reflectionCompleted, weeklyProgress }: { todayProgress: Array<{subject: string, accuracy: number, correctCount: number, totalProblems: number, logCount: number}>, yesterdayProgress: Array<{subject: string, accuracy: number, correctCount: number, totalProblems: number}>, reflectionCompleted: boolean, weeklyProgress: Array<{subject: string, colorCode: string, accuracy: number, correctCount: number, totalProblems: number, details: Array<{content: string, remaining: number}>}> }) => {
  const router = useRouter()

  // Helper function for accuracy color coding
  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 80) return "text-green-600"
    if (accuracy >= 50) return "text-amber-600"
    return "text-orange-600"
  }

  // Helper function to calculate diff from yesterday
  const calculateDiff = (subject: string, currentAccuracy: number) => {
    const yesterdayData = yesterdayProgress.find(y => y.subject === subject)

    if (!yesterdayData || yesterdayData.totalProblems === 0) {
      return null
    }

    const diff = currentAccuracy - yesterdayData.accuracy
    return diff
  }

  const getTodayWeekday = () => {
    const today = new Date()
    return today.getDay() // 0=日曜, 1=月曜, ..., 6=土曜
  }

  const getCurrentHour = () => {
    const now = new Date()
    return now.getHours()
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
    const progressMap: { [subject: string]: { accuracy: number; inputCount: number } } = {}
    todayProgress.forEach((item) => {
      progressMap[item.subject] = {
        accuracy: item.accuracy,
        inputCount: item.logCount ?? 0, // 入力回数（ログ件数）を使用、undefinedなら0
      }
    })


    // 土曜12時以降・日曜日：特別モード（リフレクト + 低正答率2科目）
    if (mode === "special") {
      const isReflectCompleted = reflectionCompleted

      // 週全体の正答率が80%未満の科目を抽出（低い順に2つまで）
      const lowAccuracySubjects = weeklyProgress
        .filter((item) => item.accuracy < 80 && item.totalProblems > 0)
        .sort((a, b) => a.accuracy - b.accuracy) // 正答率の低い順
        .slice(0, 2)
        .map((item) => ({
          subject: item.subject,
          correctRate: item.accuracy,
          needsAction: true,
          type: "review",
          isCompleted: false,
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
          : "週間振り返りと復習で今週を締めくくろう！",
        completionStatus: `${completedCount}/${panels.length}入力完了`,
        allCompleted,
      }
    }

    // 通常モード（入力促進）
    const panels = subjects.map((subject) => {
      const data = progressMap[subject] || { accuracy: 0, inputCount: 0 }
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
      }
    })

    // 完了数（正答率80%以上）をカウント
    const completedCount = panels.filter((p) => p.isCompleted).length
    // 入力数（何らかの入力があった科目）をカウント
    const inputCount = panels.filter((p) => p.inputCount > 0).length
    const actionNeededCount = panels.filter((p) => p.needsAction).length

    // 全て完了の場合の判定（正答率80%以上）
    const allCompleted = completedCount === panels.length

    // ミッション状況メッセージの生成
    let statusMessage = ""

    if (allCompleted) {
      // 全て80%以上達成 → パーフェクトマスター
      statusMessage = "🎉 パーフェクトマスターおめでとう！全科目で習得率80%以上達成！"
    } else if (inputCount === panels.length) {
      // 全て入力済みだが80%未満がある → 見直しを促す
      const notMasteredSubjects = panels.filter((p) => !p.isCompleted)

      if (notMasteredSubjects.length === 1) {
        const subject = notMasteredSubjects[0].subject
        statusMessage = `${subject}の見直しをして、パーフェクトマスターを目指そう！`
      } else {
        const subjectList = notMasteredSubjects.map(p => p.subject).join("、")
        statusMessage = `${subjectList}の見直しをして、パーフェクトマスターを目指そう！`
      }
    } else {
      // まだ入力していない科目がある
      if (actionNeededCount === 1) {
        const remainingSubject = panels.find((p) => p.needsAction)?.subject
        statusMessage = `${inputCount}/${panels.length}入力完了！あと${remainingSubject}を入力したら、入力完了だね！`
      } else {
        statusMessage = `${inputCount}/${panels.length}入力完了！あと${actionNeededCount}科目入力して今日のミッション達成！`
      }
    }

    return {
      mode,
      subjects,
      panels,
      statusMessage,
      completionStatus: `${inputCount}/${panels.length}入力完了`,
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
      // 未入力は赤（要件定義通り）
      return needsAction
        ? "bg-red-100 text-red-800 border-red-200 font-bold animate-pulse"
        : "bg-slate-100 text-slate-700 border-slate-300"
    }
    if (status.includes("進捗率")) {
      const rate = Number.parseInt(status.match(/\d+/)?.[0] || "0")
      // 要件定義: 80%以上=青、80%未満=黄色、50%未満=オレンジ
      if (rate >= 80) return "bg-blue-100 text-blue-800 border-blue-200 font-bold"
      if (rate >= 50) return "bg-yellow-100 text-yellow-800 border-yellow-200"
      return "bg-orange-100 text-orange-800 border-orange-200"
    }
    if (status === "完了") return "bg-blue-100 text-blue-800 border-blue-200 font-bold"
    if (status === "未完了") return "bg-slate-100 text-slate-700 border-slate-300"
    return "bg-slate-100 text-slate-700 border-slate-300"
  }

  const getModeTitle = () => {
    return "今日のミッション！"
  }

  const handleSparkNavigation = (subject?: string) => {
    if (subject) {
      // Map subject names to IDs
      const subjectMap: { [key: string]: string } = {
        "算数": "math",
        "国語": "japanese",
        "理科": "science",
        "社会": "social"
      }
      const subjectId = subjectMap[subject]
      if (subjectId) {
        router.push(`/student/spark?subject=${subjectId}`)
        return
      }
    }
    router.push("/student/spark")
  }

  const handleReflectNavigation = () => {
    router.push("/student/reflect?tab=coaching")
  }

  // 科目別ボタンスタイル
  const getSubjectButtonStyle = (subject: string) => {
    const styles = {
      算数: "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-600/40 ring-2 ring-blue-400/50",
      国語: "bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 shadow-lg shadow-pink-500/30 hover:shadow-xl hover:shadow-pink-600/40 ring-2 ring-pink-400/50",
      理科: "bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-600/40 ring-2 ring-orange-400/50",
      社会: "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-600/40 ring-2 ring-emerald-400/50",
    }
    return styles[subject as keyof typeof styles] || "bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 shadow-lg shadow-amber-600/40 ring-2 ring-amber-400/60"
  }

  return (
    <Card className="bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 border-amber-200/60 shadow-xl">
      <CardHeader className="pb-4 bg-gradient-to-r from-amber-500/10 to-yellow-500/10 rounded-t-lg">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold flex items-center gap-3">
            <Home className="h-7 w-7 text-amber-600" />
            <span className="text-slate-800">{getModeTitle()}</span>
          </CardTitle>
          {missionData.completionStatus && (
            <Badge className="bg-amber-100/80 text-amber-800 border-amber-300/50 font-semibold text-base px-4 py-2 shadow-sm">
              {missionData.completionStatus}
            </Badge>
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
            <p className="text-white/90">素晴らしい！今日も一日お疲れさまでした！</p>
          </div>
        )}

        {/* 日曜日・特別モード */}
        {(missionData.mode === "sunday" || missionData.mode === "special") && (
          <div className="space-y-4">
            {missionData.panels.map((panel: any, index: number) => (
              <div
                key={index}
                className={`flex items-center justify-between p-6 rounded-xl bg-white/90 border-2 shadow-sm transition-all duration-300 hover:shadow-md ${
                  panel.type === "reflect"
                    ? "border-primary/30 bg-gradient-to-r from-primary/5 to-accent/5"
                    : getSubjectColor(panel.subject || "")
                }`}
              >
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-slate-800">
                    {panel.type === "reflect" ? panel.name : panel.subject}
                  </h3>
                  {panel.description && <p className="text-sm text-slate-600 mt-1">{panel.description}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <Badge className={`border ${getStatusBadgeColor(panel.status, panel.needsAction || false)}`}>
                    {panel.status}
                  </Badge>
                  <Button
                    onClick={() =>
                      panel.type === "reflect" ? handleReflectNavigation() : handleSparkNavigation(panel.subject)
                    }
                    className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                      panel.needsAction || panel.status === "未完了"
                        ? "bg-gradient-to-r from-amber-600 to-amber-700 text-white hover:from-amber-700 hover:to-amber-800 shadow-lg shadow-amber-600/40 hover:shadow-xl hover:shadow-amber-700/50 hover:scale-105 ring-2 ring-amber-400/60"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {panel.type === "reflect" ? "振り返る" : "今すぐ記録する"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 通常モード（入力促進・復習促進） */}
        {(missionData.mode === "input" || missionData.mode === "review") && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {missionData.panels.map((panel: any, index: number) => {
                // 入力済み（完了 or 1回以上入力）は目立たなくする
                const hasInput = panel.isCompleted || panel.inputCount > 0
                const diff = hasInput && panel.correctRate > 0 ? calculateDiff(panel.subject, panel.correctRate) : null
                const showPositiveFeedback = diff !== null && diff >= 10
                const showEncouragement = hasInput && panel.correctRate < 50

                return (
                  <div
                    key={index}
                    className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                      hasInput
                        ? "bg-slate-100/50 border-slate-300 shadow-sm opacity-70"
                        : `shadow-lg hover:shadow-xl ${getSubjectColor(panel.subject)} ${
                            panel.needsAction ? "ring-4 ring-primary/50 animate-pulse" : ""
                          }`
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className={`font-bold text-lg ${hasInput ? "text-slate-600" : "text-slate-800"}`}>
                          {panel.subject}
                        </span>
                        {/* 未入力の場合のみバッジ表示 */}
                        {!hasInput && (
                          <Badge className="text-xs px-2 py-1 bg-slate-100 text-slate-600 border border-slate-300">
                            未入力
                          </Badge>
                        )}
                      </div>

                    {/* Live Progress Display - 洗練されたカラーリング */}
                    {hasInput && panel.correctRate > 0 && (
                      <div className="flex items-center gap-2 mt-2">
                        {/* メイン進捗率表示 - グラデーション＋シャドウで洗練 */}
                        <div className="flex items-center">
                          <span
                            className={`text-2xl font-bold bg-gradient-to-br bg-clip-text text-transparent ${
                              panel.correctRate >= 80
                                ? "from-blue-600 via-blue-500 to-cyan-500"
                                : panel.correctRate >= 50
                                ? "from-amber-600 via-yellow-500 to-orange-500"
                                : "from-rose-600 via-pink-500 to-red-500"
                            }`}
                            style={{
                              filter: "drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1))"
                            }}
                          >
                            {panel.correctRate}
                          </span>
                          <span
                            className={`text-base font-semibold ml-0.5 ${
                              panel.correctRate >= 80
                                ? "text-blue-500"
                                : panel.correctRate >= 50
                                ? "text-amber-500"
                                : "text-rose-500"
                            }`}
                          >
                            %
                          </span>
                        </div>

                        {/* Diff badge - より洗練されたデザイン */}
                        {diff !== null && Math.abs(diff) >= 10 && (
                          <div
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold shadow-sm ${
                              diff >= 10
                                ? "bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-700 border border-emerald-200/50"
                                : "bg-gradient-to-r from-orange-50 to-amber-50 text-orange-700 border border-orange-200/50"
                            }`}
                            style={{
                              animation: diff >= 10 ? "bounceIn 0.6s ease-out" : "none"
                            }}
                          >
                            {diff >= 10 ? "↑" : "↓"}{Math.abs(Math.round(diff))}%
                          </div>
                        )}

                        {/* Emoji feedback */}
                        {showPositiveFeedback && (
                          <span
                            className="text-xl animate-fade-in"
                            style={{ animation: "fadeIn 0.6s ease-out" }}
                          >
                            🎉
                          </span>
                        )}
                        {showEncouragement && (
                          <span
                            className="text-xl animate-fade-in"
                            style={{ animation: "fadeIn 0.6s ease-out" }}
                          >
                            💪
                          </span>
                        )}
                      </div>
                    )}

                    <Button
                      onClick={() => handleSparkNavigation(panel.subject)}
                      className={`w-full py-3 px-4 rounded-lg text-sm font-bold transition-all duration-300 text-white hover:scale-105 ${
                        panel.needsAction
                          ? getSubjectButtonStyle(panel.subject)
                          : hasInput
                          ? "bg-slate-200 text-slate-500 hover:bg-slate-300"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {hasInput ? "記録済み" : "今すぐ記録する"}
                    </Button>
                  </div>
                </div>
                )
              })}
            </div>

            {/* ミッション状況表示（常に表示） */}
            <div className={`backdrop-blur-sm rounded-xl p-6 border-2 shadow-lg transition-all duration-300 ${
              missionData.statusMessage.includes("パーフェクトマスター")
                ? "bg-gradient-to-r from-yellow-100 via-yellow-50 to-orange-100 border-yellow-300 animate-pulse"
                : "bg-white/90 border-primary/20"
            }`}>
              <div className="text-center">
                <h3 className="font-bold text-lg text-slate-800 mb-2">ミッション状況</h3>
                <p className={`text-base leading-relaxed ${
                  missionData.statusMessage.includes("パーフェクトマスター")
                    ? "text-orange-800 font-bold text-lg"
                    : "text-slate-700"
                }`}>
                  {missionData.statusMessage}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
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
            <p className="text-sm text-slate-500 mt-2">スパーク機能で学習を記録しましょう！</p>
          </div>
        ) : (
          <>
            {displayedEntries.map((entry) => {
              // バッチエントリの場合
              if (entry.type === "batch") {
                const totalCorrect = entry.logs.reduce((sum, log) => sum + (log.correct_count || 0), 0)
                const totalProblems = entry.logs.reduce((sum, log) => sum + (log.total_problems || 0), 0)
                const avgAccuracy = totalProblems > 0 ? Math.round((totalCorrect / totalProblems) * 100) : 0

                return (
                  <div
                    key={entry.batchId}
                    className="bg-white/90 backdrop-blur-sm rounded-xl p-5 border border-green-100 shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    <div className="space-y-4">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-3 flex-wrap">
                          {/* 科目をユニークにして表示（共通ユーティリティで重複排除済み） */}
                          {entry.subjects.map((subjectName) => (
                            <Badge key={subjectName} className={`text-sm px-3 py-1 border font-medium ${getSubjectColor(subjectName)}`}>
                              {subjectName}
                            </Badge>
                          ))}
                          <span className="text-sm text-slate-600 bg-slate-100 px-3 py-1 rounded-full font-medium">
                            {entry.studentRecordTime}
                          </span>
                          <Badge variant="outline" className="text-sm px-3 py-1 border-slate-300 bg-white">
                            {entry.session}
                          </Badge>
                        </div>
                        <Badge className={`text-sm px-3 py-2 border font-bold ${getAccuracyColor(avgAccuracy)}`}>
                          平均 {avgAccuracy}%
                        </Badge>
                      </div>

                      <div className="space-y-3">
                        {/* 各科目の詳細 */}
                        <div className="space-y-2">
                          {entry.logs.map((log) => {
                            const accuracy = log.total_problems > 0 ? Math.round((log.correct_count / log.total_problems) * 100) : 0
                            return (
                              <div key={log.id} className="flex items-center justify-between bg-slate-50 p-2 rounded-lg">
                                <div className="flex items-center gap-2">
                                  <span className={`text-sm font-medium ${getSubjectColor(log.subjects?.name || "").split(" ")[0]}`}>
                                    {log.subjects?.name || "不明"}
                                  </span>
                                  <span className="text-sm text-slate-600">
                                    {log.study_content_types?.content_name || ""}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="text-sm text-slate-700">
                                    {log.correct_count}/{log.total_problems}問
                                  </span>
                                  <Badge className={`text-xs px-2 py-0.5 border ${getAccuracyColor(accuracy)}`}>
                                    {accuracy}%
                                  </Badge>
                                </div>
                              </div>
                            )
                          })}
                        </div>

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
              }

              // 単独エントリの場合
              const log = entry.log
              const accuracy = log.total_problems > 0 ? Math.round((log.correct_count / log.total_problems) * 100) : 0

              return (
                <div
                  key={log.id}
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
                            {log.correct_count}/{log.total_problems}問
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

const RecentEncouragementCard = ({ messages }: { messages: any[] }) => {
  const [showAll, setShowAll] = useState(false)
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set())

  const toggleCard = (index: number) => {
    const newExpanded = new Set(expandedCards)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedCards(newExpanded)
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

    // アバターの処理：送信者プロフィールから取得
    // avatar_idが設定されている場合はそれを使用、なければsender_roleに基づいたデフォルトアバターを取得
    const avatarUrl = senderProfile?.avatar_id
      ? getAvatarSrc(senderProfile.avatar_id)
      : getAvatarSrc(msg.sender_role === "parent" ? "parent1" : msg.sender_role === "coach" ? "coach1" : undefined)

    // 学習記録情報の整形
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
      avatar: avatarUrl,
      message: baseMessage,
      senderRole: msg.sender_role || "unknown",
      studyInfo,
    }
  })

  // 表示するメッセージ数（一部表示は最新3件、全表示は全て）
  const displayedMessages = showAll ? encouragementMessages : encouragementMessages.slice(0, 3)

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
          <div className="flex gap-2">
            {encouragementMessages.length > 3 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAll(!showAll)}
                className="border-pink-300 text-pink-700 hover:bg-pink-100"
              >
                {showAll ? "一部表示" : "全表示"}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => (window.location.href = "/student/reflect?tab=encouragement")}
              className="border-pink-300 text-pink-700 hover:bg-pink-100"
            >
              全て見る
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-6">
        {encouragementMessages.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-600">まだ応援メッセージがありません</p>
            <p className="text-sm text-slate-500 mt-2">保護者や指導者からの応援を待ちましょう！</p>
          </div>
        ) : (
          displayedMessages.map((message, index) => {
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

function StudentDashboardClientInner({ initialData }: { initialData: DashboardData }) {
  const router = useRouter()
  const [messages, setMessages] = useState(initialData.recentMessages)
  const { profile } = useUserProfile()

  // 🚀 SWR: SSR初期データをSWR形式に変換してfallbackとして使用
  const swrFallbackData = React.useMemo(() => transformSSRtoSWRData(initialData), [initialData])

  // 🚀 SWR: ダッシュボードデータをSWRでキャッシュ・管理
  const {
    data: swrData,
    isValidating: swrValidating,
    mutate: swrMutate,
  } = useStudentDashboard(swrFallbackData)

  // SWRデータがあればそれを使用、なければ初期データを使用
  const userName = swrData?.profile?.nickname || initialData.userName
  const selectedAvatar = swrData?.profile?.avatarId || initialData.selectedAvatar
  const aiCoachMessage = swrData?.aiCoachMessage?.message || initialData.aiCoachMessage
  const aiCoachMessageCreatedAt = swrData?.aiCoachMessage?.createdAt || initialData.aiCoachMessageCreatedAt
  const studyStreak = swrData?.streak?.streak ?? initialData.studyStreak
  const maxStreak = swrData?.streak?.maxStreak ?? initialData.maxStreak
  const lastStudyDate = swrData?.streak?.lastStudyDate ?? initialData.lastStudyDate
  const todayStudied = swrData?.streak?.todayStudied ?? initialData.todayStudied
  const streakState = swrData?.streak?.state ?? initialData.streakState
  const totalDays = swrData?.streak?.totalDays ?? initialData.totalDays
  const recentLogs = swrData?.recentLogs?.logs ?? initialData.recentLogs
  const batchFeedbacks = swrData?.recentLogs?.batchFeedbacks ?? initialData.batchFeedbacks
  const legacyFeedbacks = swrData?.recentLogs?.legacyFeedbacks ?? initialData.legacyFeedbacks
  const lastLoginInfo = swrData?.lastLoginInfo ?? initialData.lastLoginInfo
  const todayProgress = swrData?.todayProgress?.todayProgress ?? initialData.todayProgress
  const yesterdayProgress = swrData?.yesterdayProgress?.yesterdayProgress ?? initialData.yesterdayProgress
  const calendarData = swrData?.calendar?.calendarData ?? initialData.calendarData
  const weeklyProgress = swrData?.weeklyProgress?.progress ?? initialData.weeklyProgress
  const sessionNumber = swrData?.weeklyProgress?.sessionNumber ?? initialData.sessionNumber
  const reflectionCompleted = swrData?.reflection?.completed ?? initialData.reflectionCompleted
  const liveUpdates = swrData?.liveUpdates?.updates ?? initialData.liveUpdates
  const lastUpdateTime = swrData?.liveUpdates?.lastUpdateTime ?? initialData.lastUpdateTime
  const hasLiveUpdates = swrData?.liveUpdates?.hasUpdates ?? initialData.hasLiveUpdates

  // テーマカラーを取得（デフォルトは使わない）
  const themeColor = profile?.theme_color || swrData?.profile?.themeColor || "default"

  // AIコーチメッセージの開閉状態を管理（初期値は常に true でサーバーとクライアントを一致）
  const [isCoachMessageExpanded, setIsCoachMessageExpanded] = useState(true)
  const [isHydrated, setIsHydrated] = useState(false)

  // マウント後に localStorage から状態を復元
  useEffect(() => {
    setIsHydrated(true)
    const saved = localStorage.getItem('aiCoachMessageExpanded')
    if (saved !== null) {
      setIsCoachMessageExpanded(saved === 'true')
    }
  }, [])

  // 開閉状態をlocalStorageに保存（hydration 後のみ）
  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem('aiCoachMessageExpanded', String(isCoachMessageExpanded))
    }
  }, [isCoachMessageExpanded, isHydrated])

  // ページが表示状態になったときに応援履歴を再取得
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        try {
          const { getRecentEncouragementMessages } = await import("@/app/actions/encouragement")
          const result = await getRecentEncouragementMessages()
          if (result.success && Array.isArray(result.messages)) {
            setMessages(result.messages)
          }
        } catch (error) {
          console.error("Failed to refresh encouragement messages:", error)
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  // 🚀 SWR: recentMessagesをSWRデータと同期
  useEffect(() => {
    if (swrData?.recentMessages?.messages) {
      setMessages(swrData.recentMessages.messages)
    }
  }, [swrData?.recentMessages?.messages])

  const greetingMessage = getGreetingMessage(userName, lastLoginInfo)

  return (
    <>
      <UserProfileHeader />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 pb-20 elegant-fade-in">
        <PageHeader
          icon={Home}
          title="ホーム"
          subtitle={greetingMessage}
          variant="student"
        />

        <div className="max-w-screen-xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="space-y-8 lg:space-y-0">
          {/* スマホでの表示順序 */}
          <div className="lg:hidden space-y-8">
            <Card
              className="bg-gradient-to-br border shadow-xl backdrop-blur-sm transition-all duration-300"
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
                  className="flex items-center justify-between cursor-pointer group"
                  onClick={() => setIsCoachMessageExpanded(!isCoachMessageExpanded)}
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
                        AIコーチ
                      </CardTitle>
                      {!isCoachMessageExpanded && (
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
                    aria-label={isCoachMessageExpanded ? "メッセージを閉じる" : "メッセージを開く"}
                  >
                    {isCoachMessageExpanded ? (
                      <ChevronUp
                        className="h-5 w-5 transition-transform duration-300"
                        style={{ color: isThemeActive(themeColor) ? themeColor : '#0891b2' }}
                      />
                    ) : (
                      <ChevronDown
                        className="h-5 w-5 transition-transform duration-300"
                        style={{ color: isThemeActive(themeColor) ? themeColor : '#0891b2' }}
                      />
                    )}
                  </button>
                </div>
              </CardHeader>
              {isCoachMessageExpanded && (
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
                      {aiCoachMessage || "今日も一緒に頑張ろう！"}
                    </p>
                    {aiCoachMessageCreatedAt && (
                      <div className="text-right">
                        <span className="text-xs text-gray-400">作成: {formatDateTime(aiCoachMessageCreatedAt)}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>

            <TodayMissionCard todayProgress={todayProgress} yesterdayProgress={yesterdayProgress} reflectionCompleted={reflectionCompleted} weeklyProgress={weeklyProgress} />
            <StreakCard
              streak={studyStreak}
              maxStreak={maxStreak}
              lastStudyDate={lastStudyDate}
              todayStudied={todayStudied}
              streakState={streakState}
              themeColor={themeColor}
              totalDays={totalDays}
            />
            <LearningHistoryCalendar calendarData={calendarData} />
            <WeeklySubjectProgressCard weeklyProgress={weeklyProgress} sessionNumber={sessionNumber} />
            <RecentEncouragementCard messages={messages} />
            <RecentLearningHistoryCard logs={recentLogs} batchFeedbacks={batchFeedbacks} legacyFeedbacks={legacyFeedbacks} />
          </div>

          <div className="hidden lg:grid lg:grid-cols-3 lg:gap-8">
            {/* 左列（メイン - 2/3の幅） */}
            <div className="lg:col-span-2 space-y-8">
              <Card
                className="bg-gradient-to-br border shadow-xl backdrop-blur-sm transition-all duration-300"
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
                    className="flex items-center justify-between cursor-pointer group"
                    onClick={() => setIsCoachMessageExpanded(!isCoachMessageExpanded)}
                  >
                    <div className="flex items-center gap-4">
                      <Avatar
                        className="h-16 w-16 shadow-xl transition-all duration-300 group-hover:scale-105"
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
                        <CardTitle className="text-xl font-bold mb-1" style={{ color: isThemeActive(themeColor) ? themeColor : '#164e63' }}>
                          AIコーチ
                        </CardTitle>
                        {!isCoachMessageExpanded && (
                          <p className="text-sm text-gray-500">クリックして表示</p>
                        )}
                      </div>
                    </div>
                    <button
                      className="p-3 rounded-full transition-all duration-300 hover:scale-110"
                      style={{
                        backgroundColor: isThemeActive(themeColor)
                          ? hexWithAlpha(themeColor, 15)
                          : '#e0f2fe',
                      }}
                      aria-label={isCoachMessageExpanded ? "メッセージを閉じる" : "メッセージを開く"}
                    >
                      {isCoachMessageExpanded ? (
                        <ChevronUp
                          className="h-6 w-6 transition-transform duration-300"
                          style={{ color: isThemeActive(themeColor) ? themeColor : '#0891b2' }}
                        />
                      ) : (
                        <ChevronDown
                          className="h-6 w-6 transition-transform duration-300"
                          style={{ color: isThemeActive(themeColor) ? themeColor : '#0891b2' }}
                        />
                      )}
                    </button>
                  </div>
                </CardHeader>
                {isCoachMessageExpanded && (
                  <CardContent className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
                    <div
                      className="bg-white/95 backdrop-blur-sm rounded-2xl p-8 border shadow-2xl transition-all duration-300 relative"
                      style={
                        isThemeActive(themeColor)
                          ? { borderColor: hexWithAlpha(themeColor, 20) }
                          : {}
                      }
                    >
                      <p className="text-lg leading-relaxed text-slate-700 font-medium mb-6">
                        {aiCoachMessage || "今日も一緒に頑張ろう！"}
                      </p>
                      {aiCoachMessageCreatedAt && (
                        <div className="text-right">
                          <span className="text-xs text-gray-400">作成: {formatDateTime(aiCoachMessageCreatedAt)}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>

              <TodayMissionCard todayProgress={todayProgress} yesterdayProgress={yesterdayProgress} reflectionCompleted={reflectionCompleted} weeklyProgress={weeklyProgress} />
              <RecentEncouragementCard messages={messages} />
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
                totalDays={totalDays}
              />
              <LearningHistoryCalendar calendarData={calendarData} />
              <WeeklySubjectProgressCard weeklyProgress={weeklyProgress} sessionNumber={sessionNumber} />
            </div>
          </div>
        </div>
      </div>

      <BottomNavigation activeTab="home" />
      </div>
    </>
  )
}

/**
 * 生徒用ダッシュボードコンポーネント（Context Provider付き）
 */
export function StudentDashboardClient({ initialData }: { initialData: DashboardData }) {
  return (
    <UserProfileProvider>
      <StudentDashboardClientInner initialData={initialData} />
    </UserProfileProvider>
  )
}
