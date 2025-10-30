import { createClient } from "@supabase/supabase-js"

async function compareEnvironments() {
  console.log("🔍 本番環境とローカル環境の比較\n")
  console.log("=".repeat(100))

  const localSupabase = createClient(
    "http://127.0.0.1:54321",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU",
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const prodSupabase = createClient(
    "https://zlipaeanhcslhintxpej.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsaXBhZWFuaGNzbGhpbnR4cGVqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTQwODQyNywiZXhwIjoyMDc0OTg0NDI3fQ.vHLWUSK8UURjH1_W-vIImz5f7QU1J9tEKGhsfKHDs1Y",
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  async function getEnvironmentData(supabase: any, envName: string) {
    const { data: authData } = await supabase.auth.admin.listUsers()
    const { data: profiles } = await supabase.from("profiles").select("id, display_name, role")
    const { data: students } = await supabase
      .from("students")
      .select("course, grade, profiles!inner(display_name)")
    const { data: relations } = await supabase.from("parent_child_relations").select(`
        parents!inner(profiles!inner(display_name)),
        students!inner(profiles!inner(display_name))
      `)

    return {
      parents: profiles
        ?.filter((p) => p.role === "parent")
        .map((p) => {
          const auth = authData?.users.find((u) => u.id === p.id)
          return {
            name: p.display_name,
            email: auth?.email,
          }
        })
        .sort((a, b) => (a.name || "").localeCompare(b.name || "")),
      students: students
        ?.map((s: any) => ({
          name: s.profiles?.display_name,
          grade: s.grade,
          course: s.course,
        }))
        .sort((a, b) => (a.name || "").localeCompare(b.name || "")),
      relations: relations
        ?.map((r: any) => ({
          parent: r.parents?.profiles?.display_name,
          student: r.students?.profiles?.display_name,
        }))
        .sort((a, b) => {
          const parentCompare = (a.parent || "").localeCompare(b.parent || "")
          if (parentCompare !== 0) return parentCompare
          return (a.student || "").localeCompare(b.student || "")
        }),
    }
  }

  const localData = await getEnvironmentData(localSupabase, "ローカル")
  const prodData = await getEnvironmentData(prodSupabase, "本番")

  console.log("\n📧 保護者アカウント比較\n")
  console.log("環境\t\t表示名\t\t\tメールアドレス")
  console.log("-".repeat(100))

  const allParentNames = new Set([
    ...(localData.parents?.map((p) => p.name) || []),
    ...(prodData.parents?.map((p) => p.name) || []),
  ])

  let parentsMatch = true
  for (const name of Array.from(allParentNames).sort()) {
    const local = localData.parents?.find((p) => p.name === name)
    const prod = prodData.parents?.find((p) => p.name === name)

    if (local && prod) {
      const match = local.email === prod.email ? "✅" : "❌"
      if (local.email !== prod.email) parentsMatch = false
      console.log(`${match} ローカル\t${local.name}\t\t${local.email}`)
      console.log(`${match} 本番\t\t${prod.name}\t\t${prod.email}`)
    } else if (local) {
      parentsMatch = false
      console.log(`❌ ローカルのみ\t${local.name}\t\t${local.email}`)
    } else if (prod) {
      parentsMatch = false
      console.log(`❌ 本番のみ\t${prod.name}\t\t${prod.email}`)
    }
  }

  console.log("\n🎓 生徒アカウント比較\n")
  console.log("環境\t\t表示名\t\t学年\tコース")
  console.log("-".repeat(100))

  const allStudentNames = new Set([
    ...(localData.students?.map((s) => s.name) || []),
    ...(prodData.students?.map((s) => s.name) || []),
  ])

  let studentsMatch = true
  for (const name of Array.from(allStudentNames).sort()) {
    const local = localData.students?.find((s) => s.name === name)
    const prod = prodData.students?.find((s) => s.name === name)

    if (local && prod) {
      const match = local.grade === prod.grade && local.course === prod.course ? "✅" : "❌"
      if (local.grade !== prod.grade || local.course !== prod.course) studentsMatch = false
      console.log(`${match} ローカル\t${local.name}\t小${local.grade}\t${local.course}`)
      console.log(`${match} 本番\t\t${prod.name}\t小${prod.grade}\t${prod.course}`)
    } else if (local) {
      studentsMatch = false
      console.log(`❌ ローカルのみ\t${local.name}\t小${local.grade}\t${local.course}`)
    } else if (prod) {
      studentsMatch = false
      console.log(`❌ 本番のみ\t${prod.name}\t小${prod.grade}\t${prod.course}`)
    }
  }

  console.log("\n👪 親子紐付け比較\n")
  console.log("環境\t\t親 → 子")
  console.log("-".repeat(100))

  const allRelations = new Set([
    ...(localData.relations?.map((r) => `${r.parent}→${r.student}`) || []),
    ...(prodData.relations?.map((r) => `${r.parent}→${r.student}`) || []),
  ])

  let relationsMatch = true
  for (const relKey of Array.from(allRelations).sort()) {
    const [parent, student] = relKey.split("→")
    const local = localData.relations?.find((r) => r.parent === parent && r.student === student)
    const prod = prodData.relations?.find((r) => r.parent === parent && r.student === student)

    if (local && prod) {
      console.log(`✅ 両方\t\t${parent} → ${student}`)
    } else if (local) {
      relationsMatch = false
      console.log(`❌ ローカルのみ\t${parent} → ${student}`)
    } else if (prod) {
      relationsMatch = false
      console.log(`❌ 本番のみ\t${parent} → ${student}`)
    }
  }

  console.log("\n" + "=".repeat(100))
  console.log("\n📊 総合判定\n")
  console.log(`保護者アカウント: ${parentsMatch ? "✅ 一致" : "❌ 不一致"}`)
  console.log(`生徒アカウント: ${studentsMatch ? "✅ 一致" : "❌ 不一致"}`)
  console.log(`親子紐付け: ${relationsMatch ? "✅ 一致" : "❌ 不一致"}`)

  if (parentsMatch && studentsMatch && relationsMatch) {
    console.log("\n🎉 本番環境とローカル環境が完全に一致しています！")
  } else {
    console.log("\n⚠️  一部の設定に差異があります。")
  }

  console.log("\n" + "=".repeat(100))
}

compareEnvironments()
