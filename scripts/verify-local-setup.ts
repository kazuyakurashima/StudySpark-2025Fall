import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  "http://127.0.0.1:54321",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU",
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function verifyLocalSetup() {
  console.log("🔍 ローカル環境セットアップ確認\n")
  console.log("=".repeat(80))

  // Check parent emails
  console.log("\n📧 保護者メールアドレス:\n")
  const { data: authData } = await supabase.auth.admin.listUsers()
  const { data: profiles } = await supabase.from("profiles").select("id, display_name, role")

  const parents = profiles?.filter((p) => p.role === "parent") || []

  let emailsCorrect = true
  for (const parent of parents) {
    const authUser = authData?.users.find((u) => u.id === parent.id)
    const expected =
      parent.display_name === "星野 一朗"
        ? "demo-parent1@example.com"
        : "demo-parent2@example.com"
    const match = authUser?.email === expected
    emailsCorrect = emailsCorrect && match
    console.log(`${match ? "✅" : "❌"} ${parent.display_name}: ${authUser?.email}`)
  }

  // Check parent-child relations
  console.log("\n👪 親子紐付け:\n")
  const { data: relations } = await supabase.from("parent_child_relations").select(`
      id,
      parents!inner(user_id, profiles!inner(display_name)),
      students!inner(user_id, profiles!inner(display_name))
    `)

  let relationsCorrect = true
  const expectedRelations = [
    { parent: "星野 一朗", student: "星野 光" },
    { parent: "星野 一朗", student: "星野 明" },
    { parent: "青空 太郎", student: "青空 花" },
  ]

  for (const expected of expectedRelations) {
    const found = relations?.some(
      (r: any) =>
        r.parents?.profiles?.display_name === expected.parent &&
        r.students?.profiles?.display_name === expected.student
    )
    console.log(`${found ? "✅" : "❌"} ${expected.parent} → ${expected.student}`)
    relationsCorrect = relationsCorrect && !!found
  }

  // Check student courses
  console.log("\n🎓 生徒コース設定:\n")
  const { data: students } = await supabase
    .from("students")
    .select("course, profiles!inner(display_name)")

  let coursesCorrect = true
  const expectedCourses = [
    { name: "青空 花", course: "B" },
    { name: "星野 光", course: "B" },
    { name: "星野 明", course: "B" },
  ]

  for (const expected of expectedCourses) {
    const student = students?.find((s: any) => s.profiles?.display_name === expected.name)
    const match = student?.course === expected.course
    coursesCorrect = coursesCorrect && match
    console.log(
      `${match ? "✅" : "❌"} ${expected.name}: ${student?.course || "未設定"}コース (期待: ${expected.course}コース)`
    )
  }

  console.log("\n" + "=".repeat(80))
  console.log("\n📊 総合判定:\n")
  console.log(`保護者メール: ${emailsCorrect ? "✅ 正常" : "❌ 要修正"}`)
  console.log(`親子紐付け: ${relationsCorrect ? "✅ 正常" : "❌ 要修正"}`)
  console.log(`生徒コース: ${coursesCorrect ? "✅ 正常" : "❌ 要修正"}`)

  if (emailsCorrect && relationsCorrect && coursesCorrect) {
    console.log("\n🎉 ローカル環境のセットアップが完了しています！")
  } else {
    console.log("\n⚠️  一部の設定が不完全です。上記を確認してください。")
  }

  console.log("\n" + "=".repeat(80))
}

verifyLocalSetup()
