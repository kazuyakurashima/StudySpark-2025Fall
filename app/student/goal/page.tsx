"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { BottomNavigation } from "@/components/bottom-navigation"
import { Calendar, Flag, TrendingUp, BookOpen, Save, Bot, Sparkles } from "lucide-react"

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

const moodOptions = [
  { value: "good", label: "よくできた", emoji: "😊", color: "text-green-600" },
  { value: "normal", label: "ふつう", emoji: "😐", color: "text-yellow-600" },
  { value: "difficult", label: "むずかしかった", emoji: "😔", color: "text-red-600" },
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

export default function GoalSettingPage() {
  const [selectedTest, setSelectedTest] = useState("")
  const [selectedCourse, setSelectedCourse] = useState("")
  const [classNumber, setClassNumber] = useState([20])
  const [subjectGoals, setSubjectGoals] = useState<{
    [key: string]: { mood: string; masteryRate: number }
  }>({
    math: { mood: "", masteryRate: 80 },
    japanese: { mood: "", masteryRate: 80 },
    science: { mood: "", masteryRate: 80 },
    social: { mood: "", masteryRate: 80 },
  })
  const [currentThoughts, setCurrentThoughts] = useState("")
  const [isGeneratingThoughts, setIsGeneratingThoughts] = useState(false)

  const handleSubjectMoodChange = (subjectId: string, mood: string) => {
    setSubjectGoals((prev) => ({
      ...prev,
      [subjectId]: { ...prev[subjectId], mood },
    }))
  }

  const handleMasteryRateChange = (subjectId: string, rate: number[]) => {
    setSubjectGoals((prev) => ({
      ...prev,
      [subjectId]: { ...prev[subjectId], masteryRate: rate[0] },
    }))
  }

  const generateThoughts = async () => {
    setIsGeneratingThoughts(true)

    // AIコーチによる思い生成のシミュレーション
    await new Promise((resolve) => setTimeout(resolve, 2000))

    const generatedThoughts = `今回の目標に向けて、特に${subjects.find((s) => subjectGoals[s.id]?.mood === "difficult")?.name || "算数"}を頑張りたいと思います。毎日コツコツと勉強を続けて、必ず目標を達成したいです。分からないところは先生に質問して、一つずつ理解を深めていきます。合格に向けて全力で取り組みます！`

    setCurrentThoughts(generatedThoughts)
    setIsGeneratingThoughts(false)
  }

  const handleSaveGoals = () => {
    // Save goals logic here
    console.log("Goals saved:", {
      selectedTest,
      selectedCourse,
      classNumber: classNumber[0],
      subjectGoals,
      currentThoughts,
    })
    alert("目標を保存しました！")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 pb-20">
      {/* Header */}
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Goal Setting Section */}
          <div className="space-y-6">
            {/* Test Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  テスト選択
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label>目標テストを選択</Label>
                  <Select value={selectedTest} onValueChange={setSelectedTest}>
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

            {/* Course and Class Selection */}
            <Card>
              <CardHeader>
                <CardTitle>コース・クラス設定</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Course Selection */}
                <div className="space-y-2">
                  <Label>コース選択</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {courses.map((course) => (
                      <button
                        key={course.id}
                        onClick={() => setSelectedCourse(course.id)}
                        className={`p-3 rounded-lg border-2 text-center transition-all ${
                          selectedCourse === course.id
                            ? "border-primary bg-primary/10 shadow-md"
                            : "border-border bg-background hover:border-primary/50"
                        }`}
                      >
                        <div className="font-bold text-lg">{course.name}</div>
                        <div className="text-xs text-muted-foreground">{course.description}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <Label className="text-base font-medium">組</Label>
                  <div className="px-3 py-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border border-blue-200">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-blue-800">目標組</span>
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
                    />
                    <div className="flex justify-between text-xs text-blue-600 mt-2 font-medium">
                      <span>1組</span>
                      <span>40組</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Subject Goals */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  科目別目標設定
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {subjects.map((subject) => (
                  <div key={subject.id} className="p-4 rounded-lg bg-muted/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge className={subject.color}>{subject.name}</Badge>
                      <span className="text-sm font-medium">
                        目標習得率: {subjectGoals[subject.id]?.masteryRate || 80}%
                      </span>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Bot className="h-3 w-3 text-blue-600" />
                        <span className="text-xs font-medium text-blue-800">AIコーチのアドバイス</span>
                      </div>
                      <p className="text-xs text-blue-700">
                        {subject.id === "math" && "計算ミスを減らすために、見直しの時間を作ろう！"}
                        {subject.id === "japanese" && "読解力向上のため、毎日少しずつ文章を読む習慣をつけよう！"}
                        {subject.id === "science" && "実験や図表の問題を重点的に練習しよう！"}
                        {subject.id === "social" && "地図や年表を使って、視覚的に覚えていこう！"}
                      </p>
                    </div>

                    {/* Mood Selection */}
                    <div className="space-y-2">
                      <Label className="text-sm">現在の気持ち</Label>
                      <div className="flex gap-2">
                        {moodOptions.map((mood) => (
                          <button
                            key={mood.value}
                            onClick={() => handleSubjectMoodChange(subject.id, mood.value)}
                            className={`flex-1 p-2 rounded-lg border-2 text-center transition-all ${
                              subjectGoals[subject.id]?.mood === mood.value
                                ? "border-primary bg-primary/10"
                                : "border-border bg-background hover:border-primary/50"
                            }`}
                          >
                            <div className="text-lg">{mood.emoji}</div>
                            <div className={`text-xs ${mood.color}`}>{mood.label}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Mastery Rate Slider */}
                    <div className="space-y-2">
                      <Label className="text-sm">習得率目標</Label>
                      <Slider
                        value={[subjectGoals[subject.id]?.masteryRate || 80]}
                        onValueChange={(value) => handleMasteryRateChange(subject.id, value)}
                        max={100}
                        min={50}
                        step={10}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>50%</span>
                        <span>100%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  今回の思い
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Button
                    onClick={generateThoughts}
                    disabled={isGeneratingThoughts}
                    variant="outline"
                    className="flex items-center gap-2 bg-transparent"
                  >
                    <Bot className="h-4 w-4" />
                    {isGeneratingThoughts ? "生成中..." : "AIコーチに相談"}
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
              </CardContent>
            </Card>

            {/* Save Button */}
            <Button onClick={handleSaveGoals} className="w-full h-12 text-lg font-medium">
              <Save className="h-5 w-5 mr-2" />
              目標を保存する
            </Button>
          </div>

          {/* Past Performance Section */}
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

            {/* Current Goals Summary */}
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
                  <div className="pt-2 border-t border-border">
                    <div className="text-sm font-medium mb-2">科目別目標習得率:</div>
                    {subjects.map((subject) => (
                      <div key={subject.id} className="flex justify-between text-sm">
                        <span>{subject.name}:</span>
                        <span className="font-medium">{subjectGoals[subject.id]?.masteryRate || 80}%</span>
                      </div>
                    ))}
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
