"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts"
import type { ExerciseMasterSession } from "@/app/actions/exercise-master"

interface ExerciseTrendChartProps {
  sessions: ExerciseMasterSession[]
}

export function ExerciseTrendChart({ sessions }: ExerciseTrendChartProps) {
  const data = sessions
    .filter((s) => s.question_set_id != null && s.submitted_count > 0)
    .map((s) => ({
      name: `第${s.session_number}回`,
      avg_rate: Math.round(s.avg_rate * 100),
      submitted: s.submitted_count,
    }))

  if (data.length < 2) return null

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-muted-foreground">
          回別 平均正答率推移
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={36}
            />
            <Tooltip
              formatter={(value: number) => [`${value}%`, "平均正答率"]}
              labelStyle={{ fontSize: 12 }}
              contentStyle={{ fontSize: 12, borderRadius: 8 }}
            />
            <ReferenceLine y={80} stroke="#10b981" strokeDasharray="4 4" strokeOpacity={0.6} />
            <ReferenceLine y={50} stroke="#ef4444" strokeDasharray="4 4" strokeOpacity={0.4} />
            <Line
              type="monotone"
              dataKey="avg_rate"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ r: 4, fill: "#10b981" }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
        <p className="text-xs text-muted-foreground mt-1 text-right">
          破線: 80%（習得目安）/ 50%
        </p>
      </CardContent>
    </Card>
  )
}
