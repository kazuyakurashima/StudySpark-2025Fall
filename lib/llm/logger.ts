/**
 * LLMログ用PIIマスキングユーティリティ
 *
 * ログ出力前に個人情報フィールドを再帰的にマスクする。
 * ネスト・配列・サイクル参照に対応。
 *
 * Phase 1.5a-1 で導入。
 */

const PII_FIELDS = new Set([
  "studentName",
  "content",
  "full_name",
  "email",
])
const MAX_DEPTH = 5

/**
 * オブジェクトからPIIフィールドを再帰的にマスクして返す。
 * 元のオブジェクトは変更しない。
 */
export function sanitizeForLog(obj: unknown): unknown {
  // 再帰スタックでサイクル検出（共有参照は正常にコピー）
  const stack = new WeakSet<object>()

  function walk(value: unknown, depth: number): unknown {
    if (value === null || value === undefined) return value
    if (typeof value !== "object") return value
    // 深さ上限を超えたら中身をマスクして安全に打ち切り
    if (depth > MAX_DEPTH) return "[MAX_DEPTH]"

    const objValue = value as object
    if (stack.has(objValue)) return "[Circular]"
    stack.add(objValue)

    let result: unknown
    if (Array.isArray(value)) {
      result = value.map((item) => walk(item, depth + 1))
    } else if (value instanceof Error) {
      // Error の非列挙プロパティ + 列挙プロパティ(status, code等)をマージ
      // message/stack はPII(プロンプト内容等)を含みうるためマスク
      const errObj: Record<string, unknown> = {
        name: value.name,
        message: "[REDACTED]",
        stack: "[REDACTED]",
      }
      // APIError等の列挙プロパティ(status, code, type)も走査
      for (const [key, v] of Object.entries(value)) {
        if (PII_FIELDS.has(key)) {
          errObj[key] = "[REDACTED]"
        } else {
          errObj[key] = walk(v, depth + 1)
        }
      }
      result = errObj
    } else {
      const sanitized: Record<string, unknown> = {}
      for (const [key, v] of Object.entries(value)) {
        if (PII_FIELDS.has(key)) {
          sanitized[key] = "[REDACTED]"
        } else {
          sanitized[key] = walk(v, depth + 1)
        }
      }
      result = sanitized
    }

    // スタックから削除（共有参照を別パスで再走査可能に）
    stack.delete(objValue)
    return result
  }

  return walk(obj, 0)
}
