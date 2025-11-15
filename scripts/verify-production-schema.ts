/**
 * 本番環境のスキーマ確認スクリプト
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
  console.log('🔍 Verifying production schema...\n')

  try {
    // 1. Langfuseテーブルの存在確認
    console.log('1️⃣ Checking Langfuse tables...')
    const { data: langfuseTraces, error: tracesError } = await supabase
      .from('langfuse_traces')
      .select('id')
      .limit(0)

    console.log(tracesError ? `   ❌ langfuse_traces: ${tracesError.message}` : '   ✅ langfuse_traces exists')

    // 2. ai_cache.student_idカラムの存在確認
    console.log('\n2️⃣ Checking ai_cache.student_id column...')
    const { data: aiCache, error: aiCacheError } = await supabase
      .from('ai_cache')
      .select('student_id')
      .limit(0)

    console.log(aiCacheError ? `   ❌ student_id: ${aiCacheError.message}` : '   ✅ ai_cache.student_id exists')

    // 3. parent_students VIEWの存在確認
    console.log('\n3️⃣ Checking parent_students view...')
    const { data: parentStudents, error: viewError } = await supabase
      .from('parent_students')
      .select('student_id, full_name')
      .limit(1)

    console.log(viewError ? `   ❌ parent_students: ${viewError.message}` : `   ✅ parent_students exists (${parentStudents?.length || 0} rows)`)

    // 4. 応援メッセージ関連の確認
    console.log('\n4️⃣ Checking encouragement_messages view...')
    const { data: encouragement, error: encouragementError } = await supabase
      .from('encouragement_messages')
      .select('id, sender_profile_nickname')
      .limit(1)

    console.log(encouragementError ? `   ❌ encouragement_messages: ${encouragementError.message}` : `   ✅ encouragement_messages exists with sender_profile_nickname`)

    // 5. RPC関数の確認
    console.log('\n5️⃣ Checking get_study_logs_for_encouragement RPC...')
    const { data: rpcResult, error: rpcError } = await supabase
      .rpc('get_study_logs_for_encouragement', { student_id_param: 1 })

    console.log(rpcError ? `   ❌ get_study_logs_for_encouragement: ${rpcError.message}` : '   ✅ get_study_logs_for_encouragement exists')

    console.log('\n' + '='.repeat(50))
    console.log('Summary:')
    console.log('- Langfuse integration:', tracesError ? '❌ NOT applied' : '✅ Applied')
    console.log('- Cron job support:', (aiCacheError || viewError) ? '❌ NOT applied' : '✅ Applied')
    console.log('- Encouragement features:', (encouragementError || rpcError) ? '❌ NOT applied' : '✅ Applied')
    console.log('='.repeat(50))

  } catch (error) {
    console.error('\n❌ Error:', error)
    process.exit(1)
  }
}

main()
