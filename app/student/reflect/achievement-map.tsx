"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getAchievementMapData } from "@/app/actions/reflect"
import { TrendingUp } from "lucide-react"

interface AchievementMapProps {
  studentGrade: number
  studentCourse: string
}

export function AchievementMap({ studentGrade, studentCourse }: AchievementMapProps) {
  const [selectedSubject, setSelectedSubject] = useState("math")
  const [mapData, setMapData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const subjects = [
    { id: "math", name: "算数", color: "bg-blue-500" },
    { id: "japanese", name: "国語", color: "bg-pink-500" },
    { id: "science", name: "理科", color: "bg-orange-500" },
    { id: "social", name: "社会", color: "bg-emerald-500" },
  ]

  useEffect(() => {
    loadMapData()
  }, [selectedSubject])

  const loadMapData = async () => {
    setLoading(true)
    const result = await getAchievementMapData()
    if (!result.error && result.logs) {
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
    setLoading(false)
  }

  const getAccuracyColor = (accuracy: number, baseColor: string) => {
    if (accuracy === 0) return "bg-gray-100"

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
    }

    const colors = colorMap[baseColor]
    if (accuracy < 50) return colors.light
    if (accuracy < 80) return colors.medium
    return colors.dark
  }

  // 学習回ごとにデータをグループ化
  const groupedData = mapData.reduce((acc: any, log: any) => {
    const sessionNum = log.study_sessions?.session_number || log.session_id
    const contentName = log.study_content_types?.content_name || ""
    const accuracy =
      log.total_problems > 0
        ? Math.round((log.correct_count / log.total_problems) * 100)
        : 0

    if (!acc[sessionNum]) {
      acc[sessionNum] = {}
    }
    acc[sessionNum][contentName] = accuracy

    return acc
  }, {})

  // 全学習回を生成（小5は19回、小6は15回）
  const totalSessions = studentGrade === 5 ? 19 : 15
  const allSessions: Record<string, any> = {}

  // 学習内容のリストを取得（データから）
  const allContentNames = new Set<string>()
  Object.values(groupedData).forEach((session: any) => {
    Object.keys(session).forEach((contentName) => allContentNames.add(contentName))
  })

  // 全学習回を初期化
  for (let i = 1; i <= totalSessions; i++) {
    allSessions[i] = {}
    // 各学習内容をnullで初期化（データなし）
    allContentNames.forEach((contentName) => {
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
          <TabsList className="grid grid-cols-4 mb-6">
            {subjects.map((subject) => (
              <TabsTrigger key={subject.id} value={subject.id}>
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
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-muted-foreground">正答率:</span>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-gray-100 border rounded"></div>
                      <span>0%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 ${getAccuracyColor(25, subject.color)} rounded`}></div>
                      <span>0-50%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 ${getAccuracyColor(65, subject.color)} rounded`}></div>
                      <span>50-80%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 ${getAccuracyColor(90, subject.color)} rounded`}></div>
                      <span>80-100%</span>
                    </div>
                  </div>

                  {/* ヒートマップグリッド */}
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr>
                          <th className="text-left text-sm font-semibold p-2 border-b">学習回</th>
                          {/* 学習内容の列ヘッダー（動的に生成） */}
                          {Array.from(allContentNames).map((contentName) => (
                            <th key={contentName} className="text-center text-xs font-semibold p-2 border-b">
                              {contentName}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {Object.keys(allSessions)
                          .sort((a, b) => Number(a) - Number(b))
                          .map((sessionNum) => (
                            <tr key={sessionNum}>
                              <td className="text-sm font-medium p-2 border-b">第{sessionNum}回</td>
                              {Array.from(allContentNames).map((contentName) => {
                                const accuracy = allSessions[sessionNum][contentName]
                                return (
                                  <td key={contentName} className="p-2 border-b">
                                    <div className="flex justify-center">
                                      {accuracy === null ? (
                                        <div className="w-12 h-12 bg-gray-50 border-2 border-dashed border-gray-200 rounded flex items-center justify-center">
                                          <span className="text-gray-300 text-xs">-</span>
                                        </div>
                                      ) : (
                                        <div
                                          className={`w-12 h-12 ${getAccuracyColor(
                                            accuracy,
                                            subject.color
                                          )} rounded flex items-center justify-center text-xs font-semibold ${
                                            accuracy >= 50 ? "text-white" : "text-gray-700"
                                          }`}
                                          title={`${accuracy}%`}
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
