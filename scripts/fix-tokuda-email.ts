/**
 * 徳田創大くんのAuthメールアドレスを .local に修正
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
  console.log('🔧 徳田創大くんのメールアドレス修正...\n')

  try {
    const studentLoginId = 'soudai6'
    const oldEmail = `${studentLoginId}@studyspark.internal`
    const newEmail = `${studentLoginId}@studyspark.local`

    // 1. 現在のAuthユーザーを取得
    const { data: authUsers } = await supabase.auth.admin.listUsers()
    const studentAuth = authUsers.users.find(u => u.email === oldEmail)

    if (!studentAuth) {
      console.error(`❌ ${oldEmail} のAuthユーザーが見つかりません`)
      process.exit(1)
    }

    console.log(`現在のメール: ${studentAuth.email}`)
    console.log(`ユーザーID: ${studentAuth.id}`)

    // 2. メールアドレスを更新
    console.log(`\n📧 メールアドレスを変更中...`)
    console.log(`  ${oldEmail}`)
    console.log(`  ↓`)
    console.log(`  ${newEmail}`)

    const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(
      studentAuth.id,
      {
        email: newEmail,
        email_confirm: true
      }
    )

    if (updateError) {
      console.error('❌ メールアドレス更新エラー:', updateError)
      process.exit(1)
    }

    console.log('\n✅ メールアドレス更新完了')

    // 3. 確認
    const { data: verifyUsers } = await supabase.auth.admin.listUsers()
    const verifyUser = verifyUsers.users.find(u => u.id === studentAuth.id)

    console.log('\n【確認】')
    console.log(`更新後のメール: ${verifyUser?.email}`)
    console.log(`Email確認済み: ${verifyUser?.email_confirmed_at ? '✅' : '❌'}`)

    // 4. ログインテスト
    console.log('\n【ログインテスト】')
    const { data: loginTest, error: loginError } = await supabase.auth.signInWithPassword({
      email: newEmail,
      password: 'pass2025'
    })

    if (loginError) {
      console.log(`  ❌ ログイン失敗: ${loginError.message}`)
    } else {
      console.log(`  ✅ ログイン成功`)
      await supabase.auth.signOut()
    }

    console.log('\n' + '='.repeat(60))
    console.log('✅ 修正完了')
    console.log('='.repeat(60))
    console.log('\n【ログイン情報】')
    console.log(`ログインID: ${studentLoginId}`)
    console.log(`パスワード: pass2025`)

  } catch (error) {
    console.error('❌ エラー:', error)
    process.exit(1)
  }
}

main()
