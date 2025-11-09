"use client"

import { useEffect, useState, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BottomNavigation } from "@/components/bottom-navigation"
import { UserProfileHeader } from "@/components/common/user-profile-header"
import { PageHeader } from "@/components/common/page-header"
import { ReflectChat } from "./reflect-chat"
import { AchievementMap } from "./achievement-map"
import { StudyHistory } from "./study-history"
import { EncouragementHistory } from "./encouragement-history"
import { CoachingHistory } from "./coaching-history"
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { UserProfileProvider } from "@/lib/hooks/use-user-profile"

const AVATAR_AI_COACH = "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/ai_coach-oDEKn6ZVqTbEdoExg9hsYQC4PTNbkt.png"

function ReflectPageInner() {
  const [studentName, setStudentName] = useState("")
  const [studentGrade, setStudentGrade] = useState(5)
  const [studentCourse, setStudentCourse] = useState("A")
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
  const [isCompletedThisWeek, setIsCompletedThisWeek] = useState(false)
  const reflectChatRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadStudentInfo()
    checkAvailability()
    loadWeekType()
    loadPastSessions()
    checkThisWeekCompletion()
  }, [])

  const loadStudentInfo = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      const { data: student } = await supabase
        .from("students")
        .select("full_name, grade, course")
        .eq("user_id", user.id)
        .single()

      if (student) {
        setStudentName(student.full_name)
        setStudentGrade(student.grade)
        setStudentCourse(student.course)
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

  const checkThisWeekCompletion = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return

    const { data: student } = await supabase
      .from("students")
      .select("id")
      .eq("user_id", user.id)
      .single()

    if (!student) return

    // 今週の月曜日を取得（JST基準）
    const now = new Date()
    const dayOfWeek = now.getDay()
    const diff = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek // 月曜日への日数差
    const thisMonday = new Date(now)
    thisMonday.setDate(now.getDate() + diff)
    thisMonday.setHours(0, 0, 0, 0)

    const weekStartStr = `${thisMonday.getFullYear()}-${String(thisMonday.getMonth() + 1).padStart(2, '0')}-${String(thisMonday.getDate()).padStart(2, '0')}`

    // 今週の完了済みセッションをチェック
    const { data: completedSession } = await supabase
      .from("coaching_sessions")
      .select("id, completed_at, summary_text")
      .eq("student_id", student.id)
      .gte("week_start_date", weekStartStr)
      .not("completed_at", "is", null)
      .maybeSingle()

    if (completedSession) {
      setIsCompletedThisWeek(true)
      if (completedSession.summary_text) {
        setSummary(completedSession.summary_text)
      }
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

  // リフレクトチャット表示時にチャットカードの位置へスクロール
  useEffect(() => {
    if (isStarted && sessionId && reflectChatRef.current) {
      // DOMレンダリング完了を待ってからスクロール
      setTimeout(() => {
        // UserProfileHeaderの高さ（約60px）+ PageHeaderの高さ（約100px）+ 余白を考慮
        const headerOffset = 180
        const elementPosition = reflectChatRef.current!.getBoundingClientRect().top
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset

        window.scrollTo({
          top: offsetPosition,
          behavior: "smooth"
        })
      }, 100)
    }
  }, [isStarted, sessionId])

  const handleComplete = (generatedSummary: string) => {
    setSummary(generatedSummary)
    setIsStarted(false)
    setIsCompletedThisWeek(true)
    loadPastSessions()
  }

  const getWeekTypeInfo = () => {
    if (!weekType || !weekData) return null

    const icons = {
      growth: {
        icon: TrendingUp,
        color: "text-emerald-600",
        bg: "bg-emerald-50",
        label: "成長週",
        description: "先週より正答率10%以上アップ！成功要因を深掘りしよう"
      },
      stable: {
        icon: Minus,
        color: "text-blue-600",
        bg: "bg-blue-50",
        label: "安定週",
        description: "正答率が安定しているね。新しい挑戦を考えてみよう"
      },
      challenge: {
        icon: TrendingDown,
        color: "text-orange-600",
        bg: "bg-orange-50",
        label: "挑戦週",
        description: "正答率が下がった週。難しい問題に挑戦したからこその結果だよ"
      },
      special: {
        icon: Sparkles,
        color: "text-purple-600",
        bg: "bg-purple-50",
        label: "特別週",
        description: "来週は大きなテスト！対策を一緒に考えよう"
      },
    }

    const info = icons[weekType]
    const Icon = info.icon

    return { Icon, ...info }
  }

  const weekTypeInfo = getWeekTypeInfo()


  return (
    <>
      <UserProfileHeader />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 pb-20 elegant-fade-in">
        <PageHeader
          icon={Calendar}
          title="週次振り返り（リフレクト）"
          subtitle="AIコーチと一緒に1週間を振り返ろう"
          variant="student"
        />

        <div className="max-w-screen-xl mx-auto p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
        {isAvailable && isStarted && sessionId && weekTypeInfo && weekData && (
          <div ref={reflectChatRef}>
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
          </div>
        )}

        {/* 4つのタブ表示 */}
        <Tabs defaultValue="achievement" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="achievement">達成マップ</TabsTrigger>
            <TabsTrigger value="history">学習履歴</TabsTrigger>
            <TabsTrigger value="encouragement">応援履歴</TabsTrigger>
            <TabsTrigger value="coaching">コーチング履歴</TabsTrigger>
          </TabsList>

          <TabsContent value="achievement" className="mt-6">
            <AchievementMap studentGrade={studentGrade} studentCourse={studentCourse} />
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            <StudyHistory />
          </TabsContent>

          <TabsContent value="encouragement" className="mt-6">
            <EncouragementHistory />
          </TabsContent>

          <TabsContent value="coaching" className="mt-6">
            <CoachingHistory />
          </TabsContent>
        </Tabs>

        {/* 振り返り完了カード（タブの下に配置） */}
        {isAvailable && isCompletedThisWeek && summary && (
          <Card className="card-elevated bg-gradient-to-br from-emerald-50 to-blue-50 border-0 shadow-2xl">
            <CardContent className="p-8 text-center">
              <Sparkles className="h-16 w-16 text-primary mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-primary mb-4">今週の振り返り完了！</h2>
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

        {isAvailable && isCompletedThisWeek && !summary && (
          <Card className="card-elevated bg-gradient-to-br from-emerald-50 to-blue-50 border-0 shadow-2xl">
            <CardContent className="p-8 text-center">
              <Sparkles className="h-16 w-16 text-primary mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-primary mb-4">今週の振り返り完了！</h2>
              <p className="text-muted-foreground">
                今週の振り返りはもう完了しているよ。<br />
                また来週も一緒に頑張ろうね！✨
              </p>
            </CardContent>
          </Card>
        )}

        {/* AIコーチカードと週タイプカード（タブの下に配置） */}
        {isAvailable && !isStarted && !summary && !isCompletedThisWeek && weekTypeInfo && weekData && (
          <>
            <Card className="card-elevated ai-coach-gradient border-0 shadow-2xl premium-glow">
              <CardContent className="p-6 text-center">
                <Avatar className="h-20 w-20 mx-auto mb-4 border-4 border-white shadow-2xl">
                  <AvatarImage src={AVATAR_AI_COACH} alt="AIコーチ" />
                  <AvatarFallback className="bg-white text-primary font-bold text-2xl">AI</AvatarFallback>
                </Avatar>
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
                    <p className="text-sm text-slate-600 mb-2 font-medium">
                      {weekTypeInfo.description}
                    </p>
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
          </>
        )}

        {!isAvailable && (
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
        )}
        </div>
      </div>

      <BottomNavigation />
    </>
  )
}

/**
 * リフレクトページ（Context Provider付き）
 */
export default function ReflectPage() {
  return (
    <UserProfileProvider>
      <ReflectPageInner />
    </UserProfileProvider>
  )
}
