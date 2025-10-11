import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, BookOpen, FileText, MessageSquare, Activity, Shield } from "lucide-react"
import AdminBottomNavigation from "@/components/admin-bottom-navigation"
import { getSystemStats, getRecentAuditLogs } from "@/app/actions/admin"

export default async function AdminDashboardPage() {
  // 認証チェック
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/")
  }

  // 管理者権限チェック
  const { data: admin } = await supabase.from("admins").select("id, full_name").eq("user_id", user.id).single()

  if (!admin) {
    redirect("/")
  }

  // システム統計を取得
  const statsResult = await getSystemStats()
  const stats = statsResult.stats || {
    users: { students: 0, parents: 0, coaches: 0, admins: 0, total: 0 },
    data: { studyLogs: 0, weeklyAnalysis: 0, auditLogs: 0, encouragements: 0, todayLogs: 0 },
  }

  // 最近の監査ログを取得
  const logsResult = await getRecentAuditLogs(5)
  const recentLogs = logsResult.logs || []

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 pb-24">
      {/* Header */}
      <div className="bg-card/80 backdrop-blur-sm border-b border-border/50 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">管理者ダッシュボード</h1>
              <p className="text-sm text-muted-foreground">ようこそ、{admin.full_name}さん</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 space-y-6">
        {/* システム統計 */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">ユーザー統計</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-2">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="text-2xl font-bold text-foreground">{stats.users.total}</div>
                  <div className="text-xs text-muted-foreground">総ユーザー数</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-2">
                    <Users className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="text-2xl font-bold text-foreground">{stats.users.students}</div>
                  <div className="text-xs text-muted-foreground">生徒</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-2">
                    <Users className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="text-2xl font-bold text-foreground">{stats.users.parents}</div>
                  <div className="text-xs text-muted-foreground">保護者</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-2">
                    <Users className="h-6 w-6 text-orange-600" />
                  </div>
                  <div className="text-2xl font-bold text-foreground">{stats.users.coaches}</div>
                  <div className="text-xs text-muted-foreground">指導者</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-2">
                    <Shield className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="text-2xl font-bold text-foreground">{stats.users.admins}</div>
                  <div className="text-xs text-muted-foreground">管理者</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* データ統計 */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">データ統計</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-2">
                    <BookOpen className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="text-2xl font-bold text-foreground">{stats.data.studyLogs}</div>
                  <div className="text-xs text-muted-foreground">学習記録</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-2">
                    <Activity className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="text-2xl font-bold text-foreground">{stats.data.todayLogs}</div>
                  <div className="text-xs text-muted-foreground">今日の記録</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-2">
                    <FileText className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="text-2xl font-bold text-foreground">{stats.data.weeklyAnalysis}</div>
                  <div className="text-xs text-muted-foreground">週次分析</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-2">
                    <MessageSquare className="h-6 w-6 text-orange-600" />
                  </div>
                  <div className="text-2xl font-bold text-foreground">{stats.data.encouragements}</div>
                  <div className="text-xs text-muted-foreground">応援メッセージ</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-2">
                    <Shield className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="text-2xl font-bold text-foreground">{stats.data.auditLogs}</div>
                  <div className="text-xs text-muted-foreground">監査ログ</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* 最近の監査ログ */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              最近の監査ログ
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentLogs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">監査ログがありません</div>
            ) : (
              <div className="space-y-2">
                {recentLogs.map((log: any) => (
                  <div key={log.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{log.table_name}</span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded ${
                            log.operation === "INSERT"
                              ? "bg-green-100 text-green-700"
                              : log.operation === "UPDATE"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-red-100 text-red-700"
                          }`}
                        >
                          {log.operation}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {new Date(log.created_at).toLocaleString("ja-JP")}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AdminBottomNavigation />
    </div>
  )
}
