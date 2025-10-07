import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function fixAvatars() {
  console.log('🔧 Fixing demo student avatars...\n');

  // demo-student5 (小5) -> student5
  const { data: student5 } = await supabase
    .from('students')
    .select('user_id, full_name')
    .eq('login_id', 'demo-student5')
    .single();

  if (student5) {
    const { error } = await supabase
      .from('profiles')
      .update({
        avatar_url: 'student5',
        display_name: student5.full_name || 'デモ生徒5'
      })
      .eq('id', student5.user_id);

    if (error) {
      console.error('❌ Error updating demo-student5:', error);
    } else {
      console.log('✅ Updated demo-student5 -> avatar: student5');
    }
  }

  // demo-student6 (小6) -> student6
  const { data: student6 } = await supabase
    .from('students')
    .select('user_id, full_name')
    .eq('login_id', 'demo-student6')
    .single();

  if (student6) {
    const { error } = await supabase
      .from('profiles')
      .update({
        avatar_url: 'student6',
        display_name: student6.full_name || 'デモ生徒6'
      })
      .eq('id', student6.user_id);

    if (error) {
      console.error('❌ Error updating demo-student6:', error);
    } else {
      console.log('✅ Updated demo-student6 -> avatar: student6');
    }
  }

  console.log('\n✅ Avatar fix completed!');
}

fixAvatars().then(() => process.exit(0));
