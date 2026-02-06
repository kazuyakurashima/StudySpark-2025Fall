/**
 * 新小5生徒（5名）の一括登録スクリプト
 *
 * 前提条件:
 *   以下の依存関係をインストールしてください:
 *   pnpm add csv-parse iconv-lite
 *   pnpm add -D @types/node
 *
 * 実行方法:
 *   npx tsx scripts/register-grade5-students.ts <csv_file_path>
 *
 * 例:
 *   npx tsx scripts/register-grade5-students.ts ~/Downloads/生徒保護者情報アカウント.csv
 *
 * 重要な注意事項:
 *   - 実行後、シーケンスの手動更新が必要です（スクリプト終了時に表示されます）
 *   - 途中失敗時は自動ロールバックを試みますが、Auth API の制約によりベストエフォートです
 *   - 本番環境での実行前に必ずステージング環境でテストしてください
 *
 * ロールバック手順（途中失敗時）:
 *   1. スクリプト実行結果で失敗したレコードを確認
 *   2. 以下のSQLで該当ユーザーを削除（user_id を確認してから実行）:
 *      -- 親子関係を削除
 *      DELETE FROM parent_child_relations WHERE parent_id IN (SELECT id FROM parents WHERE user_id = '<parent_user_id>');
 *      -- 保護者詳細を削除
 *      DELETE FROM parents WHERE user_id = '<parent_user_id>';
 *      -- 生徒詳細を削除（もし作成されていた場合）
 *      DELETE FROM students WHERE user_id = '<student_user_id>';
 *      -- プロフィールを削除（CASCADE で auth.users も削除される）
 *      DELETE FROM profiles WHERE id = '<parent_user_id>';
 *      DELETE FROM profiles WHERE id = '<student_user_id>';
 *
 * 機能:
 * - CSV（Shift-JIS）から小5生徒データを読み込み
 * - 重複チェック（email, login_id）
 * - 保護者・生徒の両アカウント作成
 *   - auth.users (Supabase Auth API)
 *   - profiles
 *   - parents / students
 *   - parent_child_relations
 * - シーケンス値の更新（setval）
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import { parse } from 'csv-parse/sync'
import iconv from 'iconv-lite'

// 環境変数チェック
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Error: Missing required environment variables')
  console.error('Please set:')
  console.error('  - NEXT_PUBLIC_SUPABASE_URL')
  console.error('  - SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false }
})

interface StudentRecord {
  学年: number
  保護者氏名: string
  'ログインID (メールアドレス)': string
  パスワード: string
  表示名: string
  ニックネーム: string
  子ども氏名一覧: string
  子どもID一覧: string
  生徒パスワード: string
}

interface RegistrationResult {
  parentEmail: string
  studentLoginId: string
  parentUserId?: string
  studentUserId?: string
  success: boolean
  error?: string
}

async function checkDuplicates(loginId: string) {
  // Login ID の重複チェック（students テーブル）
  // メールアドレスの重複は createUser が自動的にエラーを返すため事前チェック不要
  const { data: studentData, error: studentError } = await supabase
    .from('students')
    .select('login_id')
    .eq('login_id', loginId)
    .maybeSingle()

  if (studentError) {
    throw new Error(`Failed to check login_id: ${studentError.message}`)
  }

  return {
    loginIdExists: !!studentData
  }
}

/**
 * ロールバック処理（ベストエフォート）
 * Auth API はトランザクションに含められないため、可能な限りクリーンアップを試みる
 */
async function rollbackPartialRegistration(
  parentUserId?: string,
  studentUserId?: string,
  parentId?: number,
  studentId?: number
) {
  console.log('\n🔄 Rolling back partial registration...')

  // 親子関係削除（存在する場合）
  if (parentId && studentId) {
    const { error } = await supabase
      .from('parent_child_relations')
      .delete()
      .eq('parent_id', parentId)
      .eq('student_id', studentId)

    if (error) {
      console.error(`  ⚠️  Failed to delete parent_child_relations: ${error.message}`)
    } else {
      console.log('  ✓ Deleted parent_child_relations')
    }
  }

  // 生徒レコード削除
  if (studentId) {
    const { error } = await supabase
      .from('students')
      .delete()
      .eq('id', studentId)

    if (error) {
      console.error(`  ⚠️  Failed to delete student record: ${error.message}`)
    } else {
      console.log('  ✓ Deleted student record')
    }
  }

  // 保護者レコード削除
  if (parentId) {
    const { error } = await supabase
      .from('parents')
      .delete()
      .eq('id', parentId)

    if (error) {
      console.error(`  ⚠️  Failed to delete parent record: ${error.message}`)
    } else {
      console.log('  ✓ Deleted parent record')
    }
  }

  // 生徒アカウント削除（profiles は CASCADE で削除される）
  if (studentUserId) {
    const { error } = await supabase.auth.admin.deleteUser(studentUserId)

    if (error) {
      console.error(`  ⚠️  Failed to delete student auth: ${error.message}`)
    } else {
      console.log('  ✓ Deleted student auth user')
    }
  }

  // 親アカウント削除（profiles は CASCADE で削除される）
  if (parentUserId) {
    const { error } = await supabase.auth.admin.deleteUser(parentUserId)

    if (error) {
      console.error(`  ⚠️  Failed to delete parent auth: ${error.message}`)
    } else {
      console.log('  ✓ Deleted parent auth user')
    }
  }

  console.log('  Rollback completed (best effort)')
}

async function registerStudent(record: StudentRecord): Promise<RegistrationResult> {
  const parentEmail = record['ログインID (メールアドレス)']
  const parentPassword = record['パスワード']
  const parentFullName = record['保護者氏名']      // 例: 小林憲史
  const parentFurigana = record['表示名']          // 例: コバヤシ（保護者のふりがな）

  const studentFullName = record['子ども氏名一覧']  // 例: 小林和輝
  const studentLoginId = record['子どもID一覧']
  const studentPassword = record['生徒パスワード']
  const studentFurigana = record['ニックネーム']    // 例: カズキ（子供のふりがな）

  const result: RegistrationResult = {
    parentEmail,
    studentLoginId,
    success: false
  }

  try {
    // 生徒のメールアドレス（事前に生成）
    const studentEmail = `${studentLoginId}@studyspark.local`

    // 1. 重複チェック（login_id のみ）
    console.log(`\n📋 Checking duplicates for ${studentLoginId}...`)
    const duplicates = await checkDuplicates(studentLoginId)

    if (duplicates.loginIdExists) {
      result.error = `Login ID already exists: ${studentLoginId}`
      console.error(`  ❌ ${result.error}`)
      return result
    }

    console.log('  ✓ No login_id duplicates found')

    // 2. 保護者アカウント作成（auth.users）
    console.log(`\n👨‍👩‍👧 Creating parent account: ${parentEmail}`)
    const { data: parentAuthData, error: parentAuthError } = await supabase.auth.admin.createUser({
      email: parentEmail,
      password: parentPassword,
      email_confirm: true,
      user_metadata: {
        role: 'parent',
        display_name: parentFullName
      }
    })

    if (parentAuthError || !parentAuthData.user) {
      // メール重複エラーの判定
      const isDuplicateEmail = parentAuthError?.message?.includes('already') ||
                               parentAuthError?.message?.includes('duplicate') ||
                               parentAuthError?.message?.includes('exists')

      if (isDuplicateEmail) {
        result.error = `Duplicate: Parent email already exists: ${parentEmail}`
      } else {
        result.error = `Failed to create parent auth: ${parentAuthError?.message}`
      }
      console.error(`  ❌ ${result.error}`)
      return result
    }

    result.parentUserId = parentAuthData.user.id
    console.log(`  ✓ Parent user created: ${result.parentUserId}`)

    // 3. 保護者プロフィール作成（profiles - auth.users の作成時に自動作成されるためUPDATEのみ）
    const { error: parentProfileError } = await supabase
      .from('profiles')
      .update({
        role: 'parent',
        display_name: parentFullName,
        updated_at: new Date().toISOString()
      })
      .eq('id', result.parentUserId)

    if (parentProfileError) {
      result.error = `Failed to update parent profile: ${parentProfileError.message}`
      console.error(`  ❌ ${result.error}`)
      await rollbackPartialRegistration(result.parentUserId)
      return result
    }

    console.log('  ✓ Parent profile updated')

    // 4. 保護者詳細情報作成（parents）
    const { data: parentData, error: parentInsertError } = await supabase
      .from('parents')
      .insert({
        user_id: result.parentUserId,
        full_name: parentFullName,
        furigana: parentFurigana
      })
      .select('id')
      .single()

    if (parentInsertError || !parentData) {
      result.error = `Failed to insert parent: ${parentInsertError?.message}`
      console.error(`  ❌ ${result.error}`)
      await rollbackPartialRegistration(result.parentUserId)
      return result
    }

    const parentId = parentData.id
    console.log(`  ✓ Parent record created: ID=${parentId}`)

    // 5. 生徒アカウント作成（auth.users）
    console.log(`\n👦 Creating student account: ${studentLoginId}`)

    const { data: studentAuthData, error: studentAuthError } = await supabase.auth.admin.createUser({
      email: studentEmail,
      password: studentPassword,
      email_confirm: true,
      user_metadata: {
        role: 'student',
        display_name: studentFullName,
        login_id: studentLoginId
      }
    })

    if (studentAuthError || !studentAuthData.user) {
      // メール重複エラーの判定
      const isDuplicateEmail = studentAuthError?.message?.includes('already') ||
                               studentAuthError?.message?.includes('duplicate') ||
                               studentAuthError?.message?.includes('exists')

      if (isDuplicateEmail) {
        result.error = `Duplicate: Student email already exists: ${studentEmail}`
      } else {
        result.error = `Failed to create student auth: ${studentAuthError?.message}`
      }
      console.error(`  ❌ ${result.error}`)
      await rollbackPartialRegistration(result.parentUserId, undefined, parentId)
      return result
    }

    result.studentUserId = studentAuthData.user.id
    console.log(`  ✓ Student user created: ${result.studentUserId}`)

    // 6. 生徒プロフィール作成（profiles - UPDATEのみ）
    const { error: studentProfileError } = await supabase
      .from('profiles')
      .update({
        role: 'student',
        display_name: studentFullName,
        updated_at: new Date().toISOString()
      })
      .eq('id', result.studentUserId)

    if (studentProfileError) {
      result.error = `Failed to update student profile: ${studentProfileError.message}`
      console.error(`  ❌ ${result.error}`)
      await rollbackPartialRegistration(result.parentUserId, result.studentUserId, parentId)
      return result
    }

    console.log('  ✓ Student profile updated')

    // 7. 生徒詳細情報作成（students）
    const { data: studentData, error: studentInsertError } = await supabase
      .from('students')
      .insert({
        user_id: result.studentUserId,
        login_id: studentLoginId,
        full_name: studentFullName,
        furigana: studentFurigana,
        grade: 5,
        course: 'A'  // デフォルトはAコース（必要に応じて変更）
      })
      .select('id')
      .single()

    if (studentInsertError || !studentData) {
      result.error = `Failed to insert student: ${studentInsertError?.message}`
      console.error(`  ❌ ${result.error}`)
      await rollbackPartialRegistration(result.parentUserId, result.studentUserId, parentId)
      return result
    }

    const studentId = studentData.id
    console.log(`  ✓ Student record created: ID=${studentId}`)

    // 8. 親子関係作成（parent_child_relations）
    console.log(`\n🔗 Creating parent-child relation...`)
    const { error: relationError } = await supabase
      .from('parent_child_relations')
      .insert({
        parent_id: parentId,
        student_id: studentId,
        relation_type: 'guardian'  // デフォルトは guardian
      })

    if (relationError) {
      result.error = `Failed to create relation: ${relationError.message}`
      console.error(`  ❌ ${result.error}`)
      await rollbackPartialRegistration(result.parentUserId, result.studentUserId, parentId, studentId)
      return result
    }

    console.log('  ✓ Parent-child relation created')

    result.success = true
    console.log(`\n✅ Successfully registered: ${parentEmail} → ${studentLoginId}`)
    return result

  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error)
    console.error(`\n❌ Unexpected error: ${result.error}`)
    return result
  }
}

/**
 * シーケンス更新は手動で実行してください
 *
 * 以下のSQLをpsqlまたはSupabase SQL Editorで実行:
 *
 * SELECT setval('students_id_seq', COALESCE((SELECT MAX(id) FROM students), 0), true);
 * SELECT setval('parents_id_seq', COALESCE((SELECT MAX(id) FROM parents), 0), true);
 * SELECT setval('parent_child_relations_id_seq', COALESCE((SELECT MAX(id) FROM parent_child_relations), 0), true);
 */

async function main() {
  if (process.argv.length < 3) {
    console.error('Usage: npx tsx scripts/register-grade5-students.ts <csv_file>')
    console.error('Example: npx tsx scripts/register-grade5-students.ts ~/Downloads/生徒保護者情報アカウント.csv')
    process.exit(1)
  }

  const csvPath = process.argv[2]

  if (!fs.existsSync(csvPath)) {
    console.error(`Error: File not found: ${csvPath}`)
    process.exit(1)
  }

  console.log('=' .repeat(60))
  console.log('新小5生徒 一括登録スクリプト')
  console.log('='.repeat(60))
  console.log(`CSV: ${csvPath}`)
  console.log(`Supabase: ${supabaseUrl}`)
  console.log('='.repeat(60))

  // CSV読み込み（Shift-JIS対応）
  const buffer = fs.readFileSync(csvPath)
  const csvContent = iconv.decode(buffer, 'shift-jis')

  const records: StudentRecord[] = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    cast: (value, context) => {
      // 学年を数値に変換
      if (context.column === '学年') {
        return parseInt(value, 10)
      }
      return value
    }
  })

  // 小5生徒のみ抽出
  const grade5Students = records.filter(r => r.学年 === 5)

  console.log(`\n📚 Found ${grade5Students.length} grade 5 students`)

  if (grade5Students.length === 0) {
    console.log('No grade 5 students to register. Exiting.')
    return
  }

  // 確認プロンプト
  console.log('\n以下の生徒を登録します:')
  grade5Students.forEach((s, i) => {
    console.log(`  ${i + 1}. ${s['子ども氏名一覧']} (${s['子どもID一覧']}) - 保護者: ${s['保護者氏名']} (${s['ログインID (メールアドレス)']})`)
  })

  console.log('\n⚠️  この操作は本番環境のデータベースを変更します。')
  console.log('⚠️  続行する前に、正しいデータベースに接続していることを確認してください。')
  console.log('\n続行するには CTRL+C で中断するか、Enter キーを押してください...')

  // 標準入力待機（Enter キー待ち）
  await new Promise<void>((resolve) => {
    process.stdin.once('data', () => resolve())
  })

  // 登録実行
  const results: RegistrationResult[] = []

  for (const student of grade5Students) {
    const result = await registerStudent(student)
    results.push(result)

    // 失敗時は次に進む前に警告
    if (!result.success) {
      console.log('\n⚠️  Registration failed. Continue with next student? (Enter to continue, CTRL+C to abort)')
      await new Promise<void>((resolve) => {
        process.stdin.once('data', () => resolve())
      })
    }
  }

  // 結果サマリー
  console.log('\n' + '='.repeat(60))
  console.log('Registration Summary')
  console.log('='.repeat(60))

  const successCount = results.filter(r => r.success).length
  const failureCount = results.filter(r => !r.success).length

  console.log(`✅ Success: ${successCount}`)
  console.log(`❌ Failure: ${failureCount}`)

  if (failureCount > 0) {
    console.log('\n❌ Failed registrations:')
    results.filter(r => !r.success).forEach(r => {
      console.log(`  - ${r.parentEmail} / ${r.studentLoginId}: ${r.error}`)
    })
  }

  console.log('\n' + '='.repeat(60))
  console.log('✨ Script completed')
  console.log('='.repeat(60))

  if (successCount > 0) {
    console.log('\n⚠️  重要: シーケンスの手動更新が必要です')
    console.log('以下のSQLをSupabase SQL Editorまたはpsqlで実行してください:\n')
    console.log('SELECT setval(\'students_id_seq\', COALESCE((SELECT MAX(id) FROM students), 0), true);')
    console.log('SELECT setval(\'parents_id_seq\', COALESCE((SELECT MAX(id) FROM parents), 0), true);')
    console.log('SELECT setval(\'parent_child_relations_id_seq\', COALESCE((SELECT MAX(id) FROM parent_child_relations), 0), true);')
  }
}

main().catch(error => {
  console.error('\n💥 Fatal error:', error)
  process.exit(1)
})
