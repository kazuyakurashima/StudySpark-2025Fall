import { createClient } from "@supabase/supabase-js"

async function testParentSignupFlow(env: "local" | "production") {
  const isLocal = env === "local"

  const supabaseAdmin = createClient(
    isLocal
      ? "http://127.0.0.1:54321"
      : "https://zlipaeanhcslhintxpej.supabase.co",
    isLocal
      ? "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU"
      : "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsaXBhZWFuaGNzbGhpbnR4cGVqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTQwODQyNywiZXhwIjoyMDc0OTg0NDI3fQ.vHLWUSK8UURjH1_W-vIImz5f7QU1J9tEKGhsfKHDs1Y",
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )

  console.log(`\n${"=".repeat(60)}`)
  console.log(`${isLocal ? "ローカル" : "本番"}環境 - 保護者新規登録フローのテスト`)
  console.log("=".repeat(60))

  const testTimestamp = Date.now()
  const parentEmail = `test-parent-${testTimestamp}@example.com`
  const childLoginId = `test-child-${testTimestamp}`
  const childEmail = `${childLoginId}@studyspark.local`

  let parentUserId: string | null = null
  let childUserId: string | null = null

  try {
    // ステップ1: 保護者アカウント作成
    console.log("\n📝 ステップ1: 保護者アカウント作成...")
    const { data: parentAuthData, error: parentAuthError } =
      await supabaseAdmin.auth.admin.createUser({
        email: parentEmail,
        password: "test123456",
        email_confirm: true,
        user_metadata: {
          role: "parent",
          full_name: "テスト保護者",
        },
      })

    if (parentAuthError) {
      console.log(`❌ 保護者アカウント作成エラー: ${parentAuthError.message}`)
      return
    }

    parentUserId = parentAuthData.user.id
    console.log(`✅ 保護者アカウント作成成功: ${parentUserId}`)

    // profilesが自動作成されたか確認
    const { data: parentProfile, error: parentProfileError } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", parentUserId)
      .single()

    if (parentProfileError) {
      console.log(`❌ 保護者のprofilesレコードが存在しません: ${parentProfileError.message}`)
      console.log(`🔥 トリガーが動作していない可能性があります`)
      return
    }
    console.log(`✅ 保護者のprofilesレコード確認: role=${parentProfile.role}`)

    // ステップ2: 保護者レコード作成
    console.log("\n📝 ステップ2: 保護者レコード作成...")
    const { data: parentData, error: parentError } = await supabaseAdmin
      .from("parents")
      .insert({
        user_id: parentUserId,
        full_name: "テスト保護者",
        furigana: "テストホゴシャ",
      })
      .select()
      .single()

    if (parentError) {
      console.log(`❌ 保護者レコード作成エラー: ${parentError.message}`)
      return
    }
    console.log(`✅ 保護者レコード作成成功: id=${parentData.id}`)

    // ステップ3: 子どもアカウント作成
    console.log("\n📝 ステップ3: 子どもアカウント作成...")
    const { data: childAuthData, error: childAuthError } =
      await supabaseAdmin.auth.admin.createUser({
        email: childEmail,
        password: "test123456",
        email_confirm: true,
        user_metadata: {
          role: "student",
          name: "テスト生徒",
          name_kana: "テストセイト",
          login_id: childLoginId,
        },
      })

    if (childAuthError) {
      console.log(`❌ 子どもアカウント作成エラー: ${childAuthError.message}`)
      return
    }

    childUserId = childAuthData.user.id
    console.log(`✅ 子どもアカウント作成成功: ${childUserId}`)

    // profilesが自動作成されたか確認
    const { data: childProfile, error: childProfileError } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", childUserId)
      .single()

    if (childProfileError) {
      console.log(`❌❌❌ 子どものprofilesレコードが存在しません！`)
      console.log(`   エラー: ${childProfileError.message}`)
      console.log(
        `\n🔥🔥🔥 これが原因です！handle_new_userトリガーが動作していません！`
      )
      console.log(`   次のステップ（studentsレコード作成）で外部キー制約エラーが発生します。`)
    } else {
      console.log(`✅ 子どものprofilesレコード確認: role=${childProfile.role}`)
    }

    // ステップ4: 生徒レコード作成（ここでエラーが発生するはず）
    console.log("\n📝 ステップ4: 生徒レコード作成...")
    const { data: studentData, error: studentError } = await supabaseAdmin
      .from("students")
      .insert({
        user_id: childUserId,
        full_name: "テスト生徒",
        furigana: "テストセイト",
        grade: 6,
        login_id: childLoginId,
      })
      .select()
      .single()

    if (studentError) {
      console.log(`\n❌❌❌ 生徒レコード作成エラー（これが本番で発生している問題）`)
      console.log(`   エラーコード: ${studentError.code}`)
      console.log(`   エラーメッセージ: ${studentError.message}`)
      console.log(`   詳細: ${JSON.stringify(studentError.details)}`)

      if (studentError.code === "23503") {
        console.log(
          `\n🔥 外部キー制約違反！students.user_id が profiles.id を参照できません`
        )
        console.log(`   原因: auth.usersにユーザーは作成されたが、profilesレコードが存在しない`)
        console.log(`   → handle_new_userトリガーが動作していないことが確定`)
      }
      return
    }
    console.log(`✅ 生徒レコード作成成功: id=${studentData.id}`)

    // ステップ5: 親子関係作成
    console.log("\n📝 ステップ5: 親子関係作成...")
    const { error: relationError } = await supabaseAdmin
      .from("parent_child_relations")
      .insert({
        parent_id: parentData.id,
        student_id: studentData.id,
      })

    if (relationError) {
      console.log(`❌ 親子関係作成エラー: ${relationError.message}`)
      return
    }
    console.log(`✅ 親子関係作成成功`)

    console.log(`\n✅✅✅ 全ステップ成功！この環境では新規登録が正常に動作します。`)
  } catch (error: any) {
    console.error(`\n💥 予期しないエラー:`, error.message)
  } finally {
    // クリーンアップ
    console.log(`\n🗑️  テストデータをクリーンアップ中...`)
    if (childUserId) {
      await supabaseAdmin.auth.admin.deleteUser(childUserId)
      console.log(`   - 子どもユーザー削除: ${childUserId}`)
    }
    if (parentUserId) {
      await supabaseAdmin.auth.admin.deleteUser(parentUserId)
      console.log(`   - 保護者ユーザー削除: ${parentUserId}`)
    }
  }
}

async function main() {
  await testParentSignupFlow("local")
  await testParentSignupFlow("production")
  console.log("\n" + "=".repeat(60) + "\n")
}

main()
