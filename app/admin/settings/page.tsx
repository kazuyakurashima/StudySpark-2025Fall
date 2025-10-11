"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Settings, Save, RefreshCw } from "lucide-react"
import AdminBottomNavigation from "@/components/admin-bottom-navigation"
import { getSystemSettings, updateSystemSetting } from "@/app/actions/admin"

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    setLoading(true)
    const result = await getSystemSettings()
    if (result.settings) {
      const settingsMap: Record<string, string> = {}
      result.settings.forEach((setting: any) => {
        settingsMap[setting.key] = setting.value
      })
      setSettings(settingsMap)
    }
    setLoading(false)
  }

  const handleUpdateSetting = async (key: string, value: string) => {
    setSaving(true)
    const result = await updateSystemSetting(key, value)
    if (result.error) {
      alert(`エラー: ${result.error}`)
    } else {
      setSettings((prev) => ({ ...prev, [key]: value }))
    }
    setSaving(false)
  }

  const handleToggle = async (key: string, currentValue: string) => {
    const newValue = currentValue === "true" ? "false" : "true"
    await handleUpdateSetting(key, newValue)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 pb-24">
      {/* Header */}
      <div className="bg-card/80 backdrop-blur-sm border-b border-border/50 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <Settings className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">システム設定</h1>
              <p className="text-sm text-muted-foreground">アプリケーション全体の設定管理</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 space-y-6">
        {loading ? (
          <Card>
            <CardContent className="p-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">読み込み中...</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* メンテナンスモード */}
            <Card>
              <CardHeader>
                <CardTitle>メンテナンスモード</CardTitle>
                <CardDescription>
                  メンテナンス中は全ユーザーがアクセスできなくなります
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <Label htmlFor="maintenance-mode" className="text-base font-medium">
                      メンテナンスモード
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      有効にすると、管理者以外はアクセスできません
                    </p>
                  </div>
                  <Switch
                    id="maintenance-mode"
                    checked={settings.maintenance_mode === "true"}
                    onCheckedChange={() => handleToggle("maintenance_mode", settings.maintenance_mode || "false")}
                    disabled={saving}
                  />
                </div>
              </CardContent>
            </Card>

            {/* 機能フラグ */}
            <Card>
              <CardHeader>
                <CardTitle>機能フラグ</CardTitle>
                <CardDescription>各機能の有効/無効を切り替えます</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <Label htmlFor="weekly-analysis-enabled" className="text-base font-medium">
                      週次AI分析
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      指導者向けの週次AI分析機能
                    </p>
                  </div>
                  <Switch
                    id="weekly-analysis-enabled"
                    checked={settings.weekly_analysis_enabled !== "false"}
                    onCheckedChange={() =>
                      handleToggle("weekly_analysis_enabled", settings.weekly_analysis_enabled || "true")
                    }
                    disabled={saving}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <Label htmlFor="encouragement-enabled" className="text-base font-medium">
                      応援メッセージ
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      保護者・指導者からの応援メッセージ機能
                    </p>
                  </div>
                  <Switch
                    id="encouragement-enabled"
                    checked={settings.encouragement_enabled !== "false"}
                    onCheckedChange={() =>
                      handleToggle("encouragement_enabled", settings.encouragement_enabled || "true")
                    }
                    disabled={saving}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <Label htmlFor="reflection-enabled" className="text-base font-medium">
                      週次振り返り
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      生徒向けの週次振り返り機能（AIコーチング付き）
                    </p>
                  </div>
                  <Switch
                    id="reflection-enabled"
                    checked={settings.reflection_enabled !== "false"}
                    onCheckedChange={() => handleToggle("reflection_enabled", settings.reflection_enabled || "true")}
                    disabled={saving}
                  />
                </div>
              </CardContent>
            </Card>

            {/* システム情報 */}
            <Card>
              <CardHeader>
                <CardTitle>システム情報</CardTitle>
                <CardDescription>現在のシステム状態</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-muted-foreground">アプリケーション:</span>
                    <p className="font-semibold">StudySpark</p>
                  </div>
                  <div>
                    <span className="font-medium text-muted-foreground">バージョン:</span>
                    <p className="font-semibold">1.0.0 (MVP)</p>
                  </div>
                  <div>
                    <span className="font-medium text-muted-foreground">環境:</span>
                    <p className="font-semibold">
                      {process.env.NODE_ENV === "production" ? "本番" : "開発"}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-muted-foreground">データベース:</span>
                    <p className="font-semibold">Supabase PostgreSQL</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 将来の機能（Phase 6で実装予定） */}
            <Card>
              <CardHeader>
                <CardTitle>データ保持ポリシー</CardTitle>
                <CardDescription>自動削除の設定（Phase 6で実装予定）</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="audit-log-retention" className="text-sm font-medium">
                      監査ログ保持期間（日）
                    </Label>
                    <Input
                      id="audit-log-retention"
                      type="number"
                      value={settings.audit_log_retention_days || "365"}
                      onChange={(e) => handleUpdateSetting("audit_log_retention_days", e.target.value)}
                      disabled
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">現在: 365日</p>
                  </div>

                  <div>
                    <Label htmlFor="student-data-retention" className="text-sm font-medium">
                      卒業生データ保持期間（日）
                    </Label>
                    <Input
                      id="student-data-retention"
                      type="number"
                      value={settings.student_data_retention_days || "730"}
                      onChange={(e) => handleUpdateSetting("student_data_retention_days", e.target.value)}
                      disabled
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">現在: 730日（2年）</p>
                  </div>

                  <Button disabled className="w-full">
                    <Save className="h-4 w-4 mr-2" />
                    設定を保存（Phase 6で実装予定）
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <AdminBottomNavigation />
    </div>
  )
}
