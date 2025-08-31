"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { BottomNavigation } from "@/components/bottom-navigation"
import { Calendar, BookOpen, MessageSquare, Save, Sparkles, Flame, Crown } from "lucide-react"

const subjects = [
  { id: "math", name: "算数", color: "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200" },
  { id: "japanese", name: "国語", color: "bg-green-100 text-green-800 border-green-200 hover:bg-green-200" },
  { id: "science", name: "理科", color: "bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200" },
  { id: "social", name: "社会", color: "bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200" },
]

const moodOptions = [
  { value: "good", label: "よくできた", emoji: "😊", color: "border-green-500 bg-green-50 text-green-700" },
  { value: "normal", label: "ふつう", emoji: "😐", color: "border-yellow-500 bg-yellow-50 text-yellow-700" },
  { value: "difficult", label: "むずかしかった", emoji: "😢", color: "border-red-500 bg-red-50 text-red-700" },
]

const learningCategories = [
  { id: "class", name: "授業参加", priority: "最重要", color: "🔴", bgColor: "bg-red-50 border-red-200 text-red-800" },
  {
    id: "homework",
    name: "宿題実施",
    priority: "最重要",
    color: "🔴",
    bgColor: "bg-red-50 border-red-200 text-red-800",
  },
  {
    id: "class-review",
    name: "授業復習",
    priority: "重要",
    color: "🟡",
    bgColor: "bg-yellow-50 border-yellow-200 text-yellow-800",
  },
  {
    id: "homework-review",
    name: "宿題復習",
    priority: "重要",
    color: "🟡",
    bgColor: "bg-yellow-50 border-yellow-200 text-yellow-800",
  },
  {
    id: "weekly-test",
    name: "週テスト対策",
    priority: "標準",
    color: "🔵",
    bgColor: "bg-blue-50 border-blue-200 text-blue-800",
  },
  {
    id: "exam-prep",
    name: "入試対策",
    priority: "補充",
    color: "⚪",
    bgColor: "bg-gray-50 border-gray-200 text-gray-800",
  },
]

const levels = {
  spark: { name: "Spark", icon: Sparkles, description: "楽しくスタート", color: "text-orange-500" },
  flame: { name: "Flame", icon: Flame, description: "成長ステップ", color: "text-red-500" },
  blaze: { name: "Blaze", icon: Crown, description: "最高にチャレンジ", color: "text-purple-500" },
}

export default function SparkPage() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0])
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([])
  const [subjectDetails, setSubjectDetails] = useState<{
    [key: string]: {
      mood: string
      understanding: string
      categories: string[]
    }
  }>({})
  const [reflection, setReflection] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [currentLevel, setCurrentLevel] = useState<"spark" | "flame" | "blaze">("spark")
  const [weeklyRecords, setWeeklyRecords] = useState(4) // Mock data - デモ用に3以上に設定
  const [weeklyContentRecords, setWeeklyContentRecords] = useState(3) // Mock data - デモ用に3以上に設定
  const [showReflectionOptions, setShowReflectionOptions] = useState(false)
  const [aiReflections, setAiReflections] = useState<string[]>([])
  const [isGeneratingAI, setIsGeneratingAI] = useState(false)
  const [aiQuestion, setAiQuestion] = useState("")

  const today = new Date().toISOString().split("T")[0]

  const canAccessFlame = weeklyRecords >= 3
  const canAccessBlaze = currentLevel === "flame" && weeklyContentRecords >= 3
  const progressToFlame = Math.min((weeklyRecords / 3) * 100, 100)
  const progressToBlaze = currentLevel === "flame" ? Math.min((weeklyContentRecords / 3) * 100, 100) : 0

  const handleSubjectToggle = (subjectId: string) => {
    setSelectedSubjects((prev) => {
      if (prev.includes(subjectId)) {
        const newSubjects = prev.filter((id) => id !== subjectId)
        const newDetails = { ...subjectDetails }
        delete newDetails[subjectId]
        setSubjectDetails(newDetails)
        return newSubjects
      } else {
        setSubjectDetails((prevDetails) => ({
          ...prevDetails,
          [subjectId]: { mood: "", understanding: "", categories: [] },
        }))
        return [...prev, subjectId]
      }
    })
  }

  const handleSubjectDetailChange = (subjectId: string, field: string, value: string | string[]) => {
    setSubjectDetails((prev) => ({
      ...prev,
      [subjectId]: {
        ...prev[subjectId],
        [field]: value,
      },
    }))
  }

  const handleCategoryToggle = (subjectId: string, categoryId: string) => {
    const currentCategories = subjectDetails[subjectId]?.categories || []
    const newCategories = currentCategories.includes(categoryId)
      ? currentCategories.filter((id) => id !== categoryId)
      : [...currentCategories, categoryId]

    handleSubjectDetailChange(subjectId, "categories", newCategories)
  }

  const generateAIReflections = async () => {
    setIsGeneratingAI(true)

    // Mock AI generation
    setTimeout(() => {
      const reflections = [
        "今日も算数の問題に真剣に取り組んでいて素晴らしいです！この調子で続けていけば必ず力がつきますよ。", // Celebrate系
        "分数の計算で新しいコツを発見できたのは大きな成長ですね。こうした気づきが学習を深めていきます。", // Insight系
        "明日は今日間違えた問題をもう一度解いてみましょう。きっと今度はスムーズに解けるはずです。", // Next step系
      ]
      setAiReflections(reflections)
      setIsGeneratingAI(false)
    }, 1500)
  }

  const generateAIQuestion = () => {
    const questions = [
      "今日の学習で一番印象に残ったことは何ですか？",
      "難しいと感じた問題があったとき、どんな工夫をしましたか？",
      "今日学んだことを友達に説明するとしたら、どう伝えますか？",
    ]
    const randomQuestion = questions[Math.floor(Math.random() * questions.length)]
    setAiQuestion(randomQuestion)
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)

    setTimeout(() => {
      console.log("Learning record saved:", {
        date: selectedDate,
        subjects: selectedSubjects,
        details: subjectDetails,
        reflection,
        level: currentLevel,
      })

      // Reset form
      setSelectedSubjects([])
      setSubjectDetails({})
      setReflection("")
      setShowReflectionOptions(false)
      setAiReflections([])
      setAiQuestion("")
      setIsSubmitting(false)

      alert("学習記録を保存しました！")
    }, 1000)
  }

  const isFormValid = () => {
    if (selectedSubjects.length === 0) return false
    if (currentLevel === "spark") {
      return selectedSubjects.every((id) => subjectDetails[id]?.mood)
    }
    return selectedSubjects.every((id) => subjectDetails[id]?.mood && subjectDetails[id]?.understanding)
  }

  const CurrentLevelIcon = levels[currentLevel].icon

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 pb-20">
      {/* Header */}
      <div className="bg-card/80 backdrop-blur-sm border-b border-border/50 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                <CurrentLevelIcon className={`h-6 w-6 ${levels[currentLevel].color}`} />
                スパーク - {levels[currentLevel].name}
              </h1>
              <p className="text-sm text-muted-foreground">{levels[currentLevel].description}</p>
            </div>

            <div className="flex gap-2">
              <Button
                variant={currentLevel === "spark" ? "default" : "outline"}
                size="sm"
                onClick={() => setCurrentLevel("spark")}
              >
                <Sparkles className="h-4 w-4 mr-1" />
                Spark
              </Button>
              <Button
                variant={currentLevel === "flame" ? "default" : "outline"}
                size="sm"
                onClick={() => setCurrentLevel("flame")}
                disabled={!canAccessFlame}
              >
                <Flame className="h-4 w-4 mr-1" />
                Flame
              </Button>
              <Button
                variant={currentLevel === "blaze" ? "default" : "outline"}
                size="sm"
                onClick={() => setCurrentLevel("blaze")}
                disabled={!canAccessBlaze}
              >
                <Crown className="h-4 w-4 mr-1" />
                Blaze
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {!canAccessFlame && (
          <Card className="border-orange-200 bg-orange-50/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-2">
                <Flame className="h-5 w-5 text-orange-500" />
                <span className="font-medium">Flameレベル解放まで</span>
              </div>
              <Progress value={progressToFlame} className="mb-2" />
              <p className="text-sm text-muted-foreground">
                あと{3 - weeklyRecords}回記録でレベルアップ！振り返り機能が使えるようになります。
              </p>
            </CardContent>
          </Card>
        )}

        {currentLevel === "flame" && !canAccessBlaze && (
          <Card className="border-purple-200 bg-purple-50/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-2">
                <Crown className="h-5 w-5 text-purple-500" />
                <span className="font-medium">Blazeレベル解放まで</span>
              </div>
              <Progress value={progressToBlaze} className="mb-2" />
              <p className="text-sm text-muted-foreground">
                学習内容をあと{3 - weeklyContentRecords}回記録でレベルアップ！AIコーチと会話できるようになります。
              </p>
            </CardContent>
          </Card>
        )}

        {/* Date Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              学習日
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                max={today}
                className="w-auto"
              />
              {selectedDate === today && (
                <Badge variant="secondary" className="bg-accent/10 text-accent">
                  今日
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Subject Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              学習した科目 *
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {subjects.map((subject) => (
                <button
                  key={subject.id}
                  onClick={() => handleSubjectToggle(subject.id)}
                  className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                    selectedSubjects.includes(subject.id)
                      ? "border-primary bg-primary/10 shadow-md scale-105"
                      : `border-border bg-background hover:border-primary/50`
                  }`}
                >
                  <div className="flex items-center justify-center">
                    <span className="font-medium">{subject.name}</span>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Subject Details */}
        {selectedSubjects.length > 0 && (
          <div className="space-y-4">
            {selectedSubjects.map((subjectId) => {
              const subject = subjects.find((s) => s.id === subjectId)
              if (!subject) return null

              return (
                <Card key={subjectId} className="border-l-4 border-l-primary">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Badge className={subject.color}>{subject.name}</Badge>
                      の詳細
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">今日の気持ち *</Label>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        {moodOptions.map((mood) => (
                          <button
                            key={mood.value}
                            onClick={() => handleSubjectDetailChange(subjectId, "mood", mood.value)}
                            className={`p-3 rounded-lg border-2 text-center transition-all ${
                              subjectDetails[subjectId]?.mood === mood.value
                                ? `${mood.color} shadow-md`
                                : "border-border bg-background hover:border-primary/50"
                            }`}
                          >
                            <div className="text-2xl mb-1">{mood.emoji}</div>
                            <div className="text-sm font-medium">{mood.label}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {(currentLevel === "flame" || currentLevel === "blaze") && (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">理解度 *</Label>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                          {[
                            { value: "perfect", label: "バッチリ理解", emoji: "😄" },
                            { value: "good", label: "できた", emoji: "😊" },
                            { value: "normal", label: "ふつう", emoji: "😐" },
                            { value: "worried", label: "ちょっと不安", emoji: "😟" },
                            { value: "difficult", label: "むずかしかった", emoji: "😥" },
                          ].map((understanding) => (
                            <button
                              key={understanding.value}
                              onClick={() => handleSubjectDetailChange(subjectId, "understanding", understanding.value)}
                              className={`p-2 rounded-lg border-2 text-center transition-all text-xs ${
                                subjectDetails[subjectId]?.understanding === understanding.value
                                  ? "border-primary bg-primary/10 shadow-md"
                                  : "border-border bg-background hover:border-primary/50"
                              }`}
                            >
                              <div className="text-lg mb-1">{understanding.emoji}</div>
                              <div className="font-medium">{understanding.label}</div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {(currentLevel === "flame" || currentLevel === "blaze") && (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">学習内容（任意）</Label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {learningCategories.map((category) => (
                            <button
                              key={category.id}
                              onClick={() => handleCategoryToggle(subjectId, category.id)}
                              className={`p-3 rounded-lg border-2 text-left transition-all ${
                                subjectDetails[subjectId]?.categories?.includes(category.id)
                                  ? `${category.bgColor} shadow-md`
                                  : "border-border bg-background hover:border-primary/50"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-lg">{category.color}</span>
                                <div>
                                  <div className="font-medium text-sm">{category.name}</div>
                                  <div className="text-xs text-muted-foreground">{category.priority}</div>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {currentLevel !== "spark" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-accent" />
                今日の振り返り（任意）
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!showReflectionOptions ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Button
                    onClick={() => {
                      setShowReflectionOptions(true)
                      generateAIReflections()
                    }}
                    variant="outline"
                    className="h-auto p-4 text-left"
                  >
                    <div>
                      <div className="font-medium">今日の振り返りを私（AIコーチ）に生成してもらいたい</div>
                      <div className="text-sm text-muted-foreground mt-1">3つの選択肢から選べます</div>
                    </div>
                  </Button>

                  {currentLevel === "blaze" && (
                    <Button
                      onClick={() => {
                        setShowReflectionOptions(true)
                        generateAIQuestion()
                      }}
                      variant="outline"
                      className="h-auto p-4 text-left"
                    >
                      <div>
                        <div className="font-medium">今日の振り返りを私としたい</div>
                        <div className="text-sm text-muted-foreground mt-1">AIコーチと対話しながら振り返り</div>
                      </div>
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {aiReflections.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/ai_coach-oDEKn6ZVqTbEdoExg9hsYQC4PTNbkt.png" />
                          <AvatarFallback>AI</AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-sm">AIコーチからの振り返り提案</span>
                      </div>

                      {isGeneratingAI ? (
                        <div className="p-4 bg-muted/50 rounded-lg">
                          <div className="flex items-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                            <span className="text-sm">振り返りを生成中...</span>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {aiReflections.map((reflection, index) => (
                            <button
                              key={index}
                              onClick={() => setReflection(reflection)}
                              className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                                reflection === reflection
                                  ? "border-primary bg-primary/5"
                                  : "border-border bg-background hover:border-primary/50"
                              }`}
                            >
                              <div className="text-sm leading-relaxed">{reflection}</div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {aiQuestion && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/ai_coach-oDEKn6ZVqTbEdoExg9hsYQC4PTNbkt.png" />
                          <AvatarFallback>AI</AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-sm">AIコーチからの質問</span>
                      </div>

                      <div className="p-3 bg-accent/10 rounded-lg">
                        <p className="text-sm font-medium">{aiQuestion}</p>
                      </div>

                      <Textarea
                        placeholder="この質問とは関係なく自由に振り返りを書いてもいいからね！"
                        value={reflection}
                        onChange={(e) => setReflection(e.target.value)}
                        className="min-h-[120px] text-base"
                        maxLength={400}
                      />
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">目安80-120字</span>
                        <span className="text-xs text-muted-foreground">{reflection.length}/400文字</span>
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={() => {
                      setShowReflectionOptions(false)
                      setAiReflections([])
                      setAiQuestion("")
                    }}
                    variant="ghost"
                    size="sm"
                  >
                    選択に戻る
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Submit Button */}
        <div className="sticky bottom-24 md:bottom-6">
          <Button
            onClick={handleSubmit}
            disabled={!isFormValid() || isSubmitting}
            className="w-full h-14 text-lg font-medium shadow-lg"
          >
            <Save className="h-5 w-5 mr-2" />
            {isSubmitting ? "保存中..." : "学習記録を保存"}
          </Button>
        </div>

        {/* Form Validation Message */}
        {selectedSubjects.length > 0 && !isFormValid() && (
          <div className="p-4 bg-accent/10 border border-accent/20 rounded-lg">
            <p className="text-sm text-accent font-medium">
              {currentLevel === "spark"
                ? "選択した科目の気持ちを選んでください"
                : "選択した科目の気持ちと理解度を選んでください"}
            </p>
          </div>
        )}
      </div>

      <BottomNavigation activeTab="spark" />
    </div>
  )
}
