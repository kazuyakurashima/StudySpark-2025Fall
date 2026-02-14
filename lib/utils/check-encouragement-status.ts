import type { SparkLevel } from "@/lib/types/daily-spark"

interface ChildLike {
  id: number | string
}

/**
 * 複数の子どもに対して getDailySparkLevel を並列実行し、
 * 各子どもの応援完了ステータスマップを返す。
 *
 * @param children 子どもオブジェクトの配列（id を持つ）
 * @param getDailySparkLevel Server Action
 * @returns childId → 応援済みかどうかの statusMap
 */
export async function fetchEncouragementStatusMap(
  children: ChildLike[],
  getDailySparkLevel: (studentId: number) => Promise<SparkLevel>
): Promise<{ [childId: number]: boolean }> {
  const results = await Promise.allSettled(
    children.map((child) => {
      const childId = typeof child.id === "string" ? parseInt(child.id, 10) : child.id
      if (!Number.isInteger(childId) || childId <= 0) {
        console.warn("[fetchEncouragementStatusMap] Invalid childId skipped:", child.id)
        return Promise.reject(new Error(`Invalid childId: ${child.id}`))
      }
      return getDailySparkLevel(childId)
    })
  )

  const statusMap: { [childId: number]: boolean } = {}
  results.forEach((result, i) => {
    const childId = typeof children[i].id === "string" ? parseInt(children[i].id as string, 10) : (children[i].id as number)
    if (!Number.isInteger(childId) || childId <= 0) return
    statusMap[childId] =
      result.status === "fulfilled" && (result.value === "parent" || result.value === "both")
  })

  return statusMap
}
