/**
 * 徳田アカウントの検証
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
  console.log('🔍 徳田アカウント検証...\n')

  try {
    const parentEmail = 'demo-parent25@example.com'
    const studentLoginId = 'soudai6'
    const studentEmail = `${studentLoginId}@studyspark.internal`

    // 1. Authユーザーを確認
    console.log('【Auth アカウント】')
    const { data: authUsers } = await supabase.auth.admin.listUsers()

    const parentAuth = authUsers.users.find(u => u.email === parentEmail)
    const studentAuth = authUsers.users.find(u => u.email === studentEmail)

    console.log(`\n保護者 (${parentEmail}):`)
    if (parentAuth) {
      console.log(`  ✅ Auth User ID: ${parentAuth.id}`)
      console.log(`  Email確認: ${parentAuth.email_confirmed_at ? '✅ 確認済み' : '❌ 未確認'}`)
      console.log(`  作成日: ${parentAuth.created_at}`)
      console.log(`  メタデータ:`, parentAuth.user_metadata)
    } else {
      console.log('  ❌ Authアカウントが見つかりません')
    }

    console.log(`\n生徒 (${studentEmail}):`)
    if (studentAuth) {
      console.log(`  ✅ Auth User ID: ${studentAuth.id}`)
      console.log(`  Email確認: ${studentAuth.email_confirmed_at ? '✅ 確認済み' : '❌ 未確認'}`)
      console.log(`  作成日: ${studentAuth.created_at}`)
      console.log(`  メタデータ:`, studentAuth.user_metadata)
    } else {
      console.log('  ❌ Authアカウントが見つかりません')
    }

    // 2. profiles確認
    console.log('\n\n【profiles テーブル】')
    if (parentAuth) {
      const { data: parentProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', parentAuth.id)
        .single()

      console.log(`保護者プロフィール:`, parentProfile ? '✅' : '❌')
      if (parentProfile) {
        console.log('  ', parentProfile)
      }
    }

    if (studentAuth) {
      const { data: studentProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', studentAuth.id)
        .single()

      console.log(`生徒プロフィール:`, studentProfile ? '✅' : '❌')
      if (studentProfile) {
        console.log('  ', studentProfile)
      }
    }

    // 3. parents/students確認
    console.log('\n\n【parents / students テーブル】')
    if (parentAuth) {
      const { data: parentRecord } = await supabase
        .from('parents')
        .select('*')
        .eq('user_id', parentAuth.id)
        .single()

      console.log(`保護者レコード:`, parentRecord ? '✅' : '❌')
      if (parentRecord) {
        console.log('  ', parentRecord)
      }
    }

    if (studentAuth) {
      const { data: studentRecord } = await supabase
        .from('students')
        .select('*')
        .eq('user_id', studentAuth.id)
        .single()

      console.log(`生徒レコード:`, studentRecord ? '✅' : '❌')
      if (studentRecord) {
        console.log('  ', studentRecord)
      }
    }

    // 4. ログインテスト（保護者）
    console.log('\n\n【ログインテスト】')
    console.log('保護者ログインテスト...')
    const { data: parentSignIn, error: parentSignInError } = await supabase.auth.signInWithPassword({
      email: parentEmail,
      password: 'pass3816'
    })

    if (parentSignInError) {
      console.log(`  ❌ ログイン失敗: ${parentSignInError.message}`)
    } else {
      console.log(`  ✅ ログイン成功`)
      await supabase.auth.signOut()
    }

    // 5. ログインテスト（生徒） - Supabase Authは生徒のlogin_idを直接サポートしない
    console.log('\n生徒ログインテスト...')
    const { data: studentSignIn, error: studentSignInError } = await supabase.auth.signInWithPassword({
      email: studentEmail,
      password: 'pass2025'
    })

    if (studentSignInError) {
      console.log(`  ❌ ログイン失敗: ${studentSignInError.message}`)
    } else {
      console.log(`  ✅ ログイン成功`)
      await supabase.auth.signOut()
    }

  } catch (error) {
    console.error('❌ エラー:', error)
    process.exit(1)
  }
}

main()
