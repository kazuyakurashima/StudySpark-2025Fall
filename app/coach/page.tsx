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
  Edit3,
  Clock,
  Calendar,
} from "lucide-react"
import { CoachTopNavigation } from "@/components/coach-top-navigation"
import { CoachBottomNavigation } from "@/components/coach-bottom-navigation"

interface LearningRecord {
  id: string
  studentId: string
  studentName: string
  studentNickname: string
  studentAvatar: string
  grade: string
  subject: string
  content: string
  timestamp: Date
  parentEncouragements: Encouragement[]
  coachEncouragements: Encouragement[]
}

interface Encouragement {
  id: string
  type: "stamp" | "ai-message" | "custom-message"
  content: string
  sender: string
  senderAvatar: string
  timestamp: Date
}

interface InactiveStudent {
  id: string
  name: string
  nickname: string
  avatar: string
  grade: string
  lastInputDate: Date
  daysInactive: number
  isHandled: boolean
  notes: Note[]
}

interface Note {
  id: string
  content: string
  author: string
  authorAvatar: string
  timestamp: Date
}

// Mock data
const learningRecords: LearningRecord[] = [
  {
    id: "record1",
    studentId: "student1",
    studentName: "田中太郎",
    studentNickname: "たんじろう",
    studentAvatar: "student1",
    grade: "小学5年",
    subject: "算数",
    content: "分数の計算を学習しました。約分が少し難しかったですが、練習問題を解いて理解できました。",
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    parentEncouragements: [
      {
        id: "p1",
        type: "ai-message",
        content: "よく頑張ったね！約分は難しいけど、練習を続ければ必ずできるようになるよ。",
        sender: "田中母",
        senderAvatar: "parent1",
        timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000),
      },
    ],
    coachEncouragements: [],
  },
  {
    id: "record2",
    studentId: "student2",
    studentName: "佐藤花子",
    studentNickname: "はなちゃん",
    studentAvatar: "student2",
    grade: "小学6年",
    subject: "国語",
    content: "漢字の読み方を復習しました。熟語の意味も調べて、理解が深まりました。",
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
    parentEncouragements: [],
    coachEncouragements: [],
  },
  {
    id: "record3",
    studentId: "student3",
    studentName: "鈴木次郎",
    studentNickname: "じろう",
    studentAvatar: "student3",
    grade: "小学5年",
    subject: "理科",
    content: "植物の光合成について学習しました。実験の結果が面白かったです。",
    timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000),
    parentEncouragements: [
      {
        id: "p2",
        type: "stamp",
        content: "👍",
        sender: "鈴木父",
        senderAvatar: "parent2",
        timestamp: new Date(Date.now() - 7 * 60 * 60 * 1000),
      },
    ],
    coachEncouragements: [],
  },
]

const inactiveStudents: InactiveStudent[] = [
  {
    id: "student4",
    name: "高橋美咲",
    nickname: "みさき",
    avatar: "student4",
    grade: "小学6年",
    lastInputDate: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
    daysInactive: 8,
    isHandled: false,
    notes: [],
  },
  {
    id: "student5",
    name: "伊藤健太",
    nickname: "けんた",
    avatar: "student5",
    grade: "小学5年",
    lastInputDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    daysInactive: 5,
    isHandled: false,
    notes: [],
  },
]

const stamps = ["👍", "🎉", "💪", "✨", "🌟", "❤️", "😊", "🔥"]

export default function CoachHomePage() {
  const [gradeFilter, setGradeFilter] = useState("all")
  const [subjectFilter, setSubjectFilter] = useState("all")
  const [encouragementFilter, setEncouragementFilter] = useState("all")
  const [inactiveThreshold, setInactiveThreshold] = useState("7")
  const [selectedRecord, setSelectedRecord] = useState<LearningRecord | null>(null)
  const [encouragementType, setEncouragementType] = useState<"stamp" | "ai" | "custom">("stamp")
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([])
  const [customMessage, setCustomMessage] = useState("")
  const [editingMessage, setEditingMessage] = useState("")
  const [expandedRecords, setExpandedRecords] = useState<Set<string>>(new Set())
  const [noteInput, setNoteInput] = useState<{ [key: string]: string }>({})

  const getAvatarSrc = (avatarId: string) => {
    const avatarMap: { [key: string]: string } = {
      student1: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/student1-xZFJU5uXJO4DEfUbq1jbTMQUXReyM0.png",
      student2: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/student2-mZ9Q9oVm43IQoRyxSYytVFYgp3JS1V.png",
      student3: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/student3-teUpOKnopXNhE2vGFtvz9RWtC7O6kv.png",
      student4: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/student4-pKazGXekCT1H5kzHBqmfOrM1968hML.png",
    }
    return avatarMap[avatarId] || avatarMap["student1"]
  }

  const generateAISuggestions = (record: LearningRecord) => {
    setAiSuggestions([
      `${record.studentNickname}さん、${record.subject}の学習お疲れさまでした！とても良い取り組みですね。`,
      `${record.content.substring(0, 20)}...という振り返り、素晴らしいです。この調子で頑張りましょう！`,
      `${record.subject}の理解が深まっていますね。次のステップも一緒に頑張りましょう！`,
    ])
  }

  const handleSendEncouragement = (
    record: LearningRecord,
    content: string,
    type: "stamp" | "ai-message" | "custom-message",
  ) => {
    console.log("[v0] Sending encouragement:", { recordId: record.id, content, type })
    alert(`${record.studentNickname}さんに応援メッセージを送信しました！`)
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
    const student = inactiveStudents.find((s) => s.id === studentId)
    if (student) {
      student.isHandled = !student.isHandled
    }
  }

  const handleSaveNote = (studentId: string) => {
    const note = noteInput[studentId]
    if (!note || note.trim().length === 0) return

    const student = inactiveStudents.find((s) => s.id === studentId)
    if (student) {
      student.notes.push({
        id: `note-${Date.now()}`,
        content: note,
        author: "指導者名",
        authorAvatar: "coach1",
        timestamp: new Date(),
      })
      setNoteInput({ ...noteInput, [studentId]: "" })
      alert("メモを保存しました！")
    }
  }

  const filteredRecords = learningRecords.filter((record) => {
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 pb-20">
      <CoachTopNavigation />

      <div className="max-w-7xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white shadow-lg">
          <h1 className="text-2xl font-bold mb-2">ホーム</h1>
          <p className="text-blue-100">学習記録への応援と未入力生徒の管理</p>
        </div>

        <Tabs defaultValue="encouragement" className="space-y-6">
          <TabsList className="bg-white/80 backdrop-blur-sm shadow-md border border-border/50">
            <TabsTrigger
              value="encouragement"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white"
            >
              学習記録への応援
            </TabsTrigger>
            <TabsTrigger
              value="inactive"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white"
            >
              未入力生徒一覧
              {filteredInactiveStudents.length > 0 && (
                <Badge className="ml-2 bg-red-500 text-white">{filteredInactiveStudents.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Learning Records Encouragement Tab */}
          <TabsContent value="encouragement" className="space-y-4">
            {/* Filters */}
            <Card className="bg-white/80 backdrop-blur-sm shadow-md border-border/50">
              <CardContent className="p-4">
                <div className="flex flex-wrap gap-3">
                  <Select value={gradeFilter} onValueChange={setGradeFilter}>
                    <SelectTrigger className="w-40 bg-white shadow-sm">
                      <SelectValue placeholder="学年" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">すべて</SelectItem>
                      <SelectItem value="小学5年">小学5年</SelectItem>
                      <SelectItem value="小学6年">小学6年</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                    <SelectTrigger className="w-40 bg-white shadow-sm">
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

                  <Select value={encouragementFilter} onValueChange={setEncouragementFilter}>
                    <SelectTrigger className="w-40 bg-white shadow-sm">
                      <SelectValue placeholder="応援" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">すべて</SelectItem>
                      <SelectItem value="coach">指導者</SelectItem>
                      <SelectItem value="parent">保護者</SelectItem>
                      <SelectItem value="none">応援なし</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Learning Records List */}
            <div className="space-y-4">
              {filteredRecords.map((record) => (
                <Card
                  key={record.id}
                  className="bg-white shadow-md hover:shadow-lg transition-all duration-300 border-l-4 border-l-blue-500"
                >
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      {/* Student Info */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-12 w-12 border-2 border-white shadow-md">
                            <AvatarImage
                              src={getAvatarSrc(record.studentAvatar) || "/placeholder.svg"}
                              alt={record.studentName}
                            />
                            <AvatarFallback>{record.studentName.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-semibold text-lg">{record.studentName}</div>
                            <div className="text-sm text-muted-foreground">ニックネーム: {record.studentNickname}</div>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge className="bg-blue-100 text-blue-800">{record.grade}</Badge>
                              <Badge className="bg-purple-100 text-purple-800">{record.subject}</Badge>
                            </div>
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {Math.floor((Date.now() - record.timestamp.getTime()) / (1000 * 60 * 60))}時間前
                        </div>
                      </div>

                      {/* Learning Content */}
                      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4">
                        <p className="text-sm leading-relaxed">{record.content}</p>
                      </div>

                      {/* Encouragements */}
                      <div className="space-y-3">
                        {/* Parent Encouragements */}
                        {record.parentEncouragements.length > 0 && (
                          <div className="space-y-2">
                            <div className="text-sm font-medium text-muted-foreground">保護者の応援</div>
                            {record.parentEncouragements.map((enc) => (
                              <div key={enc.id} className="flex items-start gap-2 bg-green-50 rounded-lg p-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback>{enc.sender.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                  <div className="text-sm font-medium">{enc.sender}</div>
                                  <div className="text-sm">{enc.content}</div>
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
                              <div key={enc.id} className="flex items-start gap-2 bg-blue-50 rounded-lg p-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback>{enc.sender.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                  <div className="text-sm font-medium">{enc.sender}</div>
                                  <div className="text-sm">{enc.content}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Encouragement Actions */}
                      {selectedRecord?.id === record.id ? (
                        <div className="space-y-4 border-t pt-4">
                          <div className="flex gap-2">
                            <Button
                              variant={encouragementType === "stamp" ? "default" : "outline"}
                              size="sm"
                              onClick={() => setEncouragementType("stamp")}
                              className="flex items-center gap-1"
                            >
                              <Heart className="h-4 w-4" />
                              スタンプ
                            </Button>
                            <Button
                              variant={encouragementType === "ai" ? "default" : "outline"}
                              size="sm"
                              onClick={() => {
                                setEncouragementType("ai")
                                generateAISuggestions(record)
                              }}
                              className="flex items-center gap-1"
                            >
                              <Sparkles className="h-4 w-4" />
                              AI提案
                            </Button>
                            <Button
                              variant={encouragementType === "custom" ? "default" : "outline"}
                              size="sm"
                              onClick={() => setEncouragementType("custom")}
                              className="flex items-center gap-1"
                            >
                              <Edit3 className="h-4 w-4" />
                              個別作成
                            </Button>
                          </div>

                          {encouragementType === "stamp" && (
                            <div className="flex flex-wrap gap-2">
                              {stamps.map((stamp) => (
                                <Button
                                  key={stamp}
                                  variant="outline"
                                  size="lg"
                                  onClick={() => handleSendEncouragement(record, stamp, "stamp")}
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
                                <div key={index} className="flex items-start gap-2">
                                  <Button
                                    variant="outline"
                                    className="flex-1 text-left h-auto py-3 hover:bg-blue-50 bg-transparent"
                                    onClick={() => setEditingMessage(suggestion)}
                                  >
                                    {suggestion}
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => handleSendEncouragement(record, suggestion, "ai-message")}
                                  >
                                    <Send className="h-4 w-4" />
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
                                    onClick={() => handleSendEncouragement(record, editingMessage, "ai-message")}
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
                                onClick={() => handleSendEncouragement(record, customMessage, "custom-message")}
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
                        <div className="flex gap-2">
                          <Button
                            onClick={() => setSelectedRecord(record)}
                            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                          >
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
                          <div className="text-sm font-medium">過去の学習履歴（最大10件）</div>
                          <div className="text-sm text-muted-foreground">ここに過去の学習履歴が表示されます...</div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Inactive Students Tab */}
          <TabsContent value="inactive" className="space-y-4">
            {/* Threshold Filter */}
            <Card className="bg-white/80 backdrop-blur-sm shadow-md border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">未入力日数のしきい値:</span>
                  <Select value={inactiveThreshold} onValueChange={setInactiveThreshold}>
                    <SelectTrigger className="w-40 bg-white shadow-sm">
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
              {filteredInactiveStudents.map((student) => (
                <Card
                  key={student.id}
                  className={`shadow-md hover:shadow-lg transition-all duration-300 border-l-4 ${
                    student.daysInactive >= 7
                      ? "border-l-red-500 bg-red-50/50"
                      : student.daysInactive >= 5
                        ? "border-l-orange-500 bg-orange-50/50"
                        : "border-l-yellow-500 bg-yellow-50/50"
                  } ${student.isHandled ? "opacity-60" : ""}`}
                >
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      {/* Student Info */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-12 w-12 border-2 border-white shadow-md">
                            <AvatarImage src={getAvatarSrc(student.avatar) || "/placeholder.svg"} alt={student.name} />
                            <AvatarFallback>{student.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-semibold text-lg">{student.name}</div>
                            <div className="text-sm text-muted-foreground">ニックネーム: {student.nickname}</div>
                            <Badge className="mt-1 bg-blue-100 text-blue-800">{student.grade}</Badge>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
                            <Calendar className="h-4 w-4" />
                            最終入力: {student.lastInputDate.toLocaleDateString()}
                          </div>
                          <Badge
                            className={`${
                              student.daysInactive >= 7
                                ? "bg-red-500 text-white"
                                : student.daysInactive >= 5
                                  ? "bg-orange-500 text-white"
                                  : "bg-yellow-500 text-white"
                            }`}
                          >
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            {student.daysInactive}日未入力
                          </Badge>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <Button
                          variant={student.isHandled ? "outline" : "default"}
                          onClick={() => handleToggleHandled(student.id)}
                          className={student.isHandled ? "bg-gray-200" : ""}
                        >
                          {student.isHandled ? "対応済み解除" : "対応済みにする"}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            const currentNote = noteInput[student.id] || ""
                            if (!currentNote) {
                              setNoteInput({ ...noteInput, [student.id]: "" })
                            }
                          }}
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

                      {/* Existing Notes */}
                      {student.notes.length > 0 && (
                        <div className="space-y-2 border-t pt-4">
                          <div className="text-sm font-medium">対応メモ履歴</div>
                          {student.notes.map((note) => (
                            <div key={note.id} className="bg-white rounded-lg p-3 shadow-sm">
                              <div className="flex items-start gap-2">
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback>{note.author.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm font-medium">{note.author}</span>
                                    <span className="text-xs text-muted-foreground">
                                      {note.timestamp.toLocaleString()}
                                    </span>
                                  </div>
                                  <p className="text-sm">{note.content}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}

              {filteredInactiveStudents.length === 0 && (
                <Card className="bg-white/80 backdrop-blur-sm shadow-md">
                  <CardContent className="p-8 text-center">
                    <p className="text-muted-foreground">{inactiveThreshold}日以上未入力の生徒はいません</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <CoachBottomNavigation />
    </div>
  )
}
