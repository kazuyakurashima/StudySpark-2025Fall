"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export default function ProfileSetup() {
  const router = useRouter()
  const [realName, setRealName] = useState("")
  const [nickname, setNickname] = useState("")

  const selectedAvatar = typeof window !== "undefined" ? localStorage.getItem("selectedAvatar") : null

  const getAvatarSrc = (avatarId: string) => {
    const avatarMap: { [key: string]: string } = {
      student1: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/student1-xZFJU5uXJO4DEfUbq1jbTMQUXReyM0.png",
      student2: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/student2-mZ9Q9oVm43IQoRyxSYytVFYgp3JS1V.png",
      student3: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/student3-teUpOKnopXNhE2vGFtvz9RWtC7O6kv.png",
      student4: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/student4-pKazGXekCT1H5kzHBqmfOrM1968hML.png",
      student5: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/student5-kehwNSIKsgkTL6EkAPO2evB3qJWnRM.png",
      student6: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/student6-dJrMk7uUxYSRMp5tMJ3t4KYDOEIuNl.png",
    }
    return avatarMap[avatarId] || avatarMap["student1"]
  }

  const handleNext = () => {
    if (realName.trim() && nickname.trim() && nickname.length <= 12) {
      localStorage.setItem("realName", realName)
      localStorage.setItem("nickname", nickname)
      router.push("/setup/complete")
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-yellow-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-800">プロフィールを設定しましょう</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* アバター表示 */}
          <div className="flex justify-center">
            <Avatar className="h-24 w-24">
              <AvatarImage src={selectedAvatar ? getAvatarSrc(selectedAvatar) : ""} alt="選択されたアバター" />
              <AvatarFallback>👤</AvatarFallback>
            </Avatar>
          </div>

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

          {/* ニックネーム（公開） */}
          <div className="space-y-2">
            <Label htmlFor="nickname">ニックネーム（公開）</Label>
            <Input
              id="nickname"
              type="text"
              placeholder="たんじろう"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={12}
              className="w-full placeholder:text-muted-foreground/50"
            />
            <p className="text-xs text-gray-500">友達やアプリ上で表示される名前です。</p>
            <p className="text-xs text-gray-400">{nickname.length}/12文字</p>
          </div>

          <div className="flex justify-center pt-4">
            <Button
              onClick={handleNext}
              disabled={!realName.trim() || !nickname.trim() || nickname.length > 12}
              className="px-8 py-3 bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              次へ進む
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
