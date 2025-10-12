"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Edit3, ArrowLeft, Save, Lightbulb } from "lucide-react"

interface GoalDirectInputProps {
  onComplete: (goalThoughts: string) => void
  onBack: () => void
  isSaving?: boolean
}

export function GoalDirectInput({ onComplete, onBack, isSaving = false }: GoalDirectInputProps) {
  const [thoughts, setThoughts] = useState("")

  const handleComplete = () => {
    if (thoughts.trim()) {
      onComplete(thoughts.trim())
    }
  }

  return (
    <Card className="card-elevated shadow-xl">
      <CardHeader className="border-b bg-gradient-to-r from-primary/5 to-accent/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Edit3 className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">自分で入力する</CardTitle>
          </div>
          <Button variant="ghost" size="sm" onClick={onBack} className="h-8">
            <ArrowLeft className="h-4 w-4 mr-1" />
            戻る
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        {/* 参考メッセージ */}
        <div className="flex gap-3 p-4 bg-accent/20 rounded-lg border border-accent/30">
          <div className="flex-shrink-0">
            <Lightbulb className="h-5 w-5 text-accent" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-muted-foreground leading-relaxed">
              書くのが難しい時は、<span className="font-medium text-foreground">「どうしてこの目標にしたのか」</span>から始めてみよう
            </p>
          </div>
        </div>

        {/* テキストエリア */}
        <div className="space-y-2">
          <Textarea
            placeholder="目標に向けて、今の気持ちを自由に書こう"
            value={thoughts}
            onChange={(e) => setThoughts(e.target.value)}
            className="min-h-[300px] resize-none text-base leading-relaxed"
            maxLength={300}
          />
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">
              あなたの素直な気持ちを書いてね
            </span>
            <span className="text-xs text-muted-foreground font-medium">
              {thoughts.length}/300文字
            </span>
          </div>
        </div>

        {/* 保存ボタン */}
        <Button
          onClick={handleComplete}
          disabled={!thoughts.trim() || isSaving}
          className="w-full h-12 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white font-bold shadow-lg"
        >
          <Save className="h-5 w-5 mr-2" />
          {isSaving ? "保存中..." : "この内容で保存"}
        </Button>
      </CardContent>
    </Card>
  )
}
