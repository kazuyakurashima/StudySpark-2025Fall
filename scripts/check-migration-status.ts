import { createClient } from "@supabase/supabase-js"

async function checkMigrationStatus(env: "local" | "production") {
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
  console.log(`${isLocal ? "ローカル" : "本番"}環境のマイグレーション状態`)
  console.log("=".repeat(60))

  // 1. マイグレーション履歴テーブルの確認
  try {
    const { data: migrations, error: migError } = await supabase
      .from("schema_migrations")
      .select("version")
      .order("version", { ascending: false })
      .limit(5)

    if (migError) {
      console.log("\n⚠️  schema_migrationsテーブルにアクセスできません")
      console.log("エラー:", migError.message)
    } else {
      console.log(
        `\n✅ 適用済みマイグレーション数: ${migrations?.length || 0}件`
      )
      if (migrations && migrations.length > 0) {
        console.log("最新5件:")
        migrations.forEach((m) => console.log(`  - ${m.version}`))
      }
    }
  } catch (err) {
    console.log("⚠️  マイグレーション確認エラー:", err)
  }

  // 2. register_parent_with_children 関数の存在確認
  try {
    const { data: funcData, error: funcError } = await supabase.rpc(
      "register_parent_with_children",
      {
        p_parent_user_id: "00000000-0000-0000-0000-000000000000",
        p_parent_full_name: "test",
        p_parent_furigana: "test",
        p_children: [],
      }
    )

    if (funcError) {
      if (funcError.message.includes("function") && funcError.message.includes("does not exist")) {
        console.log("\n❌ register_parent_with_children 関数が存在しません")
      } else {
        console.log("\n✅ register_parent_with_children 関数は存在します")
        console.log("   （テスト実行時のエラー:", funcError.message, "）")
      }
    } else {
      console.log("\n✅ register_parent_with_children 関数は存在します")
    }
  } catch (err: any) {
    if (err.message?.includes("does not exist")) {
      console.log("\n❌ register_parent_with_children 関数が存在しません")
    } else {
      console.log("\n✅ register_parent_with_children 関数は存在します")
    }
  }

  // 3. テーブル一覧の確認（publicスキーマ）
  try {
    const { data: tables, error: tablesError } = await supabase.rpc("pg_catalog.pg_tables")

    // 別の方法でテーブル一覧を取得
    const tableNames = [
      "profiles",
      "students",
      "parents",
      "parent_child_relations",
      "coaches",
      "study_logs",
      "encouragement_messages",
    ]

    console.log("\n📋 主要テーブルの存在確認:")
    for (const tableName of tableNames) {
      const { data, error } = await supabase.from(tableName).select("id").limit(1)

      if (error) {
        if (error.code === "42501") {
          console.log(`  ⚠️  ${tableName}: アクセス権限なし`)
        } else if (error.message.includes("does not exist")) {
          console.log(`  ❌ ${tableName}: テーブルが存在しません`)
        } else {
          console.log(`  ❓ ${tableName}: エラー (${error.message})`)
        }
      } else {
        console.log(`  ✅ ${tableName}: 存在`)
      }
    }
  } catch (err) {
    console.log("⚠️  テーブル確認エラー:", err)
  }

  // 4. RLSポリシーの確認（profilesテーブル）
  console.log("\n🔒 RLSポリシーの確認:")
  try {
    // 匿名ユーザーとしてprofilesテーブルにアクセス
    const anonSupabase = createClient(
      isLocal
        ? "http://127.0.0.1:54321"
        : "https://zlipaeanhcslhintxpej.supabase.co",
      isLocal
        ? "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWFGba4pdTjhjUITE"
        : "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsaXBhZWFuaGNzbGhpbnR4cGVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MDg0MjcsImV4cCI6MjA3NDk4NDQyN30.MhwWJSJEP4ipGWV9OWfn3RUxC2u23i-5CAGUYWDOTKg"
    )

    const { data, error } = await anonSupabase.from("profiles").select("id").limit(1)

    if (error) {
      console.log(`  ❌ 匿名ユーザーからprofilesテーブルへのアクセス: 拒否`)
      console.log(`     エラー: ${error.message}`)
    } else {
      console.log(`  ✅ 匿名ユーザーからprofilesテーブルへのアクセス: 許可`)
    }
  } catch (err) {
    console.log("  ⚠️  RLSポリシー確認エラー:", err)
  }
}

async function main() {
  await checkMigrationStatus("local")
  await checkMigrationStatus("production")
  console.log("\n" + "=".repeat(60) + "\n")
}

main()
