/**
 * テーブルスキーマの確認
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
  console.log('🔍 テーブルスキーマ確認...\n')

  try {
    // profiles テーブルのサンプルレコード
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1)

    console.log('【profiles テーブル】')
    if (profilesError) {
      console.error('エラー:', profilesError)
    } else if (profiles && profiles.length > 0) {
      console.log('カラム:', Object.keys(profiles[0]))
    }

    // parents テーブルのサンプルレコード
    const { data: parents, error: parentsError } = await supabase
      .from('parents')
      .select('*')
      .limit(1)

    console.log('\n【parents テーブル】')
    if (parentsError) {
      console.error('エラー:', parentsError)
    } else if (parents && parents.length > 0) {
      console.log('カラム:', Object.keys(parents[0]))
    }

    // students テーブルのサンプルレコード
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('*')
      .limit(1)

    console.log('\n【students テーブル】')
    if (studentsError) {
      console.error('エラー:', studentsError)
    } else if (students && students.length > 0) {
      console.log('カラム:', Object.keys(students[0]))
    }

  } catch (error) {
    console.error('❌ エラー:', error)
    process.exit(1)
  }
}

main()
