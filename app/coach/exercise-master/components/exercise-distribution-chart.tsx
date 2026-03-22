"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts"
import type { ExerciseMasterStudent } from "@/app/actions/exercise-master"

interface ExerciseDistributionChartProps {
  students: ExerciseMasterStudent[]
}

const BANDS = [
  { label: "0-49%", min: 0, max: 50, color: "#ef4444" },
  { label: "50-69%", min: 50, max: 70, color: "#f97316" },
  { label: "70-79%", min: 70, max: 80, color: "#eab308" },
  { label: "80-89%", min: 80, max: 90, color: "#22c55e" },
  { label: "90-100%", min: 90, max: 101, color: "#10b981" },
]

export function ExerciseDistributionChart({ students }: ExerciseDistributionChartProps) {
  const submitted = students.filter((s) => s.accuracy_rate != null)
  if (submitted.length === 0) return null

  const data = BANDS.map((band) => ({
    label: band.label,
    count: submitted.filter((s) => {
      // 小数誤差を排除するため整数丸め後にビン判定
      const rate = Math.round((s.accuracy_rate ?? 0) * 100)
      return rate >= band.min && rate < band.max
    }).length,
    color: band.color,
  }))

  const maxCount = Math.max(...data.map((d) => d.count), 1)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-muted-foreground">
          正答率分布（{submitted.length}名）
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              allowDecimals={false}
              domain={[0, maxCount + 1]}
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={28}
            />
            <Tooltip
              formatter={(value: number) => [`${value}名`, "人数"]}
              contentStyle={{ fontSize: 12, borderRadius: 8 }}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
