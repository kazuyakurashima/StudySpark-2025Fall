/**
 * AIキャッシュをクリア
 */

import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321"
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""

async function clearAICache() {
  const supabase = createClient(supabaseUrl, supabaseKey)

  // コマンドライン引数でキャッシュタイプを指定（デフォルトは全て）
  const cacheType = process.argv[2] // "coach_message", "daily_status", or undefined for all

  if (cacheType) {
    console.log(`🗑️  Clearing ${cacheType} cache...`)

    const { data, error } = await supabase
      .from("ai_cache")
      .delete()
      .eq("cache_type", cacheType)
      .select()

    if (error) {
      console.error("❌ Error clearing cache:", error)
      process.exit(1)
    }

    console.log(`✅ Successfully cleared ${data?.length || 0} cache entries`)
  } else {
    console.log("🗑️  Clearing all AI cache...")

    const { data, error } = await supabase
      .from("ai_cache")
      .delete()
      .neq("cache_type", "")
      .select()

    if (error) {
      console.error("❌ Error clearing cache:", error)
      process.exit(1)
    }

    console.log(`✅ Successfully cleared ${data?.length || 0} cache entries`)
  }
}

clearAICache()
