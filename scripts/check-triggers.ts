import { createClient } from "@supabase/supabase-js"

async function checkTriggers(env: "local" | "production") {
  const isLocal = env === "local"

  const supabase = createClient(
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
  console.log(`${isLocal ? "ローカル" : "本番"}環境 - トリガー・関数の確認`)
  console.log("=".repeat(60))

  // 1. handle_new_user 関数の存在確認
  const { data: funcData, error: funcError } = await supabase.rpc("handle_new_user" as any)

  if (funcError) {
    if (funcError.message.includes("does not exist")) {
      console.log("\n❌ handle_new_user 関数が存在しません")
    } else {
      console.log("\n✅ handle_new_user 関数は存在します")
      console.log(`   （エラー内容: ${funcError.message}）`)
    }
  } else {
    console.log("\n✅ handle_new_user 関数は存在します")
  }

  // 2. on_auth_user_created トリガーの存在確認（SQLクエリで直接確認）
  // Supabase JS SDKではトリガー情報を直接取得できないため、
  // auth.usersテーブルでユーザーを作成してトリガーが動くか確認する方法を使う

  console.log("\n📋 トリガー確認のため、テストユーザー作成を試みます...")

  // テスト用の一時ユーザーを作成
  const testEmail = `test-trigger-${Date.now()}@example.com`
  const testPassword = "test123456"

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: testEmail,
    password: testPassword,
    email_confirm: true,
    user_metadata: {
      role: "student",
      full_name: "トリガーテスト",
    },
  })

  if (authError) {
    console.log(`\n❌ テストユーザー作成エラー: ${authError.message}`)
  } else {
    console.log(`\n✅ テストユーザー作成成功: ${authData.user.id}`)

    // profilesテーブルに自動作成されたか確認
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", authData.user.id)
      .single()

    if (profileError) {
      console.log(
        `\n❌❌❌ トリガーが動作していません！profilesレコードが自動作成されませんでした`
      )
      console.log(`   エラー: ${profileError.message}`)
      console.log(
        `\n🔥 これが新規登録失敗の原因です！on_auth_user_created トリガーが本番環境に存在しません。`
      )
    } else {
      console.log(`\n✅ トリガーが正常に動作しました！profilesレコードが自動作成されました`)
      console.log(`   - ID: ${profileData.id}`)
      console.log(`   - Role: ${profileData.role}`)
      console.log(`   - Display Name: ${profileData.display_name}`)
    }

    // テストユーザーを削除
    await supabase.auth.admin.deleteUser(authData.user.id)
    console.log(`\n🗑️  テストユーザーを削除しました`)
  }
}

async function main() {
  await checkTriggers("local")
  await checkTriggers("production")
  console.log("\n" + "=".repeat(60) + "\n")
}

main()
