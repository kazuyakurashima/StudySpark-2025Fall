import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { SparkClient } from "./spark-client"

export default async function SparkPage({
  searchParams,
}: {
  searchParams: { subject?: string }
}) {
  const supabase = await createClient()

  // Get authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/")
  }

  // Fetch student data
  const { data: student, error: studentError } = await supabase
    .from("students")
    .select("id, grade, course")
    .eq("user_id", user.id)
    .single()

  if (studentError || !student) {
    redirect("/")
  }

  return <SparkClient initialData={{ student: { ...student, course: student.course || "A" } }} preselectedSubject={searchParams.subject} />
}
