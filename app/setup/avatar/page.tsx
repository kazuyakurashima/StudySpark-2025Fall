"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Image from "next/image"
import { updateAvatar } from "@/app/actions/profile"

const studentAvatars = [
  {
    id: "student1",
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/student1-xZFJU5uXJO4DEfUbq1jbTMQUXReyM0.png",
    name: "スマイルボーイ",
  },
  {
    id: "student2",
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/student2-mZ9Q9oVm43IQoRyxSYytVFYgp3JS1V.png",
    name: "ハッピーガール",
  },
  {
    id: "student3",
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/student3-teUpOKnopXNhE2vGFtvz9RWtC7O6kv.png",
    name: "クールキッズ",
  },
  {
    id: "student4",
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/student4-pKazGXekCT1H5kzHBqmfOrM1968hML.png",
    name: "スマートガール",
  },
  {
    id: "student5",
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/student5-kehwNSIKsgkTL6EkAPO2evB3qJWnRM.png",
    name: "チャレンジャー",
  },
  {
    id: "student6",
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/student6-dJrMk7uUxYSRMp5tMJ3t4KYDOEIuNl.png",
    name: "ピースメーカー",
  },
]

export default function AvatarSelectionPage() {
  const router = useRouter()
  const [selectedAvatar, setSelectedAvatar] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleContinue = async () => {
    if (!selectedAvatar) return

    setIsLoading(true)
    setError(null)

    const result = await updateAvatar(selectedAvatar)

    if (result?.error) {
      setError(result.error)
      setIsLoading(false)
      return
    }

    // 次のステップへ
    router.push("/setup/profile")
  }

  const handleSkip = () => {
    router.push("/setup/profile")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 pt-8">
          <div className="w-24 h-24 flex items-center justify-center mx-auto mb-4">
            <Image
              src="/images/spark-logo.png"
              alt="StudySpark Logo"
              width={96}
              height={96}
              className="object-contain"
            />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">アバターを選択</h1>
          <p className="text-muted-foreground">あなたのアバターを選んでください</p>
        </div>

        {/* Avatar Selection */}
        <Card className="shadow-lg border-0 bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-center">好きなアバターを選んでね</CardTitle>
          </CardHeader>
          <CardContent>
            {/* エラーメッセージ */}
            {error && <div className="mb-4 p-3 bg-destructive/10 text-destructive text-sm rounded-md">{error}</div>}

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
              {studentAvatars.map((avatar) => (
                <button
                  key={avatar.id}
                  onClick={() => setSelectedAvatar(avatar.id)}
                  className={`p-4 rounded-xl border-2 transition-all duration-200 hover:scale-105 ${
                    selectedAvatar === avatar.id
                      ? "border-cyan-600 bg-cyan-50 shadow-lg"
                      : "border-border bg-background hover:border-primary/50"
                  }`}
                >
                  <div className="aspect-square relative mb-2">
                    <Image
                      src={avatar.src || "/placeholder.svg"}
                      alt={avatar.name}
                      fill
                      className="object-cover rounded-lg"
                    />
                  </div>
                  <p className="text-sm font-medium text-center">{avatar.name}</p>
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleSkip}
                variant="outline"
                className="flex-1 h-12 text-lg font-medium"
                disabled={isLoading}
              >
                スキップ
              </Button>
              <Button
                onClick={handleContinue}
                disabled={!selectedAvatar || isLoading}
                className="flex-1 h-12 text-lg font-medium"
              >
                {isLoading ? "保存中..." : "次へ進む"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
