/**
 * AIコーチメッセージ生成レイテンシーテスト
 *
 * 目的: AI生成メッセージ実装時のレスポンスタイムを測定し、UX影響を分析する
 */

import { getOpenAIClient, getDefaultModel } from "../lib/openai/client"

interface LatencyTestResult {
  scenario: string
  iterations: number
  avgLatency: number
  minLatency: number
  maxLatency: number
  p95Latency: number
  successRate: number
}

/**
 * AIコーチメッセージ生成（シンプル版）
 */
async function generateCoachMessage(studentName: string): Promise<number> {
  const startTime = Date.now()

  try {
    const openai = getOpenAIClient()
    const model = getDefaultModel()

    const systemPrompt = `あなたは中学受験を目指す小学生の学習を支援するAIコーチです。

【あなたの役割】
- 毎日の学習開始時に、生徒を動機づけるメッセージを1つ伝える
- GROWモデル（Goal/Reality/Options/Will）に基づき、次の一手を提示する
- セルフコンパッションの原則に従い、責めずに小さな達成を承認する

【メッセージ構成】
1. 承認・励まし（1行）
2. 現状の要点（不足・残量・期日のいずれか1点）
3. Willについて（行動を促す）

【出力形式】
60〜100文字程度の日本語で、温かく、具体的なメッセージを生成してください。`

    const userPrompt = `【生徒情報】
名前: ${studentName}
学年: 小学6年生
コース: Bコース

【直近3日の学習ログ】
- 算数: 正答率75%（目標80%まであと5%）
- 国語: 正答率82%（目標達成）
- 理科: 正答率68%（復習が必要）

【直近のWill】
「算数の基本問題を毎日3問ずつ解く」

上記の情報をもとに、今日の学習開始時のメッセージを生成してください。`

    const completion = await openai.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_completion_tokens: 300,
      temperature: 0.7,
    })

    const message = completion.choices[0]?.message?.content?.trim()

    if (!message) {
      throw new Error("Empty message")
    }

    return Date.now() - startTime
  } catch (error) {
    console.error("AI generation error:", error)
    return Date.now() - startTime
  }
}

/**
 * レイテンシーテスト実行
 */
async function runLatencyTest(iterations: number = 5): Promise<LatencyTestResult> {
  console.log(`\n🧪 レイテンシーテスト開始（${iterations}回実行）...\n`)

  const latencies: number[] = []
  let successCount = 0

  for (let i = 0; i < iterations; i++) {
    process.stdout.write(`試行 ${i + 1}/${iterations}: `)

    const latency = await generateCoachMessage("太郎")
    latencies.push(latency)

    if (latency < 30000) {
      successCount++
      console.log(`✅ ${(latency / 1000).toFixed(2)}秒`)
    } else {
      console.log(`❌ タイムアウト`)
    }

    // レート制限を避けるため1秒待機
    if (i < iterations - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }

  // 統計計算
  latencies.sort((a, b) => a - b)
  const avgLatency = latencies.reduce((sum, val) => sum + val, 0) / latencies.length
  const minLatency = latencies[0]
  const maxLatency = latencies[latencies.length - 1]
  const p95Index = Math.floor(latencies.length * 0.95)
  const p95Latency = latencies[p95Index]
  const successRate = (successCount / iterations) * 100

  return {
    scenario: "AIコーチメッセージ生成",
    iterations,
    avgLatency,
    minLatency,
    maxLatency,
    p95Latency,
    successRate,
  }
}

/**
 * 結果表示
 */
function displayResults(result: LatencyTestResult) {
  console.log("\n" + "=".repeat(60))
  console.log("📊 レイテンシーテスト結果")
  console.log("=".repeat(60))
  console.log(`シナリオ: ${result.scenario}`)
  console.log(`試行回数: ${result.iterations}回`)
  console.log(`成功率: ${result.successRate.toFixed(1)}%`)
  console.log("")
  console.log("⏱️  レスポンスタイム:")
  console.log(`  平均: ${(result.avgLatency / 1000).toFixed(2)}秒`)
  console.log(`  最小: ${(result.minLatency / 1000).toFixed(2)}秒`)
  console.log(`  最大: ${(result.maxLatency / 1000).toFixed(2)}秒`)
  console.log(`  P95: ${(result.p95Latency / 1000).toFixed(2)}秒`)
  console.log("=".repeat(60))
}

/**
 * UX評価
 */
function evaluateUX(result: LatencyTestResult) {
  console.log("\n" + "=".repeat(60))
  console.log("🎨 UX影響評価")
  console.log("=".repeat(60))

  const avgSec = result.avgLatency / 1000

  if (avgSec < 1) {
    console.log("✅ 優秀（<1秒）: ユーザーは待ち時間を感じない")
  } else if (avgSec < 2) {
    console.log("✅ 良好（1-2秒）: 許容範囲内、ローディング表示推奨")
  } else if (avgSec < 5) {
    console.log("⚠️  注意（2-5秒）: ローディングアニメーション必須")
  } else if (avgSec < 10) {
    console.log("❌ 問題あり（5-10秒）: キャッシュ戦略必須、バックグラウンド生成検討")
  } else {
    console.log("🚨 重大（>10秒）: 同期生成は不可、非同期処理必須")
  }

  console.log("\n📋 推奨UX対策:")

  if (avgSec >= 2) {
    console.log("  1. スケルトンローディング表示")
    console.log("  2. 進捗インジケーター")
    console.log("  3. 「AIが考えています...」のメッセージ")
  }

  if (avgSec >= 5) {
    console.log("  4. キャッシュ戦略（1日1回生成、同日は再利用）")
    console.log("  5. バックグラウンド生成（前日夜に翌日分を生成）")
  }

  if (avgSec >= 10) {
    console.log("  6. 非同期生成（ページ読み込み後にフェッチ）")
    console.log("  7. フォールバック（生成失敗時はテンプレート表示）")
  }

  console.log("=".repeat(60))
}

/**
 * メイン実行
 */
async function main() {
  console.log("🚀 AIコーチメッセージ レイテンシー分析ツール")
  console.log("=" + "=".repeat(59))

  try {
    // 5回テスト実行
    const result = await runLatencyTest(5)

    // 結果表示
    displayResults(result)

    // UX評価
    evaluateUX(result)

    console.log("\n✅ テスト完了")
  } catch (error) {
    console.error("\n❌ テスト失敗:", error)
    process.exit(1)
  }
}

main()
