"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ScrollText, Filter, ChevronLeft, ChevronRight } from "lucide-react"
import AdminBottomNavigation from "@/components/admin-bottom-navigation"
import { getAuditLogs } from "@/app/actions/admin"

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [tableFilter, setTableFilter] = useState<string>("all")
  const [operationFilter, setOperationFilter] = useState<string>("all")
  const [selectedLog, setSelectedLog] = useState<any>(null)

  const limit = 20

  useEffect(() => {
    loadLogs()
  }, [page, tableFilter, operationFilter])

  const loadLogs = async () => {
    setLoading(true)
    const params = {
      tableName: tableFilter !== "all" ? tableFilter : undefined,
      operation: operationFilter !== "all" ? operationFilter : undefined,
      limit,
      offset: (page - 1) * limit,
    }

    const result = await getAuditLogs(params)
    if (result.logs) {
      setLogs(result.logs)
      setTotalCount(result.count || 0)
    }
    setLoading(false)
  }

  const getOperationBadge = (operation: string) => {
    switch (operation) {
      case "INSERT":
        return <Badge className="bg-green-100 text-green-700">作成</Badge>
      case "UPDATE":
        return <Badge className="bg-blue-100 text-blue-700">更新</Badge>
      case "DELETE":
        return <Badge className="bg-red-100 text-red-700">削除</Badge>
      default:
        return <Badge>{operation}</Badge>
    }
  }

  const getTableDisplayName = (tableName: string) => {
    const tableNames: Record<string, string> = {
      profiles: "プロフィール",
      students: "生徒",
      parents: "保護者",
      coaches: "指導者",
      admins: "管理者",
      study_logs: "学習記録",
      weekly_analysis: "週次分析",
      test_goals: "テスト目標",
      test_results: "テスト結果",
      encouragements: "応援メッセージ",
      invitation_codes: "招待コード",
      parent_child_relations: "親子関係",
      coach_student_relations: "指導者-生徒関係",
    }
    return tableNames[tableName] || tableName
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  }

  const totalPages = Math.ceil(totalCount / limit)

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 pb-24">
      {/* Header */}
      <div className="bg-card/80 backdrop-blur-sm border-b border-border/50 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <ScrollText className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">監査ログ</h1>
              <p className="text-sm text-muted-foreground">システム操作履歴の閲覧</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 space-y-6">
        {/* フィルター */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              {/* テーブル名フィルター */}
              <div className="w-full md:w-64">
                <Select value={tableFilter} onValueChange={setTableFilter}>
                  <SelectTrigger>
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全てのテーブル</SelectItem>
                    <SelectItem value="profiles">プロフィール</SelectItem>
                    <SelectItem value="students">生徒</SelectItem>
                    <SelectItem value="parents">保護者</SelectItem>
                    <SelectItem value="coaches">指導者</SelectItem>
                    <SelectItem value="admins">管理者</SelectItem>
                    <SelectItem value="study_logs">学習記録</SelectItem>
                    <SelectItem value="weekly_analysis">週次分析</SelectItem>
                    <SelectItem value="encouragements">応援メッセージ</SelectItem>
                    <SelectItem value="invitation_codes">招待コード</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 操作種別フィルター */}
              <div className="w-full md:w-48">
                <Select value={operationFilter} onValueChange={setOperationFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全ての操作</SelectItem>
                    <SelectItem value="INSERT">作成</SelectItem>
                    <SelectItem value="UPDATE">更新</SelectItem>
                    <SelectItem value="DELETE">削除</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* リセットボタン */}
              <Button
                variant="outline"
                onClick={() => {
                  setTableFilter("all")
                  setOperationFilter("all")
                  setPage(1)
                }}
              >
                リセット
              </Button>
            </div>

            <div className="mt-2 text-sm text-muted-foreground">
              {totalCount}件の監査ログ
            </div>
          </CardContent>
        </Card>

        {/* ログ一覧 */}
        <Card>
          <CardHeader>
            <CardTitle>監査ログ一覧</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">読み込み中...</p>
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                監査ログが見つかりませんでした
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      className="p-4 rounded-lg border-2 bg-card border-border hover:border-primary/30 transition-colors cursor-pointer"
                      onClick={() => setSelectedLog(selectedLog?.id === log.id ? null : log)}
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {getOperationBadge(log.operation)}
                            <span className="font-semibold">
                              {getTableDisplayName(log.table_name)}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {formatDate(log.created_at)}
                            </span>
                          </div>

                          {log.user_id && (
                            <div className="text-sm text-muted-foreground">
                              <span className="font-medium">ユーザーID:</span>{" "}
                              <code className="text-xs bg-muted px-1 py-0.5 rounded">
                                {log.user_id}
                              </code>
                            </div>
                          )}

                          <div className="text-sm text-muted-foreground">
                            <span className="font-medium">レコードID:</span>{" "}
                            <code className="text-xs bg-muted px-1 py-0.5 rounded">
                              {log.record_id}
                            </code>
                          </div>
                        </div>
                      </div>

                      {/* 詳細表示 */}
                      {selectedLog?.id === log.id && (
                        <div className="mt-4 pt-4 border-t space-y-3">
                          {log.old_data && (
                            <div>
                              <div className="text-sm font-semibold mb-1">変更前データ:</div>
                              <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                                {JSON.stringify(log.old_data, null, 2)}
                              </pre>
                            </div>
                          )}

                          {log.new_data && (
                            <div>
                              <div className="text-sm font-semibold mb-1">変更後データ:</div>
                              <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                                {JSON.stringify(log.new_data, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* ページネーション */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-6">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page - 1)}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      前へ
                    </Button>

                    <span className="text-sm text-muted-foreground">
                      {page} / {totalPages}
                    </span>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page + 1)}
                      disabled={page >= totalPages}
                    >
                      次へ
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <AdminBottomNavigation />
    </div>
  )
}
