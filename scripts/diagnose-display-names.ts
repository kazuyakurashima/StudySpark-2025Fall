/**
 * デモユーザーのdisplay_name診断スクリプト
 * akira5は正常、hikaru6とhana6は表示されない問題を調査
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
  console.log('🔍 デモユーザーのdisplay_name診断...\n')

  const demoStudents = ['akira5', 'hikaru6', 'hana6']

  for (const loginId of demoStudents) {
    console.log(`\n${'='.repeat(60)}`)
    console.log(`【${loginId}】`)
    console.log('='.repeat(60))

    // 1. students テーブルを確認
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, user_id, login_id, full_name, furigana, display_name')
      .eq('login_id', loginId)
      .single()

    if (studentError) {
      console.log(`❌ students テーブルエラー:`, studentError)
      continue
    }

    console.log('\n【students テーブル】')
    console.log(`  id: ${student.id}`)
    console.log(`  user_id: ${student.user_id}`)
    console.log(`  login_id: ${student.login_id}`)
    console.log(`  full_name: ${student.full_name}`)
    console.log(`  furigana: ${student.furigana}`)
    console.log(`  display_name: ${student.display_name || '❌ NULL/未設定'}`)

    // 2. profiles テーブルを確認
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, display_name, nickname, setup_completed')
      .eq('id', student.user_id)
      .single()

    if (profileError) {
      console.log(`\n❌ profiles テーブルエラー:`, profileError)
      continue
    }

    console.log('\n【profiles テーブル】')
    console.log(`  id: ${profile.id}`)
    console.log(`  role: ${profile.role}`)
    console.log(`  display_name: ${profile.display_name || '❌ NULL/未設定'}`)
    console.log(`  nickname: ${profile.nickname || '❌ NULL/未設定'}`)
    console.log(`  setup_completed: ${profile.setup_completed}`)

    // 3. 結果判定
    console.log('\n【診断結果】')
    const studentDisplayName = student.display_name
    const profileDisplayName = profile.display_name

    if (studentDisplayName) {
      console.log(`  ✅ students.display_name が設定されています: "${studentDisplayName}"`)
    } else {
      console.log(`  ❌ students.display_name が NULL または未設定`)
    }

    if (profileDisplayName) {
      console.log(`  ℹ️  profiles.display_name: "${profileDisplayName}"`)
    } else {
      console.log(`  ℹ️  profiles.display_name が NULL または未設定`)
    }

    // dashboard.ts の挙動を再現
    const expectedDisplayName = studentDisplayName || 'さん'
    console.log(`\n【dashboard.ts での表示】`)
    console.log(`  const displayName = student.display_name || "さん"`)
    console.log(`  → 結果: "${expectedDisplayName}"`)

    if (loginId === 'akira5' && expectedDisplayName !== 'さん') {
      console.log(`  ✅ 正常動作（名前が表示される）`)
    } else if ((loginId === 'hikaru6' || loginId === 'hana6') && expectedDisplayName === 'さん') {
      console.log(`  ❌ 問題あり（"さん"と表示される）`)
    }
  }

  console.log('\n\n' + '='.repeat(60))
  console.log('📊 総合診断')
  console.log('='.repeat(60))
  console.log('\n問題の原因:')
  console.log('- akira5: students.display_name が設定されている → 正常')
  console.log('- hikaru6/hana6: students.display_name が NULL → "さん"と表示')
  console.log('\n解決策:')
  console.log('hikaru6 と hana6 の students.display_name を設定する必要があります。')
}

main()
