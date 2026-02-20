"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  BarChart3,
  Loader2,
  TrendingUp,
  ChevronDown,
  ChevronRight,
  Calendar,
} from "lucide-react"
import {
  generateWeeklyAnalysis,
  getStoredWeeklyAnalysis,
} from "@/app/actions/weekly-analysis"

interface WeeklyAnalysis {
  id: number
  student_id: number
  week_start_date: string
  week_end_date: string
  strengths: string
  challenges: string
  advice: string
  generated_at: string
  generated_by_batch: boolean
}

interface AnalysisTabProps {
  studentId: string
  studentName: string
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

export function AnalysisTab({ studentId, studentName }: AnalysisTabProps) {
  const [selectedWeek, setSelectedWeek] = useState<Date>(getLastMonday())
  const [analysis, setAnalysis] = useState<WeeklyAnalysis | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({
    strengths: true,
    challenges: true,
    advice: true,
  })

  const fetchAnalysis = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await getStoredWeeklyAnalysis(studentId, selectedWeek)
      if (result.error) {
        setError(result.error)
      } else {
        setAnalysis((result.analysis as unknown as WeeklyAnalysis) || null)
      }
    } catch {
      setError("データの取得に失敗しました")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalysis()
  }, [studentId, selectedWeek])

  const handleGenerate = async () => {
    setIsGenerating(true)
    setError(null)

    const weekEnd = new Date(selectedWeek)
    weekEnd.setDate(weekEnd.getDate() + 6)

    try {
      const result = await generateWeeklyAnalysis(studentId, selectedWeek, weekEnd)
      if (result.error) {
        setError(result.error)
      } else {
        setAnalysis((result.analysis as unknown as WeeklyAnalysis) || null)
      }
    } catch {
      setError("分析の生成に失敗しました")
    } finally {
      setIsGenerating(false)
    }
  }

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }))
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* 週選択 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <Select
              value={selectedWeek.toISOString()}
              onValueChange={(value) => setSelectedWeek(new Date(value))}
            >
              <SelectTrigger className="w-[200px]">
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
        </CardContent>
      </Card>

      {error && (
        <Card className="border-destructive">
          <CardContent className="p-4 text-destructive">{error}</CardContent>
        </Card>
      )}

      {!analysis ? (
        <Card>
          <CardContent className="p-8 text-center space-y-4">
            <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">この週の分析はまだ生成されていません</p>
            <Button onClick={handleGenerate} disabled={isGenerating}>
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  生成中...
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
      ) : (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">{studentName}さんの週次分析</CardTitle>
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

          {/* 強み */}
          <Card>
            <CardHeader
              className="cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => toggleSection("strengths")}
            >
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
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
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {analysis.strengths}
                </p>
              </CardContent>
            )}
          </Card>

          {/* 課題 */}
          <Card>
            <CardHeader
              className="cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => toggleSection("challenges")}
            >
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
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
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {analysis.challenges}
                </p>
              </CardContent>
            )}
          </Card>

          {/* アドバイス */}
          <Card>
            <CardHeader
              className="cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => toggleSection("advice")}
            >
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
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
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {analysis.advice}
                </p>
              </CardContent>
            )}
          </Card>

          {/* 再生成ボタン */}
          <Card>
            <CardContent className="p-4 flex justify-center">
              <Button variant="outline" onClick={handleGenerate} disabled={isGenerating}>
                {isGenerating ? (
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
    </div>
  )
}
