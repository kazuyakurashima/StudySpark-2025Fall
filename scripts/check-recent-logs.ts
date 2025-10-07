import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function checkRecentLogs() {
  console.log('🔍 最新の学習ログを確認中...\n');

  // Get demo-student6 (小6)
  const { data: student } = await supabase
    .from('students')
    .select('id, login_id, full_name')
    .eq('login_id', 'demo-student6')
    .single();

  if (!student) {
    console.log('❌ demo-student6が見つかりません');
    return;
  }

  console.log(`生徒: ${student.full_name} (${student.login_id})\n`);

  // Get recent logs
  const { data: logs } = await supabase
    .from('study_logs')
    .select(`
      id,
      logged_at,
      study_date,
      created_at,
      subjects (name),
      study_content_types (content_name),
      correct_count,
      total_problems
    `)
    .eq('student_id', student.id)
    .order('logged_at', { ascending: false })
    .limit(10);

  if (!logs || logs.length === 0) {
    console.log('📝 学習ログがありません');
    return;
  }

  console.log('最新10件の学習ログ:\n');
  logs.forEach((log, index) => {
    console.log(`${index + 1}. ID: ${log.id}`);
    console.log(`   科目: ${log.subjects?.name || 'N/A'}`);
    console.log(`   内容: ${log.study_content_types?.content_name || 'N/A'}`);
    console.log(`   正答: ${log.correct_count}/${log.total_problems}`);
    console.log(`   study_date: ${log.study_date}`);
    console.log(`   logged_at: ${log.logged_at}`);
    console.log(`   created_at: ${log.created_at}`);
    console.log('');
  });

  // Check current time
  const now = new Date();
  console.log(`現在時刻: ${now.toISOString()}`);
  console.log(`日本時間: ${now.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`);
}

checkRecentLogs().then(() => process.exit(0));
