"use client"

import { useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ClipboardList, RefreshCw, Loader2 } from "lucide-react"
import { CoachBottomNavigation } from "@/components/coach-bottom-navigation"
import { UserProfileHeader } from "@/components/common/user-profile-header"
import { useMathMasterSummary } from "@/lib/hooks/use-math-master"
import { SessionSummaryTable } from "./components/session-summary-table"
import { DetailMatrix } from "./components/detail-matrix"

type GradeTab = 5 | 6

export default function MathMasterPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const gradeParam = searchParams?.get("grade") ?? null
  const initialGrade: GradeTab = gradeParam === "6" ? 6 : 5

  const [grade, setGrade] = useState<GradeTab>(initialGrade)
  const [selectedSetId, setSelectedSetId] = useState<number | null>(null)

  const { sessions, totalStudents, isLoading, isValidating, error, mutate } =
    useMathMasterSummary(grade)

  const handleGradeChange = (newGrade: GradeTab) => {
    setGrade(newGrade)
    setSelectedSetId(null)
    router.push(`/coach/math-master?grade=${newGrade}`, { scroll: false })
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <UserProfileHeader />

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* ヘッダー */}
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
                <ClipboardList className="h-6 w-6 text-blue-500" />
                算数マスタープリント
              </h1>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => mutate()}
                disabled={isValidating}
              >
                {isValidating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 学年セレクタ */}
        <div className="flex gap-2">
          {([5, 6] as GradeTab[]).map((g) => (
            <Button
              key={g}
              variant={grade === g ? "default" : "outline"}
              size="sm"
              onClick={() => handleGradeChange(g)}
            >
              小{g}
            </Button>
          ))}
        </div>

        {/* エラー */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4 text-red-600 text-sm">
              {error.message || "データの取得に失敗しました"}
            </CardContent>
          </Card>
        )}

        {/* ローディング */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* コンテンツ */}
        {!isLoading && !error && (
          selectedSetId ? (
            <DetailMatrix
              questionSetId={selectedSetId}
              onBack={() => setSelectedSetId(null)}
            />
          ) : (
            <SessionSummaryTable
              sessions={sessions}
              totalStudents={totalStudents}
              onSelectSet={(id) => setSelectedSetId(id)}
            />
          )
        )}
      </div>

      <CoachBottomNavigation />
    </div>
  )
}
