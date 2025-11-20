/**
 * 徳田創大くん（soudai6）のデータ追加スクリプト
 *
 * 追加内容:
 * - 生徒: 德田創大 (soudai6)
 * - 保護者: 徳田憲樹 (demo-parent25@example.com)
 * - 親子関係
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
  console.log('➕ 徳田創大くんのデータ追加...\n')

  try {
    // 1. 既に存在するか確認
    const { data: existingStudent } = await supabase
      .from('students')
      .select('id, login_id, full_name')
      .eq('login_id', 'soudai6')
      .single()

    if (existingStudent) {
      console.log(`✅ 生徒データは既に存在します: ${existingStudent.full_name} (${existingStudent.login_id})`)
      return
    }

    // 2. 保護者アカウントを確認/作成
    console.log('📧 保護者アカウント確認...')

    const parentEmail = 'demo-parent25@example.com'
    const parentPassword = 'pass3816'

    // まず既存の保護者を確認
    const { data: existingAuthUser } = await supabase.auth.admin.listUsers()
    const existingParent = existingAuthUser.users.find(u => u.email === parentEmail)

    let parentUserId: string

    if (existingParent) {
      console.log(`   ✅ 保護者アカウント存在: ${parentEmail}`)
      parentUserId = existingParent.id
    } else {
      console.log(`   ➕ 保護者アカウント作成中...`)
      const { data: newParent, error: authError } = await supabase.auth.admin.createUser({
        email: parentEmail,
        password: parentPassword,
        email_confirm: true,
        user_metadata: {
          role: 'parent',
          full_name: '徳田憲樹',
          display_name: 'とくだ'
        }
      })

      if (authError) {
        console.error('❌ 保護者アカウント作成エラー:', authError)
        process.exit(1)
      }

      parentUserId = newParent.user.id
      console.log(`   ✅ 保護者アカウント作成完了: ${parentEmail}`)

      // profilesレコード作成
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: parentUserId,
          role: 'parent',
          display_name: 'とくだ',
          nickname: 'とくだ',
          setup_completed: true
        })

      if (profileError) {
        console.error('❌ プロフィール作成エラー:', profileError)
      } else {
        console.log('   ✅ プロフィール作成完了')
      }

      // parentsレコード作成
      const { error: parentError } = await supabase
        .from('parents')
        .insert({
          user_id: parentUserId,
          full_name: '徳田憲樹',
          furigana: 'とくだ'
        })

      if (parentError) {
        console.error('❌ 保護者レコード作成エラー:', parentError)
      } else {
        console.log('   ✅ 保護者レコード作成完了')
      }
    }

    // 3. 生徒アカウント作成
    console.log('\n👤 生徒アカウント作成中...')

    const studentLoginId = 'soudai6'
    const studentPassword = 'pass2025'

    const { data: newStudent, error: studentAuthError } = await supabase.auth.admin.createUser({
      email: `${studentLoginId}@studyspark.internal`,
      password: studentPassword,
      email_confirm: true,
      user_metadata: {
        role: 'student',
        login_id: studentLoginId,
        full_name: '德田創大',
        display_name: 'そうだい'
      }
    })

    if (studentAuthError) {
      console.error('❌ 生徒アカウント作成エラー:', studentAuthError)
      process.exit(1)
    }

    const studentUserId = newStudent.user.id
    console.log(`   ✅ 生徒アカウント作成完了: ${studentLoginId}`)

    // 4. profilesレコード作成
    const { error: studentProfileError } = await supabase
      .from('profiles')
      .insert({
        id: studentUserId,
        role: 'student',
        display_name: 'そうだい',
        nickname: 'そうだい',
        setup_completed: true
      })

    if (studentProfileError) {
      console.error('❌ 生徒プロフィール作成エラー:', studentProfileError)
    } else {
      console.log('   ✅ 生徒プロフィール作成完了')
    }

    // 5. studentsレコード作成
    const { data: studentRecord, error: studentRecordError } = await supabase
      .from('students')
      .insert({
        user_id: studentUserId,
        login_id: studentLoginId,
        full_name: '德田創大',
        furigana: 'そうだい',
        grade: 6,
        course: 'B'
      })
      .select()
      .single()

    if (studentRecordError) {
      console.error('❌ 生徒レコード作成エラー:', studentRecordError)
      process.exit(1)
    }

    console.log('   ✅ 生徒レコード作成完了')

    // 6. 親子関係作成
    console.log('\n👨‍👦 親子関係作成中...')

    const { error: relationError } = await supabase
      .from('parent_child_relations')
      .insert({
        parent_user_id: parentUserId,
        student_id: studentRecord.id
      })

    if (relationError) {
      console.error('❌ 親子関係作成エラー:', relationError)
    } else {
      console.log('   ✅ 親子関係作成完了')
    }

    console.log('\n' + '='.repeat(60))
    console.log('✅ 徳田創大くんのデータ追加完了')
    console.log('='.repeat(60))
    console.log('\n【アカウント情報】')
    console.log(`生徒ログインID: ${studentLoginId}`)
    console.log(`生徒パスワード: ${studentPassword}`)
    console.log(`保護者メール: ${parentEmail}`)
    console.log(`保護者パスワード: ${parentPassword}`)

  } catch (error) {
    console.error('❌ エラー:', error)
    process.exit(1)
  }
}

main()
