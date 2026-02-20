"use client"

import { useState, useMemo, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import CoachBottomNavigation from "@/components/coach-bottom-navigation"
import { UserProfileHeader } from "@/components/common/user-profile-header"
import {
  ClipboardList,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Users,
  Calendar,
  Save,
} from "lucide-react"
import { useAssessmentMasters, invalidateAllAssessments } from "@/lib/hooks/use-assessments"
import { useCoachStudents } from "@/lib/hooks/use-coach-students"
import { getAvatarById } from "@/lib/constants/avatars"
import type {
  AssessmentType,
  AssessmentGrade,
  AssessmentMaster,
  AssessmentStatus,
  BatchAssessmentInput,
} from "@/lib/types/class-assessment"
import {
  ASSESSMENT_TYPE_LABELS,
  ASSESSMENT_TYPE_COLORS,
} from "@/lib/types/class-assessment"

// =============================================================================
// 型定義
// =============================================================================

interface StudentForInput {
  id: string // CoachStudentはstring型
  full_name: string
  nickname: string | null
  avatar_id: string | null
  custom_avatar_url: string | null
  grade: string // "小学5年" | "小学6年"
}

interface StudentInputState {
  status: AssessmentStatus
  score: string // 入力中は文字列で保持
}

// =============================================================================
// メインコンポーネント
// =============================================================================

export default function CoachAssessmentInputPage() {
  // フィルター状態
  const [selectedType, setSelectedType] = useState<AssessmentType | "">("")
  const [selectedGrade, setSelectedGrade] = useState<AssessmentGrade | "">("")
  const [selectedMasterId, setSelectedMasterId] = useState<string>("")
  const [assessmentDate, setAssessmentDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  )

  // 入力状態（student_id -> 入力値）
  const [inputs, setInputs] = useState<Map<string, StudentInputState>>(new Map())

  // 送信状態
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitResult, setSubmitResult] = useState<{
    success: boolean
    message: string
  } | null>(null)

  // マスタデータ取得
  const { masters, isLoading: mastersLoading } = useAssessmentMasters({
    grade: selectedGrade || undefined,
    type: selectedType || undefined,
  })

  // 担当生徒取得（既存のSWRフックを使用）
  const { students: studentsRaw, isLoading: studentsLoading } = useCoachStudents()

  // CoachStudent型をStudentForInput型に変換
  const studentsData: StudentForInput[] = useMemo(() => {
    return studentsRaw.map((s) => ({
      id: s.id,
      full_name: s.full_name,
      nickname: s.nickname,
      avatar_id: s.avatar_id,
      custom_avatar_url: s.custom_avatar_url,
      grade: s.grade,
    }))
  }, [studentsRaw])

  // 選択中のマスタ
  const selectedMaster = useMemo(() => {
    return masters.find((m) => m.id === selectedMasterId)
  }, [masters, selectedMasterId])

  // 学年でフィルタリングした生徒リスト
  const filteredStudents = useMemo(() => {
    if (studentsData.length === 0 || !selectedGrade) return []
    // selectedGrade: "5年" | "6年"
    // student.grade: "小学5年" | "小学6年"
    const targetGrade = selectedGrade === "5年" ? "小学5年" : "小学6年"
    return studentsData.filter((s) => s.grade === targetGrade)
  }, [studentsData, selectedGrade])

  // セッション番号でグループ化したマスタリスト
  const mastersBySession = useMemo(() => {
    const grouped = new Map<number, AssessmentMaster[]>()
    masters.forEach((m) => {
      const list = grouped.get(m.session_number) || []
      list.push(m)
      grouped.set(m.session_number, list)
    })
    return grouped
  }, [masters])

  // 入力状態を更新
  const updateInput = useCallback(
    (studentId: string, updates: Partial<StudentInputState>) => {
      setInputs((prev) => {
        const newMap = new Map(prev)
        const current = newMap.get(studentId) || {
          status: "not_submitted" as AssessmentStatus,
          score: "",
        }
        newMap.set(studentId, { ...current, ...updates })
        return newMap
      })
    },
    []
  )

  // 欠席トグル
  const toggleAbsent = useCallback(
    (studentId: string, isAbsent: boolean) => {
      updateInput(studentId, {
        status: isAbsent ? "absent" : "not_submitted",
        score: "",
      })
    },
    [updateInput]
  )

  // 得点入力
  const handleScoreChange = useCallback(
    (studentId: string, value: string) => {
      // 数値のみ許可
      if (value !== "" && !/^\d+$/.test(value)) {
        return
      }

      const numValue = value === "" ? null : parseInt(value, 10)
      const maxScore = selectedMaster?.max_score || 100

      // 満点を超える場合は制限
      if (numValue !== null && numValue > maxScore) {
        return
      }

      updateInput(studentId, {
        status: value === "" ? "not_submitted" : "completed",
        score: value,
      })
    },
    [updateInput, selectedMaster]
  )

  // 入力状況のサマリー
  const inputSummary = useMemo(() => {
    let completed = 0
    let absent = 0
    let notSubmitted = 0

    filteredStudents.forEach((student) => {
      const input = inputs.get(student.id)
      if (!input || input.status === "not_submitted") {
        notSubmitted++
      } else if (input.status === "absent") {
        absent++
      } else if (input.status === "completed") {
        completed++
      }
    })

    return { completed, absent, notSubmitted, total: filteredStudents.length }
  }, [filteredStudents, inputs])

  // 送信処理
  const handleSubmit = async () => {
    if (!selectedMasterId || !assessmentDate) {
      setSubmitResult({
        success: false,
        message: "テストと実施日を選択してください",
      })
      return
    }

    // 入力がある生徒のみ抽出
    const inputsToSubmit: BatchAssessmentInput[] = []
    filteredStudents.forEach((student) => {
      const input = inputs.get(student.id)
      if (input && input.status !== "not_submitted") {
        inputsToSubmit.push({
          student_id: parseInt(student.id, 10), // string -> number変換
          master_id: selectedMasterId,
          status: input.status,
          score: input.status === "completed" ? parseInt(input.score, 10) : null,
          assessment_date: assessmentDate,
          is_resubmission: false,
        })
      }
    })

    if (inputsToSubmit.length === 0) {
      setSubmitResult({
        success: false,
        message: "入力されたデータがありません",
      })
      return
    }

    setIsSubmitting(true)
    setSubmitResult(null)

    try {
      // APIルート経由でバッチ登録
      const response = await fetch("/api/assessments/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inputs: inputsToSubmit }),
      })

      const result = await response.json()

      if (result.success) {
        setSubmitResult({
          success: true,
          message: `${result.inserted}件登録、${result.updated}件更新しました`,
        })
        // キャッシュを無効化
        await invalidateAllAssessments()
        // 入力をクリア
        setInputs(new Map())
      } else {
        const errorMessages = result.errors?.map((e: { error: string }) => e.error).join(", ") || result.error || "エラーが発生しました"
        setSubmitResult({
          success: false,
          message: `エラー: ${errorMessages}`,
        })
      }
    } catch (error) {
      setSubmitResult({
        success: false,
        message: "保存中にエラーが発生しました",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // マスタ選択変更時に入力をクリア
  const handleMasterChange = (masterId: string) => {
    setSelectedMasterId(masterId)
    setInputs(new Map())
    setSubmitResult(null)
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* ヘッダー */}
      <UserProfileHeader />

      <main className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="flex items-center gap-2 mb-6">
          <ClipboardList className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold">テスト結果入力</h1>
        </div>

        {/* フィルター選択カード */}
        <Card className="mb-6">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">テスト選択</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* テスト種別 & 学年 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">テスト種別</Label>
                <Select
                  value={selectedType}
                  onValueChange={(v) => {
                    setSelectedType(v as AssessmentType)
                    setSelectedMasterId("")
                    setInputs(new Map())
                  }}
                >
                  <SelectTrigger id="type">
                    <SelectValue placeholder="選択してください" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="math_print">算数プリント</SelectItem>
                    <SelectItem value="kanji_test">漢字テスト</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="grade">学年</Label>
                <Select
                  value={selectedGrade}
                  onValueChange={(v) => {
                    setSelectedGrade(v as AssessmentGrade)
                    setSelectedMasterId("")
                    setInputs(new Map())
                  }}
                >
                  <SelectTrigger id="grade">
                    <SelectValue placeholder="選択してください" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5年">5年生</SelectItem>
                    <SelectItem value="6年">6年生</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 学習回選択 */}
            {selectedType && selectedGrade && (
              <div className="space-y-2">
                <Label htmlFor="session">学習回</Label>
                {mastersLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    読み込み中...
                  </div>
                ) : (
                  <Select value={selectedMasterId} onValueChange={handleMasterChange}>
                    <SelectTrigger id="session">
                      <SelectValue placeholder="学習回を選択" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from(mastersBySession.entries())
                        .sort(([a], [b]) => a - b)
                        .map(([sessionNum, sessionMasters]) => (
                          <div key={sessionNum}>
                            {sessionMasters.map((m) => (
                              <SelectItem key={m.id} value={m.id}>
                                {m.title ? (
                                  m.title
                                ) : (
                                  <>
                                    第{m.session_number}回
                                    {m.assessment_type === "math_print" &&
                                      `${m.attempt_number === 1 ? "①" : "②"}`}
                                    {m.title && ` ${m.title}`}
                                  </>
                                )}
                                （満点: {m.max_score}点）
                              </SelectItem>
                            ))}
                          </div>
                        ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            {/* 実施日 */}
            {selectedMasterId && (
              <div className="space-y-2">
                <Label htmlFor="date">
                  <Calendar className="h-4 w-4 inline mr-1" />
                  実施日
                </Label>
                <Input
                  id="date"
                  type="date"
                  value={assessmentDate}
                  onChange={(e) => setAssessmentDate(e.target.value)}
                  className="w-48"
                />
              </div>
            )}

            {/* 選択中のテスト情報 */}
            {selectedMaster && (
              <div className="pt-2 border-t">
                <div className="flex items-center gap-2 text-sm flex-wrap">
                  <Badge
                    className={
                      ASSESSMENT_TYPE_COLORS[selectedMaster.assessment_type as AssessmentType].badge
                    }
                  >
                    {ASSESSMENT_TYPE_LABELS[selectedMaster.assessment_type as AssessmentType]}
                  </Badge>
                  <span className="text-muted-foreground">
                    第{selectedMaster.session_number}回
                    {selectedMaster.assessment_type === "math_print" &&
                      `${selectedMaster.attempt_number === 1 ? "①" : "②"}`}
                  </span>
                  {selectedMaster.title && (
                    <span className="font-medium text-slate-700">
                      {selectedMaster.title}
                    </span>
                  )}
                  <span className="font-medium">
                    満点: {selectedMaster.max_score}点
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 生徒入力テーブル */}
        {selectedMasterId && (
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  生徒一覧
                </CardTitle>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-green-600">
                    入力済: {inputSummary.completed}名
                  </span>
                  <span className="text-gray-500">
                    欠席: {inputSummary.absent}名
                  </span>
                  <span className="text-yellow-600">
                    未入力: {inputSummary.notSubmitted}名
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {studentsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {selectedGrade}の担当生徒がいません
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredStudents.map((student) => {
                    const input = inputs.get(student.id) || {
                      status: "not_submitted" as AssessmentStatus,
                      score: "",
                    }
                    const isAbsent = input.status === "absent"
                    const avatarSrc =
                      student.custom_avatar_url ||
                      getAvatarById(student.avatar_id || "")?.src ||
                      ""

                    return (
                      <div
                        key={student.id}
                        className={`flex items-center gap-4 p-3 rounded-lg border ${
                          isAbsent
                            ? "bg-gray-50 border-gray-200"
                            : input.status === "completed"
                              ? "bg-green-50 border-green-200"
                              : "bg-white"
                        }`}
                      >
                        {/* アバター & 名前 */}
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={avatarSrc} alt={student.full_name} />
                            <AvatarFallback>
                              {student.full_name.slice(0, 1)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-medium truncate">
                              {student.nickname || student.full_name}
                            </p>
                            {student.nickname && (
                              <p className="text-xs text-muted-foreground truncate">
                                {student.full_name}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* 得点入力 */}
                        <div className="flex items-center gap-2">
                          <Input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={input.score}
                            onChange={(e) =>
                              handleScoreChange(student.id, e.target.value)
                            }
                            disabled={isAbsent}
                            placeholder="得点"
                            className={`w-20 text-center ${
                              isAbsent ? "bg-gray-100" : ""
                            }`}
                          />
                          <span className="text-sm text-muted-foreground">
                            /{selectedMaster?.max_score}
                          </span>
                        </div>

                        {/* 欠席チェック */}
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id={`absent-${student.id}`}
                            checked={isAbsent}
                            onCheckedChange={(checked) =>
                              toggleAbsent(student.id, checked as boolean)
                            }
                          />
                          <Label
                            htmlFor={`absent-${student.id}`}
                            className="text-sm text-muted-foreground cursor-pointer"
                          >
                            欠席
                          </Label>
                        </div>

                        {/* ステータスアイコン */}
                        <div className="w-6">
                          {input.status === "completed" && (
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* 送信結果メッセージ */}
              {submitResult && (
                <div
                  className={`mt-4 p-3 rounded-lg flex items-center gap-2 ${
                    submitResult.success
                      ? "bg-green-50 text-green-700"
                      : "bg-red-50 text-red-700"
                  }`}
                >
                  {submitResult.success ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <AlertCircle className="h-5 w-5" />
                  )}
                  {submitResult.message}
                </div>
              )}

              {/* 送信ボタン */}
              {filteredStudents.length > 0 && (
                <div className="mt-6 flex justify-end">
                  <Button
                    onClick={handleSubmit}
                    disabled={
                      isSubmitting ||
                      inputSummary.completed + inputSummary.absent === 0
                    }
                    className="min-w-32"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        保存中...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        保存する
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>

      <CoachBottomNavigation />
    </div>
  )
}
