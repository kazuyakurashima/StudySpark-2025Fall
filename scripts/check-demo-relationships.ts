import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function checkRelationships() {
  console.log("🔍 デモアカウントの親子関係を確認中...\n");

  // Get demo students
  const { data: students, error: studentsError } = await supabase
    .from("students")
    .select(`
      id,
      full_name,
      login_id,
      grade,
      user_id
    `)
    .in("login_id", ["demo-student5", "demo-student6"]);

  if (studentsError) {
    console.error("❌ 生徒取得エラー:", studentsError);
    return;
  }

  console.log("📚 生徒アカウント:");
  students?.forEach((student) => {
    console.log(`  - ${student.full_name} (${student.login_id}) - Grade ${student.grade}`);
  });
  console.log();

  // Get demo parent
  const { data: parentUsers, error: parentUsersError } = await supabase.auth.admin.listUsers();

  if (parentUsersError) {
    console.error("❌ ユーザー取得エラー:", parentUsersError);
    return;
  }

  const demoParentUser = parentUsers.users.find(u => u.email === "demo-parent@example.com");

  if (!demoParentUser) {
    console.log("❌ デモ保護者アカウントが見つかりません");
    return;
  }

  const { data: parent, error: parentError } = await supabase
    .from("parents")
    .select(`
      id,
      user_id
    `)
    .eq("user_id", demoParentUser.id)
    .single();

  const { data: parentProfile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", demoParentUser.id)
    .single();

  if (parentError) {
    console.error("❌ 保護者取得エラー:", parentError);
    return;
  }

  console.log("👨‍👩‍👧 保護者アカウント:");
  console.log(`  - ${parentProfile?.display_name || 'N/A'} (demo-parent@example.com)`);
  console.log();

  // Check relationships
  console.log("🔗 親子関係:");

  for (const student of students || []) {
    const { data: relationship, error: relError } = await supabase
      .from("parent_child_relations")
      .select("*")
      .eq("student_id", student.id)
      .eq("parent_id", parent.id);

    if (relError) {
      console.error(`❌ 関係確認エラー (${student.login_id}):`, relError);
      continue;
    }

    if (relationship && relationship.length > 0) {
      console.log(`  ✅ ${student.full_name} ← → ${parentProfile?.display_name || 'N/A'} (連携済み)`);
    } else {
      console.log(`  ❌ ${student.full_name} ← → ${parentProfile?.display_name || 'N/A'} (未連携)`);
    }
  }

  // Count relationships
  const { data: allRels, error: allRelsError } = await supabase
    .from("parent_child_relations")
    .select("*")
    .eq("parent_id", parent.id);

  if (!allRelsError) {
    console.log(`\n📊 保護者の連携生徒数: ${allRels?.length || 0}`);
  }
}

checkRelationships()
  .then(() => {
    console.log("\n✅ 確認完了");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ エラー:", error);
    process.exit(1);
  });
