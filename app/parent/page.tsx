"use client"

export const dynamic = 'force-dynamic'

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import ParentBottomNavigation from "@/components/parent-bottom-navigation"
import { Flame, Calendar, Home, Flag, MessageCircle, BarChart3, Clock, Heart, Sparkles, ChevronLeft, ChevronRight } from "lucide-react"
import { WeeklySubjectProgressCard } from "@/components/weekly-subject-progress-card"

const getGreetingMessage = (userName: string, lastLoginInfo: { lastLoginDays: number | null, lastLoginHours: number, isFirstTime: boolean } | null) => {
  if (!lastLoginInfo || lastLoginInfo.isFirstTime || lastLoginInfo.lastLoginDays === 0) {
    return `はじめまして、${userName}さん`
  }

  if (lastLoginInfo.lastLoginHours < 24) {
    return `おかえりなさい、${userName}さん`
  }

  return `お久しぶり、${userName}さん`
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

const LearningHistoryCalendar = ({ calendarData }: { calendarData: { [dateStr: string]: { subjectCount: number; accuracy80Count: number } } }) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date())
  const [criteriaMode, setCriteriaMode] = useState<"input" | "accuracy">("input")

  const today = new Date()

  // 判定基準に基づいて濃淡を決定
  const getLearningIntensity = (date: string) => {
    const data = calendarData[date]
    if (!data) return "none"

    const count = criteriaMode === "input" ? data.subjectCount : data.accuracy80Count
    if (count === 0) return "none"
    if (count === 1) return "light"
    if (count === 2) return "medium"
    return "dark"
  }

  // ナビゲーション関数
  const goToPreviousMonth = () => {
    const newMonth = new Date(selectedMonth)
    newMonth.setMonth(selectedMonth.getMonth() - 1)
    setSelectedMonth(newMonth)
  }

  const goToNextMonth = () => {
    const newMonth = new Date(selectedMonth)
    newMonth.setMonth(selectedMonth.getMonth() + 1)
    setSelectedMonth(newMonth)
  }

  const goToToday = () => {
    setSelectedMonth(new Date())
  }

  // 選択された月のデータのみ生成
  const targetMonth = selectedMonth
  const monthKey = `${targetMonth.getFullYear()}-${String(targetMonth.getMonth() + 1).padStart(2, "0")}`
  const monthName = `${targetMonth.getFullYear()}年${targetMonth.getMonth() + 1}月`

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
      // 判定基準に基づいて濃淡を決定
      const intensity = getLearningIntensity(dateStr)
      const isCurrentMonth = currentDate.getMonth() === targetMonth.getMonth()

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
                      ? `${day.date}: 学習記録 ${day.data.subjectCount}件 (正答率80%以上: ${day.data.accuracy80Count}件)`
                      : `${day.date}: 学習記録なし`
                  }
                />
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

const ParentTodayMissionCard = ({ todayProgress, studentName, selectedChildId }: { todayProgress: Array<{subject: string, accuracy: number, correctCount: number, totalProblems: number, logs: any[]}>, studentName: string, selectedChildId: number | null }) => {
  const [expandedLogs, setExpandedLogs] = useState<Set<number>>(new Set())
  const [encouragementSent, setEncouragementSent] = useState<{ [key: string]: boolean }>({})
  const [showAIDialog, setShowAIDialog] = useState(false)
  const [aiMessages, setAiMessages] = useState<string[]>([])
  const [selectedMessage, setSelectedMessage] = useState<string>("")
  const [currentLogId, setCurrentLogId] = useState<string | null>(null)
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
    const progressMap: { [subject: string]: { accuracy: number; inputCount: number; logs: any[] } } = {}
    todayProgress.forEach((item) => {
      progressMap[item.subject] = {
        accuracy: item.accuracy,
        inputCount: item.logs.length,
        logs: item.logs,
      }
    })

    // 日曜日：リフレクト促進
    if (mode === "sunday") {
      const isReflectCompleted = false // 実際の実装では外部データから取得
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
          : `${studentName}さんの今週の学習を振り返りましょう！`,
        completionStatus: isReflectCompleted ? "1/1入力完了" : "0/1入力完了",
        allCompleted: isReflectCompleted,
      }
    }

    // 土曜12時以降：特別モード
    if (mode === "special") {
      const isReflectCompleted = false // 実際の実装では外部データから取得
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
        logs: data.logs,
      }
    })

    const completedCount = panels.filter((p) => p.isCompleted).length
    const actionNeededCount = panels.filter((p) => p.needsAction).length

    // 全て完了した場合の判定
    const allCompleted = completedCount === panels.length

    let statusMessage = ""
    if (allCompleted) {
      statusMessage = mode === "input" ? `${studentName}さん、全て入力完了です！素晴らしいです！` : `${studentName}さん、全て復習完了です！今日もよく頑張りました！`
    } else if (actionNeededCount === 1) {
      const remainingSubject = panels.find((p) => p.needsAction)?.subject
      statusMessage =
        mode === "input"
          ? `あと${remainingSubject}だけ！`
          : `あと${remainingSubject}の復習だけ！`
    } else {
      statusMessage =
        mode === "input"
          ? `あと${actionNeededCount}科目で達成！`
          : `あと${actionNeededCount}科目復習で達成！`
    }

    return {
      mode,
      subjects,
      panels,
      statusMessage,
      completionStatus: `${completedCount}/${panels.length}入力完了`,
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
    return "今日のミッション！"
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
        alert("応援メッセージを送信しました！")
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
      } else {
        alert(`エラー: ${result.error || "AI応援メッセージ生成に失敗しました"}`)
        setShowAIDialog(false)
      }
    } catch (error) {
      console.error("AI応援エラー:", error)
      alert("AI応援機能でエラーが発生しました")
      setShowAIDialog(false)
    } finally {
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
        // Mark as sent in UI
        const key = `ai-${currentLogId}`
        setEncouragementSent({ ...encouragementSent, [key]: true })
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
    return `${date.getHours()}:${String(date.getMinutes()).padStart(2, "0")}`
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
                </div>
              </div>
            ))}
          </div>
        )}

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

                    {/* Show buttons based on completion status */}
                    {panel.status === "未入力" ? (
                      <Button
                        disabled
                        className="w-full py-3 px-4 rounded-lg text-sm font-bold bg-slate-100 text-slate-400 cursor-not-allowed"
                      >
                        未完了
                      </Button>
                    ) : (
                      <div className="space-y-2">
                        {/* クイック応援ボタン（3種類） */}
                        <div className="grid grid-cols-3 gap-2">
                          <Button
                            onClick={() => handleQuickEncouragement(panel.subject, 0, panel.logs?.[0]?.id, "heart")}
                            className="py-2 px-2 rounded-lg text-xs font-bold bg-pink-500 text-white hover:bg-pink-600 transition-all duration-300 flex items-center justify-center gap-1"
                            disabled={encouragementSent[`${panel.subject}-0`] || panel.logs?.[0]?.hasParentEncouragement || !panel.logs?.[0]?.id}
                          >
                            <Heart className="h-3 w-3" />
                            <span className="hidden sm:inline">がんばったね</span>
                          </Button>
                          <Button
                            onClick={() => handleQuickEncouragement(panel.subject, 0, panel.logs?.[0]?.id, "star")}
                            className="py-2 px-2 rounded-lg text-xs font-bold bg-yellow-500 text-white hover:bg-yellow-600 transition-all duration-300 flex items-center justify-center gap-1"
                            disabled={encouragementSent[`${panel.subject}-0`] || panel.logs?.[0]?.hasParentEncouragement || !panel.logs?.[0]?.id}
                          >
                            ⭐
                            <span className="hidden sm:inline">すごい！</span>
                          </Button>
                          <Button
                            onClick={() => handleQuickEncouragement(panel.subject, 0, panel.logs?.[0]?.id, "thumbsup")}
                            className="py-2 px-2 rounded-lg text-xs font-bold bg-blue-500 text-white hover:bg-blue-600 transition-all duration-300 flex items-center justify-center gap-1"
                            disabled={encouragementSent[`${panel.subject}-0`] || panel.logs?.[0]?.hasParentEncouragement || !panel.logs?.[0]?.id}
                          >
                            👍
                            <span className="hidden sm:inline">よくできました</span>
                          </Button>
                        </div>
                        {/* AI応援ボタン */}
                        <Button
                          onClick={() => handleOpenAIDialog(panel.subject, panel.logs?.[0]?.id)}
                          className="w-full py-2 px-3 rounded-lg text-xs font-bold bg-purple-500 text-white hover:bg-purple-600 transition-all duration-300 flex items-center justify-center gap-2"
                          disabled={!panel.logs?.[0]?.id}
                        >
                          <Sparkles className="h-3 w-3" />
                          AI応援メッセージ
                        </Button>
                        {/* 応援済み表示 */}
                        {(encouragementSent[`${panel.subject}-0`] || panel.logs?.[0]?.hasParentEncouragement) && (
                          <div className="text-center text-xs text-green-600 font-medium">
                            ✓ 応援済み
                          </div>
                        )}
                        <Button
                          onClick={() => toggleExpandLog(index)}
                          variant="outline"
                          className="w-full py-2 px-3 rounded-lg text-xs font-medium"
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
                <div className="mb-4">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-3">
                    <Flag className="h-8 w-8 text-primary" />
                  </div>
                </div>
                <h3 className="font-bold text-lg text-slate-800 mb-2">ミッション状況</h3>
                <p className="text-base text-slate-700 leading-relaxed">{missionData.statusMessage}</p>
              </div>
            </div>
              </>
            )}
          </div>
        )}
      </CardContent>

      {/* AI応援メッセージダイアログ */}
      {showAIDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-2 sm:p-4 z-50" onClick={() => !isGeneratingAI && !isSendingMessage && setShowAIDialog(false)}>
          <div className="bg-white rounded-2xl p-4 sm:p-6 max-w-2xl w-full max-h-[90vh] sm:max-h-[80vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3 className="text-lg sm:text-xl font-bold text-slate-800 flex items-center gap-2">
                <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" />
                <span className="hidden xs:inline">AI応援メッセージ</span>
                <span className="xs:hidden">AI応援</span>
              </h3>
              <button
                onClick={() => setShowAIDialog(false)}
                disabled={isGeneratingAI || isSendingMessage}
                className="text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50"
              >
                ✕
              </button>
            </div>

            {isGeneratingAI ? (
              <div className="py-12 text-center">
                <div className="animate-spin inline-block w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full mb-4"></div>
                <p className="text-slate-600">AI応援メッセージを生成中...</p>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                <p className="text-xs sm:text-sm text-slate-600 mb-2 sm:mb-4">
                  3つの応援メッセージから選んでください。メッセージは編集することもできます。
                </p>

                {/* 3つのメッセージ選択肢 */}
                <div className="space-y-2 sm:space-y-3">
                  {aiMessages.map((message, index) => (
                    <div key={index} className="relative">
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
                        className={`block p-3 sm:p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                          selectedMessage === message
                            ? "border-purple-500 bg-purple-50"
                            : "border-slate-200 bg-white hover:border-purple-300"
                        }`}
                      >
                        <div className="flex items-start gap-2 sm:gap-3">
                          <div className={`flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                            selectedMessage === message
                              ? "border-purple-500 bg-purple-500"
                              : "border-slate-300"
                          }`}>
                            {selectedMessage === message && (
                              <svg className="w-3 h-3 sm:w-4 sm:h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] sm:text-xs font-semibold text-purple-600">
                                {index === 0 ? "励まし型" : index === 1 ? "共感型" : "次への期待型"}
                              </span>
                            </div>
                            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed break-words">{message}</p>
                          </div>
                        </div>
                      </label>
                    </div>
                  ))}
                </div>

                {/* メッセージ編集エリア */}
                <div className="mt-4 sm:mt-6">
                  <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-2">
                    メッセージを編集（200文字まで）
                  </label>
                  <textarea
                    value={selectedMessage}
                    onChange={(e) => setSelectedMessage(e.target.value.slice(0, 200))}
                    className="w-full p-2 sm:p-3 text-sm border-2 border-slate-200 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all resize-none"
                    rows={4}
                    placeholder="選択したメッセージを編集できます"
                  />
                  <div className="flex justify-between items-center mt-1">
                    <p className="text-[10px] sm:text-xs text-slate-500">
                      {selectedMessage.length}/200文字
                    </p>
                  </div>
                </div>

                {/* 送信ボタン */}
                <div className="flex gap-2 sm:gap-3 mt-4 sm:mt-6">
                  <Button
                    onClick={() => setShowAIDialog(false)}
                    variant="outline"
                    className="flex-1 py-2 sm:py-3 text-xs sm:text-sm font-semibold"
                    disabled={isSendingMessage}
                  >
                    キャンセル
                  </Button>
                  <Button
                    onClick={handleSendAIMessage}
                    disabled={!selectedMessage.trim() || isSendingMessage}
                    className="flex-1 py-2 sm:py-3 bg-purple-600 hover:bg-purple-700 text-white text-xs sm:text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {isSendingMessage ? "送信中..." : "送信する"}
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


const RecentLearningHistoryCard = ({ logs }: { logs: any[] }) => {
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

  const safeLogs = Array.isArray(logs) ? logs : []

  const recentHistory = safeLogs.map((log) => {
    const loggedAt = log.logged_at || log.created_at || log.study_date

    return {
      studentRecordTime: formatDate(loggedAt),
      session: log.study_sessions?.session_number ?? log.session_id ?? 0,
      subject: log.subjects?.name || "",
      content: log.study_content_types?.content_name || "",
      correctAnswers: log.correct_count || 0,
      totalQuestions: log.total_problems || 0,
      accuracy: log.total_problems > 0 ? Math.round((log.correct_count / log.total_problems) * 100) : 0,
      previousAccuracy: null, // FUTURE: 前回の正答率取得（Phase 1後の機能拡張予定）
      reflection: log.reflection_text || "",
    }
  })

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
            <p className="text-sm font-normal text-slate-600 mt-1">昨日0:00〜今日23:59のスパーク機能記録</p>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-6">
        {recentHistory.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-600">まだ学習記録がありません</p>
            <p className="text-sm text-slate-500 mt-2">お子さんの学習を見守りましょう！</p>
          </div>
        ) : (
          recentHistory.map((item, index) => (
            <div
              key={index}
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
                      {item.session}回目
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
          ))
        )}
      </CardContent>
    </Card>
  )
}

const RecentEncouragementCard = ({ messages }: { messages: any[] }) => {
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

    return {
      recordTime: formatDate(msg.sent_at),
      from: senderProfile?.display_name || "応援者",
      avatar: senderProfile?.avatar_url || (msg.sender_role === "parent" ? "parent1" : "coach"),
      message: baseMessage,
    }
  })

  return (
    <Card className="bg-gradient-to-br from-pink-50 via-rose-50 to-red-50 border-pink-200/60 shadow-xl backdrop-blur-sm">
      <CardHeader className="pb-4 bg-gradient-to-r from-pink-500/10 to-rose-500/10 rounded-t-lg">
        <CardTitle className="text-xl font-bold flex items-center gap-3">
          <div className="p-2 bg-pink-100 rounded-full shadow-sm">
            <Heart className="h-6 w-6 text-pink-600" />
          </div>
          <div>
            <span className="text-slate-800">直近の応援履歴</span>
            <p className="text-sm font-normal text-slate-600 mt-1">昨日0:00〜今日23:59の保護者・指導者からの応援</p>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-6">
        {encouragementMessages.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-600">まだ応援メッセージがありません</p>
            <p className="text-sm text-slate-500 mt-2">お子さんへ応援メッセージを送りましょう！</p>
          </div>
        ) : (
          encouragementMessages.map((message, index) => (
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
                  <div className="bg-gradient-to-r from-pink-50 to-rose-50 p-4 rounded-xl border border-pink-100">
                    <p className="text-base leading-relaxed text-slate-700 font-medium">{message.message}</p>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}

export default function ParentDashboard() {
  const [userName, setUserName] = useState("")
  const [selectedAvatar, setSelectedAvatar] = useState("")
  const [children, setChildren] = useState<any[]>([])
  const [selectedChildId, setSelectedChildId] = useState<number | null>(null)
  const [selectedChildName, setSelectedChildName] = useState("")
  const [todayStatusMessage, setTodayStatusMessage] = useState("")
  const [studyStreak, setStudyStreak] = useState(0)
  const [recentLogs, setRecentLogs] = useState<any[]>([])
  const [recentMessages, setRecentMessages] = useState<any[]>([])
  const [lastLoginInfo, setLastLoginInfo] = useState<any>(null)
  const [todayProgress, setTodayProgress] = useState<any[]>([])
  const [calendarData, setCalendarData] = useState<any>({})
  const [weeklyProgress, setWeeklyProgress] = useState<any[]>([])
  const [sessionNumber, setSessionNumber] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Cache for AI-generated status message (persisted in localStorage)
  const [aiMessageCache, setAiMessageCache] = useState<{
    studentId: number
    date: string
    logCount: number
    message: string
  } | null>(() => {
    // Load cache from localStorage on mount
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("parentAiMessageCache")
        if (cached) {
          const parsed = JSON.parse(cached)
          // Validate that it's for today
          const todayStr = new Date().toLocaleDateString("ja-JP")
          if (parsed.date === todayStr) {
            console.log("✅ [CLIENT] Using cached AI message from localStorage")
            return parsed
          } else {
            // Clear stale cache
            console.log("🗑️ [CLIENT] Clearing stale AI message cache")
            localStorage.removeItem("parentAiMessageCache")
          }
        }
      } catch (error) {
        console.error("Failed to load AI message cache:", error)
        // Clear corrupted cache
        localStorage.removeItem("parentAiMessageCache")
      }
    }
    return null
  })

  // Fetch parent data and children list
  useEffect(() => {
    const fetchParentData = async () => {
      try {
        console.log("🔍 [CLIENT] Fetching parent data...")
        const { getParentDashboardData, getTodayStatusMessage } = await import("@/app/actions/parent-dashboard")
        const { getLastLoginInfo } = await import("@/app/actions/dashboard")

        console.log("🔍 [CLIENT] Imports successful, calling getParentDashboardData()")
        const [parentData, loginInfo] = await Promise.all([
          getParentDashboardData(),
          getLastLoginInfo()
        ])

        console.log("🔍 [CLIENT] Parent data received:", {
          hasError: !!parentData?.error,
          error: parentData?.error,
          childrenCount: parentData?.children?.length,
          fullData: JSON.stringify(parentData, null, 2)
        })

        if (!parentData?.error && parentData?.profile) {
          setUserName(parentData.profile.display_name || "保護者")
          setSelectedAvatar(parentData.profile.avatar_url || "parent1")
        }

        if (!parentData?.error && parentData?.children) {
          setChildren(parentData.children)
          // Set first child as default
          if (parentData.children.length > 0) {
            const firstChild = parentData.children[0]

            // students can be an object or array
            let studentData = firstChild.students
            if (Array.isArray(studentData)) {
              studentData = studentData[0]
            }

            // profiles is directly on studentData (added by server)
            const profile = studentData?.profiles

            setSelectedChildId(firstChild.student_id)
            setSelectedChildName(profile?.display_name || "お子さん")
            // Keep loading state true - will be set to false after child data is fetched
          } else {
            // No children associated
            setIsLoading(false)
          }
        } else {
          // 子どもが紐付いていない場合もローディングを解除
          setIsLoading(false)
        }

        if (!loginInfo?.error) {
          setLastLoginInfo(loginInfo)
        }
      } catch (error) {
        console.error("❌ [CLIENT] Failed to fetch parent dashboard data:", error)
        console.error("❌ [CLIENT] Error details:", {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        })
        setIsLoading(false)
      }
    }

    fetchParentData()
  }, [])

  // Fetch child-specific data when selected child changes
  useEffect(() => {
    console.log("🔍 [CLIENT] useEffect triggered - selectedChildId:", selectedChildId)

    if (!selectedChildId) {
      console.log("🔍 [CLIENT] No child selected, setting loading to false")
      setIsLoading(false)
      return
    }

    console.log("🔍 [CLIENT] Fetching data for child:", selectedChildId)

    const fetchChildData = async () => {
      try {
        const {
          getTodayStatusMessageAI,
          getTodayLogCount,
          getStudentStreak,
          getStudentTodayMissionData,
          getStudentWeeklyProgress,
          getStudentCalendarData,
          getStudentRecentLogs,
          getStudentRecentMessages,
        } = await import("@/app/actions/parent-dashboard")

        // Get current date string for cache comparison
        const todayStr = new Date().toLocaleDateString("ja-JP")

        // Check if we can use cached AI message
        const logCountResult = await getTodayLogCount(selectedChildId)
        const currentLogCount = logCountResult.count || 0

        let shouldRegenerateAI = true
        let cachedMessage = ""

        if (aiMessageCache) {
          const isSameStudent = aiMessageCache.studentId === selectedChildId
          const isSameDay = aiMessageCache.date === todayStr
          const isSameLogCount = aiMessageCache.logCount === currentLogCount

          if (isSameStudent && isSameDay && isSameLogCount) {
            // Use cached message
            shouldRegenerateAI = false
            cachedMessage = aiMessageCache.message
            console.log("✅ Using cached AI message (no data changes)")
          } else {
            console.log("🔄 Cache invalid:", {
              sameStudent: isSameStudent,
              sameDay: isSameDay,
              sameLogCount: isSameLogCount,
              oldCount: aiMessageCache.logCount,
              newCount: currentLogCount,
            })
          }
        } else {
          console.log("🆕 No cache available, generating new AI message")
        }

        // Fetch data in parallel (skip AI generation if using cache)
        const fetchPromises = [
          shouldRegenerateAI ? getTodayStatusMessageAI(selectedChildId) : Promise.resolve({ message: cachedMessage }),
          getStudentStreak(selectedChildId),
          getStudentTodayMissionData(selectedChildId),
          getStudentWeeklyProgress(selectedChildId),
          getStudentCalendarData(selectedChildId),
          getStudentRecentLogs(selectedChildId, 5),
          getStudentRecentMessages(selectedChildId, 3),
        ]

        const [
          statusMsg,
          streakResult,
          todayMission,
          weeklySubject,
          calendar,
          logsResult,
          messagesResult,
        ] = await Promise.all(fetchPromises)

        if (!statusMsg?.error && statusMsg?.message) {
          setTodayStatusMessage(statusMsg.message)

          // Update cache if we regenerated the message
          if (shouldRegenerateAI) {
            const newCache = {
              studentId: selectedChildId,
              date: todayStr,
              logCount: currentLogCount,
              message: statusMsg.message,
            }
            setAiMessageCache(newCache)
            // Save to localStorage for persistence across page reloads
            try {
              localStorage.setItem("parentAiMessageCache", JSON.stringify(newCache))
            } catch (error) {
              console.error("Failed to save AI message cache:", error)
            }
            console.log("💾 AI message cached:", { studentId: selectedChildId, date: todayStr, logCount: currentLogCount })
          }
        } else if (statusMsg?.error) {
          console.error("❌ [CLIENT] Status message error:", statusMsg.error)
        }

        if (!streakResult?.error && typeof streakResult?.streak === "number") {
          setStudyStreak(streakResult.streak)
        } else if (streakResult?.error) {
          console.error("❌ [CLIENT] Streak error:", streakResult.error)
        }

        if (Array.isArray(todayMission?.todayProgress)) {
          console.log("🔍 [CLIENT] Today progress received:", todayMission.todayProgress)
          setTodayProgress(todayMission.todayProgress)
        } else {
          console.log("⚠️ [CLIENT] Today progress is not an array:", todayMission)
          if (todayMission?.error) {
            console.error("❌ [CLIENT] Today mission error:", todayMission.error)
          }
          setTodayProgress([])
        }

        if (Array.isArray(weeklySubject?.progress)) {
          console.log("🔍 [CLIENT] Weekly progress received:", weeklySubject.progress)
          setWeeklyProgress(weeklySubject.progress)
          setSessionNumber(weeklySubject.sessionNumber || null)
        } else {
          console.log("⚠️ [CLIENT] Weekly progress is not an array:", weeklySubject)
          if (weeklySubject?.error) {
            console.error("❌ [CLIENT] Weekly progress error:", weeklySubject.error)
          }
          setWeeklyProgress([])
          setSessionNumber(null)
        }

        if (calendar?.calendarData) {
          setCalendarData(calendar.calendarData)
        } else {
          if (calendar?.error) {
            console.error("❌ [CLIENT] Calendar error:", calendar.error)
          }
          setCalendarData({})
        }

        if (Array.isArray(logsResult?.logs)) {
          setRecentLogs(logsResult.logs)
        } else {
          if (logsResult?.error) {
            console.error("❌ [CLIENT] Recent logs error:", logsResult.error)
          }
          setRecentLogs([])
        }

        if (Array.isArray(messagesResult?.messages)) {
          setRecentMessages(messagesResult.messages)
        } else {
          if (messagesResult?.error) {
            console.error("❌ [CLIENT] Recent messages error:", messagesResult.error)
          }
          setRecentMessages([])
        }

        console.log("🔍 [CLIENT] All child data fetched successfully")
      } catch (error) {
        console.error("Failed to fetch child data:", error)
      } finally {
        console.log("🔍 [CLIENT] Setting loading to false")
        setIsLoading(false)
      }
    }

    fetchChildData()
  }, [selectedChildId])

  const greetingMessage = getGreetingMessage(userName, lastLoginInfo)

  const handleChildSelect = (childId: number, childName: string) => {
    setSelectedChildId(childId)
    setSelectedChildName(childName)
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
    <div className="min-h-screen bg-background pb-20 elegant-fade-in">
      <div className="surface-gradient-primary backdrop-blur-lg border-b border-border/30 p-6 shadow-lg">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border-3 border-primary/20 shadow-xl ring-2 ring-primary/10">
              <AvatarImage src={getAvatarSrc(selectedAvatar) || "/placeholder.svg"} alt={userName} />
              <AvatarFallback className="bg-primary/10 text-primary font-bold text-xl">
                {userName.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-3xl font-bold text-foreground tracking-tight">{greetingMessage}</h1>
              <p className="text-lg text-muted-foreground mt-1 font-medium">お子さんの成長を見守りましょう</p>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-3 text-primary">
              <div className="p-2 bg-primary/10 rounded-full">
                <Flame className="h-7 w-7" />
              </div>
              <span className="font-bold text-3xl">{studyStreak}</span>
            </div>
            <p className="text-sm text-muted-foreground font-semibold mt-1">連続学習日数</p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6 space-y-8">
        {/* Child Selector Tabs */}
        {children.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2">
            {children.map((child, index) => {
              // Extract student and profile data
              let studentData = child.students
              if (Array.isArray(studentData)) {
                studentData = studentData[0]
              }
              const profile = studentData?.profiles

              const childName = profile?.display_name || "お子さん"
              const childAvatar = profile?.avatar_url || "student1"
              const isActive = selectedChildId === child.student_id

              return (
                <button
                  key={child.student_id}
                  onClick={() => handleChildSelect(child.student_id, childName)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-300 whitespace-nowrap ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-lg scale-105"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  <Avatar className="h-8 w-8 border-2 border-white">
                    <AvatarImage src={getAvatarSrc(childAvatar)} alt={childName} />
                    <AvatarFallback>{childName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span>{childName}</span>
                </button>
              )
            })}
          </div>
        )}

        <div className="space-y-8 lg:space-y-0">
          {/* スマホでの表示順序 */}
          <div className="lg:hidden space-y-8">
            <Card className="card-elevated ai-coach-gradient border-0 shadow-2xl premium-glow">
              <CardHeader className="pb-6">
                <CardTitle className="text-xl font-bold flex items-center gap-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-16 w-16 border-3 border-white/30 shadow-2xl ring-2 ring-white/20">
                      <AvatarImage src={getAvatarSrc("ai_coach") || "/placeholder.svg"} alt="AIコーチ" />
                      <AvatarFallback className="bg-white/20 text-white font-bold text-lg">AI</AvatarFallback>
                    </Avatar>
                    <span className="text-slate-800 font-bold text-xl bg-white/95 px-6 py-3 rounded-2xl shadow-xl backdrop-blur-sm">
                      今日の様子
                    </span>
                  </div>
                  <MessageCircle className="h-8 w-8 text-white sophisticated-scale" />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-8 border border-white/40 shadow-2xl">
                  <div className="flex items-start gap-3 mb-4">
                    <Badge className="bg-gradient-to-r from-blue-500 to-purple-500 text-white border-0 px-3 py-1 flex items-center gap-1">
                      <Sparkles className="h-3 w-3" />
                      AI生成
                    </Badge>
                  </div>
                  <p className="text-lg leading-relaxed text-slate-700 font-medium">
                    {todayStatusMessage || `${selectedChildName}さんの今日の様子を見守りましょう`}
                  </p>
                </div>
              </CardContent>
            </Card>

            <ParentTodayMissionCard todayProgress={todayProgress} studentName={selectedChildName} selectedChildId={selectedChildId} />
            <LearningHistoryCalendar calendarData={calendarData} />
            <WeeklySubjectProgressCard weeklyProgress={weeklyProgress} sessionNumber={sessionNumber} />
            <RecentEncouragementCard messages={recentMessages} />
            <RecentLearningHistoryCard logs={recentLogs} />
          </div>

          <div className="hidden lg:grid lg:grid-cols-3 lg:gap-8">
            {/* 左列（メイン - 2/3の幅） */}
            <div className="lg:col-span-2 space-y-8">
              <Card className="card-elevated ai-coach-gradient border-0 shadow-2xl premium-glow">
                <CardHeader className="pb-6">
                  <CardTitle className="text-xl font-bold flex items-center gap-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-16 w-16 border-3 border-white/30 shadow-2xl ring-2 ring-white/20">
                        <AvatarImage src={getAvatarSrc("ai_coach") || "/placeholder.svg"} alt="AIコーチ" />
                        <AvatarFallback className="bg-white/20 text-white font-bold text-lg">AI</AvatarFallback>
                      </Avatar>
                      <span className="text-slate-800 font-bold text-xl bg-white/95 px-6 py-3 rounded-2xl shadow-xl backdrop-blur-sm">
                        今日の様子
                      </span>
                    </div>
                    <MessageCircle className="h-8 w-8 text-white sophisticated-scale" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-8 border border-white/40 shadow-2xl">
                    <div className="flex items-start gap-3 mb-4">
                      <Badge className="bg-gradient-to-r from-blue-500 to-purple-500 text-white border-0 px-3 py-1 flex items-center gap-1">
                        <Sparkles className="h-3 w-3" />
                        AI生成
                      </Badge>
                    </div>
                    <p className="text-lg leading-relaxed text-slate-700 font-medium">
                      {todayStatusMessage || `${selectedChildName}さんの今日の様子を見守りましょう`}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <ParentTodayMissionCard todayProgress={todayProgress} studentName={selectedChildName} selectedChildId={selectedChildId} />
              <RecentEncouragementCard messages={recentMessages} />
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

      <ParentBottomNavigation />
    </div>
  )
}
