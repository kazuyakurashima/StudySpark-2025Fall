import { createClient } from "@supabase/supabase-js"

async function checkTriggersDirectSQL(env: "local" | "production") {
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

  console.log(`\n${"=".repeat(70)}`)
  console.log(`${isLocal ? "ローカル" : "本番"}環境 - トリガー・関数の直接SQL確認`)
  console.log("=".repeat(70))

  // 1. auth.usersテーブルのトリガー確認
  console.log("\n📋 1. auth.usersテーブルのトリガー確認")
  const { data: triggers, error: triggersError } = await supabase.rpc("sql_query" as any, {
    query: `
      SELECT
        trigger_name,
        event_manipulation,
        event_object_table,
        action_statement,
        action_timing
      FROM information_schema.triggers
      WHERE event_object_schema = 'auth'
        AND event_object_table = 'users'
      ORDER BY trigger_name;
    `,
  })

  if (triggersError) {
    console.log(`⚠️  直接クエリ実行エラー: ${triggersError.message}`)
    console.log(`   別の方法でトリガーを確認します...`)

    // Supabase Managementを使った確認（RPC経由）
    // 代わりに実際のユーザー作成で動作確認
    console.log(`\n   → 実際のユーザー作成でトリガー動作を確認します`)
  } else {
    if (!triggers || triggers.length === 0) {
      console.log(`❌❌❌ auth.usersテーブルにトリガーが存在しません！`)
      console.log(`   on_auth_user_created トリガーが設定されていません`)
    } else {
      console.log(`✅ トリガーが見つかりました:`)
      triggers.forEach((t: any) => {
        console.log(`   - ${t.trigger_name}: ${t.action_timing} ${t.event_manipulation}`)
        console.log(`     アクション: ${t.action_statement}`)
      })
    }
  }

  // 2. handle_new_user関数の存在確認
  console.log(`\n📋 2. handle_new_user関数の存在確認`)
  const { data: functions, error: functionsError } = await supabase.rpc("sql_query" as any, {
    query: `
      SELECT
        routine_name,
        routine_type,
        data_type as return_type
      FROM information_schema.routines
      WHERE routine_schema = 'public'
        AND routine_name = 'handle_new_user';
    `,
  })

  if (functionsError) {
    console.log(`⚠️  直接クエリ実行エラー: ${functionsError.message}`)

    // 代替方法：pg_proc を使用
    const { data: pgFuncs, error: pgFuncsError } = await supabase.rpc("sql_query" as any, {
      query: `
        SELECT proname, prokind
        FROM pg_proc
        WHERE proname = 'handle_new_user'
          AND pronamespace = 'public'::regnamespace;
      `,
    })

    if (pgFuncsError) {
      console.log(`   代替クエリもエラー: ${pgFuncsError.message}`)
    } else if (!pgFuncs || pgFuncs.length === 0) {
      console.log(`❌❌❌ handle_new_user関数が存在しません！`)
    } else {
      console.log(`✅ handle_new_user関数が見つかりました`)
    }
  } else {
    if (!functions || functions.length === 0) {
      console.log(`❌❌❌ handle_new_user関数が存在しません！`)
    } else {
      console.log(`✅ handle_new_user関数が見つかりました`)
      functions.forEach((f: any) => {
        console.log(`   - ${f.routine_name} (${f.routine_type})`)
      })
    }
  }

  // 3. service_roleの権限確認
  console.log(`\n📋 3. service_roleの権限とRLSバイパス確認`)
  const { data: roles, error: rolesError } = await supabase.rpc("sql_query" as any, {
    query: `
      SELECT
        rolname,
        rolsuper,
        rolbypassrls,
        rolcreaterole,
        rolcreatedb
      FROM pg_roles
      WHERE rolname = 'service_role';
    `,
  })

  if (rolesError) {
    console.log(`⚠️  権限確認エラー: ${rolesError.message}`)
  } else if (!roles || roles.length === 0) {
    console.log(`❌ service_roleが見つかりません`)
  } else {
    const role = roles[0]
    console.log(`✅ service_role の設定:`)
    console.log(`   - スーパーユーザー: ${role.rolsuper ? "はい" : "いいえ"}`)
    console.log(`   - RLSバイパス: ${role.rolbypassrls ? "はい" : "いいえ"}`)
    console.log(`   - ロール作成: ${role.rolcreaterole ? "はい" : "いいえ"}`)
    console.log(`   - DB作成: ${role.rolcreatedb ? "はい" : "いいえ"}`)
  }

  // 4. 実際のユーザー作成テスト（最も確実な方法）
  console.log(`\n📋 4. 実際のユーザー作成でトリガー動作を確認`)

  const testEmail = `trigger-test-${Date.now()}@example.com`
  const { data: userData, error: userError } = await supabase.auth.admin.createUser({
    email: testEmail,
    password: "test123456",
    email_confirm: true,
    user_metadata: {
      role: "student",
      full_name: "トリガーテスト",
    },
  })

  if (userError) {
    console.log(`❌ テストユーザー作成エラー: ${userError.message}`)
  } else {
    const userId = userData.user.id
    console.log(`✅ テストユーザー作成: ${userId}`)

    // profilesレコードが自動作成されたか確認
    await new Promise((resolve) => setTimeout(resolve, 1000)) // トリガー実行待ち

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle()

    if (profileError) {
      console.log(`❌ profilesレコード確認エラー: ${profileError.message}`)
    } else if (!profile) {
      console.log(`\n❌❌❌ 【重大な問題】profilesレコードが自動作成されませんでした！`)
      console.log(`   → handle_new_userトリガーが動作していません`)
      console.log(`   → これが新規登録失敗の根本原因です`)
    } else {
      console.log(`✅ profilesレコードが自動作成されました`)
      console.log(`   - role: ${profile.role}`)
      console.log(`   - display_name: ${profile.display_name}`)
    }

    // クリーンアップ
    await supabase.auth.admin.deleteUser(userId)
    console.log(`🗑️  テストユーザーを削除しました`)
  }
}

async function main() {
  await checkTriggersDirectSQL("local")
  await checkTriggersDirectSQL("production")
  console.log("\n" + "=".repeat(70) + "\n")
}

main()
