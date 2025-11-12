import { redirect } from "next/navigation"

/**
 * 旧応援履歴ページ - リダイレクト専用
 * このページは廃止され、/student/reflect?tab=encouragement に統合されました
 */
export default function StudentEncouragementPage() {
  redirect("/student/reflect?tab=encouragement")
}
