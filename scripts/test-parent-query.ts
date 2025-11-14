/**
 * 保護者クエリのテスト（Cron jobと同じロジック）
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function main() {
  console.log('🔍 Testing parent query (same as Cron job)...\n')
  console.log(`📡 Connecting to: ${supabaseUrl}\n`)

  try {
    // Cron jobと全く同じクエリ
    const { data: allParents, error: parentsError } = await supabase
      .from("parents")
      .select(`
        id,
        user_id,
        parent_students (
          student_id,
          grade,
          course,
          full_name
        )
      `)

    console.log('Query result:')
    console.log('- Error:', parentsError)
    console.log('- Data count:', allParents?.length)
    console.log('\nFull data:')
    console.log(JSON.stringify(allParents, null, 2))

  } catch (error) {
    console.error('\n❌ Error during test:', error)
    process.exit(1)
  }
}

main()
