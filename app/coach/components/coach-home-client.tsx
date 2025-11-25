"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import {
  Heart,
  Send,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  MessageSquare,
  Sparkles,
  Clock,
  Calendar,
  Target,
  RefreshCw,
  Loader2,
} from "lucide-react"
import { CoachBottomNavigation } from "@/components/coach-bottom-navigation"
import { UserProfileHeader } from "@/components/common/user-profile-header"
import { getAvatarById } from "@/lib/constants/avatars"
import { sendEncouragementToStudent } from "@/app/actions/coach"
import type { LearningRecordWithEncouragements, InactiveStudentData } from "@/app/actions/coach"
import { PastExamSummaryList } from "./past-exam-summary-list"
import { useCoachDashboard, type CoachDashboardData } from "@/lib/hooks/use-coach-dashboard"

interface CoachHomeClientProps {
  initialRecords: LearningRecordWithEncouragements[]
  initialInactiveStudents: InactiveStudentData[]
}

/**
 * SSR初期データをSWR形式に変換
 */
function transformSSRtoSWRData(
  initialRecords: LearningRecordWithEncouragements[],
  initialInactiveStudents: InactiveStudentData[]
): Partial<CoachDashboardData> {
  return {
    records: { records: initialRecords },
    inactiveStudents: { students: initialInactiveStudents },
    fetchedAt: Date.now(),
  }
}

const stamps = ["👍", "🎉", "💪", "✨", "🌟", "❤️", "😊", "🔥"]

export function CoachHomeClient({ initialRecords, initialInactiveStudents }: CoachHomeClientProps) {
  // SWRでデータを管理（SSRデータをfallbackとして使用）
  const { records, inactiveStudents, isValidating, mutate } = useCoachDashboard(
    transformSSRtoSWRData(initialRecords, initialInactiveStudents)
  )
  const [gradeFilter, setGradeFilter] = useState("all")
  const [subjectFilter, setSubjectFilter] = useState("all")
  const [encouragementFilter, setEncouragementFilter] = useState("all")
  const [inactiveThreshold, setInactiveThreshold] = useState("7")
  const [selectedRecord, setSelectedRecord] = useState<LearningRecordWithEncouragements | null>(null)
  const [encouragementType, setEncouragementType] = useState<"stamp" | "ai" | "custom">("stamp")
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([])
  const [customMessage, setCustomMessage] = useState("")
  const [editingMessage, setEditingMessage] = useState("")
  const [expandedRecords, setExpandedRecords] = useState<Set<string>>(new Set())
  const [noteInput, setNoteInput] = useState<{ [key: string]: string }>({})
  const [handledStudents, setHandledStudents] = useState<Set<string>>(new Set())

  const getAvatarSrc = (avatarId: string | null, customAvatarUrl?: string | null) => {
    // カスタムアバターURLを優先
    if (customAvatarUrl) return customAvatarUrl
    if (!avatarId) return "/placeholder.svg"
    const avatar = getAvatarById(avatarId)
    return avatar?.src || "/placeholder.svg"
  }

  const generateAISuggestions = (record: LearningRecordWithEncouragements) => {
    const nickname = record.studentNickname || record.studentName
    setAiSuggestions([
      `${nickname}さん、${record.subject}の学習お疲れさまでした！とても良い取り組みですね。`,
      `${record.content.substring(0, 20)}...という振り返り、素晴らしいです。この調子で頑張りましょう！`,
      `${record.subject}の理解が深まっていますね。次のステップも一緒に頑張りましょう！`,
    ])
  }

  const handleSendEncouragement = async (
    record: LearningRecordWithEncouragements,
    content: string,
  ) => {
    const result = await sendEncouragementToStudent(record.studentId, record.id, content)
    if (result.error) {
      alert(`エラー: ${result.error}`)
    } else {
      const nickname = record.studentNickname || record.studentName
      alert(`${nickname}さんに応援メッセージを送信しました！`)
      // SWRデータを再取得
      mutate()
    }
    setSelectedRecord(null)
    setCustomMessage("")
    setEditingMessage("")
    setAiSuggestions([])
  }

  const toggleRecordExpansion = (recordId: string) => {
    setExpandedRecords((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(recordId)) {
        newSet.delete(recordId)
      } else {
        newSet.add(recordId)
      }
      return newSet
    })
  }

  const handleToggleHandled = (studentId: string) => {
    setHandledStudents((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(studentId)) {
        newSet.delete(studentId)
      } else {
        newSet.add(studentId)
      }
      return newSet
    })
  }

  const handleSaveNote = (studentId: string) => {
    const note = noteInput[studentId]
    if (!note || note.trim().length === 0) return
    // Note saving functionality would be implemented here
    setNoteInput({ ...noteInput, [studentId]: "" })
    alert("メモを保存しました！")
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffHours < 1) return "1時間以内"
    if (diffHours < 24) return `${diffHours}時間前`
    if (diffDays < 7) return `${diffDays}日前`
    return date.toLocaleDateString()
  }

  const filteredRecords = records.filter((record) => {
    if (gradeFilter !== "all" && record.grade !== gradeFilter) return false
    if (subjectFilter !== "all" && record.subject !== subjectFilter) return false
    if (encouragementFilter === "coach" && record.coachEncouragements.length === 0) return true
    if (encouragementFilter === "parent" && record.parentEncouragements.length === 0) return true
    if (
      encouragementFilter === "none" &&
      record.coachEncouragements.length === 0 &&
      record.parentEncouragements.length === 0
    )
      return true
    if (
      encouragementFilter !== "all" &&
      encouragementFilter !== "coach" &&
      encouragementFilter !== "parent" &&
      encouragementFilter !== "none"
    )
      return false
    return true
  })

  const filteredInactiveStudents = inactiveStudents.filter((student) => {
    const threshold = Number.parseInt(inactiveThreshold)
    return student.daysInactive >= threshold
  })

  return (
    <div className="min-h-screen bg-background pb-20">
      <UserProfileHeader />
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        {/* Header */}
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold mb-2">ホーム</h1>
                <p className="text-muted-foreground">学習記録への応援と未入力生徒の管理</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => mutate()}
                disabled={isValidating}
                className="flex items-center gap-2"
              >
                {isValidating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">更新</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="encouragement" className="space-y-6">
          <TabsList className="bg-muted w-full md:w-auto grid grid-cols-3">
            <TabsTrigger
              value="encouragement"
              className="data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              学習記録への応援
            </TabsTrigger>
            <TabsTrigger
              value="inactive"
              className="data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              未入力生徒一覧
              {filteredInactiveStudents.length > 0 && (
                <Badge className="ml-2 bg-destructive text-destructive-foreground">
                  {filteredInactiveStudents.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="pastexam"
              className="data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <Target className="h-4 w-4 mr-1" />
              過去問演習
            </TabsTrigger>
          </TabsList>

          {/* Learning Records Encouragement Tab */}
          <TabsContent value="encouragement" className="space-y-4">
            {/* Filters */}
            <Card>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">学年</label>
                    <Select value={gradeFilter} onValueChange={setGradeFilter}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="学年" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">すべて</SelectItem>
                        <SelectItem value="小学5年">小学5年</SelectItem>
                        <SelectItem value="小学6年">小学6年</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">科目</label>
                    <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="科目" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">すべて</SelectItem>
                        <SelectItem value="算数">算数</SelectItem>
                        <SelectItem value="国語">国語</SelectItem>
                        <SelectItem value="理科">理科</SelectItem>
                        <SelectItem value="社会">社会</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">応援状態</label>
                    <Select value={encouragementFilter} onValueChange={setEncouragementFilter}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="応援" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">すべて</SelectItem>
                        <SelectItem value="coach">指導者応援済み</SelectItem>
                        <SelectItem value="parent">保護者応援済み</SelectItem>
                        <SelectItem value="none">応援なし</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">日付</label>
                    <Select defaultValue="desc">
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="desc">新しい順</SelectItem>
                        <SelectItem value="asc">古い順</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Learning Records List */}
            <div className="space-y-4">
              {filteredRecords.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <p className="text-muted-foreground">学習記録がありません</p>
                  </CardContent>
                </Card>
              ) : (
                filteredRecords.map((record) => (
                  <Card
                    key={record.id}
                    className="hover:shadow-md transition-shadow duration-200 border-l-4 border-l-primary"
                  >
                    <CardContent className="p-4 md:p-6">
                      <div className="space-y-4">
                        {/* Student Info */}
                        <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-12 w-12 border-2 border-border">
                              <AvatarImage
                                src={getAvatarSrc(record.studentAvatar, record.studentCustomAvatarUrl)}
                                alt={record.studentName}
                              />
                              <AvatarFallback>{record.studentName.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-semibold text-base md:text-lg">{record.studentName}</div>
                              {record.studentNickname && (
                                <div className="text-sm text-muted-foreground">ニックネーム: {record.studentNickname}</div>
                              )}
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <Badge variant="secondary">{record.grade}</Badge>
                                <Badge variant="outline">{record.subject}</Badge>
                              </div>
                            </div>
                          </div>
                          <div className="text-sm text-muted-foreground flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {formatTimestamp(record.timestamp)}
                          </div>
                        </div>

                        {/* Learning Content */}
                        <div className="bg-muted rounded-lg p-4">
                          <p className="text-sm leading-relaxed">
                            {record.content || `${record.subject}を学習しました（正答: ${record.correctCount}/${record.totalQuestions}）`}
                          </p>
                        </div>

                        {/* Encouragements */}
                        <div className="space-y-3">
                          {/* Parent Encouragements */}
                          {record.parentEncouragements.length > 0 && (
                            <div className="space-y-2">
                              <div className="text-sm font-medium text-muted-foreground">保護者の応援</div>
                              {record.parentEncouragements.map((enc) => (
                                <div
                                  key={enc.id}
                                  className="flex items-start gap-2 bg-green-50 dark:bg-green-950 rounded-lg p-3"
                                >
                                  <Avatar className="h-8 w-8">
                                    <AvatarFallback>{enc.senderName.charAt(0)}</AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium">{enc.senderName}</div>
                                    <div className="text-sm break-words">{enc.message}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Coach Encouragements */}
                          {record.coachEncouragements.length > 0 && (
                            <div className="space-y-2">
                              <div className="text-sm font-medium text-muted-foreground">指導者の応援</div>
                              {record.coachEncouragements.map((enc) => (
                                <div
                                  key={enc.id}
                                  className="flex items-start gap-2 bg-blue-50 dark:bg-blue-950 rounded-lg p-3"
                                >
                                  <Avatar className="h-8 w-8">
                                    <AvatarFallback>{enc.senderName.charAt(0)}</AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium">{enc.senderName}</div>
                                    <div className="text-sm break-words">{enc.message}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Encouragement Actions */}
                        {selectedRecord?.id === record.id ? (
                          <div className="space-y-4 border-t pt-4">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <Button
                                variant={encouragementType === "stamp" ? "default" : "outline"}
                                size="lg"
                                onClick={() => setEncouragementType("stamp")}
                                className="flex items-center justify-center gap-2 h-14 bg-gradient-to-r from-orange-400 to-orange-500 hover:from-orange-500 hover:to-orange-600 text-white border-0"
                              >
                                <Heart className="h-5 w-5" />
                                <span className="font-medium">スタンプ</span>
                              </Button>
                              <Button
                                variant={encouragementType === "ai" ? "default" : "outline"}
                                size="lg"
                                onClick={() => {
                                  setEncouragementType("ai")
                                  generateAISuggestions(record)
                                }}
                                className="flex items-center justify-center gap-2 h-14 bg-gradient-to-r from-pink-400 to-pink-500 hover:from-pink-500 hover:to-pink-600 text-white border-0"
                              >
                                <Sparkles className="h-5 w-5" />
                                <span className="font-medium">AI提案</span>
                              </Button>
                              <Button
                                variant={encouragementType === "custom" ? "default" : "outline"}
                                size="lg"
                                onClick={() => setEncouragementType("custom")}
                                className="flex items-center justify-center gap-2 h-14 bg-gradient-to-r from-blue-400 to-blue-500 hover:from-blue-500 hover:to-blue-600 text-white border-0"
                              >
                                <Send className="h-5 w-5" />
                                <span className="font-medium">個別作成</span>
                              </Button>
                            </div>

                            {encouragementType === "stamp" && (
                              <div className="flex flex-wrap gap-2">
                                {stamps.map((stamp) => (
                                  <Button
                                    key={stamp}
                                    variant="outline"
                                    size="lg"
                                    onClick={() => handleSendEncouragement(record, stamp)}
                                    className="text-2xl hover:scale-110 transition-transform"
                                  >
                                    {stamp}
                                  </Button>
                                ))}
                              </div>
                            )}

                            {encouragementType === "ai" && aiSuggestions.length > 0 && (
                              <div className="space-y-2">
                                {aiSuggestions.map((suggestion, index) => (
                                  <div key={index} className="flex flex-col sm:flex-row items-start gap-2">
                                    <Button
                                      variant="outline"
                                      className="flex-1 text-left h-auto py-3 hover:bg-accent w-full bg-transparent"
                                      onClick={() => setEditingMessage(suggestion)}
                                    >
                                      {suggestion}
                                    </Button>
                                    <Button
                                      size="sm"
                                      onClick={() => handleSendEncouragement(record, suggestion)}
                                      className="w-full sm:w-auto"
                                    >
                                      <Send className="h-4 w-4 sm:mr-0 mr-2" />
                                      <span className="sm:hidden">送信</span>
                                    </Button>
                                  </div>
                                ))}
                                {editingMessage && (
                                  <div className="space-y-2">
                                    <Textarea
                                      value={editingMessage}
                                      onChange={(e) => setEditingMessage(e.target.value)}
                                      className="min-h-[100px]"
                                      placeholder="メッセージを編集..."
                                    />
                                    <Button
                                      onClick={() => handleSendEncouragement(record, editingMessage)}
                                      className="w-full"
                                    >
                                      <Send className="h-4 w-4 mr-2" />
                                      送信
                                    </Button>
                                  </div>
                                )}
                              </div>
                            )}

                            {encouragementType === "custom" && (
                              <div className="space-y-2">
                                <Textarea
                                  value={customMessage}
                                  onChange={(e) => setCustomMessage(e.target.value)}
                                  className="min-h-[100px]"
                                  placeholder="応援メッセージを入力..."
                                />
                                <Button
                                  onClick={() => handleSendEncouragement(record, customMessage)}
                                  className="w-full"
                                  disabled={!customMessage.trim()}
                                >
                                  <Send className="h-4 w-4 mr-2" />
                                  送信
                                </Button>
                              </div>
                            )}

                            <Button variant="ghost" size="sm" onClick={() => setSelectedRecord(null)}>
                              キャンセル
                            </Button>
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            <Button onClick={() => setSelectedRecord(record)} className="flex-1 sm:flex-none">
                              <Heart className="h-4 w-4 mr-2" />
                              応援する
                            </Button>
                            <Button variant="outline" onClick={() => toggleRecordExpansion(record.id)}>
                              {expandedRecords.has(record.id) ? (
                                <>
                                  <ChevronUp className="h-4 w-4 mr-2" />
                                  閉じる
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="h-4 w-4 mr-2" />
                                  詳細
                                </>
                              )}
                            </Button>
                          </div>
                        )}

                        {/* Expanded Details */}
                        {expandedRecords.has(record.id) && (
                          <div className="border-t pt-4 space-y-2">
                            <div className="text-sm font-medium">学習詳細</div>
                            <div className="text-sm text-muted-foreground">
                              正答率: {record.totalQuestions > 0 ? Math.round((record.correctCount / record.totalQuestions) * 100) : 0}%
                              ({record.correctCount}/{record.totalQuestions}問)
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* Inactive Students Tab */}
          <TabsContent value="inactive" className="space-y-4">
            {/* Threshold Filter */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <span className="text-sm font-medium">未入力日数のしきい値:</span>
                  <Select value={inactiveThreshold} onValueChange={setInactiveThreshold}>
                    <SelectTrigger className="w-full sm:w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7日以上</SelectItem>
                      <SelectItem value="5">5日以上</SelectItem>
                      <SelectItem value="3">3日以上</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Inactive Students List */}
            <div className="space-y-4">
              {filteredInactiveStudents.map((student) => {
                const isHandled = handledStudents.has(student.id)
                return (
                  <Card
                    key={student.id}
                    className={`hover:shadow-md transition-shadow duration-200 border-l-4 ${
                      student.daysInactive >= 7
                        ? "border-l-destructive bg-destructive/5"
                        : student.daysInactive >= 5
                          ? "border-l-orange-500 bg-orange-50 dark:bg-orange-950/20"
                          : "border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950/20"
                    } ${isHandled ? "opacity-60" : ""}`}
                  >
                    <CardContent className="p-4 md:p-6">
                      <div className="space-y-4">
                        {/* Student Info */}
                        <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-12 w-12 border-2 border-border">
                              <AvatarImage src={getAvatarSrc(student.avatar, student.customAvatarUrl)} alt={student.name} />
                              <AvatarFallback>{student.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-semibold text-base md:text-lg">{student.name}</div>
                              {student.nickname && (
                                <div className="text-sm text-muted-foreground">ニックネーム: {student.nickname}</div>
                              )}
                              <Badge variant="secondary" className="mt-1">
                                {student.grade}
                              </Badge>
                            </div>
                          </div>
                          <div className="text-right w-full sm:w-auto">
                            <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
                              <Calendar className="h-4 w-4" />
                              最終入力: {student.lastInputDate ? new Date(student.lastInputDate).toLocaleDateString() : "記録なし"}
                            </div>
                            <Badge
                              className={`${
                                student.daysInactive >= 7
                                  ? "bg-destructive text-destructive-foreground"
                                  : student.daysInactive >= 5
                                    ? "bg-orange-500 text-white"
                                    : "bg-yellow-500 text-white"
                              }`}
                            >
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              {student.daysInactive === Infinity ? "未入力" : `${student.daysInactive}日未入力`}
                            </Badge>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant={isHandled ? "outline" : "default"}
                            onClick={() => handleToggleHandled(student.id)}
                            className={`flex-1 sm:flex-none ${isHandled ? "bg-muted" : ""}`}
                          >
                            {isHandled ? "対応済み解除" : "対応済みにする"}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              const currentNote = noteInput[student.id] || ""
                              if (!currentNote) {
                                setNoteInput({ ...noteInput, [student.id]: "" })
                              }
                            }}
                            className="flex-1 sm:flex-none"
                          >
                            <MessageSquare className="h-4 w-4 mr-2" />
                            対応メモ
                          </Button>
                        </div>

                        {/* Note Input */}
                        {noteInput[student.id] !== undefined && (
                          <div className="space-y-2 border-t pt-4">
                            <Textarea
                              value={noteInput[student.id]}
                              onChange={(e) => setNoteInput({ ...noteInput, [student.id]: e.target.value })}
                              placeholder="対応メモを入力（最大300字）"
                              maxLength={300}
                              className="min-h-[100px]"
                            />
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">
                                {noteInput[student.id]?.length || 0}/300
                              </span>
                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    const newNoteInput = { ...noteInput }
                                    delete newNoteInput[student.id]
                                    setNoteInput(newNoteInput)
                                  }}
                                >
                                  キャンセル
                                </Button>
                                <Button size="sm" onClick={() => handleSaveNote(student.id)}>
                                  保存
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}

              {filteredInactiveStudents.length === 0 && (
                <Card>
                  <CardContent className="p-8 text-center">
                    <p className="text-muted-foreground">{inactiveThreshold}日以上未入力の生徒はいません</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Past Exam Summary Tab */}
          <TabsContent value="pastexam" className="space-y-4">
            <PastExamSummaryList />
          </TabsContent>
        </Tabs>
      </div>

      <CoachBottomNavigation />
    </div>
  )
}
