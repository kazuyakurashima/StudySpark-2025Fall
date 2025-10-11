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
import { Users, Search, Filter } from "lucide-react"
import AdminBottomNavigation from "@/components/admin-bottom-navigation"
import { getAllUsers, searchUsers } from "@/app/actions/admin"

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([])
  const [filteredUsers, setFilteredUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState<string>("all")

  useEffect(() => {
    loadUsers()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [users, searchQuery, roleFilter])

  const loadUsers = async () => {
    setLoading(true)
    const result = await getAllUsers()
    if (result.users) {
      setUsers(result.users)
    }
    setLoading(false)
  }

  const applyFilters = () => {
    let filtered = [...users]

    // ロールフィルター
    if (roleFilter !== "all") {
      filtered = filtered.filter((user) => user.role === roleFilter)
    }

    // 検索クエリ
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((user) => {
        const name =
          user.display_name || user.full_name || user.login_id || ""
        const email = user.email || ""
        return name.toLowerCase().includes(query) || email.toLowerCase().includes(query)
      })
    }

    setFilteredUsers(filtered)
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "student":
        return <Badge className="bg-green-100 text-green-700">生徒</Badge>
      case "parent":
        return <Badge className="bg-purple-100 text-purple-700">保護者</Badge>
      case "coach":
        return <Badge className="bg-orange-100 text-orange-700">指導者</Badge>
      case "admin":
        return <Badge className="bg-red-100 text-red-700">管理者</Badge>
      default:
        return <Badge>{role}</Badge>
    }
  }

  const getCourseBadge = (course: string) => {
    switch (course) {
      case "A":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700">Aコース</Badge>
      case "B":
        return <Badge variant="outline" className="bg-green-50 text-green-700">Bコース</Badge>
      case "C":
        return <Badge variant="outline" className="bg-orange-50 text-orange-700">Cコース</Badge>
      case "S":
        return <Badge variant="outline" className="bg-red-50 text-red-700">Sコース</Badge>
      default:
        return null
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 pb-24">
      {/* Header */}
      <div className="bg-card/80 backdrop-blur-sm border-b border-border/50 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">ユーザー管理</h1>
              <p className="text-sm text-muted-foreground">全ユーザーの閲覧・管理</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 space-y-6">
        {/* 検索・フィルター */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              {/* 検索 */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="名前またはメールアドレスで検索..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* ロールフィルター */}
              <div className="w-full md:w-48">
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger>
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全てのロール</SelectItem>
                    <SelectItem value="student">生徒</SelectItem>
                    <SelectItem value="parent">保護者</SelectItem>
                    <SelectItem value="coach">指導者</SelectItem>
                    <SelectItem value="admin">管理者</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-2 text-sm text-muted-foreground">
              {filteredUsers.length}件のユーザー
            </div>
          </CardContent>
        </Card>

        {/* ユーザー一覧 */}
        <Card>
          <CardHeader>
            <CardTitle>ユーザー一覧</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">読み込み中...</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                ユーザーが見つかりませんでした
              </div>
            ) : (
              <div className="space-y-2">
                {filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    className="p-4 rounded-lg border-2 bg-card border-border hover:border-primary/30 transition-colors"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold text-lg">
                            {user.display_name || user.full_name || user.login_id}
                          </span>
                          {getRoleBadge(user.role)}
                          {user.course && getCourseBadge(user.course)}
                          {user.grade && (
                            <Badge variant="outline" className="text-xs">
                              小学{user.grade}年
                            </Badge>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                          {user.login_id && (
                            <div>
                              <span className="font-medium">ログインID:</span> {user.login_id}
                            </div>
                          )}
                          {user.email && (
                            <div>
                              <span className="font-medium">メール:</span> {user.email}
                            </div>
                          )}
                          <div>
                            <span className="font-medium">登録日時:</span>
                            <br />
                            {formatDate(user.created_at)}
                          </div>
                          <div>
                            <span className="font-medium">ユーザーID:</span>
                            <br />
                            <code className="text-xs bg-muted px-1 py-0.5 rounded">
                              {user.user_id}
                            </code>
                          </div>
                        </div>
                      </div>

                      {/* 将来的なアクション（Phase 6で実装予定） */}
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" disabled>
                          詳細
                        </Button>
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
