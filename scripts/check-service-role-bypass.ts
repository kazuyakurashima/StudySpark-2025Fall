import { createClient } from "@supabase/supabase-js"

async function checkServiceRoleBypass(env: "local" | "production") {
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
  console.log(`${isLocal ? "ローカル" : "本番"}環境 - service_roleのRLSバイパス設定確認`)
  console.log("=".repeat(70))

  // JWTをデコードして確認
  const serviceRoleKey = isLocal
    ? "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU"
    : "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsaXBhZWFuaGNzbGhpbnR4cGVqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTQwODQyNywiZXhwIjoyMDc0OTg0NDI3fQ.vHLWUSK8UURjH1_W-vIImz5f7QU1J9tEKGhsfKHDs1Y"

  const payload = JSON.parse(Buffer.from(serviceRoleKey.split(".")[1], "base64").toString())
  console.log(`\n📋 JWT Payload:`)
  console.log(`   Role: ${payload.role}`)
  console.log(`   ISS: ${payload.iss}`)

  // 実際のテスト：RLSが有効なテーブルに直接アクセス
  console.log(`\n📋 RLSテスト: parent_child_relations テーブル`)

  // まず、既存のレコードを確認
  const { data: existingData, error: selectError } = await supabase
    .from("parent_child_relations")
    .select("*")
    .limit(1)

  if (selectError) {
    console.log(`   ❌ SELECT失敗: ${selectError.code} - ${selectError.message}`)
    console.log(`\n🔥 service_roleがRLSをバイパスできていません！`)
    console.log(`   通常、service_roleはRLSを無視してすべてのレコードにアクセスできるはずです`)
  } else {
    console.log(`   ✅ SELECT成功 (${existingData?.length || 0}件取得)`)
    console.log(`   → service_roleはRLSをバイパスできています`)
  }

  // INSERT テスト
  console.log(`\n📋 INSERTテスト: parent_child_relations テーブル`)

  const { data: insertData, error: insertError } = await supabase
    .from("parent_child_relations")
    .insert({
      parent_id: 999999, // 存在しないID
      student_id: 999999,
    })
    .select()

  if (insertError) {
    const errorCode = insertError.code
    const errorMsg = insertError.message

    if (errorCode === "42501") {
      console.log(`   ❌❌❌ 権限エラー (42501): ${errorMsg}`)
      console.log(`\n🔥🔥🔥 service_roleに権限がありません！`)
      console.log(`   これは異常です。Supabaseの標準設定ではservice_roleは全権限を持つはずです。`)
    } else if (errorCode === "23503") {
      console.log(`   ⚠️  外部キー制約エラー (23503): ${errorMsg}`)
      console.log(`   ✅ 権限は問題なし（ダミーデータのため失敗）`)
    } else {
      console.log(`   ❌ その他のエラー (${errorCode}): ${errorMsg}`)
    }
  } else {
    console.log(`   ✅ INSERT成功（意図しないデータが挿入されました）`)
    // クリーンアップ
    if (insertData && insertData.length > 0) {
      await supabase
        .from("parent_child_relations")
        .delete()
        .eq("id", (insertData[0] as any).id)
    }
  }
}

async function main() {
  await checkServiceRoleBypass("local")
  await checkServiceRoleBypass("production")
  console.log("\n" + "=".repeat(70) + "\n")
}

main()
