/**
 * 指導者・管理者アカウント作成スクリプト
 *
 * 実行方法:
 * env NEXT_PUBLIC_SUPABASE_URL='...' SUPABASE_SERVICE_ROLE_KEY='...' npx tsx scripts/create-coach-admin-accounts.ts
 *
 * 作成するアカウント:
 * - admin@studyspark.jp (管理者)
 * - kazuya@studyspark.jp (指導者 - 全生徒担当)
 * - nakatani@studyspark.jp (指導者 - 全生徒担当)
 * - demo@studyspark.jp (指導者 - デモ用3名担当)
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 環境変数が設定されていません')
  console.error('NEXT_PUBLIC_SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY を設定してください')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

interface AccountConfig {
  email: string
  password: string
  role: 'admin' | 'coach'
  displayName: string
  fullName: string
  furigana: string
  avatar: string
  // coach専用
  assignAllStudents?: boolean
  assignStudentLoginIds?: string[]
}

const accounts: AccountConfig[] = [
  {
    email: 'admin@studyspark.jp',
    password: 'admin2025',
    role: 'admin',
    displayName: '管理者',
    fullName: '管理者',
    furigana: 'かんりしゃ',
    avatar: 'parent1'
  },
  {
    email: 'kazuya@studyspark.jp',
    password: 'kazuya2025',
    role: 'coach',
    displayName: '倉島先生',
    fullName: '倉島和也',
    furigana: 'くらしまかずや',
    avatar: 'coach1',
    assignAllStudents: true
  },
  {
    email: 'nakatani@studyspark.jp',
    password: 'nakatani2025',
    role: 'coach',
    displayName: '中谷先生',
    fullName: '中谷',
    furigana: 'なかたに',
    avatar: 'coach2',
    assignAllStudents: true
  },
  {
    email: 'demo@studyspark.jp',
    password: 'demo2025',
    role: 'coach',
    displayName: 'デモ指導者',
    fullName: 'デモ指導者',
    furigana: 'でもしどうしゃ',
    avatar: 'coach3',
    assignStudentLoginIds: ['akira5', 'hikaru6', 'hana6']
  }
]

async function createAccount(config: AccountConfig): Promise<string | null> {
  console.log(`\n📧 ${config.email} (${config.role}) を作成中...`)

  // 1. Supabase Authにユーザー作成
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: config.email,
    password: config.password,
    email_confirm: true, // メール確認済みとして作成
    user_metadata: {
      display_name: config.displayName,
      role: config.role
    }
  })

  let userId: string

  if (authError) {
    // 既に存在する場合は既存ユーザーのIDを取得して続行
    if (authError.message.includes('already been registered')) {
      const { data: users } = await supabase.auth.admin.listUsers()
      const existingUser = users.users.find(u => u.email === config.email)
      if (!existingUser) {
        console.error(`  ❌ 既存ユーザーが見つかりません`)
        return null
      }
      userId = existingUser.id
      console.log(`  ⚠️ Auth既存: ${userId} - profiles/coaches作成を続行`)
    } else {
      console.error(`  ❌ Auth作成エラー:`, authError.message)
      return null
    }
  } else {
    userId = authData.user.id
    console.log(`  ✅ Auth作成完了: ${userId}`)
  }

  // 2. profilesテーブルにレコード作成（upsertで重複対応）
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      role: config.role,
      avatar_id: config.avatar,
      display_name: config.displayName,
      nickname: config.displayName,
      theme_color: '#3B82F6'
    }, {
      onConflict: 'id'
    })

  if (profileError) {
    console.error(`  ❌ profile作成エラー:`, profileError.message)
    return null
  }
  console.log(`  ✅ profile作成/更新完了`)

  // 3. coach/adminの場合、対応テーブルにレコード作成
  if (config.role === 'coach') {
    // 既存チェック
    const { data: existingCoach } = await supabase
      .from('coaches')
      .select('id')
      .eq('user_id', userId)
      .single()

    if (existingCoach) {
      console.log(`  ✅ coach既存: ID=${existingCoach.id}`)
    } else {
      const { error: coachError } = await supabase
        .from('coaches')
        .insert({
          user_id: userId,
          full_name: config.fullName,
          furigana: config.furigana,
          invitation_code: crypto.randomUUID()
        })

      if (coachError) {
        console.error(`  ❌ coach作成エラー:`, coachError.message)
        return null
      }
      console.log(`  ✅ coach作成完了`)
    }
  }

  return userId
}

async function assignStudentsToCoach(coachEmail: string, config: AccountConfig) {
  if (config.role !== 'coach') return

  console.log(`\n🔗 ${coachEmail} に生徒を紐付け中...`)

  // coachのIDを取得
  const { data: authUsers } = await supabase.auth.admin.listUsers()
  const coachUser = authUsers.users.find(u => u.email === coachEmail)
  if (!coachUser) {
    console.error(`  ❌ ユーザーが見つかりません: ${coachEmail}`)
    return
  }

  const { data: coachData, error: coachError } = await supabase
    .from('coaches')
    .select('id')
    .eq('user_id', coachUser.id)
    .single()

  if (coachError || !coachData) {
    console.error(`  ❌ coach取得エラー:`, coachError?.message)
    return
  }

  const coachId = coachData.id

  // 生徒を取得
  let studentsQuery = supabase.from('students').select('id, login_id')

  if (config.assignStudentLoginIds) {
    studentsQuery = studentsQuery.in('login_id', config.assignStudentLoginIds)
  }

  const { data: students, error: studentsError } = await studentsQuery

  if (studentsError || !students) {
    console.error(`  ❌ 生徒取得エラー:`, studentsError?.message)
    return
  }

  console.log(`  📋 対象生徒: ${students.length}名`)

  // 紐付けを作成
  let successCount = 0
  for (const student of students) {
    const { error: relationError } = await supabase
      .from('coach_student_relations')
      .upsert({
        coach_id: coachId,
        student_id: student.id
      }, {
        onConflict: 'coach_id,student_id'
      })

    if (relationError) {
      console.error(`    ❌ ${student.login_id}: ${relationError.message}`)
    } else {
      successCount++
    }
  }

  console.log(`  ✅ 紐付け完了: ${successCount}/${students.length}名`)
}

async function verifyAccounts() {
  console.log('\n\n========== 整合性チェック ==========\n')

  // 1. auth.users と profiles の整合性
  const { data: authUsers } = await supabase.auth.admin.listUsers()
  const createdEmails = accounts.map(a => a.email)
  const targetUsers = authUsers.users.filter(u => createdEmails.includes(u.email || ''))

  console.log('📊 作成したアカウント:')
  for (const user of targetUsers) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, display_name, avatar')
      .eq('id', user.id)
      .single()

    if (profile) {
      console.log(`  ✅ ${user.email} → profile存在 (role: ${profile.role}, display: ${profile.display_name})`)
    } else {
      console.log(`  ❌ ${user.email} → profile不存在`)
    }
  }

  // 2. coaches テーブル確認
  console.log('\n📊 指導者アカウント (coaches):')
  const { data: coaches } = await supabase
    .from('coaches')
    .select('id, user_id, full_name, profiles(display_name)')

  if (coaches) {
    for (const coach of coaches) {
      const authUser = authUsers.users.find(u => u.id === coach.user_id)
      console.log(`  ✅ ${authUser?.email} → ${coach.full_name} ((${(coach as any).profiles?.display_name}))`)
    }
  }

  // 3. coach_student_relations 確認
  console.log('\n📊 指導者-生徒紐付け:')
  for (const config of accounts.filter(a => a.role === 'coach')) {
    const coachUser = authUsers.users.find(u => u.email === config.email)
    if (!coachUser) continue

    const { data: coachData } = await supabase
      .from('coaches')
      .select('id')
      .eq('user_id', coachUser.id)
      .single()

    if (!coachData) continue

    const { count } = await supabase
      .from('coach_student_relations')
      .select('*', { count: 'exact', head: true })
      .eq('coach_id', coachData.id)

    console.log(`  ${config.email}: ${count}名`)
  }
}

async function main() {
  console.log('========== 指導者・管理者アカウント作成 ==========')
  console.log(`環境: ${supabaseUrl}`)
  console.log(`作成アカウント数: ${accounts.length}`)

  // アカウント作成
  for (const config of accounts) {
    await createAccount(config)
  }

  // 生徒紐付け
  for (const config of accounts) {
    if (config.role === 'coach') {
      await assignStudentsToCoach(config.email, config)
    }
  }

  // 整合性チェック
  await verifyAccounts()

  console.log('\n========== 完了 ==========')
  console.log('\n📝 ログイン情報:')
  for (const config of accounts) {
    console.log(`  ${config.role.padEnd(6)} ${config.email} / ${config.password}`)
  }
}

main().catch(console.error)
