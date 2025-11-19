"use client"

import { useState, useEffect, useRef, lazy, Suspense } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar } from "lucide-react"

// 🚀 真の遅延ロード: スクロールで表示領域に入ってから初めてロード
const LearningHistoryCalendar = lazy(() => import('./learning-history-calendar'))

interface LazyCalendarWrapperProps {
  calendarData: {
    [dateStr: string]: {
      subjectCount: number
      accuracy80Count: number
    }
  }
}

const CalendarSkeleton = () => (
  <Card className="bg-gradient-to-br from-blue-50 to-primary/10 border-primary/20 shadow-lg">
    <CardHeader className="pb-3">
      <CardTitle className="text-lg font-bold flex items-center gap-2">
        <Calendar className="h-6 w-6 text-primary" />
        学習カレンダー
      </CardTitle>
    </CardHeader>
    <CardContent className="px-3 sm:px-6">
      <div className="animate-pulse space-y-4">
        <div className="h-6 bg-slate-200 rounded w-24 mx-auto"></div>
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="w-6 h-6 bg-slate-200 rounded"></div>
          ))}
        </div>
      </div>
    </CardContent>
  </Card>
)

export default function LazyCalendarWrapper({ calendarData }: LazyCalendarWrapperProps) {
  const [shouldLoad, setShouldLoad] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setShouldLoad(true)
          observer.disconnect()
        }
      },
      {
        rootMargin: '200px', // 200px手前から読み込み開始
      }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [])

  return (
    <div ref={ref}>
      {shouldLoad ? (
        <Suspense fallback={<CalendarSkeleton />}>
          <LearningHistoryCalendar calendarData={calendarData} />
        </Suspense>
      ) : (
        <CalendarSkeleton />
      )}
    </div>
  )
}
