"use client"

import { useState } from "react"
import { ThumbsUp, ThumbsDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { SCORE_NAMES } from "@/lib/langfuse/constants"
import { isLangfuseEnabled } from "@/lib/env"
import { toast } from "sonner"

interface LangfuseFeedbackProps {
  traceId: string | null
  onFeedback?: (helpful: boolean) => void
}

export function LangfuseFeedback({ traceId, onFeedback }: LangfuseFeedbackProps) {
  const [feedback, setFeedback] = useState<"helpful" | "not_helpful" | null>(null)
  const [loading, setLoading] = useState(false)

  // Langfuse無効またはtraceIdがない場合は非表示
  if (!isLangfuseEnabled() || !traceId) {
    return null
  }

  const handleFeedback = async (helpful: boolean) => {
    if (feedback || loading) return

    setLoading(true)
    const feedbackType = helpful ? "helpful" : "not_helpful"

    try {
      const supabase = createClient()

      // セッションからトークン取得
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.access_token) {
        toast.error("ログインしてください。")
        setLoading(false)
        return
      }

      const response = await fetch("/api/langfuse/score", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          traceId,
          scoreName: SCORE_NAMES.MESSAGE_HELPFUL,
          value: helpful ? 1 : 0,
          comment: feedbackType,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        // 成功時は無言（押した感覚だけでOK）
        setFeedback(feedbackType)
        onFeedback?.(helpful)
      } else {
        // エラーコード別の通知
        switch (data.code) {
          case "RATE_LIMIT_SERVICE_ERROR":
            toast.error("一時的にサービスが利用できません。しばらくしてから再度お試しください。")
            break
          case "RATE_LIMIT_EXCEEDED":
            toast.warning("リクエストが多すぎます。少し時間をおいてから再度お試しください。")
            break
          case "UNAUTHORIZED_TRACE_ACCESS":
            toast.error("このフィードバックを送信する権限がありません。")
            break
          case "SCORE_SEND_FAILED":
            toast.error("フィードバックの送信に失敗しました。")
            break
          default:
            toast.error("エラーが発生しました。もう一度お試しください。")
        }
      }
    } catch (error) {
      console.error("[Feedback] Network error:", error)
      toast.error("ネットワークエラーが発生しました。インターネット接続を確認してください。")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-2 py-2">
      <span className="text-sm text-muted-foreground">
        このメッセージは役に立ちましたか？
      </span>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleFeedback(true)}
        disabled={!!feedback || loading}
        className={feedback === "helpful" ? "text-green-600" : ""}
        aria-label="役に立った"
      >
        <ThumbsUp className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleFeedback(false)}
        disabled={!!feedback || loading}
        className={feedback === "not_helpful" ? "text-red-600" : ""}
        aria-label="役に立たなかった"
      >
        <ThumbsDown className="h-4 w-4" />
      </Button>
    </div>
  )
}
