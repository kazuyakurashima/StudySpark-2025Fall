/**
 * Test database connection
 */

import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

console.log("URL:", supabaseUrl)
console.log("Key:", supabaseServiceKey ? "✅ Set" : "❌ Not set")

async function testConnection() {
  const client = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  })

  const { data, error } = await client.from("students").select("id, name").limit(5)

  if (error) {
    console.error("Error:", error)
    return
  }

  console.log("Students:", data)
}

testConnection().catch(console.error)
