"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { BottomNavigation } from "@/components/bottom-navigation"
import { Flame, Calendar, Home, Flag, MessageCircle, BarChart3, Clock, Heart } from "lucide-react"

const mockData = {
  user: {
    name: "太郎",
    avatar: "student1",
    streak: 7,
    weeklyTotal: 5,
  },
  aiCoachMessage: {
    message:
      "太郎さん、今日もStudySparkを開いてくれてありがとう！7日連続の学習、本当に素晴らしいです。君の頑張りをいつも見守っています。今日も一歩ずつ、自分のペースで進んでいきましょう。",
    timeBasedGreeting: "",
  },
  encouragementMessages: [
    { date: "今日", from: "お母さん", message: "算数がんばったね！明日もファイト！", avatar: "parent1" },
    { date: "昨日", from: "田中先生", message: "理科の実験問題、よくできていました", avatar: "coach" },
  ],
  friends: [
    { name: "花子", status: "学習中", subject: "算数", avatar: "student2" },
    { name: "次郎", status: "完了", todayScore: 85, avatar: "student3" },
  ],
}

function getGreetingMessage(userName: string, streak: number) {
  if (streak === 1) {
    return `はじめまして、${userName}さん`
  }

  const lastLoginDays = 0
  if (lastLoginDays > 7) {
    return `お久しぶり、${userName}さん`
  }

  return `おかえりなさい、${userName}さん`
}

const getAvatarSrc = (avatarId: string) => {
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
  return avatarMap[avatarId] || avatarMap["student1"]
}

const generateLearningHistory = () => {
  const history: { [key: string]: { subjects: string[]; understandingLevels: string[] } } = {}
  const today = new Date()

  for (let i = 0; i < 30; i++) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split("T")[0]

    if (Math.random() > 0.3) {
      const subjectCount = Math.floor(Math.random() * 4) + 1
      const subjects = ["算数", "国語", "理科", "社会"].slice(0, subjectCount)
      const understandingLevels = subjects.map(() => {
        const levels = ["😄バッチリ理解", "😊できた", "😐ふつう", "😟ちょっと不安", "😥むずかしかった"]
        return levels[Math.floor(Math.random() * levels.length)]
      })

      history[dateStr] = { subjects, understandingLevels }
    }
  }

  return history
}

const learningHistory = generateLearningHistory()

const getLearningIntensity = (date: string) => {
  const data = learningHistory[date]
  if (!data || data.subjects.length === 0) return "none"

  if (data.subjects.length === 1) return "light"

  if (data.subjects.length >= 2) {
    const goodLevels = ["😄バッチリ理解", "😊できた"]
    const normalOrBetter = ["😄バッチリ理解", "😊できた", "😐ふつう"]

    const allGoodOrBetter = data.understandingLevels.every((level) => goodLevels.includes(level))
    const allNormalOrBetter = data.understandingLevels.every((level) => normalOrBetter.includes(level))

    if (allGoodOrBetter) return "dark"
    if (allNormalOrBetter) return "medium"
  }

  return "light"
}

const LearningHistoryCalendar = () => {
  const today = new Date()
  const monthsData: { [key: string]: any } = {}

  for (let monthOffset = 1; monthOffset >= 0; monthOffset--) {
    const targetMonth = new Date(today.getFullYear(), today.getMonth() - monthOffset, 1)
    const monthKey = `${targetMonth.getFullYear()}-${String(targetMonth.getMonth() + 1).padStart(2, "0")}`
    const monthName = `${targetMonth.getMonth() + 1}月`

    const weeks = []
    const firstDay = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 1)
    const lastDay = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0)

    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - firstDay.getDay())

    const endDate = new Date(lastDay)
    endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()))

    const currentDate = new Date(startDate)
    while (currentDate <= endDate) {
      const week = []
      for (let day = 0; day < 7; day++) {
        const dateStr = currentDate.toISOString().split("T")[0]
        const intensity = getLearningIntensity(dateStr)
        const isCurrentMonth = currentDate.getMonth() === targetMonth.getMonth()

        week.push({
          date: dateStr,
          day: currentDate.getDate(),
          intensity: isCurrentMonth ? intensity : "none",
          data: learningHistory[dateStr],
          isCurrentMonth,
        })

        currentDate.setDate(currentDate.getDate() + 1)
      }
      weeks.push(week)
    }

    monthsData[monthKey] = { weeks, monthName }
  }

  const intensityColors = {
    none: "bg-slate-100 border-slate-200",
    light: "bg-blue-200 border-blue-300",
    medium: "bg-blue-400 border-blue-500",
    dark: "bg-primary border-primary",
  }

  return (
    <Card className="bg-gradient-to-br from-blue-50 to-primary/10 border-primary/20 shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <Calendar className="h-6 w-6 text-primary" />
          学習カレンダー
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 sm:px-6">
        <div className="space-y-3 sm:space-y-4">
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {["月", "火", "水", "木", "金", "土", "日"].map((day) => (
              <div
                key={day}
                className="text-sm font-semibold text-center text-slate-700 py-1 w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center"
              >
                {day}
              </div>
            ))}
          </div>

          {Object.entries(monthsData).map(([monthKey, monthData]) => (
            <div key={monthKey} className="space-y-2">
              <div className="text-base font-bold text-slate-800 text-left border-b border-slate-300 pb-2">
                {monthData.monthName}
              </div>

              {monthData.weeks.map((week: any[], weekIndex: number) => (
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
                          ? `${day.date}: ${day.data.subjects.join(", ")} (${day.data.understandingLevels.join(", ")})`
                          : `${day.date}: 学習記録なし`
                      }
                    />
                  ))}
                </div>
              ))}
            </div>
          ))}

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

const TodayMissionCard = () => {
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
    if ([1, 3, 5].includes(weekday)) return "input" // 月・水・金：入力促進モード
    if ([2, 4, 6].includes(weekday)) return "review" // 火・木・土：復習促進モード
    return "input"
  }

  // モックデータ：実際の実装では外部データソースから取得
  const getWeeklySubjectData = () => ({
    算数: { inputCount: 2, correctRate: 75, needsReview: true, sessions: [{ rate: 65 }, { rate: 75 }] },
    国語: { inputCount: 1, correctRate: 85, needsReview: false, sessions: [{ rate: 85 }] },
    理科: { inputCount: 0, correctRate: 0, needsReview: true, sessions: [] },
    社会: { inputCount: 1, correctRate: 60, needsReview: true, sessions: [{ rate: 60 }] },
  })

  const getMissionData = (weekday: number, hour: number) => {
    const mode = getMissionMode(weekday, hour)
    const subjects = getSubjectBlock(weekday)
    const weeklySubjectData = getWeeklySubjectData()

    // 日曜日：リフレクト促進
    if (mode === "sunday") {
      return {
        mode: "sunday",
        subjects: [],
        panels: [
          {
            name: "リフレクト",
            status: "未完了",
            description: "週間振り返りを記録しよう",
            type: "reflect",
            needsAction: true,
          },
        ],
        statusMessage: "今週の学習を振り返って、来週に向けて準備しよう！",
        completionStatus: "0/1完了",
      }
    }

    // 土曜12時以降：特別モード
    if (mode === "special") {
      const lowAccuracySubjects = Object.entries(weeklySubjectData)
        .filter(([_, data]) => data.correctRate < 80 && data.inputCount > 0)
        .slice(0, 2)
        .map(([subject, data]) => ({
          subject,
          correctRate: data.correctRate,
          needsAction: true,
          type: "review",
        }))

      const panels = [
        {
          name: "リフレクト",
          status: "未完了",
          description: "週間振り返り",
          type: "reflect",
          needsAction: true,
        },
        ...lowAccuracySubjects.map((item) => ({
          subject: item.subject,
          correctRate: item.correctRate,
          status: `進捗率${item.correctRate}%`,
          needsAction: item.needsAction,
          type: "review",
        })),
      ]

      const completedCount = panels.filter((p) => !p.needsAction).length

      return {
        mode: "special",
        subjects: lowAccuracySubjects.map((item) => item.subject),
        panels,
        statusMessage: "週間振り返りと復習で今週を締めくくろう！",
        completionStatus: `${completedCount}/${panels.length}完了`,
      }
    }

    // 通常モード（入力促進・復習促進）
    const panels = subjects.map((subject) => {
      const data = weeklySubjectData[subject as keyof typeof weeklySubjectData]
      let status = "未入力"
      let needsAction = false
      let isCompleted = false

      if (mode === "input") {
        // 入力促進モード：記録されたら完了
        if (data.inputCount > 0) {
          status = `進捗率${data.correctRate}%`
          isCompleted = true
        } else {
          needsAction = true
        }
      } else if (mode === "review") {
        // 復習促進モード：再入力して正答率向上で完了
        if (data.inputCount > 0) {
          status = `進捗率${data.correctRate}%`
        }
        if (data.inputCount === 1 && data.correctRate < 80) {
          needsAction = true
        } else if (data.inputCount > 1) {
          isCompleted = true
        }
      }

      return {
        subject,
        status,
        needsAction,
        isCompleted,
        correctRate: data.correctRate,
        inputCount: data.inputCount,
      }
    })

    const completedCount = panels.filter((p) => p.isCompleted).length
    const actionNeededCount = panels.filter((p) => p.needsAction).length

    // 全て完了した場合の判定
    const allCompleted = completedCount === panels.length

    let statusMessage = ""
    if (allCompleted) {
      statusMessage = mode === "input" ? "全て入力完了！素晴らしいです！" : "全て復習完了！今日もよく頑張りました！"
    } else if (actionNeededCount === 1) {
      const remainingSubject = panels.find((p) => p.needsAction)?.subject
      statusMessage =
        mode === "input"
          ? `あと${remainingSubject}だけ入力すれば完了だよ！`
          : `あと${remainingSubject}だけ復習すれば完了だよ！`
    } else {
      statusMessage =
        mode === "input"
          ? `あと${actionNeededCount}科目入力して今日のミッション達成！`
          : `あと${actionNeededCount}科目復習して今日のミッション達成！`
    }

    return {
      mode,
      subjects,
      panels,
      statusMessage,
      completionStatus: `${completedCount}/${panels.length}完了`,
      allCompleted,
    }
  }

  const todayWeekday = getTodayWeekday()
  const currentHour = getCurrentHour()
  const missionData = getMissionData(todayWeekday, currentHour)

  const getSubjectColor = (subject: string) => {
    const colors = {
      算数: "border-l-4 border-l-blue-500 bg-blue-50/80",
      国語: "border-l-4 border-l-emerald-500 bg-emerald-50/80",
      理科: "border-l-4 border-l-purple-500 bg-purple-50/80",
      社会: "border-l-4 border-l-red-500 bg-red-50/80",
    }
    return colors[subject as keyof typeof colors] || "border-l-4 border-l-slate-400 bg-slate-50/80"
  }

  const getStatusBadgeColor = (status: string, needsAction: boolean) => {
    if (status === "未入力") {
      return needsAction
        ? "bg-red-100 text-red-800 border-red-200 font-bold animate-pulse"
        : "bg-slate-100 text-slate-700 border-slate-300"
    }
    if (status.includes("進捗率")) {
      const rate = Number.parseInt(status.match(/\d+/)?.[0] || "0")
      if (rate >= 80) return "bg-green-100 text-green-800 border-green-200 font-bold"
      if (rate >= 60) return "bg-yellow-100 text-yellow-800 border-yellow-200"
      return "bg-red-100 text-red-800 border-red-200"
    }
    if (status === "完了") return "bg-green-100 text-green-800 border-green-200 font-bold"
    return "bg-slate-100 text-slate-700 border-slate-300"
  }

  const getModeTitle = () => {
    const titles = {
      sunday: "今日のミッション！",
      special: "今日のミッション！",
      input: "今日のミッション！",
      review: "今日のミッション！",
    }
    return titles[missionData.mode as keyof typeof titles] || "今日のミッション！"
  }

  const handleSparkNavigation = (subject?: string) => {
    console.log(`Navigate to spark for subject: ${subject || "general"}`)
    // 実際の実装では、スパーク機能への遷移を行う
  }

  const handleReflectNavigation = () => {
    console.log("Navigate to reflect")
    // 実際の実装では、リフレクト機能への遷移を行う
  }

  return (
    <Card className="bg-gradient-to-br from-primary/8 to-accent/8 border-primary/30 shadow-xl">
      <CardHeader className="pb-4">
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
        {/* 完了パネル表示 */}
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
                        ? "bg-primary text-white hover:bg-primary/90 shadow-lg hover:scale-105"
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
              {missionData.panels.map((panel: any, index: number) => (
                <div
                  key={index}
                  className={`p-4 rounded-xl border-2 shadow-sm transition-all duration-300 hover:shadow-md ${getSubjectColor(panel.subject)} ${
                    panel.needsAction ? "ring-2 ring-primary/50 animate-pulse" : ""
                  }`}
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
                    <Button
                      onClick={() => handleSparkNavigation(panel.subject)}
                      className={`w-full py-3 px-4 rounded-lg text-sm font-bold transition-all duration-300 ${
                        panel.needsAction
                          ? "bg-primary text-white hover:bg-primary/90 shadow-lg hover:scale-105"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      今すぐ記録する
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* ミッション状況表示 */}
            <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 border-2 border-primary/20 shadow-lg">
              <div className="text-center">
                <div className="mb-4">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-3">
                    <Flag className="h-8 w-8 text-primary" />
                  </div>
                </div>
                <h3 className="font-bold text-lg text-slate-800 mb-2">ミッション状況</h3>
                <p className="text-base text-slate-700 leading-relaxed">{missionData.statusMessage}</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

const WeeklySubjectProgressCard = () => {
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null)

  const subjectProgress = [
    {
      subject: "算数",
      status: "進行中",
      correctAnswers: 32,
      totalQuestions: 50,
      progressRate: 64,
      color: "blue",
      details: [
        { content: "実験", remaining: 8 },
        { content: "暗記", remaining: 7 },
      ],
    },
    {
      subject: "国語",
      status: "あと少し",
      correctAnswers: 28,
      totalQuestions: 35,
      progressRate: 80,
      color: "yellow",
      details: [
        { content: "読解", remaining: 3 },
        { content: "漢字", remaining: 4 },
      ],
    },
    {
      subject: "理科",
      status: "未着手",
      correctAnswers: 15,
      totalQuestions: 30,
      progressRate: 50,
      color: "gray",
      details: [
        { content: "実験", remaining: 8 },
        { content: "暗記", remaining: 7 },
      ],
    },
    {
      subject: "社会",
      status: "達成",
      correctAnswers: 25,
      totalQuestions: 25,
      progressRate: 100,
      color: "green",
      details: [],
    },
  ]

  const getStatusColor = (status: string) => {
    const colors = {
      進行中: "bg-blue-100 text-blue-800 border-blue-200",
      あと少し: "bg-yellow-100 text-yellow-800 border-yellow-200",
      未着手: "bg-gray-100 text-gray-800 border-gray-200",
      達成: "bg-green-100 text-green-800 border-green-200",
    }
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800"
  }

  const getProgressColor = (color: string) => {
    const colors = {
      blue: "bg-blue-500",
      yellow: "bg-yellow-500",
      gray: "bg-gray-400",
      green: "bg-green-500",
    }
    return colors[color as keyof typeof colors] || "bg-gray-400"
  }

  const getProgressBgColor = (color: string) => {
    const colors = {
      blue: "bg-blue-100",
      yellow: "bg-yellow-100",
      gray: "bg-gray-100",
      green: "bg-green-100",
    }
    return colors[color as keyof typeof colors] || "bg-gray-100"
  }

  return (
    <Card className="bg-gradient-to-br from-purple-50 to-blue-50 border-purple/20 shadow-lg">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-purple-600" />
          今週の進捗
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {subjectProgress.map((subject, index) => (
          <div key={index} className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="font-bold text-lg text-slate-800">{subject.subject}</span>
                <Badge className={`text-xs px-2 py-1 border ${getStatusColor(subject.status)}`}>{subject.status}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-600">
                  {subject.correctAnswers}/{subject.totalQuestions}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpandedSubject(expandedSubject === subject.subject ? null : subject.subject)}
                  className="text-blue-600 hover:text-blue-800 p-1"
                >
                  詳細
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <div className={`w-full h-3 rounded-full ${getProgressBgColor(subject.color)}`}>
                <div
                  className={`h-3 rounded-full transition-all duration-500 ${getProgressColor(subject.color)}`}
                  style={{ width: `${subject.progressRate}%` }}
                />
              </div>
            </div>

            {expandedSubject === subject.subject && subject.details.length > 0 && (
              <div className="bg-white/80 rounded-lg p-4 border border-slate-200 space-y-2">
                <h4 className="font-medium text-slate-700 mb-2">内容別残数</h4>
                {subject.details.map((detail, detailIndex) => (
                  <div key={detailIndex} className="flex justify-between items-center text-sm">
                    <span className="text-slate-600">{detail.content}</span>
                    <span className="font-medium text-slate-800">{detail.remaining}問</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

const RecentLearningHistoryCard = () => {
  const recentHistory = [
    {
      date: "今日 14:30",
      session: 2,
      subject: "算数",
      content: "分数の計算",
      correctAnswers: 8,
      totalQuestions: 10,
      accuracy: 80,
      previousAccuracy: 65, // 1回目の正答率
      isImprovement: true,
    },
    {
      date: "今日 10:15",
      session: 1,
      subject: "国語",
      content: "漢字の読み書き",
      correctAnswers: 9,
      totalQuestions: 10,
      accuracy: 90,
      previousAccuracy: null, // 初回記録
      isImprovement: false,
    },
    {
      date: "昨日 16:45",
      session: 3,
      subject: "理科",
      content: "植物の観察",
      correctAnswers: 7,
      totalQuestions: 10,
      accuracy: 70,
      previousAccuracy: 45, // 2回目の正答率
      isImprovement: true,
    },
    {
      date: "昨日 09:20",
      session: 1,
      subject: "社会",
      content: "地理の基礎",
      correctAnswers: 6,
      totalQuestions: 10,
      accuracy: 60,
      previousAccuracy: null, // 初回記録
      isImprovement: false,
    },
  ]

  const getSubjectColor = (subject: string) => {
    const colors = {
      算数: "text-blue-600 bg-blue-50 border-blue-200",
      国語: "text-emerald-600 bg-emerald-50 border-emerald-200",
      理科: "text-purple-600 bg-purple-50 border-purple-200",
      社会: "text-red-600 bg-red-50 border-red-200",
    }
    return colors[subject as keyof typeof colors] || "text-slate-600 bg-slate-50 border-slate-200"
  }

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 80) return "text-green-600 bg-green-50 border-green-200"
    if (accuracy >= 60) return "text-yellow-600 bg-yellow-50 border-yellow-200"
    return "text-red-600 bg-red-50 border-red-200"
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
    <Card className="bg-gradient-to-br from-green-50 to-blue-50 border-green/20 shadow-lg">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <Clock className="h-6 w-6 text-green-600" />
          直近の学習履歴
        </CardTitle>
        <p className="text-sm text-slate-600">昨日0:00〜今日23:59のスパーク機能記録</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {recentHistory.map((item, index) => (
          <div key={index} className="bg-white/80 rounded-lg p-4 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge className={`text-xs px-2 py-1 border ${getSubjectColor(item.subject)}`}>{item.subject}</Badge>
                <span className="text-sm text-slate-600">{item.date}</span>
                <Badge variant="outline" className="text-xs px-2 py-1">
                  {item.session}回目
                </Badge>
              </div>
              <Badge className={`text-xs px-2 py-1 border ${getAccuracyColor(item.accuracy)}`}>{item.accuracy}%</Badge>
            </div>
            <div className="space-y-2">
              <p className="font-medium text-slate-800">{item.content}</p>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">
                  正答数: {item.correctAnswers}/{item.totalQuestions}問
                </span>
                {item.previousAccuracy !== null && (
                  <div className="flex items-center gap-1">
                    {(() => {
                      const improvement = getImprovementDisplay(item.accuracy, item.previousAccuracy)
                      return improvement ? (
                        <span className={`text-xs font-medium ${improvement.color}`}>
                          {improvement.icon} {improvement.text}
                        </span>
                      ) : null
                    })()}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

const RecentEncouragementCard = () => {
  const encouragementMessages = [
    {
      date: "今日 15:20",
      from: "お母さん",
      avatar: "parent1",
      message: "算数がんばったね！明日もファイト！",
      learningDetails: {
        session: 2,
        subject: "算数",
        content: "分数の計算",
        correctAnswers: 8,
        totalQuestions: 10,
        accuracy: 80,
        previousAccuracy: 65,
      },
    },
    {
      date: "今日 11:30",
      from: "田中先生",
      avatar: "coach",
      message: "国語の漢字、きれいに書けていますね！",
      learningDetails: {
        session: 1,
        subject: "国語",
        content: "漢字の読み書き",
        correctAnswers: 9,
        totalQuestions: 10,
        accuracy: 90,
        previousAccuracy: null,
      },
    },
    {
      date: "昨日 17:10",
      from: "田中先生",
      avatar: "coach",
      message: "理科の実験問題、よくできていました",
      learningDetails: {
        session: 3,
        subject: "理科",
        content: "植物の観察",
        correctAnswers: 7,
        totalQuestions: 10,
        accuracy: 70,
        previousAccuracy: 45,
      },
    },
    {
      date: "昨日 10:45",
      from: "お父さん",
      avatar: "parent2",
      message: "毎日コツコツ続けてえらいね",
      learningDetails: {
        session: 1,
        subject: "社会",
        content: "地理の基礎",
        correctAnswers: 6,
        totalQuestions: 10,
        accuracy: 60,
        previousAccuracy: null,
      },
    },
  ]

  const getSubjectColor = (subject: string) => {
    const colors = {
      算数: "text-blue-600 bg-blue-50",
      国語: "text-emerald-600 bg-emerald-50",
      理科: "text-purple-600 bg-purple-50",
      社会: "text-red-600 bg-red-50",
    }
    return colors[subject as keyof typeof colors] || "text-slate-600 bg-slate-50"
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
    <Card className="bg-gradient-to-br from-pink-50 to-red-50 border-pink/20 shadow-lg">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <Heart className="h-6 w-6 text-pink-600" />
          直近の応援履歴
        </CardTitle>
        <p className="text-sm text-slate-600">昨日0:00〜今日23:59の保護者・指導者からの応援</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {encouragementMessages.map((message, index) => (
          <div key={index} className="bg-white/80 rounded-lg p-4 border border-slate-200 space-y-3">
            <div className="flex items-start gap-3">
              <Avatar className="h-10 w-10 border-2 border-pink-200 flex-shrink-0">
                <AvatarImage src={getAvatarSrc(message.avatar) || "/placeholder.svg"} alt={message.from} />
                <AvatarFallback className="bg-pink-100 text-pink-600 font-bold">
                  {message.from.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-800">{message.from}</span>
                  <span className="text-sm text-slate-500">{message.date}</span>
                  <Heart className="h-4 w-4 text-pink-500" />
                </div>
                <p className="text-sm text-slate-700 leading-relaxed bg-pink-50/50 p-2 rounded-lg">{message.message}</p>

                {/* 学習詳細情報 */}
                <div className="bg-slate-50 rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge className={`text-xs px-2 py-1 ${getSubjectColor(message.learningDetails.subject)}`}>
                      {message.learningDetails.subject}
                    </Badge>
                    <Badge variant="outline" className="text-xs px-2 py-1">
                      {message.learningDetails.session}回目
                    </Badge>
                    <span className="text-xs text-slate-600">{message.learningDetails.accuracy}%</span>
                  </div>
                  <div className="text-sm space-y-1">
                    <p className="font-medium text-slate-700">{message.learningDetails.content}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">
                        正答数: {message.learningDetails.correctAnswers}/{message.learningDetails.totalQuestions}問
                      </span>
                      {message.learningDetails.previousAccuracy !== null && (
                        <div className="flex items-center gap-1">
                          {(() => {
                            const improvement = getImprovementDisplay(
                              message.learningDetails.accuracy,
                              message.learningDetails.previousAccuracy,
                            )
                            return improvement ? (
                              <span className={`text-xs font-medium ${improvement.color}`}>
                                {improvement.icon} {improvement.text}
                              </span>
                            ) : null
                          })()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

export default function StudentDashboard() {
  const [userName, setUserName] = useState("")
  const [selectedAvatar, setSelectedAvatar] = useState("")

  useEffect(() => {
    const name = localStorage.getItem("userName") || "学習者"
    const avatar = localStorage.getItem("selectedAvatar") || "student1"
    setUserName(name)
    setSelectedAvatar(avatar)
  }, [])

  const greetingMessage = getGreetingMessage(userName, mockData.user.streak)

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 pb-20">
      {/* ヘッダー */}
      <div className="bg-card/90 backdrop-blur-sm border-b border-border/60 p-6 shadow-sm">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14 border-3 border-primary/30 shadow-lg">
              <AvatarImage src={getAvatarSrc(selectedAvatar) || "/placeholder.svg"} alt={userName} />
              <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">
                {userName.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{greetingMessage}</h1>
              <p className="text-base text-muted-foreground mt-1">今日も一緒にがんばろう！</p>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2 text-primary">
              <Flame className="h-6 w-6" />
              <span className="font-bold text-2xl">{mockData.user.streak}</span>
            </div>
            <p className="text-sm text-muted-foreground font-medium">連続学習日数</p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6 space-y-8">
        {/* スマホ: 1列表示, タブレット・PC: 2列表示 */}
        <div className="space-y-8 lg:space-y-0">
          {/* スマホでの表示順序 */}
          <div className="lg:hidden space-y-8">
            {/* 1. AIコーチからのメッセージ */}
            <Card className="ai-coach-gradient border-0 shadow-2xl ai-coach-glow">
              <CardHeader className="pb-6">
                <CardTitle className="text-xl font-bold flex items-center gap-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-14 w-14 border-3 border-white/40 shadow-xl">
                      <AvatarImage src={getAvatarSrc("ai_coach") || "/placeholder.svg"} alt="AIコーチ" />
                      <AvatarFallback className="bg-white/20 text-white font-bold text-lg">AI</AvatarFallback>
                    </Avatar>
                    <span className="text-slate-900 font-bold text-xl bg-white/95 px-4 py-2 rounded-xl shadow-lg">
                      AIコーチからのメッセージ
                    </span>
                  </div>
                  <MessageCircle className="h-7 w-7 text-white animate-pulse" />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-8 border border-white/60 shadow-xl">
                  <p className="text-lg leading-relaxed text-slate-700">{mockData.aiCoachMessage.message}</p>
                </div>
              </CardContent>
            </Card>

            {/* 2. 今日のミッション */}
            <TodayMissionCard />

            {/* 3. 学習カレンダー */}
            <LearningHistoryCalendar />

            {/* 4. 今週の科目別進捗バー */}
            <WeeklySubjectProgressCard />

            {/* 5. 直近の応援履歴 */}
            <RecentEncouragementCard />

            {/* 6. 直近の学習履歴 */}
            <RecentLearningHistoryCard />
          </div>

          {/* タブレット・PC: 2列表示 (2:1の比率) */}
          <div className="hidden lg:grid lg:grid-cols-3 lg:gap-8">
            {/* 左列（メイン - 2/3の幅） */}
            <div className="lg:col-span-2 space-y-8">
              {/* 1. AIコーチからのメッセージ */}
              <Card className="ai-coach-gradient border-0 shadow-2xl ai-coach-glow">
                <CardHeader className="pb-6">
                  <CardTitle className="text-xl font-bold flex items-center gap-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-14 w-14 border-3 border-white/40 shadow-xl">
                        <AvatarImage src={getAvatarSrc("ai_coach") || "/placeholder.svg"} alt="AIコーチ" />
                        <AvatarFallback className="bg-white/20 text-white font-bold text-lg">AI</AvatarFallback>
                      </Avatar>
                      <span className="text-slate-900 font-bold text-xl bg-white/95 px-4 py-2 rounded-xl shadow-lg">
                        AIコーチからのメッセージ
                      </span>
                    </div>
                    <MessageCircle className="h-7 w-7 text-white animate-pulse" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-8 border border-white/60 shadow-xl">
                    <p className="text-lg leading-relaxed text-slate-700">{mockData.aiCoachMessage.message}</p>
                  </div>
                </CardContent>
              </Card>

              {/* 2. 今日のミッション */}
              <TodayMissionCard />

              {/* 3. 直近の応援履歴 */}
              <RecentEncouragementCard />

              {/* 4. 直近の学習履歴 */}
              <RecentLearningHistoryCard />
            </div>

            {/* 右列（サブ - 1/3の幅） */}
            <div className="lg:col-span-1 space-y-8">
              {/* 1. 学習カレンダー */}
              <LearningHistoryCalendar />

              {/* 2. 今週の科目別進捗バー */}
              <WeeklySubjectProgressCard />
            </div>
          </div>
        </div>
      </div>

      <BottomNavigation activeTab="home" />
    </div>
  )
}
