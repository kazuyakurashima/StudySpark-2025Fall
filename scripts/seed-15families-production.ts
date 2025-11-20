/**
 * 15家族分の本番環境テストデータ投入スクリプト
 *
 * ⚠️ セキュリティ注意事項:
 * このファイルには本番環境のテストアカウント情報（パスワード含む）が含まれています。
 *
 * - デモアカウント（test001, test002）のみ公開可能
 * - test010-test024 のパスワードは機密情報として扱ってください
 * - 本番環境への投入は既に完了済みです（2025-11-14実施）
 * - このファイルは記録・参照目的でのみ保持されています
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

interface TestFamily {
  parent: {
    email: string
    password: string
    displayName: string
    familyNameKana: string
  }
  students: Array<{
    loginId: string
    email: string
    password: string
    displayName: string
    fullName: string
    grade: number
    course: string
  }>
}

const testFamilies: TestFamily[] = [
  // 1. 小川雅昭
  {
    parent: {
      email: 'demo-parent10@example.com',
      password: 'pass8814',
      displayName: 'おがわ',
      familyNameKana: 'おがわ'
    },
    students: [
      {
        loginId: 'mao5',
        email: 'mao5@studyspark.local',
        password: 'pass2025',
        displayName: 'まお',
        fullName: '小川真央',
        grade: 5,
        course: 'B'
      }
    ]
  },
  // 2. 佐川智世
  {
    parent: {
      email: 'demo-parent11@example.com',
      password: 'pass0003',
      displayName: 'さがわ',
      familyNameKana: 'さがわ'
    },
    students: [
      {
        loginId: 'konoka5',
        email: 'konoka5@studyspark.local',
        password: 'pass2025',
        displayName: 'このか',
        fullName: '佐川琴乃香',
        grade: 5,
        course: 'A'
      }
    ]
  },
  // 3. 寺門祐介
  {
    parent: {
      email: 'demo-parent12@example.com',
      password: 'pass0000',
      displayName: 'てらかど',
      familyNameKana: 'てらかど'
    },
    students: [
      {
        loginId: 'yuito5',
        email: 'yuito5@studyspark.local',
        password: 'pass2025',
        displayName: 'ゆいと',
        fullName: '寺門惟智',
        grade: 5,
        course: 'C'
      }
    ]
  },
  // 4. 長山裕紀
  {
    parent: {
      email: 'demo-parent13@example.com',
      password: 'pass7340',
      displayName: 'ながやま',
      familyNameKana: 'ながやま'
    },
    students: [
      {
        loginId: 'haruki5',
        email: 'haruki5@studyspark.local',
        password: 'pass2025',
        displayName: 'はるき',
        fullName: '長山晴紀',
        grade: 5,
        course: 'B'
      }
    ]
  },
  // 5. 二本木英明
  {
    parent: {
      email: 'demo-parent14@example.com',
      password: 'pass5833',
      displayName: 'にほんぎ',
      familyNameKana: 'にほんぎ'
    },
    students: [
      {
        loginId: 'nanako5',
        email: 'nanako5@studyspark.local',
        password: 'pass2025',
        displayName: 'ななこ',
        fullName: '二本木菜々子',
        grade: 5,
        course: 'A'
      }
    ]
  },
  // 6. 林通子
  {
    parent: {
      email: 'demo-parent15@example.com',
      password: 'pass0163',
      displayName: 'はやし',
      familyNameKana: 'はやし'
    },
    students: [
      {
        loginId: 'tomoki5',
        email: 'tomoki5@studyspark.local',
        password: 'pass2025',
        displayName: 'ともき',
        fullName: '林智輝',
        grade: 5,
        course: 'B'
      }
    ]
  },
  // 7. 山口剛司
  {
    parent: {
      email: 'demo-parent16@example.com',
      password: 'pass6634',
      displayName: 'やまぐち',
      familyNameKana: 'やまぐち'
    },
    students: [
      {
        loginId: 'shuuhei5',
        email: 'shuuhei5@studyspark.local',
        password: 'pass2025',
        displayName: 'しゅうへい',
        fullName: '山口修平',
        grade: 5,
        course: 'C'
      }
    ]
  },
  // 8. 石井のぞみ
  {
    parent: {
      email: 'demo-parent17@example.com',
      password: 'pass9913',
      displayName: 'いしい',
      familyNameKana: 'いしい'
    },
    students: [
      {
        loginId: 'takumi6',
        email: 'takumi6@studyspark.local',
        password: 'pass2025',
        displayName: 'たくみ',
        fullName: '石井巧望',
        grade: 6,
        course: 'B'
      }
    ]
  },
  // 9. 齋藤香里
  {
    parent: {
      email: 'demo-parent18@example.com',
      password: 'pass4497',
      displayName: 'さいとう',
      familyNameKana: 'さいとう'
    },
    students: [
      {
        loginId: 'taiyou6',
        email: 'taiyou6@studyspark.local',
        password: 'pass2025',
        displayName: 'たいよう',
        fullName: '齋藤大洋',
        grade: 6,
        course: 'A'
      }
    ]
  },
  // 10. 齋藤裕嗣
  {
    parent: {
      email: 'demo-parent19@example.com',
      password: 'pass5520',
      displayName: 'さいとう',
      familyNameKana: 'さいとう'
    },
    students: [
      {
        loginId: 'ritaka6',
        email: 'ritaka6@studyspark.local',
        password: 'pass2025',
        displayName: 'りたか',
        fullName: '齋藤利嵩',
        grade: 6,
        course: 'C'
      }
    ]
  },
  // 11. 笹島達也
  {
    parent: {
      email: 'demo-parent20@example.com',
      password: 'pass8369',
      displayName: 'ささじま',
      familyNameKana: 'ささじま'
    },
    students: [
      {
        loginId: 'miyako6',
        email: 'miyako6@studyspark.local',
        password: 'pass2025',
        displayName: 'みやこ',
        fullName: '笹島実弥子',
        grade: 6,
        course: 'B'
      }
    ]
  },
  // 12. 杉山靖（2人兄弟）
  {
    parent: {
      email: 'demo-parent21@example.com',
      password: 'pass8971',
      displayName: 'すぎやま',
      familyNameKana: 'すぎやま'
    },
    students: [
      {
        loginId: 'shouya6',
        email: 'shouya6@studyspark.local',
        password: 'pass2025',
        displayName: 'しょうや',
        fullName: '杉山翔哉',
        grade: 6,
        course: 'A'
      },
      {
        loginId: 'manato6',
        email: 'manato6@studyspark.local',
        password: 'pass2025',
        displayName: 'まなと',
        fullName: '杉山愛翔',
        grade: 6,
        course: 'B'
      }
    ]
  },
  // 13. 深作美津子
  {
    parent: {
      email: 'demo-parent22@example.com',
      password: 'pass2320',
      displayName: 'ふかさく',
      familyNameKana: 'ふかさく'
    },
    students: [
      {
        loginId: 'tomoe6',
        email: 'tomoe6@studyspark.local',
        password: 'pass2025',
        displayName: 'ともえ',
        fullName: '深作巴',
        grade: 6,
        course: 'C'
      }
    ]
  },
  // 14. 福地秀太郎
  {
    parent: {
      email: 'demo-parent23@example.com',
      password: 'pass7365',
      displayName: 'ふくち',
      familyNameKana: 'ふくち'
    },
    students: [
      {
        loginId: 'misuzu6',
        email: 'misuzu6@studyspark.local',
        password: 'pass2025',
        displayName: 'みすず',
        fullName: '福地美鈴',
        grade: 6,
        course: 'A'
      }
    ]
  },
  // 15. 松下麻香
  {
    parent: {
      email: 'demo-parent24@example.com',
      password: 'pass1212',
      displayName: 'まつした',
      familyNameKana: 'まつした'
    },
    students: [
      {
        loginId: 'souma6',
        email: 'souma6@studyspark.local',
        password: 'pass2025',
        displayName: 'そうま',
        fullName: '松下颯真',
        grade: 6,
        course: 'B'
      }
    ]
  }
]

async function main() {
  console.log('🌱 Starting 15-family production data seeding...\n')
  console.log(`📡 Connecting to: ${supabaseUrl}`)
  console.log(`🔑 Service key (first 20 chars): ${supabaseServiceKey.substring(0, 20)}...\n`)

  try {
    // マスターデータ確認
    const { data: subjects, error: subjectsError } = await supabase.from('subjects').select('id, name')
    const { data: contentTypes, error: contentTypesError } = await supabase.from('study_content_types').select('id, content_name')

    if (subjectsError) {
      console.error('❌ Error fetching subjects:', subjectsError)
    }
    if (contentTypesError) {
      console.error('❌ Error fetching content types:', contentTypesError)
    }

    if (!subjects || subjects.length === 0) {
      throw new Error('No subjects found in database')
    }

    console.log(`📚 Master data: ${subjects.length} subjects, ${contentTypes?.length || 0} content types\n`)

    let familyCount = 0
    let studentCount = 0

    for (const family of testFamilies) {
      familyCount++
      console.log(`\n[${familyCount}/15] 👨‍👩‍👧‍👦 Creating family: ${family.parent.displayName}`)

      // 1. 保護者アカウント作成
      const { data: parentAuth, error: parentAuthError } = await supabase.auth.admin.createUser({
        email: family.parent.email,
        password: family.parent.password,
        email_confirm: true,
        user_metadata: {
          role: 'parent',
          full_name: family.parent.displayName
        }
      })

      if (parentAuthError) {
        console.error(`  ❌ Failed to create parent auth: ${parentAuthError.message}`)
        continue
      }

      console.log(`  ✅ Created parent auth: ${family.parent.email}`)

      // 2. 保護者プロフィール更新
      const { error: parentProfileError } = await supabase
        .from('profiles')
        .update({
          nickname: family.parent.displayName,
          setup_completed: true,
          last_login_at: new Date().toISOString()
        })
        .eq('id', parentAuth.user.id)

      if (parentProfileError) {
        console.error(`  ⚠️  Failed to update parent profile: ${parentProfileError.message}`)
      }

      // 3. 保護者レコード作成
      const { data: parentRecord, error: parentRecordError } = await supabase
        .from('parents')
        .insert({
          user_id: parentAuth.user.id,
          full_name: family.parent.displayName
        })
        .select()
        .single()

      if (parentRecordError) {
        console.error(`  ❌ Failed to create parent record: ${parentRecordError.message}`)
        continue
      }

      console.log(`  ✅ Created parent record`)

      // 4. 各生徒のアカウント作成
      for (const studentData of family.students) {
        studentCount++
        console.log(`\n  [Student ${studentCount}] 👦 Creating: ${studentData.displayName} (${studentData.loginId})`)

        // 生徒アカウント作成
        const { data: studentAuth, error: studentAuthError } = await supabase.auth.admin.createUser({
          email: studentData.email,
          password: studentData.password,
          email_confirm: true,
          user_metadata: {
            role: 'student',
            full_name: studentData.displayName
          }
        })

        if (studentAuthError) {
          console.error(`    ❌ Failed to create student auth: ${studentAuthError.message}`)
          continue
        }

        // 生徒プロフィール更新
        const { error: studentProfileError } = await supabase
          .from('profiles')
          .update({
            nickname: studentData.displayName,
            setup_completed: true,
            last_login_at: new Date().toISOString()
          })
          .eq('id', studentAuth.user.id)

        if (studentProfileError) {
          console.error(`    ⚠️  Failed to update student profile: ${studentProfileError.message}`)
        }

        // 生徒レコード作成
        const { data: studentRecord, error: studentRecordError } = await supabase
          .from('students')
          .insert({
            user_id: studentAuth.user.id,
            login_id: studentData.loginId,
            full_name: studentData.fullName,
            grade: studentData.grade,
            course: studentData.course
          })
          .select()
          .single()

        if (studentRecordError) {
          console.error(`    ❌ Failed to create student record: ${studentRecordError.message}`)
          continue
        }

        // 保護者-生徒関係作成
        await supabase
          .from('parent_child_relations')
          .insert({
            parent_id: parentRecord.id,
            student_id: studentRecord.id
          })

        console.log(`    ✅ Created student: ${studentData.displayName}`)

        // 5. 過去7日分の学習ログ作成
        console.log(`    📝 Creating study logs...`)

        const today = new Date()
        let totalLogsCreated = 0

        for (let i = 0; i < 7; i++) {
          const studyDate = new Date(today)
          studyDate.setDate(studyDate.getDate() - i)
          const studyDateStr = studyDate.toISOString().split('T')[0]

          // セッション取得または作成
          let currentSession
          const { data: existingSession } = await supabase
            .from('study_sessions')
            .select()
            .eq('grade', studentData.grade)
            .eq('session_number', i + 1)
            .single()

          if (existingSession) {
            currentSession = existingSession
          } else {
            const { data: newSession, error: sessionError } = await supabase
              .from('study_sessions')
              .insert({
                session_number: i + 1,
                session_name: `第${i + 1}回`,
                grade: studentData.grade
              })
              .select()
              .single()

            if (sessionError || !newSession) {
              console.error(`    ❌ Failed to create session: ${sessionError?.message}`)
              continue
            }
            currentSession = newSession
          }

          // 1日あたり2-4件のログを作成
          const logsPerDay = Math.floor(Math.random() * 3) + 2
          const studyLogs = []

          for (let j = 0; j < logsPerDay; j++) {
            const randomSubject = subjects[Math.floor(Math.random() * subjects.length)]
            const randomContent = contentTypes![Math.floor(Math.random() * contentTypes!.length)]
            const totalProblems = Math.floor(Math.random() * 20) + 10
            const correctCount = Math.floor(totalProblems * (0.6 + Math.random() * 0.3))

            studyLogs.push({
              student_id: studentRecord.id,
              session_id: currentSession.id,
              subject_id: randomSubject.id,
              study_content_type_id: randomContent.id,
              study_date: studyDateStr,
              total_problems: totalProblems,
              correct_count: correctCount,
              logged_at: new Date(studyDate.getTime() + j * 3600000).toISOString()
            })
          }

          const { error: logsError } = await supabase
            .from('study_logs')
            .insert(studyLogs)

          if (logsError) {
            console.error(`    ❌ Failed to create study logs for day ${i}: ${logsError.message}`)
          } else {
            totalLogsCreated += studyLogs.length
          }
        }

        console.log(`    ✅ Created ${totalLogsCreated} study logs (7 days)`)
      }
    }

    console.log('\n\n✅ Production data seeding completed!')
    console.log('\n📊 Summary:')

    const { count: parentsCount } = await supabase.from('parents').select('*', { count: 'exact', head: true })
    const { count: studentsCount } = await supabase.from('students').select('*', { count: 'exact', head: true })
    const { count: logsCount } = await supabase.from('study_logs').select('*', { count: 'exact', head: true })

    console.log(`  - Families: 15`)
    console.log(`  - Parents: ${parentsCount}`)
    console.log(`  - Students: ${studentsCount}`)
    console.log(`  - Study logs: ${logsCount}`)

    console.log('\n🔑 Sample login credentials:')
    console.log('\n保護者: おがわ (小川雅昭)')
    console.log('  Email: demo-parent10@example.com')
    console.log('  Password: pass8814')
    console.log('\n生徒: まお (小川真央) 小5')
    console.log('  Login ID: mao5')
    console.log('  Password: pass2025')

  } catch (error) {
    console.error('\n❌ Error during seeding:', error)
    process.exit(1)
  }
}

main()
