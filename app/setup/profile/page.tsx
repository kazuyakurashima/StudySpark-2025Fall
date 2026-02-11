"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { updateProfile, completeSetup } from "@/app/actions/profile"
import { getCurrentUser } from "@/app/actions/auth"

export default function ProfileSetup() {
  const router = useRouter()
  const [realName, setRealName] = useState("")
  const [nickname, setNickname] = useState("")
  const [grade, setGrade] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)

  useEffect(() => {
    // ユーザーのロールを取得
    getCurrentUser().then((user) => {
      if (user?.profile) {
        setUserRole(user.profile.role)
      }
    })
  }, [])

  const handleNext = async () => {
    if (!nickname.trim()) {
      setError("ニックネームを入力してください")
      return
    }

    if (userRole === "student" && (!realName.trim() || !grade)) {
      setError("すべての項目を入力してください")
      return
    }

    setIsLoading(true)
    setError(null)

    const result = await updateProfile({
      displayName: nickname,
      realName: realName || undefined,
      grade: grade ? Number.parseInt(grade) : undefined,
    })

    if (result?.error) {
      setError(result.error)
      setIsLoading(false)
      return
    }

    // セットアップ完了ページへ
    router.push("/setup/complete")
  }

  const handleSkip = async () => {
    setIsLoading(true)
    // スキップ時も setup_completed=true にして completeSetup 経由でダッシュボードへ
    await completeSetup()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-yellow-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-800">プロフィールを設定しましょう</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* エラーメッセージ */}
          {error && <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md">{error}</div>}

          {/* 生徒の場合のみ表示 */}
          {userRole === "student" && (
            <>
              {/* お名前（非公開） */}
              <div className="space-y-2">
                <Label htmlFor="realName">お名前（非公開）</Label>
                <Input
                  id="realName"
                  type="text"
                  placeholder="東進太郎"
                  value={realName}
                  onChange={(e) => setRealName(e.target.value)}
                  className="w-full placeholder:text-muted-foreground/50"
                />
                <p className="text-xs text-gray-500">保護者・先生用。アプリ上には表示されません。</p>
              </div>

              {/* 学年 */}
              <div className="space-y-2">
                <Label htmlFor="grade">学年</Label>
                <Select value={grade} onValueChange={setGrade}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="学年を選択してください" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">小学5年生</SelectItem>
                    <SelectItem value="6">小学6年生</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">学年に応じて適切なテストが表示されます。</p>
              </div>
            </>
          )}

          {/* ニックネーム（公開） */}
          <div className="space-y-2">
            <Label htmlFor="nickname">
              {userRole === "student" ? "ニックネーム（公開）" : "表示名"}
            </Label>
            <Input
              id="nickname"
              type="text"
              placeholder={userRole === "student" ? "たんじろう" : "表示名を入力"}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={12}
              className="w-full placeholder:text-muted-foreground/50"
            />
            <p className="text-xs text-gray-500">
              {userRole === "student" ? "友達やアプリ上で表示される名前です。" : "アプリ上で表示される名前です。"}
            </p>
            <p className="text-xs text-gray-400">{nickname.length}/12文字</p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleSkip}
              variant="outline"
              className="flex-1"
              disabled={isLoading}
            >
              スキップ
            </Button>
            <Button
              onClick={handleNext}
              disabled={isLoading}
              className="flex-1 bg-cyan-600 hover:bg-cyan-700"
            >
              {isLoading ? "保存中..." : "次へ進む"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
