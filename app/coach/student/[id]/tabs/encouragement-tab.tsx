"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Heart, Loader2, Send, Bot, Users } from "lucide-react"
import { useCoachStudentDetail } from "@/lib/hooks/use-coach-student-detail"
import { sendEncouragementToStudent } from "@/app/actions/coach"

interface EncouragementTabProps {
  studentId: string
  studentName: string
}

export function EncouragementTab({ studentId, studentName }: EncouragementTabProps) {
  const { studyLogs, batchFeedbacks, legacyFeedbacks, isLoading, mutate } = useCoachStudentDetail(studentId)
  const [newMessage, setNewMessage] = useState("")
  const [isSending, setIsSending] = useState(false)

  // 学習ログから応援メッセージを抽出
  const encouragements = studyLogs
    .filter((log) => log.hasCoachResponse || legacyFeedbacks[log.id] || (log.batch_id && batchFeedbacks[log.batch_id]))
    .map((log) => ({
      id: log.id.toString(),
      message: log.coachMessage || legacyFeedbacks[log.id] || (log.batch_id ? batchFeedbacks[log.batch_id] : "") || "",
      created_at: log.logged_at,
      subject: log.subject,
    }))
    .filter((enc) => enc.message)
    .slice(0, 20) // 最新20件

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return

    setIsSending(true)
    try {
      // 最新の学習ログに対して応援を送信
      const latestLog = studyLogs[0]
      if (!latestLog) {
        alert("学習記録がありません")
        setIsSending(false)
        return
      }
      const result = await sendEncouragementToStudent(studentId, latestLog.id.toString(), newMessage)
      if (result.error) {
        alert(`エラー: ${result.error}`)
      } else {
        alert(`${studentName}さんに応援メッセージを送信しました！`)
        setNewMessage("")
        mutate()
      }
    } catch {
      alert("送信に失敗しました")
    } finally {
      setIsSending(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ja-JP", {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* 応援送信フォーム */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-primary" />
            応援メッセージを送る
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder={`${studentName}さんへの応援メッセージを入力...`}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            rows={3}
          />
          <div className="flex justify-end">
            <Button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || isSending || studyLogs.length === 0}
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              送信
            </Button>
          </div>
          {studyLogs.length === 0 && (
            <p className="text-sm text-muted-foreground">
              ※ 学習記録がないため応援を送信できません
            </p>
          )}
        </CardContent>
      </Card>

      {/* 応援履歴 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            送信済み応援
          </CardTitle>
        </CardHeader>
        <CardContent>
          {encouragements.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Heart className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>まだ応援メッセージを送信していません</p>
            </div>
          ) : (
            <div className="space-y-4">
              {encouragements.map((enc) => (
                <div
                  key={enc.id}
                  className="p-4 rounded-lg bg-blue-50 border-l-4 border-l-blue-500"
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        <Bot className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="secondary" className="text-xs">
                          {enc.subject}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(enc.created_at)}
                        </span>
                      </div>
                      <p className="text-sm">{enc.message}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
