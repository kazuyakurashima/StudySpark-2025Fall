/**
 * 2家族分のテストデータ投入スクリプト
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
  {
    parent: {
      email: 'demo-parent2@example.com',
      password: process.env.DEMO_PARENT_PASSWORD || 'Testdemo2025',
      displayName: '星野一朗'
    },
    students: [
      {
        loginId: 'akira5',
        email: 'akira5@studyspark.local',
        password: process.env.DEMO_STUDENT_PASSWORD || 'demo2025',
        displayName: '星野明',
        fullName: '星野明',
        grade: 5,
        course: 'B'
      },
      {
        loginId: 'hikaru6',
        email: 'hikaru6@studyspark.local',
        password: process.env.DEMO_STUDENT_PASSWORD || 'demo2025',
        displayName: '星野光',
        fullName: '星野光',
        grade: 6,
        course: 'A'
      }
    ]
  },
  {
    parent: {
      email: 'demo-parent1@example.com',
      password: process.env.DEMO_PARENT_PASSWORD || 'Testdemo2025',
      displayName: '青空太郎'
    },
    students: [
      {
        loginId: 'hana6',
        email: 'hana6@studyspark.local',
        password: process.env.DEMO_STUDENT_PASSWORD || 'demo2025',
        displayName: '青空花',
        fullName: '青空花',
        grade: 6,
        course: 'B'
      }
    ]
  }
]

async function main() {
  console.log('🌱 Starting 2-family test data seeding...\n')

  try {
    // マスターデータ確認
    const { data: subjects } = await supabase.from('subjects').select('id, name')
    const { data: contentTypes } = await supabase.from('study_content_types').select('id, content_name')

    if (!subjects || subjects.length === 0) {
      throw new Error('No subjects found in database')
    }

    console.log(`📚 Master data: ${subjects.length} subjects, ${contentTypes?.length || 0} content types\n`)

    for (const family of testFamilies) {
      console.log(`\n👨‍👩‍👧‍👦 Creating family: ${family.parent.displayName}`)

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
        console.error(`❌ Failed to create parent auth: ${parentAuthError.message}`)
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
        console.error(`❌ Failed to create parent record: ${parentRecordError.message}`)
        continue
      }

      console.log(`  ✅ Created parent record`)

      // 4. 各生徒のアカウント作成
      for (const studentData of family.students) {
        console.log(`\n  👦 Creating student: ${studentData.displayName} (${studentData.loginId})`)

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

          // 1日あたり1セッション作成
          const { data: session, error: sessionError } = await supabase
            .from('study_sessions')
            .insert({
              session_number: i + 1,
              session_name: `第${i + 1}回`,
              grade: studentData.grade
            })
            .select()
            .single()

          if (sessionError || !session) {
            // セッションが既に存在する可能性があるので、既存のものを取得
            const { data: existingSession } = await supabase
              .from('study_sessions')
              .select()
              .eq('grade', studentData.grade)
              .eq('session_number', i + 1)
              .single()

            if (!existingSession) {
              console.error(`    ❌ Failed to create/find session: ${sessionError?.message}`)
              continue
            }
            var currentSession = existingSession
          } else {
            var currentSession = session
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

    console.log('\n\n✅ Test data seeding completed!')
    console.log('\n📊 Summary:')

    const { count: parentsCount } = await supabase.from('parents').select('*', { count: 'exact', head: true })
    const { count: studentsCount } = await supabase.from('students').select('*', { count: 'exact', head: true })
    const { count: logsCount } = await supabase.from('study_logs').select('*', { count: 'exact', head: true })

    console.log(`  - Parents: ${parentsCount}`)
    console.log(`  - Students: ${studentsCount}`)
    console.log(`  - Study logs: ${logsCount}`)

    console.log('\n🔑 Login credentials:')
    console.log('\n保護者: 星野一朗')
    console.log('  Email: demo-parent2@example.com')
    console.log('  Password: <env DEMO_PARENT_PASSWORD>')
    console.log('\n生徒: 星野明（小5・Bコース）')
    console.log('  Login ID: akira5')
    console.log('  Email: akira5@studyspark.local')
    console.log('  Password: <env DEMO_STUDENT_PASSWORD>')
    console.log('\n生徒: 星野光（小6・Aコース）')
    console.log('  Login ID: hikaru6')
    console.log('  Email: hikaru6@studyspark.local')
    console.log('  Password: <env DEMO_STUDENT_PASSWORD>')
    console.log('\n保護者: 青空太郎')
    console.log('  Email: demo-parent1@example.com')
    console.log('  Password: <env DEMO_PARENT_PASSWORD>')
    console.log('\n生徒: 青空花（小6・Bコース）')
    console.log('  Login ID: hana6')
    console.log('  Email: hana6@studyspark.local')
    console.log('  Password: <env DEMO_STUDENT_PASSWORD>')

  } catch (error) {
    console.error('\n❌ Error during seeding:', error)
    process.exit(1)
  }
}

main()
