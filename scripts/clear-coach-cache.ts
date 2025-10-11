import { createClient } from "@supabase/supabase-js"
import * as dotenv from "dotenv"
import * as path from "path"

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") })

async function clearCoachCache() {
  console.log("🧹 Clearing coach message cache...")

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("❌ Missing Supabase credentials")
    console.error(`URL: ${supabaseUrl}`)
    console.error(`Key: ${supabaseServiceKey ? "present" : "missing"}`)
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const { data, error } = await supabase
    .from("ai_cache")
    .delete()
    .eq("cache_type", "coach_message")
    .select()

  if (error) {
    console.error("❌ Error clearing cache:", error)
    process.exit(1)
  }

  console.log(`✅ Successfully cleared ${data?.length || 0} cached coach messages`)
  console.log("\n次にログインすると、新しいAIメッセージが生成されます。")
}

clearCoachCache()
