"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { BottomNavigation } from "@/components/bottom-navigation"
import { Calendar, Zap, BookOpen, MessageSquare, Save, Plus } from "lucide-react"

const subjects = [
  { id: "math", name: "算数", color: "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200" },
  { id: "japanese", name: "国語", color: "bg-green-100 text-green-800 border-green-200 hover:bg-green-200" },
  { id: "science", name: "理科", color: "bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200" },
  { id: "social", name: "社会", color: "bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200" },
]

const moodOptions = [
  { value: "good", label: "よくできた", emoji: "😊", color: "border-green-500 bg-green-50 text-green-700" },
  { value: "normal", label: "ふつう", emoji: "😐", color: "border-yellow-500 bg-yellow-50 text-yellow-700" },
  { value: "difficult", label: "むずかしかった", emoji: "😔", color: "border-red-500 bg-red-50 text-red-700" },
]

const reflectionPlaceholders = [
  "今日はどんなことを学びましたか？",
  "難しかった問題はありましたか？",
  "明日はどんなことを頑張りたいですか？",
  "新しく覚えたことを書いてみましょう",
  "今日の学習で気づいたことは？",
]

export default function SparkPage() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0])
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([])
  const [subjectDetails, setSubjectDetails] = useState<{
    [key: string]: {
      mood: string
      problems: string
      correct: string
    }
  }>({})
  const [reflection, setReflection] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const today = new Date().toISOString().split("T")[0]
  const randomPlaceholder = reflectionPlaceholders[Math.floor(Math.random() * reflectionPlaceholders.length)]

  const handleSubjectToggle = (subjectId: string) => {
    setSelectedSubjects((prev) => {
      if (prev.includes(subjectId)) {
        // Remove subject and its details
        const newSubjects = prev.filter((id) => id !== subjectId)
        const newDetails = { ...subjectDetails }
        delete newDetails[subjectId]
        setSubjectDetails(newDetails)
        return newSubjects
      } else {
        // Add subject with default details
        setSubjectDetails((prevDetails) => ({
          ...prevDetails,
          [subjectId]: { mood: "", problems: "", correct: "" },
        }))
        return [...prev, subjectId]
      }
    })
  }

  const handleSubjectDetailChange = (subjectId: string, field: string, value: string) => {
    setSubjectDetails((prev) => ({
      ...prev,
      [subjectId]: {
        ...prev[subjectId],
        [field]: value,
      },
    }))
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)

    // Simulate API call
    setTimeout(() => {
      console.log("Learning record saved:", {
        date: selectedDate,
        subjects: selectedSubjects,
        details: subjectDetails,
        reflection,
      })

      // Reset form
      setSelectedSubjects([])
      setSubjectDetails({})
      setReflection("")
      setIsSubmitting(false)

      alert("学習記録を保存しました！")
    }, 1000)
  }

  const isFormValid = selectedSubjects.length > 0 && selectedSubjects.every((id) => subjectDetails[id]?.mood)

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 pb-20">
      {/* Header */}
      <div className="bg-card/80 backdrop-blur-sm border-b border-border/50 p-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Zap className="h-6 w-6 text-accent" />
            スパーク
          </h1>
          <p className="text-sm text-muted-foreground">今日の学習を記録しよう！</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
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
              学習した科目
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
                      : `border-border bg-background hover:border-primary/50 ${subject.color.split(" ")[3]}`
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    {selectedSubjects.includes(subject.id) && <Plus className="h-4 w-4 rotate-45 text-primary" />}
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
                    {/* Mood Selection */}
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

                    {/* Problem Count and Correct Answers */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor={`problems-${subjectId}`} className="text-sm">
                          問題数（任意）
                        </Label>
                        <Input
                          id={`problems-${subjectId}`}
                          type="number"
                          placeholder="例: 20"
                          min="0"
                          value={subjectDetails[subjectId]?.problems || ""}
                          onChange={(e) => handleSubjectDetailChange(subjectId, "problems", e.target.value)}
                          className="h-12"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`correct-${subjectId}`} className="text-sm">
                          正解数（任意）
                        </Label>
                        <Input
                          id={`correct-${subjectId}`}
                          type="number"
                          placeholder="例: 18"
                          min="0"
                          max={subjectDetails[subjectId]?.problems || undefined}
                          value={subjectDetails[subjectId]?.correct || ""}
                          onChange={(e) => handleSubjectDetailChange(subjectId, "correct", e.target.value)}
                          className="h-12"
                        />
                      </div>
                    </div>

                    {/* Accuracy Display */}
                    {subjectDetails[subjectId]?.problems &&
                      subjectDetails[subjectId]?.correct &&
                      Number(subjectDetails[subjectId].problems) > 0 && (
                        <div className="p-3 bg-muted/50 rounded-lg">
                          <div className="text-sm text-muted-foreground">正答率</div>
                          <div className="text-lg font-bold text-primary">
                            {Math.round(
                              (Number(subjectDetails[subjectId].correct) / Number(subjectDetails[subjectId].problems)) *
                                100,
                            )}
                            %
                          </div>
                        </div>
                      )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {/* Reflection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-accent" />
              今日の振り返り
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder={randomPlaceholder}
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
              className="min-h-[120px] md:min-h-[150px] text-base"
              maxLength={500}
            />
            <div className="flex justify-between items-center mt-2">
              <span className="text-xs text-muted-foreground">学習の振り返りを自由に書いてみましょう</span>
              <span className="text-xs text-muted-foreground">{reflection.length}/500文字</span>
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="sticky bottom-24 md:bottom-6">
          <Button
            onClick={handleSubmit}
            disabled={!isFormValid || isSubmitting}
            className="w-full h-14 text-lg font-medium shadow-lg"
          >
            <Save className="h-5 w-5 mr-2" />
            {isSubmitting ? "保存中..." : "学習記録を保存"}
          </Button>
        </div>

        {/* Form Validation Message */}
        {selectedSubjects.length > 0 && !isFormValid && (
          <div className="p-4 bg-accent/10 border border-accent/20 rounded-lg">
            <p className="text-sm text-accent font-medium">選択した科目の気持ちを選んでください</p>
          </div>
        )}
      </div>

      <BottomNavigation activeTab="spark" />
    </div>
  )
}
