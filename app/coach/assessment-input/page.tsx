"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ClipboardCheck, Loader2, CheckCircle2, AlertCircle } from "lucide-react"
import { CoachBottomNavigation } from "@/components/coach-bottom-navigation"
import { getAvatarById } from "@/lib/constants/avatars"
import { useToast } from "@/lib/hooks/use-toast"
import {
  getUnconfirmedSessions,
  getAssessmentInputData,
  saveAssessmentScores,
  type AssessmentInputStudent,
  type AssessmentMaster,
} from "@/app/actions/coach"

export default function AssessmentInputPage() {
  const router = useRouter()
  const { toast } = useToast()

  // State
  const [sessionNumber, setSessionNumber] = useState<number | null>(null)
  const [testType, setTestType] = useState<"math" | "kanji">("math")
  const [students, setStudents] = useState<AssessmentInputStudent[]>([])
  const [mathMasters, setMathMasters] = useState<AssessmentMaster[]>([])
  const [kanjiMaster, setKanjiMaster] = useState<AssessmentMaster | null>(null)
  const [unconfirmedSessions, setUnconfirmedSessions] = useState<
    Array<{ sessionNumber: number; unconfirmedCount: number; label: string }>
  >([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // 生徒ごとの入力値（ローカル state）
  const [scores, setScores] = useState<Record<string, {
    mathScore1?: number | null
    mathScore2?: number | null
    kanjiScore?: number | null
  }>>({})

  // 初期化: 未確定回次一覧を取得し、最新を自動選択
  useEffect(() => {
    const init = async () => {
      const { sessions, error } = await getUnconfirmedSessions()
      if (error) {
        toast({
          title: "エラー",
          description: error,
          variant: "destructive",
        })
        setLoading(false)
        return
      }

      setUnconfirmedSessions(sessions || [])

      // 最新の未確定回次を自動選択（降順ソート済み）
      if (sessions && sessions.length > 0) {
        setSessionNumber(sessions[0].sessionNumber)
      } else {
        setLoading(false)
      }
    }

    init()
  }, [])

  // 回次が選択されたらデータを取得
  useEffect(() => {
    if (sessionNumber === null) return

    const fetchData = async () => {
      setLoading(true)
      const { data, error } = await getAssessmentInputData(sessionNumber)
      if (error) {
        toast({
          title: "エラー",
          description: error,
          variant: "destructive",
        })
        setLoading(false)
        return
      }

      if (data) {
        setStudents(data.students)
        setMathMasters(data.mathMasters)
        setKanjiMaster(data.kanjiMaster)

        // 既存の入力値を初期化
        const initialScores: typeof scores = {}
        data.students.forEach((student) => {
          initialScores[student.id] = {
            mathScore1: student.mathScore1,
            mathScore2: student.mathScore2,
            kanjiScore: student.kanjiScore,
          }
        })
        setScores(initialScores)
      }

      setLoading(false)
    }

    fetchData()
  }, [sessionNumber])

  // 得点入力ハンドラ
  const handleScoreChange = (studentId: string, field: 'mathScore1' | 'mathScore2' | 'kanjiScore', value: string) => {
    const numValue = value === "" ? null : parseInt(value, 10)
    setScores((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: numValue,
      },
    }))
  }

  // 一括保存
  const handleSave = async () => {
    if (sessionNumber === null) return

    setSaving(true)

    // 保存データを作成
    const saveData: Array<{
      studentId: string
      masterId: string
      score: number | null
      status: 'completed' | 'absent' | 'not_submitted'
    }> = []

    students.forEach((student) => {
      const studentScores = scores[student.id] || {}

      // 算数プリント1
      const mathMaster1 = mathMasters.find((m) => m.grade === student.grade && m.attemptNumber === 1)
      if (mathMaster1) {
        const score = studentScores.mathScore1
        saveData.push({
          studentId: student.id,
          masterId: mathMaster1.id,
          score: score ?? null,
          status: score !== null && score !== undefined ? 'completed' : 'not_submitted',
        })
      }

      // 算数プリント2
      const mathMaster2 = mathMasters.find((m) => m.grade === student.grade && m.attemptNumber === 2)
      if (mathMaster2) {
        const score = studentScores.mathScore2
        saveData.push({
          studentId: student.id,
          masterId: mathMaster2.id,
          score: score ?? null,
          status: score !== null && score !== undefined ? 'completed' : 'not_submitted',
        })
      }

      // 漢字テスト
      if (kanjiMaster && kanjiMaster.grade === student.grade) {
        const score = studentScores.kanjiScore
        saveData.push({
          studentId: student.id,
          masterId: kanjiMaster.id,
          score: score ?? null,
          status: score !== null && score !== undefined ? 'completed' : 'not_submitted',
        })
      }
    })

    const { success, error } = await saveAssessmentScores(sessionNumber, saveData)

    setSaving(false)

    if (error) {
      toast({
        title: "保存失敗",
        description: error,
        variant: "destructive",
      })
      return
    }

    if (success) {
      const savedCount = saveData.filter((d) => d.status === 'completed').length
      toast({
        title: "保存完了",
        description: `${savedCount}件の得点を保存しました`,
      })

      // データを再取得して最新状態を反映
      const { data } = await getAssessmentInputData(sessionNumber)
      if (data) {
        setStudents(data.students)
        const initialScores: typeof scores = {}
        data.students.forEach((student) => {
          initialScores[student.id] = {
            mathScore1: student.mathScore1,
            mathScore2: student.mathScore2,
            kanjiScore: student.kanjiScore,
          }
        })
        setScores(initialScores)
      }
    }
  }

  // 未入力件数を計算
  const getUnconfirmedCount = () => {
    if (testType === "math") {
      return students.filter((student) => {
        const studentScores = scores[student.id] || {}
        return studentScores.mathScore1 === null || studentScores.mathScore1 === undefined ||
               studentScores.mathScore2 === null || studentScores.mathScore2 === undefined
      }).length * 2 // 算数は2回分
    } else {
      return students.filter((student) => {
        const studentScores = scores[student.id] || {}
        return studentScores.kanjiScore === null || studentScores.kanjiScore === undefined
      }).length
    }
  }

  const getAvatarSrc = (student: AssessmentInputStudent) => {
    if (student.customAvatarUrl) return student.customAvatarUrl
    if (student.avatarId) {
      const avatar = getAvatarById(student.avatarId)
      return avatar?.src || "/placeholder.svg"
    }
    return "/placeholder.svg"
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (unconfirmedSessions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ClipboardCheck className="h-6 w-6 text-cyan-600" />
                <h1 className="text-xl font-bold text-gray-900">得点入力</h1>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-12">
          <Card className="text-center">
            <CardContent className="py-12">
              <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-emerald-600" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                すべて入力済みです
              </h2>
              <p className="text-gray-600">
                現在、未入力の得点はありません
              </p>
            </CardContent>
          </Card>
        </div>

        <CoachBottomNavigation />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* ヘッダー */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ClipboardCheck className="h-6 w-6 text-cyan-600" />
              <h1 className="text-xl font-bold text-gray-900">得点入力</h1>
            </div>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  保存中...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  一括保存
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* 回次選択 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">回次選択</CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={String(sessionNumber)}
              onValueChange={(value) => setSessionNumber(parseInt(value, 10))}
            >
              <SelectTrigger className="w-full md:w-64">
                <SelectValue placeholder="回次を選択" />
              </SelectTrigger>
              <SelectContent>
                {unconfirmedSessions.map((session) => (
                  <SelectItem key={session.sessionNumber} value={String(session.sessionNumber)}>
                    {session.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* テスト種別選択 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">テスト種別選択</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup value={testType} onValueChange={(value) => setTestType(value as "math" | "kanji")}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="math" id="math" />
                <Label htmlFor="math" className="cursor-pointer">
                  算数プリント（100点満点） - {students.filter((s) => {
                    const studentScores = scores[s.id] || {}
                    return studentScores.mathScore1 === null || studentScores.mathScore1 === undefined ||
                           studentScores.mathScore2 === null || studentScores.mathScore2 === undefined
                  }).length * 2}件未入力
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="kanji" id="kanji" />
                <Label htmlFor="kanji" className="cursor-pointer">
                  漢字テスト（50点満点） - {students.filter((s) => {
                    const studentScores = scores[s.id] || {}
                    return studentScores.kanjiScore === null || studentScores.kanjiScore === undefined
                  }).length}件未入力
                </Label>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>

        {/* 生徒リスト */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              生徒リスト - 第{sessionNumber}回 {testType === "math" ? "算数プリント" : "漢字テスト"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {students.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <AlertCircle className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                <p>担当生徒が見つかりません</p>
              </div>
            ) : (
              <div className="space-y-4">
                {students.map((student) => {
                  const studentScores = scores[student.id] || {}
                  return (
                    <div
                      key={student.id}
                      className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={getAvatarSrc(student)} alt={student.fullName} />
                        <AvatarFallback>{student.fullName.charAt(0)}</AvatarFallback>
                      </Avatar>

                      <div className="flex-1">
                        <div className="font-medium text-gray-900">
                          {student.fullName}
                          {student.nickname && (
                            <span className="text-sm text-gray-600 ml-2">({student.nickname})</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">{student.grade}</div>
                      </div>

                      {testType === "math" ? (
                        <div className="flex items-center gap-4">
                          <div className="space-y-1">
                            <Label htmlFor={`math1-${student.id}`} className="text-xs text-gray-600">
                              1回目
                            </Label>
                            <div className="flex items-center gap-2">
                              <Input
                                id={`math1-${student.id}`}
                                type="number"
                                min="0"
                                max="100"
                                placeholder="0-100"
                                value={studentScores.mathScore1 ?? ""}
                                onChange={(e) => handleScoreChange(student.id, 'mathScore1', e.target.value)}
                                className="w-24 text-right"
                              />
                              <span className="text-sm text-gray-500">/100</span>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <Label htmlFor={`math2-${student.id}`} className="text-xs text-gray-600">
                              2回目
                            </Label>
                            <div className="flex items-center gap-2">
                              <Input
                                id={`math2-${student.id}`}
                                type="number"
                                min="0"
                                max="100"
                                placeholder="0-100"
                                value={studentScores.mathScore2 ?? ""}
                                onChange={(e) => handleScoreChange(student.id, 'mathScore2', e.target.value)}
                                className="w-24 text-right"
                              />
                              <span className="text-sm text-gray-500">/100</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <Label htmlFor={`kanji-${student.id}`} className="text-xs text-gray-600">
                            得点
                          </Label>
                          <div className="flex items-center gap-2">
                            <Input
                              id={`kanji-${student.id}`}
                              type="number"
                              min="0"
                              max="50"
                              placeholder="0-50"
                              value={studentScores.kanjiScore ?? ""}
                              onChange={(e) => handleScoreChange(student.id, 'kanjiScore', e.target.value)}
                              className="w-24 text-right"
                            />
                            <span className="text-sm text-gray-500">/50</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 保存ボタン（モバイル用） */}
        <div className="md:hidden">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-blue-600 hover:bg-blue-700"
            size="lg"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                保存中...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                一括保存
              </>
            )}
          </Button>
        </div>
      </div>

      <CoachBottomNavigation />
    </div>
  )
}
