"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { BottomNavigation } from "@/components/bottom-navigation"
import { Calendar, Flag, Save, Bot, Sparkles, Target, PartyPopper, Award, TrendingUp, CheckCircle2 } from "lucide-react"
import { GoalNavigationChat } from "./goal-navigation-chat"
import {
  getAvailableTests,
  saveTestGoal,
  getAllTestGoals,
  saveTestResult,
  getAllTestResults,
} from "@/app/actions/goal"
import { createClient } from "@/lib/supabase/client"

interface TestSchedule {
  id: string
  test_type_id: string
  test_date: string
  test_types: {
    id: string
    name: string
    type_category: string
  }
}

interface TestGoal {
  id: string
  test_schedule_id: string
  target_course: string
  target_class: number
  goal_thoughts: string
  created_at: string
  test_schedules: {
    id: string
    test_date: string
    test_types: {
      id: string
      name: string
    }
  }
}

interface TestResult {
  id: string
  test_schedule_id: string
  math_score: number
  japanese_score: number
  science_score: number
  social_score: number
  total_score: number
  math_deviation?: number
  japanese_deviation?: number
  science_deviation?: number
  social_deviation?: number
  total_deviation?: number
  result_entered_at: string
  test_schedules: {
    id: string
    test_date: string
    test_types: {
      id: string
      name: string
    }
  }
  goal: TestGoal | null
}

const courses = [
  { id: "S", name: "Sコース", description: "最難関校" },
  { id: "C", name: "Cコース", description: "難関校" },
  { id: "B", name: "Bコース", description: "有名校" },
  { id: "A", name: "Aコース", description: "標準校" },
]

export default function GoalPage() {
  const [studentName, setStudentName] = useState("")
  const [studentGrade, setStudentGrade] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<"input" | "result" | "test">("input")

  // 目標入力タブ用
  const [availableTests, setAvailableTests] = useState<TestSchedule[]>([])
  const [selectedTest, setSelectedTest] = useState<TestSchedule | null>(null)
  const [selectedCourse, setSelectedCourse] = useState("")
  const [classNumber, setClassNumber] = useState([20])
  const [currentThoughts, setCurrentThoughts] = useState("")
  const [isGoalSet, setIsGoalSet] = useState(false)
  const [showAIChat, setShowAIChat] = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // 結果入力タブ用
  const [testGoals, setTestGoals] = useState<TestGoal[]>([])
  const [selectedGoalForResult, setSelectedGoalForResult] = useState<TestGoal | null>(null)
  const [mathScore, setMathScore] = useState("")
  const [japaneseScore, setJapaneseScore] = useState("")
  const [scienceScore, setScienceScore] = useState("")
  const [socialScore, setSocialScore] = useState("")
  const [mathDeviation, setMathDeviation] = useState("")
  const [japaneseDeviation, setJapaneseDeviation] = useState("")
  const [scienceDeviation, setScienceDeviation] = useState("")
  const [socialDeviation, setSocialDeviation] = useState("")
  const [totalDeviation, setTotalDeviation] = useState("")
  const [isSavingResult, setIsSavingResult] = useState(false)

  // テスト結果タブ用
  const [testResults, setTestResults] = useState<TestResult[]>([])

  useEffect(() => {
    loadStudentInfo()
    loadAvailableTests()
    loadTestGoals()
    loadTestResults()
  }, [])

  const loadStudentInfo = async () => {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      const { data: student } = await supabase
        .from("students")
        .select("full_name, grade")
        .eq("user_id", user.id)
        .single()

      if (student) {
        setStudentName(student.full_name)
        setStudentGrade(student.grade)
      }
    }
  }

  const loadAvailableTests = async () => {
    const result = await getAvailableTests()
    if (result.tests) {
      setAvailableTests(result.tests)
    }
  }

  const loadTestGoals = async () => {
    const result = await getAllTestGoals()
    if (result.goals) {
      setTestGoals(result.goals as any)
    }
  }

  const loadTestResults = async () => {
    const result = await getAllTestResults()
    if (result.results) {
      setTestResults(result.results as any)
    }
  }

  const handleGoalDecision = () => {
    setIsGoalSet(true)
    setShowAIChat(true)
    setShowCelebration(true)
    setTimeout(() => setShowCelebration(false), 3000)
  }

  const handleAIChatComplete = (goalThoughts: string) => {
    setCurrentThoughts(goalThoughts)
    setShowAIChat(false)
  }

  const handleAIChatCancel = () => {
    setShowAIChat(false)
  }

  const handleSaveGoal = async () => {
    if (!selectedTest || !selectedCourse || !currentThoughts.trim()) {
      alert("すべての項目を入力してください")
      return
    }

    setIsSaving(true)

    try {
      const { success, error } = await saveTestGoal(
        selectedTest.id,
        selectedCourse,
        classNumber[0],
        currentThoughts
      )

      if (success) {
        alert("目標を保存しました！")
        // リセット
        setSelectedTest(null)
        setSelectedCourse("")
        setClassNumber([20])
        setCurrentThoughts("")
        setIsGoalSet(false)
        // リロード
        loadTestGoals()
      } else {
        alert(error || "保存に失敗しました")
      }
    } catch (error) {
      console.error("保存エラー:", error)
      alert("保存に失敗しました")
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveResult = async () => {
    if (!selectedGoalForResult) {
      alert("テストを選択してください")
      return
    }

    if (!mathScore || !japaneseScore || !scienceScore || !socialScore) {
      alert("すべての科目の点数を入力してください")
      return
    }

    setIsSavingResult(true)

    try {
      const { success, error } = await saveTestResult(
        selectedGoalForResult.test_schedule_id,
        parseInt(mathScore),
        parseInt(japaneseScore),
        parseInt(scienceScore),
        parseInt(socialScore),
        mathDeviation ? parseFloat(mathDeviation) : undefined,
        japaneseDeviation ? parseFloat(japaneseDeviation) : undefined,
        scienceDeviation ? parseFloat(scienceDeviation) : undefined,
        socialDeviation ? parseFloat(socialDeviation) : undefined,
        totalDeviation ? parseFloat(totalDeviation) : undefined
      )

      if (success) {
        alert("テスト結果を保存しました！")
        // リセット
        setSelectedGoalForResult(null)
        setMathScore("")
        setJapaneseScore("")
        setScienceScore("")
        setSocialScore("")
        setMathDeviation("")
        setJapaneseDeviation("")
        setScienceDeviation("")
        setSocialDeviation("")
        setTotalDeviation("")
        // リロード
        loadTestResults()
        setActiveTab("test")
      } else {
        alert(error || "保存に失敗しました")
      }
    } catch (error) {
      console.error("結果保存エラー:", error)
      alert("保存に失敗しました")
    } finally {
      setIsSavingResult(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("ja-JP", {
      month: "long",
      day: "numeric",
      weekday: "short",
    })
  }

  const getCourseName = (courseId: string) => {
    return courses.find((c) => c.id === courseId)?.name || courseId
  }

  const totalScore = mathScore && japaneseScore && scienceScore && socialScore
    ? parseInt(mathScore) + parseInt(japaneseScore) + parseInt(scienceScore) + parseInt(socialScore)
    : 0

  return (
    <div className="min-h-screen bg-background pb-20 elegant-fade-in">
      {showCelebration && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute confetti"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                backgroundColor: ["#0891b2", "#0284c7", "#0369a1", "#1e40af"][
                  Math.floor(Math.random() * 4)
                ],
                width: "10px",
                height: "10px",
                borderRadius: "50%",
              }}
            />
          ))}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-white/95 backdrop-blur-lg rounded-2xl p-8 shadow-2xl premium-glow">
              <div className="text-center">
                <PartyPopper className="h-16 w-16 text-primary mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-primary mb-2">目標決定！</h2>
                <p className="text-muted-foreground">素晴らしい目標が設定されました！</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="surface-gradient-primary backdrop-blur-lg border-b border-border/30 p-3 sm:p-4 shadow-lg">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2">
            <Flag className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            ゴールナビ
            {studentGrade && (
              <span className="text-sm text-muted-foreground ml-2">(小学{studentGrade}年生)</span>
            )}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">目標を設定して、合格に向けて頑張ろう！</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-3 sm:p-4">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "input" | "result" | "test")}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="input">目標入力</TabsTrigger>
            <TabsTrigger value="result">結果入力</TabsTrigger>
            <TabsTrigger value="test">テスト結果</TabsTrigger>
          </TabsList>

          {/* 目標入力タブ */}
          <TabsContent value="input" className="space-y-4 sm:space-y-6 mt-6">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
              <div className="space-y-4 sm:space-y-6">
                {!showAIChat && (
                  <Card className="card-elevated ai-coach-gradient border-0 shadow-2xl premium-glow">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0">
                          <img
                            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/ai_coach-oDEKn6ZVqTbEdoExg9hsYQC4PTNbkt.png"
                            alt="AIコーチ"
                            className="w-12 h-12 rounded-full border-2 border-white/30 shadow-lg"
                          />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Bot className="h-4 w-4 text-white" />
                            <span className="font-semibold text-white">AIコーチからのアドバイス</span>
                          </div>
                          <p className="text-white/90 leading-relaxed">
                            {studentName && `${studentName}さん、`}今日も目標に向かって頑張ろう！まずは自分の現在の気持ちを正直に選んで、無理のない目標設定をしていこう。小さな積み重ねが大きな成果につながるよ。一緒に合格を目指そう！✨
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Card className={`card-elevated ${isGoalSet ? "opacity-75" : ""}`}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-primary" />
                      テスト選択
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 sm:space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm sm:text-base">対象テストを選択してください</Label>
                      <Select
                        value={selectedTest?.id || ""}
                        onValueChange={(value) => {
                          const test = availableTests.find((t) => t.id === value)
                          setSelectedTest(test || null)
                        }}
                        disabled={isGoalSet}
                      >
                        <SelectTrigger className="h-10 sm:h-11">
                          <SelectValue placeholder="テストを選択してください" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableTests.map((test) => (
                            <SelectItem key={test.id} value={test.id}>
                              <div className="flex flex-col">
                                <span className="font-medium">{test.test_types.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  {formatDate(test.test_date)}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedTest && (
                      <div className="mt-4 p-3 surface-gradient-primary rounded-lg border border-primary/20">
                        <p className="text-sm text-primary font-medium">
                          選択中: {selectedTest.test_types.name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          実施日: {formatDate(selectedTest.test_date)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          種類:{" "}
                          {selectedTest.test_types.type_category === "gohan"
                            ? "合不合判定テスト"
                            : "公開組分けテスト"}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {selectedTest && (
                  <Card className={`card-elevated ${isGoalSet ? "opacity-75" : ""}`}>
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
                              className={`p-3 sm:p-4 rounded-lg border-2 text-center transition-all duration-300 min-h-[60px] sm:min-h-[70px] ${
                                selectedCourse === course.id
                                  ? "border-primary bg-primary/10 shadow-lg"
                                  : "border-border bg-background hover:border-primary/50 hover:shadow-md"
                              } ${isGoalSet ? "cursor-not-allowed" : ""}`}
                            >
                              <div className="font-bold text-base sm:text-lg">{course.name}</div>
                              <div className="text-xs sm:text-sm text-muted-foreground">
                                {course.description}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-3 sm:space-y-4">
                        <Label className="text-sm sm:text-base font-medium">目標の組を決めよう</Label>
                        <div className="px-4 sm:px-6 py-4 sm:py-5 surface-gradient-primary rounded-2xl border-2 border-primary/20 shadow-lg">
                          <div className="flex items-center justify-between mb-4">
                            <span className="text-sm sm:text-base font-semibold text-primary">
                              目標の組
                            </span>
                            <div className="px-4 sm:px-5 py-2 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-full text-sm sm:text-base font-bold shadow-lg">
                              {classNumber[0]}組
                            </div>
                          </div>
                          <div className="px-2 py-1">
                            <Slider
                              value={classNumber}
                              onValueChange={setClassNumber}
                              max={40}
                              min={1}
                              step={1}
                              className="w-full"
                              disabled={isGoalSet}
                            />
                          </div>
                          <div className="flex justify-between text-xs sm:text-sm text-primary/70 mt-3 font-semibold">
                            <span>1組</span>
                            <span>40組</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {!isGoalSet && selectedTest && selectedCourse && (
                  <Card className="card-elevated bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20 shadow-xl">
                    <CardContent className="p-6 text-center">
                      <Target className="h-12 w-12 text-primary mx-auto mb-4" />
                      <h3 className="text-lg font-bold text-primary mb-2">目標を決定しよう！</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        テスト、コース、組を選択したら、目標を決定してください
                      </p>
                      <Button
                        onClick={handleGoalDecision}
                        className="w-full h-11 sm:h-12 text-sm sm:text-lg font-medium bg-blue-500 text-white hover:bg-blue-600 shadow-lg hover:shadow-xl transition-all duration-300"
                      >
                        <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                        今回の目標はこれにする！
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {showAIChat && selectedTest && (
                  <GoalNavigationChat
                    studentName={studentName}
                    testName={selectedTest.test_types.name}
                    testDate={formatDate(selectedTest.test_date)}
                    targetCourse={selectedCourse}
                    targetClass={classNumber[0]}
                    onComplete={handleAIChatComplete}
                    onCancel={handleAIChatCancel}
                  />
                )}

                {isGoalSet && !showAIChat && (
                  <Card className="card-elevated">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-primary" />
                        今回の思い
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Textarea
                        placeholder="この目標に向けてどんな気持ちですか？どうして頑張りたいですか？"
                        value={currentThoughts}
                        onChange={(e) => setCurrentThoughts(e.target.value)}
                        className="min-h-[100px] sm:min-h-[120px] resize-none text-sm sm:text-base"
                        maxLength={300}
                      />
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground">
                          AIコーチが生成した内容は編集できます
                        </span>
                        <span className="text-muted-foreground">{currentThoughts.length}/300文字</span>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {isGoalSet && !showAIChat && (
                  <Button
                    onClick={handleSaveGoal}
                    disabled={isSaving || !currentThoughts.trim()}
                    className="w-full h-11 sm:h-12 text-sm sm:text-lg font-medium shadow-lg hover:shadow-xl transition-all duration-300 bg-blue-500 hover:bg-blue-600 text-white"
                  >
                    <Save className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                    {isSaving ? "保存中..." : "目標を保存する"}
                  </Button>
                )}
              </div>
            </div>
          </TabsContent>

          {/* 結果入力タブ */}
          <TabsContent value="result" className="space-y-4 mt-6">
            {testGoals.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center text-muted-foreground">
                  まだ目標が設定されていません。<br />
                  先に「目標入力」タブで目標を設定してください。
                </CardContent>
              </Card>
            ) : (
              <>
                <Card className="card-elevated">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Award className="h-5 w-5 text-primary" />
                      テスト選択
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Label>結果を入力するテストを選択してください</Label>
                    <Select
                      value={selectedGoalForResult?.id || ""}
                      onValueChange={(value) => {
                        const goal = testGoals.find((g) => g.id === value)
                        setSelectedGoalForResult(goal || null)
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="テストを選択してください" />
                      </SelectTrigger>
                      <SelectContent>
                        {testGoals.map((goal) => (
                          <SelectItem key={goal.id} value={goal.id}>
                            <div className="flex flex-col">
                              <span className="font-medium">{goal.test_schedules.test_types.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {formatDate(goal.test_schedules.test_date)}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {selectedGoalForResult && (
                      <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center gap-2 mb-2">
                          <Flag className="h-4 w-4 text-blue-600" />
                          <span className="font-medium text-sm">設定した目標</span>
                        </div>
                        <div className="text-sm space-y-1">
                          <p>
                            <span className="text-gray-600">コース:</span>{" "}
                            <span className="font-medium">
                              {getCourseName(selectedGoalForResult.target_course)}
                            </span>
                          </p>
                          <p>
                            <span className="text-gray-600">組:</span>{" "}
                            <span className="font-medium">{selectedGoalForResult.target_class}組</span>
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {selectedGoalForResult && (
                  <>
                    <Card className="card-elevated">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <TrendingUp className="h-5 w-5 text-primary" />
                          点数入力
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>算数</Label>
                            <Input
                              type="number"
                              placeholder="点数"
                              value={mathScore}
                              onChange={(e) => setMathScore(e.target.value)}
                              min="0"
                              max="200"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>算数偏差値（オプション）</Label>
                            <Input
                              type="number"
                              step="0.1"
                              placeholder="偏差値"
                              value={mathDeviation}
                              onChange={(e) => setMathDeviation(e.target.value)}
                              min="0"
                              max="100"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>国語</Label>
                            <Input
                              type="number"
                              placeholder="点数"
                              value={japaneseScore}
                              onChange={(e) => setJapaneseScore(e.target.value)}
                              min="0"
                              max="200"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>国語偏差値（オプション）</Label>
                            <Input
                              type="number"
                              step="0.1"
                              placeholder="偏差値"
                              value={japaneseDeviation}
                              onChange={(e) => setJapaneseDeviation(e.target.value)}
                              min="0"
                              max="100"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>理科</Label>
                            <Input
                              type="number"
                              placeholder="点数"
                              value={scienceScore}
                              onChange={(e) => setScienceScore(e.target.value)}
                              min="0"
                              max="200"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>理科偏差値（オプション）</Label>
                            <Input
                              type="number"
                              step="0.1"
                              placeholder="偏差値"
                              value={scienceDeviation}
                              onChange={(e) => setScienceDeviation(e.target.value)}
                              min="0"
                              max="100"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>社会</Label>
                            <Input
                              type="number"
                              placeholder="点数"
                              value={socialScore}
                              onChange={(e) => setSocialScore(e.target.value)}
                              min="0"
                              max="200"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>社会偏差値（オプション）</Label>
                            <Input
                              type="number"
                              step="0.1"
                              placeholder="偏差値"
                              value={socialDeviation}
                              onChange={(e) => setSocialDeviation(e.target.value)}
                              min="0"
                              max="100"
                            />
                          </div>
                        </div>

                        {totalScore > 0 && (
                          <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-primary">4科目合計</span>
                              <span className="text-2xl font-bold text-primary">{totalScore}点</span>
                            </div>
                          </div>
                        )}

                        <div className="space-y-2">
                          <Label>4科目合計偏差値（オプション）</Label>
                          <Input
                            type="number"
                            step="0.1"
                            placeholder="偏差値"
                            value={totalDeviation}
                            onChange={(e) => setTotalDeviation(e.target.value)}
                            min="0"
                            max="100"
                          />
                        </div>
                      </CardContent>
                    </Card>

                    <Button
                      onClick={handleSaveResult}
                      disabled={isSavingResult}
                      className="w-full h-11 sm:h-12 text-sm sm:text-lg font-medium shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      <Save className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                      {isSavingResult ? "保存中..." : "結果を保存する"}
                    </Button>
                  </>
                )}
              </>
            )}
          </TabsContent>

          {/* テスト結果タブ */}
          <TabsContent value="test" className="space-y-4 mt-6">
            {testResults.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center text-muted-foreground">
                  まだテスト結果がありません
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {testResults.map((result) => (
                  <Card key={result.id} className="card-elevated">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-primary" />
                        {result.test_schedules.test_types.name}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(result.test_schedules.test_date)}
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {result.goal && (
                        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="flex items-center gap-2 mb-2">
                            <Flag className="h-4 w-4 text-blue-600" />
                            <span className="font-medium text-sm">目標</span>
                          </div>
                          <div className="text-sm space-y-1">
                            <p>
                              <span className="text-gray-600">コース:</span>{" "}
                              <span className="font-medium">{getCourseName(result.goal.target_course)}</span>
                            </p>
                            <p>
                              <span className="text-gray-600">組:</span>{" "}
                              <span className="font-medium">{result.goal.target_class}組</span>
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-semibold text-primary">結果</span>
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            入力済み
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div className="text-center p-2 bg-white rounded">
                            <div className="text-xs text-gray-600 mb-1">算数</div>
                            <div className="font-bold text-lg">{result.math_score}点</div>
                            {result.math_deviation && (
                              <div className="text-xs text-gray-500">偏差値 {result.math_deviation}</div>
                            )}
                          </div>
                          <div className="text-center p-2 bg-white rounded">
                            <div className="text-xs text-gray-600 mb-1">国語</div>
                            <div className="font-bold text-lg">{result.japanese_score}点</div>
                            {result.japanese_deviation && (
                              <div className="text-xs text-gray-500">偏差値 {result.japanese_deviation}</div>
                            )}
                          </div>
                          <div className="text-center p-2 bg-white rounded">
                            <div className="text-xs text-gray-600 mb-1">理科</div>
                            <div className="font-bold text-lg">{result.science_score}点</div>
                            {result.science_deviation && (
                              <div className="text-xs text-gray-500">偏差値 {result.science_deviation}</div>
                            )}
                          </div>
                          <div className="text-center p-2 bg-white rounded">
                            <div className="text-xs text-gray-600 mb-1">社会</div>
                            <div className="font-bold text-lg">{result.social_score}点</div>
                            {result.social_deviation && (
                              <div className="text-xs text-gray-500">偏差値 {result.social_deviation}</div>
                            )}
                          </div>
                        </div>
                        <div className="mt-3 pt-3 border-t flex items-center justify-between">
                          <span className="font-semibold">合計</span>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-primary">{result.total_score}点</div>
                            {result.total_deviation && (
                              <div className="text-sm text-gray-600">偏差値 {result.total_deviation}</div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-xs text-gray-500">
                        入力日時: {new Date(result.result_entered_at).toLocaleString("ja-JP")}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <BottomNavigation />
    </div>
  )
}
