/**
 * 今日のAIコーチメッセージキャッシュを削除
 * 表示名のフォールバック修正を反映させるため
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
  console.log('🗑️  今日のAIキャッシュ削除...\n')

  // 今日の日付を取得（YYYY-MM-DD形式、JST）
  const now = new Date()
  const jstOffset = 9 * 60 // JST is UTC+9
  const jstDate = new Date(now.getTime() + jstOffset * 60 * 1000)
  const today = jstDate.toISOString().split('T')[0]

  console.log(`対象日付: ${today}`)

  // 今日のcoach_messageキャッシュを検索
  const { data: caches, error: selectError } = await supabase
    .from('ai_cache')
    .select('cache_key, created_at')
    .eq('cache_type', 'coach_message')
    .like('cache_key', `daily_coach_%_${today}`)

  if (selectError) {
    console.error('❌ キャッシュ検索エラー:', selectError)
    process.exit(1)
  }

  if (!caches || caches.length === 0) {
    console.log('\n✅ 削除対象のキャッシュはありません')
    return
  }

  console.log(`\n削除対象: ${caches.length}件`)
  caches.forEach(cache => {
    console.log(`  - ${cache.cache_key}`)
  })

  // 削除実行
  const { error: deleteError } = await supabase
    .from('ai_cache')
    .delete()
    .eq('cache_type', 'coach_message')
    .like('cache_key', `daily_coach_%_${today}`)

  if (deleteError) {
    console.error('\n❌ 削除エラー:', deleteError)
    process.exit(1)
  }

  console.log('\n✅ キャッシュ削除完了')
  console.log('\n次回ログイン時に新しい表示名でメッセージが生成されます。')
}

main()
