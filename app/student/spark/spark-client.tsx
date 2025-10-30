"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { BottomNavigation } from "@/components/bottom-navigation"
import { UserProfileHeader } from "@/components/common/user-profile-header"
import { PageHeader } from "@/components/common/page-header"
import { Calendar, BookOpen, MessageSquare, Save, Sparkles, Flame, Crown, Bot } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  getStudySessions,
  getExistingStudyLog,
  getContentTypes,
  saveStudyLog,
  getContentTypeId,
  getCurrentSession,
} from "@/app/actions/study-log"
import { generateDailyReflections } from "@/app/actions/ai-reflection"
import { UserProfileProvider, useUserProfile } from "@/lib/hooks/use-user-profile"

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
      "bg-gradient-to-br from-pink-50 via-pink-100 to-pink-200 text-pink-900 border-pink-200 hover:from-pink-100 hover:via-pink-200 hover:to-pink-300",
    accent: "border-l-pink-500",
    badge: "bg-gradient-to-r from-pink-500 to-pink-600 text-white shadow-lg",
    sliderColor: "from-pink-400 to-pink-600",
    progressBg: "bg-pink-100",
    progressFill: "bg-gradient-to-r from-pink-500 to-pink-600",
  },
  {
    id: "science",
    name: "理科",
    color:
      "bg-gradient-to-br from-orange-50 via-orange-100 to-orange-200 text-orange-900 border-orange-200 hover:from-orange-100 hover:via-orange-200 hover:to-orange-300",
    accent: "border-l-orange-500",
    badge: "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg",
    sliderColor: "from-orange-400 to-orange-600",
    progressBg: "bg-orange-100",
    progressFill: "bg-gradient-to-r from-orange-500 to-orange-600",
  },
  {
    id: "social",
    name: "社会",
    color:
      "bg-gradient-to-br from-emerald-50 via-emerald-100 to-emerald-200 text-emerald-900 border-emerald-200 hover:from-emerald-100 hover:via-emerald-200 hover:to-emerald-300",
    accent: "border-l-emerald-500",
    badge: "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg",
    sliderColor: "from-emerald-400 to-emerald-600",
    progressBg: "bg-emerald-100",
    progressFill: "bg-gradient-to-r from-emerald-500 to-emerald-600",
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
    math: { ruirui: 7, kihon: 16, renshu: 12, jissen: 10 },
    japanese: { kakunin: 40 },
    science: { kihon: 12, renshu: 15, hatten: 4 },
    social: { renshu: 9, hatten: 6 },
  },
  session2: {
    math: { ruirui: 7, kihon: 10, renshu: 11, jissen: 12 },
    japanese: { kakunin: 40 },
    science: { kihon: 13, renshu: 21, hatten: 3 },
    social: { renshu: 9, hatten: 7 },
  },
  session3: {
    math: { ruirui: 5, kihon: 10, renshu: 11, jissen: 9 },
    japanese: { kakunin: 40 },
    science: { kihon: 14, renshu: 17, hatten: 5 },
    social: { renshu: 11, hatten: 6 },
  },
  session4: {
    math: { ruirui: 8, kihon: 15, renshu: 14, jissen: 13 },
    japanese: { kakunin: 40 },
    science: { kihon: 15, renshu: 14, hatten: 4 },
    social: { renshu: 15, hatten: 5 },
  },
  session5: {
    math: { ruirui: 0, kihon: 31, renshu: 12, jissen: 0 },
    japanese: { kakunin: 80 },
    science: { kihon: 0, renshu: 34, hatten: 16 },
    social: { renshu: 19, hatten: 19 },
  },
  session6: {
    math: { ruirui: 8, kihon: 14, renshu: 12, jissen: 10 },
    japanese: { kakunin: 40 },
    science: { kihon: 24, renshu: 17, hatten: 6 },
    social: { renshu: 11, hatten: 4 },
  },
  session7: {
    math: { ruirui: 6, kihon: 12, renshu: 10, jissen: 12 },
    japanese: { kakunin: 40 },
    science: { kihon: 16, renshu: 22, hatten: 5 },
    social: { renshu: 15, hatten: 6 },
  },
  session8: {
    math: { ruirui: 6, kihon: 9, renshu: 11, jissen: 12 },
    japanese: { kakunin: 40 },
    science: { kihon: 18, renshu: 18, hatten: 5 },
    social: { renshu: 5, hatten: 6 },
  },
  session9: {
    math: { ruirui: 6, kihon: 10, renshu: 11, jissen: 9 },
    japanese: { kakunin: 40 },
    science: { kihon: 17, renshu: 18, hatten: 6 },
    social: { renshu: 15, hatten: 7 },
  },
  session10: {
    math: { ruirui: 0, kihon: 26, renshu: 9, jissen: 0 },
    japanese: { kakunin: 80 },
    science: { kihon: 0, renshu: 31, hatten: 18 },
    social: { renshu: 18, hatten: 13 },
  },
  session11: {
    math: { ruirui: 8, kihon: 15, renshu: 11, jissen: 13 },
    japanese: { kakunin: 40 },
    science: { kihon: 18, renshu: 18, hatten: 3 },
    social: { renshu: 10, hatten: 9 },
  },
  session12: {
    math: { ruirui: 6, kihon: 12, renshu: 8, jissen: 8 },
    japanese: { kakunin: 40 },
    science: { kihon: 18, renshu: 11, hatten: 5 },
    social: { renshu: 12, hatten: 6 },
  },
  session13: {
    math: { ruirui: 7, kihon: 13, renshu: 15, jissen: 14 },
    japanese: { kakunin: 40 },
    science: { kihon: 18, renshu: 20, hatten: 2 },
    social: { renshu: 14, hatten: 9 },
  },
  session14: {
    math: { ruirui: 5, kihon: 14, renshu: 8, jissen: 12 },
    japanese: { kakunin: 40 },
    science: { kihon: 14, renshu: 20, hatten: 3 },
    social: { renshu: 11, hatten: 10 },
  },
  session15: {
    math: { ruirui: 0, kihon: 33, renshu: 13, jissen: 0 },
    japanese: { kakunin: 80 },
    science: { kihon: 0, renshu: 24, hatten: 12 },
    social: { renshu: 17, hatten: 22 },
  },
  session16: {
    math: { ruirui: 7, kihon: 17, renshu: 12, jissen: 10 },
    japanese: { kakunin: 40 },
    science: { kihon: 13, renshu: 12, hatten: 4 },
    social: { renshu: 7, hatten: 10 },
  },
  session17: {
    math: { ruirui: 6, kihon: 10, renshu: 10, jissen: 8 },
    japanese: { kakunin: 40 },
    science: { kihon: 18, renshu: 20, hatten: 8 },
    social: { renshu: 14, hatten: 7 },
  },
  session18: {
    math: { ruirui: 8, kihon: 15, renshu: 13, jissen: 11 },
    japanese: { kakunin: 40 },
    science: { kihon: 19, renshu: 14, hatten: 7 },
    social: { renshu: 14, hatten: 7 },
  },
  session19: {
    math: { ruirui: 0, kihon: 22, renshu: 0, jissen: 0 },
    japanese: { kakunin: 80 },
    science: { kihon: 0, renshu: 36, hatten: 16 },
    social: { renshu: 19, hatten: 18 },
  },
}

const grade6ProblemCounts = {
  session1: {
    math: { ichigyo: 20, kihon: 12, jissen: 13 },
    japanese: { kanji: 40 },
    science: { kihon: 25, renshu: 25 },
    social: { kihon: 60, renshu: 20, oyo: 10 },
  },
  session2: {
    math: { ichigyo: 22, kihon: 12, jissen: 13 },
    japanese: { kanji: 40 },
    science: { kihon: 26, renshu: 23 },
    social: { kihon: 63, renshu: 16, oyo: 14 },
  },
  session3: {
    math: { ichigyo: 19, kihon: 12, jissen: 12 },
    japanese: { kanji: 40 },
    science: { kihon: 31, renshu: 32 },
    social: { kihon: 55, renshu: 20, oyo: 5 },
  },
  session4: {
    math: { ichigyo: 22, kihon: 13, jissen: 14 },
    japanese: { kanji: 40 },
    science: { kihon: 29, renshu: 28 },
    social: { kihon: 55, renshu: 26, oyo: 10 },
  },
  session5: {
    math: { ichigyo: 21, kihon: 14, jissen: 14 },
    japanese: { kanji: 40 },
    science: { kihon: 20, renshu: 27 },
    social: { kihon: 50, renshu: 7, oyo: 7 },
  },
  session6: {
    math: { ichigyo: 17, kihon: 12, jissen: 15 },
    japanese: { kanji: 40 },
    science: { kihon: 22, renshu: 11 },
    social: { kihon: 52, renshu: 12, oyo: 5 },
  },
  session7: {
    math: { ichigyo: 22, kihon: 12, jissen: 12 },
    japanese: { kanji: 40 },
    science: { kihon: 25, renshu: 28 },
    social: { kihon: 55, renshu: 27, oyo: 9 },
  },
  session8: {
    math: { ichigyo: 20, kihon: 12, jissen: 13 },
    japanese: { kanji: 40 },
    science: { kihon: 22, renshu: 22 },
    social: { kihon: 48, renshu: 16, oyo: 11 },
  },
  session9: {
    math: { ichigyo: 17, kihon: 12, jissen: 12 },
    japanese: { kanji: 40 },
    science: { kihon: 26, renshu: 18 },
    social: { kihon: 44, renshu: 9, oyo: 8 },
  },
  session10: {
    math: { ichigyo: 20, kihon: 13, jissen: 13 },
    japanese: { kanji: 40 },
    science: { kihon: 15, renshu: 22 },
    social: { kihon: 63, renshu: 10, oyo: 10 },
  },
  session11: {
    math: { ichigyo: 18, kihon: 12, jissen: 14 },
    japanese: { kanji: 40 },
    science: { kihon: 28, renshu: 26 },
    social: { kihon: 33, renshu: 14, oyo: 10 },
  },
  session12: {
    math: { ichigyo: 19, kihon: 13, jissen: 12 },
    japanese: { kanji: 40 },
    science: { kihon: 21, renshu: 30 },
    social: { kihon: 37, renshu: 12, oyo: 9 },
  },
  session13: {
    math: { ichigyo: 9, kihon: 20, jissen: 0 },
    japanese: { kanji: 40 },
    science: { kihon: 22, renshu: 28 },
    social: { kihon: 40, renshu: 29, oyo: 9 },
  },
  session14: {
    math: { ichigyo: 9, kihon: 21, jissen: 0 },
    japanese: { kanji: 40 },
    science: { kihon: 22, renshu: 32 },
    social: { kihon: 52, renshu: 15, oyo: 8 },
  },
  session15: {
    math: { ichigyo: 9, kihon: 23, jissen: 0 },
    japanese: { kanji: 40 },
    science: { kihon: 24, renshu: 27 },
    social: { kihon: 60, renshu: 14, oyo: 3 },
  },
}

const grade5Sessions = [
  { id: "session1", name: "第1回", period: "9/1〜9/7" },
  { id: "session2", name: "第2回", period: "9/8〜9/14" },
  { id: "session3", name: "第3回", period: "9/15〜9/21" },
  { id: "session4", name: "第4回", period: "9/22〜9/28" },
  { id: "session5", name: "第5回", period: "9/29〜10/5" },
  { id: "session6", name: "第6回", period: "10/6〜10/12" },
  { id: "session7", name: "第7回", period: "10/13〜10/19" },
  { id: "session8", name: "第8回", period: "10/20〜10/26" },
  { id: "session9", name: "第9回", period: "10/27〜11/2" },
  { id: "session10", name: "第10回", period: "11/3〜11/9" },
  { id: "session11", name: "第11回", period: "11/10〜11/16" },
  { id: "session12", name: "第12回", period: "11/17〜11/23" },
  { id: "session13", name: "第13回", period: "11/24〜11/30" },
  { id: "session14", name: "第14回", period: "12/1〜12/7" },
  { id: "session15", name: "第15回", period: "12/8〜12/14" },
  { id: "session16", name: "第16回", period: "12/15〜12/21" },
  { id: "session17", name: "第17回", period: "12/22〜1/11" },
  { id: "session18", name: "第18回", period: "1/12〜1/18" },
  { id: "session19", name: "第19回", period: "1/19〜1/25" },
]

const grade6Sessions = [
  { id: "session1", name: "第1回", period: "8/25〜8/31" },
  { id: "session2", name: "第2回", period: "9/1〜9/7" },
  { id: "session3", name: "第3回", period: "9/8〜9/14" },
  { id: "session4", name: "第4回", period: "9/15〜9/21" },
  { id: "session5", name: "第5回", period: "9/22〜9/28" },
  { id: "session6", name: "第6回", period: "9/29〜10/5" },
  { id: "session7", name: "第7回", period: "10/6〜10/12" },
  { id: "session8", name: "第8回", period: "10/13〜10/19" },
  { id: "session9", name: "第9回", period: "10/20〜10/26" },
  { id: "session10", name: "第10回", period: "10/27〜11/2" },
  { id: "session11", name: "第11回", period: "11/3〜11/9" },
  { id: "session12", name: "第12回", period: "11/10〜11/16" },
  { id: "session13", name: "第13回", period: "11/17〜11/23" },
  { id: "session14", name: "第14回", period: "12/1〜12/7" },
  { id: "session15", name: "第15回", period: "1/12〜1/18" },
]

const levels = {
  spark: { name: "Spark", icon: Sparkles, description: "楽しくスタート", color: "text-primary" },
  flame: { name: "Flame", icon: Flame, description: "成長ステップ", color: "text-red-500" },
  blaze: { name: "Blaze", icon: Crown, description: "最高にチャレンジ", color: "text-purple-500" },
}

// 削除: getCurrentLearningSession() はServer Actionに置き換え

type SparkClientProps = {
  initialData: {
    student: {
      id: number
      grade: number
      course: "A" | "B" | "C" | "S"
    }
  }
  preselectedSubject?: string
}

function SparkClientInner({ initialData, preselectedSubject }: SparkClientProps) {
  const { profile, loading: profileLoading } = useUserProfile()

  // Prioritize profile.student over initialData.student for real-time updates
  const student = profile?.student || initialData.student
  const studentGrade = student.grade.toString()
  const currentCourse = student.course

  // セッション選択の状態（初期値はnull、useEffectでサーバーから取得）
  const [selectedSession, setSelectedSession] = useState<string | null>(null)
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null) // 現在の週のセッションDB ID
  const [currentSessionNumber, setCurrentSessionNumber] = useState<number | null>(null) // 現在の週のセッション番号
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(
    preselectedSubject ? [preselectedSubject] : []
  )
  const [subjectDetails, setSubjectDetails] = useState<{
    [key: string]: {
      [contentId: string]: number // correct answers count
    }
  }>({})
  const [reflection, setReflection] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [showReflectionOptions, setShowReflectionOptions] = useState(false)
  const [aiReflections, setAiReflections] = useState<string[]>([])
  const [isGeneratingAI, setIsGeneratingAI] = useState(false)
  const [reflectionMode, setReflectionMode] = useState<"manual" | "ai" | null>(null)

  // 初回マウント時に現在のセッションをサーバーから取得
  useEffect(() => {
    async function initializeCurrentSession() {
      const grade = parseInt(studentGrade)
      const session = await getCurrentSession(grade)

      if (session) {
        setCurrentSessionId(session.id)
        setCurrentSessionNumber(session.session_number)
        setSelectedSession(`session${session.session_number}`)
      } else {
        // フォールバック: 最初のセッションを選択
        const sessions = grade === 5 ? grade5Sessions : grade6Sessions
        if (sessions.length > 0) {
          setSelectedSession(sessions[0].id)
        }
      }
    }

    initializeCurrentSession()
  }, [studentGrade])

  // Fetch existing study logs when session or subjects change
  useEffect(() => {
    async function fetchExistingLogs() {
      if (!selectedSession || selectedSubjects.length === 0) return

      try {
        // Get session ID from database
        const sessionNumber = parseInt(selectedSession.replace("session", ""))
        const grade = parseInt(studentGrade)

        const sessionsResult = await getStudySessions(grade)
        if (sessionsResult.error || !sessionsResult.sessions) {
          return
        }

        const targetSession = sessionsResult.sessions.find((s) => s.session_number === sessionNumber)
        if (!targetSession) {
          return
        }

        const subjectIdMap: { [key: string]: number } = {
          math: 1,
          japanese: 2,
          science: 3,
          social: 4,
        }

        // Fetch existing logs for all selected subjects
        for (const subjectId of selectedSubjects) {
          const dbSubjectId = subjectIdMap[subjectId]
          if (!dbSubjectId) continue

          const result = await getExistingStudyLog(targetSession.id, dbSubjectId)
          if (result.error || !result.logs || result.logs.length === 0) continue

          // Get content types to map study_content_type_id to content_name
          const contentTypesResult = await getContentTypes(grade, dbSubjectId, currentCourse)
          if (contentTypesResult.error || !contentTypesResult.contentTypes) continue

          // Pre-fill the form with existing data
          const newDetails: { [contentId: string]: number } = {}
          const availableContent = getAvailableLearningContent(subjectId)

          for (const log of result.logs) {
            // Find matching content type
            const contentType = contentTypesResult.contentTypes.find((ct) => ct.id === log.study_content_type_id)
            if (!contentType) continue

            // Find matching content in UI by name
            const matchingContent = availableContent.find((c) => c.name === contentType.content_name)
            if (matchingContent && newDetails[matchingContent.id] === undefined) {
              newDetails[matchingContent.id] = log.correct_count
            }

            // Set reflection if available (only once)
            if (log.reflection_text && !reflection) {
              setReflection(log.reflection_text)
            }
          }

          if (Object.keys(newDetails).length > 0) {
            setSubjectDetails((prev) => ({
              ...prev,
              [subjectId]: newDetails,
            }))
          }
        }
      } catch (error) {
        console.error("Failed to fetch existing logs:", error)
      }
    }

    fetchExistingLogs()
  }, [selectedSession, selectedSubjects.join(","), currentCourse])

  const getCurrentLevel = () => {
    if (currentCourse === "A") return "spark"
    if (currentCourse === "B") return "flame"
    return "blaze" // C or S course
  }

  const currentLevel = getCurrentLevel()

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

  const handleSessionChange = (newSession: string) => {
    setSelectedSession(newSession)
    // 学習回が変更されたら科目選択と入力内容をリセット
    setSelectedSubjects([])
    setSubjectDetails({})
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

    try {
      // 学習データを整形
      const studyData = {
        subjects: selectedSubjects,
        details: {} as any,
      }

      // 各科目の学習内容詳細を追加
      for (const subjectId of selectedSubjects) {
        const contentDetails = subjectDetails[subjectId] || {}
        const availableContent = getAvailableLearningContent(subjectId)

        console.log(`[AI Reflection] Subject: ${subjectId}`)
        console.log(`[AI Reflection] Content Details:`, contentDetails)
        console.log(`[AI Reflection] Available Content:`, availableContent)

        studyData.details[subjectId] = {}

        for (const content of availableContent) {
          const maxProblems = getProblemCount(subjectId, content.id)
          const correctAnswers = contentDetails[content.id] || 0

          console.log(`[AI Reflection] Content: ${content.name} (${content.id})`)
          console.log(`[AI Reflection]   Max Problems: ${maxProblems}`)
          console.log(`[AI Reflection]   Correct Answers: ${correctAnswers}`)

          if (maxProblems > 0) {
            studyData.details[subjectId][content.id] = {
              contentName: content.name,
              correct: correctAnswers,
              total: maxProblems,
            }
          }
        }
      }

      console.log(`[AI Reflection] Final Study Data:`, JSON.stringify(studyData, null, 2))

      // AI生成を呼び出し
      const result = await generateDailyReflections(studyData)

      if (result.error) {
        console.error("AI reflection generation error:", result.error)
        // エラー時はフォールバックの定型文を使用
        const studiedSubjects = selectedSubjects.map((id) => subjects.find((s) => s.id === id)?.name).join("、")
        setAiReflections([
          `今日は${studiedSubjects}の学習に取り組めました。特に難しい問題にも諦めずに挑戦できたのは素晴らしいことです。`,
          `${studiedSubjects}を学習する中で、基礎をしっかり理解することの大切さに気づきました。一つひとつ丁寧に取り組むことで理解が深まります。`,
          `明日は今日間違えた問題を復習し、もし分からない部分があれば先生に質問して、確実に理解してから次に進みます。`,
        ])
      } else if (result.reflections) {
        setAiReflections(result.reflections)
      }
    } catch (error) {
      console.error("Failed to generate AI reflections:", error)
      // エラー時はフォールバックの定型文を使用
      const studiedSubjects = selectedSubjects.map((id) => subjects.find((s) => s.id === id)?.name).join("、")
      setAiReflections([
        `今日は${studiedSubjects}の学習に取り組めました。特に難しい問題にも諦めずに挑戦できたのは素晴らしいことです。`,
        `${studiedSubjects}を学習する中で、基礎をしっかり理解することの大切さに気づきました。一つひとつ丁寧に取り組むことで理解が深まります。`,
        `明日は今日間違えた問題を復習し、もし分からない部分があれば先生に質問して、確実に理解してから次に進みます。`,
      ])
    } finally {
      setIsGeneratingAI(false)
    }
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)

    try {
      // 1. Get session_id from Supabase (not from local mapping)
      const sessionNumber = parseInt(selectedSession.replace("session", ""))
      const grade = parseInt(studentGrade)

      const sessionsResult = await getStudySessions(grade)
      if (sessionsResult.error || !sessionsResult.sessions) {
        alert(`学習回の取得に失敗しました: ${sessionsResult.error}`)
        setIsSubmitting(false)
        return
      }

      const targetSession = sessionsResult.sessions.find((s) => s.session_number === sessionNumber)
      if (!targetSession) {
        alert(`学習回 ${sessionNumber} が見つかりません`)
        setIsSubmitting(false)
        return
      }

      const actualSessionId = targetSession.id

      // 2. Map subject IDs to database IDs (算数=1, 国語=2, 理科=3, 社会=4)
      const subjectIdMap: { [key: string]: number } = {
        math: 1,
        japanese: 2,
        science: 3,
        social: 4,
      }

      // 3. Prepare study logs for each subject and content
      const logs: Array<{
        session_id: number
        subject_id: number
        study_content_type_id: number
        correct_count: number
        total_problems: number
        study_date?: string
        reflection_text?: string
      }> = []

      // For each selected subject, create log entries
      for (const subjectId of selectedSubjects) {
        const dbSubjectId = subjectIdMap[subjectId]
        const details = subjectDetails[subjectId]

        if (!details || !dbSubjectId) continue

        // Get available learning content for this subject
        const availableContent = getAvailableLearningContent(subjectId)

        for (const [contentId, correctAnswers] of Object.entries(details)) {
          // Only save if there's a value entered
          if (correctAnswers === undefined || correctAnswers < 0) continue

          // Find content name from availableContent
          const contentItem = availableContent.find((c) => c.id === contentId)
          if (!contentItem) continue

          // 4. Get study_content_type_id from Supabase using getContentTypeId
          const contentTypeResult = await getContentTypeId(grade, dbSubjectId, currentCourse, contentItem.name)

          if (contentTypeResult.error || !contentTypeResult.id) {
            console.error(`学習内容タイプIDの取得に失敗: ${contentItem.name}`, contentTypeResult.error)
            continue
          }

          // Get total problems for this content
          const maxProblems = getProblemCount(subjectId, contentId)

          logs.push({
            session_id: actualSessionId,
            subject_id: dbSubjectId,
            study_content_type_id: contentTypeResult.id,
            correct_count: correctAnswers,
            total_problems: maxProblems,
            reflection_text: reflection || undefined,
          })
        }
      }

      if (logs.length === 0) {
        alert("保存する学習記録がありません")
        setIsSubmitting(false)
        return
      }

      const result = await saveStudyLog(logs)

      if (result.error) {
        alert(`エラー: ${result.error}`)
        setIsSubmitting(false)
        return
      }

      // Reset form
      setSelectedSubjects([])
      setSubjectDetails({})
      setReflection("")
      setShowReflectionOptions(false)
      setAiReflections([])
      setReflectionMode(null)
      setIsSubmitting(false)

      alert("学習記録を保存しました！")

      // ページトップにスムーズスクロール
      window.scrollTo({ top: 0, behavior: "smooth" })
    } catch (error) {
      console.error("Submit error:", error)
      alert("保存中にエラーが発生しました")
      setIsSubmitting(false)
    }
  }

  const isFormValid = () => {
    if (!selectedSession) return false
    if (selectedSubjects.length === 0) return false

    // 少なくとも1つの科目で、1つ以上の学習内容に入力があればOK
    // 問題数0の復習週や、一部の学習内容のみ入力する場合も許可
    return selectedSubjects.some((subjectId) => {
      const details = subjectDetails[subjectId]
      if (!details) return false

      const availableContent = getAvailableLearningContent(subjectId)
      if (availableContent.length === 0) return false

      // 問題数が0でない学習内容が1つでも入力されていればOK
      return availableContent.some((content) => {
        const maxProblems = getProblemCount(subjectId, content.id)
        const inputValue = details[content.id]

        // 問題数が0の場合は入力不要（復習週）
        if (maxProblems === 0) return false

        // 入力があればOK（0も有効な入力）
        return inputValue !== undefined && inputValue >= 0
      })
    })
  }

  const CurrentLevelIcon = levels[currentLevel].icon

  const getAvailableSessions = () => {
    return studentGrade === "5" ? grade5Sessions : grade6Sessions
  }

  const getLevelDisplayName = () => {
    if (currentCourse === "A") return "Spark(楽しくスタート)"
    if (currentCourse === "B") return "Flame(成長ステップ)"
    return "Blaze(最高にチャレンジ)"
  }

  // Show loading state while profile is being fetched
  if (profileLoading && !profile) {
    return (
      <>
        <UserProfileHeader />
        <PageHeader
          icon={Sparkles}
          title="スパーク"
          subtitle="読み込み中..."
          variant="student"
        />
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 pb-20">
          <div className="max-w-screen-xl mx-auto p-6">
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600"></div>
              <span className="ml-6 text-xl text-slate-700 font-medium">読み込み中...</span>
            </div>
          </div>
        </div>
        <BottomNavigation activeTab="spark" />
      </>
    )
  }

  return (
    <>
      <UserProfileHeader />
      <PageHeader
        icon={Sparkles}
        title={`スパーク - ${getLevelDisplayName()}`}
        subtitle={`${currentCourse}コース`}
        variant="student"
      />

      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 pb-20 ">

      <div className="max-w-screen-xl mx-auto p-6 space-y-8">
        <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm ring-1 ring-slate-200/50">
          <CardHeader className="pb-4 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 rounded-t-lg">
            <CardTitle className="flex items-center gap-3 text-lg font-semibold text-slate-800">
              <Calendar className="h-6 w-6 text-blue-600" />
              学習回 *
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <Select value={selectedSession} onValueChange={handleSessionChange}>
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

              {selectedSession && (() => {
                const selectedSessionNumber = parseInt(selectedSession.replace("session", ""))
                const isCurrentWeek = currentSessionNumber && selectedSessionNumber === currentSessionNumber

                return (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-sm px-4 py-2 bg-slate-50 border-slate-300 font-medium">
                        {getAvailableSessions().find((s) => s.id === selectedSession)?.period}
                      </Badge>
                      {isCurrentWeek && (
                        <Badge className="bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm px-4 py-2 shadow-lg">
                          今回
                        </Badge>
                      )}
                    </div>

                    {/* 警告: 選択セッション ≠ 現在の週 */}
                    {currentSessionNumber && !isCurrentWeek && (
                      <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border-l-4 border-amber-400 rounded-lg">
                        <p className="text-sm text-amber-800 font-semibold flex items-center gap-2">
                          <span className="text-lg">⚠️</span>
                          今週の学習回ではありません。過去または未来の週を選択しています。
                        </p>
                      </div>
                    )}
                  </div>
                )
              })()}

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

                      // 問題数が0の場合は復習週として表示
                      if (maxProblems === 0) {
                        return (
                          <div
                            key={content.id}
                            className="space-y-4 p-6 bg-gradient-to-br from-amber-50/80 to-orange-50/80 rounded-2xl border-2 border-amber-200 shadow-lg"
                          >
                            <div className="space-y-3 p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-300 shadow-sm">
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-amber-100 rounded-full">
                                  <svg
                                    className="w-6 h-6 text-amber-600"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                                    />
                                  </svg>
                                </div>
                                <h4 className="text-lg font-bold text-amber-800">{content.name}</h4>
                              </div>
                              <Badge
                                variant="outline"
                                className="px-3 py-1 text-sm font-bold bg-amber-100 text-amber-700 border-amber-300"
                              >
                                {content.course}コース
                              </Badge>
                            </div>
                            <div className="p-6 bg-white/80 rounded-xl border-2 border-amber-200 shadow-sm">
                              <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                  <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-400 rounded-full flex items-center justify-center shadow-lg">
                                    <svg
                                      className="w-6 h-6 text-white"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                      />
                                    </svg>
                                  </div>
                                  <div className="flex-1">
                                    <p className="text-xl font-bold text-slate-800 mb-1">今週は復習週です！</p>
                                    <p className="text-base text-slate-700">
                                      今までに解いた問題をもう一度復習して、理解を深めましょう。
                                    </p>
                                  </div>
                                </div>
                                <div className="mt-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
                                  <p className="text-sm text-slate-600 leading-relaxed">
                                    💡{" "}
                                    <span className="font-bold">復習のコツ:</span>{" "}
                                    間違えた問題や難しかった問題を中心に見直すと効果的です。わからないところは先生や保護者に質問してみましょう！
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      }

                      return (
                        <div
                          key={content.id}
                          className="space-y-6 p-6 bg-gradient-to-br from-slate-50/80 to-white rounded-2xl border-2 border-slate-100 shadow-lg"
                        >
                          <div className="space-y-3 p-4 bg-gradient-to-r from-slate-50 to-white rounded-xl border border-slate-200 shadow-sm">
                            <div className="flex items-center justify-between">
                              <h4 className="text-lg font-bold text-slate-800">{content.name}</h4>
                              <Badge
                                variant="outline"
                                className={`px-3 py-1 text-sm font-bold ${
                                  content.course === "A"
                                    ? "bg-green-50 text-green-700 border-green-300"
                                    : content.course === "B"
                                      ? "bg-blue-50 text-blue-700 border-blue-300"
                                      : "bg-purple-50 text-purple-700 border-purple-300"
                                }`}
                              >
                                {content.course}コース
                              </Badge>
                            </div>
                            <div className="text-sm text-slate-600 font-medium">問題数: {maxProblems}問</div>
                          </div>

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
              今日の振り返り(任意)
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
                  className="h-auto w-full whitespace-normal p-6 text-left border-2 border-slate-200 hover:border-purple-400 hover:bg-purple-50/70 transition-all duration-300 rounded-xl shadow-lg hover:shadow-xl"
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
                  className="h-auto w-full whitespace-normal p-6 text-left border-2 border-slate-200 hover:border-blue-400 hover:bg-blue-50/70 transition-all duration-300 rounded-xl shadow-lg hover:shadow-xl"
                >
                  <div className="flex items-start gap-4">
                    <Avatar className="h-12 w-12 border-2 border-blue-200 shadow-lg flex-shrink-0">
                      <AvatarImage src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/ai_coach-oDEKn6ZVqTbEdoExg9hsYQC4PTNbkt.png" />
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold">
                        <Bot className="h-6 w-6" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-lg text-slate-800">今日の振り返りを生成</div>
                      <div className="text-base text-slate-600 mt-2 break-words">AIコーチが学習記録に基づいた3つの選択肢を作成</div>
                    </div>
                  </div>
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {reflectionMode === "manual" && (
                  <div className="space-y-4">
                    <Textarea
                      placeholder="今日の学習はどうでしたか?感じたことや気づいたことを自由に書いてみましょう。"
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
                            学習内容に基づいて3つの振り返りを生成しました。気に入ったものを選んでください:
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
            className="w-full h-18 text-xl font-bold shadow-2xl bg-blue-200 text-blue-800 hover:bg-blue-300 disabled:bg-slate-400 disabled:hover:bg-slate-400 transition-all duration-300 rounded-2xl border-0"
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
    </>
  )
}

/**
 * スパーククライアント（Context Provider付き）
 */
export function SparkClient({ initialData, preselectedSubject }: SparkClientProps) {
  return (
    <UserProfileProvider>
      <SparkClientInner initialData={initialData} preselectedSubject={preselectedSubject} />
    </UserProfileProvider>
  )
}
