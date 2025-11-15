/**
 * 全生徒のリスト表示
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
  const { data: students, error } = await supabase
    .from('students')
    .select('id, login_id, full_name, grade, course')
    .order('login_id')

  if (error) {
    console.error('Error:', error)
    process.exit(1)
  }

  console.log(`\n全生徒数: ${students?.length || 0}名\n`)
  students?.forEach((s, i) => {
    console.log(`${i + 1}. ${s.login_id} - ${s.full_name} (小${s.grade}・${s.course}コース)`)
  })
}

main()
