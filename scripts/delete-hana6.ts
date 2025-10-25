import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function main() {
  console.log('🗑️  hana6 ユーザーを検索中...')

  // hana6 のユーザーIDを取得
  const { data: users, error } = await supabase.auth.admin.listUsers()
  if (error) {
    console.error('❌ ユーザー一覧取得エラー:', error)
    throw error
  }

  const hana6 = users.users.find(u => u.email === 'hana6@studyspark.local')
  if (!hana6) {
    console.log('✓ hana6 は既に削除されています')
    return
  }

  console.log(`📧 hana6 を発見: ${hana6.id}`)

  // 安全に削除
  const { error: deleteError } = await supabase.auth.admin.deleteUser(hana6.id)
  if (deleteError) {
    console.error('❌ 削除エラー:', deleteError)
    throw deleteError
  }

  console.log('✓ hana6 を削除しました')
}

main().catch(console.error)
