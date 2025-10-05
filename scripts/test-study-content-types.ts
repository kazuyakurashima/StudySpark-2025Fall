/**
 * study_content_types 関連関数のテストスクリプト
 *
 * 実行方法:
 * NEXT_PUBLIC_SUPABASE_URL="http://127.0.0.1:54321" \
 * SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU" \
 * npx tsx scripts/test-study-content-types.ts
 */

import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function testGetContentTypes() {
  console.log("\n=== Test 1: getContentTypes (小5・算数・Aコース) ===")

  // 小5・算数のIDを取得
  const { data: subject } = await supabase
    .from("subjects")
    .select("id")
    .eq("name", "算数")
    .single()

  if (!subject) {
    console.error("❌ 算数の科目が見つかりません")
    return
  }

  console.log(`科目ID: ${subject.id}`)

  // getContentTypes と同じロジックでクエリ（問題数なし）
  const { data, error } = await supabase
    .from("study_content_types")
    .select("id, content_name, course, display_order")
    .eq("grade", 5)
    .eq("subject_id", subject.id)
    .eq("course", "A")
    .order("display_order")

  if (error) {
    console.error("❌ エラー:", error)
    return
  }

  console.log(`✅ 取得成功: ${data?.length}件`)
  data?.forEach((item) => {
    console.log(`  - ID:${item.id} ${item.content_name}`)
  })
}

async function testGetContentTypeId() {
  console.log("\n=== Test 2: getContentTypeId (小5・算数・Aコース・類題) ===")

  // 小5・算数のIDを取得
  const { data: subject } = await supabase
    .from("subjects")
    .select("id")
    .eq("name", "算数")
    .single()

  if (!subject) {
    console.error("❌ 算数の科目が見つかりません")
    return
  }

  // getContentTypeId と同じロジックでクエリ
  const { data, error } = await supabase
    .from("study_content_types")
    .select("id, content_name")
    .eq("grade", 5)
    .eq("subject_id", subject.id)
    .eq("course", "A")
    .eq("content_name", "類題")
    .single()

  if (error) {
    console.error("❌ エラー:", error)
    return
  }

  console.log(`✅ 取得成功: ID=${data.id}, 学習内容名=${data.content_name}`)
}

async function testStudyContentTypesSchema() {
  console.log("\n=== Test 3: study_content_types テーブル構造確認 ===")

  const { data, error } = await supabase
    .from("study_content_types")
    .select("*")
    .limit(5)

  if (error) {
    console.error("❌ エラー:", error)
    return
  }

  console.log(`✅ データサンプル (先頭5件):`)
  console.log(JSON.stringify(data, null, 2))
}

async function main() {
  console.log("🧪 study_content_types 関連関数のテスト開始\n")

  await testStudyContentTypesSchema()
  await testGetContentTypes()
  await testGetContentTypeId()

  console.log("\n✅ すべてのテスト完了\n")
}

main().catch(console.error)
