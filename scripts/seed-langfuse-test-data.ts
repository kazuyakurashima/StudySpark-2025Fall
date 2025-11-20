/**
 * Langfuse動作確認用テストデータ投入スクリプト
 *
 * 投入データ:
 * - 保護者2家族（星野一朗、青空太郎）
 * - 生徒3名（星野明、星野光、青空花）
 * - 過去7日分の学習ログ
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
    password: string
    displayName: string
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
        loginId: 'hoshino_akira',
        password: process.env.DEMO_PARENT_PASSWORD || 'Testdemo2025',
        displayName: '星野明',
        grade: 6,
        course: 'C'
      },
      {
        loginId: 'hoshino_hikari',
        password: process.env.DEMO_PARENT_PASSWORD || 'Testdemo2025',
        displayName: '星野光',
        grade: 6,
        course: 'B'
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
        loginId: 'aozora_hana',
        password: process.env.DEMO_PARENT_PASSWORD || 'Testdemo2025',
        displayName: '青空花',
        grade: 6,
        course: 'A'
      }
    ]
  }
]

async function main() {
  console.log('🌱 Starting test data seeding for Langfuse verification...\n')

  try {
    // マスターデータ確認
    const { data: subjects } = await supabase.from('subjects').select('id, name')
    const { data: contentTypes } = await supabase.from('study_content_types').select('id, content_name')

    console.log(`📚 Master data: ${subjects?.length} subjects, ${contentTypes?.length} content types\n`)

    for (const family of testFamilies) {
      console.log(`\n👨‍👩‍👧‍👦 Creating family: ${family.parent.displayName}`)

      // 1. 保護者アカウント作成
      const { data: parentAuth, error: parentAuthError } = await supabase.auth.admin.createUser({
        email: family.parent.email,
        password: family.parent.password,
        email_confirm: true
      })

      if (parentAuthError) {
        console.error(`❌ Failed to create parent auth: ${parentAuthError.message}`)
        continue
      }

      console.log(`  ✅ Created parent auth: ${family.parent.email}`)

      // 2. 保護者プロフィール更新
      await supabase
        .from('profiles')
        .update({
          display_name: family.parent.displayName,
          setup_completed: true,
          last_login_at: new Date().toISOString()
        })
        .eq('id', parentAuth.user.id)

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
        console.log(`\n  👦 Creating student: ${studentData.displayName}`)

        // 生徒アカウント作成
        const { data: studentAuth, error: studentAuthError } = await supabase.auth.admin.createUser({
          email: `${studentData.loginId}@studyspark.local`,
          password: studentData.password,
          email_confirm: true
        })

        if (studentAuthError) {
          console.error(`    ❌ Failed to create student auth: ${studentAuthError.message}`)
          continue
        }

        // 生徒プロフィール更新
        await supabase
          .from('profiles')
          .update({
            display_name: studentData.displayName,
            login_id: studentData.loginId,
            setup_completed: true,
            last_login_at: new Date().toISOString()
          })
          .eq('id', studentAuth.user.id)

        // 生徒レコード作成
        const { data: studentRecord, error: studentRecordError } = await supabase
          .from('students')
          .insert({
            user_id: studentAuth.user.id,
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
          .from('parent_students')
          .insert({
            parent_id: parentRecord.id,
            student_id: studentRecord.id
          })

        console.log(`    ✅ Created student: ${studentData.displayName} (${studentData.loginId})`)

        // 5. 過去7日分の学習ログ作成
        console.log(`    📝 Creating study logs...`)

        const today = new Date()
        const studyLogs = []

        for (let i = 0; i < 7; i++) {
          const studyDate = new Date(today)
          studyDate.setDate(studyDate.getDate() - i)
          const studyDateStr = studyDate.toISOString().split('T')[0]

          // 1日あたり2-4件のログを作成
          const logsPerDay = Math.floor(Math.random() * 3) + 2

          for (let j = 0; j < logsPerDay; j++) {
            const randomSubject = subjects![Math.floor(Math.random() * subjects!.length)]
            const randomContent = contentTypes![Math.floor(Math.random() * contentTypes!.length)]
            const totalProblems = Math.floor(Math.random() * 20) + 10
            const correctCount = Math.floor(totalProblems * (0.6 + Math.random() * 0.3)) // 60-90%の正答率

            studyLogs.push({
              student_id: studentRecord.id,
              subject_id: randomSubject.id,
              study_content_type_id: randomContent.id,
              study_date: studyDateStr,
              total_problems: totalProblems,
              correct_count: correctCount,
              logged_at: new Date(studyDate.getTime() + j * 3600000).toISOString() // 1時間ごと
            })
          }
        }

        const { error: logsError } = await supabase
          .from('study_logs')
          .insert(studyLogs)

        if (logsError) {
          console.error(`    ❌ Failed to create study logs: ${logsError.message}`)
        } else {
          console.log(`    ✅ Created ${studyLogs.length} study logs (7 days)`)
        }
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
    testFamilies.forEach(family => {
      console.log(`\n  保護者: ${family.parent.displayName}`)
      console.log(`    Email: ${family.parent.email}`)
      console.log(`    Password: ${family.parent.password}`)
      family.students.forEach(student => {
        console.log(`\n  生徒: ${student.displayName}`)
        console.log(`    Login ID: ${student.loginId}`)
        console.log(`    Password: ${student.password}`)
      })
    })

  } catch (error) {
    console.error('\n❌ Error during seeding:', error)
    process.exit(1)
  }
}

main()
