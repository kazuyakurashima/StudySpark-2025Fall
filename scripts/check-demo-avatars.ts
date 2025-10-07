import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function checkAvatars() {
  const { data: students } = await supabase
    .from('students')
    .select('id, login_id, full_name, user_id')
    .like('login_id', 'demo-student%')
    .order('login_id');

  console.log('Demo students avatars:');
  for (const student of students || []) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('avatar_url, display_name')
      .eq('id', student.user_id)
      .single();

    console.log(`${student.login_id}: avatar_url = '${profile?.avatar_url}', display_name = '${profile?.display_name}'`);
  }
}

checkAvatars().then(() => process.exit(0));
