/**
 * ローカル環境のprofiles.setup_completedを一括更新
 * 本番環境と同じ挙動にするため、全ユーザーをsetup_completed=trueに設定
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
  console.log('🔧 ローカル環境のsetup_completedフラグ更新...\n')

  // 1. 現在の状態を確認
  const { data: beforeProfiles, error: selectError } = await supabase
    .from('profiles')
    .select('id, role, setup_completed')
    .eq('setup_completed', false)

  if (selectError) {
    console.error('❌ 検索エラー:', selectError)
    process.exit(1)
  }

  if (!beforeProfiles || beforeProfiles.length === 0) {
    console.log('✅ 全ユーザーが既にsetup_completed=trueです')
    return
  }

  console.log(`更新対象: ${beforeProfiles.length}件`)
  console.log('─'.repeat(60))
  beforeProfiles.forEach(p => {
    console.log(`  - ${p.role} (ID: ${p.id.substring(0, 8)}...)`)
  })
  console.log('─'.repeat(60))

  // 2. 一括更新
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ setup_completed: true })
    .eq('setup_completed', false)

  if (updateError) {
    console.error('\n❌ 更新エラー:', updateError)
    process.exit(1)
  }

  console.log(`\n✅ ${beforeProfiles.length}件のプロフィールを更新しました`)

  // 3. 確認
  const { data: afterProfiles } = await supabase
    .from('profiles')
    .select('setup_completed')
    .eq('setup_completed', false)

  console.log(`\n【確認】setup_completed=false の残り: ${afterProfiles?.length || 0}件`)

  console.log('\n' + '='.repeat(60))
  console.log('✅ ローカル環境が本番環境と同じ状態になりました')
  console.log('='.repeat(60))
  console.log('\n次回ログイン時、セットアップをスキップしてダッシュボードに直接遷移します。')
}

main()
