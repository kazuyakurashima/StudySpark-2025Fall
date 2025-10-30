import { createClient } from "@supabase/supabase-js"

async function compareColumnsDetailed() {
  try {
    console.log("🔍 ローカル環境と本番環境のカラム詳細比較\n")
    console.log("=".repeat(120))

    const localSupabase = createClient(
      "http://127.0.0.1:54321",
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU",
      { auth: { autoRefreshToken: false, persistSession: false }, db: { schema: "public" } }
    )

    const prodSupabase = createClient(
      "https://zlipaeanhcslhintxpej.supabase.co",
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsaXBhZWFuaGNzbGhpbnR4cGVqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTQwODQyNywiZXhwIjoyMDc0OTg0NDI3fQ.vHLWUSK8UURjH1_W-vIImz5f7QU1J9tEKGhsfKHDs1Y",
      { auth: { autoRefreshToken: false, persistSession: false }, db: { schema: "public" } }
    )

    const tables = [
      "profiles",
      "students",
      "parent_student_relationships",
      "study_logs",
      "study_sessions",
      "subjects",
      "study_content_types",
      "test_types",
      "test_schedules",
    ]

    const columnQuery = (tableName: string) => `
      SELECT
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = '${tableName}'
      ORDER BY ordinal_position;
    `

    let hasDifferences = false

    for (const table of tables) {
      console.log(`\n📊 テーブル: ${table}`)
      console.log("-".repeat(120))

      // Get columns from both environments
      const localQuery = localSupabase.rpc("sql" as any, { query: columnQuery(table) })
      const prodQuery = prodSupabase.rpc("sql" as any, { query: columnQuery(table) })

      // Since rpc might not work, let's use a sample query approach
      const { data: localSample } = await localSupabase.from(table).select("*").limit(1).single()
      const { data: prodSample } = await prodSupabase.from(table).select("*").limit(1).single()

      const localCols = localSample ? Object.keys(localSample).sort() : []
      const prodCols = prodSample ? Object.keys(prodSample).sort() : []

      // Compare columns
      const onlyInLocal = localCols.filter((c) => !prodCols.includes(c))
      const onlyInProd = prodCols.filter((c) => !localCols.includes(c))
      const inBoth = localCols.filter((c) => prodCols.includes(c))

      if (onlyInLocal.length === 0 && onlyInProd.length === 0) {
        console.log(`   ✅ カラム一致 (${inBoth.length}個)`)
        if (inBoth.length <= 10) {
          console.log(`      ${inBoth.join(", ")}`)
        }
      } else {
        hasDifferences = true
        console.log(`   ⚠️  カラムに差異があります！`)

        if (onlyInLocal.length > 0) {
          console.log(`   ❌ ローカルのみ (${onlyInLocal.length}個): ${onlyInLocal.join(", ")}`)
        }

        if (onlyInProd.length > 0) {
          console.log(`   ❌ 本番のみ (${onlyInProd.length}個): ${onlyInProd.join(", ")}`)
        }

        if (inBoth.length > 0) {
          console.log(`   ✅ 共通 (${inBoth.length}個): ${inBoth.join(", ")}`)
        }
      }
    }

    console.log("\n" + "=".repeat(120))

    if (hasDifferences) {
      console.log("\n⚠️  【重要】スキーマに差分があります！")
      console.log("   ローカルで開発した機能が本番で正しく動作しない可能性があります。")
      console.log("   対応方法:")
      console.log("   1. ローカルのマイグレーションを本番に適用")
      console.log("   2. 本番のスキーマをローカルに反映")
    } else {
      console.log("\n✅ 主要テーブルのカラム構成は一致しています")
      console.log("   ローカルでの開発が本番環境でも正しく動作するはずです。")
    }

    console.log("\n=".repeat(120))
  } catch (error) {
    console.error("❌ エラー:", error)
  }
}

compareColumnsDetailed()
