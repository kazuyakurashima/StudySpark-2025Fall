"use client"

import { useState, useMemo } from "react"
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
  Layers,
  Users,
  ChevronRight,
  CheckCircle2,
} from "lucide-react"
import Link from "next/link"
import { CoachBottomNavigation } from "@/components/coach-bottom-navigation"
import { UserProfileHeader } from "@/components/common/user-profile-header"
import { getAvatarById } from "@/lib/constants/avatars"
import { sendEncouragementToStudent } from "@/app/actions/coach"
import type { LearningRecordWithEncouragements, InactiveStudentData } from "@/app/actions/coach"
import { PastExamSummaryList } from "./past-exam-summary-list"
import { useCoachDashboard, type CoachDashboardData } from "@/lib/hooks/use-coach-dashboard"

/**
 * バッチグループ化されたエントリ型
 */
type GroupedRecordEntry = {
  type: "batch"
  batchId: string
  records: LearningRecordWithEncouragements[]
  subjects: string[]
  latestTimestamp: string
  totalQuestions: number
  totalCorrect: number
  representativeRecord: LearningRecordWithEncouragements
} | {
  type: "single"
  record: LearningRecordWithEncouragements
}

/**
 * レコードをbatchIdでグループ化
 */
function groupRecordsByBatch(records: LearningRecordWithEncouragements[]): GroupedRecordEntry[] {
  const batchGroups = new Map<string, LearningRecordWithEncouragements[]>()
  const standaloneRecords: LearningRecordWithEncouragements[] = []

  records.forEach((record) => {
    if (record.batchId) {
      const group = batchGroups.get(record.batchId) || []
      group.push(record)
      batchGroups.set(record.batchId, group)
    } else {
      standaloneRecords.push(record)
    }
  })

  const entries: GroupedRecordEntry[] = []

  // バッチグループをエントリに変換
  batchGroups.forEach((groupRecords, batchId) => {
    // 最新のタイムスタンプを持つレコードを代表とする
    const sortedRecords = [...groupRecords].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
    const representativeRecord = sortedRecords[0]
    const subjects = Array.from(new Set(groupRecords.map((r) => r.subject)))
    const totalQuestions = groupRecords.reduce((sum, r) => sum + r.totalQuestions, 0)
    const totalCorrect = groupRecords.reduce((sum, r) => sum + r.correctCount, 0)

    entries.push({
      type: "batch",
      batchId,
      records: groupRecords,
      subjects,
      latestTimestamp: representativeRecord.timestamp,
      totalQuestions,
      totalCorrect,
      representativeRecord,
    })
  })

  // 単独レコードをエントリに変換
  standaloneRecords.forEach((record) => {
    entries.push({
      type: "single",
      record,
    })
  })

  // タイムスタンプで降順ソート
  return entries.sort((a, b) => {
    const aTime = a.type === "batch" ? new Date(a.latestTimestamp).getTime() : new Date(a.record.timestamp).getTime()
    const bTime = b.type === "batch" ? new Date(b.latestTimestamp).getTime() : new Date(b.record.timestamp).getTime()
    return bTime - aTime
  })
}

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
  const [selectedEntry, setSelectedEntry] = useState<GroupedRecordEntry | null>(null)
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

  const generateAISuggestions = (entry: GroupedRecordEntry) => {
    const record = entry.type === "batch" ? entry.representativeRecord : entry.record
    const nickname = record.studentNickname || record.studentName
    const subjects = entry.type === "batch" ? entry.subjects.join("・") : record.subject
    setAiSuggestions([
      `${nickname}さん、${subjects}の学習お疲れさまでした！とても良い取り組みですね。`,
      `${record.content.substring(0, 20)}...という振り返り、素晴らしいです。この調子で頑張りましょう！`,
      `${subjects}の理解が深まっていますね。次のステップも一緒に頑張りましょう！`,
    ])
  }

  const handleSendEncouragement = async (
    entry: GroupedRecordEntry,
    content: string,
  ) => {
    // 代表レコードを取得（応援メッセージの紐付け先）
    const record = entry.type === "batch" ? entry.representativeRecord : entry.record
    const result = await sendEncouragementToStudent(record.studentId, record.id, content)
    if (result.error) {
      alert(`エラー: ${result.error}`)
    } else {
      const nickname = record.studentNickname || record.studentName
      alert(`${nickname}さんに応援メッセージを送信しました！`)
      // SWRデータを再取得
      mutate()
    }
    setSelectedEntry(null)
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

  // レコードをフィルタリングしてからバッチグループ化
  const groupedEntries = useMemo(() => {
    // まず個別レコードをフィルタリング
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

    // フィルタリング後にバッチグループ化
    return groupRecordsByBatch(filteredRecords)
  }, [records, gradeFilter, subjectFilter, encouragementFilter])

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

        {/* Quick Access Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 要対応リスト */}
          <Card className={`hover:shadow-md transition-shadow ${
            filteredInactiveStudents.length > 0 ? "border-l-4 border-l-red-500" : "border-l-4 border-l-green-500"
          }`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {filteredInactiveStudents.length > 0 ? (
                    <div className="p-2 rounded-full bg-red-100">
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                    </div>
                  ) : (
                    <div className="p-2 rounded-full bg-green-100">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    </div>
                  )}
                  <div>
                    <h3 className="font-semibold">要対応</h3>
                    {filteredInactiveStudents.length > 0 ? (
                      <p className="text-sm text-muted-foreground">
                        {filteredInactiveStudents.length}名の生徒が{inactiveThreshold}日以上未入力
                      </p>
                    ) : (
                      <p className="text-sm text-green-600">全員順調です</p>
                    )}
                  </div>
                </div>
                {filteredInactiveStudents.length > 0 && (
                  <Badge className="bg-red-500 text-white">
                    {filteredInactiveStudents.length}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 生徒一覧へのリンク */}
          <Link href="/coach/students">
            <Card className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-primary h-full">
              <CardContent className="p-4 h-full">
                <div className="flex items-center justify-between h-full">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-primary/10">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">生徒一覧</h3>
                      <p className="text-sm text-muted-foreground">
                        全生徒の詳細情報を確認
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

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
              {groupedEntries.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <p className="text-muted-foreground">学習記録がありません</p>
                  </CardContent>
                </Card>
              ) : (
                groupedEntries.map((entry) => {
                  // エントリから情報を抽出
                  const isBatch = entry.type === "batch"
                  const representativeRecord = isBatch ? entry.representativeRecord : entry.record
                  const entryKey = isBatch ? `batch-${entry.batchId}` : `single-${entry.record.id}`
                  const subjects = isBatch ? entry.subjects.join(" · ") : representativeRecord.subject
                  const totalQuestions = isBatch ? entry.totalQuestions : representativeRecord.totalQuestions
                  const totalCorrect = isBatch ? entry.totalCorrect : representativeRecord.correctCount
                  const timestamp = isBatch ? entry.latestTimestamp : representativeRecord.timestamp
                  const accuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0

                  // 応援メッセージを集約
                  const allRecords = isBatch ? entry.records : [entry.record]
                  const allParentEncouragements = allRecords.flatMap((r) => r.parentEncouragements)
                  const allCoachEncouragements = allRecords.flatMap((r) => r.coachEncouragements)

                  // 選択中のエントリかどうか
                  const isSelectedEntry = selectedEntry && (
                    (isBatch && selectedEntry.type === "batch" && selectedEntry.batchId === entry.batchId) ||
                    (!isBatch && selectedEntry.type === "single" && selectedEntry.record.id === entry.record.id)
                  )

                  return (
                    <Card
                      key={entryKey}
                      className="hover:shadow-md transition-shadow duration-200 border-l-4 border-l-primary"
                    >
                      <CardContent className="p-4 md:p-6">
                        <div className="space-y-4">
                          {/* Student Info */}
                          <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-12 w-12 border-2 border-border">
                                <AvatarImage
                                  src={getAvatarSrc(representativeRecord.studentAvatar, representativeRecord.studentCustomAvatarUrl)}
                                  alt={representativeRecord.studentName}
                                />
                                <AvatarFallback>{representativeRecord.studentName.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-semibold text-base md:text-lg">{representativeRecord.studentName}</div>
                                {representativeRecord.studentNickname && (
                                  <div className="text-sm text-muted-foreground">ニックネーム: {representativeRecord.studentNickname}</div>
                                )}
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                  <Badge variant="secondary">{representativeRecord.grade}</Badge>
                                  {isBatch ? (
                                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                                      <Layers className="h-3 w-3 mr-1" />
                                      {entry.subjects.length}科目
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline">{subjects}</Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="text-sm text-muted-foreground flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {formatTimestamp(timestamp)}
                            </div>
                          </div>

                          {/* バッチの場合は科目別内訳を表示 */}
                          {isBatch && (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              {entry.records.map((rec) => {
                                const recAccuracy = rec.totalQuestions > 0 ? Math.round((rec.correctCount / rec.totalQuestions) * 100) : 0
                                return (
                                  <div key={rec.id} className="text-xs p-2 bg-muted/50 rounded border">
                                    <div className="font-medium">{rec.subject}</div>
                                    <div className="text-muted-foreground">{recAccuracy}% ({rec.correctCount}/{rec.totalQuestions})</div>
                                  </div>
                                )
                              })}
                            </div>
                          )}

                          {/* Learning Content (代表レコードの振り返り) */}
                          <div className="bg-muted rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-sm font-medium">{subjects}</span>
                              <span className="text-sm text-primary font-semibold">{accuracy}%</span>
                              <span className="text-xs text-muted-foreground">({totalCorrect}/{totalQuestions}問)</span>
                            </div>
                            <p className="text-sm leading-relaxed">
                              {representativeRecord.content || `${subjects}を学習しました`}
                            </p>
                          </div>

                          {/* Encouragements */}
                          <div className="space-y-3">
                            {/* Parent Encouragements */}
                            {allParentEncouragements.length > 0 && (
                              <div className="space-y-2">
                                <div className="text-sm font-medium text-muted-foreground">保護者の応援</div>
                                {allParentEncouragements.map((enc) => (
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
                            {allCoachEncouragements.length > 0 && (
                              <div className="space-y-2">
                                <div className="text-sm font-medium text-muted-foreground">指導者の応援</div>
                                {allCoachEncouragements.map((enc) => (
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
                          {isSelectedEntry ? (
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
                                    generateAISuggestions(entry)
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
                                      onClick={() => handleSendEncouragement(entry, stamp)}
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
                                        onClick={() => handleSendEncouragement(entry, suggestion)}
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
                                        onClick={() => handleSendEncouragement(entry, editingMessage)}
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
                                    onClick={() => handleSendEncouragement(entry, customMessage)}
                                    className="w-full"
                                    disabled={!customMessage.trim()}
                                  >
                                    <Send className="h-4 w-4 mr-2" />
                                    送信
                                  </Button>
                                </div>
                              )}

                              <Button variant="ghost" size="sm" onClick={() => setSelectedEntry(null)}>
                                キャンセル
                              </Button>
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              <Button onClick={() => setSelectedEntry(entry)} className="flex-1 sm:flex-none">
                                <Heart className="h-4 w-4 mr-2" />
                                応援する
                              </Button>
                              <Button variant="outline" onClick={() => toggleRecordExpansion(entryKey)}>
                                {expandedRecords.has(entryKey) ? (
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
                          {expandedRecords.has(entryKey) && (
                            <div className="border-t pt-4 space-y-2">
                              <div className="text-sm font-medium">学習詳細</div>
                              {isBatch ? (
                                <div className="space-y-3">
                                  {entry.records.map((rec) => (
                                    <div key={rec.id} className="p-3 bg-muted/30 rounded space-y-1">
                                      <div className="flex items-center justify-between">
                                        <span className="font-medium text-sm">{rec.subject}</span>
                                        <span className="text-sm text-primary">
                                          {rec.totalQuestions > 0 ? Math.round((rec.correctCount / rec.totalQuestions) * 100) : 0}%
                                          ({rec.correctCount}/{rec.totalQuestions}問)
                                        </span>
                                      </div>
                                      {rec.content && <p className="text-xs text-muted-foreground">{rec.content}</p>}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-sm text-muted-foreground">
                                  正答率: {accuracy}% ({totalCorrect}/{totalQuestions}問)
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })
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
