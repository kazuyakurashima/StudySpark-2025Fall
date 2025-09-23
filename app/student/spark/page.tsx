"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { BottomNavigation } from "@/components/bottom-navigation"
import { Calendar, BookOpen, MessageSquare, Save, Sparkles, Flame, Crown, Bot } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

const subjects = [
  {
    id: "math",
    name: "算数",
    color:
      "bg-gradient-to-br from-blue-50 via-blue-100 to-blue-200 text-blue-900 border-blue-200 hover:from-blue-100 hover:via-blue-200 hover:to-blue-300",
    accent: "border-l-blue-500",
    badge: "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg",
    sliderColor: "from-blue-400 to-blue-600",
    progressBg: "bg-blue-100",
    progressFill: "bg-gradient-to-r from-blue-500 to-blue-600",
  },
  {
    id: "japanese",
    name: "国語",
    color:
      "bg-gradient-to-br from-emerald-50 via-emerald-100 to-emerald-200 text-emerald-900 border-emerald-200 hover:from-emerald-100 hover:via-emerald-200 hover:to-emerald-300",
    accent: "border-l-emerald-500",
    badge: "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg",
    sliderColor: "from-emerald-400 to-emerald-600",
    progressBg: "bg-emerald-100",
    progressFill: "bg-gradient-to-r from-emerald-500 to-emerald-600",
  },
  {
    id: "science",
    name: "理科",
    color:
      "bg-gradient-to-br from-purple-50 via-purple-100 to-purple-200 text-purple-900 border-purple-200 hover:from-purple-100 hover:via-purple-200 hover:to-purple-300",
    accent: "border-l-purple-500",
    badge: "bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg",
    sliderColor: "from-purple-400 to-purple-600",
    progressBg: "bg-purple-100",
    progressFill: "bg-gradient-to-r from-purple-500 to-purple-600",
  },
  {
    id: "social",
    name: "社会",
    color:
      "bg-gradient-to-br from-amber-50 via-amber-100 to-amber-200 text-amber-900 border-amber-200 hover:from-amber-100 hover:via-amber-200 hover:to-amber-300",
    accent: "border-l-amber-500",
    badge: "bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg",
    sliderColor: "from-amber-400 to-amber-600",
    progressBg: "bg-amber-100",
    progressFill: "bg-gradient-to-r from-amber-500 to-amber-600",
  },
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 pb-20">
      <div className="bg-white/95 backdrop-blur-lg border-b border-slate-200/60 shadow-lg p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                <CurrentLevelIcon className={`h-7 w-7 ${levels[currentLevel].color}`} />
                スパーク - {getLevelDisplayName()}
              </h1>
              <p className="text-sm text-slate-600 mt-1 font-medium">コース: {currentCourse}コース</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6 space-y-8">
        <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm ring-1 ring-slate-200/50">
          <CardHeader className="pb-4 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 rounded-t-lg">
            <CardTitle className="flex items-center gap-3 text-lg font-semibold text-slate-800">
              <Calendar className="h-6 w-6 text-blue-600" />
              学習回 *
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <Select value={selectedSession} onValueChange={setSelectedSession}>
                <SelectTrigger className="w-full h-14 text-base border-2 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 rounded-xl shadow-sm">
                  <SelectValue placeholder="学習回を選択してください" />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableSessions().map((session) => (
                    <SelectItem key={session.id} value={session.id} className="text-base py-3">
                      {session.name} ({session.period})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedSession && (
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="text-sm px-4 py-2 bg-slate-50 border-slate-300 font-medium">
                    {getAvailableSessions().find((s) => s.id === selectedSession)?.period}
                  </Badge>
                  {(() => {
                    const currentSession = getCurrentLearningSession(studentGrade)
                    return (
                      selectedSession === currentSession && (
                        <Badge className="bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm px-4 py-2 shadow-lg">
                          今回
                        </Badge>
                      )
                    )
                  })()}
                </div>
              )}

              <p className="text-sm text-slate-600 font-medium">小学{studentGrade}年生の学習回が表示されています</p>
            </div>
          </CardContent>
        </Card>

        {selectedSession && (
          <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm ring-1 ring-slate-200/50">
            <CardHeader className="pb-4 bg-gradient-to-r from-green-50/50 to-emerald-50/50 rounded-t-lg">
              <CardTitle className="flex items-center gap-3 text-lg font-semibold text-slate-800">
                <BookOpen className="h-6 w-6 text-emerald-600" />
                学習した科目 *
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {subjects.map((subject) => (
                  <button
                    key={subject.id}
                    onClick={() => handleSubjectToggle(subject.id)}
                    className={`p-6 rounded-2xl border-2 transition-all duration-300 transform shadow-lg ${
                      selectedSubjects.includes(subject.id)
                        ? `${subject.color} shadow-xl scale-105 border-opacity-100 ring-2 ring-offset-2 ring-opacity-30`
                        : `bg-white border-slate-200 hover:border-slate-300 hover:shadow-xl hover:scale-102`
                    }`}
                  >
                    <div className="flex items-center justify-center">
                      <span className="font-bold text-lg">{subject.name}</span>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {selectedSubjects.length > 0 && selectedSession && (
          <div className="space-y-6">
            {selectedSubjects.map((subjectId) => {
              const subject = subjects.find((s) => s.id === subjectId)
              const availableContent = getAvailableLearningContent(subjectId)
              if (!subject || availableContent.length === 0) return null

              return (
                <Card
                  key={subjectId}
                  className={`shadow-xl border-0 bg-white/95 backdrop-blur-sm border-l-8 ${subject.accent} ring-1 ring-slate-200/50`}
                >
                  <CardHeader className="pb-4">
                    <CardTitle className="text-xl flex items-center gap-3">
                      <Badge className={`${subject.badge} px-6 py-3 text-base font-bold rounded-xl`}>
                        {subject.name}
                      </Badge>
                      の正答数入力
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {availableContent.map((content) => {
                      const maxProblems = getProblemCount(subjectId, content.id)
                      const currentValue = subjectDetails[subjectId]?.[content.id] || 0

                      if (maxProblems === 0) return null

                      return (
                        <div
                          key={content.id}
                          className="space-y-6 p-6 bg-gradient-to-br from-slate-50/80 to-white rounded-2xl border-2 border-slate-100 shadow-lg"
                        >
                          <div className="space-y-4">
                            <div className="px-3">
                              <div className="relative">
                                <input
                                  type="range"
                                  min={0}
                                  max={maxProblems}
                                  value={currentValue}
                                  onChange={(e) => {
                                    const value = Number.parseInt(e.target.value)
                                    handleCorrectAnswersChange(subjectId, content.id, value)
                                  }}
                                  className={`w-full h-4 rounded-full appearance-none cursor-pointer shadow-inner
                                    ${subject.progressBg}
                                    [&::-webkit-slider-track]:h-4 [&::-webkit-slider-track]:rounded-full [&::-webkit-slider-track]:${subject.progressBg} [&::-webkit-slider-track]:shadow-inner
                                    [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-8 [&::-webkit-slider-thumb]:w-8 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-xl [&::-webkit-slider-thumb]:cursor-pointer
                                    [&::-webkit-slider-thumb]:border-4 [&::-webkit-slider-thumb]:${
                                      subjectId === "math"
                                        ? "border-blue-500"
                                        : subjectId === "japanese"
                                          ? "border-emerald-500"
                                          : subjectId === "science"
                                            ? "border-purple-500"
                                            : "border-amber-500"
                                    }
                                    [&::-moz-range-track]:h-4 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:${subject.progressBg} [&::-moz-range-track]:border-0
                                    [&::-moz-range-thumb]:h-8 [&::-moz-range-thumb]:w-8 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:shadow-xl [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-0
                                    [&::-moz-range-thumb]:border-4 [&::-moz-range-thumb]:${
                                      subjectId === "math"
                                        ? "border-blue-500"
                                        : subjectId === "japanese"
                                          ? "border-emerald-500"
                                          : subjectId === "science"
                                            ? "border-purple-500"
                                            : "border-amber-500"
                                    }
                                    focus:outline-none focus:ring-4 focus:${
                                      subjectId === "math"
                                        ? "ring-blue-200"
                                        : subjectId === "japanese"
                                          ? "ring-emerald-200"
                                          : subjectId === "science"
                                            ? "ring-purple-200"
                                            : "ring-amber-200"
                                    }`}
                                />
                                <div
                                  className={`absolute top-0 left-0 h-4 ${subject.progressFill} rounded-full transition-all duration-500 ease-out shadow-sm pointer-events-none`}
                                  style={{ width: `${(currentValue / maxProblems) * 100}%` }}
                                />
                              </div>
                            </div>
                            <div className="flex justify-between text-sm text-slate-600 font-bold px-3">
                              <span>0問</span>
                              <span>{maxProblems}問</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-6 p-4 bg-white rounded-xl border-2 border-slate-200 shadow-lg">
                            <Label className="text-lg font-bold text-slate-700 min-w-fit">数値で入力:</Label>
                            <Input
                              type="number"
                              min={0}
                              max={maxProblems}
                              value={currentValue}
                              onChange={(e) => {
                                const value = Math.min(Math.max(0, Number.parseInt(e.target.value) || 0), maxProblems)
                                handleCorrectAnswersChange(subjectId, content.id, value)
                              }}
                              className="w-32 h-12 text-center text-xl font-bold border-2 border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 rounded-xl shadow-sm"
                            />
                            <span className="text-lg text-slate-600 font-bold">/ {maxProblems}問</span>
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

        <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm ring-1 ring-slate-200/50">
          <CardHeader className="pb-4 bg-gradient-to-r from-purple-50/50 to-pink-50/50 rounded-t-lg">
            <CardTitle className="flex items-center gap-3 text-lg font-semibold text-slate-800">
              <MessageSquare className="h-6 w-6 text-purple-600" />
              今日の振り返り（任意）
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            {!showReflectionOptions ? (
              <div className="grid grid-cols-1 gap-6">
                <Button
                  onClick={() => {
                    setShowReflectionOptions(true)
                    setReflectionMode("manual")
                    setReflection("")
                    setAiReflections([])
                  }}
                  variant="outline"
                  className="h-auto p-6 text-left border-2 border-slate-200 hover:border-purple-400 hover:bg-purple-50/70 transition-all duration-300 rounded-xl shadow-lg hover:shadow-xl"
                >
                  <div>
                    <div className="font-bold text-lg text-slate-800">今日の振り返りをする</div>
                    <div className="text-base text-slate-600 mt-2">自分の言葉で今日の学習を振り返る</div>
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
                  className="h-auto p-6 text-left border-2 border-slate-200 hover:border-blue-400 hover:bg-blue-50/70 transition-all duration-300 rounded-xl shadow-lg hover:shadow-xl"
                >
                  <div className="flex items-start gap-4">
                    <Avatar className="h-12 w-12 border-2 border-blue-200 shadow-lg">
                      <AvatarImage src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/ai_coach-oDEKn6ZVqTbEdoExg9hsYQC4PTNbkt.png" />
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold">
                        <Bot className="h-6 w-6" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-bold text-lg text-slate-800">今日の振り返りを生成</div>
                      <div className="text-base text-slate-600 mt-2">AIコーチが学習記録に基づいた3つの選択肢を作成</div>
                    </div>
                  </div>
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {reflectionMode === "manual" && (
                  <div className="space-y-4">
                    <Textarea
                      placeholder="今日の学習はどうでしたか？感じたことや気づいたことを自由に書いてみましょう。"
                      value={reflection}
                      onChange={(e) => setReflection(e.target.value)}
                      className="min-h-[160px] text-lg border-2 border-slate-300 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 p-6 rounded-xl shadow-lg"
                      maxLength={200}
                    />
                    <div className="flex justify-between items-center">
                      <span className="text-base text-slate-600 font-bold">目安80-120字</span>
                      <span className="text-base text-slate-600 font-bold">{reflection.length}/200文字</span>
                    </div>
                  </div>
                )}

                {reflectionMode === "ai" && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-4 p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200 shadow-lg">
                      <Avatar className="h-14 w-14 border-3 border-blue-300 shadow-xl flex-shrink-0">
                        <AvatarImage src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/ai_coach-oDEKn6ZVqTbEdoExg9hsYQC4PTNbkt.png" />
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold">
                          <Bot className="h-7 w-7" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="font-bold text-xl text-slate-800 mb-2">AIコーチ</div>
                        <div className="text-base text-slate-600 leading-relaxed">
                          あなたの学習記録を分析して振り返りを作成しました
                        </div>
                      </div>
                    </div>

                    {isGeneratingAI ? (
                      <div className="flex items-center justify-center py-16 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl border border-blue-200 shadow-lg">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600"></div>
                        <span className="ml-6 text-xl text-slate-700 font-medium">振り返りを生成中...</span>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200 shadow-lg">
                          <p className="text-lg text-slate-700 font-medium leading-relaxed">
                            学習内容に基づいて3つの振り返りを生成しました。気に入ったものを選んでください：
                          </p>
                        </div>
                        <div className="space-y-4">
                          {aiReflections.map((reflectionText, index) => {
                            const colors = [
                              "border-green-300 hover:bg-green-50 hover:border-green-400",
                              "border-blue-300 hover:bg-blue-50 hover:border-blue-400",
                              "border-purple-300 hover:bg-purple-50 hover:border-purple-400",
                            ]
                            const selectedColors = [
                              "bg-gradient-to-r from-green-500 to-green-600 text-white shadow-xl border-green-500",
                              "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-xl border-blue-500",
                              "bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-xl border-purple-500",
                            ]
                            return (
                              <Button
                                key={index}
                                onClick={() => setReflection(reflectionText)}
                                variant="outline"
                                className={`h-auto p-6 text-left w-full border-2 transition-all duration-300 rounded-xl shadow-lg hover:shadow-xl ${
                                  reflection === reflectionText ? selectedColors[index] : `bg-white ${colors[index]}`
                                }`}
                              >
                                <div className="text-base leading-relaxed font-medium break-words whitespace-normal overflow-wrap-anywhere">
                                  {reflectionText}
                                </div>
                              </Button>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-4">
                  <Button
                    onClick={() => {
                      setShowReflectionOptions(false)
                      setReflectionMode(null)
                      setReflection("")
                      setAiReflections([])
                    }}
                    variant="outline"
                    className="px-8 py-3 border-2 border-slate-300 hover:bg-slate-50 rounded-xl shadow-lg font-bold"
                  >
                    戻る
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="sticky bottom-24 md:bottom-6">
          <Button
            onClick={handleSubmit}
            disabled={!isFormValid() || isSubmitting}
            className="w-full h-18 text-xl font-bold shadow-2xl bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 text-white hover:from-blue-700 hover:via-blue-800 hover:to-indigo-800 disabled:from-slate-400 disabled:to-slate-500 transition-all duration-300 rounded-2xl border-0"
          >
            <Save className="h-7 w-7 mr-4" />
            {isSubmitting ? "保存中..." : "学習記録を保存"}
          </Button>
        </div>

        {selectedSubjects.length > 0 && !isFormValid() && (
          <div className="p-6 bg-gradient-to-r from-amber-50 to-orange-50 border-l-8 border-amber-400 rounded-2xl shadow-xl">
            <p className="text-lg text-amber-800 font-bold">
              {!selectedSession ? "学習回を選択してください" : "選択した科目の正答数を入力してください"}
            </p>
          </div>
        )}
      </div>

      <BottomNavigation activeTab="spark" />
    </div>
  )
}
