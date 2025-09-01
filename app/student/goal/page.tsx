"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Progress } from "@/components/ui/progress"
import { BottomNavigation } from "@/components/bottom-navigation"
import { Calendar, Flag, TrendingUp, Save, Bot, Sparkles, Send, Target, PartyPopper } from "lucide-react"

const testSchedule = [
  { id: "test1", name: "第1回週テスト", date: "2024-08-30", dateDisplay: "8月30日(土)" },
  { id: "test2", name: "第3回合不合判定テスト", date: "2024-09-07", dateDisplay: "9月7日(日)" },
  { id: "test3", name: "第2回週テスト", date: "2024-09-13", dateDisplay: "9月13日(土)" },
  { id: "test4", name: "第3回週テスト", date: "2024-09-20", dateDisplay: "9月20日(土)" },
  { id: "test5", name: "第4回週テスト", date: "2024-09-27", dateDisplay: "9月27日(土)" },
]

const courses = [
  { id: "A", name: "Aコース", description: "基礎重視" },
  { id: "B", name: "Bコース", description: "標準レベル" },
  { id: "C", name: "Cコース", description: "応用重視" },
  { id: "S", name: "Sコース", description: "最難関" },
]

const subjects = [
  { id: "math", name: "算数", color: "bg-blue-100 text-blue-800 border-blue-200" },
  { id: "japanese", name: "国語", color: "bg-green-100 text-green-800 border-green-200" },
  { id: "science", name: "理科", color: "bg-purple-100 text-purple-800 border-purple-200" },
  { id: "social", name: "社会", color: "bg-orange-100 text-orange-800 border-orange-200" },
]

// Mock past performance data
const pastPerformance = [
  { date: "7月", math: 75, japanese: 80, science: 70, social: 85 },
  { date: "6月", math: 70, japanese: 75, science: 65, social: 80 },
  { date: "5月", math: 65, japanese: 70, science: 60, social: 75 },
]

const avatarMap = {
  ai_coach: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/ai_coach-oDEKn6ZVqTbEdoExg9hsYQC4PTNbkt.png",
}

const coachQuestions = [
  "今回のテストに向けて、どんな気持ちで取り組みたい？",
  "前回のテストと比べて、今回特に頑張りたいことはある？",
  "目標を達成したら、どんな気持ちになると思う？",
  "今回のテストで一番大切にしたいことは何？",
]

export default function GoalSettingPage() {
  const [selectedTest, setSelectedTest] = useState("")
  const [selectedCourse, setSelectedCourse] = useState("")
  const [classNumber, setClassNumber] = useState([20])
  const [currentThoughts, setCurrentThoughts] = useState("")
  const [isGeneratingThoughts, setIsGeneratingThoughts] = useState(false)
  const [chatMessages, setChatMessages] = useState<Array<{ id: number; sender: "coach" | "student"; message: string }>>(
    [],
  )
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [studentResponse, setStudentResponse] = useState("")
  const [isChatMode, setIsChatMode] = useState(false)
  const [studentName] = useState("太郎") // デモ用の名前
  const [isGoalSet, setIsGoalSet] = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)
  const [isAiCoachActive, setIsAiCoachActive] = useState(false)

  const handleGoalDecision = () => {
    if (!selectedTest || !selectedCourse) {
      alert("テストとコースを選択してください")
      return
    }

    setIsGoalSet(true)
    setShowCelebration(true)

    setTimeout(() => {
      setShowCelebration(false)
      setIsAiCoachActive(true)
      startDynamicCoachChat()
    }, 3000)
  }

  const startDynamicCoachChat = () => {
    const selectedTestName = testSchedule.find((t) => t.id === selectedTest)?.name || ""
    const selectedCourseName = courses.find((c) => c.id === selectedCourse)?.name || ""
    const targetClass = classNumber[0]

    setIsChatMode(true)
    setCurrentQuestionIndex(0)
    setChatMessages([
      {
        id: 1,
        sender: "coach",
        message: `${studentName}くん、目標設定お疲れさま！🎉\n\n「${selectedTestName}」で「${selectedCourseName}・${targetClass}組」を目指すんだね！\n\nこの目標に向けて、${studentName}くんの気持ちを聞かせて。${coachQuestions[0]}`,
      },
    ])
  }

  const startCoachChat = () => {
    if (!isGoalSet) {
      alert("まず目標を決定してください")
      return
    }
    startDynamicCoachChat()
  }

  const sendStudentResponse = () => {
    if (!studentResponse.trim()) return

    const newMessages = [
      ...chatMessages,
      {
        id: chatMessages.length + 1,
        sender: "student" as const,
        message: studentResponse,
      },
    ]

    if (currentQuestionIndex < coachQuestions.length - 1) {
      const nextIndex = currentQuestionIndex + 1
      newMessages.push({
        id: newMessages.length + 1,
        sender: "coach",
        message: coachQuestions[nextIndex],
      })
      setCurrentQuestionIndex(nextIndex)
    } else {
      const finalMessage = `じゃあ、${studentName}くんの今回のテストにかける想いは、こんな感じってことだよね！\n\n「${generateFinalThoughts()}」\n\nこの気持ちを大切に、一緒に頑張ろう！✨`
      newMessages.push({
        id: newMessages.length + 1,
        sender: "coach",
        message: finalMessage,
      })

      setTimeout(() => {
        setCurrentThoughts(generateFinalThoughts())
        setIsChatMode(false)
      }, 2000)
    }

    setChatMessages(newMessages)
    setStudentResponse("")
  }

  const generateFinalThoughts = () => {
    const responses = chatMessages.filter((msg) => msg.sender === "student").map((msg) => msg.message)
    return `今回の目標に向けて、${responses.join("、")}という気持ちで全力で取り組みます。必ず目標を達成して、成長した自分になりたいです！`
  }

  const generateThoughts = async () => {
    setIsGeneratingThoughts(true)

    await new Promise((resolve) => setTimeout(resolve, 2000))

    const generatedThoughts = `今回の目標に向けて、毎日コツコツと勉強を続けて、必ず目標を達成したいです。分からないところは先生に質問して、一つずつ理解を深めていきます。合格に向けて全力で取り組みます！`

    setCurrentThoughts(generatedThoughts)
    setIsGeneratingThoughts(false)
  }

  const handleSaveGoals = () => {
    if (!isGoalSet) {
      alert("まず目標を決定してください")
      return
    }

    console.log("Goals saved:", {
      selectedTest,
      selectedCourse,
      classNumber: classNumber[0],
      currentThoughts,
    })
    alert("目標を保存しました！")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 pb-20">
      {showCelebration && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute confetti"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                backgroundColor: ["#0891b2", "#0284c7", "#0369a1", "#1e40af"][Math.floor(Math.random() * 4)],
                width: "10px",
                height: "10px",
                borderRadius: "50%",
              }}
            />
          ))}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-8 shadow-2xl pulse-celebration">
              <div className="text-center">
                <PartyPopper className="h-16 w-16 text-primary mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-primary mb-2">目標決定！</h2>
                <p className="text-muted-foreground">素晴らしい目標が設定されました！</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-card/80 backdrop-blur-sm border-b border-border/50 p-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Flag className="h-6 w-6 text-primary" />
            ゴールナビ
          </h1>
          <p className="text-sm text-muted-foreground">目標を設定して、合格に向けて頑張ろう！</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {!isAiCoachActive && (
          <Card className="bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <img
                    src={avatarMap.ai_coach || "/placeholder.svg"}
                    alt="AIコーチ"
                    className="w-12 h-12 rounded-full border-2 border-blue-200"
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Bot className="h-4 w-4 text-blue-600" />
                    <span className="font-semibold text-blue-800">AIコーチからのアドバイス</span>
                  </div>
                  <p className="text-blue-700 leading-relaxed">
                    今日も目標に向かって頑張ろう！まずは自分の現在の気持ちを正直に選んで、無理のない目標設定をしていこう。
                    小さな積み重ねが大きな成果につながるよ。一緒に合格を目指そう！✨
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <Card className={isGoalSet ? "opacity-75" : ""}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  テスト選択
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label>目標テストを選択</Label>
                  <Select value={selectedTest} onValueChange={setSelectedTest} disabled={isGoalSet}>
                    <SelectTrigger>
                      <SelectValue placeholder="テストを選択してください" />
                    </SelectTrigger>
                    <SelectContent>
                      {testSchedule.map((test) => (
                        <SelectItem key={test.id} value={test.id}>
                          <div className="flex flex-col">
                            <span className="font-medium">{test.name}</span>
                            <span className="text-sm text-muted-foreground">{test.dateDisplay}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card className={isGoalSet ? "opacity-75" : ""}>
              <CardHeader>
                <CardTitle>目標の設定</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>目標コースを決めよう</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {courses.map((course) => (
                      <button
                        key={course.id}
                        onClick={() => !isGoalSet && setSelectedCourse(course.id)}
                        disabled={isGoalSet}
                        className={`p-3 rounded-lg border-2 text-center transition-all ${
                          selectedCourse === course.id
                            ? "border-primary bg-primary/10 shadow-md"
                            : "border-border bg-background hover:border-primary/50"
                        } ${isGoalSet ? "cursor-not-allowed" : ""}`}
                      >
                        <div className="font-bold text-lg">{course.name}</div>
                        <div className="text-xs text-muted-foreground">{course.description}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <Label className="text-base font-medium">目標の組を決めよう</Label>
                  <div className="px-3 py-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border border-blue-200">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-blue-800">目標の組</span>
                      <div className="px-3 py-1 bg-blue-600 text-white rounded-full text-sm font-bold">
                        {classNumber[0]}組
                      </div>
                    </div>
                    <Slider
                      value={classNumber}
                      onValueChange={setClassNumber}
                      max={40}
                      min={1}
                      step={1}
                      className="w-full"
                      disabled={isGoalSet}
                    />
                    <div className="flex justify-between text-xs text-blue-600 mt-2 font-medium">
                      <span>1組</span>
                      <span>40組</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {!isGoalSet && (
              <Card className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
                <CardContent className="p-6 text-center">
                  <Target className="h-12 w-12 text-primary mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-primary mb-2">目標を決定しよう！</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    テスト、コース、組を選択したら、目標を決定してください
                  </p>
                  <Button
                    onClick={handleGoalDecision}
                    disabled={!selectedTest || !selectedCourse}
                    className="w-full h-12 text-lg font-bold bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 shadow-lg"
                  >
                    <Sparkles className="h-5 w-5 mr-2" />
                    今回の目標はこれにする！
                  </Button>
                </CardContent>
              </Card>
            )}

            {isAiCoachActive && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    今回の思い
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!isChatMode ? (
                    <>
                      <div className="flex gap-2">
                        <Button
                          onClick={startCoachChat}
                          className="flex items-center gap-2 bg-gradient-to-r from-primary to-accent text-white"
                        >
                          <Bot className="h-4 w-4" />
                          AIコーチと話してみる
                        </Button>
                      </div>

                      <Textarea
                        placeholder="この目標に向けてどんな気持ちですか？どうして頑張りたいですか？"
                        value={currentThoughts}
                        onChange={(e) => setCurrentThoughts(e.target.value)}
                        className="min-h-[120px] resize-none"
                        maxLength={300}
                      />
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground">AIコーチが生成した内容は編集できます</span>
                        <span className="text-muted-foreground">{currentThoughts.length}/300文字</span>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-4">
                      <div className="bg-gray-50 rounded-lg p-4 max-h-80 overflow-y-auto space-y-3">
                        {chatMessages.map((message) => (
                          <div
                            key={message.id}
                            className={`flex ${message.sender === "student" ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className={`flex items-start gap-2 max-w-[80%] ${message.sender === "student" ? "flex-row-reverse" : ""}`}
                            >
                              {message.sender === "coach" && (
                                <img
                                  src={avatarMap.ai_coach || "/placeholder.svg"}
                                  alt="AIコーチ"
                                  className="w-8 h-8 rounded-full flex-shrink-0"
                                />
                              )}
                              <div
                                className={`px-3 py-2 rounded-lg ${
                                  message.sender === "student"
                                    ? "bg-blue-500 text-white"
                                    : "bg-white border border-gray-200"
                                }`}
                              >
                                <p className="text-sm whitespace-pre-line">{message.message}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {currentQuestionIndex < coachQuestions.length && (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={studentResponse}
                            onChange={(e) => setStudentResponse(e.target.value)}
                            placeholder="あなたの気持ちを教えて..."
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            onKeyPress={(e) => e.key === "Enter" && sendStudentResponse()}
                          />
                          <Button onClick={sendStudentResponse} disabled={!studentResponse.trim()} size="sm">
                            <Send className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {isGoalSet && (
              <Button onClick={handleSaveGoals} className="w-full h-12 text-lg font-medium">
                <Save className="h-5 w-5 mr-2" />
                目標を保存する
              </Button>
            )}
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-accent" />
                  過去の実績
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {pastPerformance.map((performance, index) => (
                    <div key={index} className="p-4 rounded-lg bg-accent/5 border border-accent/10">
                      <div className="font-medium mb-3">{performance.date}</div>
                      <div className="grid grid-cols-2 gap-3">
                        {subjects.map((subject) => {
                          const score = performance[subject.id as keyof typeof performance] as number
                          return (
                            <div key={subject.id} className="space-y-1">
                              <div className="flex justify-between items-center">
                                <span className="text-sm">{subject.name}</span>
                                <span className="text-sm font-medium">{score}%</span>
                              </div>
                              <Progress value={score} className="h-2" />
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>現在の目標サマリー</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {selectedTest && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">目標テスト:</span>
                      <span className="text-sm font-medium">
                        {testSchedule.find((t) => t.id === selectedTest)?.name}
                      </span>
                    </div>
                  )}
                  {selectedCourse && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">コース:</span>
                      <span className="text-sm font-medium">{courses.find((c) => c.id === selectedCourse)?.name}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">組:</span>
                    <span className="text-sm font-medium">{classNumber[0]}組</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <BottomNavigation activeTab="goal" />
    </div>
  )
}
