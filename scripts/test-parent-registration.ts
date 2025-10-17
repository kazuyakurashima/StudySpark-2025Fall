/**
 * 保護者登録APIのテストスクリプト
 *
 * テストシナリオ:
 * 1. 同じメールアドレスで2度登録を試みるケース
 * 2. 2人目の子どもで失敗した場合のロールバック確認
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

const API_URL = "http://localhost:3000/api/auth/parent-register"

// テスト用データ
const testParent1 = {
  fullName: "テスト 保護者1",
  fullNameKana: "テスト ホゴシャ1",
  email: "test-parent1@example.com",
  password: "TestPassword123!",
}

const testParent2 = {
  fullName: "テスト 保護者2",
  fullNameKana: "テスト ホゴシャ2",
  email: "test-parent2@example.com",
  password: "TestPassword456!",
}

const testParent3 = {
  fullName: "テスト 保護者3",
  fullNameKana: "テスト ホゴシャ3",
  email: "test-parent3@example.com",
  password: "TestPassword789!",
}

const testChild1 = {
  grade: 6,
  fullName: "テスト 太郎",
  fullNameKana: "テスト タロウ",
  loginId: "test_child_001",
  password: "ChildPass123!",
}

const testChild2 = {
  grade: 5,
  fullName: "テスト 花子",
  fullNameKana: "テスト ハナコ",
  loginId: "test_child_002",
  password: "ChildPass456!",
}

async function cleanup() {
  console.log("\n🧹 Cleaning up test data...")

  // auth.usersから削除
  const { data: users } = await supabase.auth.admin.listUsers()

  for (const user of users.users) {
    if (
      user.email?.includes("test-parent") ||
      user.email?.includes("test_child_")
    ) {
      console.log(`  Deleting user: ${user.email}`)
      await supabase.auth.admin.deleteUser(user.id)
    }
  }

  console.log("✅ Cleanup completed\n")
}

async function testDuplicateEmailRegistration() {
  console.log("========================================")
  console.log("テスト1: 同じメールアドレスで2度登録")
  console.log("========================================\n")

  // 1回目の登録
  console.log("📝 1回目の登録を試行...")
  const response1 = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      parent: testParent1,
      children: [testChild1],
    }),
  })

  const result1 = await response1.json()
  console.log(`Status: ${response1.status}`)
  console.log(`Response:`, result1)

  if (response1.status === 200 && result1.success) {
    console.log("✅ 1回目の登録成功\n")
  } else {
    console.log("❌ 1回目の登録失敗")
    return false
  }

  // 2回目の登録（同じメールアドレス）
  console.log("📝 2回目の登録を試行（同じメールアドレス）...")
  const response2 = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      parent: testParent1,
      children: [testChild2], // 別の子ども
    }),
  })

  const result2 = await response2.json()
  console.log(`Status: ${response2.status}`)
  console.log(`Response:`, result2)

  // 期待結果: 400エラー + 適切なエラーメッセージ
  if (response2.status === 400 && result2.error?.includes("既に登録されています")) {
    console.log("✅ 重複チェックが正常に動作（適切なエラーメッセージ）\n")
    return true
  } else {
    console.log("❌ 重複チェックに問題あり\n")
    return false
  }
}

async function testSecondChildFailureRollback() {
  console.log("========================================")
  console.log("テスト2: 2人目の子ども作成失敗時のロールバック")
  console.log("========================================\n")

  // 事前に既存のログインIDを作成（test_child_002を先に登録）
  console.log("📝 事前準備: test_child_002 を先に登録...")
  const preRegistration = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      parent: testParent3, // testParent3を使用
      children: [testChild2], // test_child_002を先に登録
    }),
  })

  const preResult = await preRegistration.json()
  console.log(`Status: ${preRegistration.status}`)
  console.log(`Response:`, preResult)

  if (preRegistration.status !== 200) {
    console.log("❌ 事前準備に失敗")
    return false
  }

  console.log("✅ 事前準備完了: test_child_002 が既に存在\n")

  // 本番登録: 別の保護者で2人の子ども（2人目は重複）
  console.log("📝 別の保護者で2人の子どもを登録（2人目のログインIDは重複）...")
  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      parent: testParent2, // 別の保護者
      children: [testChild1, testChild2], // test_child_002は既に存在
    }),
  })

  const result = await response.json()
  console.log(`Status: ${response.status}`)
  console.log(`Response:`, result)

  // 期待結果: 400または500エラー
  if (response.status === 400 || response.status === 500) {
    console.log("✅ 2人目の登録で失敗を検出\n")

    // ロールバック確認: 保護者2と1人目の子どもが作成されていないことを確認
    console.log("🔍 ロールバック確認: 保護者2と1人目の子どもが残っていないか確認...")

    const { data: users } = await supabase.auth.admin.listUsers()
    const parent2Exists = users.users.some((u) => u.email === testParent2.email)
    const child1Exists = users.users.some(
      (u) => u.email === `${testChild1.loginId}@studyspark.local`
    )

    console.log(
      `  保護者2アカウント (${testParent2.email}): ${parent2Exists ? "❌ 残っている" : "✅ 削除済み"}`
    )
    console.log(
      `  1人目の子ども (${testChild1.loginId}): ${child1Exists ? "❌ 残っている" : "✅ 削除済み"}`
    )

    if (!parent2Exists && !child1Exists) {
      console.log("✅ ロールバックが正常に動作\n")
      return true
    } else {
      console.log("❌ ロールバックに問題あり（データが残っている）\n")
      return false
    }
  } else {
    console.log("❌ エラーが検出されなかった（本来は失敗すべき）\n")
    return false
  }
}

async function main() {
  console.log("🧪 保護者登録APIテスト開始\n")

  try {
    // 事前クリーンアップ
    await cleanup()

    // テスト1: 重複メールアドレス
    const test1Result = await testDuplicateEmailRegistration()
    await cleanup()

    // テスト2: 2人目の子ども失敗時のロールバック
    const test2Result = await testSecondChildFailureRollback()
    await cleanup()

    // 結果サマリー
    console.log("========================================")
    console.log("テスト結果サマリー")
    console.log("========================================")
    console.log(`テスト1 (重複メールアドレス): ${test1Result ? "✅ PASS" : "❌ FAIL"}`)
    console.log(`テスト2 (ロールバック確認): ${test2Result ? "✅ PASS" : "❌ FAIL"}`)
    console.log("========================================\n")

    if (test1Result && test2Result) {
      console.log("🎉 すべてのテストが成功しました！")
      process.exit(0)
    } else {
      console.log("⚠️  一部のテストが失敗しました")
      process.exit(1)
    }
  } catch (error) {
    console.error("❌ テスト実行中にエラーが発生:", error)
    process.exit(1)
  }
}

main()
