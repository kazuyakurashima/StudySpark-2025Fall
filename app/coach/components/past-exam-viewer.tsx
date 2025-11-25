"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Loader2,
  Target,
  TrendingUp,
  BookOpen,
  ChevronDown,
  ChevronRight,
  MessageSquare,
  Calendar,
  GraduationCap,
} from "lucide-react"
import { getStudentPastExamResultsForCoach } from "@/app/actions/past-exam"
import { EXAM_YEARS, EXAM_TYPES, type PastExamResult } from "@/lib/constants/past-exam"

interface Props {
  studentId: string
}

export function CoachPastExamViewer({ studentId }: Props) {
  const [results, setResults] = useState<PastExamResult[]>([])
  const [studentName, setStudentName] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notGrade6, setNotGrade6] = useState(false)
  const [notGrade6Info, setNotGrade6Info] = useState<{ name: string; grade: number } | null>(null)
  const [expandedYears, setExpandedYears] = useState<Set<number>>(new Set())

  useEffect(() => {
    loadResults()
  }, [studentId])

  const loadResults = async () => {
    setLoading(true)
    setError(null)
    setNotGrade6(false)
    setNotGrade6Info(null)

    const response = await getStudentPastExamResultsForCoach(studentId)

    if (response.error) {
      if (response.notGrade6) {
        setNotGrade6(true)
        setNotGrade6Info({
          name: response.studentName || "",
          grade: response.grade || 5
        })
      } else {
        setError(response.error)
      }
    } else if (response.results) {
      setResults(response.results)
      setStudentName(response.studentName || "")
      // 最新年度を展開
      if (response.results.length > 0) {
        const latestYear = Math.max(...response.results.map(r => r.exam_year))
        setExpandedYears(new Set([latestYear]))
      }
    }

    setLoading(false)
  }

  // 得点に応じた色とスタイルを返す
  const getScoreStyle = (score: number) => {
    if (score >= 80) return { text: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" }
    if (score >= 60) return { text: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" }
    if (score >= 40) return { text: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" }
    return { text: "text-rose-600", bg: "bg-rose-50", border: "border-rose-200" }
  }

  const getScoreColor = (score: number) => getScoreStyle(score).text

  // 年度の折りたたみをトグル
  const toggleYear = (year: number) => {
    setExpandedYears((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(year)) {
        newSet.delete(year)
      } else {
        newSet.add(year)
      }
      return newSet
    })
  }

  // 年度ごとの結果を取得
  const getResultsByYear = (year: number) => {
    return results.filter((r) => r.exam_year === year)
  }

  // 入力済みの年度リストを取得（新しい順）
  const yearsWithResults = EXAM_YEARS.filter((year) =>
    results.some((r) => r.exam_year === year)
  )

  // 統計情報を計算
  const getStats = () => {
    if (results.length === 0) return null
    const tekisei1 = results.filter(r => r.exam_type === "tekisei_1")
    const tekisei2 = results.filter(r => r.exam_type === "tekisei_2")
    const avgTekisei1 = tekisei1.length > 0
      ? Math.round(tekisei1.reduce((sum, r) => sum + r.score, 0) / tekisei1.length)
      : null
    const avgTekisei2 = tekisei2.length > 0
      ? Math.round(tekisei2.reduce((sum, r) => sum + r.score, 0) / tekisei2.length)
      : null
    const maxTekisei1 = tekisei1.length > 0 ? Math.max(...tekisei1.map(r => r.score)) : null
    const maxTekisei2 = tekisei2.length > 0 ? Math.max(...tekisei2.map(r => r.score)) : null
    return { avgTekisei1, avgTekisei2, maxTekisei1, maxTekisei2, total: results.length }
  }

  const stats = getStats()

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (notGrade6) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          <GraduationCap className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium mb-2">過去問演習は小学6年生のみ</p>
          {notGrade6Info && (
            <p className="text-sm">
              {notGrade6Info.name}さんは小学{notGrade6Info.grade}年生です。<br />
              6年生になると過去問演習の結果が表示されます。
            </p>
          )}
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-red-500">
          <p>{error}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* ヘッダー */}
      <Card className="bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 border-0">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-full bg-purple-100">
              <Target className="h-6 w-6 text-purple-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-bold text-slate-800 mb-1">
                日立第一高校附属中学校 過去問演習
              </h3>
              <p className="text-sm text-slate-600">
                適性検査I・IIの結果（過去10年分）
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 統計サマリー */}
      {stats ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-3 text-center">
              <div className="text-xs text-muted-foreground mb-1">適性I 平均</div>
              <div className={`text-xl font-bold ${stats.avgTekisei1 ? getScoreColor(stats.avgTekisei1) : "text-slate-400"}`}>
                {stats.avgTekisei1 ?? "--"}
                <span className="text-xs font-normal text-muted-foreground">点</span>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-3 text-center">
              <div className="text-xs text-muted-foreground mb-1">適性I 最高</div>
              <div className={`text-xl font-bold ${stats.maxTekisei1 ? getScoreColor(stats.maxTekisei1) : "text-slate-400"}`}>
                {stats.maxTekisei1 ?? "--"}
                <span className="text-xs font-normal text-muted-foreground">点</span>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-3 text-center">
              <div className="text-xs text-muted-foreground mb-1">適性II 平均</div>
              <div className={`text-xl font-bold ${stats.avgTekisei2 ? getScoreColor(stats.avgTekisei2) : "text-slate-400"}`}>
                {stats.avgTekisei2 ?? "--"}
                <span className="text-xs font-normal text-muted-foreground">点</span>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-3 text-center">
              <div className="text-xs text-muted-foreground mb-1">適性II 最高</div>
              <div className={`text-xl font-bold ${stats.maxTekisei2 ? getScoreColor(stats.maxTekisei2) : "text-slate-400"}`}>
                {stats.maxTekisei2 ?? "--"}
                <span className="text-xs font-normal text-muted-foreground">点</span>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-8 text-center text-muted-foreground">
            <Calendar className="h-10 w-10 mx-auto mb-3 text-gray-300" />
            <p className="text-base font-medium mb-1">まだ過去問の結果がありません</p>
            <p className="text-sm">
              生徒が過去問演習の結果を入力すると表示されます
            </p>
          </CardContent>
        </Card>
      )}

      {/* 年度別結果一覧 */}
      {yearsWithResults.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="bg-slate-50 border-b pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-slate-600" />
              年度別結果一覧
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 space-y-2">
            {yearsWithResults.map((year) => {
              const yearData = getResultsByYear(year)
              const isExpanded = expandedYears.has(year)

              // 科目ごとの結果を整理
              const tekisei1Results = yearData
                .filter((r) => r.exam_type === "tekisei_1")
                .sort((a, b) => a.attempt_number - b.attempt_number)
              const tekisei2Results = yearData
                .filter((r) => r.exam_type === "tekisei_2")
                .sort((a, b) => a.attempt_number - b.attempt_number)

              // 最高点を計算
              const maxScore1 = tekisei1Results.length > 0 ? Math.max(...tekisei1Results.map(r => r.score)) : null
              const maxScore2 = tekisei2Results.length > 0 ? Math.max(...tekisei2Results.map(r => r.score)) : null

              return (
                <div key={year} className="border rounded-lg overflow-hidden bg-white">
                  <button
                    onClick={() => toggleYear(year)}
                    className="w-full p-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-slate-800">{year}年度</span>
                      <div className="flex items-center gap-1">
                        {maxScore1 !== null && (
                          <Badge variant="outline" className={`text-xs ${getScoreStyle(maxScore1).text} ${getScoreStyle(maxScore1).bg}`}>
                            I: {maxScore1}点
                          </Badge>
                        )}
                        {maxScore2 !== null && (
                          <Badge variant="outline" className={`text-xs ${getScoreStyle(maxScore2).text} ${getScoreStyle(maxScore2).bg}`}>
                            II: {maxScore2}点
                          </Badge>
                        )}
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="px-3 pb-3 space-y-3 border-t bg-slate-50/50">
                      <div className="pt-3">
                        {/* 適性検査I */}
                        {tekisei1Results.length > 0 && (
                          <div className="space-y-2 mb-3">
                            <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
                              <BookOpen className="h-3 w-3 text-purple-500" />
                              {EXAM_TYPES.tekisei_1}
                            </div>
                            <div className="space-y-2 pl-5">
                              {tekisei1Results.map((result) => {
                                const scoreStyle = getScoreStyle(result.score)
                                return (
                                  <div
                                    key={result.id}
                                    className={`p-2 rounded-lg space-y-2 border ${scoreStyle.bg} ${scoreStyle.border}`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="text-xs">
                                          {result.attempt_number}回目
                                        </Badge>
                                        <span className={`font-bold text-sm ${scoreStyle.text}`}>
                                          {result.score}点
                                        </span>
                                      </div>
                                      <span className="text-xs text-muted-foreground">
                                        {result.taken_at}
                                      </span>
                                    </div>
                                    {result.reflection && (
                                      <div className="text-xs bg-white p-2 rounded border">
                                        <div className="flex items-center gap-1 mb-1">
                                          <MessageSquare className="h-3 w-3 text-purple-500" />
                                          <span className="font-medium text-slate-600">振り返り</span>
                                        </div>
                                        <p className="whitespace-pre-wrap text-slate-600">{result.reflection}</p>
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}

                        {/* 適性検査II */}
                        {tekisei2Results.length > 0 && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
                              <BookOpen className="h-3 w-3 text-purple-500" />
                              {EXAM_TYPES.tekisei_2}
                            </div>
                            <div className="space-y-2 pl-5">
                              {tekisei2Results.map((result) => {
                                const scoreStyle = getScoreStyle(result.score)
                                return (
                                  <div
                                    key={result.id}
                                    className={`p-2 rounded-lg space-y-2 border ${scoreStyle.bg} ${scoreStyle.border}`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="text-xs">
                                          {result.attempt_number}回目
                                        </Badge>
                                        <span className={`font-bold text-sm ${scoreStyle.text}`}>
                                          {result.score}点
                                        </span>
                                      </div>
                                      <span className="text-xs text-muted-foreground">
                                        {result.taken_at}
                                      </span>
                                    </div>
                                    {result.reflection && (
                                      <div className="text-xs bg-white p-2 rounded border">
                                        <div className="flex items-center gap-1 mb-1">
                                          <MessageSquare className="h-3 w-3 text-purple-500" />
                                          <span className="font-medium text-slate-600">振り返り</span>
                                        </div>
                                        <p className="whitespace-pre-wrap text-slate-600">{result.reflection}</p>
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
