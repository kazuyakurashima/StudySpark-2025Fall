"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Image from "next/image"

const parentAvatars = [
  {
    id: "parent1",
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/parent1-HbhESuJlC27LuGOGupullRXyEUzFLy.png",
    name: "保護者1",
  },
  {
    id: "parent2",
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/parent2-zluk4uVJLfzP8dBe0I7v5fVGSn5QfU.png",
    name: "保護者2",
  },
  {
    id: "parent3",
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/parent3-EzBDrjsFP5USAgnSPTXjcdNeq1bzSm.png",
    name: "保護者3",
  },
  {
    id: "parent4",
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/parent4-YHYTNRnNQ7bRb6aAfTNEFMozjGRlZq.png",
    name: "保護者4",
  },
  {
    id: "parent5",
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/parent5-dGCLocpgcZw4lXWRiPmTHkXURBXXoH.png",
    name: "保護者5",
  },
  {
    id: "parent6",
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/parent6-gKoeUywhHoKWJ4BPEk69iW6idztaLl.png",
    name: "保護者6",
  },
]

export default function ParentAvatarSelectionPage() {
  const [selectedAvatar, setSelectedAvatar] = useState<string>("")

  const handleContinue = () => {
    if (selectedAvatar) {
      // Store selected avatar in localStorage for demo
      localStorage.setItem("selectedParentAvatar", selectedAvatar)
      window.location.href = "/parent"
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 pt-8">
          <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center mx-auto mb-4">
            <span className="text-xl font-bold text-primary-foreground">S</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">保護者アバターを選択</h1>
          <p className="text-muted-foreground">あなたのアバターを選んでください</p>
        </div>

        {/* Avatar Selection */}
        <Card className="shadow-lg border-0 bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-center">お好みのアバターをお選びください</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
              {parentAvatars.map((avatar) => (
                <button
                  key={avatar.id}
                  onClick={() => setSelectedAvatar(avatar.id)}
                  className={`p-4 rounded-xl border-2 transition-all duration-200 hover:scale-105 ${
                    selectedAvatar === avatar.id
                      ? "border-primary bg-primary/10 shadow-lg"
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
