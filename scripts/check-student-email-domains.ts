/**
 * 全生徒のメールアドレスドメイン確認
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
  console.log('🔍 生徒のメールアドレスドメイン確認...\n')

  try {
    // 1. 全生徒を取得
    const { data: students } = await supabase
      .from('students')
      .select('id, user_id, login_id, full_name')
      .order('login_id')

    if (!students || students.length === 0) {
      console.log('生徒が見つかりません')
      return
    }

    console.log(`全生徒数: ${students.length}名\n`)

    // 2. 各生徒のAuthメールアドレスを確認
    const { data: authUsers } = await supabase.auth.admin.listUsers()

    const localDomain: string[] = []
    const internalDomain: string[] = []
    const otherDomain: string[] = []

    students.forEach(student => {
      const authUser = authUsers.users.find(u => u.id === student.user_id)

      if (authUser) {
        const email = authUser.email || ''

        if (email.endsWith('@studyspark.local')) {
          localDomain.push(`${student.login_id} (${student.full_name}) - ${email}`)
        } else if (email.endsWith('@studyspark.internal')) {
          internalDomain.push(`${student.login_id} (${student.full_name}) - ${email}`)
        } else {
          otherDomain.push(`${student.login_id} (${student.full_name}) - ${email}`)
        }
      } else {
        otherDomain.push(`${student.login_id} (${student.full_name}) - ❌ Authユーザーなし`)
      }
    })

    console.log('【@studyspark.local ドメイン】')
    console.log(`件数: ${localDomain.length}名`)
    localDomain.forEach(s => console.log(`  - ${s}`))

    console.log('\n【@studyspark.internal ドメイン】')
    console.log(`件数: ${internalDomain.length}名`)
    internalDomain.forEach(s => console.log(`  - ${s}`))

    console.log('\n【その他】')
    console.log(`件数: ${otherDomain.length}名`)
    otherDomain.forEach(s => console.log(`  - ${s}`))

    console.log('\n' + '='.repeat(60))
    console.log('📊 サマリー')
    console.log('='.repeat(60))
    console.log(`@studyspark.local: ${localDomain.length}名`)
    console.log(`@studyspark.internal: ${internalDomain.length}名`)
    console.log(`その他: ${otherDomain.length}名`)

  } catch (error) {
    console.error('❌ エラー:', error)
    process.exit(1)
  }
}

main()
