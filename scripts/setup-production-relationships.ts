import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function setupProductionRelationships() {
  try {
    console.log("🔧 本番環境：親子紐付けを設定します\n")
    console.log("=" .repeat(80))

    // Get all auth users
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers()

    if (authError || !authData) {
      console.error("❌ ユーザーの取得に失敗しました:", authError)
      return
    }

    // Get all profiles
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name, role")

    if (!profiles) {
      console.error("❌ プロフィールの取得に失敗しました")
      return
    }

    // Merge auth and profile data
    const users = authData.users.map((u) => {
      const profile = profiles.find((p) => p.id === u.id)
      return {
        id: u.id,
        email: u.email,
        display_name: profile?.display_name,
        role: profile?.role,
      }
    })

    // Find parents
    const hoshino_parent = users.find(
      (p) => p.email === "toshin.hitachi+test001@gmail.com" && p.role === "parent"
    )
    const aozora_parent = users.find(
      (p) => p.email === "toshin.hitachi+test002@gmail.com" && p.role === "parent"
    )

    // Find students
    const hikaru = users.find((p) => p.email === "hikaru6@studyspark.local")
    const akira = users.find((p) => p.email === "akira5@studyspark.local")
    const hana = users.find((p) => p.email === "hana6@studyspark.local")

    console.log("📋 アカウント確認:")
    console.log(`   星野一朗（保護者）: ${hoshino_parent ? '✅' : '❌'} ${hoshino_parent?.id}`)
    console.log(`   青空太郎（保護者）: ${aozora_parent ? '✅' : '❌'} ${aozora_parent?.id}`)
    console.log(`   星野光（生徒）: ${hikaru ? '✅' : '❌'} ${hikaru?.id}`)
    console.log(`   星野明（生徒）: ${akira ? '✅' : '❌'} ${akira?.id}`)
    console.log(`   青空花（生徒）: ${hana ? '✅' : '❌'} ${hana?.id}`)
    console.log("")

    if (!hoshino_parent || !aozora_parent || !hikaru || !akira || !hana) {
      console.error("❌ 必要なアカウントが見つかりません")
      return
    }

    // Get student IDs from students table
    const { data: students } = await supabase
      .from("students")
      .select("id, user_id")
      .in("user_id", [hikaru.id, akira.id, hana.id])

    if (!students || students.length !== 3) {
      console.error("❌ 生徒情報の取得に失敗しました")
      return
    }

    const hikaru_student_id = students.find((s) => s.user_id === hikaru.id)?.id
    const akira_student_id = students.find((s) => s.user_id === akira.id)?.id
    const hana_student_id = students.find((s) => s.user_id === hana.id)?.id

    console.log("📋 生徒ID確認:")
    console.log(`   星野光: ${hikaru_student_id}`)
    console.log(`   星野明: ${akira_student_id}`)
    console.log(`   青空花: ${hana_student_id}`)
    console.log("")

    // Check existing relationships
    const { data: existingRels } = await supabase
      .from("parent_student_relationships")
      .select("*")

    console.log(`📋 既存の紐付け: ${existingRels?.length || 0}件\n`)

    if (existingRels && existingRels.length > 0) {
      console.log("🗑️  既存の紐付けを削除します...")
      const { error: deleteError } = await supabase
        .from("parent_student_relationships")
        .delete()
        .in(
          "id",
          existingRels.map((r) => r.id)
        )

      if (deleteError) {
        console.error("❌ 削除エラー:", deleteError.message)
        return
      }
      console.log("✅ 削除完了\n")
    }

    // Create new relationships
    console.log("🔗 新しい紐付けを作成します...\n")

    const relationships = [
      {
        parent_id: hoshino_parent.id,
        student_id: hikaru_student_id,
        relationship_type: "parent",
      },
      {
        parent_id: hoshino_parent.id,
        student_id: akira_student_id,
        relationship_type: "parent",
      },
      {
        parent_id: aozora_parent.id,
        student_id: hana_student_id,
        relationship_type: "parent",
      },
    ]

    for (const rel of relationships) {
      const { error } = await supabase.from("parent_student_relationships").insert(rel)

      if (error) {
        console.error(`❌ 紐付けエラー:`, error.message)
      } else {
        // Get student name
        const student = users.find((p) => {
          const studentData = students.find((s) => s.id === rel.student_id)
          return p.id === studentData?.user_id
        })
        const parent = users.find((p) => p.id === rel.parent_id)
        console.log(`✅ ${parent?.display_name} → ${student?.display_name}`)
      }
    }

    console.log("\n" + "=".repeat(80))
    console.log("🎉 本番環境の紐付け設定が完了しました！")
    console.log("=".repeat(80))

    // Verify
    console.log("\n🔍 設定確認:\n")
    const { data: newRels } = await supabase
      .from("parent_student_relationships")
      .select(`
        parent_id,
        student_id,
        parent_profiles:profiles!parent_student_relationships_parent_id_fkey(display_name, email),
        student_profiles:profiles!parent_student_relationships_student_id_fkey(display_name, email)
      `)

    newRels?.forEach((rel, i) => {
      const parentName = (rel as any).parent_profiles?.display_name
      const studentName = (rel as any).student_profiles?.display_name
      console.log(`${i + 1}. ${parentName} → ${studentName}`)
    })
  } catch (error) {
    console.error("❌ エラー:", error)
    process.exit(1)
  }
}

setupProductionRelationships()
