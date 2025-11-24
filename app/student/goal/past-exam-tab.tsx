"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Loader2,
  Plus,
  Edit2,
  FileText,
  Trophy,
  ChevronDown,
  ChevronRight,
  MessageSquare,
  Calendar,
  Target,
  TrendingUp,
  BookOpen
} from "lucide-react"
import {
  getPastExamResults,
  savePastExamResult,
  updatePastExamResult,
} from "@/app/actions/past-exam"
import {
  EXAM_YEARS,
  EXAM_TYPES,
  type PastExamResult,
  type ExamType,
} from "@/lib/constants/past-exam"

interface PastExamTabProps {
  studentGrade: number
}

export function PastExamTab({ studentGrade }: PastExamTabProps) {
  const [results, setResults] = useState<PastExamResult[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedYear, setSelectedYear] = useState<number>(EXAM_YEARS[0])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editingResult, setEditingResult] = useState<PastExamResult | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedYears, setExpandedYears] = useState<Set<number>>(new Set())

  // フォームの状態
  const [formData, setFormData] = useState({
    exam_type: "tekisei_1" as ExamType,
    attempt_number: 1,
    score: "",
    reflection: "",
    taken_at: new Date().toISOString().split("T")[0],
  })

  useEffect(() => {
    if (studentGrade === 6) {
      loadResults()
    }
  }, [studentGrade])

  // 小学6年生以外は表示しない
  if (studentGrade !== 6) {
    return null
  }

  async function loadResults() {
    setLoading(true)
    const result = await getPastExamResults()
    if (result.results) {
      setResults(result.results)
    }
    setLoading(false)
  }

  // 選択した年度の結果をフィルタリング
  const yearResults = results.filter((r) => r.exam_year === selectedYear)

  // 科目ごとの結果を整理
  const getExamResults = (examType: ExamType) => {
    return yearResults
      .filter((r) => r.exam_type === examType)
      .sort((a, b) => a.attempt_number - b.attempt_number)
  }

  // 次の入力可能な回数を取得
  const getNextAttempt = (examType: ExamType) => {
    const typeResults = getExamResults(examType)
    if (typeResults.length >= 3) return null
    const usedNumbers = typeResults.map((r) => r.attempt_number)
    for (let i = 1; i <= 3; i++) {
      if (!usedNumbers.includes(i)) return i
    }
    return null
  }

  // 新規入力ダイアログを開く
  const handleAddNew = (examType: ExamType) => {
    const nextAttempt = getNextAttempt(examType)
    if (!nextAttempt) return

    setFormData({
      exam_type: examType,
      attempt_number: nextAttempt,
      score: "",
      reflection: "",
      taken_at: new Date().toISOString().split("T")[0],
    })
    setIsEditMode(false)
    setEditingResult(null)
    setError(null)
    setIsDialogOpen(true)
  }

  // 編集ダイアログを開く
  const handleEdit = (result: PastExamResult) => {
    setFormData({
      exam_type: result.exam_type,
      attempt_number: result.attempt_number,
      score: result.score.toString(),
      reflection: result.reflection || "",
      taken_at: result.taken_at,
    })
    setIsEditMode(true)
    setEditingResult(result)
    setError(null)
    setIsDialogOpen(true)
  }

  // 保存処理
  const handleSave = async () => {
    setError(null)
    setSaving(true)

    const score = parseInt(formData.score)
    if (isNaN(score) || score < 0 || score > 100) {
      setError("得点は0〜100の範囲で入力してください")
      setSaving(false)
      return
    }

    try {
      if (isEditMode && editingResult) {
        const result = await updatePastExamResult(editingResult.id, {
          score,
          reflection: formData.reflection || undefined,
          taken_at: formData.taken_at,
        })
        if (result.error) {
          setError(result.error)
        } else {
          setIsDialogOpen(false)
          loadResults()
        }
      } else {
        const result = await savePastExamResult({
          exam_year: selectedYear,
          exam_type: formData.exam_type,
          attempt_number: formData.attempt_number,
          score,
          reflection: formData.reflection || undefined,
          taken_at: formData.taken_at,
        })
        if (result.error) {
          setError(result.error)
        } else {
          setIsDialogOpen(false)
          loadResults()
        }
      }
    } catch {
      setError("保存に失敗しました")
    }

    setSaving(false)
  }

  // 得点に応じた色とスタイルを返す
  const getScoreStyle = (score: number) => {
    if (score >= 80) return { text: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" }
    if (score >= 60) return { text: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" }
    if (score >= 40) return { text: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" }
    return { text: "text-rose-600", bg: "bg-rose-50", border: "border-rose-200" }
  }

  // 互換性のためのラッパー
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

  // 特定年度の結果を取得
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

  return (
    <div className="space-y-6">
      {/* メインヘッダーカード */}
      <Card className="card-elevated border-0 shadow-lg bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-full bg-purple-100">
              <Target className="h-8 w-8 text-purple-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-slate-800 mb-1">
                日立第一高校附属中学校 過去問演習
              </h3>
              <p className="text-sm text-slate-600">
                適性検査I・IIの過去10年分の結果を記録して、成長を確認しよう
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 統計サマリー（データがある場合のみ） */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="card-elevated border-0 shadow-md">
            <CardContent className="p-4 text-center">
              <div className="text-xs text-muted-foreground mb-1">適性I 平均</div>
              <div className={`text-2xl font-bold ${stats.avgTekisei1 ? getScoreColor(stats.avgTekisei1) : "text-slate-400"}`}>
                {stats.avgTekisei1 ?? "--"}
                <span className="text-sm font-normal text-muted-foreground">点</span>
              </div>
            </CardContent>
          </Card>
          <Card className="card-elevated border-0 shadow-md">
            <CardContent className="p-4 text-center">
              <div className="text-xs text-muted-foreground mb-1">適性I 最高</div>
              <div className={`text-2xl font-bold ${stats.maxTekisei1 ? getScoreColor(stats.maxTekisei1) : "text-slate-400"}`}>
                {stats.maxTekisei1 ?? "--"}
                <span className="text-sm font-normal text-muted-foreground">点</span>
              </div>
            </CardContent>
          </Card>
          <Card className="card-elevated border-0 shadow-md">
            <CardContent className="p-4 text-center">
              <div className="text-xs text-muted-foreground mb-1">適性II 平均</div>
              <div className={`text-2xl font-bold ${stats.avgTekisei2 ? getScoreColor(stats.avgTekisei2) : "text-slate-400"}`}>
                {stats.avgTekisei2 ?? "--"}
                <span className="text-sm font-normal text-muted-foreground">点</span>
              </div>
            </CardContent>
          </Card>
          <Card className="card-elevated border-0 shadow-md">
            <CardContent className="p-4 text-center">
              <div className="text-xs text-muted-foreground mb-1">適性II 最高</div>
              <div className={`text-2xl font-bold ${stats.maxTekisei2 ? getScoreColor(stats.maxTekisei2) : "text-slate-400"}`}>
                {stats.maxTekisei2 ?? "--"}
                <span className="text-sm font-normal text-muted-foreground">点</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 年度選択セクション */}
      <Card className="card-elevated border-0 shadow-md">
        <CardHeader className="bg-gradient-to-r from-slate-100 to-gray-100 border-b pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-5 w-5 text-slate-600" />
            結果を入力する
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <Label htmlFor="year-select" className="font-medium text-sm">
              年度を選択
            </Label>
            <Select
              value={selectedYear.toString()}
              onValueChange={(value) => setSelectedYear(parseInt(value))}
            >
              <SelectTrigger id="year-select" className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXAM_YEARS.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}年度
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 科目別の結果表示 */}
          <div className="grid gap-4 md:grid-cols-2">
            {(Object.keys(EXAM_TYPES) as ExamType[]).map((examType) => {
              const typeResults = getExamResults(examType)
              const nextAttempt = getNextAttempt(examType)

              return (
                <div key={examType} className="border rounded-lg p-4 bg-white">
                  <div className="flex items-center gap-2 mb-3 pb-2 border-b">
                    <BookOpen className="h-4 w-4 text-purple-500" />
                    <span className="font-medium text-sm">{EXAM_TYPES[examType]}</span>
                  </div>
                  <div className="space-y-2">
                    {/* 既存の結果 */}
                    {[1, 2, 3].map((attemptNum) => {
                      const result = typeResults.find(
                        (r) => r.attempt_number === attemptNum
                      )

                      if (result) {
                        const scoreStyle = getScoreStyle(result.score)
                        return (
                          <div
                            key={attemptNum}
                            className={`flex items-center justify-between p-3 rounded-lg border ${scoreStyle.bg} ${scoreStyle.border}`}
                          >
                            <div className="flex items-center gap-3">
                              <Badge variant="outline" className="text-xs">
                                {attemptNum}回目
                              </Badge>
                              <span className={`font-bold text-lg ${scoreStyle.text}`}>
                                {result.score}点
                              </span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(result)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )
                      }

                      // 入力可能な場合
                      if (nextAttempt === attemptNum) {
                        return (
                          <Button
                            key={attemptNum}
                            variant="outline"
                            className="w-full justify-start gap-2 h-12 border-dashed border-2 hover:border-purple-300 hover:bg-purple-50 transition-all"
                            onClick={() => handleAddNew(examType)}
                          >
                            <Plus className="h-4 w-4 text-purple-500" />
                            <span className="text-sm">{attemptNum}回目を入力</span>
                          </Button>
                        )
                      }

                      // まだ入力できない場合
                      return (
                        <div
                          key={attemptNum}
                          className="flex items-center gap-3 p-3 text-muted-foreground opacity-50"
                        >
                          <Badge variant="outline" className="text-xs">
                            {attemptNum}回目
                          </Badge>
                          <span className="text-sm">--</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* 入力・編集ダイアログ */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {EXAM_TYPES[formData.exam_type]} {selectedYear}年{" "}
              {formData.attempt_number}回目
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {error && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="score">得点</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="score"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.score}
                  onChange={(e) =>
                    setFormData({ ...formData, score: e.target.value })
                  }
                  placeholder="0〜100"
                  className="w-24"
                />
                <span className="text-muted-foreground">/ 100点</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="taken_at">受験日</Label>
              <Input
                id="taken_at"
                type="date"
                value={formData.taken_at}
                onChange={(e) =>
                  setFormData({ ...formData, taken_at: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reflection">振り返り（任意）</Label>
              <Textarea
                id="reflection"
                value={formData.reflection}
                onChange={(e) =>
                  setFormData({ ...formData, reflection: e.target.value })
                }
                placeholder="時間配分、解けた問題、反省点など..."
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={saving}
            >
              キャンセル
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  保存中...
                </>
              ) : (
                "保存"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 入力済み結果サマリー */}
      {yearsWithResults.length > 0 && (
        <Card className="card-elevated border-0 shadow-md">
          <CardHeader className="bg-gradient-to-r from-slate-100 to-gray-100 border-b pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-slate-600" />
              入力済み結果一覧
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
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
                    className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-slate-800">{year}年度</span>
                      <div className="flex items-center gap-2">
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
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-4 border-t bg-slate-50/50">
                      <div className="pt-4">
                        {/* 適性検査I */}
                        {tekisei1Results.length > 0 && (
                          <div className="space-y-2 mb-4">
                            <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                              <BookOpen className="h-4 w-4 text-purple-500" />
                              {EXAM_TYPES.tekisei_1}
                            </div>
                            <div className="space-y-2 pl-6">
                              {tekisei1Results.map((result) => {
                                const scoreStyle = getScoreStyle(result.score)
                                return (
                                  <div
                                    key={result.id}
                                    className={`p-3 rounded-lg space-y-2 border ${scoreStyle.bg} ${scoreStyle.border}`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="text-xs">
                                          {result.attempt_number}回目
                                        </Badge>
                                        <span className={`font-bold ${scoreStyle.text}`}>
                                          {result.score}点
                                        </span>
                                      </div>
                                      <span className="text-xs text-muted-foreground">
                                        {result.taken_at}
                                      </span>
                                    </div>
                                    {result.reflection && (
                                      <div className="text-sm bg-white p-3 rounded border">
                                        <div className="flex items-center gap-1 mb-1">
                                          <MessageSquare className="h-3 w-3 text-purple-500" />
                                          <span className="text-xs font-medium text-slate-600">振り返り</span>
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
                            <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                              <BookOpen className="h-4 w-4 text-purple-500" />
                              {EXAM_TYPES.tekisei_2}
                            </div>
                            <div className="space-y-2 pl-6">
                              {tekisei2Results.map((result) => {
                                const scoreStyle = getScoreStyle(result.score)
                                return (
                                  <div
                                    key={result.id}
                                    className={`p-3 rounded-lg space-y-2 border ${scoreStyle.bg} ${scoreStyle.border}`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="text-xs">
                                          {result.attempt_number}回目
                                        </Badge>
                                        <span className={`font-bold ${scoreStyle.text}`}>
                                          {result.score}点
                                        </span>
                                      </div>
                                      <span className="text-xs text-muted-foreground">
                                        {result.taken_at}
                                      </span>
                                    </div>
                                    {result.reflection && (
                                      <div className="text-sm bg-white p-3 rounded border">
                                        <div className="flex items-center gap-1 mb-1">
                                          <MessageSquare className="h-3 w-3 text-purple-500" />
                                          <span className="text-xs font-medium text-slate-600">振り返り</span>
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
