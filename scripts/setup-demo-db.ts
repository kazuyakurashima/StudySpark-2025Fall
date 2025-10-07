/**
 * デモ環境用データベースセットアップスクリプト
 *
 * 実行順序:
 * 1. マイグレーション（テーブル作成）
 * 2. シードデータ（マスタデータ）
 * 3. デモユーザー作成
 * 4. デモ学習データ作成
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ 環境変数が設定されていません");
  console.error("NEXT_PUBLIC_SUPABASE_URL:", supabaseUrl);
  console.error("SUPABASE_SERVICE_ROLE_KEY:", supabaseServiceKey ? "設定済み" : "未設定");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function executeSqlFile(filePath: string, description: string) {
  console.log(`\n📄 ${description} を実行中...`);
  console.log(`   ファイル: ${filePath}`);

  const fullPath = path.join(process.cwd(), filePath);

  if (!fs.existsSync(fullPath)) {
    console.error(`❌ ファイルが見つかりません: ${fullPath}`);
    return false;
  }

  const sql = fs.readFileSync(fullPath, "utf-8");

  // SQL を ; で分割して実行
  const statements = sql
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith("--"));

  let successCount = 0;
  let errorCount = 0;

  for (const statement of statements) {
    try {
      const { error } = await supabase.rpc("exec_sql", { sql_query: statement });

      if (error) {
        // 既存オブジェクトエラーは警告のみ
        if (error.message.includes("already exists") || error.message.includes("duplicate")) {
          console.log(`   ⚠️  スキップ: ${error.message.substring(0, 60)}...`);
        } else {
          console.error(`   ❌ エラー: ${error.message}`);
          errorCount++;
        }
      } else {
        successCount++;
      }
    } catch (e: any) {
      console.error(`   ❌ 実行エラー: ${e.message}`);
      errorCount++;
    }
  }

  console.log(`   ✅ 成功: ${successCount}, ⚠️ エラー: ${errorCount}`);
  return errorCount === 0;
}

async function createDemoUsers() {
  console.log("\n👤 デモユーザーを作成中...");

  const DEMO_ACCOUNTS = {
    student5: {
      loginId: "demo-student5",
      password: "demo2025",
      email: "demo-student5@studyspark.local",
      fullName: "東進太郎",
      displayName: "たろう",
      grade: 5,
      course: "B" as const,
    },
    student6: {
      loginId: "demo-student6",
      password: "demo2025",
      email: "demo-student6@studyspark.local",
      fullName: "佐藤花子",
      displayName: "はなちゃん",
      grade: 6,
      course: "C" as const,
    },
    parent: {
      email: "demo-parent@example.com",
      password: "demo2025",
      fullName: "山田一郎（保護者）",
      displayName: "山田父",
    },
  };

  // 生徒アカウント作成
  const studentIds: { [key: string]: string } = {};

  for (const [key, account] of Object.entries(DEMO_ACCOUNTS)) {
    if (key.startsWith("student")) {
      try {
        // ユーザー作成
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: account.email,
          password: account.password,
          email_confirm: true,
          user_metadata: {
            role: "student",
            login_id: account.loginId,
          },
        });

        if (authError) {
          if (authError.message.includes("already registered")) {
            console.log(`   ⚠️  ${account.email} は既に存在します`);
            continue;
          }
          throw authError;
        }

        if (!authData.user) {
          throw new Error("ユーザー作成に失敗");
        }

        // profiles 作成
        const { error: profileError } = await supabase.from("profiles").insert({
          id: authData.user.id,
          display_name: account.displayName,
          role: "student",
          avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${account.loginId}`,
          setup_completed: true,
        });

        if (profileError && !profileError.message.includes("duplicate")) {
          throw profileError;
        }

        // students 作成
        const { data: studentData, error: studentError } = await supabase
          .from("students")
          .insert({
            user_id: authData.user.id,
            login_id: account.loginId,
            full_name: account.fullName,
            grade: account.grade,
            course: account.course,
          })
          .select()
          .single();

        if (studentError && !studentError.message.includes("duplicate")) {
          throw studentError;
        }

        studentIds[key] = studentData?.id || "";

        console.log(`   ✅ 生徒作成: ${account.fullName} (${account.loginId})`);
      } catch (error: any) {
        console.error(`   ❌ 生徒作成エラー (${account.email}):`, error.message);
      }
    }
  }

  // 保護者アカウント作成
  let parentId = "";

  try {
    const parentAccount = DEMO_ACCOUNTS.parent;

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: parentAccount.email,
      password: parentAccount.password,
      email_confirm: true,
      user_metadata: {
        role: "parent",
      },
    });

    if (authError) {
      if (authError.message.includes("already registered")) {
        console.log(`   ⚠️  ${parentAccount.email} は既に存在します`);
      } else {
        throw authError;
      }
    } else if (authData.user) {
      // profiles 作成
      const { error: profileError } = await supabase.from("profiles").insert({
        id: authData.user.id,
        display_name: parentAccount.displayName,
        role: "parent",
        avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=parent`,
        setup_completed: true,
      });

      if (profileError && !profileError.message.includes("duplicate")) {
        throw profileError;
      }

      // parents 作成
      const { data: parentData, error: parentError } = await supabase
        .from("parents")
        .insert({
          user_id: authData.user.id,
          full_name: parentAccount.fullName,
        })
        .select()
        .single();

      if (parentError && !parentError.message.includes("duplicate")) {
        throw parentError;
      }

      parentId = parentData?.id || "";

      console.log(`   ✅ 保護者作成: ${parentAccount.displayName}`);

      // 親子関係作成
      if (parentId && Object.keys(studentIds).length > 0) {
        for (const studentId of Object.values(studentIds)) {
          if (studentId) {
            const { error: relError } = await supabase
              .from("parent_child_relations")
              .insert({
                parent_id: parentId,
                student_id: studentId,
              });

            if (relError && !relError.message.includes("duplicate")) {
              console.error(`   ⚠️  親子関係作成エラー:`, relError.message);
            }
          }
        }
        console.log(`   ✅ 親子関係作成完了`);
      }
    }
  } catch (error: any) {
    console.error(`   ❌ 保護者作成エラー:`, error.message);
  }

  return { studentIds, parentId };
}

async function createDemoStudyLogs(studentIds: { [key: string]: string }) {
  console.log("\n📚 デモ学習データを作成中...");

  // 簡易版: 最小限のデータのみ作成
  for (const [key, studentId] of Object.entries(studentIds)) {
    if (!studentId) continue;

    try {
      // 学生情報取得
      const { data: student } = await supabase
        .from("students")
        .select("grade")
        .eq("id", studentId)
        .single();

      if (!student) continue;

      // セッション取得
      const { data: sessions } = await supabase
        .from("sessions")
        .select("id")
        .eq("grade", student.grade)
        .limit(3);

      if (!sessions || sessions.length === 0) continue;

      // 科目取得
      const { data: subjects } = await supabase.from("subjects").select("id, name");

      if (!subjects) continue;

      // 各セッション×科目で3-5個のログを作成
      let logCount = 0;
      for (const session of sessions) {
        for (const subject of subjects.slice(0, 2)) {
          // 最初の2科目のみ
          // 学習内容タイプを取得
          const { data: contentTypes } = await supabase
            .from("study_content_types")
            .select("id")
            .eq("session_id", session.id)
            .eq("subject_id", subject.id)
            .limit(1);

          if (!contentTypes || contentTypes.length === 0) continue;

          const totalProblems = Math.floor(Math.random() * 20) + 10;
          const correctCount = Math.floor(totalProblems * (0.6 + Math.random() * 0.3));

          const { error: logError } = await supabase.from("study_logs").insert({
            student_id: studentId,
            session_id: session.id,
            subject_id: subject.id,
            study_content_type_id: contentTypes[0].id,
            total_problems: totalProblems,
            correct_count: correctCount,
            logged_at: new Date(
              Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000
            ).toISOString(),
          });

          if (!logError) {
            logCount++;
          }
        }
      }

      console.log(`   ✅ ${key}: ${logCount}件の学習ログ作成`);
    } catch (error: any) {
      console.error(`   ❌ 学習ログ作成エラー (${key}):`, error.message);
    }
  }
}

async function main() {
  console.log("🚀 デモ環境セットアップを開始します\n");
  console.log(`Supabase URL: ${supabaseUrl}`);
  console.log(`Service Role Key: ${supabaseServiceKey?.substring(0, 20)}...`);

  try {
    // ステップ1: exec_sql 関数を作成
    console.log("\n📝 exec_sql 関数を作成中...");
    const { error: funcError } = await supabase.rpc("exec_sql", {
      sql_query: `
        CREATE OR REPLACE FUNCTION exec_sql(sql_query TEXT)
        RETURNS VOID AS $$
        BEGIN
          EXECUTE sql_query;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
      `,
    });

    if (funcError && !funcError.message.includes("does not exist")) {
      console.log("   ⚠️  exec_sql 関数は既に存在するか、手動作成が必要です");
      console.log("   SQL Editor で以下を実行してください:");
      console.log(`
        CREATE OR REPLACE FUNCTION exec_sql(sql_query TEXT)
        RETURNS VOID AS $$
        BEGIN
          EXECUTE sql_query;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
      `);
    } else {
      console.log("   ✅ exec_sql 関数作成完了");
    }

    // ステップ2: マイグレーション実行
    // Note: Supabase Dashboard の SQL Editor で手動実行を推奨
    console.log("\n⚠️  マイグレーションは Supabase Dashboard で手動実行してください");
    console.log("   1. Supabase Dashboard > SQL Editor を開く");
    console.log("   2. supabase/migrations/ 内の各ファイルを順番に実行");

    // ステップ3: シードデータ
    console.log("\n⚠️  シードデータは Supabase Dashboard で手動実行してください");
    console.log("   1. Supabase Dashboard > SQL Editor を開く");
    console.log("   2. supabase/seed.sql を実行");

    // ステップ4: デモユーザー作成
    const { studentIds, parentId } = await createDemoUsers();

    // ステップ5: デモ学習データ作成
    if (Object.keys(studentIds).length > 0) {
      await createDemoStudyLogs(studentIds);
    }

    console.log("\n✅ デモ環境セットアップ完了！");
    console.log("\n📝 次のステップ:");
    console.log("   1. Vercel にデプロイ");
    console.log("   2. 環境変数を設定");
    console.log("   3. デモアカウントでログインテスト");
  } catch (error: any) {
    console.error("\n❌ セットアップエラー:", error.message);
    process.exit(1);
  }
}

main();
