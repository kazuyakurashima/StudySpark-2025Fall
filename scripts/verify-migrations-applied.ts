/**
 * マイグレーション適用確認スクリプト
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
  console.log('🔍 Verifying migrations applied...\n')

  try {
    // 1. RLS関数の存在確認
    console.log('1️⃣ Checking is_encouragement_sender_for_current_user function...')
    const { data: funcResult, error: funcError } = await supabase
      .rpc('is_encouragement_sender_for_current_user', {
        profile_id: '00000000-0000-0000-0000-000000000000'
      })

    if (funcError) {
      console.log(`   ❌ Function not found: ${funcError.message}`)
    } else {
      console.log(`   ✅ Function exists (returned: ${funcResult})`)
    }

    // 2. get_study_logs_for_encouragement RPC関数
    console.log('\n2️⃣ Checking get_study_logs_for_encouragement function...')
    const { data: logsResult, error: logsError } = await supabase
      .rpc('get_study_logs_for_encouragement', {
        p_student_id: 1,
        p_limit: 1
      })

    if (logsError) {
      console.log(`   ❌ Function not found: ${logsError.message}`)
    } else {
      console.log(`   ✅ Function exists (returned ${logsResult?.length || 0} rows)`)
    }

    // 3. setup_completed の更新確認
    console.log('\n3️⃣ Checking setup_completed updates...')
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, setup_completed, avatar_id')
      .not('avatar_id', 'is', null)
      .limit(5)

    if (profilesError) {
      console.log(`   ❌ Error: ${profilesError.message}`)
    } else {
      const completedCount = profiles?.filter(p => p.setup_completed).length || 0
      console.log(`   ✅ Profiles checked: ${profiles?.length || 0}`)
      console.log(`   ✅ Setup completed: ${completedCount}/${profiles?.length || 0}`)
    }

    // 4. test_schedules の goal_setting_end_date 確認
    console.log('\n4️⃣ Checking test_schedules goal_setting_end_date...')
    const { data: tests, error: testsError } = await supabase
      .from('test_schedules')
      .select('id, test_date, goal_setting_end_date')
      .limit(5)

    if (testsError) {
      console.log(`   ❌ Error: ${testsError.message}`)
    } else {
      const matchingCount = tests?.filter(t => t.test_date === t.goal_setting_end_date).length || 0
      console.log(`   ✅ Test schedules checked: ${tests?.length || 0}`)
      console.log(`   ✅ Matching dates: ${matchingCount}/${tests?.length || 0}`)
    }

    console.log('\n' + '='.repeat(50))
    console.log('Summary:')
    console.log('- Migration 1 (RLS function):', funcError ? '❌ NOT applied' : '✅ Applied')
    console.log('- Migration 2 (RPC function):', logsError ? '❌ NOT applied' : '✅ Applied')
    console.log('- Migration 3 (setup_completed):', profilesError ? '❌ NOT applied' : '✅ Applied')
    console.log('- Migration 4 (goal_setting dates):', testsError ? '❌ NOT applied' : '✅ Applied')
    console.log('='.repeat(50))

  } catch (error) {
    console.error('\n❌ Error:', error)
    process.exit(1)
  }
}

main()
