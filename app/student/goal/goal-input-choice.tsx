"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Edit3 } from "lucide-react"

interface GoalInputChoiceProps {
  onAIChat: () => void
  onDirectInput: () => void
}

const AVATAR_AI_COACH = "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/ai_coach-oDEKn6ZVqTbEdoExg9hsYQC4PTNbkt.png"

export function GoalInputChoice({ onAIChat, onDirectInput }: GoalInputChoiceProps) {
  return (
    <Card className="card-elevated border-primary/20 shadow-xl">
      <CardContent className="p-6 space-y-4">
        <div className="text-center mb-4">
          <h3 className="text-lg font-bold text-primary mb-2">「今回の思い」の作り方を選ぼう</h3>
          <p className="text-sm text-muted-foreground">
            どちらの方法でも、あなたの気持ちを自由に表現できます
          </p>
        </div>

        <div className="space-y-3">
          {/* プライマリ: AIコーチと対話 */}
          <button
            onClick={onAIChat}
            className="w-full h-auto py-6 px-6 rounded-lg border-2 border-border bg-background hover:border-primary hover:bg-primary/5 hover:shadow-lg transition-all duration-300 group"
          >
            <div className="flex items-start gap-4 w-full">
              <div className="flex-shrink-0">
                <img
                  src={AVATAR_AI_COACH}
                  alt="AIコーチ"
                  className="w-12 h-12 rounded-full border-2 border-primary/20 group-hover:border-primary/40 transition-all"
                />
              </div>
              <div className="flex-1 text-left">
                <div className="font-bold text-lg mb-1 text-foreground group-hover:text-primary transition-colors">
                  AIコーチと話し始める
                </div>
                <div className="text-sm text-muted-foreground font-normal">
                  3つの質問に答えるだけで、AIコーチが「今回の思い」を作ります
                </div>
              </div>
            </div>
          </button>

          {/* セカンダリ: 自分で入力 */}
          <button
            onClick={onDirectInput}
            className="w-full h-auto py-6 px-6 rounded-lg border-2 border-border bg-background hover:border-primary hover:bg-primary/5 hover:shadow-lg transition-all duration-300 group"
          >
            <div className="flex items-start gap-4 w-full">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-all">
                  <Edit3 className="h-6 w-6 text-primary" />
                </div>
              </div>
              <div className="flex-1 text-left">
                <div className="font-bold text-lg mb-1 text-foreground group-hover:text-primary transition-colors">
                  自分で入力する
                </div>
                <div className="text-sm text-muted-foreground font-normal">
                  自由に気持ちを書いて「今回の思い」を作ります
                </div>
              </div>
            </div>
          </button>
        </div>
      </CardContent>
    </Card>
  )
}
