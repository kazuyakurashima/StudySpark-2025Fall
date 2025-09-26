"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { BottomNavigation } from "@/components/bottom-navigation"
import { Flame, Calendar, Home, Flag, MessageCircle } from "lucide-react"

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
  // 初回ユーザー（連続日数が1日）
  if (streak === 1) {
    return `はじめまして、${userName}さん`
  }

  // 久しぶりのユーザー（連続日数が1日で、過去に学習履歴がある場合の想定）
  // 実際の実装では最終学習日からの経過日数を確認する必要があります
  const lastLoginDays = 0 // 仮の値、実際はAPIから取得
  if (lastLoginDays > 7) {
    return `お久しぶり、${userName}さん`
  }

  // 通常のユーザー
  return `おかえりなさい、${userName}さん`
}

const generateLearningHistory = () => {
  const history: { [key: string]: { subjects: string[]; understandingLevels: string[] } } = {}
  const today = new Date()

  // 過去30日分のサンプルデータを生成
  for (let i = 0; i < 30; i++) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split("T")[0]

    // ランダムに学習データを生成（一部の日は学習なし）
    if (Math.random() > 0.3) {
      // 70%の確率で学習あり
      const subjectCount = Math.floor(Math.random() * 4) + 1 // 1-4科目
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

    // 月の最初の週の開始日を計算（日曜日から開始）
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - firstDay.getDay())

    // 月の最後の週の終了日を計算
    const endDate = new Date(lastDay)
    endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()))

    // 週ごとにデータを生成
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
    return today.getDay() // 0: 日曜日, 1: 月曜日, ..., 6: 土曜日
  }

  const getCurrentHour = () => {
    const now = new Date()
    return now.getHours()
  }

  const getSubjectBlock = (weekday: number) => {
    // ブロック定義
    const blocks = {
      1: ["算数", "国語", "社会"], // 月曜日 - ブロックA
      2: ["算数", "国語", "社会"], // 火曜日 - ブロックA
      3: ["算数", "国語", "理科"], // 水曜日 - ブロックB
      4: ["算数", "国語", "理科"], // 木曜日 - ブロックB
      5: ["算数", "理科", "社会"], // 金曜日 - ブロックC
      6: ["算数", "理科", "社会"], // 土曜日 - ブロックC
    }
    return blocks[weekday as keyof typeof blocks] || []
  }

  const getMissionMode = (weekday: number, hour: number) => {
    if (weekday === 0) return "sunday" // 日曜日
    if (weekday === 6 && hour >= 12) return "special" // 土曜日12時以降
    if ([1, 3, 5].includes(weekday)) return "input" // 月・水・金：入力促進モード
    if ([2, 4, 6].includes(weekday)) return "review" // 火・木・土：復習促進モード
    return "input"
  }

  const getMissionData = (weekday: number, hour: number) => {
    const mode = getMissionMode(weekday, hour)
    const subjects = getSubjectBlock(weekday)

    // サンプルデータ（実際にはAPIやlocalStorageから取得）
    const weeklySubjectData = {
      算数: { inputCount: 2, correctRate: 75, needsReview: true },
      国語: { inputCount: 1, correctRate: 85, needsReview: false },
      理科: { inputCount: 0, correctRate: 0, needsReview: true },
      社会: { inputCount: 1, correctRate: 60, needsReview: true },
    }

    if (mode === "sunday") {
      return {
        mode: "sunday",
        subjects: [],
        panels: [{ name: "リフレクト", status: "完了", description: "週間振り返り", type: "reflect" }],
        statusMessage: "今週もお疲れさまでした！",
      }
    }

    if (mode === "special") {
      // 土曜日12時以降：リフレクト + 正答率80%未満の2科目
      const lowAccuracySubjects = Object.entries(weeklySubjectData)
        .filter(([_, data]) => data.correctRate < 80 && data.inputCount > 0)
        .slice(0, 2)
        .map(([subject, data]) => ({
          subject,
          correctRate: data.correctRate,
          needsAction: true,
          type: "review",
        }))

      return {
        mode: "special",
        subjects: lowAccuracySubjects.map((item) => item.subject),
        panels: [
          { name: "リフレクト", status: "未完了", description: "週間振り返り", type: "reflect" },
          ...lowAccuracySubjects.map((item) => ({
            subject: item.subject,
            correctRate: item.correctRate,
            status: `進捗率${item.correctRate}%`,
            needsAction: item.needsAction,
            type: "review",
          })),
        ],
        statusMessage: "週間振り返りと復習で今週を締めくくろう！",
      }
    }

    // 平日のミッション
    const panels = subjects.map((subject) => {
      const data = weeklySubjectData[subject as keyof typeof weeklySubjectData]
      let status = "未入力"
      let needsAction = false

      if (mode === "input") {
        // 入力促進モード：未入力の場合は強調
        if (data.inputCount > 0) {
          status = `進捗率${data.correctRate}%`
        }
        needsAction = data.inputCount === 0
      } else if (mode === "review") {
        // 復習促進モード：一度しか入力されておらず正答率80%未満の場合は強調
        if (data.inputCount > 0) {
          status = `進捗率${data.correctRate}%`
        }
        needsAction = data.inputCount === 1 && data.correctRate < 80
      }

      return {
        subject,
        status,
        needsAction,
        correctRate: data.correctRate,
        inputCount: data.inputCount,
      }
    })

    // 状況表示パネル用のメッセージ
    const actionNeededCount = panels.filter((p) => p.needsAction).length
    const completedCount = panels.length - actionNeededCount

    let statusMessage = ""
    if (actionNeededCount === 0) {
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
      if (rate >= 80) return "bg-primary text-white border-primary font-bold"
      if (rate >= 60) return "bg-blue-100 text-blue-800 border-blue-200"
      return "bg-yellow-100 text-yellow-800 border-yellow-200"
    }
    return "bg-slate-100 text-slate-700 border-slate-300"
  }

  const getModeTitle = () => {
    const titles = {
      sunday: "今週の振り返り",
      special: "週末スペシャル",
      input: "今日のミッション！",
      review: "今日のミッション！",
    }
    return titles[missionData.mode as keyof typeof titles] || "今日のミッション！"
  }

  const handleSparkNavigation = (subject?: string) => {
    // スパーク機能への遷移（実際の実装では適切なルーティング）
    console.log(`Navigate to spark for subject: ${subject || "general"}`)
  }

  const handleReflectNavigation = () => {
    // リフレクト機能への遷移
    console.log("Navigate to reflect")
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
        {missionData.mode === "sunday" || missionData.mode === "special" ? (
          // 日曜日・特別モード
          <div className="space-y-4">
            {missionData.panels.map((panel: any, index: number) => (
              <div
                key={index}
                className={`flex items-center justify-between p-6 rounded-xl bg-white/90 border-2 shadow-sm transition-all duration-300 hover:shadow-md ${
                  panel.type === "reflect" ? "border-primary/30" : getSubjectColor(panel.subject || "")
                }`}
              >
                <div>
                  <h3 className="font-bold text-lg text-slate-800">
                    {panel.type === "reflect" ? panel.name : panel.subject}
                  </h3>
                  {panel.description && <p className="text-sm text-slate-600 mt-1">{panel.description}</p>}
                  {panel.correctRate && (
                    <p className="text-sm text-slate-600 mt-1">現在の正答率: {panel.correctRate}%</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <Badge className={getStatusBadgeColor(panel.status, panel.needsAction || false)}>
                    {panel.status}
                  </Badge>
                  <button
                    onClick={() =>
                      panel.type === "reflect" ? handleReflectNavigation() : handleSparkNavigation(panel.subject)
                    }
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      panel.needsAction || panel.status === "未完了"
                        ? "bg-primary text-white hover:bg-primary/90"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {panel.type === "reflect" ? "振り返る" : "復習する"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          // 平日のミッション（3科目パネル + 状況表示パネル）
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
                    <button
                      onClick={() => handleSparkNavigation(panel.subject)}
                      className={`w-full py-3 px-4 rounded-lg text-sm font-bold transition-all duration-300 ${
                        panel.needsAction
                          ? "bg-primary text-white hover:bg-primary/90 shadow-lg hover:scale-105"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      今すぐ記録する
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* 4枚目のパネル：状況表示 */}
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
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3 space-y-8">
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

            <div data-mission-section>
              <TodayMissionCard />
            </div>
          </div>

          <div className="lg:col-span-2">
            <LearningHistoryCalendar />
          </div>
        </div>
      </div>

      <BottomNavigation activeTab="home" />
    </div>
  )
}
