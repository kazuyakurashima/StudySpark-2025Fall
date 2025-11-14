/**
 * 本番環境の保護者データ確認スクリプト
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
  console.log('🔍 Verifying production parents data...\n')
  console.log(`📡 Connecting to: ${supabaseUrl}\n`)

  try {
    // 1. 全保護者とその子どもを取得（Cron jobと同じクエリ）
    const { data: allParents, error: parentsError } = await supabase
      .from("parents")
      .select(`
        id,
        user_id,
        full_name,
        parent_students (
          student_id,
          grade,
          course,
          full_name
        )
      `)

    if (parentsError) {
      console.error('❌ Error fetching parents:', parentsError)
      process.exit(1)
    }

    console.log(`✅ Found ${allParents?.length || 0} parents\n`)

    if (allParents && allParents.length > 0) {
      for (const parent of allParents) {
        const students = (parent as any).parent_students || []
        console.log(`👨‍👩‍👧‍👦 Parent: ${parent.full_name} (ID: ${parent.id})`)
        console.log(`   Students: ${students.length}`)
        for (const student of students) {
          console.log(`   - ${student.full_name} (Grade: ${student.grade}, Course: ${student.course})`)
        }
        console.log()
      }
    }

    // 2. parent_child_relations テーブルを直接確認
    const { data: relations, error: relationsError } = await supabase
      .from('parent_child_relations')
      .select('parent_id, student_id')

    if (relationsError) {
      console.error('❌ Error fetching relations:', relationsError)
    } else {
      console.log(`📊 Total parent_child_relations: ${relations?.length || 0}\n`)
    }

    // 3. parent_students VIEW を直接確認
    const { data: viewData, error: viewError } = await supabase
      .from('parent_students')
      .select('parent_id, student_id, full_name, grade, course')

    if (viewError) {
      console.error('❌ Error fetching parent_students VIEW:', viewError)
    } else {
      console.log(`📊 Total parent_students VIEW rows: ${viewData?.length || 0}\n`)
      if (viewData && viewData.length > 0) {
        console.log('Sample VIEW data:')
        viewData.slice(0, 5).forEach(row => {
          console.log(`  Parent ${row.parent_id} -> Student ${row.student_id} (${row.full_name})`)
        })
      }
    }

  } catch (error) {
    console.error('\n❌ Error during verification:', error)
    process.exit(1)
  }
}

main()
