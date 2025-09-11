"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { RotateCcw, Calendar, TrendingUp, Clock, BookOpen, History, MessageCircle, Headphones } from "lucide-react"
import ParentBottomNavigation from "@/components/parent-bottom-navigation"

export default function ParentReflectPage() {
  const [selectedChild, setSelectedChild] = useState("child1")

  const children = [
    { id: "child1", name: "みかん", nickname: "みかんちゃん" },
    { id: "child2", name: "太郎", nickname: "たろう" },
  ]

  const learningHistory = [
    {
      childName: "みかん",
      recordedAt: "2024年9月6日 20:30",
      studyDate: "2024年9月6日",
      subject: "算数",
      categories: [
        { name: "授業", color: "bg-red-100 text-red-800", description: "授業で解いた問題・解き直しの復習を含む" },
        { name: "宿題", color: "bg-red-100 text-red-800", description: "宿題で出された問題・解き直しの復習を含む" },
      ],
      understanding: { level: "バッチリ理解", emoji: "😄", color: "text-green-600" },
      reflection: "図形問題の解き方がよく理解できました。特に面積の求め方が分かりやすかったです。",
    },
    {
      childName: "みかん",
      recordedAt: "2024年9月5日 19:45",
      studyDate: "2024年9月5日",
      subject: "国語",
      categories: [
        {
          name: "週テスト・復習ナビ",
          color: "bg-blue-100 text-blue-800",
          description: "週テスト範囲の演習や復習・復習ナビでの実施",
        },
      ],
      understanding: { level: "できた", emoji: "😊", color: "text-blue-600" },
      reflection: "漢字の読み方を間違えやすいところがありましたが、復習して覚えました。",
    },
    {
      childName: "太郎",
      recordedAt: "2024年9月4日 21:15",
      studyDate: "2024年9月4日",
      subject: "理科",
      categories: [
        { name: "授業", color: "bg-red-100 text-red-800", description: "授業で解いた問題・解き直しの復習を含む" },
        { name: "入試対策・過去問", color: "bg-gray-100 text-gray-800", description: "過去問・入試レベル問題など" },
      ],
      understanding: { level: "ふつう", emoji: "😐", color: "text-yellow-600" },
      reflection: "実験の結果を予想するのが難しかったです。もう少し練習が必要だと思います。",
    },
    {
      childName: "太郎",
      recordedAt: "2024年9月3日 18:20",
      studyDate: "2024年9月3日",
      subject: "社会",
      categories: [
        { name: "宿題", color: "bg-red-100 text-red-800", description: "宿題で出された問題・解き直しの復習を含む" },
      ],
      understanding: { level: "ちょっと不安", emoji: "😟", color: "text-orange-600" },
      reflection: "地理の暗記が大変でした。地図を見ながら覚える方法を試してみます。",
    },
  ]

  const coachingHistory = [
    {
      childName: "みかん",
      date: "2024-09-06",
      time: "20:45",
      type: "週間振り返り",
      duration: "15分",
      topics: ["算数の図形問題", "学習習慣の改善", "次週の目標設定"],
      summary:
        "図形問題の理解が深まってきています。毎日の学習習慣も定着してきているので、この調子で続けましょう。来週は理科の実験問題にも挑戦してみましょう。",
      coach: "AIコーチ",
      level: "Blaze",
    },
    {
      childName: "みかん",
      date: "2024-09-01",
      time: "19:30",
      type: "学習相談",
      duration: "12分",
      topics: ["国語の読解問題", "時間管理", "モチベーション向上"],
      summary:
        "読解問題で時間がかかりすぎる傾向があります。まずは問題文を素早く読み取る練習をしましょう。毎日少しずつでも続けることが大切です。",
      coach: "AIコーチ",
      level: "Flame",
    },
    {
      childName: "太郎",
      date: "2024-08-25",
      time: "18:15",
      type: "テスト振り返り",
      duration: "18分",
      topics: ["合不合判定テスト結果", "弱点分析", "改善計画"],
      summary:
        "テスト結果を詳しく分析しました。算数の計算ミスが目立つので、見直しの習慣をつけましょう。理科は良くできているので、この調子で続けてください。",
      coach: "AIコーチ",
      level: "Flame",
    },
    {
      childName: "太郎",
      date: "2024-08-18",
      time: "20:00",
      type: "学習計画相談",
      duration: "10分",
      topics: ["夏休み後の学習計画", "科目バランス", "目標設定"],
      summary:
        "夏休み明けの学習リズムを整えるための計画を立てました。各科目のバランスを考えて、無理のないペースで進めていきましょう。",
      coach: "AIコーチ",
      level: "Spark",
    },
  ]

  const encouragementMessages = [
    {
      childName: "みかん",
      from: "お母さん",
      message: "今日も算数頑張ったね！図形問題が得意になってきたよ！",
      time: "今日 20:30",
      type: "parent",
    },
    {
      childName: "みかん",
      from: "田中先生",
      message: "国語の読解力が向上していますね。この調子で続けましょう。",
      time: "今日 18:45",
      type: "teacher",
    },
    {
      childName: "太郎",
      from: "お母さん",
      message: "理科の実験、興味深く取り組んでいたね！",
      time: "今日 19:15",
      type: "parent",
    },
    {
      childName: "太郎",
      from: "佐藤先生",
      message: "社会の地理問題、復習の成果が出ています。",
      time: "昨日 17:30",
      type: "teacher",
    },
  ]

  const analyticsData = {
    みかん: {
      goodTrends: [
        "毎日継続して学習できています",
        "算数の図形問題の正答率が向上しています",
        "国語の読解スピードが上がっています",
      ],
      improvementPoints: ["理科の実験問題により時間をかけましょう", "漢字の書き取り練習を増やしましょう"],
    },
    太郎: {
      goodTrends: [
        "理科への興味・関心が高まっています",
        "社会の暗記項目の定着率が向上しています",
        "学習計画を立てて実行できています",
      ],
      improvementPoints: ["算数の計算ミスを減らす練習をしましょう", "国語の記述問題に慣れましょう"],
    },
  }

  const selectedChildName = children.find((child) => child.id === selectedChild)?.name
  const filteredLearningHistory = learningHistory.filter((entry) => entry.childName === selectedChildName)
  const filteredCoachingHistory = coachingHistory.filter((session) => session.childName === selectedChildName)
  const filteredEncouragementMessages = encouragementMessages.filter((msg) => msg.childName === selectedChildName)
  const currentAnalytics = analyticsData[selectedChildName as keyof typeof analyticsData]

  const levelColors = {
    Spark: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
    Flame: { bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200" },
    Blaze: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  }

  const getAvatarSrc = (avatarId: string) => {
    const avatarMap: { [key: string]: string } = {
      ai_coach: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/ai_coach-oDEKn6ZVqTbEdoExg9hsYQC4PTNbkt.png",
    }
    return avatarMap[avatarId] || "/placeholder.svg"
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3 mb-4">
            <RotateCcw className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-xl font-bold text-slate-800">リフレクト</h1>
              <p className="text-sm text-slate-600">お子さんの学習を振り返ろう</p>
            </div>
          </div>

          <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
            {children.map((child) => (
              <Button
                key={child.id}
                variant="ghost"
                size="sm"
                onClick={() => setSelectedChild(child.id)}
                className={`flex-1 rounded-md transition-all ${
                  selectedChild === child.id
                    ? "bg-white text-primary shadow-sm font-medium"
                    : "text-slate-600 hover:text-slate-800 hover:bg-white/50"
                }`}
              >
                {child.name}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <Tabs defaultValue="history" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              学習履歴
            </TabsTrigger>
            <TabsTrigger value="messages" className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              応援メッセージ
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              分析
            </TabsTrigger>
            <TabsTrigger value="coaching" className="flex items-center gap-2">
              <Headphones className="h-4 w-4" />
              コーチング履歴
            </TabsTrigger>
          </TabsList>

          <TabsContent value="history" className="space-y-4">
            {filteredLearningHistory.map((entry, index) => (
              <Card key={index} className="border-l-4 border-l-primary">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-base flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-primary" />
                        <span className="font-bold text-lg">{entry.subject}</span>
                      </CardTitle>
                      <div className="flex items-center gap-4 text-sm text-slate-600">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          記録日時: {entry.recordedAt}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          学習日: {entry.studyDate}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl mb-1">{entry.understanding.emoji}</div>
                      <div className={`text-sm font-medium ${entry.understanding.color}`}>
                        {entry.understanding.level}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-slate-700 mb-2">学習内容</h4>
                    <div className="flex flex-wrap gap-2">
                      {entry.categories.map((category, idx) => (
                        <Badge key={idx} className={`${category.color} border-0`}>
                          {category.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  {entry.reflection && (
                    <div>
                      <h4 className="text-sm font-medium text-slate-700 mb-2">振り返り</h4>
                      <div className="bg-slate-50 p-3 rounded-lg">
                        <p className="text-sm text-slate-700">{entry.reflection}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="messages" className="space-y-4">
            {filteredEncouragementMessages.map((msg, index) => (
              <Card key={index}>
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm ${
                        msg.type === "parent" ? "bg-pink-500" : "bg-blue-500"
                      }`}
                    >
                      {msg.type === "parent" ? "母" : "先"}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{msg.from}</span>
                        <span className="text-xs text-gray-500">{msg.time}</span>
                      </div>
                      <p className="text-sm text-gray-700">{msg.message}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  学習傾向分析
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-green-50 rounded-lg">
                  <h4 className="font-medium text-green-800 mb-2">良い傾向</h4>
                  <ul className="text-sm text-green-700 space-y-1">
                    {currentAnalytics?.goodTrends.map((trend, index) => (
                      <li key={index}>• {trend}</li>
                    ))}
                  </ul>
                </div>
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <h4 className="font-medium text-yellow-800 mb-2">改善ポイント</h4>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    {currentAnalytics?.improvementPoints.map((point, index) => (
                      <li key={index}>• {point}</li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="coaching" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Headphones className="h-5 w-5 text-accent" />
                  コーチング履歴
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredCoachingHistory.map((session, index) => (
                    <div key={index} className="p-4 rounded-lg bg-accent/5 border border-accent/10">
                      <div className="flex items-start justify-between mb-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{session.date}</span>
                            <Clock className="h-4 w-4 text-muted-foreground ml-2" />
                            <span className="text-sm text-muted-foreground">{session.time}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                              {session.type}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {session.duration}
                            </Badge>
                            <Badge
                              className={`${levelColors[session.level as keyof typeof levelColors].bg} ${levelColors[session.level as keyof typeof levelColors].text} ${levelColors[session.level as keyof typeof levelColors].border}`}
                            >
                              {session.level}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={getAvatarSrc("ai_coach") || "/placeholder.svg"} alt={session.coach} />
                            <AvatarFallback>AI</AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium">{session.coach}</span>
                        </div>
                      </div>

                      <div className="mb-3">
                        <div className="flex items-center gap-2 mb-2">
                          <BookOpen className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">話し合ったトピック</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {session.topics.map((topic, topicIndex) => (
                            <Badge key={topicIndex} variant="secondary" className="text-xs">
                              {topic}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="p-3 bg-background rounded-lg">
                        <div className="text-xs text-muted-foreground mb-1">コーチングサマリー</div>
                        <p className="text-sm">{session.summary}</p>
                      </div>
                    </div>
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
