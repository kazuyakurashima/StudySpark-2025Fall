"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { BottomNavigation } from "@/components/bottom-navigation"
import { Calendar, BookOpen, MessageSquare, Save, Sparkles, Flame, Crown } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"

const subjects = [
  { id: "math", name: "算数", color: "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200" },
  { id: "japanese", name: "国語", color: "bg-green-100 text-green-800 border-green-200 hover:bg-green-200" },
  { id: "science", name: "理科", color: "bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200" },
  { id: "social", name: "社会", color: "bg-sky-100 text-sky-800 border-sky-200 hover:bg-sky-200" },
]

const grade5LearningContent = {
  math: [
    { id: "ruirui", name: "類題", course: "A", maxProblems: {} },
    { id: "kihon", name: "基本問題", course: "A", maxProblems: {} },
    { id: "renshu", name: "練習問題", course: "B", maxProblems: {} },
    { id: "jissen", name: "演習問題集（実戦演習）", course: "C", maxProblems: {} },
  ],
  japanese: [{ id: "kakunin", name: "確認問題", course: "A", maxProblems: {} }],
  science: [
    { id: "kihon", name: "演習問題集（基本問題）", course: "A", maxProblems: {} },
    { id: "renshu", name: "演習問題集（練習問題）", course: "B", maxProblems: {} },
    { id: "hatten", name: "演習問題集（発展問題）", course: "C", maxProblems: {} },
  ],
  social: [
    { id: "renshu", name: "演習問題集（練習問題）", course: "A", maxProblems: {} },
    { id: "hatten", name: "演習問題集（発展問題・記述問題）", course: "B", maxProblems: {} },
  ],
}

const grade6LearningContent = {
  math: [
    { id: "ichigyo", name: "１行問題", course: "A", maxProblems: {} },
    { id: "kihon", name: "基本演習", course: "B", maxProblems: {} },
    { id: "jissen", name: "実戦演習", course: "C", maxProblems: {} },
  ],
  japanese: [{ id: "kanji", name: "中学入試頻出漢字", course: "A", maxProblems: {} }],
  science: [
    { id: "kihon", name: "演習問題集（基本問題）", course: "A", maxProblems: {} },
    { id: "renshu", name: "演習問題集（練習問題）", course: "C", maxProblems: {} },
  ],
  social: [
    { id: "kihon", name: "演習問題集（基本問題）", course: "A", maxProblems: {} },
    { id: "renshu", name: "演習問題集（練習問題）", course: "B", maxProblems: {} },
    { id: "oyo", name: "演習問題集（応用問題）", course: "C", maxProblems: {} },
  ],
}

const grade5ProblemCounts = {
  session1: {
    math: { ruirui: 7, kihon: 22, renshu: 12, jissen: 10 },
    japanese: { kakunin: 40 },
    science: { kihon: 17, renshu: 19, hatten: 5 },
    social: { renshu: 13, hatten: 11 },
  },
  session2: {
    math: { ruirui: 7, kihon: 15, renshu: 11, jissen: 12 },
    japanese: { kakunin: 40 },
    science: { kihon: 18, renshu: 35, hatten: 3 },
    social: { renshu: 20, hatten: 10 },
  },
  session3: {
    math: { ruirui: 5, kihon: 12, renshu: 11, jissen: 9 },
    japanese: { kakunin: 40 },
    science: { kihon: 18, renshu: 37, hatten: 5 },
    social: { renshu: 18, hatten: 8 },
  },
  session4: {
    math: { ruirui: 8, kihon: 15, renshu: 14, jissen: 13 },
    japanese: { kakunin: 40 },
    science: { kihon: 18, renshu: 30, hatten: 5 },
    social: { renshu: 23, hatten: 7 },
  },
  session5: {
    math: { ruirui: 0, kihon: 31, renshu: 12, jissen: 0 },
    japanese: { kakunin: 80 },
    science: { kihon: 0, renshu: 45, hatten: 23 },
    social: { renshu: 26, hatten: 45 },
  },
  session6: {
    math: { ruirui: 8, kihon: 14, renshu: 12, jissen: 10 },
    japanese: { kakunin: 40 },
    science: { kihon: 33, renshu: 33, hatten: 7 },
    social: { renshu: 20, hatten: 9 },
  },
  session7: {
    math: { ruirui: 6, kihon: 12, renshu: 10, jissen: 12 },
    japanese: { kakunin: 40 },
    science: { kihon: 21, renshu: 25, hatten: 7 },
    social: { renshu: 26, hatten: 8 },
  },
  session8: {
    math: { ruirui: 6, kihon: 14, renshu: 11, jissen: 12 },
    japanese: { kakunin: 40 },
    science: { kihon: 19, renshu: 24, hatten: 6 },
    social: { renshu: 16, hatten: 11 },
  },
  session9: {
    math: { ruirui: 6, kihon: 10, renshu: 11, jissen: 9 },
    japanese: { kakunin: 40 },
    science: { kihon: 22, renshu: 23, hatten: 6 },
    social: { renshu: 19, hatten: 7 },
  },
  session10: {
    math: { ruirui: 0, kihon: 26, renshu: 9, jissen: 0 },
    japanese: { kakunin: 80 },
    science: { kihon: 52, renshu: 15, hatten: 5 },
    social: { renshu: 30, hatten: 33 },
  },
  session11: {
    math: { ruirui: 8, kihon: 15, renshu: 11, jissen: 13 },
    japanese: { kakunin: 40 },
    science: { kihon: 20, renshu: 20, hatten: 3 },
    social: { renshu: 15, hatten: 9 },
  },
  session12: {
    math: { ruirui: 6, kihon: 10, renshu: 8, jissen: 8 },
    japanese: { kakunin: 40 },
    science: { kihon: 22, renshu: 18, hatten: 5 },
    social: { renshu: 14, hatten: 6 },
  },
  session13: {
    math: { ruirui: 7, kihon: 20, renshu: 15, jissen: 14 },
    japanese: { kakunin: 40 },
    science: { kihon: 17, renshu: 26, hatten: 3 },
    social: { renshu: 16, hatten: 13 },
  },
  session14: {
    math: { ruirui: 5, kihon: 14, renshu: 8, jissen: 12 },
    japanese: { kakunin: 40 },
    science: { kihon: 22, renshu: 30, hatten: 6 },
    social: { renshu: 18, hatten: 11 },
  },
  session15: {
    math: { ruirui: 0, kihon: 32, renshu: 13, jissen: 0 },
    japanese: { kakunin: 80 },
    science: { kihon: 0, renshu: 41, hatten: 17 },
    social: { renshu: 31, hatten: 28 },
  },
  session16: {
    math: { ruirui: 7, kihon: 17, renshu: 12, jissen: 10 },
    japanese: { kakunin: 40 },
    science: { kihon: 15, renshu: 24, hatten: 6 },
    social: { renshu: 17, hatten: 11 },
  },
  session17: {
    math: { ruirui: 6, kihon: 10, renshu: 10, jissen: 8 },
    japanese: { kakunin: 40 },
    science: { kihon: 19, renshu: 28, hatten: 8 },
    social: { renshu: 17, hatten: 11 },
  },
  session18: {
    math: { ruirui: 8, kihon: 22, renshu: 13, jissen: 11 },
    japanese: { kakunin: 40 },
    science: { kihon: 21, renshu: 22, hatten: 7 },
    social: { renshu: 17, hatten: 9 },
  },
  session19: {
    math: { ruirui: 0, kihon: 22, renshu: 0, jissen: 0 },
    japanese: { kakunin: 80 },
    science: { kihon: 0, renshu: 42, hatten: 12 },
    social: { renshu: 25, hatten: 27 },
  },
}

const grade6ProblemCounts = {
  gohan3: {
    math: { ichigyo: 0, kihon: 0, jissen: 0 },
    japanese: { kanji: 0 },
    science: { kihon: 0, renshu: 0 },
    social: { kihon: 0, renshu: 0, oyo: 0 },
  },
  session2: {
    math: { ichigyo: 22, kihon: 13, jissen: 14 },
    japanese: { kanji: 40 },
    science: { kihon: 40, renshu: 33 },
    social: { kihon: 75, renshu: 20, oyo: 9 },
  },
  session3: {
    math: { ichigyo: 19, kihon: 12, jissen: 12 },
    japanese: { kanji: 40 },
    science: { kihon: 52, renshu: 41 },
    social: { kihon: 64, renshu: 36, oyo: 6 },
  },
  session4: {
    math: { ichigyo: 22, kihon: 13, jissen: 15 },
    japanese: { kanji: 40 },
    science: { kihon: 47, renshu: 46 },
    social: { kihon: 56, renshu: 30, oyo: 12 },
  },
  gohan4: {
    math: { ichigyo: 0, kihon: 0, jissen: 0 },
    japanese: { kanji: 0 },
    science: { kihon: 0, renshu: 0 },
    social: { kihon: 0, renshu: 0, oyo: 0 },
  },
  session5: {
    math: { ichigyo: 21, kihon: 14, jissen: 14 },
    japanese: { kanji: 40 },
    science: { kihon: 46, renshu: 44 },
    social: { kihon: 57, renshu: 8, oyo: 7 },
  },
  session6: {
    math: { ichigyo: 17, kihon: 12, jissen: 15 },
    japanese: { kanji: 40 },
    science: { kihon: 31, renshu: 37 },
    social: { kihon: 58, renshu: 16, oyo: 10 },
  },
  session7: {
    math: { ichigyo: 22, kihon: 12, jissen: 12 },
    japanese: { kanji: 40 },
    science: { kihon: 40, renshu: 35 },
    social: { kihon: 64, renshu: 27, oyo: 10 },
  },
  session8: {
    math: { ichigyo: 20, kihon: 12, jissen: 13 },
    japanese: { kanji: 40 },
    science: { kihon: 34, renshu: 29 },
    social: { kihon: 72, renshu: 22, oyo: 11 },
  },
  session9: {
    math: { ichigyo: 17, kihon: 12, jissen: 13 },
    japanese: { kanji: 40 },
    science: { kihon: 65, renshu: 27 },
    social: { kihon: 61, renshu: 15, oyo: 8 },
  },
  gohan5: {
    math: { ichigyo: 0, kihon: 0, jissen: 0 },
    japanese: { kanji: 0 },
    science: { kihon: 0, renshu: 0 },
    social: { kihon: 0, renshu: 0, oyo: 0 },
  },
  session10: {
    math: { ichigyo: 20, kihon: 13, jissen: 13 },
    japanese: { kanji: 40 },
    science: { kihon: 44, renshu: 39 },
    social: { kihon: 63, renshu: 12, oyo: 10 },
  },
  session11: {
    math: { ichigyo: 18, kihon: 12, jissen: 14 },
    japanese: { kanji: 40 },
    science: { kihon: 40, renshu: 30 },
    social: { kihon: 52, renshu: 28, oyo: 17 },
  },
  gohan6: {
    math: { ichigyo: 0, kihon: 0, jissen: 0 },
    japanese: { kanji: 0 },
    science: { kihon: 0, renshu: 0 },
    social: { kihon: 0, renshu: 0, oyo: 0 },
  },
  session12: {
    math: { ichigyo: 19, kihon: 13, jissen: 12 },
    japanese: { kanji: 40 },
    science: { kihon: 40, renshu: 38 },
    social: { kihon: 65, renshu: 12, oyo: 9 },
  },
  session13: {
    math: { ichigyo: 9, kihon: 21, jissen: 0 },
    japanese: { kanji: 40 },
    science: { kihon: 32, renshu: 40 },
    social: { kihon: 88, renshu: 36, oyo: 10 },
  },
  session14: {
    math: { ichigyo: 9, kihon: 24, jissen: 0 },
    japanese: { kanji: 40 },
    science: { kihon: 34, renshu: 44 },
    social: { kihon: 161, renshu: 15, oyo: 10 },
  },
  session15: {
    math: { ichigyo: 9, kihon: 23, jissen: 0 },
    japanese: { kanji: 40 },
    science: { kihon: 30, renshu: 36 },
    social: { kihon: 71, renshu: 23, oyo: 7 },
  },
}

const levels = {
  spark: { name: "Spark", icon: Sparkles, description: "楽しくスタート", color: "text-primary" },
  flame: { name: "Flame", icon: Flame, description: "成長ステップ", color: "text-red-500" },
  blaze: { name: "Blaze", icon: Crown, description: "最高にチャレンジ", color: "text-purple-500" },
}

const grade5Sessions = [
  { id: "session1", name: "第1回", period: "8/31〜9/6" },
  { id: "session2", name: "第2回", period: "9/7〜9/13" },
  { id: "session3", name: "第3回", period: "9/14〜9/20" },
  { id: "session4", name: "第4回", period: "9/21〜9/27" },
  { id: "session5", name: "第5回", period: "9/28〜10/4" },
  { id: "session6", name: "第6回", period: "10/5〜10/11" },
  { id: "session7", name: "第7回", period: "10/12〜10/18" },
  { id: "session8", name: "第8回", period: "10/19〜10/25" },
  { id: "session9", name: "第9回", period: "10/26〜11/1" },
  { id: "session10", name: "第10回", period: "11/2〜11/8" },
  { id: "session11", name: "第11回", period: "11/9〜11/15" },
  { id: "session12", name: "第12回", period: "11/16〜11/22" },
  { id: "session13", name: "第13回", period: "11/23〜11/29" },
  { id: "session14", name: "第14回", period: "11/30〜12/6" },
  { id: "session15", name: "第15回", period: "12/7〜12/13" },
  { id: "session16", name: "第16回", period: "12/14〜12/20" },
  { id: "session17", name: "第17回", period: "12/21〜1/10" },
  { id: "session18", name: "第18回", period: "1/11〜1/17" },
  { id: "session19", name: "第19回", period: "1/18〜1/24" },
]

const grade6Sessions = [
  { id: "gohan3", name: "合不合第3回", period: "8/31〜9/6" },
  { id: "session2", name: "第2回", period: "9/7〜9/13" },
  { id: "session3", name: "第3回", period: "9/14〜9/20" },
  { id: "session4", name: "第4回", period: "9/21〜9/27" },
  { id: "gohan4", name: "合不合第4回", period: "9/28〜10/4" },
  { id: "session5", name: "第5回", period: "10/5〜10/11" },
  { id: "session6", name: "第6回", period: "10/12〜10/18" },
  { id: "session7", name: "第7回", period: "10/19〜10/25" },
  { id: "session8", name: "第8回", period: "10/26〜11/1" },
  { id: "session9", name: "第9回", period: "11/2〜11/8" },
  { id: "gohan5", name: "合不合第5回", period: "11/9〜11/15" },
  { id: "session10", name: "第10回", period: "11/16〜11/22" },
  { id: "session11", name: "第11回", period: "11/23〜11/29" },
  { id: "gohan6", name: "合不合第6回", period: "11/30〜12/6" },
  { id: "session12", name: "第12回", period: "12/7〜12/13" },
  { id: "session13", name: "第13回", period: "12/14〜12/20" },
  { id: "session14", name: "第14回", period: "12/21〜1/10" },
  { id: "session15", name: "第15回", period: "1/11〜1/17" },
]

const getCurrentLearningSession = (grade: string) => {
  const today = new Date()
  const sessions = grade === "5" ? grade5Sessions : grade6Sessions

  for (const session of sessions) {
    const [startDate, endDate] = session.period.split("〜")
    const currentYear = today.getFullYear()

    // Parse start date
    const [startMonth, startDay] = startDate.split("/").map(Number)
    const startYear = startMonth >= 8 ? currentYear : currentYear + 1
    const start = new Date(startYear, startMonth - 1, startDay)

    // Parse end date
    const [endMonth, endDay] = endDate.split("/").map(Number)
    const endYear = endMonth >= 8 ? currentYear : currentYear + 1
    const end = new Date(endYear, endMonth - 1, endDay, 23, 59, 59)

    if (today >= start && today <= end) {
      return session.id
    }
  }

  // If no current session found, return the first session
  return sessions[0].id
}

export default function SparkPage() {
  const [selectedSession, setSelectedSession] = useState("")
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([])
  const [subjectDetails, setSubjectDetails] = useState<{
    [key: string]: {
      [contentId: string]: number // correct answers count
    }
  }>({})
  const [reflection, setReflection] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [currentCourse, setCurrentCourse] = useState<"A" | "B" | "C" | "S">("C") // デモ用にCコースに設定
  const [weeklyRecords, setWeeklyRecords] = useState(4) // Mock data - デモ用に3以上に設定
  const [weeklyContentRecords, setWeeklyContentRecords] = useState(3) // Mock data - デモ用に3以上に設定
  const [showReflectionOptions, setShowReflectionOptions] = useState(false)
  const [aiReflections, setAiReflections] = useState<string[]>([])
  const [isGeneratingAI, setIsGeneratingAI] = useState(false)
  const [reflectionMode, setReflectionMode] = useState<"manual" | "ai" | null>(null)

  const [studentGrade, setStudentGrade] = useState<string>("6")

  useEffect(() => {
    if (typeof window !== "undefined") {
      const grade = localStorage.getItem("studentGrade") || "6"
      setStudentGrade(grade)
      const currentSession = getCurrentLearningSession(grade)
      setSelectedSession(currentSession)

      const goalRecords = localStorage.getItem("goalRecords")
      if (goalRecords) {
        try {
          const records = JSON.parse(goalRecords)
          // Get the latest course from goal records
          const latestRecord = records[records.length - 1]
          if (latestRecord?.course) {
            setCurrentCourse(latestRecord.course)
          }
        } catch (e) {
          console.log("No goal records found, using default course A")
        }
      }
    }
  }, [])

  const getCurrentLevel = () => {
    if (currentCourse === "A") return "spark"
    if (currentCourse === "B") return "flame"
    return "blaze" // C or S course
  }

  const currentLevel = getCurrentLevel()
  const canAccessFlame = weeklyRecords >= 3
  const canAccessBlaze = currentLevel === "flame" && weeklyContentRecords >= 3
  const progressToFlame = Math.min((weeklyRecords / 3) * 100, 100)
  const progressToBlaze = currentLevel === "flame" ? Math.min((weeklyContentRecords / 3) * 100, 100) : 0

  const getAvailableLearningContent = (subjectId: string) => {
    const contentMap = studentGrade === "5" ? grade5LearningContent : grade6LearningContent
    const subjectContent = contentMap[subjectId as keyof typeof contentMap] || []

    return subjectContent.filter((content) => {
      if (currentCourse === "A") return content.course === "A"
      if (currentCourse === "B") return content.course === "A" || content.course === "B"
      return true // C and S courses can access all content
    })
  }

  const getProblemCount = (subjectId: string, contentId: string) => {
    const problemData = studentGrade === "5" ? grade5ProblemCounts : grade6ProblemCounts
    const sessionData = problemData[selectedSession as keyof typeof problemData]
    if (!sessionData) return 0

    const subjectData = sessionData[subjectId as keyof typeof sessionData]
    if (!subjectData) return 0

    return subjectData[contentId as keyof typeof subjectData] || 0
  }

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
          [subjectId]: {},
        }))
        return [...prev, subjectId]
      }
    })
  }

  const handleCorrectAnswersChange = (subjectId: string, contentId: string, value: number) => {
    setSubjectDetails((prev) => ({
      ...prev,
      [subjectId]: {
        ...prev[subjectId],
        [contentId]: value,
      },
    }))
  }

  const generateAIReflections = async () => {
    setIsGeneratingAI(true)

    setTimeout(() => {
      const studiedSubjects = selectedSubjects.map((id) => subjects.find((s) => s.id === id)?.name).join("、")

      const celebrateReflection = `今日は${studiedSubjects}の学習に取り組めました。特に難しい問題にも諦めずに挑戦できたのは素晴らしいことです。`
      const insightReflection = `${studiedSubjects}を学習する中で、基礎をしっかり理解することの大切さに気づきました。一つひとつ丁寧に取り組むことで理解が深まります。`
      const nextStepReflection = `明日は今日間違えた問題を復習し、もし分からない部分があれば先生に質問して、確実に理解してから次に進みます。`

      setAiReflections([celebrateReflection, insightReflection, nextStepReflection])
      setIsGeneratingAI(false)
    }, 2000)
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)

    setTimeout(() => {
      console.log("Learning record saved:", {
        session: selectedSession,
        subjects: selectedSubjects,
        details: subjectDetails,
        reflection,
        course: currentCourse,
        level: currentLevel,
      })

      // Reset form
      setSelectedSubjects([])
      setSubjectDetails({})
      setReflection("")
      setShowReflectionOptions(false)
      setAiReflections([])
      setReflectionMode(null)
      setIsSubmitting(false)

      alert("学習記録を保存しました！")
    }, 1000)
  }

  const isFormValid = () => {
    if (!selectedSession) return false
    if (selectedSubjects.length === 0) return false

    return selectedSubjects.every((subjectId) => {
      const details = subjectDetails[subjectId]
      if (!details) return false

      const availableContent = getAvailableLearningContent(subjectId)
      return (
        availableContent.length > 0 &&
        availableContent.some((content) => details[content.id] !== undefined && details[content.id] >= 0)
      )
    })
  }

  const CurrentLevelIcon = levels[currentLevel].icon

  const getAvailableSessions = () => {
    return studentGrade === "5" ? grade5Sessions : grade6Sessions
  }

  const getLevelDisplayName = () => {
    if (currentCourse === "A") return "Spark（楽しくスタート）"
    if (currentCourse === "B") return "Flame（成長ステップ）"
    return "Blaze（最高にチャレンジ）"
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 pb-20">
      {/* Header */}
      <div className="bg-card/80 backdrop-blur-sm border-b border-border/50 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                <CurrentLevelIcon className={`h-6 w-6 ${levels[currentLevel].color}`} />
                スパーク - {getLevelDisplayName()}
              </h1>
              <p className="text-sm text-muted-foreground">コース: {currentCourse}コース</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Learning Session Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              学習回 *
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Select value={selectedSession} onValueChange={setSelectedSession}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="学習回を選択してください" />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableSessions().map((session) => (
                    <SelectItem key={session.id} value={session.id}>
                      {session.name} ({session.period})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedSession && (
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {getAvailableSessions().find((s) => s.id === selectedSession)?.period}
                  </Badge>
                  {(() => {
                    const currentSession = getCurrentLearningSession(studentGrade)
                    return (
                      selectedSession === currentSession && (
                        <Badge variant="default" className="bg-primary text-primary-foreground text-xs">
                          今回
                        </Badge>
                      )
                    )
                  })()}
                </div>
              )}

              <p className="text-xs text-muted-foreground">小学{studentGrade}年生の学習回が表示されています</p>
            </div>
          </CardContent>
        </Card>

        {/* Subject Selection */}
        {selectedSession && (
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
        )}

        {/* Subject Details */}
        {selectedSubjects.length > 0 && selectedSession && (
          <div className="space-y-4">
            {selectedSubjects.map((subjectId) => {
              const subject = subjects.find((s) => s.id === subjectId)
              const availableContent = getAvailableLearningContent(subjectId)
              if (!subject || availableContent.length === 0) return null

              return (
                <Card key={subjectId} className="border-l-4 border-l-primary">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Badge className={subject.color}>{subject.name}</Badge>
                      の正答数入力
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {availableContent.map((content) => {
                      const maxProblems = getProblemCount(subjectId, content.id)
                      const currentValue = subjectDetails[subjectId]?.[content.id] || 0

                      if (maxProblems === 0) return null

                      return (
                        <div key={content.id} className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium">{content.name}</Label>
                            <Badge variant="outline" className="text-xs">
                              {currentValue} / {maxProblems}問
                            </Badge>
                          </div>

                          <div className="space-y-3">
                            <div className="space-y-2">
                              <Slider
                                value={[currentValue]}
                                onValueChange={(value) => handleCorrectAnswersChange(subjectId, content.id, value[0])}
                                max={maxProblems}
                                min={0}
                                step={1}
                                className="w-full"
                              />
                              <div className="flex justify-between text-xs text-muted-foreground">
                                <span>0問</span>
                                <span>{maxProblems}問</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <Label className="text-sm">直接入力:</Label>
                              <Input
                                type="number"
                                min={0}
                                max={maxProblems}
                                value={currentValue}
                                onChange={(e) => {
                                  const value = Math.min(Math.max(0, Number.parseInt(e.target.value) || 0), maxProblems)
                                  handleCorrectAnswersChange(subjectId, content.id, value)
                                }}
                                className="w-20 text-center"
                              />
                              <span className="text-sm text-muted-foreground">/ {maxProblems}問</span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-accent" />
              今日の振り返り（任意）
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!showReflectionOptions ? (
              <div className="grid grid-cols-1 gap-3">
                <Button
                  onClick={() => {
                    setShowReflectionOptions(true)
                    setReflectionMode("manual")
                    setReflection("")
                    setAiReflections([])
                  }}
                  variant="outline"
                  className="h-auto p-4 text-left"
                >
                  <div>
                    <div className="font-medium">今日の振り返りをする</div>
                    <div className="text-sm text-muted-foreground mt-1">自分の言葉で今日の学習を振り返る</div>
                  </div>
                </Button>

                <Button
                  onClick={() => {
                    setShowReflectionOptions(true)
                    setReflectionMode("ai")
                    setReflection("")
                    generateAIReflections()
                  }}
                  variant="outline"
                  className="h-auto p-4 text-left"
                >
                  <div>
                    <div className="font-medium">今日の振り返りを生成</div>
                    <div className="text-sm text-muted-foreground mt-1">学習記録に基づいた3つの選択肢から選ぶ</div>
                  </div>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {reflectionMode === "manual" && (
                  <div className="space-y-3">
                    <Textarea
                      placeholder="今日の学習はどうでしたか？感じたことや気づいたことを自由に書いてみましょう。"
                      value={reflection}
                      onChange={(e) => setReflection(e.target.value)}
                      className="min-h-[120px] text-base"
                      maxLength={200}
                    />
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">目安80-120字</span>
                      <span className="text-xs text-muted-foreground">{reflection.length}/200文字</span>
                    </div>
                  </div>
                )}

                {reflectionMode === "ai" && (
                  <div className="space-y-3">
                    {isGeneratingAI ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        <span className="ml-2 text-sm text-muted-foreground">振り返りを生成中...</span>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-sm text-muted-foreground mb-3">
                          学習内容に基づいて3つの振り返りを生成しました。気に入ったものを選んでください：
                        </p>
                        {aiReflections.map((reflectionText, index) => {
                          const types = [
                            "Celebrate系（できたこと）",
                            "Insight系（学び・気づき）",
                            "Next step系（次への行動）",
                          ]
                          return (
                            <Button
                              key={index}
                              onClick={() => setReflection(reflectionText)}
                              variant={reflection === reflectionText ? "default" : "outline"}
                              className="h-auto p-4 text-left w-full"
                            >
                              <div className="space-y-1">
                                <div className="text-xs text-muted-foreground">{types[index]}</div>
                                <div className="text-sm">{reflectionText}</div>
                              </div>
                            </Button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      setShowReflectionOptions(false)
                      setReflectionMode(null)
                      setReflection("")
                      setAiReflections([])
                    }}
                    variant="outline"
                    size="sm"
                  >
                    戻る
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="sticky bottom-24 md:bottom-6">
          <Button
            onClick={handleSubmit}
            disabled={!isFormValid() || isSubmitting}
            className="w-full h-14 text-lg font-medium shadow-lg bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Save className="h-5 w-5 mr-2" />
            {isSubmitting ? "保存中..." : "学習記録を保存"}
          </Button>
        </div>

        {/* Form Validation Message */}
        {selectedSubjects.length > 0 && !isFormValid() && (
          <div className="p-4 bg-accent/10 border border-accent/20 rounded-lg">
            <p className="text-sm text-accent font-medium">
              {!selectedSession ? "学習回を選択してください" : "選択した科目の正答数を入力してください"}
            </p>
          </div>
        )}
      </div>

      <BottomNavigation activeTab="spark" />
    </div>
  )
}
