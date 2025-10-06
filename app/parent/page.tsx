"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import ParentBottomNavigation from "@/components/parent-bottom-navigation"
import { Flame, Calendar, Home, Flag, MessageCircle, BarChart3, Clock, Heart, Sparkles } from "lucide-react"

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

const getLearningIntensity = (date: string, calendarData: { [dateStr: string]: { subjectCount: number; accuracy80Count: number } }) => {
  const data = calendarData[date]
  if (!data) return "none"

  const maxCount = Math.max(data.subjectCount, data.accuracy80Count)
  if (maxCount === 0) return "none"
  if (maxCount === 1) return "light"
  if (maxCount === 2) return "medium"
  return "dark"
}

const LearningHistoryCalendar = ({ calendarData }: { calendarData: { [dateStr: string]: { subjectCount: number; accuracy80Count: number } } }) => {
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
        const intensity = getLearningIntensity(dateStr, calendarData)
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
                          ? `${day.date}: 学習記録 ${day.data.subjectCount}件 (正答率80%以上: ${day.data.accuracy80Count}件)`
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

const ParentTodayMissionCard = ({ todayProgress, studentName }: { todayProgress: Array<{subject: string, accuracy: number, correctCount: number, totalProblems: number, logs: any[]}>, studentName: string }) => {
  const [expandedLog, setExpandedLog] = useState<number | null>(null)
  const [encouragementSent, setEncouragementSent] = useState<{ [key: string]: boolean }>({})

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
        completionStatus: isReflectCompleted ? "1/1完了" : "0/1完了",
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
        completionStatus: `${completedCount}/${panels.length}完了`,
        allCompleted,
      }
    }

    // 通常モード（入力促進・復習促進）
    const panels = subjects.map((subject) => {
      const data = progressMap[subject] || { accuracy: 0, inputCount: 0, logs: [] }
      let status = "未入力"
      let needsAction = false
      let isCompleted = false

      if (mode === "input") {
        // 入力促進モード：記録されたら完了
        if (data.inputCount > 0) {
          status = `進捗率${data.accuracy}%`
          isCompleted = true
        } else {
          needsAction = true
        }
      } else if (mode === "review") {
        // 復習促進モード：再入力して正答率向上で完了
        if (data.inputCount > 0) {
          status = `進捗率${data.accuracy}%`
        }
        if (data.inputCount === 1 && data.accuracy < 80) {
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
        ? "bg-slate-100 text-slate-500 border-slate-300"
        : "bg-slate-100 text-slate-700 border-slate-300"
    }
    if (status.includes("進捗率")) {
      const rate = Number.parseInt(status.match(/\d+/)?.[0] || "0")
      if (rate >= 80) return "bg-green-100 text-green-800 border-green-200 font-bold"
      if (rate >= 60) return "bg-yellow-100 text-yellow-800 border-yellow-200"
      return "bg-red-100 text-red-800 border-red-200"
    }
    if (status === "完了") return "bg-green-100 text-green-800 border-green-200 font-bold"
    if (status === "未完了") return "bg-slate-100 text-slate-700 border-slate-300"
    return "bg-slate-100 text-slate-700 border-slate-300"
  }

  const getModeTitle = () => {
    return "今日のミッション！"
  }

  const handleSendEncouragement = (subject: string, logIndex: number) => {
    // TODO: 実装予定 - 応援メッセージ送信
    const key = `${subject}-${logIndex}`
    setEncouragementSent({ ...encouragementSent, [key]: true })
    console.log(`Send encouragement for ${subject} log ${logIndex}`)
  }

  const handleAIEncouragement = (subject: string) => {
    // TODO: 実装予定 - AI応援メッセージ生成
    console.log(`Generate AI encouragement for ${subject}`)
    alert("AI応援機能は近日実装予定です")
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
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleSendEncouragement(panel.subject, 0)}
                            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all duration-300 ${
                              encouragementSent[`${panel.subject}-0`]
                                ? "bg-green-100 text-green-700 border border-green-300"
                                : "bg-pink-500 text-white hover:bg-pink-600"
                            }`}
                            disabled={encouragementSent[`${panel.subject}-0`]}
                          >
                            {encouragementSent[`${panel.subject}-0`] ? "応援完了！" : "応援"}
                          </Button>
                          <Button
                            onClick={() => handleAIEncouragement(panel.subject)}
                            className="flex-1 py-2 px-3 rounded-lg text-xs font-bold bg-purple-500 text-white hover:bg-purple-600 transition-all duration-300"
                          >
                            <Sparkles className="h-3 w-3 mr-1" />
                            AI応援
                          </Button>
                        </div>
                        <Button
                          onClick={() => setExpandedLog(expandedLog === index ? null : index)}
                          variant="outline"
                          className="w-full py-2 px-3 rounded-lg text-xs font-medium"
                        >
                          {expandedLog === index ? "閉じる" : "詳細を見る"}
                        </Button>

                        {/* Expanded log details */}
                        {expandedLog === index && panel.logs && panel.logs.length > 0 && (
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
          </div>
        )}
      </CardContent>
    </Card>
  )
}

const WeeklySubjectProgressCard = ({ weeklyProgress }: { weeklyProgress: Array<{subject: string, colorCode: string, accuracy: number, correctCount: number, totalProblems: number}> }) => {
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null)

  const getStatus = (accuracy: number) => {
    if (accuracy === 0) return "未着手"
    if (accuracy < 50) return "進行中"
    if (accuracy < 80) return "あと少し"
    return "達成"
  }

  const getColor = (accuracy: number) => {
    if (accuracy === 0) return "gray"
    if (accuracy < 50) return "blue"
    if (accuracy < 80) return "yellow"
    return "green"
  }

  const subjectProgress = weeklyProgress.map((item) => ({
    subject: item.subject,
    status: getStatus(item.accuracy),
    correctAnswers: item.correctCount,
    totalQuestions: item.totalProblems,
    progressRate: item.accuracy,
    color: getColor(item.accuracy),
    details: [] as { content: string; remaining: number }[], // TODO: 内容別残数の実装は将来的に追加
  }))

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
      previousAccuracy: null, // TODO: 前回の正答率取得ロジック実装
      reflection: log.reflection_text || "",
    }
  })

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
  const [isLoading, setIsLoading] = useState(true)

  // Fetch parent data and children list
  useEffect(() => {
    const fetchParentData = async () => {
      try {
        const { getParentDashboardData, getTodayStatusMessage } = await import("@/app/actions/parent-dashboard")
        const { getLastLoginInfo } = await import("@/app/actions/dashboard")

        const [parentData, loginInfo] = await Promise.all([
          getParentDashboardData(),
          getLastLoginInfo()
        ])

        if (!parentData?.error && parentData?.profile) {
          setUserName(parentData.profile.display_name || "保護者")
          setSelectedAvatar(parentData.profile.avatar_url || "parent1")
        }

        if (!parentData?.error && parentData?.children) {
          setChildren(parentData.children)
          // Set first child as default
          if (parentData.children.length > 0) {
            const firstChild = parentData.children[0]
            const students = Array.isArray(firstChild.students) ? firstChild.students[0] : firstChild.students
            const profiles = Array.isArray(students?.profiles) ? students?.profiles[0] : students?.profiles
            setSelectedChildId(firstChild.student_id)
            setSelectedChildName(profiles?.display_name || "お子さん")
          }
        }

        if (!loginInfo?.error) {
          setLastLoginInfo(loginInfo)
        }
      } catch (error) {
        console.error("Failed to fetch parent dashboard data:", error)
      }
    }

    fetchParentData()
  }, [])

  // Fetch child-specific data when selected child changes
  useEffect(() => {
    if (!selectedChildId) return

    const fetchChildData = async () => {
      try {
        const {
          getTodayStatusMessage,
          getStudentStreak,
          getStudentTodayMissionData,
          getStudentWeeklyProgress,
          getStudentCalendarData,
          getStudentRecentLogs,
          getStudentRecentMessages,
        } = await import("@/app/actions/parent-dashboard")

        const [
          statusMsg,
          streakResult,
          todayMission,
          weeklySubject,
          calendar,
          logsResult,
          messagesResult,
        ] = await Promise.all([
          getTodayStatusMessage(selectedChildId),
          getStudentStreak(selectedChildId),
          getStudentTodayMissionData(selectedChildId),
          getStudentWeeklyProgress(selectedChildId),
          getStudentCalendarData(selectedChildId),
          getStudentRecentLogs(selectedChildId, 5),
          getStudentRecentMessages(selectedChildId, 3),
        ])

        if (!statusMsg?.error && statusMsg?.message) {
          setTodayStatusMessage(statusMsg.message)
        }
        if (!streakResult?.error && typeof streakResult?.streak === "number") {
          setStudyStreak(streakResult.streak)
        }
        if (Array.isArray(todayMission?.todayProgress)) {
          setTodayProgress(todayMission.todayProgress)
        } else {
          setTodayProgress([])
        }
        if (Array.isArray(weeklySubject?.progress)) {
          setWeeklyProgress(weeklySubject.progress)
        } else {
          setWeeklyProgress([])
        }
        if (calendar?.calendarData) {
          setCalendarData(calendar.calendarData)
        } else {
          setCalendarData({})
        }
        if (Array.isArray(logsResult?.logs)) {
          setRecentLogs(logsResult.logs)
        } else {
          setRecentLogs([])
        }
        if (Array.isArray(messagesResult?.messages)) {
          setRecentMessages(messagesResult.messages)
        } else {
          setRecentMessages([])
        }
      } catch (error) {
        console.error("Failed to fetch child data:", error)
      } finally {
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
        {children.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-2">
            {children.map((child) => {
              const students = Array.isArray(child.students) ? child.students[0] : child.students
              const profiles = Array.isArray(students?.profiles) ? students?.profiles[0] : students?.profiles
              const childName = profiles?.display_name || "お子さん"
              const childAvatar = profiles?.avatar_url || "student1"
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
                  <p className="text-lg leading-relaxed text-slate-700 font-medium">
                    {todayStatusMessage || `${selectedChildName}さんの今日の様子を見守りましょう`}
                  </p>
                </div>
              </CardContent>
            </Card>

            <ParentTodayMissionCard todayProgress={todayProgress} studentName={selectedChildName} />
            <LearningHistoryCalendar calendarData={calendarData} />
            <WeeklySubjectProgressCard weeklyProgress={weeklyProgress} />
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
                    <p className="text-lg leading-relaxed text-slate-700 font-medium">
                      {todayStatusMessage || `${selectedChildName}さんの今日の様子を見守りましょう`}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <ParentTodayMissionCard todayProgress={todayProgress} studentName={selectedChildName} />
              <RecentEncouragementCard messages={recentMessages} />
              <RecentLearningHistoryCard logs={recentLogs} />
            </div>

            {/* 右列（サブ - 1/3の幅） */}
            <div className="lg:col-span-1 space-y-8">
              <LearningHistoryCalendar calendarData={calendarData} />
              <WeeklySubjectProgressCard weeklyProgress={weeklyProgress} />
            </div>
          </div>
        </div>
      </div>

      <ParentBottomNavigation />
    </div>
  )
}
