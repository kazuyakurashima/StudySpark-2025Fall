import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function fixTestSchedule3ResultPeriod() {
  console.log('🔧 Fixing test_schedule ID 3 result entry period...')

  // 現在の日時（JST）
  const now = new Date()
  const jstNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }))

  // 結果入力期間を今日から7日後までに設定
  const startDate = new Date(jstNow)
  startDate.setHours(0, 0, 0, 0)

  const endDate = new Date(jstNow)
  endDate.setDate(endDate.getDate() + 7)
  endDate.setHours(23, 59, 59, 999)

  console.log(`📅 Setting result entry period:`)
  console.log(`   Start: ${startDate.toISOString()}`)
  console.log(`   End: ${endDate.toISOString()}`)

  // Schedule ID 3の結果入力期間を更新
  const { data, error } = await supabase
    .from('test_schedules')
    .update({
      result_entry_start_date: startDate.toISOString().split('T')[0],
      result_entry_end_date: endDate.toISOString().split('T')[0],
    })
    .eq('id', 3)
    .select()

  if (error) {
    console.error('❌ Error updating test schedule:', error)
    return
  }

  console.log('✅ Successfully updated test schedule 3:')
  console.log(data)

  // 確認
  const { data: schedule } = await supabase
    .from('test_schedules')
    .select('*, test_types(*)')
    .eq('id', 3)
    .single()

  console.log('\n📋 Updated test schedule:')
  console.log(`   ID: ${schedule?.id}`)
  console.log(`   Test: ${schedule?.test_types?.name}`)
  console.log(`   Test Date: ${schedule?.test_date}`)
  console.log(`   Result Entry: ${schedule?.result_entry_start_date} ~ ${schedule?.result_entry_end_date}`)
}

fixTestSchedule3ResultPeriod()
  .then(() => {
    console.log('\n✨ Done!')
    process.exit(0)
  })
  .catch((err) => {
    console.error('Fatal error:', err)
    process.exit(1)
  })
