"use client"

import { useState, useEffect } from "react"
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

interface DashboardData {
  userName: string
  selectedAvatar: string
  aiCoachMessage: string
  aiCoachMessageCreatedAt: string | null
  studyStreak: number
  recentLogs: any[]
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
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = date.getHours()
  const minute = date.getMinutes()
  const ampm = hour < 12 ? "AM" : "PM"
  const hour12 = hour % 12 || 12
  return `${month}/${day} ${hour12}:${minute.toString().padStart(2, '0')}${ampm}`
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

  // データ取得範囲（6週間前まで）
  const today = new Date()
  const sixWeeksAgo = new Date(today)
  sixWeeksAgo.setDate(today.getDate() - 42)

  const goToPreviousMonth = () => {
    const newMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1)
    setSelectedMonth(newMonth)
  }

  const goToNextMonth = () => {
    const newMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1)
    setSelectedMonth(newMonth)
  }

  const goToToday = () => {
    setSelectedMonth(new Date())
  }

  // 前月・次月ボタンの有効/無効判定
  const canGoPrevious = () => {
    const prevMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1)
    const lastDayOfPrevMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 0)
    return lastDayOfPrevMonth >= sixWeeksAgo
  }

  const canGoNext = () => {
    const nextMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1)
    return nextMonth <= today
  }

  // 選択月がデータ範囲外かチェック
  const isOutOfRange = () => {
    const firstDayOfMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1)
    const lastDayOfMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0)
    return lastDayOfMonth < sixWeeksAgo || firstDayOfMonth > today
  }

  // 選択された月のカレンダーデータを生成
  const monthName = `${selectedMonth.getFullYear()}年${selectedMonth.getMonth() + 1}月`

  const weeks = []
  const firstDay = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1)
  const lastDay = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0)

  const startDate = new Date(firstDay)
  startDate.setDate(startDate.getDate() - firstDay.getDay())

  const endDate = new Date(lastDay)
  endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()))

  const currentDate = new Date(startDate)
  while (currentDate <= endDate) {
    const week = []
    for (let day = 0; day < 7; day++) {
      const dateStr = currentDate.toISOString().split("T")[0]
      const intensity = getLearningIntensity(dateStr, calendarData, criteriaMode)
      const isCurrentMonth = currentDate.getMonth() === selectedMonth.getMonth()

      week.push({
        date: dateStr,
        day: currentDate.getDate(),
        intensity: isCurrentMonth ? intensity : "none",
        data: calendarData[dateStr],
        isCurrentMonth,
      })

      currentDate.setDate(currentDate.getDate() + 1)
    }
    weeks.push(week)
  }

  const intensityColors = {
    none: "bg-slate-100 border-slate-200",
    light: "bg-blue-200 border-blue-300",
    medium: "bg-blue-400 border-blue-500",
    dark: "bg-primary border-primary",
  }

  const isCurrentMonth = selectedMonth.getFullYear() === today.getFullYear() && selectedMonth.getMonth() === today.getMonth()

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

const TodayMissionCard = ({ todayProgress, yesterdayProgress, reflectionCompleted }: { todayProgress: Array<{subject: string, accuracy: number, correctCount: number, totalProblems: number, logCount: number}>, yesterdayProgress: Array<{subject: string, accuracy: number, correctCount: number, totalProblems: number}>, reflectionCompleted: boolean }) => {
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
    if (weekday === 0) return "sunday" // 日曜日
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


    // 日曜日：リフレクト促進
    if (mode === "sunday") {
      // reflectionCompletedステータスを確認（propsから渡される想定）
      const isReflectCompleted = reflectionCompleted
      return {
        mode: "sunday",
        subjects: [],
        panels: [
          {
            name: "リフレクト",
            status: isReflectCompleted ? "完了" : "未完了",
            description: "週間振り返りを記録しよう",
            type: "reflect",
            needsAction: !isReflectCompleted,
            isCompleted: isReflectCompleted,
          },
        ],
        statusMessage: isReflectCompleted
          ? "今週の振り返りが完了しました！素晴らしいです！"
          : "今週の学習を振り返って、来週に向けて準備しよう！",
        completionStatus: isReflectCompleted ? "1/1入力完了" : "0/1入力完了",
        allCompleted: isReflectCompleted,
      }
    }

    // 土曜12時以降：特別モード
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

      // 新要件: 正答率80%以上は未入力でも完了扱い
      if (data.accuracy >= 80) {
        status = `進捗率${data.accuracy}%`
        isCompleted = true
        needsAction = false
      } else if (data.inputCount > 0) {
        // 入力済みだが80%未満
        status = `進捗率${data.accuracy}%`
        isCompleted = true
        needsAction = false
      } else {
        // 未入力かつ80%未満
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

    // 入力済み（完了 + 1回以上入力）をカウント
    const inputCompletedCount = panels.filter((p) => p.isCompleted || p.inputCount > 0).length
    const actionNeededCount = panels.filter((p) => p.needsAction).length

    // 全て入力済みの場合の判定
    const allCompleted = inputCompletedCount === panels.length

    // ミッション状況メッセージの生成
    let statusMessage = ""

    if (allCompleted) {
      // 全て入力完了 → 習得状況を伝える（習得率80%を促す）
      const notMasteredSubjects = panels.filter((p) => p.correctRate < 80)
      const masteredCount = panels.length - notMasteredSubjects.length

      if (notMasteredSubjects.length === 0) {
        // パーフェクトマスター（全科目80%以上）
        statusMessage = "🎉 パーフェクトマスターおめでとう！全科目で習得率80%以上達成！"
      } else if (notMasteredSubjects.length === 1) {
        // 1科目だけ80%未満 → その科目を具体的に促す
        const subject = notMasteredSubjects[0].subject
        statusMessage = `${subject}の見直しをして、パーフェクトマスターを目指そう！`
      } else {
        // 複数科目が80%未満 → 科目名を列挙
        const subjectList = notMasteredSubjects.map(p => p.subject).join("、")
        statusMessage = `${subjectList}の見直しをして、パーフェクトマスターを目指そう！`
      }
    } else {
      // 入力未完了 → 入力状況を伝える
      if (actionNeededCount === 1) {
        const remainingSubject = panels.find((p) => p.needsAction)?.subject
        statusMessage = `${inputCompletedCount}/${panels.length}入力完了！あと${remainingSubject}を入力したら、入力完了だね！`
      } else {
        statusMessage = `${inputCompletedCount}/${panels.length}入力完了！あと${actionNeededCount}科目入力して今日のミッション達成！`
      }
    }

    return {
      mode,
      subjects,
      panels,
      statusMessage,
      completionStatus: `${inputCompletedCount}/${panels.length}入力完了`,
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
    router.push("/student/reflect")
  }

  return (
    <Card className="bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 border-amber-200/60 shadow-xl">
      <CardHeader className="pb-4 bg-gradient-to-r from-amber-500/10 to-yellow-500/10 rounded-t-lg">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold flex items-center gap-3">
            <Home className="h-7 w-7 text-primary" />
            <span className="text-slate-800">{getModeTitle()}</span>
          </CardTitle>
          {missionData.completionStatus && (
            <Badge className="bg-primary text-primary-foreground border-primary font-bold text-base px-4 py-2 shadow-md">
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
                  {panel.correctRate && (
                    <p className="text-sm text-slate-600 mt-1">現在の正答率: {panel.correctRate}%</p>
                  )}
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
                        ? "bg-blue-500 text-white hover:bg-blue-600 shadow-lg hover:scale-105"
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
                      <Badge
                        className={`text-xs px-2 py-1 border ${getStatusBadgeColor(panel.status, panel.needsAction)}`}
                      >
                        {panel.status}
                      </Badge>
                    </div>

                    {/* Live Progress Display */}
                    {hasInput && panel.correctRate > 0 && (
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`text-lg font-bold ${getAccuracyColor(panel.correctRate)}`}>
                          {panel.correctRate}%
                        </span>

                        {/* Diff badge with CSS animation */}
                        {diff !== null && Math.abs(diff) >= 10 && (
                          <div
                            className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${
                              diff >= 10
                                ? "bg-green-100 text-green-700 animate-bounce-in"
                                : "bg-orange-100 text-orange-700"
                            }`}
                            style={{
                              animation: diff >= 10 ? "bounceIn 0.6s ease-out" : "none"
                            }}
                          >
                            {diff >= 10 ? "↑" : "↓"}{Math.abs(Math.round(diff))}%
                          </div>
                        )}

                        {/* Emoji feedback with fade-in animation */}
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
                      className={`w-full py-3 px-4 rounded-lg text-sm font-bold transition-all duration-300 ${
                        panel.needsAction
                          ? "bg-primary text-white hover:bg-primary/90 shadow-lg hover:scale-105 ring-2 ring-primary/30"
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

const RecentLearningHistoryCard = ({ logs }: { logs: any[] }) => {
  const [showAll, setShowAll] = useState(false)

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "記録日時不明"

    const date = new Date(dateStr)
    if (Number.isNaN(date.getTime())) return "記録日時不明"

    // デバッグ: UTCと変換後の時刻を確認
    console.log('formatDate debug:', {
      input: dateStr,
      utcDate: date.toISOString(),
      localDate: date.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }),
      getHours: date.getHours(),
      getMinutes: date.getMinutes()
    })

    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const logDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())

    if (logDate.getTime() === today.getTime()) {
      return `今日 ${date.getHours()}:${String(date.getMinutes()).padStart(2, "0")}`
    } else if (logDate.getTime() === yesterday.getTime()) {
      return `昨日 ${date.getHours()}:${String(date.getMinutes()).padStart(2, "0")}`
    } else {
      return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, "0")}`
    }
  }

  const safeLogs = Array.isArray(logs) ? logs : []

  const recentHistory = safeLogs.map((log) => {
    // Use logged_at for displaying the exact time the log was recorded
    const loggedAt = log.logged_at

    // 学習回の表示を「第N回(M/D〜M/D)」形式にフォーマット
    let sessionDisplay = ""
    if (log.study_sessions) {
      const sessionNum = log.study_sessions.session_number || log.session_id || 0
      if (log.study_sessions.start_date && log.study_sessions.end_date) {
        const startDate = new Date(log.study_sessions.start_date)
        const endDate = new Date(log.study_sessions.end_date)
        const startStr = `${startDate.getMonth() + 1}/${startDate.getDate()}`
        const endStr = `${endDate.getMonth() + 1}/${endDate.getDate()}`
        sessionDisplay = `第${sessionNum}回(${startStr}〜${endStr})`
      } else {
        sessionDisplay = `第${sessionNum}回`
      }
    } else {
      sessionDisplay = `第${log.session_id || 0}回`
    }

    return {
      id: log.id,
      studentRecordTime: formatDate(loggedAt),
      session: sessionDisplay,
      subject: log.subjects?.name || "",
      content: log.study_content_types?.content_name || "",
      correctAnswers: log.correct_count || 0,
      totalQuestions: log.total_problems || 0,
      accuracy: log.total_problems > 0 ? Math.round((log.correct_count / log.total_problems) * 100) : 0,
      previousAccuracy: null, // FUTURE: 前回の正答率取得（Phase 1後の機能拡張予定）
      reflection: log.reflection_text || "",
    }
  })

  const displayedLogs = showAll ? recentHistory : recentHistory.slice(0, 5)

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
        {recentHistory.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-600">まだ学習記録がありません</p>
            <p className="text-sm text-slate-500 mt-2">スパーク機能で学習を記録しましょう！</p>
          </div>
        ) : (
          <>
            {displayedLogs.map((item) => (
            <div
              key={item.id}
              className="bg-white/90 backdrop-blur-sm rounded-xl p-5 border border-green-100 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    <Badge className={`text-sm px-3 py-1 border font-medium ${getSubjectColor(item.subject)}`}>
                      {item.subject}
                    </Badge>
                    <span className="text-sm text-slate-600 bg-slate-100 px-3 py-1 rounded-full font-medium">
                      {item.studentRecordTime}
                    </span>
                    <Badge variant="outline" className="text-sm px-3 py-1 border-slate-300 bg-white">
                      {item.session}
                    </Badge>
                  </div>
                  <Badge className={`text-sm px-3 py-2 border font-bold ${getAccuracyColor(item.accuracy)}`}>
                    {item.accuracy}%
                  </Badge>
                </div>

                <div className="space-y-3">
                  <p className="font-bold text-slate-800 text-lg">{item.content}</p>
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <span className="text-base text-slate-700">
                      正答数:{" "}
                      <span className="font-bold text-slate-800">
                        {item.correctAnswers}/{item.totalQuestions}問
                      </span>
                    </span>
                    {item.previousAccuracy !== null && (
                      <div className="flex items-center gap-1">
                        {(() => {
                          const improvement = getImprovementDisplay(item.accuracy, item.previousAccuracy)
                          return improvement ? (
                            <span
                              className={`text-sm font-bold ${improvement.color} bg-white px-3 py-1 rounded-full border shadow-sm`}
                            >
                              {improvement.icon} {improvement.text}
                            </span>
                          ) : null
                        })()}
                      </div>
                    )}
                  </div>
                  {item.reflection && (
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                      <p className="text-sm text-blue-800 leading-relaxed">
                        <span className="font-semibold">今日の振り返り:</span> {item.reflection}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            ))}
            {recentHistory.length > 5 && (
              <div className="flex justify-center pt-2">
                <Button
                  variant="outline"
                  onClick={() => setShowAll(!showAll)}
                  className="w-full max-w-xs bg-white hover:bg-green-50 text-green-700 border-green-300 font-medium"
                >
                  {showAll ? "閉じる" : `もっと見る (残り${recentHistory.length - 5}件)`}
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

    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const logDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())

    if (logDate.getTime() === today.getTime()) {
      return `今日 ${date.getHours()}:${String(date.getMinutes()).padStart(2, "0")}`
    } else if (logDate.getTime() === yesterday.getTime()) {
      return `昨日 ${date.getHours()}:${String(date.getMinutes()).padStart(2, "0")}`
    } else {
      return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, "0")}`
    }
  }

  const safeMessages = Array.isArray(messages) ? messages : []

  const encouragementMessages = safeMessages.map((msg) => {
    const senderProfile = msg.sender_profile
    const baseMessage = msg.message || ""
    const studyLog = msg.study_logs

    // アバターの処理：送信者プロフィールから取得
    // avatar_urlが設定されている場合はそれを使用、なければsender_roleに基づいたデフォルトアバターを取得
    const avatarUrl = senderProfile?.avatar_url
      ? getAvatarSrc(senderProfile.avatar_url)
      : getAvatarSrc(msg.sender_role === "parent" ? "parent1" : msg.sender_role === "coach" ? "coach" : undefined)

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
      from: senderProfile?.display_name || "応援者",
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
              onClick={() => (window.location.href = "/student/encouragement")}
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

  const {
    userName,
    selectedAvatar,
    aiCoachMessage,
    aiCoachMessageCreatedAt,
    studyStreak,
    recentLogs,
    lastLoginInfo,
    todayProgress,
    calendarData,
    weeklyProgress,
    sessionNumber,
    reflectionCompleted,
    liveUpdates,
    lastUpdateTime,
    hasLiveUpdates,
  } = initialData

  // テーマカラーを取得（デフォルトは使わない）
  const themeColor = profile?.theme_color || "default"

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
          actions={
            <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm px-3 py-2 rounded-lg border border-border/30 shadow-sm">
              <div
                className={`flex items-center gap-2 ${!isThemeActive(themeColor) ? "text-primary" : ""}`}
                style={isThemeActive(themeColor) ? { color: themeColor } : {}}
              >
                <div
                  className={!isThemeActive(themeColor) ? "p-1.5 bg-primary/10 rounded-full" : "p-1.5 rounded-full"}
                  style={isThemeActive(themeColor) ? { backgroundColor: hexWithAlpha(themeColor, 10) } : {}}
                >
                  <Flame className="h-5 w-5" />
                </div>
                <span className="font-bold text-2xl">{studyStreak}</span>
              </div>
              <span className="text-xs text-muted-foreground font-semibold">連続学習日数</span>
            </div>
          }
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

            <TodayMissionCard todayProgress={todayProgress} yesterdayProgress={initialData.yesterdayProgress} reflectionCompleted={reflectionCompleted} />
            <LearningHistoryCalendar calendarData={calendarData} />
            <WeeklySubjectProgressCard weeklyProgress={weeklyProgress} sessionNumber={sessionNumber} />
            <RecentEncouragementCard messages={messages} />
            <RecentLearningHistoryCard logs={recentLogs} />
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

              <TodayMissionCard todayProgress={todayProgress} yesterdayProgress={initialData.yesterdayProgress} reflectionCompleted={reflectionCompleted} />
              <RecentEncouragementCard messages={messages} />
              <RecentLearningHistoryCard logs={recentLogs} />
            </div>

            {/* 右列（サブ - 1/3の幅） */}
            <div className="lg:col-span-1 space-y-8">
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
