/**
 * AIコーチメッセージのキャッシュをクリア
 */

import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321"
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""

async function clearCoachCache() {
  const supabase = createClient(supabaseUrl, supabaseKey)

  console.log("🗑️  Clearing coach message cache...")

  const { data, error } = await supabase
    .from("ai_cache")
    .delete()
    .eq("cache_type", "coach_message")
    .select()

  if (error) {
    console.error("❌ Error clearing cache:", error)
    process.exit(1)
  }

  console.log(`✅ Successfully cleared ${data?.length || 0} cache entries`)
}

clearCoachCache()
