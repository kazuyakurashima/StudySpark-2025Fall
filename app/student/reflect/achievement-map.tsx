"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getAchievementMapData } from "@/app/actions/reflect"
import { getChildAchievementMapData } from "@/app/actions/parent"
import { getStudySessions } from "@/app/actions/study-log"
import { TrendingUp } from "lucide-react"

interface AchievementMapProps {
  studentGrade: number
  studentCourse?: string
  viewerRole?: "student" | "parent" | "coach"
  studentId?: string
}

export function AchievementMap({
  studentGrade,
  studentCourse = "B",
  viewerRole = "student",
  studentId
}: AchievementMapProps) {
  const [selectedSubject, setSelectedSubject] = useState("all")
  const [mapData, setMapData] = useState<any[]>([])
  const [totalSessions, setTotalSessions] = useState<number>(0)
  const [loading, setLoading] = useState(true)

  const subjects = [
    { id: "all", name: "全科目", color: "bg-slate-500" },
    { id: "math", name: "算数", color: "bg-blue-500" },
    { id: "japanese", name: "国語", color: "bg-pink-500" },
    { id: "science", name: "理科", color: "bg-orange-500" },
    { id: "social", name: "社会", color: "bg-emerald-500" },
  ]

  // 学習回数をDBから取得（学年依存のみ — 科目切替では再取得しない）
  useEffect(() => {
    async function fetchSessionCount() {
      const sessionsResult = await getStudySessions(studentGrade)
      if (!sessionsResult.error && sessionsResult.sessions) {
        setTotalSessions(sessionsResult.sessions.length)
      }
    }
    fetchSessionCount()
  }, [studentGrade])

  // 学習ログデータを取得（科目・ロール・生徒ID依存）
  useEffect(() => {
    loadMapData()
  }, [selectedSubject, viewerRole, studentId, studentGrade])

  const loadMapData = async () => {
    setLoading(true)

    // viewerRoleに応じて適切なAPIを呼び出す
    const result = (viewerRole === "parent" || viewerRole === "coach") && studentId
      ? await getChildAchievementMapData(studentId)
      : await getAchievementMapData()

    if (!result.error && result.logs) {
      // 全科目が選択された場合は全てのデータを使用
      if (selectedSubject === "all") {
        setMapData(result.logs)
      } else {
        // 選択された科目でフィルター
        const subjectMap: Record<string, string> = {
          math: "算数",
          japanese: "国語",
          science: "理科",
          social: "社会",
        }
        const subjectName = subjectMap[selectedSubject]
        const filteredLogs = result.logs.filter(
          (log: any) => log.subjects?.name === subjectName
        )
        setMapData(filteredLogs)
      }
    }
    setLoading(false)
  }

  const getAccuracyColor = (accuracy: number, baseColor: string, subjectName?: string) => {
    if (accuracy === 0) return "bg-gray-100"

    // 全科目表示の場合、科目名から色を決定
    let actualColor = baseColor
    if (selectedSubject === "all" && subjectName) {
      const subjectColorMap: Record<string, string> = {
        "算数": "bg-blue-500",
        "国語": "bg-pink-500",
        "理科": "bg-orange-500",
        "社会": "bg-emerald-500",
      }
      actualColor = subjectColorMap[subjectName] || "bg-slate-500"
    }

    // 科目別カラーの濃淡
    const colorMap: Record<string, { light: string; medium: string; dark: string }> = {
      "bg-blue-500": {
        light: "bg-blue-200",
        medium: "bg-blue-400",
        dark: "bg-blue-600",
      },
      "bg-pink-500": {
        light: "bg-pink-200",
        medium: "bg-pink-400",
        dark: "bg-pink-600",
      },
      "bg-orange-500": {
        light: "bg-orange-200",
        medium: "bg-orange-400",
        dark: "bg-orange-600",
      },
      "bg-emerald-500": {
        light: "bg-emerald-200",
        medium: "bg-emerald-400",
        dark: "bg-emerald-600",
      },
      "bg-slate-500": {
        light: "bg-slate-200",
        medium: "bg-slate-400",
        dark: "bg-slate-600",
      },
    }

    const colors = colorMap[actualColor]
    if (accuracy < 50) return colors.light
    if (accuracy < 80) return colors.medium
    return colors.dark
  }

  // 学習回ごとにデータをグループ化
  const groupedData = mapData.reduce((acc: any, log: any) => {
    const sessionNum = log.study_sessions?.session_number || log.session_id
    const subjectName = log.subjects?.name || ""
    const contentName = log.study_content_types?.content_name || ""
    const accuracy =
      log.total_problems > 0
        ? Math.round((log.correct_count / log.total_problems) * 100)
        : 0

    if (!acc[sessionNum]) {
      acc[sessionNum] = {}
    }

    // 全科目表示の場合は「科目名 - 学習内容」をキーにする
    const key = selectedSubject === "all" ? `${subjectName} - ${contentName}` : contentName
    acc[sessionNum][key] = { accuracy, subjectName }

    return acc
  }, {})

  // 全学習回を生成（DBから取得した回数を使用）
  const allSessions: Record<string, any> = {}

  // 学習内容のリストを取得（データから）
  const allContentNames = new Set<string>()
  Object.values(groupedData).forEach((session: any) => {
    Object.keys(session).forEach((contentName) => allContentNames.add(contentName))
  })

  // 科目順でソート（算数 → 国語 → 理科 → 社会）
  const subjectOrder = ["算数", "国語", "理科", "社会"]
  const sortedContentNames = Array.from(allContentNames).sort((a, b) => {
    // 全科目表示の場合は「科目名 - 学習内容」形式なので科目名を抽出
    const subjectA = a.split(" - ")[0]
    const subjectB = b.split(" - ")[0]

    const indexA = subjectOrder.indexOf(subjectA)
    const indexB = subjectOrder.indexOf(subjectB)

    // 科目順で比較
    if (indexA !== indexB) {
      return indexA - indexB
    }

    // 同じ科目内では文字列順
    return a.localeCompare(b, 'ja')
  })

  // 全学習回を初期化
  for (let i = 1; i <= totalSessions; i++) {
    allSessions[i] = {}
    // 各学習内容をnullで初期化（データなし）
    sortedContentNames.forEach((contentName) => {
      allSessions[i][contentName] = groupedData[i]?.[contentName] ?? null
    })
  }

  const currentSubject = subjects.find((s) => s.id === selectedSubject)

  return (
    <Card className="card-elevated">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          達成マップ
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={selectedSubject} onValueChange={setSelectedSubject}>
          <TabsList className="grid grid-cols-3 sm:grid-cols-5 mb-6 w-full">
            {subjects.map((subject) => (
              <TabsTrigger key={subject.id} value={subject.id} className="text-xs sm:text-sm">
                {subject.name}
              </TabsTrigger>
            ))}
          </TabsList>

          {subjects.map((subject) => (
            <TabsContent key={subject.id} value={subject.id}>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                  読み込み中...
                </div>
              ) : mapData.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  まだデータがありません
                </div>
              ) : (
                <div className="space-y-4">
                  {/* ヒートマップの凡例 */}
                  {subject.id === "all" ? (
                    <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm">
                      <span className="text-muted-foreground font-semibold">科目:</span>
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 sm:w-4 sm:h-4 bg-blue-500 rounded"></div>
                        <span>算数</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 sm:w-4 sm:h-4 bg-pink-500 rounded"></div>
                        <span>国語</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 sm:w-4 sm:h-4 bg-orange-500 rounded"></div>
                        <span>理科</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 sm:w-4 sm:h-4 bg-emerald-500 rounded"></div>
                        <span>社会</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm">
                      <span className="text-muted-foreground font-semibold">正答率:</span>
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 sm:w-4 sm:h-4 bg-gray-100 border rounded"></div>
                        <span>0%</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className={`w-3 h-3 sm:w-4 sm:h-4 ${getAccuracyColor(25, subject.color)} rounded`}></div>
                        <span>0-50%</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className={`w-3 h-3 sm:w-4 sm:h-4 ${getAccuracyColor(65, subject.color)} rounded`}></div>
                        <span>50-80%</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className={`w-3 h-3 sm:w-4 sm:h-4 ${getAccuracyColor(90, subject.color)} rounded`}></div>
                        <span>80-100%</span>
                      </div>
                    </div>
                  )}

                  {/* ヒートマップグリッド */}
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr>
                          <th className="sticky left-0 bg-white z-10 text-left text-xs sm:text-sm font-semibold p-1 sm:p-2 border-b">学習回</th>
                          {/* 学習内容の列ヘッダー（科目順でソート済み） */}
                          {sortedContentNames.map((contentName) => (
                            <th key={contentName} className="text-center text-[10px] sm:text-xs font-semibold p-1 sm:p-2 border-b min-w-[60px] sm:min-w-[80px]">
                              <div className="break-words">{contentName}</div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {Object.keys(allSessions)
                          .sort((a, b) => Number(a) - Number(b))
                          .map((sessionNum) => (
                            <tr key={sessionNum}>
                              <td className="sticky left-0 bg-white z-10 text-xs sm:text-sm font-medium p-1 sm:p-2 border-b whitespace-nowrap">第{sessionNum}回</td>
                              {sortedContentNames.map((contentName) => {
                                const cellData = allSessions[sessionNum][contentName]
                                const accuracy = cellData?.accuracy ?? null
                                const subjectName = cellData?.subjectName
                                return (
                                  <td key={contentName} className="p-1 sm:p-2 border-b">
                                    <div className="flex justify-center">
                                      {accuracy === null ? (
                                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-50 border-2 border-dashed border-gray-200 rounded flex items-center justify-center">
                                          <span className="text-gray-300 text-[10px] sm:text-xs">-</span>
                                        </div>
                                      ) : (
                                        <div
                                          className={`w-10 h-10 sm:w-12 sm:h-12 ${getAccuracyColor(
                                            accuracy,
                                            subject.color,
                                            subjectName
                                          )} rounded flex items-center justify-center text-[10px] sm:text-xs font-semibold ${
                                            accuracy >= 50 ? "text-white" : "text-gray-700"
                                          }`}
                                          title={`${subjectName ? subjectName + ': ' : ''}${accuracy}%`}
                                        >
                                          {accuracy}%
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                )
                              })}
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  )
}
