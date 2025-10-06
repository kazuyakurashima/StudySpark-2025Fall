"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { BottomNavigation } from "@/components/bottom-navigation"
import { ReflectChat } from "./reflect-chat"
import {
  checkReflectAvailability,
  determineWeekType,
  startCoachingSession,
  getCoachingSessions
} from "@/app/actions/reflect"
import { createClient } from "@/lib/supabase/client"
import {
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  Clock,
  AlertCircle,
  History,
  Bot,
} from "lucide-react"

export default function ReflectPage() {
  const [studentName, setStudentName] = useState("")
  const [isAvailable, setIsAvailable] = useState(false)
  const [currentDay, setCurrentDay] = useState("")
  const [currentTime, setCurrentTime] = useState("")
  const [weekType, setWeekType] = useState<"growth" | "stable" | "challenge" | "special" | null>(null)
  const [weekData, setWeekData] = useState<any>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [isStarted, setIsStarted] = useState(false)
  const [summary, setSummary] = useState<string | null>(null)
  const [pastSessions, setPastSessions] = useState<any[]>([])
  const [showHistory, setShowHistory] = useState(false)

  useEffect(() => {
    loadStudentInfo()
    checkAvailability()
    loadWeekType()
    loadPastSessions()
  }, [])

  const loadStudentInfo = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      const { data: student } = await supabase
        .from("students")
        .select("full_name")
        .eq("user_id", user.id)
        .single()

      if (student) {
        setStudentName(student.full_name)
      }
    }
  }

  const checkAvailability = async () => {
    const result = await checkReflectAvailability()
    setIsAvailable(result.isAvailable)
    setCurrentDay(result.currentDay)
    setCurrentTime(result.currentTime)
  }

  const loadWeekType = async () => {
    const result = await determineWeekType()
    if (!result.error) {
      setWeekType(result.weekType)
      setWeekData(result)
    }
  }

  const loadPastSessions = async () => {
    const result = await getCoachingSessions()
    if (!result.error && result.sessions) {
      setPastSessions(result.sessions)
    }
  }

  const handleStartReflect = async () => {
    if (!weekType) return

    const result = await startCoachingSession(weekType)
    if (!result.error && result.sessionId) {
      setSessionId(result.sessionId)
      setIsStarted(true)
    } else {
      alert(result.error || "セッション開始に失敗しました")
    }
  }

  const handleComplete = (generatedSummary: string) => {
    setSummary(generatedSummary)
    setIsStarted(false)
    loadPastSessions()
  }

  const getWeekTypeInfo = () => {
    if (!weekType || !weekData) return null

    const icons = {
      growth: { icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50", label: "成長週" },
      stable: { icon: Minus, color: "text-blue-600", bg: "bg-blue-50", label: "安定週" },
      challenge: { icon: TrendingDown, color: "text-orange-600", bg: "bg-orange-50", label: "挑戦週" },
      special: { icon: Sparkles, color: "text-purple-600", bg: "bg-purple-50", label: "特別週" },
    }

    const info = icons[weekType]
    const Icon = info.icon

    return { Icon, ...info }
  }

  const weekTypeInfo = getWeekTypeInfo()

  if (!isAvailable) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="surface-gradient-primary backdrop-blur-lg border-b border-border/30 p-3 sm:p-4 shadow-lg">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2">
              <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              週次振り返り（リフレクト）
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">AIコーチと一緒に1週間を振り返ろう</p>
          </div>
        </div>

        <div className="max-w-4xl mx-auto p-4">
          <Card className="card-elevated">
            <CardContent className="p-8 text-center">
              <Clock className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">振り返りは土曜日12:00から利用できます</h2>
              <p className="text-muted-foreground mb-4">
                現在: {currentDay}曜日 {currentTime}
              </p>
              <p className="text-sm text-muted-foreground">
                毎週土曜12:00 〜 水曜23:59の期間に、AIコーチと一緒に1週間を振り返ることができます。
              </p>
            </CardContent>
          </Card>
        </div>

        <BottomNavigation />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-20 elegant-fade-in">
      <div className="surface-gradient-primary backdrop-blur-lg border-b border-border/30 p-3 sm:p-4 shadow-lg">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2">
            <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            週次振り返り（リフレクト）
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">AIコーチと一緒に1週間を振り返ろう</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-3 sm:p-4 space-y-4 sm:space-y-6">
        {!isStarted && !summary && weekTypeInfo && weekData && (
          <>
            <Card className={`card-elevated ${weekTypeInfo.bg} border-0 shadow-2xl`}>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-full ${weekTypeInfo.bg} ${weekTypeInfo.color}`}>
                    <weekTypeInfo.Icon className="h-8 w-8" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-bold">{weekTypeInfo.label}</h3>
                      <Badge variant="outline" className={weekTypeInfo.color}>
                        正答率 {weekData.thisWeekAccuracy}%
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {weekType === "growth" && `先週より${weekData.accuracyDiff}%アップ！素晴らしい成長だよ✨`}
                      {weekType === "stable" && "先週と同じペースで安定した学習ができているね。"}
                      {weekType === "challenge" && `今週は挑戦の週だったね。難しい問題に取り組んだからこその結果だよ。`}
                      {weekType === "special" && weekData.upcomingTest && `来週は${weekData.upcomingTest.test_types.name}があるね。準備はどう？`}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-elevated ai-coach-gradient border-0 shadow-2xl premium-glow">
              <CardContent className="p-6 text-center">
                <Bot className="h-16 w-16 text-white mx-auto mb-4" />
                <h2 className="text-xl font-bold text-white mb-2">AIコーチと振り返りを始めよう</h2>
                <p className="text-white/90 mb-6">
                  {studentName}さん、今週の頑張りを一緒に振り返ろう！<br />
                  AIコーチと3〜6往復の対話で、気づきと成長を見つけていくよ。
                </p>
                <Button
                  onClick={handleStartReflect}
                  size="lg"
                  className="bg-white text-primary hover:bg-white/90"
                >
                  <Sparkles className="h-5 w-5 mr-2" />
                  振り返りを始める
                </Button>
              </CardContent>
            </Card>
          </>
        )}

        {isStarted && sessionId && weekTypeInfo && weekData && (
          <ReflectChat
            studentName={studentName}
            sessionId={sessionId}
            weekType={weekType!}
            thisWeekAccuracy={weekData.thisWeekAccuracy}
            lastWeekAccuracy={weekData.lastWeekAccuracy}
            accuracyDiff={weekData.accuracyDiff}
            upcomingTest={weekData.upcomingTest}
            onComplete={handleComplete}
          />
        )}

        {summary && (
          <Card className="card-elevated bg-gradient-to-br from-emerald-50 to-blue-50 border-0 shadow-2xl">
            <CardContent className="p-8 text-center">
              <Sparkles className="h-16 w-16 text-primary mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-primary mb-4">振り返り完了！</h2>
              <div className="bg-white rounded-lg p-6 mb-6">
                <h3 className="text-sm font-semibold text-muted-foreground mb-2">今週の振り返りまとめ</h3>
                <p className="text-lg leading-relaxed">{summary}</p>
              </div>
              <p className="text-muted-foreground">
                また来週も一緒に頑張ろうね！✨
              </p>
            </CardContent>
          </Card>
        )}

        {pastSessions.length > 0 && (
          <Card className="card-elevated">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5 text-primary" />
                  過去の振り返り
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowHistory(!showHistory)}
                >
                  {showHistory ? "閉じる" : "表示する"}
                </Button>
              </div>
            </CardHeader>
            {showHistory && (
              <CardContent className="space-y-4">
                {pastSessions.slice(0, 5).map((session) => (
                  <div
                    key={session.id}
                    className="p-4 bg-muted/30 rounded-lg"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-semibold">
                        {new Date(session.week_start_date).toLocaleDateString("ja-JP")}
                      </p>
                      <Badge variant="outline">
                        {session.week_type === "growth" ? "成長週" :
                         session.week_type === "stable" ? "安定週" :
                         session.week_type === "challenge" ? "挑戦週" : "特別週"}
                      </Badge>
                    </div>
                    {session.summary_text && (
                      <p className="text-sm text-muted-foreground">
                        {session.summary_text}
                      </p>
                    )}
                  </div>
                ))}
              </CardContent>
            )}
          </Card>
        )}
      </div>

      <BottomNavigation />
    </div>
  )
}
