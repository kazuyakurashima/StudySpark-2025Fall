"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react"

interface LearningHistoryCalendarProps {
  calendarData: {
    [dateStr: string]: {
      subjectCount: number
      accuracy80Count: number
    }
  }
}

export default function LearningHistoryCalendar({ calendarData }: LearningHistoryCalendarProps) {
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

  // JST で年月日を取得するヘルパー関数
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

  // 選択された月のデータのみ生成（JST 基準）
  const targetMonth = selectedMonth
  const targetParts = getJSTDateParts(targetMonth)
  const monthKey = `${targetParts.year}-${String(targetParts.month).padStart(2, "0")}`
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
      const intensity = getLearningIntensity(dateStr)
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
