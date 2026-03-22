"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts"
import type { ExerciseMasterSectionStat } from "@/app/actions/exercise-master"

interface ExerciseRadarChartProps {
  sectionStats: ExerciseMasterSectionStat[]
}

export function ExerciseRadarChart({ sectionStats }: ExerciseRadarChartProps) {
  if (sectionStats.length < 2) return null

  const data = sectionStats.map((s) => ({
    section: s.section_name,
    rate: Math.round(s.avg_rate * 100),
  }))

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-muted-foreground">
          セクション別 平均正答率
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <RadarChart data={data}>
            <PolarGrid stroke="#e2e8f0" />
            <PolarAngleAxis dataKey="section" tick={{ fontSize: 11 }} />
            <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
            <Tooltip
              formatter={(value: number) => [`${value}%`, "平均正答率"]}
              contentStyle={{ fontSize: 12, borderRadius: 8 }}
            />
            <Radar
              dataKey="rate"
              stroke="#10b981"
              fill="#10b981"
              fillOpacity={0.25}
              strokeWidth={2}
            />
          </RadarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
