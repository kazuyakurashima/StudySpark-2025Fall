"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  BarChart3,
  ChevronDown,
  ChevronRight,
  Loader2,
  TrendingUp,
  AlertCircle,
  Calendar,
  Users,
} from "lucide-react"
import { CoachBottomNavigation } from "@/components/coach-bottom-navigation"
import { UserProfileHeader } from "@/components/common/user-profile-header"
import { getCoachStudents, type CoachStudent } from "@/app/actions/coach"
import {
  generateWeeklyAnalysis,
  getStoredWeeklyAnalysis,
  getWeeklyAnalysisData,
} from "@/app/actions/weekly-analysis"

interface WeeklyAnalysis {
  id: string
  student_id: string
  week_start_date: string
  week_end_date: string
  strengths: string
  challenges: string
  advice: string
  generated_at: string
  generated_by_batch: boolean
}

export default function AnalysisPage() {
  const [students, setStudents] = useState<CoachStudent[]>([])
  const [selectedStudentId, setSelectedStudentId] = useState<string>("")
  const [selectedWeek, setSelectedWeek] = useState<Date>(getLastMonday())
  const [analysis, setAnalysis] = useState<WeeklyAnalysis | null>(null)
  const [analysisData, setAnalysisData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({
    strengths: true,
    challenges: true,
    advice: true,
  })

  useEffect(() => {
    async function loadStudents() {
      const result = await getCoachStudents()
      if (result.students) {
        setStudents(result.students)
        if (result.students.length > 0) {
          setSelectedStudentId(result.students[0].id)
        }
      }
    }
    loadStudents()
  }, [])

  useEffect(() => {
    if (!selectedStudentId) return

    async function loadAnalysis() {
      setLoading(true)
      setError(null)

      const weekEnd = new Date(selectedWeek)
      weekEnd.setDate(weekEnd.getDate() + 6)

      const storedResult = await getStoredWeeklyAnalysis(selectedStudentId, selectedWeek)

      if (storedResult.error) {
        setError(storedResult.error)
      } else if (storedResult.analysis) {
        setAnalysis(storedResult.analysis)
      } else {
        setAnalysis(null)
      }

      const dataResult = await getWeeklyAnalysisData(selectedStudentId, selectedWeek, weekEnd)

      if (dataResult.error) {
        setError(dataResult.error)
      } else {
        setAnalysisData(dataResult)
      }

      setLoading(false)
    }

    loadAnalysis()
  }, [selectedStudentId, selectedWeek])

  async function handleGenerateAnalysis() {
    if (!selectedStudentId) return

    setGenerating(true)
    setError(null)

    const weekEnd = new Date(selectedWeek)
    weekEnd.setDate(weekEnd.getDate() + 6)

    const result = await generateWeeklyAnalysis(selectedStudentId, selectedWeek, weekEnd)

    if (result.error) {
      setError(result.error)
    } else if (result.analysis) {
      setAnalysis(result.analysis)
    }

    setGenerating(false)
  }

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }))
  }

  const selectedStudent = students.find((s) => s.id === selectedStudentId)
  const weekEnd = new Date(selectedWeek)
  weekEnd.setDate(weekEnd.getDate() + 6)

  return (
    <div className="min-h-screen bg-background pb-20">
      <UserProfileHeader />
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-6">
            <h1 className="text-2xl md:text-3xl font-bold mb-2 flex items-center gap-2">
              <BarChart3 className="h-6 w-6 md:h-7 md:w-7" />
              週次AI分析
            </h1>
            <p className="text-muted-foreground">生徒の学習状況を週単位で分析</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 md:p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  生徒選択
                </label>
                <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="生徒を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {students.map((student) => (
                      <SelectItem key={student.id} value={student.id}>
                        {student.full_name} ({student.grade})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  分析週選択
                </label>
                <Select
                  value={selectedWeek.toISOString()}
                  onValueChange={(value) => setSelectedWeek(new Date(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getLast4Mondays().map((monday) => (
                      <SelectItem key={monday.toISOString()} value={monday.toISOString()}>
                        {formatWeekRange(monday)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {error && (
          <Card className="border-destructive">
            <CardContent className="p-4 flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
            </CardContent>
          </Card>
        )}

        {loading && (
          <Card>
            <CardContent className="p-12 flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </CardContent>
          </Card>
        )}

        {!loading && selectedStudent && (
          <>
            {!analysis && (
              <Card>
                <CardContent className="p-6 text-center space-y-4">
                  <p className="text-muted-foreground">この週の分析はまだ生成されていません</p>
                  <Button onClick={handleGenerateAnalysis} disabled={generating}>
                    {generating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        分析生成中...
                      </>
                    ) : (
                      <>
                        <TrendingUp className="mr-2 h-4 w-4" />
                        AI分析を生成
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            {analysis && (
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-xl">
                          {selectedStudent.full_name}さんの週次分析
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          {formatWeekRange(selectedWeek)}
                        </p>
                      </div>
                      <Badge variant={analysis.generated_by_batch ? "secondary" : "default"}>
                        {analysis.generated_by_batch ? "自動生成" : "手動生成"}
                      </Badge>
                    </div>
                  </CardHeader>
                </Card>

                <Card>
                  <CardHeader
                    className="cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => toggleSection("strengths")}
                  >
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-green-500" />
                        強み・良かった点
                      </CardTitle>
                      {expandedSections.strengths ? (
                        <ChevronDown className="h-5 w-5" />
                      ) : (
                        <ChevronRight className="h-5 w-5" />
                      )}
                    </div>
                  </CardHeader>
                  {expandedSections.strengths && (
                    <CardContent>
                      <p className="text-sm md:text-base leading-relaxed whitespace-pre-wrap">
                        {analysis.strengths}
                      </p>
                    </CardContent>
                  )}
                </Card>

                <Card>
                  <CardHeader
                    className="cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => toggleSection("challenges")}
                  >
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-yellow-500" />
                        課題・改善点
                      </CardTitle>
                      {expandedSections.challenges ? (
                        <ChevronDown className="h-5 w-5" />
                      ) : (
                        <ChevronRight className="h-5 w-5" />
                      )}
                    </div>
                  </CardHeader>
                  {expandedSections.challenges && (
                    <CardContent>
                      <p className="text-sm md:text-base leading-relaxed whitespace-pre-wrap">
                        {analysis.challenges}
                      </p>
                    </CardContent>
                  )}
                </Card>

                <Card>
                  <CardHeader
                    className="cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => toggleSection("advice")}
                  >
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-blue-500" />
                        具体的アドバイス
                      </CardTitle>
                      {expandedSections.advice ? (
                        <ChevronDown className="h-5 w-5" />
                      ) : (
                        <ChevronRight className="h-5 w-5" />
                      )}
                    </div>
                  </CardHeader>
                  {expandedSections.advice && (
                    <CardContent>
                      <p className="text-sm md:text-base leading-relaxed whitespace-pre-wrap">
                        {analysis.advice}
                      </p>
                    </CardContent>
                  )}
                </Card>

                {analysisData && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">学習データサマリー</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <h4 className="font-semibold mb-2">学習実績</h4>
                        <p className="text-sm text-muted-foreground">
                          学習日数: {analysisData.study?.totalStudyDays}日
                        </p>
                        <div className="mt-2 space-y-1">
                          {analysisData.study?.subjectSummary?.map((s: any) => (
                            <div key={s.subject} className="text-sm flex justify-between">
                              <span>{s.subject}</span>
                              <span className="text-muted-foreground">
                                正答率 {s.accuracy}% ({s.correctAnswers}/{s.totalProblems}問)
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h4 className="font-semibold mb-2">応援状況</h4>
                        <p className="text-sm text-muted-foreground">
                          総数: {analysisData.encouragement?.stats?.total}件 (保護者:{" "}
                          {analysisData.encouragement?.stats?.byRole.parent}件、指導者:{" "}
                          {analysisData.encouragement?.stats?.byRole.coach}件)
                        </p>
                      </div>

                      <div>
                        <h4 className="font-semibold mb-2">振り返り・目標</h4>
                        <p className="text-sm text-muted-foreground">
                          振り返り: {analysisData.reflection?.reflections?.length || 0}回 | 目標設定:{" "}
                          {analysisData.goal?.goals?.length || 0}回
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardContent className="p-4 flex justify-center">
                    <Button variant="outline" onClick={handleGenerateAnalysis} disabled={generating}>
                      {generating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          再生成中...
                        </>
                      ) : (
                        <>
                          <TrendingUp className="mr-2 h-4 w-4" />
                          分析を再生成
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}
          </>
        )}
      </div>

      <CoachBottomNavigation />
    </div>
  )
}

function getLastMonday(): Date {
  const today = new Date()
  const day = today.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(today)
  monday.setDate(today.getDate() + diff - 7)
  monday.setHours(0, 0, 0, 0)
  return monday
}

function getLast4Mondays(): Date[] {
  const mondays: Date[] = []
  let current = getLastMonday()

  for (let i = 0; i < 4; i++) {
    mondays.push(new Date(current))
    current = new Date(current)
    current.setDate(current.getDate() - 7)
  }

  return mondays
}

function formatWeekRange(monday: Date): string {
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)

  const formatter = new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
  })

  return `${formatter.format(monday)} 〜 ${formatter.format(sunday)}`
}
