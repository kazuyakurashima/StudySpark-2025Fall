"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { BottomNavigation } from "@/components/bottom-navigation"
import { Flame, Calendar, Sparkles, Target, BookOpen } from "lucide-react"

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
    timeBasedGreeting: getTimeBasedGreeting(),
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

const subjectColors = {
  算数: "border-l-blue-500 bg-blue-50/80",
  国語: "border-l-emerald-500 bg-emerald-50/80",
  理科: "border-l-purple-500 bg-purple-50/80",
  社会: "border-l-red-500 bg-red-50/80",
}

function getTimeBasedGreeting() {
  const hour = new Date().getHours()
  if (hour < 10) {
    return "おはようございます！今日も元気にスタートしましょう"
  } else if (hour < 17) {
    return "こんにちは！今日の学習はいかがですか？"
  } else {
    return "お疲れさまです！今日も一日よく頑張りましたね"
  }
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
  const monthsData: { [key: string]: any[][] } = {}

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
                        ${intensityColors[day.intensity]}
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

const testSchedule = [
  // 合不合判定テスト
  { id: "goufugofu3", name: "第3回合不合判定テスト", date: "2024-09-08", type: "合不合判定テスト" },
  { id: "goufugofu4", name: "第4回合不合判定テスト", date: "2024-10-05", type: "合不合判定テスト" },
  { id: "goufugofu5", name: "第5回合不合判定テスト", date: "2024-11-16", type: "合不合判定テスト" },
  { id: "goufugofu6", name: "第6回合不合判定テスト", date: "2024-12-07", type: "合不合判定テスト" },
  // 週テスト
  { id: "weekly2", name: "第2回週テスト", date: "2024-09-13", type: "週テスト" },
  { id: "weekly3", name: "第3回週テスト", date: "2024-09-20", type: "週テスト" },
  { id: "weekly4", name: "第4回週テスト", date: "2024-09-27", type: "週テスト" },
  { id: "weekly5", name: "第5回週テスト", date: "2024-10-11", type: "週テスト" },
  { id: "weekly6", name: "第6回週テスト", date: "2024-10-18", type: "週テスト" },
  { id: "weekly7", name: "第7回週テスト", date: "2024-10-25", type: "週テスト" },
  { id: "weekly8", name: "第8回週テスト", date: "2024-11-08", type: "週テスト" },
  { id: "weekly9", name: "第9回週テスト", date: "2024-11-22", type: "週テスト" },
  { id: "weekly10", name: "第10回週テスト", date: "2024-11-29", type: "週テスト" },
]

const getNextTest = () => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const upcomingTests = testSchedule
    .filter((test) => {
      const testDate = new Date(test.date)
      testDate.setHours(0, 0, 0, 0)
      return testDate >= today
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  console.log("[v0] Today:", today.toISOString().split("T")[0])
  console.log(
    "[v0] Upcoming tests:",
    upcomingTests.map((t) => ({ name: t.name, date: t.date })),
  )
  console.log("[v0] Next test found:", upcomingTests[0] || null)

  return upcomingTests[0] || null
}

const getDaysUntilTest = (testDate: string) => {
  const today = new Date()
  const test = new Date(testDate)

  today.setHours(0, 0, 0, 0)
  test.setHours(0, 0, 0, 0)

  const diffTime = test.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return "本日！"
  if (diffDays === 1) return "明日"
  if (diffDays < 0) return "終了"
  return `${diffDays}日後`
}

const formatTestDate = (dateString: string) => {
  const date = new Date(dateString)
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"]
  const month = date.getMonth() + 1
  const day = date.getDate()
  const weekday = weekdays[date.getDay()]
  return `${month}/${day}（${weekday}）`
}

const WeeklyGoalCard = () => {
  const [isThoughtExpanded, setIsThoughtExpanded] = useState(false)

  const nextTest = {
    id: "goufugofu3",
    name: "第3回合不合判定テスト",
    date: "2024-09-08",
    type: "合不合判定テスト",
  }

  const goalData = {
    course: "S",
    group: 15,
    subjectGoals: {
      算数: 65,
      国語: 58,
      理科: 62,
      社会: 60,
    },
    thought:
      "今回は算数の図形問題を重点的に勉強したので、前回より良い結果を出したいです。特に立体図形の問題で満点を目指します！",
  }

  const daysUntil = getDaysUntilTest(nextTest.date)
  const isTestType = nextTest.type === "合不合判定テスト"

  return (
    <Card className="bg-gradient-to-br from-primary/10 to-accent/10 border-primary/30 shadow-xl">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-bold flex items-center gap-3">
          <Target className="h-7 w-7 text-primary" />
          <span className="text-slate-800">今週の目標</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 border border-white/60 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-xl text-foreground">{nextTest.name}</h3>
              <p className="text-base text-muted-foreground mt-1">{formatTestDate(nextTest.date)}</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-black text-primary">{daysUntil}</div>
              {daysUntil !== "本日！" && daysUntil !== "明日" && daysUntil !== "終了" && (
                <p className="text-sm text-muted-foreground">まで</p>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-bold text-lg text-foreground flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              結果目標
            </h4>
            {isTestType ? (
              <div className="flex items-center gap-4">
                <Badge className="font-bold text-lg px-4 py-2 bg-primary text-primary-foreground border-primary shadow-md">
                  {goalData.course}コース
                </Badge>
                <Badge className="font-bold text-lg px-4 py-2 bg-accent text-accent-foreground border-accent shadow-md">
                  {goalData.group}組
                </Badge>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(goalData.subjectGoals).map(([subject, score]) => (
                  <div key={subject} className="bg-muted/60 rounded-xl p-4 border border-border/60 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-base font-semibold text-foreground">{subject}</span>
                      <Badge className="font-bold bg-primary text-primary-foreground border-primary">{score}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {goalData.thought && (
            <div className="space-y-3 pt-4 border-t border-border/40">
              <h4 className="font-bold text-lg text-foreground">今回の思い</h4>
              <div className="bg-accent/10 rounded-xl p-4 border border-accent/30 shadow-sm">
                <p className={`text-base leading-relaxed text-slate-800 ${!isThoughtExpanded ? "line-clamp-2" : ""}`}>
                  {goalData.thought}
                </p>
                {goalData.thought.length > 100 && (
                  <button
                    onClick={() => setIsThoughtExpanded(!isThoughtExpanded)}
                    className="text-sm text-primary hover:text-primary/80 mt-3 font-semibold transition-colors"
                  >
                    {isThoughtExpanded ? "折りたたむ" : "もっと見る"}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
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

const LearningDashboard = () => {
  const getTodayWeekday = () => {
    const today = new Date()
    return today.getDay() // 0: 日曜日, 1: 月曜日, ..., 6: 土曜日
  }

  const getCurrentRingIndex = (weekday: number) => {
    if (weekday === 0) return -1 // 日曜日はリング表示なし
    if (weekday === 1 || weekday === 2) return 0 // 月・火
    if (weekday === 3 || weekday === 4) return 1 // 水・木
    if (weekday === 5 || weekday === 6) return 2 // 金・土
    return -1
  }

  const todayWeekday = getTodayWeekday()
  const currentRingIndex = getCurrentRingIndex(todayWeekday)
  const isSunday = todayWeekday === 0

  // サンプルデータ（実際にはAPIやlocalStorageから取得）
  const weeklyData = {
    rings: [
      { period: "月・火", score: 8, maxScore: 12, subjects: ["算数", "理科", "社会"] },
      { period: "水・木", score: 10, maxScore: 12, subjects: ["算数", "国語", "社会"] },
      { period: "金・土", score: 6, maxScore: 12, subjects: ["算数", "国語", "理科"] },
    ],
    totalScore: 24,
    maxTotalScore: 36,
    sundayStatus: {
      reflect: true,
      goalNav: false,
    },
  }

  const getRingColor = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100
    if (percentage >= 80) return "text-primary stroke-primary"
    if (percentage >= 60) return "text-blue-500 stroke-blue-500"
    if (percentage >= 40) return "text-blue-400 stroke-blue-400"
    return "text-slate-400 stroke-slate-400"
  }

  const getProgressColor = (score: number) => {
    if (score >= 24) return "bg-primary"
    if (score >= 12) return "bg-blue-500"
    return "bg-blue-400"
  }

  const getProgressMessage = (score: number) => {
    if (score >= 24) return "Excellent!"
    if (score >= 12) return "Good!"
    return `合格ラインまであと${12 - score}点`
  }

  return (
    <Card className="bg-white border-slate-200 shadow-xl">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-bold flex items-center gap-3 text-slate-800">
          <Sparkles className="h-7 w-7 text-primary" />
          学習ダッシュボード
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {!isSunday ? (
          <>
            {/* 該当するリングのみ表示 */}
            {currentRingIndex >= 0 && (
              <div className="flex justify-center">
                <div className="relative w-32 h-32">
                  <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      className="text-slate-200"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      strokeDasharray={`${(weeklyData.rings[currentRingIndex].score / weeklyData.rings[currentRingIndex].maxScore) * 251.2} 251.2`}
                      className={getRingColor(
                        weeklyData.rings[currentRingIndex].score,
                        weeklyData.rings[currentRingIndex].maxScore,
                      )}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold text-slate-800">
                      {weeklyData.rings[currentRingIndex].score}
                    </span>
                    <span className="text-sm text-slate-600">/{weeklyData.rings[currentRingIndex].maxScore}点</span>
                  </div>
                </div>
              </div>
            )}

            <div className="text-center">
              <h3 className="font-bold text-lg text-slate-800 mb-2">
                {currentRingIndex >= 0 ? weeklyData.rings[currentRingIndex].period : "今日"}の学習状況
              </h3>
              {currentRingIndex >= 0 && (
                <p className="text-sm text-slate-600">{weeklyData.rings[currentRingIndex].subjects.join("・")}</p>
              )}
            </div>
          </>
        ) : (
          // 日曜日は振り返り表示
          <div className="space-y-4">
            <h3 className="font-bold text-lg text-slate-800 text-center">今週の振り返り</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 rounded-xl bg-primary/10 border border-primary/20">
                <span className="font-medium text-slate-800">リフレクト</span>
                <Badge
                  className={`${weeklyData.sundayStatus.reflect ? "bg-primary text-white" : "bg-slate-200 text-slate-600"}`}
                >
                  {weeklyData.sundayStatus.reflect ? "完了" : "未完了"}
                </Badge>
              </div>
              <div className="flex items-center justify-between p-4 rounded-xl bg-primary/10 border border-primary/20">
                <span className="font-medium text-slate-800">ゴールナビ</span>
                <Badge
                  className={`${weeklyData.sundayStatus.goalNav ? "bg-primary text-white" : "bg-slate-200 text-slate-600"}`}
                >
                  {weeklyData.sundayStatus.goalNav ? "完了" : "未完了"}
                </Badge>
              </div>
            </div>
          </div>
        )}

        {/* 今週の学習累積（常に表示） */}
        <div className="space-y-4 pt-4 border-t border-slate-200">
          <h4 className="font-bold text-lg text-slate-800">今週の学習累積</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-600">進捗</span>
              <span className="text-lg font-bold text-slate-800">
                {weeklyData.totalScore}/{weeklyData.maxTotalScore}点
              </span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-4 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${getProgressColor(weeklyData.totalScore)}`}
                style={{ width: `${(weeklyData.totalScore / weeklyData.maxTotalScore) * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-slate-500">
              <span>0</span>
              <span>12</span>
              <span>24</span>
              <span>36</span>
            </div>
            <p className="text-center text-sm font-medium text-primary">{getProgressMessage(weeklyData.totalScore)}</p>
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

  const getMissionData = (weekday: number) => {
    const subjectBlocks = {
      1: ["算数", "理科", "社会"], // 月曜日
      2: ["算数", "理科", "社会"], // 火曜日
      3: ["算数", "国語", "社会"], // 水曜日
      4: ["算数", "国語", "社会"], // 木曜日
      5: ["算数", "国語", "理科"], // 金曜日
      6: ["算数", "国語", "理科"], // 土曜日
    }

    const isInputMode = [1, 3, 5].includes(weekday) // 月・水・金
    const isReviewMode = [2, 4, 6].includes(weekday) // 火・木・土
    const isSunday = weekday === 0

    if (isSunday) {
      return {
        mode: "sunday",
        subjects: [],
        panels: [],
        specialTasks: [
          { name: "ゴールナビ", status: "未完了", description: "次回テストの目標設定" },
          { name: "リフレクト", status: "完了", description: "週間振り返り" },
        ],
      }
    }

    const subjects = subjectBlocks[weekday as keyof typeof subjectBlocks] || []
    const panels = []

    for (const subject of subjects) {
      for (const type of ["授業", "宿題"]) {
        // サンプルデータ（実際にはAPIやlocalStorageから取得）
        const status = Math.random() > 0.5 ? "未入力" : Math.random() > 0.5 ? "入力のみ" : "できた"
        panels.push({
          subject,
          type,
          status,
          needsAction: isInputMode ? status === "未入力" : !["できた", "バッチリ理解"].includes(status),
        })
      }
    }

    return {
      mode: isInputMode ? "input" : "review",
      subjects,
      panels,
      specialTasks: [],
    }
  }

  const todayWeekday = getTodayWeekday()
  const missionData = getMissionData(todayWeekday)

  const getStatusColor = (status: string) => {
    switch (status) {
      case "未入力":
        return "bg-slate-100 text-slate-700 border-slate-300 font-medium"
      case "入力のみ":
        return "bg-blue-50 text-blue-800 border-blue-200 font-medium"
      case "できた":
        return "bg-primary text-white border-primary font-medium"
      case "バッチリ理解":
        return "bg-secondary text-white border-secondary font-bold status-glow"
      default:
        return "bg-slate-100 text-slate-700 border-slate-300 font-medium"
    }
  }

  const getSubjectColor = (subject: string) => {
    switch (subject) {
      case "算数":
        return "border-l-4 border-l-primary bg-blue-50/80"
      case "国語":
        return "border-l-4 border-l-green-600 bg-green-50/80"
      case "理科":
        return "border-l-4 border-l-purple-600 bg-purple-50/80"
      case "社会":
        return "border-l-4 border-l-red-600 bg-red-50/80"
      default:
        return "border-l-4 border-l-slate-400 bg-slate-50/80"
    }
  }

  const getActionText = (panel: any) => {
    if (missionData.mode === "sunday") {
      return panel.status === "未完了" ? "開始" : ""
    } else {
      return !["できた", "バッチリ理解"].includes(panel.status) ? "復習する" : "定着済み"
    }
  }

  const getModeTitle = () => {
    if (missionData.mode === "sunday") return "今週の振り返り"
    if (missionData.mode === "input") return "今日のミッション！（入力促進）"
    return "今日のミッション！（復習促進）"
  }

  const getCompletionStatus = () => {
    if (missionData.mode === "sunday") {
      const completed = missionData.specialTasks.filter((task) => task.status === "完了").length
      return `${completed}/${missionData.specialTasks.length} 完了`
    }

    const actionNeeded = missionData.panels.filter((panel) => panel.needsAction).length
    const total = missionData.panels.length
    return `${total - actionNeeded}/${total} 完了`
  }

  return (
    <Card className="bg-gradient-to-br from-primary/8 to-accent/8 border-primary/30 shadow-xl">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold flex items-center gap-3">
            <Flame className="h-7 w-7 text-primary" />
            <span className="text-slate-800">{getModeTitle()}</span>
          </CardTitle>
          <Badge className="bg-primary text-primary-foreground border-primary font-bold text-base px-4 py-2 shadow-md">
            {getCompletionStatus()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {missionData.mode === "sunday" ? (
          // 日曜日の特別タスク
          <div className="space-y-4">
            {missionData.specialTasks.map((task, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-6 rounded-xl bg-white/90 border border-primary/20 shadow-sm"
              >
                <div>
                  <h3 className="font-bold text-lg text-slate-800">{task.name}</h3>
                  <p className="text-sm text-slate-600 mt-1">{task.description}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge
                    className={`${task.status === "完了" ? "bg-primary text-white" : "bg-slate-200 text-slate-600"} font-semibold px-3 py-1`}
                  >
                    {task.status}
                  </Badge>
                  {task.status === "未完了" && (
                    <button className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors">
                      開始
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          // 平日のミッションパネル
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              {missionData.panels.map((panel, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-xl border-2 shadow-sm transition-all duration-300 hover:shadow-md ${getSubjectColor(panel.subject)} ${panel.needsAction ? "mission-pulse" : ""}`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-base text-slate-800">{panel.subject}</span>
                      <Badge className={`text-xs px-2 py-1 border ${getStatusColor(panel.status)}`}>
                        {panel.status}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-slate-700">{panel.type}</p>
                      <button
                        className={`w-full py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                          panel.needsAction
                            ? "bg-primary text-white hover:bg-primary/90"
                            : "bg-slate-100 text-slate-600"
                        }`}
                        disabled={!panel.needsAction}
                      >
                        {getActionText(panel)}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center p-4 bg-primary/10 rounded-xl border border-primary/20">
              <p className="text-base font-medium text-slate-700">すべて「できた」以上になると今日のミッション達成！</p>
            </div>
          </div>
        )}
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
              <h1 className="text-2xl font-bold text-foreground">おかえり、{userName}さん</h1>
              <p className="text-base text-muted-foreground mt-1">今日も一緒にがんばろう！</p>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2 text-primary">
              <Flame className="h-6 w-6" />
              <span className="font-bold text-2xl">{mockData.user.streak}</span>
            </div>
            <p className="text-sm text-muted-foreground font-medium">連続日数</p>
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
                  <Sparkles className="h-7 w-7 text-white animate-pulse" />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-8 border border-white/60 shadow-xl">
                  <div className="space-y-6">
                    <p className="text-xl leading-relaxed text-slate-700 font-medium">
                      {mockData.aiCoachMessage.timeBasedGreeting}
                    </p>
                    <p className="text-xl leading-relaxed text-slate-700 font-medium">
                      {mockData.aiCoachMessage.message}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <TodayMissionCard />
          </div>

          <div className="lg:col-span-2">
            <LearningHistoryCalendar />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <WeeklyGoalCard />
          <LearningDashboard />
        </div>
      </div>

      <BottomNavigation activeTab="home" />
    </div>
  )
}
