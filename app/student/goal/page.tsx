"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BottomNavigation } from "@/components/bottom-navigation"
import { Calendar, Flag, Save, Bot, Sparkles, Send, Target, PartyPopper, Trophy } from "lucide-react"

const goalTestSchedule = [
  {
    id: "gohan3",
    name: "第3回合不合判定テスト",
    date: "2024-09-07",
    dateDisplay: "9月7日(日)",
    displayStart: "2024-08-01",
    displayEnd: "2024-09-30",
  },
  {
    id: "gohan4",
    name: "第4回合不合判定テスト",
    date: "2024-10-05",
    dateDisplay: "10月5日(日)",
    displayStart: "2024-09-01",
    displayEnd: "2024-10-31",
  },
  {
    id: "gohan5",
    name: "第5回合不合判定テスト",
    date: "2024-11-16",
    dateDisplay: "11月16日(土)",
    displayStart: "2024-10-01",
    displayEnd: "2024-11-30",
  },
  {
    id: "gohan6",
    name: "第6回合不合判定テスト",
    date: "2024-12-07",
    dateDisplay: "12月7日(日)",
    displayStart: "2024-11-01",
    displayEnd: "2024-12-31",
  },
  {
    id: "week2",
    name: "第2回週テスト",
    date: "2024-09-13",
    dateDisplay: "9月13日(土)",
    displayStart: "2024-08-01",
    displayEnd: "2024-09-30",
  },
  {
    id: "week3",
    name: "第3回週テスト",
    date: "2024-09-20",
    dateDisplay: "9月20日(土)",
    displayStart: "2024-08-01",
    displayEnd: "2024-09-30",
  },
  {
    id: "week4",
    name: "第4回週テスト",
    date: "2024-09-27",
    dateDisplay: "9月27日(土)",
    displayStart: "2024-08-01",
    displayEnd: "2024-09-30",
  },
  {
    id: "week5",
    name: "第5回週テスト",
    date: "2024-10-11",
    dateDisplay: "10月11日(土)",
    displayStart: "2024-09-01",
    displayEnd: "2024-10-31",
  },
  {
    id: "week6",
    name: "第6回週テスト",
    date: "2024-10-18",
    dateDisplay: "10月18日(土)",
    displayStart: "2024-09-01",
    displayEnd: "2024-10-31",
  },
  {
    id: "week7",
    name: "第7回週テスト",
    date: "2024-10-25",
    dateDisplay: "10月25日(土)",
    displayStart: "2024-09-01",
    displayEnd: "2024-10-31",
  },
  {
    id: "week8",
    name: "第8回週テスト",
    date: "2024-11-08",
    dateDisplay: "11月8日(土)",
    displayStart: "2024-10-01",
    displayEnd: "2024-11-30",
  },
  {
    id: "week9",
    name: "第9回週テスト",
    date: "2024-11-22",
    dateDisplay: "11月22日(土)",
    displayStart: "2024-10-01",
    displayEnd: "2024-11-30",
  },
  {
    id: "week10",
    name: "第10回週テスト",
    date: "2024-11-29",
    dateDisplay: "11月29日(土)",
    displayStart: "2024-10-01",
    displayEnd: "2024-11-30",
  },
]

const resultTestSchedule = [
  {
    id: "gohan3",
    name: "第3回合不合判定テスト",
    date: "2024-09-07",
    dateDisplay: "9月7日(日)",
    displayStart: "2024-09-07",
    displayEnd: "2024-10-31",
  },
  {
    id: "gohan4",
    name: "第4回合不合判定テスト",
    date: "2024-10-05",
    dateDisplay: "10月5日(日)",
    displayStart: "2024-10-05",
    displayEnd: "2024-11-30",
  },
  {
    id: "gohan5",
    name: "第5回合不合判定テスト",
    date: "2024-11-16",
    dateDisplay: "11月16日(土)",
    displayStart: "2024-11-16",
    displayEnd: "2024-12-31",
  },
  {
    id: "gohan6",
    name: "第6回合不合判定テスト",
    date: "2024-12-07",
    dateDisplay: "12月7日(日)",
    displayStart: "2024-12-07",
    displayEnd: "2025-01-31",
  },
  {
    id: "week2",
    name: "第2回週テスト",
    date: "2024-09-13",
    dateDisplay: "9月13日(土)",
    displayStart: "2024-09-13",
    displayEnd: "2024-10-31",
  },
  {
    id: "week3",
    name: "第3回週テスト",
    date: "2024-09-20",
    dateDisplay: "9月20日(土)",
    displayStart: "2024-09-20",
    displayEnd: "2024-10-31",
  },
  {
    id: "week4",
    name: "第4回週テスト",
    date: "2024-09-27",
    dateDisplay: "9月27日(土)",
    displayStart: "2024-09-27",
    displayEnd: "2024-10-31",
  },
  {
    id: "week5",
    name: "第5回週テスト",
    date: "2024-10-11",
    dateDisplay: "10月11日(土)",
    displayStart: "2024-10-11",
    displayEnd: "2024-11-30",
  },
  {
    id: "week6",
    name: "第6回週テスト",
    date: "2024-10-18",
    dateDisplay: "10月18日(土)",
    displayStart: "2024-10-18",
    displayEnd: "2024-11-30",
  },
  {
    id: "week7",
    name: "第7回週テスト",
    date: "2024-10-25",
    dateDisplay: "10月25日(土)",
    displayStart: "2024-10-25",
    displayEnd: "2024-11-30",
  },
  {
    id: "week8",
    name: "第8回週テスト",
    date: "2024-11-08",
    dateDisplay: "11月8日(土)",
    displayStart: "2024-11-08",
    displayEnd: "2024-12-31",
  },
  {
    id: "week9",
    name: "第9回週テスト",
    date: "2024-11-22",
    dateDisplay: "11月22日(土)",
    displayStart: "2024-11-22",
    displayEnd: "2024-12-31",
  },
  {
    id: "week10",
    name: "第10回週テスト",
    date: "2024-11-29",
    dateDisplay: "11月29日(土)",
    displayStart: "2024-11-29",
    displayEnd: "2024-12-31",
  },
]

const courses = [
  { id: "S", name: "Sコース", description: "最難関校" },
  { id: "C", name: "Cコース", description: "難関校" },
  { id: "B", name: "Bコース", description: "有名校" },
  { id: "A", name: "Aコース", description: "標準校" },
]

const subjects = [
  {
    id: "math",
    name: "算数",
    color: "bg-blue-50 text-blue-700 border-blue-200",
    sliderColor: "data-[state=active]:bg-blue-500",
    targetColor: "text-blue-700",
    buttonColor: "border-blue-200 hover:bg-blue-50 hover:text-blue-700",
  },
  {
    id: "japanese",
    name: "国語",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    sliderColor: "data-[state=active]:bg-emerald-500",
    targetColor: "text-emerald-700",
    buttonColor: "border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700",
  },
  {
    id: "science",
    name: "理科",
    color: "bg-violet-50 text-violet-700 border-violet-200",
    sliderColor: "data-[state=active]:bg-violet-500",
    targetColor: "text-violet-700",
    buttonColor: "border-violet-200 hover:bg-violet-50 hover:text-violet-700",
  },
  {
    id: "social",
    name: "社会",
    color: "bg-amber-50 text-amber-700 border-amber-200",
    sliderColor: "data-[state=active]:bg-amber-500",
    targetColor: "text-amber-700",
    buttonColor: "border-amber-200 hover:bg-amber-50 hover:text-amber-700",
  },
]

const mockPastResults = {
  math: 52,
  japanese: 48,
  science: 45,
  social: 55,
}

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
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([])
  const [goalMode, setGoalMode] = useState<"based_on_results" | "self_decide" | "">("")
  const [subjectGoals, setSubjectGoals] = useState({
    math: [50],
    japanese: [50],
    science: [50],
    social: [50],
  })
  const [autoProposalMode, setAutoProposalMode] = useState<"equal_plus" | "weakness_boost" | "maintain">(
    "weakness_boost",
  )

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
  const [activeTab, setActiveTab] = useState<"goal" | "result">("goal")
  const [resultTest, setResultTest] = useState("")
  const [resultCourse, setResultCourse] = useState("")
  const [resultClass, setResultClass] = useState([20])
  const [resultThoughts, setResultThoughts] = useState("")
  const [subjectScores, setSubjectScores] = useState({
    math: [75],
    japanese: [80],
    science: [70],
    social: [85],
  })

  const getTestType = (testId: string): "gohan" | "week" => {
    return testId.startsWith("gohan") ? "gohan" : "week"
  }

  const handleSubjectToggle = (subjectId: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(subjectId) ? prev.filter((id) => id !== subjectId) : [...prev, subjectId],
    )
  }

  const applyAutoProposal = () => {
    if (goalMode !== "based_on_results") return

    const newGoals = { ...subjectGoals }

    if (autoProposalMode === "equal_plus") {
      // 全科目 +1
      selectedSubjects.forEach((subjectId) => {
        const currentValue = mockPastResults[subjectId as keyof typeof mockPastResults] || 50
        newGoals[subjectId as keyof typeof newGoals] = [Math.min(80, Math.max(20, currentValue + 1))]
      })
    } else if (autoProposalMode === "weakness_boost") {
      // 弱点底上げ（成績低い順に +3/+2/+1/+0）
      const sortedSubjects = selectedSubjects.sort((a, b) => {
        const aScore = mockPastResults[a as keyof typeof mockPastResults] || 50
        const bScore = mockPastResults[b as keyof typeof mockPastResults] || 50
        return aScore - bScore
      })

      const boosts = [3, 2, 1, 0]
      sortedSubjects.forEach((subjectId, index) => {
        const currentValue = mockPastResults[subjectId as keyof typeof mockPastResults] || 50
        const boost = boosts[index] || 0
        newGoals[subjectId as keyof typeof newGoals] = [Math.min(80, Math.max(20, currentValue + boost))]
      })
    } else if (autoProposalMode === "maintain") {
      // 現状維持
      selectedSubjects.forEach((subjectId) => {
        const currentValue = mockPastResults[subjectId as keyof typeof mockPastResults] || 50
        newGoals[subjectId as keyof typeof newGoals] = [Math.min(80, Math.max(20, currentValue))]
      })
    }

    setSubjectGoals(newGoals)
  }

  const initializeSelfDecideMode = () => {
    const newGoals = { ...subjectGoals }
    selectedSubjects.forEach((subjectId) => {
      newGoals[subjectId as keyof typeof newGoals] = [50]
    })
    setSubjectGoals(newGoals)
  }

  const handleGoalDecision = () => {
    const testType = getTestType(selectedTest)

    if (testType === "gohan") {
      if (!selectedTest || !selectedCourse) {
        alert("テストとコースを選択してください")
        return
      }
    } else if (testType === "week") {
      if (!selectedTest || selectedSubjects.length === 0 || !goalMode) {
        alert("テスト、対象科目、目標設定モードを選択してください")
        return
      }
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
    const testType = getTestType(selectedTest)
    const selectedTestName = goalTestSchedule.find((t) => t.id === selectedTest)?.name || ""

    let goalDescription = ""
    if (testType === "gohan") {
      const selectedCourseName = courses.find((c) => c.id === selectedCourse)?.name || ""
      const targetClass = classNumber[0]
      goalDescription = `「${selectedTestName}」で「${selectedCourseName}・${targetClass}組」を目指す`
    } else {
      const subjectNames = selectedSubjects.map((id) => subjects.find((s) => s.id === id)?.name).join("、")
      goalDescription = `「${selectedTestName}」で${subjectNames}の目標偏差値達成を目指す`
    }

    setIsChatMode(true)
    setCurrentQuestionIndex(0)
    setChatMessages([
      {
        id: 1,
        sender: "coach",
        message: `${studentName}くん、目標設定お疲れさま！🎉\n\n${goalDescription}んだね！\n\nこの目標に向けて、${studentName}くんの気持ちを聞かせて。${coachQuestions[0]}`,
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

  const handleSaveResults = () => {
    console.log("Results saved:", {
      resultTest,
      resultCourse,
      resultClass: resultClass[0],
      subjectScores,
      resultThoughts,
    })
    alert("実績を保存しました！")
  }

  const getAvailableTests = (isGoalTab: boolean) => {
    const schedule = isGoalTab ? goalTestSchedule : resultTestSchedule
    return schedule.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }

  const [goalSettingMode, setGoalSettingMode] = useState<"based" | "manual">("based")
  const [autoSuggestionMode, setAutoSuggestionMode] = useState<string>("weakness_boost")

  const autoSuggestionModes = [
    {
      id: "weakness_boost",
      name: "弱点底上げ",
      description: "成績が低い科目を重点的に底上げします。",
    },
    {
      id: "equal_plus",
      name: "全科目+1",
      description: "全科目の目標値を少し上げます。",
    },
    {
      id: "maintain",
      name: "現状維持",
      description: "現状の成績を維持することを目標にします。",
    },
  ]

  const canSetGoal =
    selectedTest &&
    ((getTestType(selectedTest) === "gohan" && selectedCourse) ||
      (getTestType(selectedTest) === "week" && goalSettingMode && (goalSettingMode === "manual" || autoSuggestionMode)))

  const getSubjectColor = (subjectId: string) => {
    switch (subjectId) {
      case "math":
        return {
          badge: "bg-blue-50 text-blue-700 border-blue-200",
          value: "text-blue-700",
          background: "border-blue-200 bg-blue-50/30",
        }
      case "japanese":
        return {
          badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
          value: "text-emerald-700",
          background: "border-emerald-200 bg-emerald-50/30",
        }
      case "science":
        return {
          badge: "bg-violet-50 text-violet-700 border-violet-200",
          value: "text-violet-700",
          background: "border-violet-200 bg-violet-50/30",
        }
      case "social":
        return {
          badge: "bg-amber-50 text-amber-700 border-amber-200",
          value: "text-amber-700",
          background: "border-amber-200 bg-amber-50/30",
        }
      default:
        return {
          badge: "bg-gray-50 text-gray-700 border-gray-200",
          value: "text-gray-700",
          background: "border-gray-200 bg-gray-50/30",
        }
    }
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

      <div className="bg-card/80 backdrop-blur-sm border-b border-border/50 p-3 sm:p-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2">
            <Flag className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            ゴールナビ
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">目標を設定して、合格に向けて頑張ろう！</p>

          <div className="flex gap-1 mt-3 sm:mt-4 bg-muted p-1 rounded-lg">
            <button
              onClick={() => setActiveTab("goal")}
              className={`flex-1 px-2 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-all ${
                activeTab === "goal"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Target className="h-3 w-3 sm:h-4 sm:w-4 inline mr-1 sm:mr-2" />
              目標入力
            </button>
            <button
              onClick={() => setActiveTab("result")}
              className={`flex-1 px-2 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-all ${
                activeTab === "result"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Trophy className="h-3 w-3 sm:h-4 sm:w-4 inline mr-1 sm:mr-2" />
              実績入力
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-3 sm:p-4 space-y-4 sm:space-y-6">
        {activeTab === "goal" ? (
          <>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
              <div className="space-y-4 sm:space-y-6">
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

                <Card className={isGoalSet ? "opacity-75" : ""}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-primary" />
                      テスト選択
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 sm:space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm sm:text-base">対象テストを選択してください</Label>
                      <Select value={selectedTest} onValueChange={setSelectedTest} disabled={isGoalSet}>
                        <SelectTrigger className="h-10 sm:h-11">
                          <SelectValue placeholder="テストを選択してください" />
                        </SelectTrigger>
                        <SelectContent>
                          {getAvailableTests(true).map((test) => (
                            <SelectItem key={test.id} value={test.id}>
                              <div className="flex flex-col">
                                <span className="font-medium">{test.name}</span>
                                <span className="text-xs text-muted-foreground">{test.dateDisplay}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedTest && (
                      <div className="mt-4 p-3 bg-primary/10 rounded-lg border border-primary/20">
                        <p className="text-sm text-primary font-medium">
                          選択中: {getAvailableTests(true).find((t) => t.id === selectedTest)?.name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          実施日: {getAvailableTests(true).find((t) => t.id === selectedTest)?.dateDisplay}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          種類: {getTestType(selectedTest) === "gohan" ? "合不合判定テスト" : "週テスト"}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {selectedTest && getTestType(selectedTest) === "gohan" && (
                  <Card className={isGoalSet ? "opacity-75" : ""}>
                    <CardHeader>
                      <CardTitle>目標の設定</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 sm:space-y-6">
                      <div className="space-y-2">
                        <Label className="text-sm sm:text-base">目標コースを決めよう</Label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                          {courses.map((course) => (
                            <button
                              key={course.id}
                              onClick={() => !isGoalSet && setSelectedCourse(course.id)}
                              disabled={isGoalSet}
                              className={`p-3 sm:p-4 rounded-lg border-2 text-center transition-all min-h-[60px] sm:min-h-[70px] ${
                                selectedCourse === course.id
                                  ? "border-primary bg-primary/10 shadow-md"
                                  : "border-border bg-background hover:border-primary/50"
                              } ${isGoalSet ? "cursor-not-allowed" : ""}`}
                            >
                              <div className="font-bold text-base sm:text-lg">{course.name}</div>
                              <div className="text-xs sm:text-sm text-muted-foreground">{course.description}</div>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-3 sm:space-y-4">
                        <Label className="text-sm sm:text-base font-medium">目標の組を決めよう</Label>
                        <div className="px-3 sm:px-4 py-3 sm:py-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border border-blue-200">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-xs sm:text-sm font-medium text-blue-800">目標の組</span>
                            <div className="px-2 sm:px-3 py-1 bg-blue-600 text-white rounded-full text-xs sm:text-sm font-bold">
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
                )}

                {selectedTest && getTestType(selectedTest) === "week" && (
                  <>
                    <Card className={isGoalSet ? "opacity-75" : ""}>
                      <CardHeader>
                        <CardTitle>目標設定の方法を選択してください</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3 sm:space-y-4">
                        <Label className="text-sm sm:text-base">目標設定の方法を選択してください</Label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                          <button
                            onClick={() => setGoalSettingMode("based")}
                            className={`p-3 sm:p-4 rounded-lg border-2 text-center transition-all min-h-[60px] ${
                              goalSettingMode === "based"
                                ? "border-primary bg-primary/10 shadow-md"
                                : "border-border bg-background hover:border-primary/50"
                            }`}
                          >
                            <div className="text-xs sm:text-sm font-medium">週テスト結果にもとづく</div>
                          </button>
                          <button
                            onClick={() => setGoalSettingMode("manual")}
                            className={`p-3 sm:p-4 rounded-lg border-2 text-center transition-all min-h-[60px] ${
                              goalSettingMode === "manual"
                                ? "border-primary bg-primary/10 shadow-md"
                                : "border-border bg-background hover:border-primary/50"
                            }`}
                          >
                            <div className="text-xs sm:text-sm font-medium">自分で決める</div>
                          </button>
                        </div>
                      </CardContent>
                    </Card>

                    {goalSettingMode === "based" && (
                      <Card className={isGoalSet ? "opacity-75" : ""}>
                        <CardHeader>
                          <CardTitle>自動提案モード</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 sm:space-y-4">
                          <Label className="text-sm sm:text-base">自動提案モードを選択してください</Label>
                          <div className="grid grid-cols-1 gap-2 sm:gap-3">
                            {autoSuggestionModes.map((mode) => (
                              <button
                                key={mode.id}
                                onClick={() => setAutoSuggestionMode(mode.id)}
                                className={`p-3 sm:p-4 rounded-lg border-2 text-left transition-all ${
                                  autoSuggestionMode === mode.id
                                    ? "border-primary bg-primary/10 shadow-md"
                                    : "border-border bg-background hover:border-primary/50"
                                }`}
                              >
                                <div className="text-xs sm:text-sm font-medium">{mode.name}</div>
                                <div className="text-xs text-muted-foreground mt-1">{mode.description}</div>
                              </button>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {goalSettingMode &&
                      (goalSettingMode === "manual" || (goalSettingMode === "based" && autoSuggestionMode)) && (
                        <Card className={isGoalSet ? "opacity-75" : ""}>
                          <CardHeader>
                            <CardTitle>科目別目標偏差値</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            {subjects.map((subject) => {
                              const pastResult = mockPastResults[subject.id as keyof typeof mockPastResults]
                              return (
                                <div
                                  key={subject.id}
                                  className="space-y-3 p-4 rounded-lg border border-slate-100 bg-slate-50/30"
                                >
                                  <div className="flex items-center justify-between">
                                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${subject.color}`}>
                                      {subject.name}
                                    </div>
                                    <div className="flex items-center gap-3">
                                      {goalSettingMode === "based" && (
                                        <span className="text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded">
                                          前回: {pastResult}
                                        </span>
                                      )}
                                      <span
                                        className={`text-sm font-bold ${subject.targetColor} bg-white px-2 py-1 rounded border`}
                                      >
                                        目標: {subjectGoals[subject.id as keyof typeof subjectGoals][0]}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="relative">
                                    <Slider
                                      value={subjectGoals[subject.id as keyof typeof subjectGoals]}
                                      onValueChange={(value) =>
                                        setSubjectGoals((prev) => ({
                                          ...prev,
                                          [subject.id]: value,
                                        }))
                                      }
                                      max={80}
                                      min={20}
                                      step={1}
                                      className={`w-full ${subject.sliderColor}`}
                                      disabled={isGoalSet}
                                    />
                                  </div>
                                  <div className="flex justify-between text-xs text-slate-500">
                                    <span>20</span>
                                    <span>80</span>
                                  </div>
                                  <div className="flex gap-2 mt-3">
                                    {[40, 50, 60, 70].map((value) => (
                                      <Button
                                        key={value}
                                        variant="outline"
                                        size="sm"
                                        className={`text-xs px-3 py-1 h-7 bg-white transition-colors ${subject.buttonColor}`}
                                        onClick={() =>
                                          setSubjectGoals((prev) => ({
                                            ...prev,
                                            [subject.id]: [value],
                                          }))
                                        }
                                        disabled={isGoalSet}
                                      >
                                        {value}
                                      </Button>
                                    ))}
                                  </div>
                                </div>
                              )
                            })}
                          </CardContent>
                        </Card>
                      )}
                  </>
                )}

                {!isGoalSet && selectedTest && (
                  <Card className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
                    <CardContent className="p-6 text-center">
                      <Target className="h-12 w-12 text-primary mx-auto mb-4" />
                      <h3 className="text-lg font-bold text-primary mb-2">
                        {getTestType(selectedTest) === "gohan" ? "目標を決定しよう！" : "今週はこれで行く！"}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        {getTestType(selectedTest) === "gohan"
                          ? "テスト、コース、組を選択したら、目標を決定してください"
                          : "テスト、科目、目標設定モードを選択したら、目標を決定してください"}
                      </p>
                      <Button
                        onClick={handleGoalDecision}
                        disabled={!canSetGoal}
                        className="w-full h-11 sm:h-12 text-sm sm:text-lg font-medium bg-primary text-primary-foreground hover:bg-primary/90"
                      >
                        <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                        {getTestType(selectedTest) === "gohan" ? "今回の目標はこれにする！" : "今週はこれで行く！"}
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
                            className="min-h-[100px] sm:min-h-[120px] resize-none text-sm sm:text-base"
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
                  <Button onClick={handleSaveGoals} className="w-full h-11 sm:h-12 text-sm sm:text-lg font-medium">
                    <Save className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                    目標を保存する
                  </Button>
                )}
              </div>
            </div>
          </>
        ) : (
          <>
            <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <img
                      src={avatarMap.ai_coach || "/placeholder.svg"}
                      alt="AIコーチ"
                      className="w-12 h-12 rounded-full border-2 border-green-200"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Trophy className="h-4 w-4 text-green-600" />
                      <span className="font-semibold text-green-800">AIコーチからのメッセージ</span>
                    </div>
                    <p className="text-green-700 leading-relaxed">
                      テストお疲れさま！結果はどうだったかな？良い結果も思うようにいかなかった結果も、
                      すべて次への成長につながる大切な経験だよ。正直に記録して、次の目標に活かそう！✨
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
              <div className="space-y-4 sm:space-y-6">
                {activeTab === "result" && (
                  <div className="space-y-4 sm:space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Calendar className="h-5 w-5 text-primary" />
                          テスト選択
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3 sm:space-y-4">
                        <div className="space-y-2">
                          <Label className="text-sm sm:text-base">対象テストを選択してください</Label>
                          <Select value={resultTest} onValueChange={setResultTest}>
                            <SelectTrigger className="h-10 sm:h-11">
                              <SelectValue placeholder="テストを選択してください" />
                            </SelectTrigger>
                            <SelectContent>
                              {getAvailableTests(false).map((test) => (
                                <SelectItem key={test.id} value={test.id}>
                                  <div className="flex flex-col">
                                    <span className="font-medium">{test.name}</span>
                                    <span className="text-xs text-muted-foreground">{test.dateDisplay}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {resultTest && (
                          <div className="mt-4 p-3 bg-primary/10 rounded-lg border border-primary/20">
                            <p className="text-sm text-primary font-medium">
                              選択中: {getAvailableTests(false).find((t) => t.id === resultTest)?.name}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              実施日: {getAvailableTests(false).find((t) => t.id === resultTest)?.dateDisplay}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              種類: {getTestType(resultTest) === "gohan" ? "合不合判定テスト" : "週テスト"}
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {resultTest && getTestType(resultTest) === "gohan" && (
                      <Card>
                        <CardHeader>
                          <CardTitle>実績の記録</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 sm:space-y-6">
                          <div className="space-y-2">
                            <Label className="text-sm sm:text-base">実際のコース</Label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                              {courses.map((course) => (
                                <button
                                  key={course.id}
                                  onClick={() => setResultCourse(course.id)}
                                  className={`p-3 sm:p-4 rounded-lg border-2 text-center transition-all min-h-[60px] sm:min-h-[70px] ${
                                    resultCourse === course.id
                                      ? "border-primary bg-primary/10 shadow-md"
                                      : "border-border bg-background hover:border-primary/50"
                                  }`}
                                >
                                  <div className="font-bold text-base sm:text-lg">{course.name}</div>
                                  <div className="text-xs sm:text-sm text-muted-foreground">{course.description}</div>
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-3 sm:space-y-4">
                            <Label className="text-sm sm:text-base font-medium">実際の組</Label>
                            <div className="px-3 sm:px-4 py-3 sm:py-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
                              <div className="flex items-center justify-between mb-3">
                                <span className="text-xs sm:text-sm font-medium text-green-800">実際の組</span>
                                <div className="px-2 sm:px-3 py-1 bg-green-600 text-white rounded-full text-xs sm:text-sm font-bold">
                                  {resultClass[0]}組
                                </div>
                              </div>
                              <Slider
                                value={resultClass}
                                onValueChange={setResultClass}
                                max={40}
                                min={1}
                                step={1}
                                className="w-full"
                              />
                              <div className="flex justify-between text-xs text-green-600 mt-2 font-medium">
                                <span>1組</span>
                                <span>40組</span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {resultTest && getTestType(resultTest) === "week" && (
                      <Card>
                        <CardHeader>
                          <CardTitle>科目別実績偏差値</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {subjects.map((subject) => {
                            const pastResult = mockPastResults[subject.id as keyof typeof mockPastResults]
                            return (
                              <div
                                key={subject.id}
                                className="space-y-3 p-4 rounded-lg border border-slate-100 bg-slate-50/30"
                              >
                                <div className="flex items-center justify-between">
                                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${subject.color}`}>
                                    {subject.name}
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span className="text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded">
                                      前回: {pastResult}
                                    </span>
                                    <span
                                      className={`text-sm font-bold ${subject.targetColor} bg-white px-2 py-1 rounded border`}
                                    >
                                      実績: {subjectScores[subject.id as keyof typeof subjectScores][0]}
                                    </span>
                                  </div>
                                </div>
                                <div className="relative">
                                  <Slider
                                    value={subjectScores[subject.id as keyof typeof subjectScores]}
                                    onValueChange={(value) =>
                                      setSubjectScores((prev) => ({
                                        ...prev,
                                        [subject.id]: value,
                                      }))
                                    }
                                    max={80}
                                    min={20}
                                    step={1}
                                    className={`w-full ${subject.sliderColor}`}
                                  />
                                </div>
                                <div className="flex justify-between text-xs text-slate-500">
                                  <span>20</span>
                                  <span>80</span>
                                </div>
                                <div className="flex gap-2 mt-3">
                                  {[40, 50, 60, 70].map((value) => (
                                    <Button
                                      key={value}
                                      variant="outline"
                                      size="sm"
                                      className={`text-xs px-3 py-1 h-7 bg-white transition-colors ${subject.buttonColor}`}
                                      onClick={() =>
                                        setSubjectScores((prev) => ({
                                          ...prev,
                                          [subject.id]: [value],
                                        }))
                                      }
                                    >
                                      {value}
                                    </Button>
                                  ))}
                                </div>
                              </div>
                            )
                          })}
                        </CardContent>
                      </Card>
                    )}

                    {resultTest && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-primary" />
                            テストの振り返り
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <Textarea
                            placeholder="今回のテストはどうでしたか？良かった点、改善したい点、次に向けての気持ちを書いてみましょう。"
                            value={resultThoughts}
                            onChange={(e) => setResultThoughts(e.target.value)}
                            className="min-h-[100px] sm:min-h-[120px] resize-none text-sm sm:text-base"
                            maxLength={300}
                          />
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-muted-foreground">正直な気持ちを書いてみよう</span>
                            <span className="text-muted-foreground">{resultThoughts.length}/300文字</span>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {resultTest && (
                      <Button
                        onClick={handleSaveResults}
                        className="w-full h-11 sm:h-12 text-sm sm:text-lg font-medium"
                      >
                        <Save className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                        実績を保存する
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      <BottomNavigation activeTab={activeTab} />
    </div>
  )
}
