"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import Image from "next/image"
import { Send, Sparkles, CheckCircle } from "lucide-react"
import { saveCoachingMessage, completeCoachingSession } from "@/app/actions/reflect"
import { useRouter } from "next/navigation"

interface Message {
  id: number
  role: "assistant" | "user"
  content: string
}

interface ReflectChatProps {
  studentName: string
  sessionId: string
  weekType: "growth" | "stable" | "challenge" | "special"
  thisWeekAccuracy: number
  lastWeekAccuracy: number
  accuracyDiff: number
  upcomingTest?: { test_types: { name: string }, test_date: string } | null
  onComplete: (summary: string) => void
}

const AVATAR_AI_COACH = "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/ai_coach-oDEKn6ZVqTbEdoExg9hsYQC4PTNbkt.png"

const MAX_TURNS = 6

// ---------- SSEストリーム消費ヘルパー ----------

interface StreamResult {
  fullContent: string
  canEndSession: boolean
}

/**
 * SSEストリームを消費し、50msバッチでUI更新をコールバックする。
 * heartbeatコメント行 (`:`) は自動スキップ。
 */
async function fetchStreamingMessage(
  body: object,
  onChunk: (accumulated: string) => void,
  signal: AbortSignal
): Promise<StreamResult> {
  const bodyWithId = { ...body, requestId: crypto.randomUUID() }

  const res = await fetch("/api/reflect/message-stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(bodyWithId),
    signal,
  })

  if (!res.ok || !res.body) {
    throw new Error("ストリーム接続に失敗しました")
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let fullContent = ""
  let canEndSession = false
  let sseBuffer = ""

  // 50msバッチ更新: deltaを蓄積し、intervalでまとめてUI更新
  let pendingText = ""
  const flushInterval = setInterval(() => {
    if (pendingText) {
      onChunk(fullContent)
      pendingText = ""
    }
  }, 50)

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      sseBuffer += decoder.decode(value, { stream: true })

      const lines = sseBuffer.split("\n\n")
      sseBuffer = lines.pop() || ""

      for (const line of lines) {
        // Heartbeatコメント行 / 空行をスキップ
        if (line === ":" || line.trim() === "") continue
        if (!line.startsWith("data: ")) continue

        const event = JSON.parse(line.slice(6))
        if (event.type === "delta") {
          fullContent += event.content
          pendingText += event.content
        } else if (event.type === "meta") {
          canEndSession = true
        } else if (event.type === "done") {
          fullContent = event.content
        } else if (event.type === "error") {
          throw new Error(event.content)
        }
      }
    }
  } finally {
    clearInterval(flushInterval)
    // 最後の残りをフラッシュ
    if (pendingText) onChunk(fullContent)
  }

  return { fullContent, canEndSession }
}

// ---------- 非ストリーム（フォールバック）ヘルパー ----------

async function fetchNonStreamingMessage(
  body: object
): Promise<{ message?: string; error?: string }> {
  const res = await fetch("/api/reflect/message", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  return res.json()
}

// ---------- メインコンポーネント ----------

export function ReflectChat({
  studentName,
  sessionId,
  weekType,
  thisWeekAccuracy,
  lastWeekAccuracy,
  accuracyDiff,
  upcomingTest,
  onComplete,
}: ReflectChatProps) {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [userInput, setUserInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [turnNumber, setTurnNumber] = useState(1)
  const [isCompleted, setIsCompleted] = useState(false)
  const [isSessionEnded, setIsSessionEnded] = useState(false)
  const [streamCanEndSession, setStreamCanEndSession] = useState(false)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const msgIdRef = useRef(0)
  const [isWaitingForAI, setIsWaitingForAI] = useState(false)

  // ページ離脱時にストリームをAbort
  useEffect(() => {
    return () => { abortControllerRef.current?.abort() }
  }, [])

  // 終了ボタン表示判定: ストリームからのmetaイベントを優先
  const canEndSession = !isCompleted && !isSessionEnded && !isStreaming && streamCanEndSession

  // クロージングメッセージを検出（フォールバック用に保持）
  const isClosingMessage = useCallback((content: string): boolean => {
    const closingPatterns = [
      /振り返りはこれで完了/,
      /また.*土曜日.*一緒に振り返ろう/,
      /また来週も.*楽しみにしてる/,
      /決めた行動を忘れずに.*来週も/,
    ]
    return closingPatterns.some(pattern => pattern.test(content))
  }, [])

  const messagesEndRef = useRef<HTMLDivElement>(null)

  // ユーザーが意図的に上スクロールしたかを追跡
  const userScrolledUpRef = useRef(false)

  // スクロールイベントでユーザーの手動スクロールを検知
  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container) return
    const handleScroll = () => {
      const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight
      // 底から 80px 以内なら「上スクロール」フラグを解除
      userScrolledUpRef.current = distanceFromBottom > 80
    }
    container.addEventListener("scroll", handleScroll)
    return () => container.removeEventListener("scroll", handleScroll)
  }, [])

  // 自動スクロール: ユーザーが上スクロールしていなければ追従
  // ストリーミング中は instant（smooth だと 50ms バッチに追いつけない）
  const scrollToBottom = useCallback(() => {
    if (userScrolledUpRef.current) return
    const container = messagesContainerRef.current
    if (!container) return
    container.scrollTop = container.scrollHeight
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, isStreaming, scrollToBottom])

  // ---------- リクエストボディ構築 ----------

  const buildRequestBody = useCallback((
    conversationHistory: { role: string; content: string }[],
    turn: number
  ) => ({
    studentName,
    weekType,
    thisWeekAccuracy,
    lastWeekAccuracy,
    accuracyDiff,
    upcomingTest,
    conversationHistory,
    turnNumber: turn,
  }), [studentName, weekType, thisWeekAccuracy, lastWeekAccuracy, accuracyDiff, upcomingTest])

  // ---------- ストリーミング送信 ----------

  const sendWithStreaming = useCallback(async (
    conversationHistory: { role: string; content: string }[],
    nextTurn: number
  ): Promise<{ content: string | null; aborted: boolean; placeholderId: number }> => {
    const placeholderId = ++msgIdRef.current
    setMessages(prev => [...prev, { id: placeholderId, role: "assistant", content: "" }])
    setIsStreaming(true)

    const controller = new AbortController()
    abortControllerRef.current = controller

    try {
      const requestBody = buildRequestBody(conversationHistory, nextTurn)
      const { fullContent, canEndSession: sessionCanEnd } = await fetchStreamingMessage(
        requestBody,
        (accumulated) => {
          setMessages(prev => prev.map(m =>
            m.id === placeholderId ? { ...m, content: accumulated } : m
          ))
        },
        controller.signal
      )

      setIsStreaming(false)

      if (sessionCanEnd) {
        setStreamCanEndSession(true)
      }

      // DB保存（冪等性: session_id + turn_number + role で重複チェック）
      await saveCoachingMessage(sessionId, "assistant", fullContent, nextTurn)
      setTurnNumber(nextTurn)

      return { content: fullContent, aborted: false, placeholderId }
    } catch (e) {
      setIsStreaming(false)
      const wasAborted = controller.signal.aborted
      if (wasAborted) {
        // abort 時: placeholder を除去（StrictMode double-mount 対策）
        setMessages(prev => prev.filter(m => m.id !== placeholderId))
        return { content: null, aborted: true, placeholderId }
      }

      // SSE 失敗ログ（turn 情報付き）
      console.warn(`[ReflectChat] SSE failed at turn ${nextTurn}:`, e)

      // エラー時: placeholder は残す（フォールバックで上書きされる）
      return { content: null, aborted: false, placeholderId }
    } finally {
      abortControllerRef.current = null
    }
  }, [sessionId, buildRequestBody])

  // ---------- 非ストリーム フォールバック ----------

  const sendWithFallback = useCallback(async (
    conversationHistory: { role: string; content: string }[],
    nextTurn: number,
    placeholderId?: number
  ): Promise<string | null> => {
    const requestBody = buildRequestBody(conversationHistory, nextTurn)
    const data = await fetchNonStreamingMessage(requestBody)

    if (data.error || !data.message) {
      // フォールバックも失敗: placeholder をエラーメッセージに置換（未検出時は append）
      const errorContent = "⚠️ メッセージの取得に失敗しました。もう一度送信してみてください。"
      if (placeholderId !== undefined) {
        setMessages(prev => {
          const found = prev.some(m => m.id === placeholderId)
          if (found) {
            return prev.map(m =>
              m.id === placeholderId ? { ...m, content: errorContent } : m
            )
          }
          return [...prev, { id: placeholderId, role: "assistant" as const, content: errorContent }]
        })
      }
      if (data.error) {
        console.warn(`[ReflectChat] Fallback also failed at turn ${nextTurn}:`, data.error)
      }
      return null
    }

    // レガシーMETA検出 + 除去（非ストリームAPIはテキスト内にMETAタグを埋め込む）
    const hasMetaTag = data.message.includes("[META:SESSION_CAN_END]")
    const cleanContent = data.message.replace(/\s*\[META:SESSION_CAN_END\]\s*/g, "").trim()

    if (placeholderId !== undefined) {
      // upsert: プレースホルダーがあれば上書き、なければ末尾追加（abort除去後の安全策）
      setMessages(prev => {
        const found = prev.some(m => m.id === placeholderId)
        if (found) {
          return prev.map(m =>
            m.id === placeholderId ? { ...m, content: cleanContent } : m
          )
        }
        return [...prev, { id: placeholderId, role: "assistant" as const, content: cleanContent }]
      })
    } else {
      setMessages(prev => [...prev, {
        id: ++msgIdRef.current,
        role: "assistant" as const,
        content: cleanContent,
      }])
    }
    await saveCoachingMessage(sessionId, "assistant", cleanContent, nextTurn)
    setTurnNumber(nextTurn)

    if (hasMetaTag) {
      setStreamCanEndSession(true)
    }

    return cleanContent
  }, [sessionId, buildRequestBody])

  // ---------- 初回メッセージ取得 ----------

  useEffect(() => {
    // StrictMode double-mount 対策: 1回目 cleanup で abort → placeholder 除去で自然にクリーンアップ
    const fetchInitialMessage = async () => {
      setIsLoading(true)
      setIsWaitingForAI(true)
      try {
        const result = await sendWithStreaming([], 1)
        if (result.content === null && !result.aborted) {
          // ストリーム失敗時: プレースホルダーを維持してフォールバックで上書き
          await sendWithFallback([], 1, result.placeholderId)
        }
      } catch (error) {
        console.error("初回メッセージ取得エラー:", error)
      } finally {
        setIsLoading(false)
        setIsWaitingForAI(false)
      }
    }
    fetchInitialMessage()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---------- サマリー生成 ----------

  const generateSummary = useCallback(async (
    conversationHistory: { role: string; content: string }[],
    turn: number
  ): Promise<string | null> => {
    const summaryResponse = await fetch("/api/reflect/summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildRequestBody(conversationHistory, turn)),
    })
    const summaryData = await summaryResponse.json()
    return summaryData.summary || null
  }, [buildRequestBody])

  // ---------- セッション終了ハンドラー ----------

  const handleEndSession = async () => {
    try {
      setIsLoading(true)

      const cleanMessages = messages.map(m => ({
        role: m.role,
        content: m.content,
      }))

      const summary = await generateSummary(cleanMessages, turnNumber)

      if (summary) {
        await completeCoachingSession(sessionId, summary, turnNumber)

        setMessages(prev => [...prev, {
          id: ++msgIdRef.current,
          role: "assistant",
          content: "今週の振り返りが完了しました！✨\n\nお疲れ様でした。",
        }])

        setIsSessionEnded(true)
        setIsCompleted(true)
        onComplete(summary)
      } else {
        alert("サマリー生成に失敗しました")
      }
    } catch (error) {
      console.error("セッション終了エラー:", error)
      alert("終了処理に失敗しました")
    } finally {
      setIsLoading(false)
    }
  }

  // ---------- メッセージ送信 ----------

  const sendMessage = async () => {
    if (!userInput.trim() || isLoading || isStreaming) return

    const newUserMessage: Message = {
      id: ++msgIdRef.current,
      role: "user",
      content: userInput.trim(),
    }

    const updatedMessages = [...messages, newUserMessage]
    setMessages(updatedMessages)
    setUserInput("")
    setIsLoading(true)
    setIsWaitingForAI(true)
    userScrolledUpRef.current = false // ユーザー送信時は自動スクロール再開
    setStreamCanEndSession(false) // 新メッセージ送信時にリセット

    try {
      // ユーザーメッセージを保存
      await saveCoachingMessage(sessionId, "user", newUserMessage.content, turnNumber)

      const conversationHistory = updatedMessages.map(m => ({ role: m.role, content: m.content }))

      // 最大ターン数に達した場合はサマリー生成
      if (turnNumber >= MAX_TURNS) {
        const summary = await generateSummary(conversationHistory, turnNumber)

        if (summary) {
          const finalMessage: Message = {
            id: ++msgIdRef.current,
            role: "assistant",
            content: `${studentName}さん、今週の振り返りお疲れさま！✨\n\n今週の振り返りをまとめたよ：\n\n「${summary}」\n\nまた来週も一緒に頑張ろうね！`,
          }
          setMessages(prev => [...prev, finalMessage])

          await completeCoachingSession(sessionId, summary, turnNumber)

          setTimeout(() => {
            onComplete(summary)
          }, 2000)
        }
      } else {
        // 次のAIメッセージ取得（ストリーミング）
        const nextTurn = turnNumber + 1
        const streamResult = await sendWithStreaming(conversationHistory, nextTurn)

        // ストリーム失敗時はフォールバック（abort時はスキップ）
        if (streamResult.content === null && !streamResult.aborted) {
          // プレースホルダーを維持してフォールバックで上書き（二重表示防止）
          const fallbackContent = await sendWithFallback(conversationHistory, nextTurn, streamResult.placeholderId)

          // フォールバック時のクロージング検出
          if (fallbackContent && isClosingMessage(fallbackContent)) {
            setIsCompleted(true)
            const allMessages = [...updatedMessages, { id: 0, role: "assistant" as const, content: fallbackContent }]
            const history = allMessages.map(m => ({ role: m.role, content: m.content }))
            const summary = await generateSummary(history, nextTurn)
            if (summary) {
              await completeCoachingSession(sessionId, summary, nextTurn)
              setTimeout(() => onComplete(summary), 2000)
            }
          }
        }
      }
    } catch (error) {
      console.error("メッセージ送信エラー:", error)
      alert("エラーが発生しました")
    } finally {
      setIsLoading(false)
      setIsWaitingForAI(false)
    }
  }

  // ---------- レンダリング ----------

  return (
    <Card className="card-elevated">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          AIコーチと週次振り返り（{turnNumber}/{MAX_TURNS}ターン目）
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div ref={messagesContainerRef} className="bg-accent/5 rounded-lg p-4 min-h-[60dvh] max-h-[70dvh] overflow-y-auto space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : "flex-row"}`}
            >
              {message.role === "assistant" && (
                <Image
                  src={AVATAR_AI_COACH}
                  alt="AIコーチ"
                  width={40}
                  height={40}
                  className="w-10 h-10 rounded-full flex-shrink-0 border-2 border-primary/20"
                />
              )}
              <div
                className={`px-4 py-3 max-w-[85%] ${
                  message.role === "user"
                    ? "bg-primary text-white rounded-2xl rounded-tr-sm shadow-md"
                    : "bg-white border border-border rounded-2xl rounded-tl-sm shadow-sm"
                }`}
              >
                <p className="text-sm whitespace-pre-line leading-relaxed">
                  {message.content || "\u00A0"}
                </p>
                {/* ストリーム中のカーソル表示 */}
                {isStreaming && message === messages[messages.length - 1] && message.role === "assistant" && (
                  <span className="inline-block w-0.5 h-4 bg-primary animate-pulse ml-0.5 align-text-bottom" />
                )}
              </div>
            </div>
          ))}
          {/* コーチ応答待ちのドットアニメーション（初回・ターン2+共通、終了処理中は非表示） */}
          {isWaitingForAI && !isStreaming && (
            <div className="flex gap-3">
              <Image
                src={AVATAR_AI_COACH}
                alt="AIコーチ"
                width={40}
                height={40}
                className="w-10 h-10 rounded-full flex-shrink-0 border-2 border-primary/20"
              />
              <div className="bg-white border border-border rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce"></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* 終了ボタン + 折り畳み入力欄 */}
        {canEndSession && !isSessionEnded && (
          <div className="space-y-4 py-4">
            <div className="flex justify-center">
              <Button
                onClick={handleEndSession}
                disabled={isLoading}
                size="lg"
                className="gap-2"
              >
                <CheckCircle className="h-5 w-5" />
                この内容で完了する
              </Button>
            </div>

            <details className="text-center">
              <summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors inline-block">
                もっと話したい場合はこちら
              </summary>
              <div className="mt-4 space-y-2">
                <div className="flex gap-2">
                  <Textarea
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    placeholder="続けて話したいことがあれば..."
                    className="flex-1 min-h-[60px] resize-none"
                    disabled={isLoading || isStreaming}
                  />
                  <Button
                    onClick={sendMessage}
                    disabled={!userInput.trim() || isLoading || isStreaming}
                    size="icon"
                    className="h-[60px] w-[60px]"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </details>
          </div>
        )}

        {/* 入力欄（通常時） */}
        {!isCompleted && !isSessionEnded && !canEndSession && turnNumber <= MAX_TURNS && (
          <div className="space-y-2">
            <div className="flex gap-2">
              <Textarea
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="あなたの気持ちを教えてね...（Enterで改行、送信ボタンで送信）"
                className="flex-1 min-h-[60px] resize-none"
                disabled={isLoading || isCompleted || isStreaming}
              />
              <Button
                onClick={sendMessage}
                disabled={!userInput.trim() || isLoading || isCompleted || isStreaming}
                size="icon"
                className="h-[60px] w-[60px]"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* 完了画面 */}
        {isSessionEnded && (
          <div className="text-center space-y-4 py-6">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
            <div>
              <p className="font-medium text-lg mb-2">振り返りが完了しました！</p>
              <p className="text-sm text-muted-foreground">
                お疲れ様でした。来週も頑張りましょう！
              </p>
            </div>
            <Button onClick={() => router.push("/student")}>
              ダッシュボードに戻る
            </Button>
          </div>
        )}

        {/* 自動完了メッセージ */}
        {isCompleted && !isSessionEnded && (
          <div className="text-center text-sm text-muted-foreground py-4">
            振り返りが完了しました。お疲れさまでした！✨
          </div>
        )}
      </CardContent>
    </Card>
  )
}
