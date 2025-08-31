"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Image from "next/image"

const studentAvatars = [
  {
    id: "student1",
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/student1-xZFJU5uXJO4DEfUbq1jbTMQUXReyM0.png",
    name: "スマイルボーイ", // Updated character name from 学生1
  },
  {
    id: "student2",
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/student2-mZ9Q9oVm43IQoRyxSYytVFYgp3JS1V.png",
    name: "ハッピーガール", // Updated character name from 学生2
  },
  {
    id: "student3",
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/student3-teUpOKnopXNhE2vGFtvz9RWtC7O6kv.png",
    name: "クールキッズ", // Updated character name from 学生3
  },
  {
    id: "student4",
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/student4-pKazGXekCT1H5kzHBqmfOrM1968hML.png",
    name: "スマートガール", // Updated character name from 学生4
  },
  {
    id: "student5",
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/student5-kehwNSIKsgkTL6EkAPO2evB3qJWnRM.png",
    name: "チャレンジャー", // Updated character name from 学生5
  },
  {
    id: "student6",
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/student6-dJrMk7uUxYSRMp5tMJ3t4KYDOEIuNl.png",
    name: "ピースメーカー", // Updated character name from 学生6
  },
]

export default function AvatarSelectionPage() {
  const [selectedAvatar, setSelectedAvatar] = useState<string>("")

  const handleContinue = () => {
    if (selectedAvatar) {
      // Store selected avatar in localStorage for demo
      localStorage.setItem("selectedAvatar", selectedAvatar)
      window.location.href = "/setup/profile" // Updated navigation to profile setup page
    }
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
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
              {studentAvatars.map((avatar) => (
                <button
                  key={avatar.id}
                  onClick={() => setSelectedAvatar(avatar.id)}
                  className={`p-4 rounded-xl border-2 transition-all duration-200 hover:scale-105 ${
                    selectedAvatar === avatar.id
                      ? "border-cyan-600 bg-cyan-50 shadow-lg" // Enhanced accent color for selected state
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

            <Button onClick={handleContinue} disabled={!selectedAvatar} className="w-full h-12 text-lg font-medium">
              次へ進む
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
