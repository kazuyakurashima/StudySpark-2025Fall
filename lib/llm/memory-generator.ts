/**
 * 長期メモリ生成・更新ロジック (Phase 3)
 *
 * - generateStudentMemory(): 8週分の学習データをLLMで要約し構造化データを返却
 * - appendDailyDelta(): LLM不使用のルールベース差分更新
 */

import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"
import { getModelForModule, getGeminiClient } from "./client"
import { getOpenAIClient } from "@/lib/openai/client"
import { sanitizeForLog } from "./logger"
import { getWeeksAgoJST, getTodayJST } from "@/lib/utils/date-jst"

// ============================================================================
// 型定義
// ============================================================================

/** LLM生成後の構造化メモリデータ */
export interface StudentMemoryData {
  compactSummary: string
  detailedSummary: string
  subjectTrends: Record<string, string>
  stumblingPatterns: Record<string, string>
  effectiveEncouragements: Record<string, string>
  recentSuccesses: Record<string, string>
  emotionalTendencies: Record<string, string>
  lastStudyLogId: number
  dataWindowStart: string
  dataWindowEnd: string
  weeksCovered: number
}

/** SQL集計結果の中間型 */
interface AggregatedData {
  student: { full_name: string; grade: number; course: string | null }
  weeklySubjectStats: WeeklySubjectStat[]
  coachingSummaries: CoachingSummary[]
  weeklyAnalyses: WeeklyAnalysisEntry[]
  maxStudyLogId: number
}

interface WeeklySubjectStat {
  weekLabel: string
  subject: string
  correctCount: number
  totalProblems: number
  accuracy: number
}

interface CoachingSummary {
  summaryText: string
  weekType: string | null
}

interface WeeklyAnalysisEntry {
  strengths: string | null
  challenges: string | null
  weekStartDate: string
}

// ============================================================================
// 定数
// ============================================================================

const DATA_WINDOW_WEEKS = 8
const COMPACT_SUMMARY_MAX_CHARS = 750 // ~500トークン (日本語1文字 ≈ 1.5トークン)

const MEMORY_SYSTEM_PROMPT = `あなたは中学受験を目指す小学生の学習コーチです。
8週間分の学習データを分析し、この生徒の長期的な傾向を要約してください。

以下の形式で出力してください：

---compact_summary---
（日次コーチメッセージ用の簡潔な要約。200-500トークン以内。
生徒の強み、課題、最近の傾向を箇条書きで。
コーチが毎日のメッセージ作成時に参照する前提で書くこと。）

---detailed_summary---
（週次振り返り用の詳細な要約。500-1000トークン以内。
科目ごとの傾向、つまずきパターン、効果的だった学習方法、
感情面の変化などを含む。振り返り対話の冒頭で参照する前提。）

---subject_trends---
（科目別の傾向をJSON形式で。例: {"算数": "上昇傾向。特に図形分野が伸びている", "国語": "安定。読解は得意だが漢字が課題"}）

---stumbling_patterns---
（つまずきパターンをJSON形式で。例: {"頻出": "計算ミスが多い週は正答率が10%下がる", "条件": "テスト前に焦ると理科が落ちる"}）

---effective_encouragements---
（効果的だった励まし方をJSON形式で。例: {"タイプ": "具体的な努力を認める声かけが効果的", "注意": "結果より過程に焦点を当てる"}）

---recent_successes---
（直近の成功体験をJSON形式で。例: {"最近": "算数の正答率が3週連続で80%超え", "特筆": "苦手だった図形で90%を達成"}）

---emotional_tendencies---
（感情的傾向をJSON形式で。例: {"全体": "安定して前向き", "注意点": "テスト前に不安が高まりやすい"}）`

// ============================================================================
// メイン関数: 週次フル生成
// ============================================================================

/**
 * 8週分の学習データを集計し、LLMで要約して構造化メモリを生成
 *
 * @param serviceClient RLSバイパス用サービスクライアント（Cronから渡される）
 * @param studentId 対象生徒ID
 */
export async function generateStudentMemory(
  serviceClient: SupabaseClient,
  studentId: number,
): Promise<StudentMemoryData> {
  // Step 1: SQL集計
  const aggregated = await aggregateStudentData(serviceClient, studentId)

  // 空データ（新規生徒）の場合は空メモリを返す
  if (aggregated.weeklySubjectStats.length === 0 && aggregated.coachingSummaries.length === 0) {
    return {
      compactSummary: "",
      detailedSummary: "",
      subjectTrends: {},
      stumblingPatterns: {},
      effectiveEncouragements: {},
      recentSuccesses: {},
      emotionalTendencies: {},
      lastStudyLogId: aggregated.maxStudyLogId,
      dataWindowStart: getWeeksAgoJST(DATA_WINDOW_WEEKS),
      dataWindowEnd: getTodayJST(),
      weeksCovered: 0,
    }
  }

  // Step 2: プロンプト構築
  const userPrompt = buildMemoryPrompt(aggregated)

  // Step 3: LLM要約
  const rawResponse = await callMemoryLLM(userPrompt)

  // Step 4: パース & 返却
  const parsed = parseMemoryResponse(rawResponse)

  return {
    ...parsed,
    lastStudyLogId: aggregated.maxStudyLogId,
    dataWindowStart: getWeeksAgoJST(DATA_WINDOW_WEEKS),
    dataWindowEnd: getTodayJST(),
    weeksCovered: DATA_WINDOW_WEEKS,
  }
}

// ============================================================================
// メイン関数: 日次差分更新
// ============================================================================

/**
 * LLM不使用のルールベース差分更新
 *
 * study_logsの新規追加・更新分を検出し、compact_summaryに1行追記する。
 * 既存行のUPDATE（logged_at更新）も検出するため、id > last_id OR logged_at > last_delta_at の複合条件を使用。
 *
 * @param serviceClient RLSバイパス用サービスクライアント（Cronから渡される）
 * @param studentId 対象生徒ID
 * @returns 更新があった場合 true, なければ false
 */
export async function appendDailyDelta(
  serviceClient: SupabaseClient,
  studentId: number,
): Promise<boolean> {
  // 1. 現在のメモリ行を取得
  const { data: memory, error: memError } = await serviceClient
    .from("student_memory_summaries")
    .select("id, last_study_log_id, last_delta_at, compact_summary")
    .eq("student_id", studentId)
    .single()

  if (memError || !memory) {
    // 週次で未作成の生徒はスキップ
    return false
  }

  const lastId = memory.last_study_log_id ?? 0
  const lastDeltaAt = memory.last_delta_at ?? new Date(0).toISOString()

  // 2. 新規 or 更新された study_logs を科目別集計
  const { data: logs, error: logsError } = await serviceClient
    .from("study_logs")
    .select("id, subject_id, correct_count, total_problems, study_date, subjects(name)")
    .eq("student_id", studentId)
    .or(`id.gt.${lastId},logged_at.gt.${lastDeltaAt}`)
    .order("study_date", { ascending: false })

  if (logsError) {
    console.error(`[appendDailyDelta] study_logs query error for student ${studentId}:`, sanitizeForLog(logsError))
    return false
  }

  if (!logs || logs.length === 0) {
    return false
  }

  // 3. 日付×科目で集計
  const dateSubjectMap = new Map<string, Map<string, { correct: number; total: number }>>()
  let newMaxId = lastId

  for (const log of logs) {
    const date = log.study_date as string
    const subjectName = extractSubjectName(log.subjects)
    if (log.id > newMaxId) newMaxId = log.id

    if (!dateSubjectMap.has(date)) {
      dateSubjectMap.set(date, new Map())
    }
    const subjectMap = dateSubjectMap.get(date)!
    const existing = subjectMap.get(subjectName) ?? { correct: 0, total: 0 }
    existing.correct += log.correct_count
    existing.total += log.total_problems
    subjectMap.set(subjectName, existing)
  }

  // 4. 1行フォーマット（日付ごと）
  const newLines: string[] = []
  for (const [date, subjectMap] of dateSubjectMap) {
    const mmdd = date.slice(5).replace("-", "/") // "2026-03-13" → "03/13"
    const parts: string[] = []
    for (const [subject, stats] of subjectMap) {
      const accuracy = Math.round((stats.correct / stats.total) * 100)
      parts.push(`${subject}${accuracy}%`)
    }
    newLines.push(`[${mmdd}] ${parts.join(" ")}`)
  }

  // 5. compact_summary にマージ（同日キーで上書き、重複防止）
  const existingSummary = memory.compact_summary ?? ""
  const existingLines = existingSummary.split("\n").filter((l: string) => l.trim())

  // 既存行を MM/DD キーでインデックス化
  const lineMap = new Map<string, string>()
  for (const line of existingLines) {
    const keyMatch = line.match(/^\[(\d{2}\/\d{2})\]/)
    if (keyMatch) {
      lineMap.set(keyMatch[1], line)
    } else {
      // キーなし行はそのまま保持（LLM生成の要約行など）
      lineMap.set(`_no_key_${lineMap.size}`, line)
    }
  }

  // 新しい行で上書きマージ
  for (const newLine of newLines) {
    const keyMatch = newLine.match(/^\[(\d{2}\/\d{2})\]/)
    if (keyMatch) {
      lineMap.set(keyMatch[1], newLine) // 同日なら上書き
    } else {
      lineMap.set(`_new_${lineMap.size}`, newLine)
    }
  }

  let updatedSummary = [...lineMap.values()].join("\n")

  // ~750文字超過時は古い行を削除
  while (updatedSummary.length > COMPACT_SUMMARY_MAX_CHARS) {
    const firstNewline = updatedSummary.indexOf("\n")
    if (firstNewline === -1) break
    updatedSummary = updatedSummary.slice(firstNewline + 1)
  }

  // 6. 更新
  const { error: updateError } = await serviceClient
    .from("student_memory_summaries")
    .update({
      compact_summary: updatedSummary,
      last_study_log_id: newMaxId,
      last_delta_at: new Date().toISOString(),
    })
    .eq("id", memory.id)

  if (updateError) {
    console.error(`[appendDailyDelta] update error for student ${studentId}:`, sanitizeForLog(updateError))
    return false
  }

  return true
}

// ============================================================================
// 内部: SQL集計
// ============================================================================

async function aggregateStudentData(
  client: SupabaseClient,
  studentId: number,
): Promise<AggregatedData> {
  const windowStart = getWeeksAgoJST(DATA_WINDOW_WEEKS)
  const today = getTodayJST()

  // 並列実行: 4クエリ
  const [studentResult, logsResult, coachingResult, analysisResult] = await Promise.all([
    // Query 1: 生徒情報
    client
      .from("students")
      .select("full_name, grade, course")
      .eq("id", studentId)
      .single(),

    // Query 2: study_logs + subjects（8週分）
    client
      .from("study_logs")
      .select("id, study_date, correct_count, total_problems, subjects(name)")
      .eq("student_id", studentId)
      .gte("study_date", windowStart)
      .lte("study_date", today)
      .order("study_date", { ascending: true }),

    // Query 3: coaching_sessions（直近8件）
    client
      .from("coaching_sessions")
      .select("summary_text, week_type")
      .eq("student_id", studentId)
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(8),

    // Query 4: weekly_analysis（直近8件）
    client
      .from("weekly_analysis")
      .select("strengths, challenges, week_start_date")
      .eq("student_id", studentId)
      .order("week_start_date", { ascending: false })
      .limit(8),
  ])

  // エラー判定: 必須クエリ（生徒情報）が失敗した場合はエラーを投げる
  if (studentResult.error) {
    throw new Error(`[memory-generator] students query failed: ${studentResult.error.message}`)
  }
  if (logsResult.error) {
    throw new Error(`[memory-generator] study_logs query failed: ${logsResult.error.message}`)
  }
  if (coachingResult.error) {
    console.warn(`[memory-generator] coaching_sessions query failed for student ${studentId}:`, sanitizeForLog(coachingResult.error))
  }
  if (analysisResult.error) {
    console.warn(`[memory-generator] weekly_analysis query failed for student ${studentId}:`, sanitizeForLog(analysisResult.error))
  }

  // 生徒情報
  const student = studentResult.data ?? { full_name: "不明", grade: 5, course: null }

  // study_logs → 週単位×科目の正答率に変換
  const weeklySubjectStats: WeeklySubjectStat[] = []
  if (logsResult.data) {
    const weekMap = new Map<string, Map<string, { correct: number; total: number }>>()

    for (const log of logsResult.data) {
      const weekLabel = getWeekLabel(log.study_date as string)
      const subjectName = extractSubjectName(log.subjects)

      if (!weekMap.has(weekLabel)) weekMap.set(weekLabel, new Map())
      const subjectMap = weekMap.get(weekLabel)!
      const existing = subjectMap.get(subjectName) ?? { correct: 0, total: 0 }
      existing.correct += log.correct_count
      existing.total += log.total_problems
      subjectMap.set(subjectName, existing)
    }

    for (const [weekLabel, subjectMap] of weekMap) {
      for (const [subject, stats] of subjectMap) {
        weeklySubjectStats.push({
          weekLabel,
          subject,
          correctCount: stats.correct,
          totalProblems: stats.total,
          accuracy: Math.round((stats.correct / stats.total) * 100),
        })
      }
    }
  }

  // coaching_sessions
  const coachingSummaries: CoachingSummary[] = (coachingResult.data ?? [])
    .filter((c) => c.summary_text)
    .map((c) => ({
      summaryText: c.summary_text!,
      weekType: c.week_type,
    }))

  // weekly_analysis
  const weeklyAnalyses: WeeklyAnalysisEntry[] = (analysisResult.data ?? []).map((a) => ({
    strengths: a.strengths,
    challenges: a.challenges,
    weekStartDate: a.week_start_date,
  }))

  // maxStudyLogId
  let maxStudyLogId = 0
  if (logsResult.data) {
    for (const log of logsResult.data) {
      if (log.id > maxStudyLogId) maxStudyLogId = log.id
    }
  }

  return { student, weeklySubjectStats, coachingSummaries, weeklyAnalyses, maxStudyLogId }
}

// ============================================================================
// 内部: プロンプト構築
// ============================================================================

function buildMemoryPrompt(data: AggregatedData): string {
  const { student, weeklySubjectStats, coachingSummaries, weeklyAnalyses } = data

  let prompt = `【生徒情報】
名前: ${student.full_name}
学年: ${student.grade === 5 ? "小学5年" : "小学6年"}
コース: ${student.course ?? "未設定"}

【科目別 週次正答率（${DATA_WINDOW_WEEKS}週分）】
`

  // 週×科目テーブル
  if (weeklySubjectStats.length > 0) {
    const weeks = [...new Set(weeklySubjectStats.map((s) => s.weekLabel))].sort()
    const subjects = [...new Set(weeklySubjectStats.map((s) => s.subject))]

    for (const week of weeks) {
      const parts = subjects
        .map((subj) => {
          const stat = weeklySubjectStats.find((s) => s.weekLabel === week && s.subject === subj)
          return stat ? `${subj}: ${stat.accuracy}% (${stat.correctCount}/${stat.totalProblems})` : null
        })
        .filter(Boolean)
      prompt += `${week}: ${parts.join(", ")}\n`
    }
  } else {
    prompt += "データなし\n"
  }

  // 振り返りサマリー
  prompt += "\n【振り返りセッション（直近）】\n"
  if (coachingSummaries.length > 0) {
    for (const cs of coachingSummaries) {
      const weekType = cs.weekType ? ` [${cs.weekType}]` : ""
      prompt += `- ${cs.summaryText.slice(0, 200)}${weekType}\n`
    }
  } else {
    prompt += "データなし\n"
  }

  // 週次分析の強み/課題
  prompt += "\n【週次分析（強み・課題）】\n"
  if (weeklyAnalyses.length > 0) {
    for (const wa of weeklyAnalyses) {
      prompt += `[${wa.weekStartDate}] 強み: ${wa.strengths ?? "なし"} / 課題: ${wa.challenges ?? "なし"}\n`
    }
  } else {
    prompt += "データなし\n"
  }

  prompt += "\n上記データに基づいて、指定の形式で要約を生成してください。"

  return prompt
}

// ============================================================================
// 内部: LLM呼び出し
// ============================================================================

async function callMemoryLLM(userPrompt: string): Promise<string> {
  const { provider, model } = getModelForModule("memory", "batch")

  if (provider === "gemini") {
    const client = getGeminiClient()
    const response = await client.models.generateContent({
      model,
      config: {
        systemInstruction: MEMORY_SYSTEM_PROMPT,
        maxOutputTokens: 2000,
      },
      contents: [
        { role: "user" as const, parts: [{ text: userPrompt }] },
      ],
    })
    const content = response.text
    if (!content) throw new Error("[memory-generator] Gemini returned empty response")
    return content
  }

  const openai = getOpenAIClient()
  const response = await openai.chat.completions.create({
    model,
    messages: [
      { role: "system", content: MEMORY_SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    max_completion_tokens: 2000,
  })
  const content = response.choices[0]?.message?.content
  if (!content) throw new Error("[memory-generator] OpenAI returned empty response")
  return content
}

// ============================================================================
// 内部: レスポンスパース
// ============================================================================

/** マーカーベースのレスポンスパース（weekly-analysis.ts パターン踏襲） */
export function parseMemoryResponse(content: string): {
  compactSummary: string
  detailedSummary: string
  subjectTrends: Record<string, string>
  stumblingPatterns: Record<string, string>
  effectiveEncouragements: Record<string, string>
  recentSuccesses: Record<string, string>
  emotionalTendencies: Record<string, string>
} {
  const compactMatch = content.match(/---compact_summary---\s*([\s\S]*?)(?=---detailed_summary---|$)/)
  const detailedMatch = content.match(/---detailed_summary---\s*([\s\S]*?)(?=---subject_trends---|$)/)
  const trendsMatch = content.match(/---subject_trends---\s*([\s\S]*?)(?=---stumbling_patterns---|$)/)
  const stumblingMatch = content.match(/---stumbling_patterns---\s*([\s\S]*?)(?=---effective_encouragements---|$)/)
  const encourageMatch = content.match(/---effective_encouragements---\s*([\s\S]*?)(?=---recent_successes---|$)/)
  const successMatch = content.match(/---recent_successes---\s*([\s\S]*?)(?=---emotional_tendencies---|$)/)
  const emotionalMatch = content.match(/---emotional_tendencies---\s*([\s\S]*)/)

  // フォールバック: マーカー欠落時は全文を compact_summary に格納
  if (!compactMatch) {
    console.warn("[memory-generator] Marker parsing failed, using fallback. Content length:", content.length)
    return {
      compactSummary: content.slice(0, COMPACT_SUMMARY_MAX_CHARS),
      detailedSummary: content,
      subjectTrends: {},
      stumblingPatterns: {},
      effectiveEncouragements: {},
      recentSuccesses: {},
      emotionalTendencies: {},
    }
  }

  return {
    compactSummary: compactMatch[1]?.trim() ?? "",
    detailedSummary: detailedMatch?.[1]?.trim() ?? "",
    subjectTrends: safeParseJSON(trendsMatch?.[1]),
    stumblingPatterns: safeParseJSON(stumblingMatch?.[1]),
    effectiveEncouragements: safeParseJSON(encourageMatch?.[1]),
    recentSuccesses: safeParseJSON(successMatch?.[1]),
    emotionalTendencies: safeParseJSON(emotionalMatch?.[1]),
  }
}

// ============================================================================
// ユーティリティ
// ============================================================================

/** subjects リレーションから科目名を抽出（配列/オブジェクト両対応） */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractSubjectName(subjects: any): string {
  if (!subjects) return "不明"
  if (Array.isArray(subjects)) return subjects[0]?.name ?? "不明"
  return subjects.name ?? "不明"
}

/** JSON文字列を安全にパース。失敗時は空オブジェクトを返す */
function safeParseJSON(text: string | undefined): Record<string, string> {
  if (!text) return {}
  // LLMがJSON以外のテキストを含む可能性があるため、{} 部分のみ抽出
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return {}
  try {
    return JSON.parse(jsonMatch[0])
  } catch {
    console.warn("[memory-generator] JSON parse failed:", text.slice(0, 100))
    return {}
  }
}

/** 日付文字列から週ラベルを生成 (例: "W09 (02/24-03/02)") */
function getWeekLabel(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00+09:00")
  // ISO週番号を使わず、月曜始まりの週で集約
  const dayOfWeek = date.getDay()
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(date)
  monday.setDate(date.getDate() + mondayOffset)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)

  const monStr = `${String(monday.getMonth() + 1).padStart(2, "0")}/${String(monday.getDate()).padStart(2, "0")}`
  const sunStr = `${String(sunday.getMonth() + 1).padStart(2, "0")}/${String(sunday.getDate()).padStart(2, "0")}`

  // 年内の週番号（簡易）
  const startOfYear = new Date(monday.getFullYear(), 0, 1)
  const weekNum = Math.ceil(((monday.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7)

  return `W${String(weekNum).padStart(2, "0")} (${monStr}-${sunStr})`
}
