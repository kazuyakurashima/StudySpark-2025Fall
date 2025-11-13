/**
 * 監視・通知の一元管理（v3.1：ノイズ対策付き）
 */

export interface NotificationContext {
  service: string
  level: "info" | "warning" | "error"
  message: string
  details?: Record<string, any>
}

/**
 * 構造化ログ出力
 */
function logStructured(context: NotificationContext) {
  const logData = {
    timestamp: new Date().toISOString(),
    ...context,
  }

  switch (context.level) {
    case "error":
      console.error(JSON.stringify(logData))
      break
    case "warning":
      console.warn(JSON.stringify(logData))
      break
    default:
      console.log(JSON.stringify(logData))
  }
}

/**
 * Slack通知（ダイジェスト化対応）
 */
async function notifySlack(context: NotificationContext): Promise<void> {
  if (!process.env.SLACK_WEBHOOK_URL) return

  const emoji = {
    info: "ℹ️",
    warning: "⚠️",
    error: "❌",
  }[context.level]

  let message = `${emoji} [${context.service}] ${context.message}`

  // 詳細情報の整形
  if (context.details) {
    // pending_countが多い場合はダイジェスト化
    if (context.details.pending_count !== undefined) {
      const count = context.details.pending_count

      // 10件以下: 全件表示
      // 11〜100件: サンプル表示
      // 101件以上: 件数のみ + アラート
      if (count <= 10) {
        message += "\n```\n" + JSON.stringify(context.details, null, 2) + "\n```"
      } else if (count <= 100) {
        message += `\n\n📊 滞留件数: ${count}件\n`
        message += `サンプル:\n\`\`\`\n${JSON.stringify(context.details.samples, null, 2)}\n\`\`\``
      } else {
        message += `\n\n🚨 **大量滞留発生**: ${count}件\n`
        message += `即座に調査が必要です。\n`
        message += `ログ確認: \`SELECT * FROM langfuse_scores WHERE status = 'pending' AND created_at < NOW() - INTERVAL '1 hour' LIMIT 10;\``
      }
    } else {
      // 通常の詳細表示
      message += "\n```\n" + JSON.stringify(context.details, null, 2) + "\n```"
    }
  }

  try {
    await fetch(process.env.SLACK_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: message }),
    })
  } catch (error) {
    console.error("[Notify] Slack notification failed:", error)
  }
}

/**
 * 通知送信（複数チャネル）
 */
export async function notify(context: NotificationContext): Promise<void> {
  // 1. 構造化ログ（必須）
  logStructured(context)

  // 2. Slack通知（warningとerrorのみ）
  if (context.level === "warning" || context.level === "error") {
    await notifySlack(context)
  }

  // 3. 将来の拡張ポイント：Sentry、Datadog等
}

/**
 * エラー通知のショートハンド
 */
export async function notifyError(
  service: string,
  message: string,
  details?: Record<string, any>
): Promise<void> {
  await notify({
    service,
    level: "error",
    message,
    details,
  })
}

/**
 * 警告通知のショートハンド
 */
export async function notifyWarning(
  service: string,
  message: string,
  details?: Record<string, any>
): Promise<void> {
  await notify({
    service,
    level: "warning",
    message,
    details,
  })
}

/**
 * 情報通知のショートハンド
 */
export async function notifyInfo(
  service: string,
  message: string,
  details?: Record<string, any>
): Promise<void> {
  await notify({
    service,
    level: "info",
    message,
    details,
  })
}
