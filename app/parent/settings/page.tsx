import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Settings } from "lucide-react"
import { UserProfileHeader } from "@/components/common/user-profile-header"
import { PageHeader } from "@/components/common/page-header"
import StudentPasswordResetForm from "./student-password-reset-form"
import { UserProfileProvider } from "@/lib/hooks/use-user-profile"

async function ParentSettingsPageInner() {
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
    <>
      <UserProfileHeader />
      
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 pb-20 ">
        <PageHeader
          icon={Settings}
          title="設定"
          subtitle="お子さまのパスワード管理"
          variant="parent"
        />

        <div className="mx-auto max-w-screen-xl space-y-6 p-4 sm:p-6 lg:p-8">

        <StudentPasswordResetForm children={childrenList} />
      </div>
      </div>
      </>
  )
}

/**
 * 保護者設定ページ（Context Provider付き）
 */
export default async function ParentSettingsPage() {
  return (
    <UserProfileProvider>
      <ParentSettingsPageInner />
    </UserProfileProvider>
  )
}
