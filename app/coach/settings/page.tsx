import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Settings, User, Mail, LogOut } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CoachBottomNavigation } from "@/components/coach-bottom-navigation"

export const dynamic = "force-dynamic"

export default async function CoachSettingsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, nickname")
    .eq("id", user.id)
    .single()

  if (!profile || profile.role !== "coach") {
    redirect("/")
  }

  const { data: coach } = await supabase
    .from("coaches")
    .select("full_name")
    .eq("user_id", user.id)
    .single()

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* ヘッダー */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center">
          <Settings className="h-5 w-5 text-slate-600 mr-2" />
          <h1 className="font-semibold text-slate-900">設定</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* プロフィール */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <User className="h-4 w-4" />
              プロフィール
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-sm text-slate-500">氏名</span>
              <span className="text-sm font-medium">{coach?.full_name || "未設定"}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-sm text-slate-500">ニックネーム</span>
              <span className="text-sm font-medium">{profile.nickname || "未設定"}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-slate-500">メールアドレス</span>
              <span className="text-sm font-medium">{user.email}</span>
            </div>
          </CardContent>
        </Card>

        {/* アカウント */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Mail className="h-4 w-4" />
              アカウント
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form action="/auth/signout" method="post">
              <Button
                type="submit"
                variant="outline"
                className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <LogOut className="h-4 w-4 mr-2" />
                ログアウト
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <CoachBottomNavigation />
    </div>
  )
}
