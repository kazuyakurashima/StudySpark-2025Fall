"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Key, Plus, ToggleLeft, ToggleRight, Users, Shield } from "lucide-react"
import AdminBottomNavigation from "@/components/admin-bottom-navigation"
import { getInvitationCodes, generateInvitationCode, toggleInvitationCode } from "@/app/actions/admin"

export default function InvitationCodesPage() {
  const [codes, setCodes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [selectedRole, setSelectedRole] = useState<"parent" | "coach">("parent")

  useEffect(() => {
    loadCodes()
  }, [])

  const loadCodes = async () => {
    setLoading(true)
    const result = await getInvitationCodes()
    if (result.codes) {
      setCodes(result.codes)
    }
    setLoading(false)
  }

  const handleGenerateCode = async () => {
    setGenerating(true)
    const result = await generateInvitationCode(selectedRole, 30)

    if (result.error) {
      alert(`エラー: ${result.error}`)
    } else {
      alert(`招待コードを生成しました: ${result.code?.code}`)
      await loadCodes()
    }

    setGenerating(false)
  }

  const handleToggleCode = async (codeId: string) => {
    const result = await toggleInvitationCode(Number(codeId))

    if (result.error) {
      alert(`エラー: ${result.error}`)
    } else {
      await loadCodes()
    }
  }

  const getRoleBadge = (role: string) => {
    if (role === "parent") {
      return <Badge className="bg-purple-100 text-purple-700">保護者</Badge>
    }
    if (role === "coach") {
      return <Badge className="bg-orange-100 text-orange-700">指導者</Badge>
    }
    return <Badge>{role}</Badge>
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

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 pb-24">
      {/* Header */}
      <div className="bg-card/80 backdrop-blur-sm border-b border-border/50 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <Key className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">招待コード管理</h1>
              <p className="text-sm text-muted-foreground">新規ユーザー招待コードの発行・管理</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 space-y-6">
        {/* 新規発行 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              新規招待コード発行
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">ロール選択</label>
                <Select value={selectedRole} onValueChange={(value: any) => setSelectedRole(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="parent">保護者</SelectItem>
                    <SelectItem value="coach">指導者</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button onClick={handleGenerateCode} disabled={generating} className="w-full md:w-auto">
                  <Plus className="h-4 w-4 mr-2" />
                  {generating ? "生成中..." : "コード生成"}
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              ※ 有効期限は30日間です
            </p>
          </CardContent>
        </Card>

        {/* 招待コード一覧 */}
        <Card>
          <CardHeader>
            <CardTitle>招待コード一覧</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">読み込み中...</p>
              </div>
            ) : codes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                招待コードがありません
              </div>
            ) : (
              <div className="space-y-2">
                {codes.map((code) => (
                  <div
                    key={code.id}
                    className={`p-4 rounded-lg border-2 ${
                      !code.is_active || isExpired(code.expires_at)
                        ? "bg-muted/30 border-border"
                        : "bg-card border-border"
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <code className="text-lg font-mono font-bold bg-muted px-3 py-1 rounded">
                            {code.code}
                          </code>
                          {getRoleBadge(code.role)}
                          {code.is_active ? (
                            isExpired(code.expires_at) ? (
                              <Badge variant="outline" className="bg-red-50 text-red-700">
                                期限切れ
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-green-50 text-green-700">
                                有効
                              </Badge>
                            )
                          ) : (
                            <Badge variant="outline" className="bg-gray-50 text-gray-700">
                              無効
                            </Badge>
                          )}
                          {code.used_by && (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700">
                              使用済み
                            </Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-muted-foreground">
                          <div>
                            <span className="font-medium">作成日時:</span>
                            <br />
                            {formatDate(code.created_at)}
                          </div>
                          <div>
                            <span className="font-medium">有効期限:</span>
                            <br />
                            {formatDate(code.expires_at)}
                          </div>
                          {code.used_at && (
                            <div>
                              <span className="font-medium">使用日時:</span>
                              <br />
                              {formatDate(code.used_at)}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {!code.used_by && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleCode(code.id)}
                          >
                            {code.is_active ? (
                              <>
                                <ToggleRight className="h-4 w-4 mr-1" />
                                無効化
                              </>
                            ) : (
                              <>
                                <ToggleLeft className="h-4 w-4 mr-1" />
                                有効化
                              </>
                            )}
                          </Button>
                        )}
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
