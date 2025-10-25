import { createClient } from "@supabase/supabase-js"

async function checkTablePermissions(env: "local" | "production") {
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
  console.log(`${isLocal ? "ローカル" : "本番"}環境 - テーブル権限の詳細確認`)
  console.log("=".repeat(70))

  const tablesToCheck = [
    "profiles",
    "students",
    "parents",
    "parent_child_relations",
    "coaches",
  ]

  for (const tableName of tablesToCheck) {
    console.log(`\n📋 テーブル: ${tableName}`)

    // 1. RLS有効化状態の確認
    console.log(`   1. RLS設定を確認中...`)
    const { data: rlsData, error: rlsError } = await supabase
      .from(tableName)
      .select("*")
      .limit(0)

    // エラーの種類で判断
    if (rlsError) {
      if (rlsError.code === "42501") {
        console.log(`      ⚠️  権限エラー (42501): ${rlsError.message}`)
      } else if (rlsError.message.includes("does not exist")) {
        console.log(`      ❌ テーブルが存在しません`)
        continue
      } else {
        console.log(`      ⚠️  エラー: ${rlsError.message}`)
      }
    } else {
      console.log(`      ✅ アクセス可能`)
    }

    // 2. SELECT権限テスト
    console.log(`   2. SELECT権限をテスト...`)
    const { data: selectData, error: selectError } = await supabase
      .from(tableName)
      .select("*")
      .limit(1)

    if (selectError) {
      console.log(`      ❌ SELECT失敗: ${selectError.code} - ${selectError.message}`)
    } else {
      console.log(`      ✅ SELECT成功 (${selectData?.length || 0}件)`)
    }

    // 3. INSERT権限テスト（実際には挿入しない、ドライラン的な確認）
    console.log(`   3. INSERT権限をテスト...`)

    // テーブルごとに適切なダミーデータを準備
    let dummyData: any = {}

    switch (tableName) {
      case "profiles":
        dummyData = {
          id: "00000000-0000-0000-0000-000000000000",
          role: "student",
          display_name: "テスト",
        }
        break
      case "students":
        dummyData = {
          user_id: "00000000-0000-0000-0000-000000000000",
          full_name: "テスト",
          furigana: "テスト",
          login_id: "test_invalid",
          grade: 6,
        }
        break
      case "parents":
        dummyData = {
          user_id: "00000000-0000-0000-0000-000000000000",
          full_name: "テスト",
          furigana: "テスト",
        }
        break
      case "parent_child_relations":
        dummyData = {
          parent_id: 999999,
          student_id: 999999,
        }
        break
      case "coaches":
        dummyData = {
          user_id: "00000000-0000-0000-0000-000000000000",
          full_name: "テスト",
          invitation_code: "00000000-0000-0000-0000-000000000000",
        }
        break
    }

    const { data: insertData, error: insertError } = await supabase
      .from(tableName)
      .insert(dummyData)
      .select()

    if (insertError) {
      const errorCode = insertError.code
      const errorMsg = insertError.message

      if (errorCode === "42501") {
        console.log(`      ❌❌❌ INSERT権限なし (42501)`)
        console.log(`         エラー: ${errorMsg}`)
        console.log(`         → service_roleに${tableName}へのINSERT権限がありません！`)
      } else if (errorCode === "23503") {
        console.log(`      ⚠️  外部キー制約エラー (23503) - これは正常`)
        console.log(`         → INSERT権限は存在するが、無効なダミーデータのため失敗`)
        console.log(`         ✅ 権限は問題なし`)
      } else if (errorCode === "23505") {
        console.log(`      ⚠️  一意性制約違反 (23505) - これは正常`)
        console.log(`         → INSERT権限は存在するが、重複するデータのため失敗`)
        console.log(`         ✅ 権限は問題なし`)
      } else {
        console.log(`      ❌ INSERT失敗: ${errorCode} - ${errorMsg}`)
      }
    } else {
      console.log(`      ✅ INSERT成功（意図しないデータが挿入されました！削除します）`)
      // 削除処理（通常は発生しないはず）
      if (insertData && insertData.length > 0) {
        const idField = tableName === "profiles" ? "id" : "id"
        await supabase.from(tableName).delete().eq(idField, (insertData[0] as any).id)
      }
    }
  }
}

async function main() {
  await checkTablePermissions("local")
  await checkTablePermissions("production")
  console.log("\n" + "=".repeat(70) + "\n")
}

main()
