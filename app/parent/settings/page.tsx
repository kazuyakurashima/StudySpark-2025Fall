import { createClient } from "@/lib/supabase/server"

export const dynamic = 'force-dynamic'
import { redirect } from "next/navigation"
import StudentPasswordResetForm from "./student-password-reset-form"

export default async function ParentSettingsPage() {
  const supabase = await createClient()

  // 認証チェック
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/")
  }

  // 保護者確認
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (!profile || profile.role !== "parent") {
    redirect("/")
  }

  // 保護者IDを取得
  const { data: parentRecord } = await supabase
    .from("parents")
    .select("id")
    .eq("user_id", user.id)
    .single()

  if (!parentRecord) {
    redirect("/")
  }

  // 子どもリストを取得
  const { data: children } = await supabase
    .from("parent_child_relations")
    .select(`
      student_id,
      students (
        id,
        full_name,
        furigana,
        login_id,
        grade
      )
    `)
    .eq("parent_id", parentRecord.id)

  const childrenList = children?.map((child: any) => child.students) || []

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="mx-auto max-w-4xl space-y-6 py-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">設定</h1>
          <p className="text-gray-600">お子さまのパスワード管理</p>
        </div>

        <StudentPasswordResetForm children={childrenList} />
      </div>
    </div>
  )
}
