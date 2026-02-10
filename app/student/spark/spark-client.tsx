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
import { Calendar, BookOpen, MessageSquare, Save, Sparkles, Bot } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  getStudySessions,
  getExistingStudyLog,
  getContentTypesWithCounts,
  saveStudyLog,
  getCurrentSession,
} from "@/app/actions/study-log"
import {
  generateCoachFeedback,
  retryCoachFeedbackSave,
  type StudyDataForFeedback,
} from "@/app/actions/coach-feedback"
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

type DBSession = {
  id: number
  session_number: number
  grade: number
  start_date: string
  end_date: string
}

type ContentTypeWithCount = {
  id: number
  subjectId: number
  contentName: string
  course: string
  displayOrder: number
  totalProblems: number
}

function formatSessionDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00")
  return `${date.getMonth() + 1}/${date.getDate()}`
}

const subjectIdMap: { [key: string]: number } = {
  math: 1,
  japanese: 2,
  science: 3,
  social: 4,
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

  // セッション・コンテンツデータ（DBから取得）
  const [dbSessions, setDbSessions] = useState<DBSession[]>([])
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null)
  const [currentSessionNumber, setCurrentSessionNumber] = useState<number | null>(null)
  const [contentData, setContentData] = useState<ContentTypeWithCount[]>([])
  const [isLoadingContent, setIsLoadingContent] = useState(false)
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

  // コーチフィードバック関連のstate
  const [coachFeedback, setCoachFeedback] = useState<string | null>(null)
  const [isGeneratingFeedback, setIsGeneratingFeedback] = useState(false)
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)
  const [feedbackSavedToDb, setFeedbackSavedToDb] = useState(true)
  const [feedbackCanRetry, setFeedbackCanRetry] = useState(false)
  const [isRetryingSave, setIsRetryingSave] = useState(false)
  const [lastStudyLogId, setLastStudyLogId] = useState<number | null>(null)
  const [lastBatchId, setLastBatchId] = useState<string | null>(null)

  // 初回マウント時にセッション一覧と現在のセッションをサーバーから取得
  useEffect(() => {
    async function initializeCurrentSession() {
      const grade = parseInt(studentGrade)

      // セッション一覧を取得
      const sessionsResult = await getStudySessions(grade)
      if (!sessionsResult.error && sessionsResult.sessions) {
        setDbSessions(sessionsResult.sessions)
      }

      // 現在のセッションを取得
      const session = await getCurrentSession(grade)
      if (session) {
        setCurrentSessionNumber(session.session_number)
        setSelectedSessionId(session.id)
      } else if (sessionsResult.sessions && sessionsResult.sessions.length > 0) {
        // フォールバック: 最初のセッションを選択
        setSelectedSessionId(sessionsResult.sessions[0].id)
      }
    }

    initializeCurrentSession()
  }, [studentGrade])

  // セッション変更時にコンテンツデータ（問題数含む）を取得
  useEffect(() => {
    async function fetchContentData() {
      if (!selectedSessionId) return

      setContentData([]) // 前セッションのデータをクリア
      setIsLoadingContent(true)
      try {
        const result = await getContentTypesWithCounts(
          parseInt(studentGrade),
          currentCourse,
          selectedSessionId,
        )
        if (!result.error && result.contentTypes) {
          setContentData(result.contentTypes)
        }
      } catch (error) {
        console.error("Failed to fetch content data:", error)
      } finally {
        setIsLoadingContent(false)
      }
    }

    fetchContentData()
  }, [selectedSessionId, studentGrade, currentCourse])

  // Fetch existing study logs when session or subjects change
  useEffect(() => {
    async function fetchExistingLogs() {
      if (!selectedSessionId || selectedSubjects.length === 0 || contentData.length === 0) return

      try {
        for (const subjectId of selectedSubjects) {
          const dbSubjectId = subjectIdMap[subjectId]
          if (!dbSubjectId) continue

          const result = await getExistingStudyLog(selectedSessionId, dbSubjectId)
          if (result.error || !result.logs || result.logs.length === 0) continue

          // DB ID で直接マッチ（名前マッピング不要）
          const newDetails: { [contentId: string]: number } = {}
          const subjectContent = contentData.filter(ct => ct.subjectId === dbSubjectId)

          for (const log of result.logs) {
            const matchingContent = subjectContent.find(ct => ct.id === log.study_content_type_id)
            if (matchingContent && newDetails[String(matchingContent.id)] === undefined) {
              newDetails[String(matchingContent.id)] = log.correct_count
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSessionId, selectedSubjects.join(","), contentData])

  const getAvailableLearningContent = (subjectId: string) => {
    const dbSubjectId = subjectIdMap[subjectId]
    if (!dbSubjectId) return []

    // contentData は getContentTypesWithCounts() で取得済み（DB側で course = 生徒コースでフィルタ済み）
    // 2026年度以降、各コースに専用のコンテンツ行があるため階層フィルタは不要
    return contentData
      .filter(ct => ct.subjectId === dbSubjectId)
      .map(ct => ({
        id: String(ct.id),
        name: ct.contentName,
        course: ct.course,
        totalProblems: ct.totalProblems,
      }))
  }

  const handleSessionChange = (value: string) => {
    setSelectedSessionId(parseInt(value))
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

  const handleSubmit = async () => {
    setIsSubmitting(true)

    try {
      if (!selectedSessionId) {
        alert("学習回を選択してください")
        setIsSubmitting(false)
        return
      }

      // DB ID を直接使用（N+1 クエリ不要）
      const logs: Array<{
        session_id: number
        subject_id: number
        study_content_type_id: number
        correct_count: number
        total_problems: number
        study_date?: string
        reflection_text?: string
      }> = []

      for (const subjectId of selectedSubjects) {
        const dbSubjectId = subjectIdMap[subjectId]
        const details = subjectDetails[subjectId]

        if (!details || !dbSubjectId) continue

        const availableContent = getAvailableLearningContent(subjectId)

        for (const content of availableContent) {
          const correctAnswers = details[content.id]
          if (correctAnswers === undefined || correctAnswers < 0) continue

          logs.push({
            session_id: selectedSessionId,
            subject_id: dbSubjectId,
            study_content_type_id: parseInt(content.id),
            correct_count: correctAnswers,
            total_problems: content.totalProblems,
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

      if ("error" in result) {
        alert(`エラー: ${result.error}`)
        setIsSubmitting(false)
        return
      }

      // 保存成功 - コーチフィードバック生成開始
      setIsSubmitting(false)
      setIsGeneratingFeedback(true)
      setShowFeedbackModal(true)

      // 数値subject_id → 科目名マップ（DBのsubjects.idに対応）
      const subjectIdToName: { [key: number]: string } = {
        1: "算数",
        2: "国語",
        3: "理科",
        4: "社会",
      }

      const feedbackData: StudyDataForFeedback = {
        subjects: logs.map((log) => ({
          name: subjectIdToName[log.subject_id] || "不明",
          correct: log.correct_count,
          total: log.total_problems,
          accuracy: log.total_problems > 0
            ? Math.round((log.correct_count / log.total_problems) * 100)
            : 0,
        })),
        reflectionText: reflection || undefined,
      }

      // コーチフィードバック生成（batchIdベース）
      if (result.studyLogIds.length > 0) {
        setLastStudyLogId(result.studyLogIds[0])
        setLastBatchId(result.batchId)

        const feedbackResult = await generateCoachFeedback(
          result.studentId,
          result.sessionId,
          result.batchId,
          result.studyLogIds,
          feedbackData
        )

        if (feedbackResult.success) {
          setCoachFeedback(feedbackResult.feedback)
          setFeedbackSavedToDb(feedbackResult.savedToDb)
          setFeedbackCanRetry(!feedbackResult.savedToDb) // DB未保存時はリトライ可能
        } else {
          // エラー時はフォールバックを表示
          setCoachFeedback(feedbackResult.fallbackFeedback)
          // canRetry=false はフォールバックがDB保存済みを意味する
          setFeedbackSavedToDb(!feedbackResult.canRetry)
          setFeedbackCanRetry(feedbackResult.canRetry)
        }
      } else {
        // studyLogIdがない場合はフォールバック（静的メッセージ）
        setCoachFeedback("今日も学習お疲れさま！頑張ったね！")
        setFeedbackSavedToDb(true) // 保存対象がないので警告不要
        setFeedbackCanRetry(false)
      }

      setIsGeneratingFeedback(false)

      // フォームリセット（モーダルが閉じられた後も維持）
      setSelectedSubjects([])
      setSubjectDetails({})
      setReflection("")

      // ページトップにスムーズスクロール
      window.scrollTo({ top: 0, behavior: "smooth" })
    } catch (error) {
      console.error("Submit error:", error)
      alert("保存中にエラーが発生しました")
      setIsSubmitting(false)
    }
  }

  const isFormValid = () => {
    if (!selectedSessionId) return false
    if (selectedSubjects.length === 0) return false

    // 少なくとも1つの科目で、1つ以上の学習内容に入力があればOK
    return selectedSubjects.some((subjectId) => {
      const details = subjectDetails[subjectId]
      if (!details) return false

      const availableContent = getAvailableLearningContent(subjectId)
      if (availableContent.length === 0) return false

      return availableContent.some((content) => {
        if (content.totalProblems === 0) return false
        const inputValue = details[content.id]
        return inputValue !== undefined && inputValue >= 0
      })
    })
  }

  // フィードバックのDB保存リトライ
  const handleRetryFeedbackSave = async () => {
    if (!lastBatchId || !lastStudyLogId || !coachFeedback) return

    setIsRetryingSave(true)
    try {
      const result = await retryCoachFeedbackSave(lastBatchId, lastStudyLogId, coachFeedback)
      if (result.success) {
        setFeedbackSavedToDb(true)
        setFeedbackCanRetry(false)
      } else {
        // リトライ失敗時は警告を維持
        console.error("Retry save failed:", result.error)
      }
    } catch (error) {
      console.error("Retry save error:", error)
    } finally {
      setIsRetryingSave(false)
    }
  }

  const getAvailableSessions = () => {
    return dbSessions.map(session => ({
      id: String(session.id),
      name: `第${session.session_number}回`,
      period: `${formatSessionDate(session.start_date)}〜${formatSessionDate(session.end_date)}`,
    }))
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
              <Select value={selectedSessionId ? String(selectedSessionId) : undefined} onValueChange={handleSessionChange}>
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

              {selectedSessionId && (() => {
                const selectedSessionData = dbSessions.find(s => s.id === selectedSessionId)
                const selectedSessionNumber = selectedSessionData?.session_number ?? 0
                const isCurrentWeek = currentSessionNumber && selectedSessionNumber === currentSessionNumber

                return (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-sm px-4 py-2 bg-slate-50 border-slate-300 font-medium">
                        {getAvailableSessions().find((s) => s.id === String(selectedSessionId))?.period}
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

        {selectedSessionId && (
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

        {selectedSubjects.length > 0 && selectedSessionId && isLoadingContent && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-4 border-blue-600"></div>
            <span className="ml-4 text-lg text-slate-700 font-medium">学習内容を読み込み中...</span>
          </div>
        )}

        {selectedSubjects.length > 0 && selectedSessionId && !isLoadingContent && (
          <div className="space-y-6">
            {selectedSubjects.map((subjectId) => {
              const subject = subjects.find((s) => s.id === subjectId)
              const allContent = getAvailableLearningContent(subjectId)
              if (!subject || allContent.length === 0) return null

              // 問題数 > 0 のコンテンツのみ表示対象
              const availableContent = allContent.filter(c => c.totalProblems > 0)
              // 全コンテンツが問題数0 → この科目は復習週
              const isReviewWeek = availableContent.length === 0

              if (isReviewWeek) {
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
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="p-6 bg-gradient-to-br from-amber-50/80 to-orange-50/80 rounded-2xl border-2 border-amber-200 shadow-lg">
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
                    </CardContent>
                  </Card>
                )
              }

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
                      const maxProblems = content.totalProblems
                      const currentValue = subjectDetails[subjectId]?.[content.id] || 0

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
            <div className="space-y-4">
              <p className="text-base text-slate-600">
                今日の学習で感じたことや気づいたことを自由に書いてみましょう。
              </p>
              <Textarea
                placeholder="例：今日は算数の計算問題がスムーズに解けた！"
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
                className="min-h-[120px] text-lg border-2 border-slate-300 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 p-4 rounded-xl shadow-lg"
                maxLength={200}
              />
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500">目安80-120字</span>
                <span className="text-sm text-slate-500">{reflection.length}/200文字</span>
              </div>
            </div>
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
              {!selectedSessionId ? "学習回を選択してください" : "選択した科目の正答数を入力してください"}
            </p>
          </div>
        )}
      </div>

      {/* コーチフィードバックモーダル */}
      {showFeedbackModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-6 animate-in fade-in zoom-in duration-300">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 border-3 border-blue-300 shadow-xl flex-shrink-0">
                <AvatarImage src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/ai_coach-oDEKn6ZVqTbEdoExg9hsYQC4PTNbkt.png" />
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold">
                  <Bot className="h-8 w-8" />
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-xl font-bold text-slate-800">AIコーチからのメッセージ</h3>
                <p className="text-sm text-slate-500">学習記録を保存しました</p>
              </div>
            </div>

            {isGeneratingFeedback ? (
              <div className="flex items-center justify-center py-8 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl">
                <div className="animate-spin rounded-full h-10 w-10 border-b-4 border-blue-600"></div>
                <span className="ml-4 text-lg text-slate-700 font-medium">メッセージ生成中...</span>
              </div>
            ) : (
              <>
                <div className="p-5 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl border border-blue-200">
                  <p className="text-lg text-slate-700 leading-relaxed">
                    {coachFeedback}
                  </p>
                </div>

                {/* DB保存失敗時の警告 */}
                {!feedbackSavedToDb && (
                  <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                    <p className="text-sm text-amber-800 mb-2">
                      ⚠️ メッセージの保存に失敗しました。後で履歴に表示されない可能性があります。
                    </p>
                    {feedbackCanRetry && (
                      <Button
                        onClick={handleRetryFeedbackSave}
                        variant="outline"
                        size="sm"
                        disabled={isRetryingSave}
                        className="text-amber-700 border-amber-300 hover:bg-amber-100"
                      >
                        {isRetryingSave ? "保存中..." : "再保存する"}
                      </Button>
                    )}
                  </div>
                )}
              </>
            )}

            <Button
              onClick={() => {
                setShowFeedbackModal(false)
                setCoachFeedback(null)
                setFeedbackSavedToDb(true)
                setFeedbackCanRetry(false)
              }}
              className="w-full h-14 text-lg font-bold bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-xl shadow-lg"
              disabled={isGeneratingFeedback || isRetryingSave}
            >
              閉じる
            </Button>
          </div>
        </div>
      )}

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
