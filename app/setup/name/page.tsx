"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import Image from "next/image"

export default function NameSetupPage() {
  const [name, setName] = useState("")
  const [selectedAvatar, setSelectedAvatar] = useState<string>("")

  // Get selected avatar from localStorage
  useState(() => {
    const avatar = localStorage.getItem("selectedAvatar")
    if (avatar) setSelectedAvatar(avatar)
  })

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

  const handleComplete = () => {
    if (name.trim()) {
      // Store name in localStorage for demo
      localStorage.setItem("userName", name.trim())
      window.location.href = "/student"
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4 flex items-center justify-center">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center mx-auto mb-4">
            <span className="text-xl font-bold text-primary-foreground">S</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">名前を入力</h1>
          <p className="text-muted-foreground">あなたの名前を教えてください</p>
        </div>

        {/* Name Input Card */}
        <Card className="shadow-lg border-0 bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-center">プロフィール設定</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Selected Avatar Preview */}
            {selectedAvatar && (
              <div className="flex justify-center">
                <div className="w-24 h-24 relative">
                  <Image
                    src={getAvatarSrc(selectedAvatar) || "/placeholder.svg"}
                    alt="選択されたアバター"
                    fill
                    className="object-cover rounded-full border-4 border-primary/20"
                  />
                </div>
              </div>
            )}

            {/* Name Input */}
            <div className="space-y-2">
              <Label htmlFor="name">お名前</Label>
              <Input
                id="name"
                type="text"
                placeholder="名前を入力してください"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-12 text-center text-lg"
                maxLength={20}
              />
            </div>

            <Button onClick={handleComplete} disabled={!name.trim()} className="w-full h-12 text-lg font-medium">
              StudySparkを始める
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
