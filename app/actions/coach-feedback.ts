"use server"

import { getLangfuseClient, flushLangfuse } from "@/lib/langfuse/client"
import { getOpenAIClient } from "@/lib/openai/client"
import { getGeminiClient, getModelForModule } from "@/lib/llm/client"
import { sanitizeForLog } from "@/lib/llm/logger"
import { createClient, createAdminClient } from "@/lib/supabase/server"
import {
  PROMPT_VERSION,
  getSystemPrompt,
  getUserPrompt,
  getPromptHash,
  getTimeoutMs,
  getFallbackFeedback,
  verifyBatchOwnership,
  checkExistingFeedback,
  saveFeedbackToDb,
  saveFallbackToDb,
} from "@/lib/services/coach-feedback"

// 型の re-export（既存importの互換維持）
export type {
  StudyDataForFeedback,
  GenerateFeedbackResult,
  GenerateFeedbackSuccess,
  GenerateFeedbackError,
} from "@/lib/types/coach-feedback"

import type {
  StudyDataForFeedback,
  GenerateFeedbackResult,
} from "@/lib/types/coach-feedback"

// ============================================================================
// LLM呼び出し（Server Action / レガシー専用 — 非ストリーミング）
// ============================================================================

/**
 * LLM呼び出し（プロバイダ分岐 + AbortSignal対応）
 * ストリーミング版は lib/services/coach-feedback-stream.ts を使用。
 */
async function callLLM(
  systemPrompt: string,
  userPrompt: string,
  signal: AbortSignal
): Promise<{ text: string; provider: string; model: string }> {
  const { provider, model } = getModelForModule("coach", "realtime")

  if (provider === "gemini") {
    const client = getGeminiClient()
    const response = await client.models.generateContent({
      model,
      config: {
        systemInstruction: systemPrompt,
        maxOutputTokens: 150,
        abortSignal: signal,
      },
      contents: [{ role: "user" as const, parts: [{ text: userPrompt }] }],
    })
    const text = response.text?.trim()
    if (!text) throw new Error("AI応答の生成に失敗しました")
    return { text, provider, model }
  }

  // OpenAI
  const openai = getOpenAIClient()
  const response = await openai.chat.completions.create(
    {
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_completion_tokens: 150,
    },
    { signal }
  )
  const text = response.choices[0]?.message?.content?.trim()
  if (!text) throw new Error("AI応答の生成に失敗しました")
  return { text, provider, model }
}

// ============================================================================
// メイン関数
// ============================================================================

/**
 * コーチフィードバック生成（Server Action）
 *
 * SSE化後もレガシーフォールバックとして残す。
 * メインパスはサービス層の関数を使う薄いラッパー。
 */
export async function generateCoachFeedback(
  clientStudentId: number,
  clientSessionId: number,
  clientBatchId: string,
  clientStudyLogIds: number[],
  data: StudyDataForFeedback
): Promise<GenerateFeedbackResult> {
  // ========================================
  // 1. 認証・権限検証
  // ========================================
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    console.error("Authentication failed:", sanitizeForLog(authError))
    return {
      success: false,
      error: "認証エラー: ログインしてください",
      fallbackFeedback: getFallbackFeedback(data),
      canRetry: false,
    }
  }

  const { data: studentRecord, error: studentError } = await supabase
    .from("students")
    .select("id")
    .eq("user_id", user.id)
    .single()

  if (studentError || !studentRecord) {
    console.error("Student lookup failed:", sanitizeForLog(studentError))
    return {
      success: false,
      error: "生徒情報の取得に失敗しました",
      fallbackFeedback: getFallbackFeedback(data),
      canRetry: false,
    }
  }

  if (studentRecord.id !== clientStudentId) {
    console.error("Student ID mismatch:", sanitizeForLog({
      expected: studentRecord.id,
      received: clientStudentId,
    }))
    return {
      success: false,
      error: "権限エラー: 他の生徒のデータにはアクセスできません",
      fallbackFeedback: getFallbackFeedback(data),
      canRetry: false,
    }
  }

  const verifiedStudentId = studentRecord.id

  // ========================================
  // 2. バッチ所有権検証（サービス層に委譲）
  // ========================================
  const batchResult = await verifyBatchOwnership(
    supabase,
    verifiedStudentId,
    clientBatchId,
    clientStudyLogIds,
    clientSessionId
  )

  if (!batchResult.ok) {
    // batch_not_found → レガシーフォールバック
    if (batchResult.error === "batch_not_found") {
      return await generateLegacyFeedback(
        supabase,
        verifiedStudentId,
        clientSessionId,
        clientStudyLogIds,
        data
      )
    }
    return {
      success: false,
      error: batchResult.error,
      fallbackFeedback: getFallbackFeedback(data),
      canRetry: false,
    }
  }

  const { verifiedSessionId, representativeStudyLogId } = batchResult

  // ========================================
  // 3. 入力データ検証
  // ========================================
  if (!data.subjects || data.subjects.length === 0) {
    return {
      success: false,
      error: "学習データがありません",
      fallbackFeedback: "今日も学習お疲れさま！",
      canRetry: false,
    }
  }

  // ========================================
  // 4. 既存フィードバック確認（サービス層に委譲）
  // ========================================
  const adminClient = createAdminClient()
  const hasReflection = !!(data.reflectionText && data.reflectionText.trim())
  const cacheResult = await checkExistingFeedback(adminClient, clientBatchId, hasReflection)

  if (cacheResult.hit) {
    return {
      success: true,
      feedback: cacheResult.feedbackText,
      fromCache: true,
      savedToDb: true,
    }
  }

  // ========================================
  // 5. AI生成（タイムアウト付き）
  // ========================================
  const langfuse = getLangfuseClient()
  const trace = langfuse?.trace({
    name: "coach-spark-feedback",
    userId: `student-${verifiedStudentId}`,
    metadata: {
      promptVersion: PROMPT_VERSION,
      subjectCount: data.subjects.length,
      streak: data.streak,
    },
  })

  const controller = new AbortController()
  const timeoutMs = getTimeoutMs(data.subjects.length)
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const systemPrompt = getSystemPrompt()
    const userPrompt = getUserPrompt(data)
    const promptHash = getPromptHash(systemPrompt, userPrompt)

    const generation = trace?.generation({
      name: "generate-feedback",
      model: "auto",
      input: { systemPrompt, userPrompt },
      metadata: { promptVersion: PROMPT_VERSION, promptHash },
    })

    const llmResult = await callLLM(systemPrompt, userPrompt, controller.signal)

    clearTimeout(timeoutId)

    const generatedFeedback = llmResult.text

    generation?.end({
      output: generatedFeedback,
      model: llmResult.model,
      metadata: { provider: llmResult.provider },
    })

    // ========================================
    // 6. DB保存（サービス層に委譲）
    // ========================================
    const saveResult = await saveFeedbackToDb(adminClient, {
      batchId: clientBatchId,
      studyLogId: representativeStudyLogId,
      studentId: verifiedStudentId,
      sessionId: verifiedSessionId,
      feedbackText: generatedFeedback,
      promptVersion: PROMPT_VERSION,
      promptHash,
      langfuseTraceId: trace?.id || null,
    })

    if (!saveResult.saved && saveResult.existingText) {
      return {
        success: true,
        feedback: saveResult.existingText,
        fromCache: true,
        savedToDb: true,
      }
    }

    return {
      success: true,
      feedback: generatedFeedback,
      savedToDb: saveResult.saved,
    }
  } catch (error) {
    clearTimeout(timeoutId)

    const isAborted = error instanceof Error && error.name === "AbortError"
    const errorMessage = error instanceof Error ? error.message : "Unknown error"

    console.error("[Coach Feedback] Generation failed:", sanitizeForLog({
      isTimeout: isAborted,
      error: errorMessage,
      batchId: clientBatchId,
      studentId: verifiedStudentId,
      subjectCount: data.subjects.length,
    }))

    trace?.update({
      metadata: { error: errorMessage, isTimeout: isAborted },
    })

    // フォールバックメッセージをDB保存（サービス層に委譲）
    const fallbackMessage = getFallbackFeedback(data)
    const savedFallbackToDb = await saveFallbackToDb(adminClient, {
      batchId: clientBatchId,
      studyLogId: representativeStudyLogId,
      studentId: verifiedStudentId,
      sessionId: verifiedSessionId,
      feedbackText: fallbackMessage,
      promptVersion: PROMPT_VERSION,
      langfuseTraceId: trace?.id || null,
    })

    return {
      success: false,
      error: isAborted
        ? "コーチメッセージの生成がタイムアウトしました"
        : "コーチメッセージの生成に失敗しました",
      fallbackFeedback: fallbackMessage,
      canRetry: !savedFallbackToDb,
    }
  } finally {
    await flushLangfuse()
  }
}

/**
 * フィードバック再保存（生成済みだがDB未保存の場合）
 * SSE化後もこのServer Actionは維持（リトライボタンから使用）。
 */
export async function retryCoachFeedbackSave(
  clientBatchId: string,
  clientStudyLogId: number,
  feedbackText: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, error: "認証エラー" }
  }

  const { data: studentRecord, error: studentError } = await supabase
    .from("students")
    .select("id")
    .eq("user_id", user.id)
    .single()

  if (studentError || !studentRecord) {
    return { success: false, error: "生徒情報の取得に失敗しました" }
  }

  const { data: batchLogs, error: logError } = await supabase
    .from("study_logs")
    .select("id, student_id, session_id, batch_id")
    .eq("batch_id", clientBatchId)

  if (logError || !batchLogs || batchLogs.length === 0) {
    return { success: false, error: "学習記録の検証に失敗しました" }
  }

  if (!batchLogs.every(log => log.student_id === studentRecord.id)) {
    return { success: false, error: "学習記録の検証に失敗しました" }
  }

  const sessionId = batchLogs[0]?.session_id

  const adminClient = createAdminClient()

  const { error: insertError } = await adminClient.from("coach_feedbacks").insert({
    batch_id: clientBatchId,
    study_log_id: clientStudyLogId,
    student_id: studentRecord.id,
    session_id: sessionId,
    feedback_text: feedbackText,
    prompt_version: PROMPT_VERSION,
    prompt_hash: null,
    langfuse_trace_id: null,
  })

  if (insertError) {
    if (insertError.code === "23505") {
      return { success: true }
    }
    console.error("Retry save failed:", sanitizeForLog(insertError))
    return { success: false, error: "保存に失敗しました" }
  }

  return { success: true }
}

// ============================================================================
// レガシーフォールバック関数
// ============================================================================

/**
 * レガシーモード: batch_idがない場合のフィードバック生成
 * 既存のstudy_log_idベースの処理を行う
 */
async function generateLegacyFeedback(
  supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never,
  verifiedStudentId: number,
  clientSessionId: number,
  clientStudyLogIds: number[],
  data: StudyDataForFeedback
): Promise<GenerateFeedbackResult> {
  const { data: fallbackLogs, error: fallbackError } = await supabase
    .from("study_logs")
    .select("id, student_id, session_id")
    .in("id", clientStudyLogIds)

  if (fallbackError || !fallbackLogs || fallbackLogs.length === 0) {
    return {
      success: false,
      error: "学習記録が見つかりません",
      fallbackFeedback: getFallbackFeedback(data),
      canRetry: false,
    }
  }

  if (!fallbackLogs.every((log: { student_id: number }) => log.student_id === verifiedStudentId)) {
    return {
      success: false,
      error: "権限エラー: この学習記録へのアクセス権がありません",
      fallbackFeedback: getFallbackFeedback(data),
      canRetry: false,
    }
  }

  if (!fallbackLogs.every((log: { session_id: number }) => log.session_id === clientSessionId)) {
    return {
      success: false,
      error: "セッション情報の整合性エラー",
      fallbackFeedback: getFallbackFeedback(data),
      canRetry: false,
    }
  }

  const representativeStudyLogId = clientStudyLogIds[0]

  if (!data.subjects || data.subjects.length === 0) {
    return {
      success: false,
      error: "学習データがありません",
      fallbackFeedback: "今日も学習お疲れさま！",
      canRetry: false,
    }
  }

  const adminClient = createAdminClient()
  const { data: existing } = await adminClient
    .from("coach_feedbacks")
    .select("feedback_text")
    .eq("study_log_id", representativeStudyLogId)
    .single()

  if (existing) {
    return {
      success: true,
      feedback: existing.feedback_text,
      fromCache: true,
      savedToDb: true,
    }
  }

  const langfuse = getLangfuseClient()
  const trace = langfuse?.trace({
    name: "coach-spark-feedback-legacy",
    userId: `student-${verifiedStudentId}`,
    metadata: {
      promptVersion: PROMPT_VERSION,
      subjectCount: data.subjects.length,
      legacy: true,
    },
  })

  const controller = new AbortController()
  const timeoutMs = getTimeoutMs(data.subjects.length)
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const systemPrompt = getSystemPrompt()
    const userPrompt = getUserPrompt(data)
    const promptHash = getPromptHash(systemPrompt, userPrompt)

    const generation = trace?.generation({
      name: "generate-feedback-legacy",
      model: "auto",
      input: { systemPrompt, userPrompt },
      metadata: { promptVersion: PROMPT_VERSION, promptHash },
    })

    const llmResult = await callLLM(systemPrompt, userPrompt, controller.signal)

    clearTimeout(timeoutId)

    const generatedFeedback = llmResult.text

    generation?.end({
      output: generatedFeedback,
      model: llmResult.model,
      metadata: { provider: llmResult.provider },
    })

    const { error: insertError } = await adminClient.from("coach_feedbacks").insert({
      study_log_id: representativeStudyLogId,
      student_id: verifiedStudentId,
      session_id: clientSessionId,
      feedback_text: generatedFeedback,
      prompt_version: PROMPT_VERSION,
      prompt_hash: promptHash,
      langfuse_trace_id: trace?.id || null,
    })

    if (insertError) {
      if (insertError.code === "23505") {
        const { data: existingAfterConflict } = await adminClient
          .from("coach_feedbacks")
          .select("feedback_text")
          .eq("study_log_id", representativeStudyLogId)
          .single()

        if (existingAfterConflict) {
          return {
            success: true,
            feedback: existingAfterConflict.feedback_text,
            fromCache: true,
            savedToDb: true,
          }
        }
      }

      console.error("Failed to save legacy feedback to DB:", sanitizeForLog(insertError))
      return {
        success: true,
        feedback: generatedFeedback,
        savedToDb: false,
      }
    }

    return {
      success: true,
      feedback: generatedFeedback,
      savedToDb: true,
    }
  } catch (error) {
    clearTimeout(timeoutId)

    const isAborted = error instanceof Error && error.name === "AbortError"
    const errorMessage = error instanceof Error ? error.message : "Unknown error"

    console.error("[Coach Feedback Legacy] Generation failed:", sanitizeForLog({
      isTimeout: isAborted,
      error: errorMessage,
      studentId: verifiedStudentId,
      studyLogId: representativeStudyLogId,
      subjectCount: data.subjects.length,
    }))

    const fallbackMessage = getFallbackFeedback(data)
    let savedFallbackToDb = false

    try {
      const { error: fallbackInsertError } = await adminClient.from("coach_feedbacks").insert({
        study_log_id: representativeStudyLogId,
        student_id: verifiedStudentId,
        session_id: clientSessionId,
        feedback_text: fallbackMessage,
        prompt_version: `${PROMPT_VERSION}-fallback`,
        prompt_hash: null,
        langfuse_trace_id: trace?.id || null,
      })

      if (!fallbackInsertError) {
        savedFallbackToDb = true
      } else if (fallbackInsertError.code === "23505") {
        savedFallbackToDb = true
      } else {
        console.error("[Coach Feedback Legacy] Failed to save fallback:", sanitizeForLog({
          code: fallbackInsertError.code,
          message: fallbackInsertError.message,
          details: fallbackInsertError.details,
          hint: fallbackInsertError.hint,
        }))
      }
    } catch (saveError) {
      console.error("[Coach Feedback Legacy] Exception saving fallback:", sanitizeForLog(saveError))
    }

    return {
      success: false,
      error: isAborted
        ? "コーチメッセージの生成がタイムアウトしました"
        : "コーチメッセージの生成に失敗しました",
      fallbackFeedback: fallbackMessage,
      canRetry: !savedFallbackToDb,
    }
  } finally {
    await flushLangfuse()
  }
}
