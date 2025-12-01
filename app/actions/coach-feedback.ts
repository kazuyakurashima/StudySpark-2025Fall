"use server"

import { getLangfuseClient, flushLangfuse } from "@/lib/langfuse/client"
import { getOpenAIClient, getDefaultModel } from "@/lib/openai/client"
import { createClient, createAdminClient } from "@/lib/supabase/server"
import crypto from "crypto"

// ============================================================================
// 定数
// ============================================================================
const PROMPT_VERSION = "v1.0"
const GENERATION_TIMEOUT_MS = 3000

// ============================================================================
// 型定義
// ============================================================================
export type StudyDataForFeedback = {
  subjects: {
    name: string
    correct: number
    total: number
    accuracy: number
  }[]
  studentName?: string
  streak?: number
  previousAccuracy?: number
  reflectionText?: string
}

type GenerateFeedbackSuccess = {
  success: true
  feedback: string
  fromCache?: boolean
  savedToDb: boolean
}

type GenerateFeedbackError = {
  success: false
  error: string
  fallbackFeedback: string
  canRetry: boolean
}

export type GenerateFeedbackResult = GenerateFeedbackSuccess | GenerateFeedbackError

// ============================================================================
// ユーティリティ関数
// ============================================================================

/**
 * プロンプトハッシュ生成（監査用）
 */
function getPromptHash(systemPrompt: string, userPrompt: string): string {
  return crypto
    .createHash("sha256")
    .update(systemPrompt + userPrompt)
    .digest("hex")
    .substring(0, 16)
}

/**
 * システムプロンプト
 */
function getSystemPrompt(): string {
  return `あなたは中学受験を目指す小学生を応援するAIコーチです。

【役割】
学習記録を見て、頑張りを認め、励ます短いメッセージを生成します。

【セルフコンパッション原則】
- 結果ではなく、取り組んだ過程・努力を認める
- 完璧を求めず、挑戦したこと自体を称える
- 失敗を責めず、学びの機会として捉える

【コンテキスト活用】
- 連続学習日数があれば継続を称える
- 前回より正答率が上がっていれば成長を強調
- 複数科目に取り組んだ場合はその努力を認める
- 生徒の振り返りコメントがあれば、その気持ちに共感し言及する

【正答率別トーン】
- 80%以上: 達成を称える
- 50-79%: 挑戦を認める + 「次は〇〇してみよう」の一言
- 50%未満: 取り組みを肯定 + 「間違いは成長のチャンス」+ 具体的な次の一歩

【出力】
- 40〜100文字
- 具体的な数字に言及
- 温かく親しみやすい言葉
- 振り返りがある場合は、その内容に触れる`
}

/**
 * ユーザープロンプト
 */
function getUserPrompt(data: StudyDataForFeedback): string {
  const details = data.subjects
    .map((s) => `${s.name}: ${s.correct}/${s.total}問正解（${s.accuracy}%）`)
    .join("\n")

  let context = ""
  if (data.streak && data.streak >= 3) {
    context += `\n連続学習日数: ${data.streak}日`
  }
  if (data.previousAccuracy !== undefined && data.subjects.length > 0) {
    const currentAvg =
      data.subjects.reduce((sum, s) => sum + s.accuracy, 0) / data.subjects.length
    const diff = Math.round(currentAvg - data.previousAccuracy)
    if (diff > 0) {
      context += `\n前回比: +${diff}%アップ`
    }
  }

  let reflection = ""
  if (data.reflectionText && data.reflectionText.trim()) {
    reflection = `\n\n生徒の振り返りコメント:\n「${data.reflectionText.trim()}」`
  }

  return `今日の学習記録:
${details}${context}${reflection}

この記録に対して、生徒を励ます短いメッセージを生成してください。`
}

/**
 * フォールバックメッセージ（AI生成失敗時）
 * 内部専用 - Server Action内でのみ使用
 */
function getFallbackFeedback(data: StudyDataForFeedback): string {
  const totalSubjects = data.subjects.length
  const avgAccuracy =
    data.subjects.reduce((sum, s) => sum + s.accuracy, 0) / (totalSubjects || 1)

  if (totalSubjects >= 3) {
    return `${totalSubjects}科目も頑張ったね！ナイスチャレンジ！`
  } else if (avgAccuracy >= 80) {
    return `よく頑張ったね！素晴らしい集中力だ！`
  } else if (avgAccuracy >= 50) {
    return `しっかり取り組めたね！その調子！`
  } else {
    return `今日も学習に挑戦したね！その努力が大事だよ！`
  }
}

// ============================================================================
// メイン関数
// ============================================================================

/**
 * コーチフィードバック生成
 *
 * セキュリティ:
 * 1. ログインユーザーを認証
 * 2. そのユーザーが所有するstudent_idを取得
 * 3. クライアントが渡したIDと照合
 * 4. batch内の全study_logsの所有権・整合性を検証
 * 5. 検証後、サービスロールでINSERT
 *
 * @param clientStudentId - 生徒ID
 * @param clientSessionId - セッションID
 * @param clientBatchId - バッチID
 * @param clientStudyLogIds - 検証用のstudy_log_id配列
 * @param data - フィードバック生成用データ
 */
export async function generateCoachFeedback(
  clientStudentId: number,
  clientSessionId: number,
  clientBatchId: string,
  clientStudyLogIds: number[],
  data: StudyDataForFeedback
): Promise<GenerateFeedbackResult> {
  // ========================================
  // 1. 認証・権限検証（最重要）
  // ========================================
  const supabase = await createClient()

  // ログインユーザー取得
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    console.error("Authentication failed:", authError)
    return {
      success: false,
      error: "認証エラー: ログインしてください",
      fallbackFeedback: getFallbackFeedback(data),
      canRetry: false,
    }
  }

  // ログインユーザーのstudent_idを取得
  const { data: studentRecord, error: studentError } = await supabase
    .from("students")
    .select("id")
    .eq("user_id", user.id)
    .single()

  if (studentError || !studentRecord) {
    console.error("Student lookup failed:", studentError)
    return {
      success: false,
      error: "生徒情報の取得に失敗しました",
      fallbackFeedback: getFallbackFeedback(data),
      canRetry: false,
    }
  }

  // クライアントが渡したstudentIdと照合
  if (studentRecord.id !== clientStudentId) {
    console.error("Student ID mismatch:", {
      expected: studentRecord.id,
      received: clientStudentId,
    })
    return {
      success: false,
      error: "権限エラー: 他の生徒のデータにはアクセスできません",
      fallbackFeedback: getFallbackFeedback(data),
      canRetry: false,
    }
  }

  const verifiedStudentId = studentRecord.id

  // ========================================
  // 2. batch内の全study_logsの所有権・整合性を検証
  // ========================================

  // まずbatch_idでログを取得
  const { data: batchLogs, error: batchError } = await supabase
    .from("study_logs")
    .select("id, student_id, session_id, batch_id")
    .eq("batch_id", clientBatchId)

  if (batchError) {
    console.error("Batch logs lookup failed:", batchError)
    return {
      success: false,
      error: "学習記録の取得に失敗しました",
      fallbackFeedback: getFallbackFeedback(data),
      canRetry: false,
    }
  }

  // batch_idで取得できなかった場合、studyLogIdsでフォールバック検証（レガシー対応）
  if (!batchLogs || batchLogs.length === 0) {
    console.log("No logs found with batch_id, falling back to legacy mode")
    return await generateLegacyFeedback(
      supabase,
      verifiedStudentId,
      clientSessionId,
      clientStudyLogIds,
      data
    )
  }

  // クライアントから渡されたstudyLogIdsとbatch内のIDが一致するか検証
  const batchLogIds = new Set(batchLogs.map(log => log.id))
  const allClientIdsInBatch = clientStudyLogIds.every(id => batchLogIds.has(id))

  if (!allClientIdsInBatch) {
    console.error("Client studyLogIds mismatch with batch:", {
      clientIds: clientStudyLogIds,
      batchIds: Array.from(batchLogIds),
    })
    return {
      success: false,
      error: "学習記録の整合性エラー",
      fallbackFeedback: getFallbackFeedback(data),
      canRetry: false,
    }
  }

  // 全ログが同一student_id か検証
  if (!batchLogs.every(log => log.student_id === verifiedStudentId)) {
    console.error("Batch logs ownership mismatch")
    return {
      success: false,
      error: "権限エラー: この学習記録へのアクセス権がありません",
      fallbackFeedback: getFallbackFeedback(data),
      canRetry: false,
    }
  }

  // 全ログが同一session_id か検証（エラーにする）
  if (!batchLogs.every(log => log.session_id === clientSessionId)) {
    console.error("Session ID inconsistency in batch:", {
      batchId: clientBatchId,
      sessions: batchLogs.map(log => log.session_id),
    })
    return {
      success: false,
      error: "セッション情報の整合性エラー",
      fallbackFeedback: getFallbackFeedback(data),
      canRetry: false,
    }
  }

  const verifiedSessionId = clientSessionId
  const verifiedBatchId = clientBatchId
  const representativeStudyLogId = clientStudyLogIds[0] // 代表として先頭を使用

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
  // 4. 既存フィードバック確認（サービスロール）- batch_id で検索
  // ========================================
  console.log("Creating admin client...")
  const adminClient = createAdminClient()
  console.log("Admin client created successfully")

  const { data: existing } = await adminClient
    .from("coach_feedbacks")
    .select("id, feedback_text")
    .eq("batch_id", verifiedBatchId)
    .single()

  // 振り返りテキストがある場合、既存フィードバックを削除して再生成
  // （ユーザーが後から振り返りを追加した場合に対応）
  if (existing && data.reflectionText && data.reflectionText.trim()) {
    console.log("[Coach Feedback] Reflection text provided but cache exists - regenerating. batch:", verifiedBatchId)
    // 既存フィードバックを削除
    await adminClient
      .from("coach_feedbacks")
      .delete()
      .eq("id", existing.id)
    console.log("[Coach Feedback] Deleted existing feedback for regeneration")
  } else if (existing) {
    console.log("[Coach Feedback] Cache HIT - returning existing feedback for batch:", verifiedBatchId)
    return {
      success: true,
      feedback: existing.feedback_text,
      fromCache: true,
      savedToDb: true,
    }
  }
  console.log("[Coach Feedback] Cache MISS - generating new feedback for batch:", verifiedBatchId)

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
  const timeoutId = setTimeout(() => controller.abort(), GENERATION_TIMEOUT_MS)

  try {
    const openai = getOpenAIClient()
    const systemPrompt = getSystemPrompt()
    const userPrompt = getUserPrompt(data)
    const promptHash = getPromptHash(systemPrompt, userPrompt)

    // デバッグログ: reflectionTextがプロンプトに含まれているか確認
    console.log("[Coach Feedback] reflectionText received:", data.reflectionText || "(empty)")
    console.log("[Coach Feedback] userPrompt:", userPrompt)

    const generation = trace?.generation({
      name: "generate-feedback",
      model: getDefaultModel(),
      input: { systemPrompt, userPrompt },
      metadata: { promptVersion: PROMPT_VERSION, promptHash },
    })

    const response = await openai.chat.completions.create(
      {
        model: getDefaultModel(),
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_completion_tokens: 150,
      },
      { signal: controller.signal }
    )

    clearTimeout(timeoutId)

    const generatedFeedback = response.choices[0]?.message?.content?.trim() || null

    if (!generatedFeedback) {
      throw new Error("Empty response from OpenAI")
    }

    generation?.end({ output: generatedFeedback })

    // ========================================
    // 6. DB保存（サービスロール）- batch_id ベース
    // ========================================
    console.log("Attempting coach_feedback insert with:", {
      batch_id: verifiedBatchId,
      study_log_id: representativeStudyLogId,
      student_id: verifiedStudentId,
      session_id: verifiedSessionId,
      feedback_length: generatedFeedback.length,
      prompt_version: PROMPT_VERSION,
    })

    const { error: insertError } = await adminClient.from("coach_feedbacks").insert({
      batch_id: verifiedBatchId,
      study_log_id: representativeStudyLogId, // 代表の1件を設定（NOT NULL維持）
      student_id: verifiedStudentId,
      session_id: verifiedSessionId,
      feedback_text: generatedFeedback,
      prompt_version: PROMPT_VERSION,
      prompt_hash: promptHash,
      langfuse_trace_id: trace?.id || null,
    })

    if (insertError) {
      if (insertError.code === "23505") {
        // UNIQUE違反 - 既存を返す（batch_idで検索）
        const { data: existingAfterConflict } = await adminClient
          .from("coach_feedbacks")
          .select("feedback_text")
          .eq("batch_id", verifiedBatchId)
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

      // DB保存失敗 - 生成済みフィードバックは返すが、保存失敗を明示
      console.error("Failed to save feedback to DB:", {
        code: insertError.code,
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
        insertData: {
          batch_id: verifiedBatchId,
          study_log_id: representativeStudyLogId,
          student_id: verifiedStudentId,
          session_id: verifiedSessionId,
        },
      })
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

    console.error("Coach feedback generation error:", errorMessage)

    trace?.update({
      metadata: { error: errorMessage, isTimeout: isAborted },
    })

    return {
      success: false,
      error: isAborted
        ? "コーチメッセージの生成がタイムアウトしました"
        : "コーチメッセージの生成に失敗しました",
      fallbackFeedback: getFallbackFeedback(data),
      canRetry: true,
    }
  } finally {
    await flushLangfuse()
  }
}

/**
 * フィードバック再保存（生成済みだがDB未保存の場合）
 *
 * @param clientBatchId - バッチID
 * @param clientStudyLogId - 代表のstudy_log_id
 * @param feedbackText - 保存するフィードバックテキスト
 */
export async function retryCoachFeedbackSave(
  clientBatchId: string,
  clientStudyLogId: number,
  feedbackText: string
): Promise<{ success: boolean; error?: string }> {
  // ========================================
  // 認証・検証
  // ========================================
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, error: "認証エラー" }
  }

  // ログインユーザーのstudent_idを取得
  const { data: studentRecord, error: studentError } = await supabase
    .from("students")
    .select("id")
    .eq("user_id", user.id)
    .single()

  if (studentError || !studentRecord) {
    return { success: false, error: "生徒情報の取得に失敗しました" }
  }

  // batch_id で study_logs を取得して所有権検証
  const { data: batchLogs, error: logError } = await supabase
    .from("study_logs")
    .select("id, student_id, session_id, batch_id")
    .eq("batch_id", clientBatchId)

  if (logError || !batchLogs || batchLogs.length === 0) {
    return { success: false, error: "学習記録の検証に失敗しました" }
  }

  // 全ログが同一student_id か検証
  if (!batchLogs.every(log => log.student_id === studentRecord.id)) {
    return { success: false, error: "学習記録の検証に失敗しました" }
  }

  const sessionId = batchLogs[0]?.session_id

  // ========================================
  // 保存
  // ========================================
  const adminClient = createAdminClient()

  const { error: insertError } = await adminClient.from("coach_feedbacks").insert({
    batch_id: clientBatchId,
    study_log_id: clientStudyLogId, // 代表の1件
    student_id: studentRecord.id,
    session_id: sessionId,
    feedback_text: feedbackText,
    prompt_version: PROMPT_VERSION,
    prompt_hash: null,
    langfuse_trace_id: null,
  })

  if (insertError) {
    if (insertError.code === "23505") {
      // 既に保存済み
      return { success: true }
    }
    console.error("Retry save failed:", insertError)
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
  supabase: any,
  verifiedStudentId: number,
  clientSessionId: number,
  clientStudyLogIds: number[],
  data: StudyDataForFeedback
): Promise<GenerateFeedbackResult> {
  // studyLogIdsで検証
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

  // 所有権検証
  if (!fallbackLogs.every((log: any) => log.student_id === verifiedStudentId)) {
    return {
      success: false,
      error: "権限エラー: この学習記録へのアクセス権がありません",
      fallbackFeedback: getFallbackFeedback(data),
      canRetry: false,
    }
  }

  // セッション整合性検証
  if (!fallbackLogs.every((log: any) => log.session_id === clientSessionId)) {
    return {
      success: false,
      error: "セッション情報の整合性エラー",
      fallbackFeedback: getFallbackFeedback(data),
      canRetry: false,
    }
  }

  const representativeStudyLogId = clientStudyLogIds[0]

  // 入力データ検証
  if (!data.subjects || data.subjects.length === 0) {
    return {
      success: false,
      error: "学習データがありません",
      fallbackFeedback: "今日も学習お疲れさま！",
      canRetry: false,
    }
  }

  // 既存フィードバック確認（study_log_id で検索）
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

  // AI生成
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
  const timeoutId = setTimeout(() => controller.abort(), GENERATION_TIMEOUT_MS)

  try {
    const openai = getOpenAIClient()
    const systemPrompt = getSystemPrompt()
    const userPrompt = getUserPrompt(data)
    const promptHash = getPromptHash(systemPrompt, userPrompt)

    const generation = trace?.generation({
      name: "generate-feedback-legacy",
      model: getDefaultModel(),
      input: { systemPrompt, userPrompt },
      metadata: { promptVersion: PROMPT_VERSION, promptHash },
    })

    const response = await openai.chat.completions.create(
      {
        model: getDefaultModel(),
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_completion_tokens: 150,
      },
      { signal: controller.signal }
    )

    clearTimeout(timeoutId)

    const generatedFeedback = response.choices[0]?.message?.content?.trim() || null

    if (!generatedFeedback) {
      throw new Error("Empty response from OpenAI")
    }

    generation?.end({ output: generatedFeedback })

    // DB保存（レガシーモード: batch_id なし）
    const { error: insertError } = await adminClient.from("coach_feedbacks").insert({
      study_log_id: representativeStudyLogId,
      student_id: verifiedStudentId,
      session_id: clientSessionId,
      feedback_text: generatedFeedback,
      prompt_version: PROMPT_VERSION,
      prompt_hash: promptHash,
      langfuse_trace_id: trace?.id || null,
      // batch_id は設定しない（レガシー）
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

      console.error("Failed to save legacy feedback to DB:", insertError)
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

    console.error("Legacy coach feedback generation error:", errorMessage)

    return {
      success: false,
      error: isAborted
        ? "コーチメッセージの生成がタイムアウトしました"
        : "コーチメッセージの生成に失敗しました",
      fallbackFeedback: getFallbackFeedback(data),
      canRetry: true,
    }
  } finally {
    await flushLangfuse()
  }
}
