"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Loader2,
  Target,
  TrendingUp,
  Eye,
  FileText,
  Users,
} from "lucide-react"
import { getAllStudentsPastExamSummaryForCoach } from "@/app/actions/past-exam"

interface PastExamSummary {
  studentId: number
  studentName: string
  fullName: string
  grade: number
  totalResults: number
  avgTekisei1: number | null
  avgTekisei2: number | null
  maxTekisei1: number | null
  maxTekisei2: number | null
  yearsWithResults: number
}

export function PastExamSummaryList() {
  const router = useRouter()
  const [summaries, setSummaries] = useState<PastExamSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadSummaries()
  }, [])

  const loadSummaries = async () => {
    setLoading(true)
    setError(null)

    const response = await getAllStudentsPastExamSummaryForCoach()

    if (response.error) {
      setError(response.error)
    } else if (response.summaries) {
      setSummaries(response.summaries)
    }

    setLoading(false)
  }

  // 得点に応じた色を返す
  const getScoreColor = (score: number | null) => {
    if (score === null) return "text-slate-400"
    if (score >= 80) return "text-emerald-600"
    if (score >= 60) return "text-blue-600"
    if (score >= 40) return "text-amber-600"
    return "text-rose-600"
  }

  const getScoreBg = (score: number | null) => {
    if (score === null) return ""
    if (score >= 80) return "bg-emerald-50"
    if (score >= 60) return "bg-blue-50"
    if (score >= 40) return "bg-amber-50"
    return "bg-rose-50"
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
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

  if (summaries.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium mb-2">小学6年生の生徒がいません</p>
          <p className="text-sm">
            過去問演習は小学6年生のみが対象です
          </p>
        </CardContent>
      </Card>
    )
  }

  // 統計情報
  const studentsWithResults = summaries.filter(s => s.totalResults > 0)
  const studentsWithTekisei1 = studentsWithResults.filter(s => s.avgTekisei1 !== null)
  const studentsWithTekisei2 = studentsWithResults.filter(s => s.avgTekisei2 !== null)

  const overallAvgTekisei1 = studentsWithTekisei1.length > 0
    ? Math.round(
        studentsWithTekisei1.reduce((sum, s) => sum + (s.avgTekisei1 || 0), 0) /
        studentsWithTekisei1.length
      )
    : null
  const overallAvgTekisei2 = studentsWithTekisei2.length > 0
    ? Math.round(
        studentsWithTekisei2.reduce((sum, s) => sum + (s.avgTekisei2 || 0), 0) /
        studentsWithTekisei2.length
      )
    : null

  return (
    <div className="space-y-4">
      {/* ヘッダーカード */}
      <Card className="bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 border-0">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-full bg-purple-100">
              <Target className="h-6 w-6 text-purple-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-bold text-slate-800 mb-1">
                過去問演習サマリー（小学6年生）
              </h3>
              <p className="text-sm text-slate-600">
                日立第一高校附属中学校 適性検査I・II
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 全体統計 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3 text-center">
            <div className="text-xs text-muted-foreground mb-1">対象生徒数</div>
            <div className="text-2xl font-bold text-slate-800">
              {summaries.length}
              <span className="text-sm font-normal text-muted-foreground">人</span>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3 text-center">
            <div className="text-xs text-muted-foreground mb-1">入力済み</div>
            <div className="text-2xl font-bold text-slate-800">
              {studentsWithResults.length}
              <span className="text-sm font-normal text-muted-foreground">人</span>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3 text-center">
            <div className="text-xs text-muted-foreground mb-1">適性I 全体平均</div>
            <div className={`text-2xl font-bold ${getScoreColor(overallAvgTekisei1)}`}>
              {overallAvgTekisei1 ?? "--"}
              <span className="text-sm font-normal text-muted-foreground">点</span>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3 text-center">
            <div className="text-xs text-muted-foreground mb-1">適性II 全体平均</div>
            <div className={`text-2xl font-bold ${getScoreColor(overallAvgTekisei2)}`}>
              {overallAvgTekisei2 ?? "--"}
              <span className="text-sm font-normal text-muted-foreground">点</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 生徒一覧テーブル */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="bg-slate-50 border-b pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-slate-600" />
            生徒別過去問結果
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[120px]">生徒名</TableHead>
                  <TableHead className="text-center min-w-[60px]">入力数</TableHead>
                  <TableHead className="text-center min-w-[80px]">適性I 平均</TableHead>
                  <TableHead className="text-center min-w-[80px]">適性I 最高</TableHead>
                  <TableHead className="text-center min-w-[80px]">適性II 平均</TableHead>
                  <TableHead className="text-center min-w-[80px]">適性II 最高</TableHead>
                  <TableHead className="text-center min-w-[60px]">年度数</TableHead>
                  <TableHead className="text-center min-w-[80px]">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summaries.map((summary) => (
                  <TableRow key={summary.studentId}>
                    <TableCell>
                      <div className="font-medium">{summary.studentName}</div>
                      {summary.studentName !== summary.fullName && (
                        <div className="text-xs text-muted-foreground">{summary.fullName}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {summary.totalResults > 0 ? (
                        <Badge variant="secondary">{summary.totalResults}</Badge>
                      ) : (
                        <span className="text-muted-foreground">--</span>
                      )}
                    </TableCell>
                    <TableCell className={`text-center font-medium ${getScoreColor(summary.avgTekisei1)} ${getScoreBg(summary.avgTekisei1)}`}>
                      {summary.avgTekisei1 ?? "--"}
                    </TableCell>
                    <TableCell className={`text-center font-medium ${getScoreColor(summary.maxTekisei1)} ${getScoreBg(summary.maxTekisei1)}`}>
                      {summary.maxTekisei1 ?? "--"}
                    </TableCell>
                    <TableCell className={`text-center font-medium ${getScoreColor(summary.avgTekisei2)} ${getScoreBg(summary.avgTekisei2)}`}>
                      {summary.avgTekisei2 ?? "--"}
                    </TableCell>
                    <TableCell className={`text-center font-medium ${getScoreColor(summary.maxTekisei2)} ${getScoreBg(summary.maxTekisei2)}`}>
                      {summary.maxTekisei2 ?? "--"}
                    </TableCell>
                    <TableCell className="text-center">
                      {summary.yearsWithResults > 0 ? (
                        <Badge variant="outline">{summary.yearsWithResults}</Badge>
                      ) : (
                        <span className="text-muted-foreground">--</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/coach/student/${summary.studentId}`)}
                        className="h-8 px-2"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        詳細
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
