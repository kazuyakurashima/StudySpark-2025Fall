"use client"

import { Card, CardHeader, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { TrendingUp, TrendingDown, Minus, Lightbulb } from "lucide-react"
import { cn } from "@/lib/utils"
import type { AssessmentType, AssessmentStatus } from "@/lib/types/class-assessment"
import {
  ASSESSMENT_TYPE_LABELS,
  ASSESSMENT_TYPE_COLORS,
  ASSESSMENT_STATUS_LABELS,
} from "@/lib/types/class-assessment"

interface AssessmentResultCardProps {
  type: AssessmentType
  sessionNumber: number
  attemptNumber?: number
  status: AssessmentStatus
  score: number | null
  maxScore: number
  percentage: number | null
  change?: number
  changeLabel?: string
  actionSuggestion?: string
  isResubmission?: boolean
  /** コンパクト表示（ダッシュボード用） */
  compact?: boolean
  /** 項目名（優先表示） */
  title?: string | null
  /** 単元名（算数プリントのみ、漢字テストはnull） */
  description?: string | null
  /** 実施日（DATE: "2025-12-14"） */
  assessmentDate?: string | null
  /** 採点日時（TIMESTAMPTZ: "2025-12-16T10:30:00Z"） */
  gradedAt?: string | null
}

/**
 * テスト結果カード（生徒・保護者共通）
 *
 * 仕様:
 * - 算数プリント: 青系、漢字テスト: オレンジ系
 * - 80%以上: 祝福メッセージ表示
 * - 前回比: 上昇(緑)、下降(赤)、維持(灰)
 * - 行動提案: アンバー背景で表示
 */
export function AssessmentResultCard({
  type,
  sessionNumber,
  attemptNumber = 1,
  status,
  score,
  maxScore,
  percentage,
  change,
  changeLabel,
  actionSuggestion,
  isResubmission,
  compact = false,
  title,
  description,
  assessmentDate,
  gradedAt,
}: AssessmentResultCardProps) {
  const isCompleted = status === "completed"
  const isHighScore = percentage !== null && percentage >= 80
  const colors = ASSESSMENT_TYPE_COLORS[type]
  const attemptSuffix = formatAttemptSuffix(type, attemptNumber)

  // 欠席・未提出の場合
  if (status !== "completed") {
    return (
      <Card className="rounded-xl shadow-sm border bg-gray-50">
        <CardHeader className={compact ? "pb-2 pt-3 px-4" : "pb-2"}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge className={cn("text-xs", colors.badge)}>
                {ASSESSMENT_TYPE_LABELS[type]}
              </Badge>
              <span className="text-sm text-slate-600">
                第{sessionNumber}回
                {attemptSuffix && <span className="text-xs">{attemptSuffix}</span>}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className={compact ? "pb-3 px-4" : ""}>
          <p className="text-sm text-gray-500">
            {ASSESSMENT_STATUS_LABELS[status]}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn("rounded-xl shadow-sm border", colors.bg)}>
      <CardHeader className={compact ? "pb-2 pt-3 px-4" : "pb-2"}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge className={cn("text-xs", colors.badge)}>
              {ASSESSMENT_TYPE_LABELS[type]}
            </Badge>
            <span className="text-sm text-slate-600">
              第{sessionNumber}回
              {attemptSuffix && <span className="text-xs">{attemptSuffix}</span>}
            </span>
            {isResubmission && (
              <Badge variant="outline" className="text-xs">
                再提出
              </Badge>
            )}
          </div>
          {change !== undefined && (
            <div className="flex items-center gap-1">
              {change > 0 && <TrendingUp className="h-4 w-4 text-emerald-600" />}
              {change < 0 && <TrendingDown className="h-4 w-4 text-red-500" />}
              {change === 0 && <Minus className="h-4 w-4 text-slate-400" />}
              <span
                className={cn(
                  "text-sm font-medium",
                  change > 0
                    ? "text-emerald-600"
                    : change < 0
                      ? "text-red-500"
                      : "text-slate-500"
                )}
              >
                {change > 0 ? `+${change}` : change}点
              </span>
            </div>
          )}
        </div>

        {/* サブタイトル行（項目名/単元名 + 日付） */}
        {(title || description || assessmentDate || gradedAt) && (
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mt-1.5 gap-2">
            {/* 左: 項目名（優先）/単元名（2行表示を許容） */}
            {(title || description) && (
              <span className="text-sm text-slate-600 font-medium leading-tight">
                {title || description}
              </span>
            )}

            {/* 右: 日付情報（階層的に配置） */}
            <div className="flex flex-col items-start sm:items-end gap-0.5 text-xs flex-shrink-0">
              {(() => {
                // 同日判定: 実施日と採点日が同じ場合は統合表示
                const isSameDay =
                  assessmentDate &&
                  gradedAt &&
                  formatDate(assessmentDate) === formatDateTimeIntl(gradedAt)

                if (isSameDay && !compact) {
                  // 同日の場合: 統合表示
                  return (
                    <span className="text-slate-500">
                      実施・採点 {formatDate(assessmentDate!)}
                    </span>
                  )
                }

                // 異なる日の場合: 個別表示
                return (
                  <>
                    {/* 実施日 */}
                    {assessmentDate && (
                      <span className="text-slate-500">
                        {compact
                          ? formatDate(assessmentDate) + "実施"
                          : "実施 " + formatDate(assessmentDate)}
                      </span>
                    )}
                    {/* 採点日（通常モードのみ） */}
                    {!compact && gradedAt && (
                      <span className="text-slate-400 text-[11px]">
                        採点 {formatDateTimeIntl(gradedAt)}
                      </span>
                    )}
                  </>
                )
              })()}
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent className={cn("space-y-3", compact ? "pb-3 px-4" : "")}>
        {/* スコア表示 */}
        <div className="flex items-center gap-4">
          <div className="text-2xl font-bold">
            {score}
            <span className="text-base text-slate-500 font-normal">/{maxScore}</span>
          </div>
          <Progress
            value={percentage || 0}
            className={cn(
              "flex-1 h-2",
              type === "math_print"
              ? "[&>div]:bg-blue-500"
              : type === "math_auto_grading"
                ? "[&>div]:bg-indigo-500"
                : "[&>div]:bg-orange-500"
            )}
          />
        </div>

        {/* 前回比メッセージ（コンパクトモードでは非表示） */}
        {!compact && change !== undefined && change !== 0 && (
          <p className="text-sm text-slate-600">
            {change > 0
              ? `前回より${change}点アップ！成長してるね`
              : `前回より${Math.abs(change)}点。次は挽回しよう！`}
          </p>
        )}

        {/* 高得点時の祝福 */}
        {isHighScore && (
          <div className="flex items-center gap-2 text-amber-600">
            <span className="text-lg">🎉</span>
            <span className="text-sm font-medium">すごい！目標達成だね！</span>
          </div>
        )}

        {/* 行動提案（コンパクトモードでは非表示） */}
        {!compact && actionSuggestion && (
          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
            <p className="text-sm flex items-start gap-2">
              <Lightbulb className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <span className="text-slate-700">
                <span className="font-medium">次の一歩: </span>
                {actionSuggestion}
              </span>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * 行動提案テンプレート（正答率に応じた提案）
 */
export function getActionSuggestion(
  type: AssessmentType,
  percentage: number | null
): string {
  if (percentage === null) return ""

  const templates: Record<AssessmentType, { high: string[]; medium: string[]; low: string[] }> = {
    math_print: {
      high: [
        "この調子で次のプリントにもチャレンジしてみよう",
        "得意な解き方をノートにまとめておこう",
        "友達に教えてあげると、もっと理解が深まるよ",
      ],
      medium: [
        "まちがえた問題をもう一度ノートに解いてみよう",
        "わからなかった問題は先生に質問してみよう",
        "似た問題を見つけて練習してみよう",
      ],
      low: [
        "基本問題からもう一度復習してみよう",
        "計算ミスがないか、ゆっくり見直してみよう",
        "わからないところは遠慮なく先生に聞いてね",
      ],
    },
    kanji_test: {
      high: [
        "覚えた漢字を使って文を作ってみよう",
        "この調子で次の漢字テストもがんばろう",
        "得意な漢字の覚え方を友達にも教えてあげよう",
      ],
      medium: [
        "まちがえた漢字を3回ずつ書いて覚えよう",
        "読めなかった漢字は辞書で調べてみよう",
        "漢字を使った熟語も一緒に覚えよう",
      ],
      low: [
        "まずは書き順を確認しながらゆっくり練習しよう",
        "覚えにくい漢字は絵と一緒に覚えてみよう",
        "毎日少しずつ練習すると覚えやすくなるよ",
      ],
    },
    math_auto_grading: {
      high: [
        "この調子で次の問題にもチャレンジしてみよう",
        "解き方をしっかり覚えられているね！",
        "自信を持って次に進もう！",
      ],
      medium: [
        "まちがえた問題の解き方を確認してみよう",
        "答え合わせで解説を読んでみよう",
        "もう一度チャレンジすると点数が上がるかも！",
      ],
      low: [
        "焦らずにもう一度取り組んでみよう",
        "解説をよく読んでから再挑戦してみよう",
        "わからないところは先生に聞いてみよう",
      ],
    },
  }

  const level = percentage >= 80 ? "high" : percentage >= 50 ? "medium" : "low"
  const options = templates[type][level]
  return options[Math.floor(Math.random() * options.length)]
}

/**
 * DATE型の日付をMM/DD形式にフォーマット
 * @param isoDate - "2025-12-14" 形式（DATE型、タイムゾーンの影響なし）
 * @returns "12/14"
 */
function formatDate(isoDate: string): string {
  // DATE型は "YYYY-MM-DD" 形式なので split で安全に処理
  const [, month, day] = isoDate.split('-')
  return `${parseInt(month)}/${parseInt(day)}`
}

/**
 * TIMESTAMPTZ型の日付時刻をMM/DD形式（JST固定）にフォーマット
 * @param isoDateTime - "2025-12-16T10:30:00Z" 形式（UTC）
 * @returns "12/16" （Asia/Tokyo タイムゾーンで表示）
 * @note タイムゾーンは Asia/Tokyo に固定（ユーザー端末のロケールに依存しない）
 */
function formatDateTimeIntl(isoDateTime: string): string {
  const date = new Date(isoDateTime)
  const formatter = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',  // ✅ JST固定（ユーザー端末に依存しない）
    month: 'numeric',
    day: 'numeric',
  })
  return formatter.format(date) // "12/16"
}

function formatAttemptSuffix(type: AssessmentType, attemptNumber: unknown): string | null {
  if (type !== "math_print") return null
  const n = Number(attemptNumber)
  if (!Number.isInteger(n) || n < 1) return null
  return String.fromCharCode(0x245f + n)
}
