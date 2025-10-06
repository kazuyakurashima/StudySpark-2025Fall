/**
 * パスワードリセット機能テストスクリプト
 *
 * テスト項目:
 * 1. 生徒パスワードリセットAPI（保護者権限）
 * 2. 親子関係の検証
 * 3. パスワード更新の検証
 */

import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function testPasswordReset() {
  console.log("🧪 パスワードリセット機能テスト開始\n")

  let testsPassed = 0
  let testsFailed = 0

  try {
    // 1. テストユーザー情報取得
    console.log("📋 テスト1: テストユーザー情報取得")

    // 保護者1を取得
    const { data: parent1Auth } = await supabase.auth.admin.listUsers()
    const parent1User = parent1Auth.users.find(u => u.email === "parent1@example.com")

    if (!parent1User) {
      console.log("❌ 保護者1が見つかりません")
      testsFailed++
      return
    }

    const { data: parent1 } = await supabase
      .from("parents")
      .select("id")
      .eq("user_id", parent1User.id)
      .single()

    if (!parent1) {
      console.log("❌ 保護者1レコードが見つかりません")
      testsFailed++
      return
    }

    // 保護者1の子どもを取得
    const { data: relations } = await supabase
      .from("parent_child_relations")
      .select(`
        student_id,
        students (
          id,
          user_id,
          full_name,
          login_id
        )
      `)
      .eq("parent_id", parent1.id)

    if (!relations || relations.length === 0) {
      console.log("❌ 保護者1の子どもが見つかりません")
      testsFailed++
      return
    }

    const student = relations[0].students as any
    console.log(`✅ テストユーザー取得成功`)
    console.log(`   保護者: ${parent1User.email}`)
    console.log(`   生徒: ${student.full_name} (${student.login_id})`)
    testsPassed++

    // 2. パスワードリセットAPI呼び出し
    console.log("\n📋 テスト2: パスワードリセットAPI呼び出し")

    const newPassword = "newpassword123"
    const resetResponse = await fetch("http://localhost:3000/api/auth/reset-student-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: student.user_id,
        newPassword,
      }),
    })

    const resetResult = await resetResponse.json()

    if (resetResponse.ok && resetResult.success) {
      console.log("✅ パスワードリセットAPI成功")
      testsPassed++
    } else {
      console.log(`❌ パスワードリセットAPI失敗: ${resetResult.error}`)
      testsFailed++
    }

    // 3. 新しいパスワードでログイン確認
    console.log("\n📋 テスト3: 新しいパスワードでログイン確認")

    const loginEmail = `${student.login_id}@studyspark.local`
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: newPassword,
    })

    if (loginError) {
      console.log(`❌ 新しいパスワードでのログイン失敗: ${loginError.message}`)
      testsFailed++
    } else {
      console.log("✅ 新しいパスワードでのログイン成功")
      testsPassed++

      // ログアウト
      await supabase.auth.signOut()
    }

    // 4. 元のパスワードに戻す（テスト環境をクリーン状態に戻す）
    console.log("\n📋 テスト4: パスワードを元に戻す")

    const { error: restoreError } = await supabase.auth.admin.updateUserById(
      student.user_id,
      {
        password: "password123",
      }
    )

    if (restoreError) {
      console.log(`❌ パスワード復元失敗: ${restoreError.message}`)
      testsFailed++
    } else {
      console.log("✅ パスワード復元成功")
      testsPassed++
    }

    // 5. 親子関係がない生徒へのリセット試行（権限チェック）
    console.log("\n📋 テスト5: 権限チェック（親子関係がない生徒）")

    // 別の保護者の子どもを取得
    const { data: otherRelations } = await supabase
      .from("parent_child_relations")
      .select(`
        student_id,
        students (
          id,
          user_id,
          full_name
        )
      `)
      .neq("parent_id", parent1.id)
      .limit(1)

    if (otherRelations && otherRelations.length > 0) {
      const otherStudent = otherRelations[0].students as any

      // 注意: このテストは実際のServer Actionを通さないとRLS検証ができないため、
      // ここではAPIレベルのテストのみ実施
      console.log(`⚠️  権限チェックは実際のアプリケーション経由でのテストが必要`)
      console.log(`   （Server ActionでRLSチェックが実行される）`)
    } else {
      console.log("⚠️  他の保護者の生徒が見つからないためスキップ")
    }

    // テスト結果サマリー
    console.log("\n" + "=".repeat(50))
    console.log("📊 テスト結果サマリー")
    console.log("=".repeat(50))
    console.log(`✅ 成功: ${testsPassed}`)
    console.log(`❌ 失敗: ${testsFailed}`)
    console.log(`📈 成功率: ${Math.round((testsPassed / (testsPassed + testsFailed)) * 100)}%`)
    console.log("=".repeat(50))

    if (testsFailed === 0) {
      console.log("\n🎉 すべてのテストに合格しました！")
    } else {
      console.log("\n⚠️  一部のテストが失敗しました")
    }

  } catch (error) {
    console.error("\n❌ テスト実行エラー:", error)
    process.exit(1)
  }
}

// テスト実行
testPasswordReset()
  .then(() => {
    console.log("\n✅ テスト完了")
    process.exit(0)
  })
  .catch((error) => {
    console.error("\n❌ テスト失敗:", error)
    process.exit(1)
  })
