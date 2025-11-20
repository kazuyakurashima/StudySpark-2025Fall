/**
 * 徳田創大くんのデータ補完スクリプト
 *
 * 既にAuthアカウントが作成済みなので、profiles/parents/students/親子関係のみを作成
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
  console.log('➕ 徳田創大くんのデータ補完...\n')

  try {
    const parentEmail = 'demo-parent25@example.com'
    const studentLoginId = 'soudai6'

    // 1. Authユーザーを取得
    console.log('🔍 Authユーザー取得中...')
    const { data: authUsers } = await supabase.auth.admin.listUsers()

    const parentAuthUser = authUsers.users.find(u => u.email === parentEmail)
    const studentAuthUser = authUsers.users.find(u => u.email === `${studentLoginId}@studyspark.internal`)

    if (!parentAuthUser || !studentAuthUser) {
      console.error('❌ Authユーザーが見つかりません')
      console.log(`保護者: ${parentAuthUser ? '✅' : '❌'}`)
      console.log(`生徒: ${studentAuthUser ? '✅' : '❌'}`)
      process.exit(1)
    }

    const parentUserId = parentAuthUser.id
    const studentUserId = studentAuthUser.id

    console.log(`   ✅ 保護者Auth: ${parentUserId}`)
    console.log(`   ✅ 生徒Auth: ${studentUserId}`)

    // 2. 保護者のprofile/parentsレコード作成
    console.log('\n📧 保護者レコード作成中...')

    // profilesチェック
    const { data: existingParentProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', parentUserId)
      .single()

    if (!existingParentProfile) {
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
        console.error('❌ 保護者プロフィール作成エラー:', profileError)
      } else {
        console.log('   ✅ 保護者プロフィール作成完了')
      }
    } else {
      console.log('   ℹ️  保護者プロフィール既存')
    }

    // parentsチェック
    const { data: existingParent } = await supabase
      .from('parents')
      .select('id')
      .eq('user_id', parentUserId)
      .single()

    let parentId: number

    if (!existingParent) {
      const { data: parentRecord, error: parentError } = await supabase
        .from('parents')
        .insert({
          user_id: parentUserId,
          full_name: '徳田憲樹',
          furigana: 'とくだ'
        })
        .select()
        .single()

      if (parentError || !parentRecord) {
        console.error('❌ 保護者レコード作成エラー:', parentError)
        process.exit(1)
      }

      parentId = parentRecord.id
      console.log('   ✅ 保護者レコード作成完了')
    } else {
      parentId = existingParent.id
      console.log('   ℹ️  保護者レコード既存')
    }

    // 3. 生徒のprofile/studentsレコード作成
    console.log('\n👤 生徒レコード作成中...')

    // profilesチェック
    const { data: existingStudentProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', studentUserId)
      .single()

    if (!existingStudentProfile) {
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
    } else {
      console.log('   ℹ️  生徒プロフィール既存')
    }

    // studentsチェック
    const { data: existingStudent } = await supabase
      .from('students')
      .select('id')
      .eq('user_id', studentUserId)
      .single()

    let studentId: number

    if (!existingStudent) {
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

      if (studentRecordError || !studentRecord) {
        console.error('❌ 生徒レコード作成エラー:', studentRecordError)
        process.exit(1)
      }

      studentId = studentRecord.id
      console.log('   ✅ 生徒レコード作成完了')
    } else {
      studentId = existingStudent.id
      console.log('   ℹ️  生徒レコード既存')
    }

    // 4. 親子関係作成
    console.log('\n👨‍👦 親子関係作成中...')

    const { data: existingRelation } = await supabase
      .from('parent_child_relations')
      .select('id')
      .eq('parent_id', parentId)
      .eq('student_id', studentId)
      .single()

    if (!existingRelation) {
      const { error: relationError } = await supabase
        .from('parent_child_relations')
        .insert({
          parent_id: parentId,
          student_id: studentId
        })

      if (relationError) {
        console.error('❌ 親子関係作成エラー:', relationError)
      } else {
        console.log('   ✅ 親子関係作成完了')
      }
    } else {
      console.log('   ℹ️  親子関係既存')
    }

    console.log('\n' + '='.repeat(60))
    console.log('✅ 徳田創大くんのデータ補完完了')
    console.log('='.repeat(60))
    console.log('\n【アカウント情報】')
    console.log(`生徒ログインID: ${studentLoginId}`)
    console.log(`生徒パスワード: pass2025`)
    console.log(`保護者メール: ${parentEmail}`)
    console.log(`保護者パスワード: pass3816`)

  } catch (error) {
    console.error('❌ エラー:', error)
    process.exit(1)
  }
}

main()
