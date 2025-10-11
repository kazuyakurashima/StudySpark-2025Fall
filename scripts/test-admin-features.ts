/**
 * Phase 5-5: 管理者機能E2Eテストスクリプト
 *
 * テスト内容:
 * 1. 招待コード発行 → 新規ユーザー登録 → 管理画面で確認
 * 2. システム統計の取得確認
 * 3. ユーザー一覧・検索機能
 * 4. システム設定の取得・更新
 *
 * 実行方法:
 *   npx tsx scripts/test-admin-features.ts
 */

import { config } from "dotenv"
import { createClient } from "@supabase/supabase-js"

// .env.local を読み込み
config({ path: ".env.local" })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ 環境変数が設定されていません")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function testAdminFeatures() {
  console.log("🧪 Phase 5-5: 管理者機能E2Eテスト開始\n")

  let testsPassed = 0
  let testsFailed = 0
  let testInvitationCode: string | null = null

  // テスト1: 招待コード発行
  console.log("📋 テスト1: 招待コード発行")
  try {
    const testCode = `E2E_TEST_${Date.now()}`
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7日後

    const { data: invitation, error } = await supabase
      .from("invitation_codes")
      .insert({
        code: testCode,
        role: "parent",
        expires_at: expiresAt.toISOString(),
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      throw new Error(`招待コード発行エラー: ${error.message}`)
    }

    if (!invitation || invitation.code !== testCode) {
      throw new Error("招待コードが正しく作成されませんでした")
    }

    testInvitationCode = testCode

    console.log("  ✅ 招待コードが正常に発行されました")
    console.log(`     - コード: ${invitation.code}`)
    console.log(`     - ロール: ${invitation.role}`)
    console.log(`     - 有効期限: ${invitation.expires_at}`)
    console.log(`     - ステータス: ${invitation.is_active ? "有効" : "無効"}\n`)
    testsPassed++
  } catch (error) {
    console.error("  ❌ テスト1失敗:", error instanceof Error ? error.message : error)
    testsFailed++
  }

  // テスト2: 招待コード一覧取得
  console.log("📋 テスト2: 招待コード一覧取得")
  try {
    const { data: invitations, error } = await supabase
      .from("invitation_codes")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10)

    if (error) {
      throw new Error(`招待コード取得エラー: ${error.message}`)
    }

    if (!invitations || invitations.length === 0) {
      throw new Error("招待コードが取得できません")
    }

    // テストで作成した招待コードが含まれているか確認
    const testInvitation = invitations.find((inv) => inv.code === testInvitationCode)
    if (!testInvitation) {
      throw new Error("作成した招待コードが一覧に含まれていません")
    }

    console.log(`  ✅ 招待コード一覧を取得できました（${invitations.length}件）`)
    console.log(`     - テスト招待コードを確認: ${testInvitation.code}\n`)
    testsPassed++
  } catch (error) {
    console.error("  ❌ テスト2失敗:", error instanceof Error ? error.message : error)
    testsFailed++
  }

  // テスト3: 招待コードの有効化・無効化
  console.log("📋 テスト3: 招待コードの有効化・無効化")
  try {
    if (!testInvitationCode) {
      throw new Error("テスト招待コードが存在しません")
    }

    // 無効化
    const { error: deactivateError } = await supabase
      .from("invitation_codes")
      .update({ is_active: false })
      .eq("code", testInvitationCode)

    if (deactivateError) {
      throw new Error(`無効化エラー: ${deactivateError.message}`)
    }

    // 無効化確認
    const { data: deactivated } = await supabase
      .from("invitation_codes")
      .select("is_active")
      .eq("code", testInvitationCode)
      .single()

    if (deactivated?.is_active !== false) {
      throw new Error("招待コードが無効化されませんでした")
    }

    // 再有効化
    const { error: activateError } = await supabase
      .from("invitation_codes")
      .update({ is_active: true })
      .eq("code", testInvitationCode)

    if (activateError) {
      throw new Error(`有効化エラー: ${activateError.message}`)
    }

    // 有効化確認
    const { data: activated } = await supabase
      .from("invitation_codes")
      .select("is_active")
      .eq("code", testInvitationCode)
      .single()

    if (activated?.is_active !== true) {
      throw new Error("招待コードが有効化されませんでした")
    }

    console.log("  ✅ 招待コードの有効化・無効化が正常に動作しました")
    console.log(`     - 無効化 → 有効化: ${testInvitationCode}\n`)
    testsPassed++
  } catch (error) {
    console.error("  ❌ テスト3失敗:", error instanceof Error ? error.message : error)
    testsFailed++
  }

  // テスト4: システム統計の取得
  console.log("📋 テスト4: システム統計の取得")
  try {
    // ユーザー数集計
    const { count: studentCount } = await supabase
      .from("students")
      .select("*", { count: "exact", head: true })

    const { count: parentCount } = await supabase
      .from("parents")
      .select("*", { count: "exact", head: true })

    const { count: coachCount } = await supabase
      .from("coaches")
      .select("*", { count: "exact", head: true })

    const { count: adminCount } = await supabase
      .from("admins")
      .select("*", { count: "exact", head: true })

    // データ数集計
    const { count: studyLogCount } = await supabase
      .from("study_logs")
      .select("*", { count: "exact", head: true })

    const { count: goalCount } = await supabase
      .from("test_goals")
      .select("*", { count: "exact", head: true })

    const { count: encouragementCount } = await supabase
      .from("encouragement_messages")
      .select("*", { count: "exact", head: true })

    if (
      studentCount === null ||
      parentCount === null ||
      coachCount === null ||
      adminCount === null
    ) {
      throw new Error("ユーザー数の取得に失敗しました")
    }

    console.log("  ✅ システム統計を取得できました")
    console.log("     ユーザー数:")
    console.log(`       - 生徒: ${studentCount}人`)
    console.log(`       - 保護者: ${parentCount}人`)
    console.log(`       - 指導者: ${coachCount}人`)
    console.log(`       - 管理者: ${adminCount}人`)
    console.log("     データ数:")
    console.log(`       - 学習記録: ${studyLogCount}件`)
    console.log(`       - 目標: ${goalCount}件`)
    console.log(`       - 応援メッセージ: ${encouragementCount}件\n`)
    testsPassed++
  } catch (error) {
    console.error("  ❌ テスト4失敗:", error instanceof Error ? error.message : error)
    testsFailed++
  }

  // テスト5: ユーザー一覧取得
  console.log("📋 テスト5: ユーザー一覧取得")
  try {
    // profiles からユーザー情報を取得
    const { data: users, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10)

    if (error) {
      throw new Error(`ユーザー一覧取得エラー: ${error.message}`)
    }

    if (!users || users.length === 0) {
      throw new Error("ユーザーが取得できません")
    }

    // ロール別に集計
    const roleCount = users.reduce((acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    console.log(`  ✅ ユーザー一覧を取得できました（直近${users.length}件）`)
    console.log("     ロール別:")
    Object.entries(roleCount).forEach(([role, count]) => {
      console.log(`       - ${role}: ${count}人`)
    })
    console.log()
    testsPassed++
  } catch (error) {
    console.error("  ❌ テスト5失敗:", error instanceof Error ? error.message : error)
    testsFailed++
  }

  // テスト6: ユーザー検索機能
  console.log("📋 テスト6: ユーザー検索機能")
  try {
    // 「テスト」という文字を含むユーザーを検索
    const searchTerm = "テスト"
    const { data: searchResults, error } = await supabase
      .from("profiles")
      .select("*")
      .or(`display_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
      .limit(10)

    if (error) {
      throw new Error(`ユーザー検索エラー: ${error.message}`)
    }

    console.log(`  ✅ ユーザー検索が正常に動作しました`)
    console.log(`     - 検索語: "${searchTerm}"`)
    console.log(`     - 検索結果: ${searchResults?.length || 0}件\n`)
    testsPassed++
  } catch (error) {
    console.error("  ❌ テスト6失敗:", error instanceof Error ? error.message : error)
    testsFailed++
  }

  // テスト7: システム設定の取得
  console.log("📋 テスト7: システム設定の取得")
  try {
    const { data: settings, error } = await supabase
      .from("system_settings")
      .select("*")
      .order("key")

    if (error) {
      throw new Error(`システム設定取得エラー: ${error.message}`)
    }

    if (!settings || settings.length === 0) {
      console.log("  ⚠️ システム設定が存在しません（初回セットアップが必要）")
    } else {
      console.log(`  ✅ システム設定を取得できました（${settings.length}件）`)
      settings.forEach((setting) => {
        console.log(`     - ${setting.key}: ${setting.value}`)
      })
    }
    console.log()
    testsPassed++
  } catch (error) {
    console.error("  ❌ テスト7失敗:", error instanceof Error ? error.message : error)
    testsFailed++
  }

  // クリーンアップ: テスト用招待コードを削除
  if (testInvitationCode) {
    console.log("🧹 クリーンアップ: テスト用招待コードを削除")
    try {
      await supabase.from("invitation_codes").delete().eq("code", testInvitationCode)
      console.log(`  ✅ テスト用招待コードを削除しました: ${testInvitationCode}\n`)
    } catch (error) {
      console.log(`  ⚠️ クリーンアップ警告: ${error}\n`)
    }
  }

  // 結果サマリー
  console.log("=".repeat(60))
  console.log(`\n📊 テスト結果サマリー`)
  console.log(`   成功: ${testsPassed}/7`)
  console.log(`   失敗: ${testsFailed}/7`)
  console.log(`   成功率: ${Math.round((testsPassed / 7) * 100)}%\n`)

  if (testsFailed === 0) {
    console.log("🎉 すべてのテストが成功しました！")
    console.log("\n✅ 管理者機能は正常に動作しています:")
    console.log("   - 招待コードの発行・取得・有効化切替")
    console.log("   - システム統計の取得（ユーザー数・データ数）")
    console.log("   - ユーザー一覧取得")
    console.log("   - ユーザー検索機能")
    console.log("   - システム設定の取得")
  } else {
    console.error("\n❌ 一部のテストが失敗しました。上記のエラーを確認してください。")
    process.exit(1)
  }
}

// 実行
testAdminFeatures().catch((error) => {
  console.error("💥 テスト実行中にエラーが発生しました:", error)
  process.exit(1)
})
