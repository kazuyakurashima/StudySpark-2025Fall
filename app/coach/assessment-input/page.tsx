"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { useToast } from "@/hooks/use-toast"
import {
  getUnconfirmedSessions,
  getAssessmentInputData,
  saveAssessmentScores,
  type AssessmentInputStudent,
  type AssessmentMaster,
  type AssessmentInputData,
} from "@/app/actions/coach"
import { getTodayJST } from "@/lib/utils/date-jst"

export default function AssessmentInputPage() {
  const router = useRouter()
  const { toast } = useToast()

  // State
  const [sessionNumber, setSessionNumber] = useState<number | null>(null)
  const [testType, setTestType] = useState<"math" | "kanji">("math")
  const [selectedGrade, setSelectedGrade] = useState<'5年' | '6年'>('5年')
  const [students, setStudents] = useState<AssessmentInputStudent[]>([])
  const [mathMasters, setMathMasters] = useState<AssessmentMaster[]>([])
  const [kanjiMasters, setKanjiMasters] = useState<AssessmentMaster[]>([])
  const [unconfirmedSessions, setUnconfirmedSessions] = useState<
    Array<{ sessionNumber: number; unconfirmedCount5: number; unconfirmedCount6: number }>
  >([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [assessmentDate, setAssessmentDate] = useState<string>('')

  // 生徒ごとの入力値（ローカル state）
  type AssessmentStatus = 'completed' | 'absent' | 'not_submitted'

  const [scores, setScores] = useState<Record<string, {
    math1?: number | null
    math2?: number | null
    kanji?: number | null
  }>>({})

  const [statuses, setStatuses] = useState<Record<string, {
    math1?: AssessmentStatus
    math2?: AssessmentStatus
    kanji?: AssessmentStatus
  }>>({})

  const [dates, setDates] = useState<Record<string, {
    math1?: string | null
    math2?: string | null
    kanji?: string | null
  }>>({})

  // Undo用のスコアキャッシュ
  const [scoreCache, setScoreCache] = useState<Record<string, {
    math1?: number | null
    math2?: number | null
    kanji?: number | null
  }>>({})

  // 初期化: 未確定回次一覧を取得し、最初の回を自動選択
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

      // 選択中の学年で未入力がある最初の回を自動選択
      if (sessions && sessions.length > 0) {
        const validSession = sessions.find((s) =>
          selectedGrade === '5年' ? s.unconfirmedCount5 > 0 : s.unconfirmedCount6 > 0
        )
        if (validSession) {
          setSessionNumber(validSession.sessionNumber)
        } else {
          setLoading(false)
        }
      } else {
        setLoading(false)
      }
    }

    init()
  }, [])

  // 学年変更時: 現在の回が新しい学年で0件なら、有効な回に切り替え
  useEffect(() => {
    if (unconfirmedSessions.length === 0) return

    const currentSession = unconfirmedSessions.find((s) => s.sessionNumber === sessionNumber)
    const currentCount = currentSession
      ? (selectedGrade === '5年' ? currentSession.unconfirmedCount5 : currentSession.unconfirmedCount6)
      : 0

    // 現在の回が新学年で0件の場合、有効な回に切り替え
    if (currentCount === 0) {
      const validSession = unconfirmedSessions.find((s) =>
        selectedGrade === '5年' ? s.unconfirmedCount5 > 0 : s.unconfirmedCount6 > 0
      )
      if (validSession) {
        setSessionNumber(validSession.sessionNumber)
      }
    }
  }, [selectedGrade, unconfirmedSessions])

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
        setKanjiMasters(data.kanjiMasters)

        // 既存の入力値を初期化
        const initialScores: typeof scores = {}
        const initialStatuses: typeof statuses = {}
        const initialDates: typeof dates = {}
        const initialCache: typeof scoreCache = {}

        data.students.forEach((student) => {
          initialScores[student.id] = {
            math1: student.mathScore1,
            math2: student.mathScore2,
            kanji: student.kanjiScore,
          }
          initialStatuses[student.id] = {
            math1: student.mathStatus1 || 'not_submitted',
            math2: student.mathStatus2 || 'not_submitted',
            kanji: student.kanjiStatus || 'not_submitted',
          }
          initialDates[student.id] = {
            math1: student.mathDate1,
            math2: student.mathDate2,
            kanji: student.kanjiDate,
          }
          // 初期キャッシュには既存の得点を保存
          initialCache[student.id] = {
            math1: student.mathScore1,
            math2: student.mathScore2,
            kanji: student.kanjiScore,
          }
        })

        setScores(initialScores)
        setStatuses(initialStatuses)
        setDates(initialDates)
        setScoreCache(initialCache)

        // テスト採点日のデフォルト値を設定（全生徒の既存日付から最新を取得）
        const allDates = data.students
          .flatMap(s => [s.mathDate1, s.mathDate2, s.kanjiDate])
          .filter((d): d is string => d !== null && d !== undefined)
          .sort((a, b) => b.localeCompare(a))
        setAssessmentDate(allDates[0] || getTodayJST())

        // スキップされた生徒がいれば通知
        if (data.skippedStudentsCount > 0) {
          toast({
            title: "一部の生徒をスキップしました",
            description: `${data.skippedStudentsCount}名の生徒の学年情報が不正なため、表示をスキップしました。詳細はコンソールログをご確認ください。`,
            variant: "destructive",
          })
        }
      }

      setLoading(false)
    }

    fetchData()
  }, [sessionNumber])

  // 得点入力ハンドラ
  const handleScoreChange = (
    studentId: string,
    subject: 'math1' | 'math2' | 'kanji',
    value: string,
    isSystemClear: boolean = false
  ) => {
    const numValue = value === '' ? null : parseInt(value, 10)

    setScores(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [subject]: numValue
      }
    }))

    // システムクリアでない場合のみキャッシュを更新
    if (!isSystemClear && numValue !== null) {
      setScoreCache(prev => ({
        ...prev,
        [studentId]: {
          ...prev[studentId],
          [subject]: numValue
        }
      }))
    }
  }

  // ステータス変更ハンドラ
  const handleStatusChange = (
    studentId: string,
    subject: 'math1' | 'math2' | 'kanji',
    newStatus: AssessmentStatus
  ) => {
    setStatuses(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [subject]: newStatus
      }
    }))

    // ステータスがabsentまたはnot_submittedの場合、得点をクリア（システムクリア）
    if (newStatus === 'absent' || newStatus === 'not_submitted') {
      handleScoreChange(studentId, subject, '', true)
    }
    // completedに変更された場合、キャッシュがあれば復元
    else if (newStatus === 'completed') {
      const cached = scoreCache[studentId]?.[subject]
      if (cached !== null && cached !== undefined) {
        handleScoreChange(studentId, subject, String(cached), false)
      }
    }
  }

  // 日付変更ハンドラ
  const handleDateChange = (
    studentId: string,
    subject: 'math1' | 'math2' | 'kanji',
    value: string
  ) => {
    setDates(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [subject]: value || null
      }
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

    // 得点が入力されている場合は自動的にステータスをcompletedに変更
    const determineStatus = (
      score: number | null | undefined,
      currentStatus: AssessmentStatus | undefined
    ): 'completed' | 'absent' | 'not_submitted' => {
      // 欠席は維持
      if (currentStatus === 'absent') return 'absent'
      // 得点が入力されていれば完了
      if (score !== null && score !== undefined) return 'completed'
      // 得点がない場合は未提出（completedを保持しない = DB制約違反を防止）
      return 'not_submitted'
    }

    // 選択した学年の生徒のみ保存
    students.filter(s => s.grade === selectedGrade).forEach((student) => {
      const studentScores = scores[student.id] || {}
      const studentStatuses = statuses[student.id] || {}

      // 算数プリント1
      const mathMaster1 = mathMasters.find((m) => m.grade === student.grade && m.attemptNumber === 1)
      if (mathMaster1) {
        saveData.push({
          studentId: student.id,
          masterId: mathMaster1.id,
          score: studentScores.math1 ?? null,
          status: determineStatus(studentScores.math1, studentStatuses.math1),
        })
      }

      // 算数プリント2
      const mathMaster2 = mathMasters.find((m) => m.grade === student.grade && m.attemptNumber === 2)
      if (mathMaster2) {
        saveData.push({
          studentId: student.id,
          masterId: mathMaster2.id,
          score: studentScores.math2 ?? null,
          status: determineStatus(studentScores.math2, studentStatuses.math2),
        })
      }

      // 漢字テスト（学年ごとに異なるマスタを使用）
      const kanjiMaster = kanjiMasters.find((m) => m.grade === student.grade)
      if (kanjiMaster) {
        saveData.push({
          studentId: student.id,
          masterId: kanjiMaster.id,
          score: studentScores.kanji ?? null,
          status: determineStatus(studentScores.kanji, studentStatuses.kanji),
        })
      }
    })

    const { success, error} = await saveAssessmentScores(sessionNumber, saveData, assessmentDate)

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
        setMathMasters(data.mathMasters)
        setKanjiMasters(data.kanjiMasters)

        const initialScores: typeof scores = {}
        const initialStatuses: typeof statuses = {}
        const initialDates: typeof dates = {}
        const initialCache: typeof scoreCache = {}

        data.students.forEach((student) => {
          initialScores[student.id] = {
            math1: student.mathScore1,
            math2: student.mathScore2,
            kanji: student.kanjiScore,
          }
          initialStatuses[student.id] = {
            math1: student.mathStatus1 || 'not_submitted',
            math2: student.mathStatus2 || 'not_submitted',
            kanji: student.kanjiStatus || 'not_submitted',
          }
          initialDates[student.id] = {
            math1: student.mathDate1,
            math2: student.mathDate2,
            kanji: student.kanjiDate,
          }
          initialCache[student.id] = {
            math1: student.mathScore1,
            math2: student.mathScore2,
            kanji: student.kanjiScore,
          }
        })

        setScores(initialScores)
        setStatuses(initialStatuses)
        setDates(initialDates)
        setScoreCache(initialCache)

        // テスト採点日を更新
        const allDates = data.students
          .flatMap(s => [s.mathDate1, s.mathDate2, s.kanjiDate])
          .filter((d): d is string => d !== null && d !== undefined)
          .sort((a, b) => b.localeCompare(a))
        setAssessmentDate(allDates[0] || getTodayJST())
      }
    }
  }

  // 未入力件数を計算（ステータスベース）
  const getUnconfirmedCount = () => {
    if (testType === "math") {
      let count = 0
      students.forEach((student) => {
        const studentStatuses = statuses[student.id] || {}
        if (studentStatuses.math1 === 'not_submitted') count++
        if (studentStatuses.math2 === 'not_submitted') count++
      })
      return count
    } else {
      return students.filter((student) => {
        const studentStatuses = statuses[student.id] || {}
        return studentStatuses.kanji === 'not_submitted'
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
        {/* 回次・学年選択 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">回次・学年選択</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Label className="text-xs text-gray-600 mb-2 block">回次</Label>
                <Select
                  value={String(sessionNumber)}
                  onValueChange={(value) => setSessionNumber(parseInt(value, 10))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="回次を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {unconfirmedSessions
                      .filter((session) => {
                        const count = selectedGrade === '5年' ? session.unconfirmedCount5 : session.unconfirmedCount6
                        return count > 0
                      })
                      .map((session) => {
                        const count = selectedGrade === '5年' ? session.unconfirmedCount5 : session.unconfirmedCount6
                        return (
                          <SelectItem key={session.sessionNumber} value={String(session.sessionNumber)}>
                            第{session.sessionNumber}回（{count}件未入力）
                          </SelectItem>
                        )
                      })}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <Label className="text-xs text-gray-600 mb-2 block">学年</Label>
                <div className="flex gap-2">
                  <Button
                    variant={selectedGrade === '5年' ? 'default' : 'outline'}
                    onClick={() => setSelectedGrade('5年')}
                    className="flex-1"
                  >
                    5年生
                  </Button>
                  <Button
                    variant={selectedGrade === '6年' ? 'default' : 'outline'}
                    onClick={() => setSelectedGrade('6年')}
                    className="flex-1"
                  >
                    6年生
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* テスト採点日 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">テスト採点日</CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              type="date"
              value={assessmentDate}
              onChange={(e) => setAssessmentDate(e.target.value)}
              className="w-full md:w-64"
            />
            <p className="text-xs text-gray-500 mt-2">
              すべてのテストに適用されます
            </p>
          </CardContent>
        </Card>

        {/* テスト種別選択 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">テスト種別選択</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              <Button
                variant={testType === "math" ? "default" : "outline"}
                onClick={() => setTestType("math")}
                className="w-full justify-start text-left h-auto py-3"
              >
                <div className="flex flex-col">
                  <span className="font-semibold">算数プリント</span>
                  <span className="text-sm font-normal opacity-80">
                    {(() => {
                      let count = 0
                      students.filter(s => s.grade === selectedGrade).forEach((s) => {
                        const studentStatuses = statuses[s.id] || {}
                        if (studentStatuses.math1 === 'not_submitted') count++
                        if (studentStatuses.math2 === 'not_submitted') count++
                      })
                      return count
                    })()}件未入力
                  </span>
                </div>
              </Button>
              <Button
                variant={testType === "kanji" ? "default" : "outline"}
                onClick={() => setTestType("kanji")}
                className="w-full justify-start text-left h-auto py-3"
              >
                <div className="flex flex-col">
                  <span className="font-semibold">漢字テスト</span>
                  <span className="text-sm font-normal opacity-80">
                    {students.filter(s => s.grade === selectedGrade).filter((s) => {
                      const studentStatuses = statuses[s.id] || {}
                      return studentStatuses.kanji === 'not_submitted'
                    }).length}件未入力
                  </span>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 生徒リスト */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              生徒リスト - 第{sessionNumber}回 {testType === "math" ? "算数プリント" : "漢字テスト"} ({selectedGrade})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {students.filter(s => s.grade === selectedGrade).length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <AlertCircle className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                <p>{selectedGrade}の担当生徒が見つかりません</p>
              </div>
            ) : (
              <div className="space-y-4">
                {students.filter(s => s.grade === selectedGrade).map((student) => {
                  const studentScores = scores[student.id] || {}
                  const studentStatuses = statuses[student.id] || {}
                  const mathMaster1 = mathMasters.find((m) => m.grade === student.grade && m.attemptNumber === 1)
                  const mathMaster2 = mathMasters.find((m) => m.grade === student.grade && m.attemptNumber === 2)
                  const kanjiMaster = kanjiMasters.find((m) => m.grade === student.grade)

                  return (
                    <div
                      key={student.id}
                      className="flex flex-col gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <div className="flex items-center gap-4">
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
                      </div>

                      {testType === "math" ? (
                        <div className="flex flex-col md:flex-row gap-4">
                          {/* 算数プリント1回目 */}
                          {mathMaster1 ? (
                          <div className="flex-1 space-y-2">
                            <Label className="text-xs text-gray-600">{mathMaster1.title}</Label>
                            <div className="flex items-center gap-2">
                              <Select
                                value={studentStatuses.math1 || 'not_submitted'}
                                onValueChange={(value: AssessmentStatus) => handleStatusChange(student.id, 'math1', value)}
                              >
                                <SelectTrigger className="w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="completed">完了</SelectItem>
                                  <SelectItem value="absent">欠席</SelectItem>
                                  <SelectItem value="not_submitted">未提出</SelectItem>
                                </SelectContent>
                              </Select>
                              <Input
                                type="number"
                                min="0"
                                max={mathMaster1?.maxScore || 100}
                                placeholder="0"
                                value={studentScores.math1 ?? ""}
                                onChange={(e) => handleScoreChange(student.id, 'math1', e.target.value)}
                                disabled={studentStatuses.math1 === 'absent'}
                                className="w-20 text-right"
                              />
                              <span className="text-sm text-gray-500">/{mathMaster1?.maxScore || 100}</span>
                            </div>
                          </div>
                          ) : (
                          <div className="flex-1 space-y-2">
                            <Label className="text-xs text-gray-600">算数プリント 1回目</Label>
                            <p className="text-sm text-gray-500">この回は算数プリント1回目がありません</p>
                          </div>
                          )}

                          {/* 算数プリント2回目 */}
                          {mathMaster2 ? (
                          <div className="flex-1 space-y-2">
                            <Label className="text-xs text-gray-600">{mathMaster2.title}</Label>
                            <div className="flex items-center gap-2">
                              <Select
                                value={studentStatuses.math2 || 'not_submitted'}
                                onValueChange={(value: AssessmentStatus) => handleStatusChange(student.id, 'math2', value)}
                              >
                                <SelectTrigger className="w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="completed">完了</SelectItem>
                                  <SelectItem value="absent">欠席</SelectItem>
                                  <SelectItem value="not_submitted">未提出</SelectItem>
                                </SelectContent>
                              </Select>
                              <Input
                                type="number"
                                min="0"
                                max={mathMaster2?.maxScore || 100}
                                placeholder="0"
                                value={studentScores.math2 ?? ""}
                                onChange={(e) => handleScoreChange(student.id, 'math2', e.target.value)}
                                disabled={studentStatuses.math2 === 'absent'}
                                className="w-20 text-right"
                              />
                              <span className="text-sm text-gray-500">/{mathMaster2?.maxScore || 100}</span>
                            </div>
                          </div>
                          ) : (
                          <div className="flex-1 space-y-2">
                            <Label className="text-xs text-gray-600">算数プリント 2回目</Label>
                            <p className="text-sm text-gray-500">この回は算数プリント2回目がありません</p>
                          </div>
                          )}
                        </div>
                      ) : (
                        kanjiMaster ? (
                        <div className="space-y-2">
                          <Label className="text-xs text-gray-600">{kanjiMaster.title}</Label>
                          <div className="flex items-center gap-2">
                            <Select
                              value={studentStatuses.kanji || 'not_submitted'}
                              onValueChange={(value: AssessmentStatus) => handleStatusChange(student.id, 'kanji', value)}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="completed">完了</SelectItem>
                                <SelectItem value="absent">欠席</SelectItem>
                                <SelectItem value="not_submitted">未提出</SelectItem>
                              </SelectContent>
                            </Select>
                            <Input
                              type="number"
                              min="0"
                              max={kanjiMaster?.maxScore || 10}
                              placeholder="0"
                              value={studentScores.kanji ?? ""}
                              onChange={(e) => handleScoreChange(student.id, 'kanji', e.target.value)}
                              disabled={studentStatuses.kanji === 'absent'}
                              className="w-20 text-right"
                            />
                            <span className="text-sm text-gray-500">/{kanjiMaster?.maxScore || 10}</span>
                          </div>
                        </div>
                        ) : (
                        <div className="space-y-2">
                          <Label className="text-xs text-gray-600">漢字テスト</Label>
                          <p className="text-sm text-gray-500">この回は漢字テストがありません</p>
                        </div>
                        )
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
