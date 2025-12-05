"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Heart, Star, ThumbsUp, Sparkles, ChevronDown, ChevronUp, Layers, MessageSquare } from "lucide-react"
import type { GroupedLogEntry, StudyLogWithBatch } from "@/lib/types/batch-grouping"
import { calculateSummary, calculateAccuracy, getRepresentativeLog } from "@/lib/utils/batch-grouping"

/**
 * 学習ログ型（応援機能用）
 */
export interface EncouragementStudyLog extends StudyLogWithBatch {
  subjects?: { name: string } | null
  study_sessions?: { session_number: number; grade?: number } | null
  study_content_types?: { content_name: string } | null
  reflection_text?: string | null
  encouragement_messages?: any[]
  students?: {
    id: string
    full_name: string
    grade?: number
    profiles?: {
      avatar_id?: string | null
      nickname?: string | null
      custom_avatar_url?: string | null
    }
  } | null
}

interface StudyLogCardProps {
  entry: GroupedLogEntry<EncouragementStudyLog>
  isExpanded: boolean
  onToggleExpand: () => void
  onQuickEncouragement?: (logId: string, type: "heart" | "star" | "thumbsup") => void
  onOpenAIDialog?: (logId: string) => void
  onOpenCustomDialog?: (logId: string) => void
  showStudentInfo?: boolean
  getAvatarSrc?: (avatarId: string | null | undefined, customAvatarUrl?: string | null) => string
  viewerRole: "parent" | "coach"
}

/**
 * 応援送信用の学習ログカード（バッチ/単独対応）
 */
export function StudyLogCard({
  entry,
  isExpanded,
  onToggleExpand,
  onQuickEncouragement,
  onOpenAIDialog,
  onOpenCustomDialog,
  showStudentInfo = false,
  getAvatarSrc,
  viewerRole,
}: StudyLogCardProps) {
  const isBatch = entry.type === "batch"
  const representativeLog = getRepresentativeLog(entry)
  const summary = calculateSummary(entry)
  const accuracy = calculateAccuracy(summary.totalQuestions, summary.totalCorrect)

  // 応援済みかどうか
  const hasEncouragement = isBatch
    ? entry.logs.some(
        (log) => Array.isArray(log.encouragement_messages) && log.encouragement_messages.length > 0
      )
    : Array.isArray(representativeLog.encouragement_messages) &&
      representativeLog.encouragement_messages.length > 0

  // 指導者応援済みかどうか（指導者画面用）
  const hasCoachEncouragement = isBatch
    ? entry.logs.some(
        (log) =>
          Array.isArray(log.encouragement_messages) &&
          log.encouragement_messages.some((msg: any) => msg.sender_role === "coach")
      )
    : Array.isArray(representativeLog.encouragement_messages) &&
      representativeLog.encouragement_messages.some((msg: any) => msg.sender_role === "coach")

  // 表示用の情報
  const student = representativeLog.students
  const profile = student?.profiles
  const fullName = student?.full_name || "生徒"
  const nickname = profile?.nickname
  const displayName = nickname && nickname !== fullName ? `${fullName}（${nickname}）` : fullName
  const avatarSrc = getAvatarSrc
    ? getAvatarSrc(profile?.avatar_id, profile?.custom_avatar_url)
    : "/placeholder.svg"

  // 日付表示
  const loggedAt = isBatch ? entry.latestLoggedAt : representativeLog.logged_at
  const displayDate = new Date(loggedAt || representativeLog.study_date).toLocaleDateString("ja-JP")

  // セッション表示
  const sessionNum = representativeLog.study_sessions?.session_number || 0

  // 科目一覧（バッチの場合）
  const subjects = isBatch ? entry.subjects : [representativeLog.subjects?.name || "科目不明"]

  // 代表ログID（応援送信用）
  const representativeLogId = String(representativeLog.id)
  const studentId = String(representativeLog.students?.id || representativeLog.student_id)

  // カードのスタイル
  const cardClassName =
    viewerRole === "coach" && hasCoachEncouragement
      ? "border-green-200 bg-green-50"
      : viewerRole === "parent" && hasEncouragement
        ? "border-green-200 bg-green-50"
        : ""

  return (
    <Card className={cardClassName}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {showStudentInfo && (
              <Avatar className="h-10 w-10">
                <AvatarImage src={avatarSrc} alt={displayName} />
                <AvatarFallback>{fullName?.[0] || "生"}</AvatarFallback>
              </Avatar>
            )}
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                {showStudentInfo && (
                  <>
                    <CardTitle className="text-base">{displayName}</CardTitle>
                    {student?.grade && (
                      <Badge variant="outline" className="text-xs">
                        小{student.grade}
                      </Badge>
                    )}
                  </>
                )}
                {isBatch && (
                  <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
                    <Layers className="h-3 w-3 mr-1" />
                    {entry.subjects.length}科目
                  </Badge>
                )}
                {(viewerRole === "coach" ? hasCoachEncouragement : hasEncouragement) && (
                  <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                    応援済み
                  </Badge>
                )}
              </div>
              {/* 科目表示 */}
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {isBatch ? (
                  subjects.map((subject, idx) => (
                    <span key={idx} className="text-sm font-medium">
                      {subject}
                      {idx < subjects.length - 1 && <span className="text-muted-foreground mx-1">·</span>}
                    </span>
                  ))
                ) : (
                  <span className="text-sm font-medium">{subjects[0]}</span>
                )}
                <span className="text-xs text-slate-600">· 第{sessionNum}回</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-slate-600">{displayDate}</div>
            <div className="text-lg font-semibold text-primary">{accuracy}%</div>
            <div className="text-xs text-slate-500">
              {summary.totalCorrect}/{summary.totalQuestions}問
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* バッチの場合は科目別内訳 */}
        {isBatch && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {entry.logs.map((log) => {
              const logAccuracy =
                log.total_problems > 0 ? Math.round((log.correct_count / log.total_problems) * 100) : 0
              return (
                <div key={log.id} className="text-xs p-2 bg-muted/50 rounded border">
                  <div className="font-medium">{log.subjects?.name}</div>
                  <div className="text-muted-foreground">
                    {logAccuracy}% ({log.correct_count}/{log.total_problems})
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* クイック応援ボタン（未応援の場合のみ） */}
        {!(viewerRole === "coach" ? hasCoachEncouragement : hasEncouragement) && onQuickEncouragement && (
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onQuickEncouragement(representativeLogId, "heart")}
              className="flex-1 border-pink-300 text-pink-700 hover:bg-pink-50"
            >
              <Heart className="h-4 w-4 mr-1" />
              がんばったね
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onQuickEncouragement(representativeLogId, "star")}
              className="flex-1 border-yellow-300 text-yellow-700 hover:bg-yellow-50"
            >
              <Star className="h-4 w-4 mr-1" />
              すごい！
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onQuickEncouragement(representativeLogId, "thumbsup")}
              className="flex-1 border-blue-300 text-blue-700 hover:bg-blue-50"
            >
              <ThumbsUp className="h-4 w-4 mr-1" />
              よくできました
            </Button>
          </div>
        )}

        {/* 詳細展開ボタン */}
        <Button variant="ghost" onClick={onToggleExpand} className="w-full">
          {isExpanded ? (
            <>
              <ChevronUp className="h-4 w-4 mr-1" />
              詳細を閉じる
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4 mr-1" />
              詳細を表示
            </>
          )}
        </Button>

        {/* 詳細表示 */}
        {isExpanded && (
          <div className="space-y-4 pt-4 border-t">
            {/* 学習内容・振り返り */}
            {isBatch ? (
              <>
                {/* 科目別の学習内容 */}
                {entry.logs.map((log) => (
                  <div key={log.id} className="text-sm space-y-2 p-3 bg-muted/30 rounded">
                    <div className="font-medium">{log.subjects?.name}</div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-slate-600">学習内容:</span>{" "}
                        {log.study_content_types?.content_name || "不明"}
                      </div>
                      <div>
                        <span className="text-slate-600">正答:</span> {log.correct_count}/{log.total_problems}問
                      </div>
                    </div>
                  </div>
                ))}
                {/* 振り返りはバッチ全体で1回だけ表示
                    現データモデルでは全ログに同一テキストが保存されるため、最初の1件を採用。
                    将来科目別振り返りを導入する場合は batch_reflections テーブル新設を検討 */}
                {(() => {
                  const batchReflection = entry.logs.find((log) => log.reflection_text)?.reflection_text
                  return batchReflection ? (
                    <div className="p-3 bg-muted/30 rounded">
                      <span className="text-slate-600 text-xs">今回の振り返り:</span>
                      <p className="mt-1 p-2 bg-background rounded text-sm">{batchReflection}</p>
                    </div>
                  ) : null
                })()}
              </>
            ) : (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-600">学習内容:</span>
                  <p className="font-medium">
                    {representativeLog.study_content_types?.content_name || "不明"}
                  </p>
                </div>
                <div>
                  <span className="text-slate-600">正答数:</span>
                  <p className="font-medium">
                    {representativeLog.correct_count} / {representativeLog.total_problems}問
                  </p>
                </div>
                {representativeLog.reflection_text && (
                  <div className="col-span-2">
                    <span className="text-slate-600">今日の振り返り:</span>
                    <p className="mt-1 p-3 bg-slate-50 rounded-lg">{representativeLog.reflection_text}</p>
                  </div>
                )}
              </div>
            )}

            {/* 応援履歴 */}
            {hasEncouragement && (
              <div className="text-sm">
                <span className="text-slate-600">応援履歴:</span>
                <div className="mt-2 space-y-2">
                  {(isBatch ? entry.logs : [representativeLog]).flatMap((log) =>
                    (log.encouragement_messages || []).map((msg: any, idx: number) => (
                      <div
                        key={`${log.id}-${idx}`}
                        className={`p-3 rounded-lg ${
                          msg.sender_role === "coach"
                            ? "bg-green-50 border border-green-200"
                            : "bg-pink-50 border border-pink-200"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <Badge
                            variant="outline"
                            className={
                              msg.sender_role === "coach"
                                ? "bg-green-100 text-green-700 border-green-300"
                                : "bg-pink-100 text-pink-700 border-pink-300"
                            }
                          >
                            {msg.sender_role === "coach" ? "指導者" : "保護者"}
                          </Badge>
                          <span className="text-xs text-slate-500">
                            {new Date(msg.created_at || msg.sent_at).toLocaleString("ja-JP")}
                          </span>
                        </div>
                        <p className="text-sm">{msg.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* AI/カスタム応援ボタン（未応援の場合のみ） */}
            {!(viewerRole === "coach" ? hasCoachEncouragement : hasEncouragement) &&
              (onOpenAIDialog || onOpenCustomDialog) && (
                <div className="flex gap-2">
                  {onOpenAIDialog && (
                    <Button
                      variant="outline"
                      onClick={() => onOpenAIDialog(representativeLogId)}
                      className="flex-1 border-purple-300 text-purple-700 hover:bg-purple-50"
                    >
                      <Sparkles className="h-4 w-4 mr-1" />
                      AI応援
                    </Button>
                  )}
                  {onOpenCustomDialog && (
                    <Button
                      variant="outline"
                      onClick={() => onOpenCustomDialog(representativeLogId)}
                      className="flex-1 border-slate-300 text-slate-700 hover:bg-slate-50"
                    >
                      <MessageSquare className="h-4 w-4 mr-1" />
                      カスタム応援
                    </Button>
                  )}
                </div>
              )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
