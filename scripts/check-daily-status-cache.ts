/**
 * daily_statusキャッシュ確認スクリプト
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
  console.log('🔍 Checking daily_status cache...\n')

  try {
    const { data, error } = await supabase
      .from('ai_cache')
      .select('cache_key, cache_type, student_id, created_at')
      .eq('cache_type', 'daily_status')
      .order('created_at', { ascending: false })
      .limit(25)

    if (error) {
      console.error('❌ Error:', error)
      process.exit(1)
    }

    console.log(`📊 最新のdaily_statusキャッシュ: ${data?.length || 0}件\n`)

    if (data && data.length > 0) {
      data.forEach((item, i) => {
        const createdAt = new Date(item.created_at).toLocaleString('ja-JP', {
          timeZone: 'Asia/Tokyo',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        })
        console.log(`${i+1}. Student ID: ${item.student_id}, Created: ${createdAt}`)
      })
    }

    // 学生IDごとにグループ化
    const groupedByStudent = data?.reduce((acc: any, item) => {
      if (!acc[item.student_id]) {
        acc[item.student_id] = 0
      }
      acc[item.student_id]++
      return acc
    }, {})

    console.log(`\n📈 学生別メッセージ数:`)
    Object.entries(groupedByStudent || {}).forEach(([studentId, count]) => {
      console.log(`  Student ${studentId}: ${count}件`)
    })

    console.log(`\n✅ 合計: ${Object.keys(groupedByStudent || {}).length}人の学生`)

  } catch (error) {
    console.error('\n❌ Error:', error)
    process.exit(1)
  }
}

main()
