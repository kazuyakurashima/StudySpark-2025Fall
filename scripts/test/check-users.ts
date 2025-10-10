import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function checkUsers() {
  const { data } = await supabase.auth.admin.listUsers()

  console.log('登録ユーザー一覧:\n')
  data?.users.forEach(u => {
    console.log(`Email: ${u.email}`)
    console.log(`ID: ${u.id}`)
    console.log(`Created: ${u.created_at}`)
    console.log(`Meta: ${JSON.stringify(u.user_metadata, null, 2)}`)
    console.log('---')
  })
}

checkUsers()
