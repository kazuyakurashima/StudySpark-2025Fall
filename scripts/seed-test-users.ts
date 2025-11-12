/**
 * テストユーザーデータ投入スクリプト
 *
 * 実行方法:
 * npx tsx scripts/seed-test-users.ts
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 環境変数が設定されていません')
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗')
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '✗')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// アバターIDのリスト
const studentAvatars = ['student1', 'student2', 'student3', 'student4', 'student5', 'student6']
const parentAvatar = 'parent1'

// ランダムにアバターを選択
function getRandomAvatar(): string {
  return studentAvatars[Math.floor(Math.random() * studentAvatars.length)]
}

// 保護者データ
const parents = [
  // デモ用アカウント
  { fullName: '星野一朗', kana: 'ほしの', email: 'toshin.hitachi+test002@gmail.com', password: 'Testdemo2025', displayName: 'ほしの', nickname: 'ほしの' },
  { fullName: '青空太郎', kana: 'あおぞら', email: 'toshin.hitachi+test001@gmail.com', password: 'Testdemo2025', displayName: 'あおぞら', nickname: 'あおぞら' },
  // テストユーザー
  { fullName: '小川雅昭', kana: 'おがわ', email: 'toshin.hitachi+test010@gmail.com', password: 'pass8814', displayName: 'おがわ', nickname: 'おがわ' },
  { fullName: '佐川智世', kana: 'さがわ', email: 'toshin.hitachi+test011@gmail.com', password: 'pass0003', displayName: 'さがわ', nickname: 'さがわ' },
  { fullName: '寺門祐介', kana: 'てらかど', email: 'toshin.hitachi+test012@gmail.com', password: 'pass0000', displayName: 'てらかど', nickname: 'てらかど' },
  { fullName: '長山裕紀', kana: 'ながやま', email: 'toshin.hitachi+test013@gmail.com', password: 'pass7340', displayName: 'ながやま', nickname: 'ながやま' },
  { fullName: '二本木英明', kana: 'にほんぎ', email: 'toshin.hitachi+test014@gmail.com', password: 'pass5833', displayName: 'にほんぎ', nickname: 'にほんぎ' },
  { fullName: '林通子', kana: 'はやし', email: 'toshin.hitachi+test015@gmail.com', password: 'pass0163', displayName: 'はやし', nickname: 'はやし' },
  { fullName: '山口剛司', kana: 'やまぐち', email: 'toshin.hitachi+test016@gmail.com', password: 'pass6634', displayName: 'やまぐち', nickname: 'やまぐち' },
  { fullName: '石井のぞみ', kana: 'いしい', email: 'toshin.hitachi+test017@gmail.com', password: 'pass9913', displayName: 'いしい', nickname: 'いしい' },
  { fullName: '齋藤香里', kana: 'さいとう', email: 'toshin.hitachi+test018@gmail.com', password: 'pass4497', displayName: 'さいとう', nickname: 'さいとう' },
  { fullName: '齋藤裕嗣', kana: 'さいとう', email: 'toshin.hitachi+test019@gmail.com', password: 'pass5520', displayName: 'さいとう', nickname: 'さいとう' },
  { fullName: '笹島達也', kana: 'ささじま', email: 'toshin.hitachi+test020@gmail.com', password: 'pass8369', displayName: 'ささじま', nickname: 'ささじま' },
  { fullName: '杉山靖', kana: 'すぎやま', email: 'toshin.hitachi+test021@gmail.com', password: 'pass8971', displayName: 'すぎやま', nickname: 'すぎやま' },
  { fullName: '深作美津子', kana: 'ふかさく', email: 'toshin.hitachi+test022@gmail.com', password: 'pass2320', displayName: 'ふかさく', nickname: 'ふかさく' },
  { fullName: '福地秀太郎', kana: 'ふくち', email: 'toshin.hitachi+test023@gmail.com', password: 'pass7365', displayName: 'ふくち', nickname: 'ふくち' },
  { fullName: '松下麻香', kana: 'まつした', email: 'toshin.hitachi+test024@gmail.com', password: 'pass1212', displayName: 'まつした', nickname: 'まつした' },
]

// 生徒データ
const students = [
  // デモ用アカウント - 星野家
  { grade: 5, fullName: '星野明', kana: 'ほしのあきら', loginId: 'akira5', password: 'demo2025', displayName: '明', nickname: '明', parentEmail: 'toshin.hitachi+test002@gmail.com' },
  { grade: 6, fullName: '星野光', kana: 'ほしのひかる', loginId: 'hikaru6', password: 'demo2025', displayName: '光', nickname: '光', parentEmail: 'toshin.hitachi+test002@gmail.com' },
  // デモ用アカウント - 青空家
  { grade: 6, fullName: '青空花', kana: 'あおぞらはな', loginId: 'hana6', password: 'demo2025', displayName: '花', nickname: '花', parentEmail: 'toshin.hitachi+test001@gmail.com' },
  // テストユーザー
  { grade: 5, fullName: '二本木菜々子', kana: 'ななこ', loginId: 'nanako5', password: 'pass2025', displayName: 'ななこ', nickname: 'ななこ', parentEmail: 'toshin.hitachi+test014@gmail.com' },
  { grade: 5, fullName: '佐川琴乃香', kana: 'このか', loginId: 'konoka5', password: 'pass2025', displayName: 'このか', nickname: 'このか', parentEmail: 'toshin.hitachi+test011@gmail.com' },
  { grade: 5, fullName: '寺門惟智', kana: 'ゆいと', loginId: 'yuito5', password: 'pass2025', displayName: 'ゆいと', nickname: 'ゆいと', parentEmail: 'toshin.hitachi+test012@gmail.com' },
  { grade: 5, fullName: '小川真央', kana: 'まお', loginId: 'mao5', password: 'pass2025', displayName: 'まお', nickname: 'まお', parentEmail: 'toshin.hitachi+test010@gmail.com' },
  { grade: 5, fullName: '山口修平', kana: 'しゅうへい', loginId: 'shuuhei5', password: 'pass2025', displayName: 'しゅうへい', nickname: 'しゅうへい', parentEmail: 'toshin.hitachi+test016@gmail.com' },
  { grade: 5, fullName: '林智輝', kana: 'ともき', loginId: 'tomoki5', password: 'pass2025', displayName: 'ともき', nickname: 'ともき', parentEmail: 'toshin.hitachi+test015@gmail.com' },
  { grade: 5, fullName: '長山晴紀', kana: 'はるき', loginId: 'haruki5', password: 'pass2025', displayName: 'はるき', nickname: 'はるき', parentEmail: 'toshin.hitachi+test013@gmail.com' },
  { grade: 6, fullName: '杉山愛翔', kana: 'まなと', loginId: 'manato6', password: 'pass2025', displayName: 'まなと', nickname: 'まなと', parentEmail: 'toshin.hitachi+test021@gmail.com' },
  { grade: 6, fullName: '杉山翔哉', kana: 'しょうや', loginId: 'shouya6', password: 'pass2025', displayName: 'しょうや', nickname: 'しょうや', parentEmail: 'toshin.hitachi+test021@gmail.com' },
  { grade: 6, fullName: '松下颯真', kana: 'そうま', loginId: 'souma6', password: 'pass2025', displayName: 'そうま', nickname: 'そうま', parentEmail: 'toshin.hitachi+test024@gmail.com' },
  { grade: 6, fullName: '深作巴', kana: 'ともえ', loginId: 'tomoe6', password: 'pass2025', displayName: 'ともえ', nickname: 'ともえ', parentEmail: 'toshin.hitachi+test022@gmail.com' },
  { grade: 6, fullName: '石井巧望', kana: 'たくみ', loginId: 'takumi6', password: 'pass2025', displayName: 'たくみ', nickname: 'たくみ', parentEmail: 'toshin.hitachi+test017@gmail.com' },
  { grade: 6, fullName: '福地美鈴', kana: 'みすず', loginId: 'misuzu6', password: 'pass2025', displayName: 'みすず', nickname: 'みすず', parentEmail: 'toshin.hitachi+test023@gmail.com' },
  { grade: 6, fullName: '笹島実弥子', kana: 'みやこ', loginId: 'miyako6', password: 'pass2025', displayName: 'みやこ', nickname: 'みやこ', parentEmail: 'toshin.hitachi+test020@gmail.com' },
  { grade: 6, fullName: '齋藤利嵩', kana: 'りたか', loginId: 'ritaka6', password: 'pass2025', displayName: 'りたか', nickname: 'りたか', parentEmail: 'toshin.hitachi+test019@gmail.com' },
  { grade: 6, fullName: '齋藤大洋', kana: 'たいよう', loginId: 'taiyou6', password: 'pass2025', displayName: 'たいよう', nickname: 'たいよう', parentEmail: 'toshin.hitachi+test018@gmail.com' },
]

async function main() {
  console.log('🚀 テストユーザーデータ投入を開始します\n')

  // 1. 既存データのクリーンアップ
  console.log('📝 ステップ1: 既存の学習記録データを削除')

  const { error: deleteLogsError } = await supabase
    .from('study_logs')
    .delete()
    .neq('id', 0) // 全件削除

  if (deleteLogsError) {
    console.error('❌ 学習記録の削除エラー:', deleteLogsError)
  } else {
    console.log('✅ 学習記録を削除しました')
  }

  const { error: deleteEncouragementError } = await supabase
    .from('encouragement_messages')
    .delete()
    .neq('id', 0)

  if (deleteEncouragementError) {
    console.error('❌ 応援メッセージの削除エラー:', deleteEncouragementError)
  } else {
    console.log('✅ 応援メッセージを削除しました')
  }

  const { error: deleteCoachingMessagesError } = await supabase
    .from('coaching_messages')
    .delete()
    .neq('id', 0)

  if (deleteCoachingMessagesError) {
    console.error('❌ コーチングメッセージの削除エラー:', deleteCoachingMessagesError)
  } else {
    console.log('✅ コーチングメッセージを削除しました')
  }

  const { error: deleteCoachingSessionsError } = await supabase
    .from('coaching_sessions')
    .delete()
    .neq('id', 0)

  if (deleteCoachingSessionsError) {
    console.error('❌ コーチングセッションの削除エラー:', deleteCoachingSessionsError)
  } else {
    console.log('✅ コーチングセッションを削除しました')
  }

  const { error: deleteTestGoalsError } = await supabase
    .from('test_goals')
    .delete()
    .neq('id', 0)

  if (deleteTestGoalsError) {
    console.error('❌ テスト目標の削除エラー:', deleteTestGoalsError)
  } else {
    console.log('✅ テスト目標を削除しました')
  }

  const { error: deleteTestResultsError } = await supabase
    .from('test_results')
    .delete()
    .neq('id', 0)

  if (deleteTestResultsError) {
    console.error('❌ テスト結果の削除エラー:', deleteTestResultsError)
  } else {
    console.log('✅ テスト結果を削除しました')
  }

  console.log('')

  // 2. 保護者アカウントの作成
  console.log('📝 ステップ2: 保護者アカウントを作成')
  const createdParents: { email: string; userId: string; parentId: number }[] = []

  for (const parent of parents) {
    console.log(`\n👤 保護者: ${parent.fullName} (${parent.email})`)

    // Authユーザー作成
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: parent.email,
      password: parent.password,
      email_confirm: true,
      user_metadata: {
        role: 'parent',
        full_name: parent.fullName,
      }
    })

    if (authError) {
      console.error(`  ❌ Auth作成エラー:`, authError.message)
      continue
    }

    if (!authData.user) {
      console.error(`  ❌ ユーザーデータが取得できませんでした`)
      continue
    }

    console.log(`  ✅ Authユーザー作成完了 (ID: ${authData.user.id})`)

    // Profile更新（トリガーで自動作成されているので、追加情報を更新）
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        nickname: parent.nickname,
        avatar_id: parentAvatar,
      })
      .eq('id', authData.user.id)

    if (profileError) {
      console.error(`  ❌ Profile更新エラー:`, profileError.message)
      continue
    }

    console.log(`  ✅ Profile更新完了`)

    // Parentレコード作成
    const { data: parentData, error: parentError } = await supabase
      .from('parents')
      .insert({
        user_id: authData.user.id,
        full_name: parent.fullName,
        furigana: parent.kana,
      })
      .select()
      .single()

    if (parentError) {
      console.error(`  ❌ Parent作成エラー:`, parentError.message)
      continue
    }

    console.log(`  ✅ Parent作成完了 (ID: ${parentData.id})`)

    createdParents.push({
      email: parent.email,
      userId: authData.user.id,
      parentId: parentData.id,
    })
  }

  console.log(`\n✅ ${createdParents.length}件の保護者アカウントを作成しました\n`)

  // 3. 生徒アカウントの作成
  console.log('📝 ステップ3: 生徒アカウントを作成')
  const createdStudents: { loginId: string; userId: string; studentId: number }[] = []

  for (const student of students) {
    console.log(`\n👦 生徒: ${student.fullName} (${student.loginId})`)

    // 保護者を検索
    const parentRecord = createdParents.find(p => p.email === student.parentEmail)
    if (!parentRecord) {
      console.error(`  ❌ 保護者が見つかりません: ${student.parentEmail}`)
      continue
    }

    // Authユーザー作成（生徒はlogin_idとpasswordでログイン）
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: `${student.loginId}@studyspark.local`,
      password: student.password,
      email_confirm: true,
      user_metadata: {
        role: 'student',
        login_id: student.loginId,
        full_name: student.fullName,
      }
    })

    if (authError) {
      console.error(`  ❌ Auth作成エラー:`, authError.message)
      continue
    }

    if (!authData.user) {
      console.error(`  ❌ ユーザーデータが取得できませんでした`)
      continue
    }

    console.log(`  ✅ Authユーザー作成完了 (ID: ${authData.user.id})`)

    // ランダムアバター選択
    const avatarId = getRandomAvatar()

    // Profile更新（トリガーで自動作成されているので、追加情報を更新）
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        nickname: student.nickname,
        avatar_id: avatarId,
      })
      .eq('id', authData.user.id)

    if (profileError) {
      console.error(`  ❌ Profile更新エラー:`, profileError.message)
      continue
    }

    console.log(`  ✅ Profile更新完了 (Avatar: ${avatarId})`)

    // Studentレコード作成（コース: A）
    const { data: studentData, error: studentError } = await supabase
      .from('students')
      .insert({
        user_id: authData.user.id,
        login_id: student.loginId,
        full_name: student.fullName,
        furigana: student.kana,
        grade: student.grade,
        course: 'A',
      })
      .select()
      .single()

    if (studentError) {
      console.error(`  ❌ Student作成エラー:`, studentError.message)
      continue
    }

    console.log(`  ✅ Student作成完了 (ID: ${studentData.id}, コース: A)`)

    // Parent-Student関連付け
    const { error: relationError } = await supabase
      .from('parent_child_relations')
      .insert({
        parent_id: parentRecord.parentId,
        student_id: studentData.id,
      })

    if (relationError) {
      console.error(`  ❌ 関連付けエラー:`, relationError.message)
      continue
    }

    console.log(`  ✅ 保護者との関連付け完了`)

    createdStudents.push({
      loginId: student.loginId,
      userId: authData.user.id,
      studentId: studentData.id,
    })
  }

  console.log(`\n✅ ${createdStudents.length}件の生徒アカウントを作成しました\n`)

  // 4. サマリー
  console.log('=' .repeat(60))
  console.log('📊 作成サマリー')
  console.log('=' .repeat(60))
  console.log(`保護者アカウント: ${createdParents.length}件`)
  console.log(`生徒アカウント: ${createdStudents.length}件`)
  console.log('')
  console.log('✅ データ投入が完了しました！')
  console.log('')
  console.log('📝 ログイン情報:')
  console.log('  保護者: メールアドレス + パスワード')
  console.log('  生徒: ログインID + pass2025')
  console.log('')
}

main()
  .then(() => {
    console.log('🎉 完了')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ エラー:', error)
    process.exit(1)
  })
