"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import ParentBottomNavigation from "@/components/parent-bottom-navigation"
import { AICoachChat } from "@/components/ai-coach-chat"
import { MessageCircle, Sparkles, TrendingUp, TrendingDown, Minus } from "lucide-react"

// Declare variables and functions here
const children = [
  { id: "child1", name: "子供1" },
  { id: "child2", name: "子供2" },
]

const filteredAndSortedLearningHistory = [
  {
    subject: "算数",
    studySession: "1",
    studyDate: "2023-10-01",
    correctRate: 80,
    previousCorrectRate: 70,
    learningContent: ["加法", "減法"],
    reflection: "良い進歩をみせた",
  },
]

const subjectColors = {
  算数: { bg: "bg-blue-100", text: "text-blue-600", border: "border-blue-300" },
  国語: { bg: "bg-green-100", text: "text-green-600", border: "border-green-300" },
  理科: { bg: "bg-red-100", text: "text-red-600", border: "border-red-300" },
  社会: { bg: "bg-yellow-100", text: "text-yellow-600", border: "border-yellow-300" },
}

const getProgressChange = (currentRate: number, previousRate: number) => {
  const change = currentRate - previousRate
  if (change > 0) {
    return {
      icon: TrendingUp,
      change: `+${change}%`,
      color: "text-green-600",
      bgColor: "bg-green-100",
      borderColor: "border-green-300",
    }
  } else if (change < 0) {
    return {
      icon: TrendingDown,
      change: `${change}%`,
      color: "text-red-600",
      bgColor: "bg-red-100",
      borderColor: "border-red-300",
    }
  } else {
    return {
      icon: Minus,
      change: "0%",
      color: "text-slate-600",
      bgColor: "bg-slate-100",
      borderColor: "border-slate-300",
    }
  }
}

const learningContentColors = {
  加法: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  減法: { bg: "bg-green-50", text: "text-green-700", border: "border-green-200" },
}

const filteredAndSortedMessages = [
  {
    id: 1,
    from: "保護者",
    type: "parent",
    recordedAt: "2023-10-01T12:00:00",
    message: "素晴らしい学習をしたね！",
    subject: "算数",
    studySession: "1",
    studentRecordedAt: "2023-10-01",
    correctRate: 80,
    correctAnswers: 8,
    totalQuestions: 10,
    reflection: "良い進歩をみせた",
  },
]

const getAvatarSrc = (avatar: string) => {
  // Implement avatar source retrieval logic here
  return null
}

const toggleMessageExpansion = (messageId: number) => {
  // Implement message expansion toggle logic here
}

const filteredCoachingHistory = [
  {
    recordedAt: "2023-10-01T12:00:00",
    coachingSummary: {
      goal: "目標を設定する",
      reality: "現状を把握する",
      options: "選択肢を提示する",
      will: "意志を示す",
    },
    encouragementMessage: "応援メッセージ",
  },
]

export default function ParentReflectPage() {
  const [selectedChild, setSelectedChild] = useState("child1")
  const [showAIChat, setShowAIChat] = useState(false)
  const [activeTab, setActiveTab] = useState("history")
  const [expandedMessages, setExpandedMessages] = useState<Set<number>>(new Set())
  const [learningSubjectFilter, setLearningSubjectFilter] = useState("全科目")
  const [learningPeriodFilter, setLearningPeriodFilter] = useState("1ヶ月")
  const [learningSortBy, setLearningSortBy] = useState("記録日時")
  const [subjectFilter, setSubjectFilter] = useState("全科目")
  const [periodFilter, setPeriodFilter] = useState("1ヶ月")
  const [sortBy, setSortBy] = useState("記録日時")
  const [displayMode, setDisplayMode] = useState("一部表示")
  const [coachingPeriodFilter, setCoachingPeriodFilter] = useState("1ヶ月")

  // ... existing code (all filter and helper functions) ...

  if (showAIChat) {
    return <AICoachChat onClose={() => setShowAIChat(false)} />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 pb-20">
      <div className="bg-gradient-to-r from-white/95 to-slate-50/95 backdrop-blur-md border-b border-slate-200/60 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-800 flex items-center gap-3">
                <div className="p-2 sm:p-3 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl border border-blue-300 shadow-sm">
                  <MessageCircle className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-blue-600" />
                </div>
                リフレクト
              </h1>
              <p className="text-sm sm:text-base lg:text-lg text-slate-600 font-medium">
                お子さんの学習を振り返り、成長の軌跡を確認しましょう
              </p>
            </div>
            <div className="text-left sm:text-right">
              <div className="text-sm text-slate-500">今週の振り返り</div>
              <div className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                進行中
              </div>
            </div>
          </div>

          <div className="flex gap-1 mt-4 bg-slate-100 p-1 rounded-lg">
            {children.map((child) => (
              <button
                key={child.id}
                onClick={() => setSelectedChild(child.id)}
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all duration-300 ${
                  selectedChild === child.id
                    ? "bg-white text-foreground shadow-lg"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/50"
                }`}
              >
                {child.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        {/* ... existing AI coaching card ... */}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6 sm:space-8">
          {/* ... existing tabs list ... */}

          <TabsContent value="history" className="space-y-4 sm:space-y-6">
            <Card className="bg-white/90 backdrop-blur-md border-slate-200/60 shadow-xl">
              <CardContent className="p-4 sm:p-6 lg:p-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-800">学習履歴</h2>
                  <div className="flex flex-wrap gap-2">
                    <select
                      value={learningSubjectFilter}
                      onChange={(e) => setLearningSubjectFilter(e.target.value)}
                      className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                    >
                      <option>全科目</option>
                      <option>算数</option>
                      <option>国語</option>
                      <option>理科</option>
                      <option>社会</option>
                    </select>
                    <select
                      value={learningPeriodFilter}
                      onChange={(e) => setLearningPeriodFilter(e.target.value)}
                      className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                    >
                      <option>1週間</option>
                      <option>1ヶ月</option>
                      <option>3ヶ月</option>
                    </select>
                    <select
                      value={learningSortBy}
                      onChange={(e) => setLearningSortBy(e.target.value)}
                      className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                    >
                      <option>記録日時</option>
                      <option>学習回</option>
                      <option>正答率</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-4">
                  {filteredAndSortedLearningHistory.map((record, index) => {
                    const subjectColor = subjectColors[record.subject as keyof typeof subjectColors]
                    const progressChange = getProgressChange(record.correctRate, record.previousCorrectRate)

                    return (
                      <Card
                        key={index}
                        className="bg-gradient-to-br from-white to-slate-50/50 border-slate-200/60 shadow-lg hover:shadow-xl transition-all duration-300"
                      >
                        <CardContent className="p-4 sm:p-6">
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge
                                  className={`${subjectColor.bg} ${subjectColor.text} ${subjectColor.border} border font-semibold px-3 py-1`}
                                >
                                  {record.subject}
                                </Badge>
                                <Badge variant="outline" className="font-medium">
                                  {record.studySession}
                                </Badge>
                                <span className="text-sm text-slate-500">
                                  {new Date(record.studyDate).toLocaleDateString("ja-JP", {
                                    month: "numeric",
                                    day: "numeric",
                                  })}
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {record.learningContent.map((content, idx) => {
                                  const contentColor =
                                    learningContentColors[content as keyof typeof learningContentColors]
                                  return (
                                    <Badge
                                      key={idx}
                                      variant="outline"
                                      className={`${contentColor.bg} ${contentColor.text} ${contentColor.border} border text-xs`}
                                    >
                                      {content}
                                    </Badge>
                                  )
                                })}
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <div className="text-right">
                                <div className="text-2xl sm:text-3xl font-bold text-slate-800">
                                  {record.correctRate}%
                                </div>
                                <div className="text-sm text-slate-500">
                                  {record.correctAnswers}/{record.totalQuestions}問正解
                                </div>
                              </div>
                              {progressChange && (
                                <Badge
                                  className={`${progressChange.bgColor} ${progressChange.color} ${progressChange.borderColor} border font-semibold px-3 py-1 flex items-center gap-1`}
                                >
                                  <progressChange.icon className="h-3 w-3" />
                                  {progressChange.change}
                                </Badge>
                              )}
                            </div>
                          </div>
                          {record.reflection && (
                            <div className="mt-4 p-4 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 rounded-lg border border-blue-100">
                              <p className="text-sm text-slate-700 leading-relaxed">{record.reflection}</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="messages" className="space-y-4 sm:space-y-6">
            <Card className="bg-white/90 backdrop-blur-md border-slate-200/60 shadow-xl">
              <CardContent className="p-4 sm:p-6 lg:p-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-800">応援メッセージ履歴</h2>
                  <div className="flex flex-wrap gap-2">
                    <select
                      value={subjectFilter}
                      onChange={(e) => setSubjectFilter(e.target.value)}
                      className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                    >
                      <option>全科目</option>
                      <option>算数</option>
                      <option>国語</option>
                      <option>理科</option>
                      <option>社会</option>
                    </select>
                    <select
                      value={periodFilter}
                      onChange={(e) => setPeriodFilter(e.target.value)}
                      className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                    >
                      <option>1週間</option>
                      <option>1ヶ月</option>
                      <option>3ヶ月</option>
                    </select>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                    >
                      <option>記録日時</option>
                      <option>学習回</option>
                      <option>正答率</option>
                    </select>
                    <select
                      value={displayMode}
                      onChange={(e) => setDisplayMode(e.target.value)}
                      className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                    >
                      <option>一部表示</option>
                      <option>全て表示</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-4">
                  {filteredAndSortedMessages.map((message) => {
                    const isExpanded = expandedMessages.has(message.id)
                    const subjectColor = subjectColors[message.subject as keyof typeof subjectColors]
                    const progressChange = getProgressChange(message.correctRate, message.previousCorrectRate)

                    return (
                      <Card
                        key={message.id}
                        className="bg-gradient-to-br from-white to-slate-50/50 border-slate-200/60 shadow-lg hover:shadow-xl transition-all duration-300"
                      >
                        <CardContent className="p-4 sm:p-6">
                          <div className="flex items-start gap-4">
                            <Avatar className="w-10 h-10 sm:w-12 sm:h-12 border-2 border-white shadow-md">
                              <AvatarImage
                                src={getAvatarSrc(message.avatar) || "/placeholder.svg"}
                                alt={message.from}
                              />
                              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white font-bold">
                                {message.from[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 space-y-3">
                              <div className="flex items-center justify-between flex-wrap gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-slate-800">{message.from}</span>
                                  <Badge
                                    variant="outline"
                                    className={
                                      message.type === "parent"
                                        ? "bg-pink-50 text-pink-700 border-pink-200"
                                        : "bg-blue-50 text-blue-700 border-blue-200"
                                    }
                                  >
                                    {message.type === "parent" ? "保護者" : "先生"}
                                  </Badge>
                                </div>
                                <span className="text-sm text-slate-500">
                                  {new Date(message.recordedAt).toLocaleDateString("ja-JP", {
                                    month: "numeric",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </div>
                              <p className="text-slate-700 leading-relaxed">{message.message}</p>
                              {displayMode === "全て表示" || isExpanded ? (
                                <div className="space-y-3 mt-4">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <Badge
                                      className={`${subjectColor.bg} ${subjectColor.text} ${subjectColor.border} border font-semibold`}
                                    >
                                      {message.subject}
                                    </Badge>
                                    <Badge variant="outline">{message.studySession}</Badge>
                                    <span className="text-sm text-slate-500">
                                      {new Date(message.studentRecordedAt).toLocaleDateString("ja-JP", {
                                        month: "numeric",
                                        day: "numeric",
                                      })}
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {message.learningContent.map((content, idx) => {
                                      const contentColor =
                                        learningContentColors[content as keyof typeof learningContentColors]
                                      return (
                                        <Badge
                                          key={idx}
                                          variant="outline"
                                          className={`${contentColor.bg} ${contentColor.text} ${contentColor.border} border text-xs`}
                                        >
                                          {content}
                                        </Badge>
                                      )
                                    })}
                                  </div>
                                  <div className="flex items-center gap-4">
                                    <div className="text-2xl font-bold text-slate-800">{message.correctRate}%</div>
                                    <div className="text-sm text-slate-500">
                                      {message.correctAnswers}/{message.totalQuestions}問正解
                                    </div>
                                    {progressChange && (
                                      <Badge
                                        className={`${progressChange.bgColor} ${progressChange.color} ${progressChange.borderColor} border font-semibold flex items-center gap-1`}
                                      >
                                        <progressChange.icon className="h-3 w-3" />
                                        {progressChange.change}
                                      </Badge>
                                    )}
                                  </div>
                                  {message.reflection && (
                                    <div className="p-4 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 rounded-lg border border-blue-100">
                                      <p className="text-sm text-slate-700 leading-relaxed">{message.reflection}</p>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleMessageExpansion(message.id)}
                                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                >
                                  学習記録を見る
                                </Button>
                              )}
                              {displayMode === "一部表示" && isExpanded && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleMessageExpansion(message.id)}
                                  className="text-slate-600 hover:text-slate-700 hover:bg-slate-50"
                                >
                                  閉じる
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="coaching" className="space-y-4 sm:space-y-6">
            <Card className="bg-white/90 backdrop-blur-md border-slate-200/60 shadow-xl">
              <CardContent className="p-4 sm:p-6 lg:p-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-800">コーチング履歴</h2>
                  <select
                    value={coachingPeriodFilter}
                    onChange={(e) => setCoachingPeriodFilter(e.target.value)}
                    className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                  >
                    <option>1週間</option>
                    <option>1ヶ月</option>
                    <option>3ヶ月</option>
                  </select>
                </div>

                <div className="space-y-6">
                  {filteredCoachingHistory.map((session, index) => (
                    <Card
                      key={index}
                      className="bg-gradient-to-br from-white to-slate-50/50 border-slate-200/60 shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      <CardContent className="p-4 sm:p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="w-10 h-10 sm:w-12 sm:h-12 border-2 border-white shadow-md">
                              <AvatarImage src={getAvatarSrc("ai_coach") || "/placeholder.svg"} alt="AIコーチ" />
                              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white font-bold">
                                AI
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-semibold text-slate-800">AIコーチング</div>
                              <div className="text-sm text-slate-500">
                                {new Date(session.recordedAt).toLocaleDateString("ja-JP", {
                                  year: "numeric",
                                  month: "numeric",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
                            <div className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                              <span className="text-lg">🎯</span>
                              Goal（目標）
                            </div>
                            <p className="text-sm text-slate-700 leading-relaxed">{session.coachingSummary.goal}</p>
                          </div>

                          <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-100">
                            <div className="font-semibold text-green-900 mb-2 flex items-center gap-2">
                              <span className="text-lg">📊</span>
                              Reality（現状）
                            </div>
                            <p className="text-sm text-slate-700 leading-relaxed">{session.coachingSummary.reality}</p>
                          </div>

                          <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border border-purple-100">
                            <div className="font-semibold text-purple-900 mb-2 flex items-center gap-2">
                              <span className="text-lg">💡</span>
                              Options（選択肢）
                            </div>
                            <p className="text-sm text-slate-700 leading-relaxed">{session.coachingSummary.options}</p>
                          </div>

                          <div className="p-4 bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg border border-orange-100">
                            <div className="font-semibold text-orange-900 mb-2 flex items-center gap-2">
                              <span className="text-lg">🚀</span>
                              Will（意志）
                            </div>
                            <p className="text-sm text-slate-700 leading-relaxed">{session.coachingSummary.will}</p>
                          </div>
                        </div>

                        {session.encouragementMessage && (
                          <div className="mt-4 p-4 bg-gradient-to-br from-yellow-50 to-amber-50 rounded-lg border border-yellow-200">
                            <div className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
                              <Sparkles className="h-4 w-4" />
                              応援メッセージ
                            </div>
                            <p className="text-sm text-slate-700 leading-relaxed">{session.encouragementMessage}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <ParentBottomNavigation />
    </div>
  )
}
